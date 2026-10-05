create table public.favoritos (
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (usuario_id, produto_id)
);

alter table public.favoritos enable row level security;

create policy favoritos_proprio on public.favoritos for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());
