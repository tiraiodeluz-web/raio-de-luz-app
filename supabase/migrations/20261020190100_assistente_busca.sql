-- Busca do assistente de IA: palavra por palavra, sem acento, olhando nome,
-- código, referência, categoria e os santos do produto. A busca do app
-- (produtos_busca) procura a frase inteira, então "chaveiro são jorge" não
-- achava nada. "N. Sra." do catálogo vira "nossa senhora" dos dois lados.
create or replace function public.sem_acento(p text)
returns text language sql immutable set search_path to 'public' as $$
  select lower(translate(coalesce(p, ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucaaaaaeeeeiiiiooooouuuuc'));
$$;

create or replace function public.assistente_texto_busca(p text)
returns text language sql immutable set search_path to 'public' as $$
  select regexp_replace(regexp_replace(public.sem_acento(p),
    '\mn\.?\s*(sra|senhora)\.?', 'nossa senhora', 'g'),
    '\mnsa\.?\s*(sra|senhora)\.?', 'nossa senhora', 'g');
$$;

create or replace function public.assistente_buscar_produtos(
  p_termo text default null,
  p_preco_max numeric default null,
  p_apenas_ofertas boolean default false,
  p_limite integer default 10
)
returns table (id uuid, sku text, nome text, preco numeric, embalagem integer, personalizavel boolean,
               categoria text, santos text, em_oferta boolean, acertos integer)
language sql stable set search_path to 'public' as $$
  with palavras as (
    select distinct case when length(w) > 4 then regexp_replace(w, 's$', '') else w end as w
    from unnest(regexp_split_to_array(public.assistente_texto_busca(p_termo), '[^a-z0-9.]+')) w
    where length(w) >= 2
      and w not in ('de','da','do','das','dos','com','para','pra','um','uma','os','as','em','no','na','quero','tem')
  ),
  base as (
    select p.*, c.nome as categoria_nome,
      (select string_agg(s.nome, ', ' order by s.ordem) from public.produto_santos ps
         join public.santos s on s.id = ps.santo_id where ps.produto_id = p.id) as santos_nomes
    from public.produtos p left join public.categorias c on c.id = p.categoria_id
    where p.ativo and p.imagem_principal is not null
      and (p_preco_max is null or p.preco_efetivo <= p_preco_max)
      and (not coalesce(p_apenas_ofertas, false) or p.destaque or coalesce(p.preco_promocional, 0) > 0)
  ),
  pontuados as (
    select b.*, (select count(*) from palavras w
       where public.assistente_texto_busca(concat_ws(' ', b.nome, b.sku, b.referencia, b.categoria_nome, b.santos_nomes))
             like '%' || w.w || '%')::int as pts
    from base b
  )
  select id, sku, nome, preco_efetivo, embalagem, personalizavel, categoria_nome, santos_nomes,
         destaque or coalesce(preco_promocional, 0) > 0, pts
  from pontuados
  where (select count(*) from palavras) = 0
     or pts >= greatest(1, ceil((select count(*) from palavras) * 0.5))
  order by pts desc, vendas desc
  limit least(coalesce(p_limite, 10), 20);
$$;
