-- Recomendados: prioriza produtos com o mesmo "prefixo" de SKU (ex.: AD020-1,
-- AD020-2, AD020-3 -> prefixo AD020 -- variacoes do mesmo produto), e
-- completa com produtos da mesma categoria ate atingir o minimo pedido.
create or replace function public.produtos_recomendados(p_produto_id uuid, p_minimo int default 10)
returns setof public.produtos
language sql
stable
as $$
  with alvo as (
    select categoria_id, regexp_replace(sku, '-[0-9]+$', '') as prefixo
    from public.produtos
    where id = p_produto_id
  ),
  candidatos as (
    select p.id, p.sku,
      case when regexp_replace(p.sku, '-[0-9]+$', '') = alvo.prefixo then 1 else 2 end as prioridade
    from public.produtos p, alvo
    where p.ativo
      and p.id <> p_produto_id
      and (
        regexp_replace(p.sku, '-[0-9]+$', '') = alvo.prefixo
        or p.categoria_id = alvo.categoria_id
      )
    order by case when regexp_replace(p.sku, '-[0-9]+$', '') = alvo.prefixo then 1 else 2 end, p.sku
    limit greatest(p_minimo, 10)
  )
  select pr.* from public.produtos pr
  join candidatos c on c.id = pr.id
  order by c.prioridade, c.sku;
$$;
