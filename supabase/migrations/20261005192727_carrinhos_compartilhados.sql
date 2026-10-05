create table public.carrinhos_compartilhados (
  id uuid primary key default gen_random_uuid(),
  criado_por uuid not null references public.perfis(id) on delete cascade,
  itens jsonb not null,
  criado_em timestamptz not null default now()
);

alter table public.carrinhos_compartilhados enable row level security;

-- Leitura liberada pra quem recebeu o link (não dá pra restringir por
-- dono, já que quem abre é outra pessoa) — só expõe produto_id/quantidade,
-- sem dado sensível. Escrita só pela função compartilhar_carrinho abaixo
-- (security definer), por isso não existe policy de insert/update/delete.
create policy carrinhos_compartilhados_leitura on public.carrinhos_compartilhados
  for select to authenticated
  using (true);

-- Copia o carrinho atual do usuário logado pra um registro compartilhável.
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
           'quantidade', quantidade
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

-- Lê um carrinho compartilhado já com os dados do produto pra exibir,
-- ignorando item cujo produto tenha sido removido/desativado depois.
create or replace function public.carrinho_compartilhado_itens(p_id uuid)
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
  santo_nome text
)
language sql
stable
as $$
  select p.id, p.nome, p.sku, p.preco, p.preco_promocional, p.imagem_principal, p.embalagem,
    (item->>'quantidade')::int, s.id, s.nome
  from public.carrinhos_compartilhados cc
  cross join lateral jsonb_array_elements(cc.itens) as item
  join public.produtos p on p.id = (item->>'produto_id')::uuid and p.ativo
  left join public.santos s on s.id = (item->>'santo_id')::uuid
  where cc.id = p_id;
$$;
