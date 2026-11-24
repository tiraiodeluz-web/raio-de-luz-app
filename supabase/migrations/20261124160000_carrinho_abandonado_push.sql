-- Carrinho abandonado por notificação push (antes era WhatsApp via n8n, que
-- nunca foi configurado). Reaproveita eventos_push: os textos podem ser
-- editados e cada aviso desligado ali (coluna ativo).
insert into public.eventos_push (chave, descricao, publico, titulo, corpo, rota) values
  ('carrinho_60min', 'Carrinho parado há 1 hora', 'cliente',
   'Seu carrinho está te esperando 🛒', 'Olá, {nome}! Você deixou {total} em produtos no carrinho. Toque aqui para finalizar o pedido.', '/(tabs)/carrinho'),
  ('carrinho_1dia', 'Carrinho parado há 1 dia', 'cliente',
   'Ainda dá tempo de finalizar seu pedido', '{nome}, seus produtos continuam no carrinho ({total}). Toque aqui para concluir.', '/(tabs)/carrinho')
on conflict (chave) do nothing;

-- Roda a cada 5 minutos (cron 'carrinho-abandonado'). Regras:
--  * só cliente aprovado com itens no carrinho;
--  * 1º aviso: último item colocado há mais de 60 min; 2º: há mais de 1 dia;
--  * se o cliente colocar item novo depois de um aviso, a sequência recomeça;
--  * só das 8h às 20h (horário de Brasília) e não avisa quem está com o app aberto.
create or replace function privado.processar_carrinhos_abandonados()
returns integer language plpgsql security definer set search_path = public, privado as $$
declare
  r record;
  n integer := 0;
  v_hora integer := extract(hour from (now() at time zone 'America/Sao_Paulo'));
begin
  if v_hora < 8 or v_hora >= 20 then return 0; end if;
  perform set_config('app.interno', '1', true);

  for r in
    select pf.id, pf.nome,
           case
             when pf.carrinho_msg_60min_em is null or pf.carrinho_msg_60min_em < pf.ultimo_produto_carrinho then '60min'
             else '1dia'
           end as etapa,
           (select coalesce(sum(ci.quantidade * p.preco_efetivo), 0)
              from public.carrinho_itens ci join public.produtos p on p.id = ci.produto_id
             where ci.usuario_id = pf.id) as total
      from public.perfis pf
     where pf.tipo = 'cliente' and pf.cadastro_aprovado
       and pf.ultimo_produto_carrinho is not null
       and (pf.ultimo_acesso is null or pf.ultimo_acesso < now() - interval '5 minutes')
       and exists (select 1 from public.carrinho_itens ci where ci.usuario_id = pf.id)
       and (
             ((pf.carrinho_msg_60min_em is null or pf.carrinho_msg_60min_em < pf.ultimo_produto_carrinho)
              and pf.ultimo_produto_carrinho <= now() - interval '60 minutes')
          or (pf.carrinho_msg_60min_em is not null and pf.carrinho_msg_60min_em >= pf.ultimo_produto_carrinho
              and (pf.carrinho_msg_1dia_em is null or pf.carrinho_msg_1dia_em < pf.ultimo_produto_carrinho)
              and pf.ultimo_produto_carrinho <= now() - interval '1 day')
       )
     for update of pf skip locked
  loop
    perform privado.disparar_evento(
      case r.etapa when '60min' then 'carrinho_60min' else 'carrinho_1dia' end,
      r.id,
      jsonb_build_object('nome', split_part(r.nome, ' ', 1), 'total', public.formatar_reais(r.total)));
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
