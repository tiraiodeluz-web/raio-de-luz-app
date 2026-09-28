create extension if not exists pg_net;
create extension if not exists pg_cron;

insert into privado.config (chave, valor) values
  ('carrinho_msg_60min', 'Olá! Vi que você adicionou produtos ao carrinho, mas não finalizou o pedido. Posso te ajudar?'),
  ('carrinho_msg_1dia',  'Olá! Vi que você adicionou produtos ao carrinho, mas não finalizou o pedido. Posso te ajudar?')
on conflict (chave) do nothing;

create or replace function privado.processar_carrinhos_abandonados()
returns integer language plpgsql security definer set search_path = public, privado as $$
declare
  v_url text := privado.cfg('n8n_carrinho_url');
  r record;
  n integer := 0;
begin
  if v_url is null then return 0; end if;
  perform set_config('app.interno', '1', true);

  for r in
    select pf.id, pf.nome, pf.telefone,
           case when pf.carrinho_msg_60min_em is null then '60min' else '1dia' end as etapa
      from public.perfis pf
     where pf.tipo = 'cliente' and pf.cadastro_aprovado
       and coalesce(pf.telefone, '') <> ''
       and pf.ultimo_produto_carrinho is not null
       and exists (select 1 from public.carrinho_itens ci where ci.usuario_id = pf.id)
       and (
             (pf.carrinho_msg_60min_em is null
              and pf.ultimo_produto_carrinho <= now() - interval '60 minutes')
          or (pf.carrinho_msg_60min_em is not null and pf.carrinho_msg_1dia_em is null
              and pf.ultimo_produto_carrinho <= now() - interval '1 day')
       )
     for update of pf skip locked
  loop
    perform net.http_post(
      url     := v_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := jsonb_build_object(
                   'nome', r.nome,
                   'telefone', r.telefone,
                   'mensagem', privado.cfg('carrinho_msg_' || r.etapa),
                   'etapa', r.etapa)
    );
    if r.etapa = '60min' then
      update public.perfis set carrinho_msg_60min_em = now() where id = r.id;
    else
      update public.perfis set carrinho_msg_1dia_em = now() where id = r.id;
    end if;
    n := n + 1;
  end loop;

  perform set_config('app.interno', '', true);
  return n;
end $$;

create or replace function privado.reprocessar_fila_push()
returns void language plpgsql security definer set search_path = public, privado as $$
begin
  if exists (select 1 from public.fila_push
              where status in ('pendente', 'enviando') and tentativas < 5
                and criado_em < now() - interval '1 minute') then
    perform privado.chamar_processar_push();
  end if;
end $$;

select cron.schedule('carrinho-abandonado', '*/5 * * * *', 'select privado.processar_carrinhos_abandonados()');
select cron.schedule('fila-push-reprocessar', '* * * * *', 'select privado.reprocessar_fila_push()');
