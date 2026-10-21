-- Quantas vezes cada produto foi aberto no app, por dia e por cliente.
-- Alimenta os relatórios do painel web ("mais vistos", "viu e não comprou").
-- Visitante sem login conta no usuário "zero" (sem FK de propósito).
create table public.produto_visualizacoes (
  produto_id uuid not null references public.produtos(id) on delete cascade,
  usuario_id uuid not null default '00000000-0000-0000-0000-000000000000',
  dia        date not null,
  vezes      integer not null default 1,
  primary key (produto_id, dia, usuario_id)
);
create index produto_visualizacoes_dia_idx on public.produto_visualizacoes (dia);
create index produto_visualizacoes_usuario_idx on public.produto_visualizacoes (usuario_id);

alter table public.produto_visualizacoes enable row level security;
create policy produto_visualizacoes_admin_ler on public.produto_visualizacoes for select to authenticated
  using ((select public.eh_admin()));

-- O app chama ao abrir a tela do produto. Única forma de gravar (sem
-- insert direto), então ninguém consegue mexer na contagem de outro.
create or replace function public.registrar_visualizacao_produto(p_produto_id uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.produto_visualizacoes (produto_id, usuario_id, dia)
  select p.id,
         coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
         (now() at time zone 'America/Sao_Paulo')::date
    from public.produtos p
   where p.id = p_produto_id
  on conflict (produto_id, dia, usuario_id)
  do update set vezes = public.produto_visualizacoes.vezes + 1;
$$;

revoke execute on function public.registrar_visualizacao_produto(uuid) from public;
grant execute on function public.registrar_visualizacao_produto(uuid) to anon, authenticated;
