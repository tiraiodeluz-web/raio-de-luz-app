-- Pontos ligados aos pedidos: ganhar ao pedir, estornar ao cancelar e usar
-- o desconto trocado no próximo pedido.

-- Pedido novo: 25 pts se o subtotal (produtos, antes de descontos) passa de
-- R$ 2.000; mais 25 se o cliente usou a RDL AI no dia do pedido ou no anterior.
create or replace function privado.tg_pedido_pontos()
returns trigger language plpgsql security definer set search_path = public, privado as $$
begin
  if new.cliente_id is null then return null; end if;
  if new.subtotal >= 2000 then
    insert into public.pontos_movimentos (usuario_id, pontos, motivo, referencia_id, descricao)
    values (new.cliente_id, 25, 'pedido_2k', new.id, format('Pedido Nº %s acima de R$ 2.000', new.numero))
    on conflict do nothing;
  end if;
  if exists (select 1 from public.assistente_uso
              where usuario_id = new.cliente_id and mensagens > 0
                and dia >= (now() at time zone 'America/Sao_Paulo')::date - 1) then
    insert into public.pontos_movimentos (usuario_id, pontos, motivo, referencia_id, descricao)
    values (new.cliente_id, 25, 'ia_pedido', new.id, format('Pedido Nº %s com ajuda da RDL AI', new.numero))
    on conflict do nothing;
  end if;
  return null;
end $$;
create trigger pedido_pontos after insert on public.pedidos
  for each row execute function privado.tg_pedido_pontos();

-- Cancelou: tira os pontos ganhos com o pedido e devolve o desconto usado.
-- Descancelou: desfaz o estorno e volta a marcar o desconto como usado.
create or replace function privado.tg_pedido_pontos_status()
returns trigger language plpgsql security definer set search_path = public, privado as $$
declare v_ganhos integer; v_r public.pontos_resgates%rowtype;
begin
  if new.cliente_id is null or new.status is not distinct from old.status then return null; end if;
  if new.status = 'cancelado' then
    select coalesce(sum(pontos), 0) into v_ganhos from public.pontos_movimentos
     where usuario_id = new.cliente_id and referencia_id = new.id and motivo in ('pedido_2k', 'ia_pedido');
    if v_ganhos > 0 then
      insert into public.pontos_movimentos (usuario_id, pontos, motivo, referencia_id, descricao)
      values (new.cliente_id, -v_ganhos, 'estorno', new.id, format('Pedido Nº %s cancelado', new.numero))
      on conflict do nothing;
    end if;
    select * into v_r from public.pontos_resgates where id = new.pontos_resgate_id and status = 'usado';
    if v_r.id is not null then
      if exists (select 1 from public.pontos_resgates where usuario_id = v_r.usuario_id and status = 'disponivel') then
        update public.pontos_resgates set status = 'cancelado' where id = v_r.id;
        insert into public.pontos_movimentos (usuario_id, pontos, motivo, referencia_id, descricao)
        values (v_r.usuario_id, v_r.pontos, 'estorno', v_r.id, format('Pedido Nº %s cancelado: pontos da troca devolvidos', new.numero))
        on conflict do nothing;
      else
        update public.pontos_resgates set status = 'disponivel', pedido_id = null, usado_em = null where id = v_r.id;
      end if;
    end if;
  elsif old.status = 'cancelado' then
    delete from public.pontos_movimentos where motivo = 'estorno' and referencia_id = new.id;
    update public.pontos_resgates set status = 'usado', pedido_id = new.id, usado_em = now()
     where id = new.pontos_resgate_id and status = 'disponivel';
  end if;
  return null;
end $$;
create trigger pedido_pontos_status after update of status on public.pedidos
  for each row execute function privado.tg_pedido_pontos_status();

-- Desconto da troca de pontos que vale para este pedido (sem marcar como usado).
create or replace function public.pedido_desconto_pontos(p_uid uuid, p_base numeric)
returns table (resgate_id uuid, valor numeric) language sql stable security definer set search_path = public as $$
  select r.id, least(round(p_base * r.percentual / 100, 2), greatest(p_base, 0))
    from public.pontos_resgates r where r.usuario_id = p_uid and r.status = 'disponivel' limit 1;
$$;

create or replace function public.pedido_usar_resgate(p_resgate_id uuid, p_pedido_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.pontos_resgates set status = 'usado', pedido_id = p_pedido_id, usado_em = now()
   where id = p_resgate_id and status = 'disponivel';
$$;

revoke execute on function public.pedido_desconto_pontos(uuid, numeric), public.pedido_usar_resgate(uuid, uuid)
  from public, anon, authenticated;
