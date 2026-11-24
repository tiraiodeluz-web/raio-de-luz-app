-- Conversas dos clientes com a RDL AI, para o painel (ficha do cliente).
-- Só o servidor grava (service_role, na Edge Function "assistente"); só admin lê.
-- Ficam guardadas por 24 horas úteis (segunda a sexta; fim de semana não conta)
-- e depois são apagadas, junto com as fotos (guardadas aqui mesmo, em base64).
create table public.assistente_mensagens (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfis(id) on delete cascade,
  papel       text not null check (papel in ('cliente', 'assistente')),
  texto       text not null default '',
  foto_base64 text,
  produtos    jsonb,
  acoes       text[],
  criado_em   timestamptz not null default now()
);
create index assistente_mensagens_usuario_idx on public.assistente_mensagens (usuario_id, criado_em desc);
create index assistente_mensagens_criado_idx on public.assistente_mensagens (criado_em);

alter table public.assistente_mensagens enable row level security;
create policy assistente_mensagens_admin_ler on public.assistente_mensagens for select to authenticated
  using ((select public.eh_admin()));
revoke all on public.assistente_mensagens from anon, authenticated;
grant select on public.assistente_mensagens to authenticated;

create or replace function privado.limpar_assistente_mensagens()
returns integer language plpgsql security definer set search_path = public, privado as $$
declare n integer;
begin
  delete from public.assistente_mensagens m
   where m.criado_em < now() - interval '24 hours' - make_interval(hours => 24 * (
           select count(*)::integer
             from generate_series(
                    date_trunc('day', m.criado_em at time zone 'America/Sao_Paulo'),
                    date_trunc('day', now() at time zone 'America/Sao_Paulo'),
                    interval '1 day') d
            where extract(isodow from d) in (6, 7)));
  get diagnostics n = row_count;
  return n;
end $$;

select cron.schedule('assistente-limpeza', '0 * * * *', 'select privado.limpar_assistente_mensagens()');

-- O texto do aviso mudou (agora a empresa guarda a conversa por 24 horas úteis):
-- quem aceitou o aviso antigo precisa aceitar de novo antes de usar a RDL AI.
update public.perfis set ia_consentimento_em = null where ia_consentimento_em is not null;
