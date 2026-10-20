-- Controle de uso do assistente de IA: quantas mensagens cada cliente
-- mandou por dia (limite na Edge Function "assistente") e quantos tokens
-- gastou, pra acompanhar o custo.
create table public.assistente_uso (
  usuario_id     uuid not null references public.perfis(id) on delete cascade,
  dia            date not null,
  mensagens      integer not null default 0,
  tokens_entrada bigint not null default 0,
  tokens_saida   bigint not null default 0,
  primary key (usuario_id, dia)
);
alter table public.assistente_uso enable row level security;
create policy assistente_uso_ler_proprio on public.assistente_uso for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_admin()));

create or replace function public.assistente_registrar_mensagem()
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v_total integer;
begin
  if not public.pode_comprar() then
    raise exception 'Cadastro ainda não aprovado' using errcode = '42501';
  end if;
  insert into public.assistente_uso (usuario_id, dia, mensagens)
  values (auth.uid(), (now() at time zone 'America/Sao_Paulo')::date, 1)
  on conflict (usuario_id, dia) do update set mensagens = assistente_uso.mensagens + 1
  returning mensagens into v_total;
  return v_total;
end $$;

create or replace function public.assistente_registrar_tokens(p_entrada integer, p_saida integer)
returns void language sql security definer set search_path to 'public' as $$
  update public.assistente_uso
     set tokens_entrada = tokens_entrada + greatest(p_entrada, 0),
         tokens_saida = tokens_saida + greatest(p_saida, 0)
   where usuario_id = auth.uid() and dia = (now() at time zone 'America/Sao_Paulo')::date;
$$;

revoke execute on function public.assistente_registrar_mensagem() from public, anon;
revoke execute on function public.assistente_registrar_tokens(integer, integer) from public, anon;
grant execute on function public.assistente_registrar_mensagem() to authenticated;
grant execute on function public.assistente_registrar_tokens(integer, integer) to authenticated;
