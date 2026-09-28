create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

create table privado.config (
  chave text primary key,
  valor text not null
);

create or replace function privado.cfg(p_chave text)
returns text language sql stable security definer set search_path = privado as $$
  select valor from privado.config where chave = p_chave;
$$;

create table public.dispositivos_push (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references public.perfis(id) on delete cascade,
  token         text not null unique,
  plataforma    text not null check (plataforma in ('ios', 'android')),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index dispositivos_usuario_idx on public.dispositivos_push (usuario_id) where ativo;
create trigger dispositivos_atualizado_em before update on public.dispositivos_push
  for each row execute function public.tg_set_atualizado_em();

alter table public.dispositivos_push enable row level security;
create policy dispositivos_proprio on public.dispositivos_push for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_admin()));
create policy dispositivos_apagar on public.dispositivos_push for delete to authenticated
  using (usuario_id = (select auth.uid()));

create or replace function public.registrar_dispositivo(p_token text, p_plataforma text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;
  insert into public.dispositivos_push (usuario_id, token, plataforma)
  values (auth.uid(), p_token, p_plataforma)
  on conflict (token) do update
    set usuario_id = excluded.usuario_id, plataforma = excluded.plataforma, ativo = true;
end $$;
grant execute on function public.registrar_dispositivo(text, text) to authenticated;

create or replace function public.remover_dispositivo(p_token text)
returns void language sql security definer set search_path = public as $$
  delete from public.dispositivos_push where token = p_token and usuario_id = auth.uid();
$$;
grant execute on function public.remover_dispositivo(text) to authenticated;

create table public.eventos_push (
  chave       text primary key,
  descricao   text not null,
  publico     text not null check (publico in ('cliente', 'admins')),
  ativo       boolean not null default true,
  titulo      text not null,
  corpo       text not null,
  rota        text,
  atualizado_em timestamptz not null default now()
);
create trigger eventos_push_atualizado_em before update on public.eventos_push
  for each row execute function public.tg_set_atualizado_em();
alter table public.eventos_push enable row level security;
create policy eventos_push_admin on public.eventos_push for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

insert into public.eventos_push (chave, descricao, publico, titulo, corpo, rota) values
  ('pedido_novo', 'Novo pedido recebido', 'admins',
   'Novo pedido Nº {numero}', '{cliente} enviou um pedido de {total}.', '/admin/pedidos/{pedido_id}'),
  ('pedido_status', 'Status do pedido alterado', 'cliente',
   'Pedido Nº {numero}', 'Seu pedido agora está: {status}.', '/pedidos/{pedido_id}'),
  ('cadastro_novo', 'Novo cadastro aguardando aprovação', 'admins',
   'Novo cadastro', '{nome} ({razao_social}) aguarda aprovação.', '/admin/clientes?aba=aprovar'),
  ('cadastro_aprovado', 'Cadastro do cliente aprovado', 'cliente',
   'Cadastro aprovado!', 'Olá, {nome}! Seu cadastro foi aprovado e você já pode fazer pedidos.', '/');

create table public.fila_push (
  id              bigint generated always as identity primary key,
  notificacao_id  uuid not null references public.notificacoes(id) on delete cascade,
  status          text not null default 'pendente' check (status in ('pendente', 'enviando', 'enviado', 'erro')),
  tentativas      integer not null default 0,
  erro            text,
  criado_em       timestamptz not null default now(),
  processado_em   timestamptz
);
create index fila_push_pendentes on public.fila_push (criado_em) where status in ('pendente', 'enviando');
create index fila_push_notificacao_idx on public.fila_push (notificacao_id);
alter table public.fila_push enable row level security;

create or replace function public.status_pedido_rotulo(s public.status_pedido)
returns text language sql immutable set search_path = public as $$
  select case s
    when 'aguardando_pagamento' then 'Aguardando Pagamento'
    when 'pago'                 then 'Pago'
    when 'em_separacao'         then 'Em Separação'
    when 'em_producao'          then 'Em Produção'
    when 'enviado'              then 'Enviado'
    when 'entregue'             then 'Entregue'
    when 'cancelado'            then 'Cancelado'
  end;
$$;

create or replace function public.formatar_reais(v numeric)
returns text language sql immutable set search_path = public as $$
  select 'R$ ' || replace(replace(replace(to_char(coalesce(v, 0), 'FM999G999G990D00'), ',', '#'), '.', ','), '#', '.');
$$;

create or replace function privado.aplicar_modelo(p_texto text, p_vars jsonb)
returns text language plpgsql immutable set search_path = public as $$
declare
  k text; v text; r text := p_texto;
begin
  if r is null then return null; end if;
  for k, v in select * from jsonb_each_text(p_vars) loop
    r := replace(r, '{' || k || '}', coalesce(v, ''));
  end loop;
  return r;
end $$;

create or replace function privado.disparar_evento(p_chave text, p_usuario uuid, p_vars jsonb)
returns void language plpgsql security definer set search_path = public, privado as $$
declare
  e public.eventos_push%rowtype;
  dest uuid;
  n_id uuid;
begin
  select * into e from public.eventos_push where chave = p_chave and ativo;
  if not found then return; end if;

  for dest in
    select p_usuario where e.publico = 'cliente' and p_usuario is not null
    union all
    select id from public.perfis where e.publico = 'admins' and tipo = 'admin'
  loop
    insert into public.notificacoes (titulo, corpo, rota_destino, destinatario_id, evento)
    values (privado.aplicar_modelo(e.titulo, p_vars),
            privado.aplicar_modelo(e.corpo, p_vars),
            privado.aplicar_modelo(e.rota, p_vars),
            dest, p_chave)
    returning id into n_id;
  end loop;
end $$;

create or replace function privado.tg_notificacao_para_fila()
returns trigger language plpgsql security definer set search_path = public, privado as $$
begin
  insert into public.fila_push (notificacao_id) values (new.id);
  return new;
end $$;
create trigger notificacao_para_fila after insert on public.notificacoes
  for each row execute function privado.tg_notificacao_para_fila();

create or replace function privado.chamar_processar_push()
returns void language plpgsql security definer set search_path = public, privado as $$
declare
  v_url text := privado.cfg('edge_functions_url');
  v_seg text := privado.cfg('push_segredo');
begin
  if v_url is null or v_seg is null then return; end if;
  perform net.http_post(
    url     := v_url || '/processar-fila-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-segredo', v_seg),
    body    := '{}'::jsonb
  );
end $$;

create or replace function privado.tg_fila_acionar()
returns trigger language plpgsql security definer set search_path = public, privado as $$
begin
  perform privado.chamar_processar_push();
  return null;
end $$;
create trigger fila_acionar after insert on public.fila_push
  for each statement execute function privado.tg_fila_acionar();

create or replace function privado.tg_evento_pedido_novo()
returns trigger language plpgsql security definer set search_path = public, privado as $$
begin
  perform privado.disparar_evento('pedido_novo', new.cliente_id, jsonb_build_object(
    'numero', new.numero, 'pedido_id', new.id, 'total', public.formatar_reais(new.total),
    'cliente', coalesce(nullif(new.cliente_snapshot->>'razao_social', ''), new.cliente_snapshot->>'nome'),
    'status', public.status_pedido_rotulo(new.status)));
  return null;
end $$;
create trigger evento_pedido_novo after insert on public.pedidos
  for each row execute function privado.tg_evento_pedido_novo();

create or replace function privado.tg_evento_pedido_status()
returns trigger language plpgsql security definer set search_path = public, privado as $$
begin
  if new.status is distinct from old.status and new.cliente_id is not null then
    perform privado.disparar_evento('pedido_status', new.cliente_id, jsonb_build_object(
      'numero', new.numero, 'pedido_id', new.id, 'total', public.formatar_reais(new.total),
      'status', public.status_pedido_rotulo(new.status)));
  end if;
  return null;
end $$;
create trigger evento_pedido_status after update of status on public.pedidos
  for each row execute function privado.tg_evento_pedido_status();

create or replace function privado.tg_evento_cadastro_novo()
returns trigger language plpgsql security definer set search_path = public, privado as $$
begin
  if new.tipo = 'cliente' and not new.cadastro_aprovado then
    perform privado.disparar_evento('cadastro_novo', new.id, jsonb_build_object(
      'nome', new.nome, 'razao_social', coalesce(new.razao_social, ''), 'usuario_id', new.id));
  end if;
  return null;
end $$;
create trigger evento_cadastro_novo after insert on public.perfis
  for each row execute function privado.tg_evento_cadastro_novo();

create or replace function privado.tg_evento_cadastro_aprovado()
returns trigger language plpgsql security definer set search_path = public, privado as $$
begin
  if new.tipo = 'cliente' and new.cadastro_aprovado and not old.cadastro_aprovado then
    perform privado.disparar_evento('cadastro_aprovado', new.id, jsonb_build_object(
      'nome', new.nome, 'razao_social', coalesce(new.razao_social, ''), 'usuario_id', new.id));
  end if;
  return null;
end $$;
create trigger evento_cadastro_aprovado after update of cadastro_aprovado on public.perfis
  for each row execute function privado.tg_evento_cadastro_aprovado();

create or replace function public.reservar_fila_push(p_limite integer default 50)
returns table (id bigint, notificacao_id uuid)
language sql security definer set search_path = public as $$
  update public.fila_push f
     set status = 'enviando', tentativas = f.tentativas + 1
   where f.id in (
     select id from public.fila_push
      where (status = 'pendente' or (status = 'enviando' and criado_em < now() - interval '2 minutes'))
        and tentativas < 5
      order by id
      limit p_limite
      for update skip locked)
  returning f.id, f.notificacao_id;
$$;

create or replace function public.tokens_clientes_aprovados()
returns table (token text)
language sql stable security definer set search_path = public as $$
  select d.token from public.dispositivos_push d
    join public.perfis p on p.id = d.usuario_id
   where d.ativo and p.tipo = 'cliente' and p.cadastro_aprovado;
$$;

revoke execute on function public.reservar_fila_push(integer) from public, anon, authenticated;
revoke execute on function public.tokens_clientes_aprovados() from public, anon, authenticated;
grant execute on function public.reservar_fila_push(integer) to service_role;
grant execute on function public.tokens_clientes_aprovados() to service_role;
