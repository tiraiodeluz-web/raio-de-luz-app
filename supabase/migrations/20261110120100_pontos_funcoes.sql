-- Funções do programa de pontos (ver 20261110120000_pontos_tabelas.sql).

create or replace function public.pontos_saldo(p_uid uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(pontos), 0)::integer from public.pontos_movimentos where usuario_id = p_uid;
$$;

-- Troca pontos por um desconto (%) que vale no próximo pedido.
create or replace function public.resgatar_pontos(p_pontos integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_pct numeric := case p_pontos when 60 then 3 when 80 then 5 when 100 then 7 end;
  v_id  uuid;
begin
  if not public.pode_comprar() then
    raise exception 'Cadastro ainda não aprovado' using errcode = '42501';
  end if;
  if v_pct is null then
    raise exception 'Prêmio inválido' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext('pontos:' || v_uid::text));
  if exists (select 1 from public.pontos_resgates where usuario_id = v_uid and status = 'disponivel') then
    raise exception 'Você já tem um desconto esperando o próximo pedido' using errcode = 'P0001';
  end if;
  if public.pontos_saldo(v_uid) < p_pontos then
    raise exception 'Pontos insuficientes' using errcode = 'P0001';
  end if;
  insert into public.pontos_resgates (usuario_id, pontos, percentual)
  values (v_uid, p_pontos, v_pct) returning id into v_id;
  insert into public.pontos_movimentos (usuario_id, pontos, motivo, referencia_id, descricao)
  values (v_uid, -p_pontos, 'resgate', v_id, format('Troca: %s%% de desconto', v_pct::integer));
  return v_id;
end $$;

-- Desiste de um desconto ainda não usado: os pontos voltam.
create or replace function public.cancelar_resgate_pontos(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_r public.pontos_resgates%rowtype;
begin
  update public.pontos_resgates set status = 'cancelado'
   where id = p_id and usuario_id = auth.uid() and status = 'disponivel'
  returning * into v_r;
  if v_r.id is null then
    raise exception 'Desconto não encontrado ou já usado' using errcode = 'P0001';
  end if;
  insert into public.pontos_movimentos (usuario_id, pontos, motivo, referencia_id, descricao)
  values (v_r.usuario_id, v_r.pontos, 'estorno', v_r.id, 'Troca cancelada: pontos devolvidos');
end $$;

-- Formulário (uma vez por cliente): 20 pontos na hora.
create or replace function public.responder_formulario(p_respostas jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.pode_comprar() then
    raise exception 'Cadastro ainda não aprovado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_respostas) <> 'object' then
    raise exception 'Respostas inválidas' using errcode = '22023';
  end if;
  insert into public.formulario_respostas (usuario_id, respostas) values (auth.uid(), p_respostas)
  on conflict (usuario_id) do nothing;
  if not found then
    raise exception 'Você já respondeu o formulário' using errcode = 'P0001';
  end if;
  insert into public.pontos_movimentos (usuario_id, pontos, motivo, descricao)
  values (auth.uid(), 20, 'formulario', 'Formulário respondido')
  on conflict do nothing;
end $$;

-- Feedback (texto ou vídeo): fica pendente até o admin aprovar.
create or replace function public.enviar_feedback(p_tipo text, p_texto text, p_video_path text, p_consentimento boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if not public.pode_comprar() then
    raise exception 'Cadastro ainda não aprovado' using errcode = '42501';
  end if;
  if p_consentimento is not true then
    raise exception 'É preciso autorizar o uso do feedback para divulgação' using errcode = 'P0001';
  end if;
  if p_tipo = 'texto' and length(trim(coalesce(p_texto, ''))) < 30 then
    raise exception 'Escreva pelo menos 30 caracteres' using errcode = 'P0001';
  end if;
  if p_tipo = 'video' and coalesce(p_video_path, '') not like v_uid::text || '/%' then
    raise exception 'Vídeo inválido' using errcode = 'P0001';
  end if;
  if p_tipo not in ('texto', 'video') then
    raise exception 'Tipo inválido' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.feedbacks where usuario_id = v_uid and tipo = p_tipo and status in ('pendente', 'aprovado')) then
    raise exception 'Você já enviou esse feedback' using errcode = 'P0001';
  end if;
  insert into public.feedbacks (usuario_id, tipo, texto, video_path, consentimento_marketing)
  values (v_uid, p_tipo, nullif(trim(p_texto), ''), case when p_tipo = 'video' then p_video_path end, true)
  returning id into v_id;
  return v_id;
end $$;

-- Admin aprova (dá os pontos e avisa o cliente) ou recusa um feedback.
create or replace function public.admin_avaliar_feedback(p_id uuid, p_aprovar boolean, p_motivo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_f public.feedbacks%rowtype; v_pts integer;
begin
  if not public.eh_admin() then
    raise exception 'Acesso restrito ao admin' using errcode = '42501';
  end if;
  update public.feedbacks
     set status = case when p_aprovar then 'aprovado' else 'recusado' end,
         motivo_recusa = case when p_aprovar then null else nullif(trim(p_motivo), '') end,
         analisado_em = now()
   where id = p_id and status = 'pendente'
  returning * into v_f;
  if v_f.id is null then
    raise exception 'Feedback não encontrado ou já analisado' using errcode = 'P0001';
  end if;
  v_pts := case v_f.tipo when 'video' then 30 else 10 end;
  if p_aprovar then
    insert into public.pontos_movimentos (usuario_id, pontos, motivo, referencia_id, descricao)
    values (v_f.usuario_id, v_pts, 'feedback_' || v_f.tipo, v_f.id,
            case v_f.tipo when 'video' then 'Feedback em vídeo aprovado' else 'Feedback em texto aprovado' end)
    on conflict do nothing;
    insert into public.notificacoes (titulo, corpo, destinatario_id, rota_destino)
    values ('Seu feedback foi aprovado! 🎉', format('Obrigado! Você ganhou %s pontos.', v_pts), v_f.usuario_id, '/pontos');
  else
    insert into public.notificacoes (titulo, corpo, destinatario_id, rota_destino)
    values ('Sobre o seu feedback',
            coalesce('Não conseguimos aprovar: ' || nullif(trim(p_motivo), ''), 'Não conseguimos aprovar seu feedback. Você pode enviar outro.'),
            v_f.usuario_id, '/pontos');
  end if;
end $$;

revoke execute on function public.pontos_saldo(uuid) from public, anon, authenticated;
revoke execute on function public.resgatar_pontos(integer), public.cancelar_resgate_pontos(uuid),
  public.responder_formulario(jsonb), public.enviar_feedback(text, text, text, boolean),
  public.admin_avaliar_feedback(uuid, boolean, text) from public, anon;
grant execute on function public.resgatar_pontos(integer), public.cancelar_resgate_pontos(uuid),
  public.responder_formulario(jsonb), public.enviar_feedback(text, text, text, boolean),
  public.admin_avaliar_feedback(uuid, boolean, text) to authenticated;
