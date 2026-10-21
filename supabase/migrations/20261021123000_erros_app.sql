-- Monitor de erros do app (src/lib/monitor-erros.ts): erros de JavaScript
-- capturados no celular ficam aqui pro admin ver em Admin → Erros do app.
create table public.erros_app (
  id          uuid primary key default gen_random_uuid(),
  criado_em   timestamptz not null default now(),
  usuario_id  uuid references public.perfis(id) on delete set null default auth.uid(),
  mensagem    text not null check (length(mensagem) <= 2000),
  stack       text check (length(stack) <= 8000),
  tela        text check (length(tela) <= 300),
  origem      text not null check (origem in ('tela', 'global', 'manual')),
  fatal       boolean not null default false,
  plataforma  text check (length(plataforma) <= 50),
  versao_app  text check (length(versao_app) <= 100)
);
create index erros_app_criado_idx on public.erros_app (criado_em desc);
create index erros_app_usuario_idx on public.erros_app (usuario_id);

alter table public.erros_app enable row level security;

-- Qualquer um (inclusive sem login) registra erro, mas só em nome próprio;
-- só o admin lê e apaga.
create policy erros_app_registrar on public.erros_app for insert to anon, authenticated
  with check (usuario_id is null or usuario_id = (select auth.uid()));
create policy erros_app_ler_admin on public.erros_app for select to authenticated
  using ((select public.eh_admin()));
create policy erros_app_apagar_admin on public.erros_app for delete to authenticated
  using ((select public.eh_admin()));

grant insert on public.erros_app to anon;
