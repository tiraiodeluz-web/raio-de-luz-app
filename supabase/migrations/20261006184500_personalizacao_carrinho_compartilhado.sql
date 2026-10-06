create or replace function public.compartilhar_carrinho()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_itens jsonb;
  v_id uuid;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
           'produto_id', produto_id,
           'santo_id', santo_id,
           'quantidade', quantidade,
           'personalizacao', personalizacao
         )), '[]'::jsonb)
  into v_itens
  from public.carrinho_itens
  where usuario_id = auth.uid();

  if jsonb_array_length(v_itens) = 0 then
    raise exception 'Carrinho vazio' using errcode = 'P0001';
  end if;

  insert into public.carrinhos_compartilhados (criado_por, itens)
  values (auth.uid(), v_itens)
  returning id into v_id;

  return v_id;
end;
$$;

-- "_v2" porque o canal de migração trava ao tentar alterar o tipo de
-- retorno de uma função existente (precisaria de DROP FUNCTION antes, e
-- DROP trava igual nesse canal) — a antiga carrinho_compartilhado_itens
-- fica sem uso, só essa nova é chamada pelo app a partir de agora.
create or replace function public.carrinho_compartilhado_itens_v2(p_id uuid)
returns table (
  produto_id uuid,
  nome text,
  sku text,
  preco numeric,
  preco_promocional numeric,
  imagem_principal text,
  embalagem int,
  quantidade int,
  santo_id uuid,
  santo_nome text,
  personalizacao text
)
language sql
stable
as $$
  select p.id, p.nome, p.sku, p.preco, p.preco_promocional, p.imagem_principal, p.embalagem,
    (item->>'quantidade')::int, s.id, s.nome, item->>'personalizacao'
  from public.carrinhos_compartilhados cc
  cross join lateral jsonb_array_elements(cc.itens) as item
  join public.produtos p on p.id = (item->>'produto_id')::uuid and p.ativo
  left join public.santos s on s.id = (item->>'santo_id')::uuid
  where cc.id = p_id;
$$;
