-- Busca do app (produtos_busca) passa a funcionar igual à do assistente:
-- palavra por palavra, sem acento, olhando nome, código, referência,
-- categoria e santos ("chaveiro são bento", "terços aparecida"). Código
-- exato/começando com o termo continua no topo (cliente B2B digita "CH.032").
-- Dentro do mesmo número de acertos, quem tem as palavras no NOME vem
-- antes de quem só tem o santo como variação. Mesma assinatura/retorno.
create or replace function public.produtos_busca(p_termo text, p_offset int default 0, p_limite int default 20)
returns table (
  id uuid, sku text, nome text, preco numeric, preco_promocional numeric,
  preco_efetivo numeric, imagem_principal text, embalagem int, total bigint
)
language sql stable set search_path to 'public' as $$
  with palavras as (
    select distinct case when length(w) > 4 then regexp_replace(w, 's$', '') else w end as w
    from unnest(regexp_split_to_array(public.assistente_texto_busca(p_termo), '[^a-z0-9.]+')) w
    where length(w) >= 2
      and w not in ('de','da','do','das','dos','com','para','pra','um','uma','os','as','em','no','na')
  ),
  base as (
    select p.*, public.assistente_texto_busca(p.nome) as texto_nome,
      public.assistente_texto_busca(concat_ws(' ', p.nome, p.sku, p.referencia, c.nome,
        (select string_agg(s.nome, ' ') from public.produto_santos ps
           join public.santos s on s.id = ps.santo_id where ps.produto_id = p.id))) as texto
    from public.produtos p left join public.categorias c on c.id = p.categoria_id
    where p.ativo and p.imagem_principal is not null
  ),
  pontuados as (
    select b.*,
      (select count(*) from palavras w where b.texto like '%' || w.w || '%')::int as pts,
      (select count(*) from palavras w where b.texto_nome like '%' || w.w || '%')::int as pts_nome,
      case when lower(b.sku) = lower(trim(p_termo)) then 0
           when lower(b.sku) like lower(trim(p_termo)) || '%' then 1
           else 2 end as prioridade
    from base b
  ),
  filtrados as (
    select * from pontuados
    where prioridade < 2
       or pts >= greatest(1, ceil((select count(*) from palavras) * 0.6))
  )
  select id, sku, nome, preco, preco_promocional, preco_efetivo, imagem_principal, embalagem,
         count(*) over() as total
  from filtrados
  order by prioridade, pts desc, pts_nome desc, vendas desc, nome
  offset p_offset
  limit p_limite;
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
    select b.*,
      (select count(*) from palavras w
        where public.assistente_texto_busca(concat_ws(' ', b.nome, b.sku, b.referencia, b.categoria_nome, b.santos_nomes))
              like '%' || w.w || '%')::int as pts,
      (select count(*) from palavras w where public.assistente_texto_busca(b.nome) like '%' || w.w || '%')::int as pts_nome
    from base b
  )
  select id, sku, nome, preco_efetivo, embalagem, personalizavel, categoria_nome, santos_nomes,
         destaque or coalesce(preco_promocional, 0) > 0, pts
  from pontuados
  where (select count(*) from palavras) = 0
     or pts >= greatest(1, ceil((select count(*) from palavras) * 0.5))
  order by pts desc, pts_nome desc, vendas desc
  limit least(coalesce(p_limite, 10), 20);
$$;
