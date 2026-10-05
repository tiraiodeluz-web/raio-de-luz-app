-- Busca priorizando código (sku) — cliente B2B decora o código do catálogo
-- impresso ("CH.032") e espera digitar e achar na hora, não só por nome.
-- Prioridade: sku exato > sku começa com > sku contém > nome começa com >
-- resto (nome ou descrição contém, via a coluna "busca" já existente).
create or replace function public.produtos_busca(p_termo text, p_offset int default 0, p_limite int default 20)
returns table (
  id uuid, sku text, nome text, preco numeric, preco_promocional numeric,
  preco_efetivo numeric, imagem_principal text, embalagem int, total bigint
)
language sql
stable
as $$
  with pontuados as (
    select p.*,
      case
        when lower(p.sku) = lower(p_termo) then 0
        when lower(p.sku) like lower(p_termo) || '%' then 1
        when lower(p.sku) like '%' || lower(p_termo) || '%' then 2
        when lower(p.nome) like lower(p_termo) || '%' then 3
        else 4
      end as prioridade
    from public.produtos p
    where p.ativo
      and p.imagem_principal is not null
      and p.busca ilike '%' || lower(p_termo) || '%'
  )
  select id, sku, nome, preco, preco_promocional, preco_efetivo, imagem_principal, embalagem,
    count(*) over() as total
  from pontuados
  order by prioridade, nome
  offset p_offset
  limit p_limite;
$$;
