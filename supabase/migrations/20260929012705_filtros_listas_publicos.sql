-- Filtros das listas de produtos (pedido do cliente em 28/09/2026):
-- dentro de um catálogo → chips de categorias; dentro de uma categoria → chips de catálogos.
-- Só lista opções que têm produto ativo com foto (mesmo critério da grade), para o
-- filtro nunca levar a uma lista vazia. A vitrine é pública, então anon também usa.
create or replace function public.categorias_do_catalogo(p_catalogo_id uuid)
returns table (id uuid, nome text, qtd bigint)
language sql stable security invoker set search_path = public as $$
  select c.id, c.nome, count(*)
    from public.produtos p join public.categorias c on c.id = p.categoria_id and c.ativo
   where p.ativo and p.imagem_principal is not null and p.catalogo_id = p_catalogo_id
   group by c.id, c.nome, c.ordem
   order by c.ordem, c.nome;
$$;

create or replace function public.catalogos_da_categoria(p_categoria_id uuid)
returns table (id uuid, nome text, qtd bigint)
language sql stable security invoker set search_path = public as $$
  select c.id, c.nome, count(*)
    from public.produtos p join public.catalogos c on c.id = p.catalogo_id and c.ativo
   where p.ativo and p.imagem_principal is not null and p.categoria_id = p_categoria_id
   group by c.id, c.nome, c.ordem
   order by c.ordem, c.nome;
$$;

grant execute on function public.categorias_do_catalogo(uuid) to anon, authenticated;
grant execute on function public.catalogos_da_categoria(uuid) to anon, authenticated;
