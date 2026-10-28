-- Contador de notificações não lidas (sininho da home e número no ícone do app).
-- Guarda só o momento da última vez que a pessoa abriu a tela de notificações:
-- não lida = chegou depois disso e é pra ela (direta ou geral).
alter table public.perfis add column if not exists notificacoes_lidas_em timestamptz not null default now();

create or replace function public.contar_notificacoes_nao_lidas()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer
    from public.notificacoes n
    join public.perfis p on p.id = auth.uid()
   where n.criado_em > p.notificacoes_lidas_em
     and (n.destinatario_id = p.id or (n.destinatario_id is null and n.evento is null));
$$;

create or replace function public.marcar_notificacoes_lidas()
returns void language sql security definer set search_path = public as $$
  update public.perfis set notificacoes_lidas_em = now() where id = auth.uid();
$$;

revoke execute on function public.contar_notificacoes_nao_lidas(), public.marcar_notificacoes_lidas() from public, anon;
grant execute on function public.contar_notificacoes_nao_lidas(), public.marcar_notificacoes_lidas() to authenticated;
