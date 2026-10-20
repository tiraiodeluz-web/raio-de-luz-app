-- Kits montados pelo admin (ex.: vela + capela MDF + terço): o cliente vê a
-- foto do kit e, com um toque, todos os itens vão pro carrinho como itens
-- normais (cada um no próprio preço — o kit não tem preço próprio).
create table public.kits (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  descricao     text,
  imagem_url    text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.kit_itens (
  id         uuid primary key default gen_random_uuid(),
  kit_id     uuid not null references public.kits(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  santo_id   uuid references public.santos(id) on delete set null,
  quantidade integer not null check (quantidade >= 1),
  ordem      integer not null default 0
);
create index kit_itens_kit_idx on public.kit_itens (kit_id);
create index kit_itens_produto_idx on public.kit_itens (produto_id);
create index kit_itens_santo_idx on public.kit_itens (santo_id);

alter table public.kits enable row level security;
alter table public.kit_itens enable row level security;

-- Mesmo padrão da vitrine pública (20260928180958): visitante vê kit ativo,
-- admin vê tudo e é o único que escreve.
create policy kits_ler_publico on public.kits for select to anon, authenticated using (ativo);
create policy kits_ler_admin on public.kits for select to authenticated using ((select public.eh_admin()));
create policy kits_admin_insert on public.kits for insert to authenticated with check ((select public.eh_admin()));
create policy kits_admin_update on public.kits for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy kits_admin_delete on public.kits for delete to authenticated using ((select public.eh_admin()));

create policy kit_itens_ler_publico on public.kit_itens for select to anon, authenticated
  using (exists (select 1 from public.kits k where k.id = kit_id and k.ativo));
create policy kit_itens_ler_admin on public.kit_itens for select to authenticated using ((select public.eh_admin()));
create policy kit_itens_admin_insert on public.kit_itens for insert to authenticated with check ((select public.eh_admin()));
create policy kit_itens_admin_update on public.kit_itens for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy kit_itens_admin_delete on public.kit_itens for delete to authenticated using ((select public.eh_admin()));

grant select on public.kits, public.kit_itens to anon;
