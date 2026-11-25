-- Desconto de fidelidade: pedido pago +2%, formulário +1%, vídeo aprovado +1%,
-- teto de 4% por pedido (antes: 3 + 2 + 2, teto 7). Aplicado no banco regravando
-- as funções a partir da definição atual (replace dos números):
--   privado.tg_pedido_pontos_status()            -> +2 ao pagar o pedido
--   public.responder_formulario(jsonb)           -> +1
--   public.admin_avaliar_feedback(uuid,boolean,text) -> vídeo aprovado +1
--   public.criar_pedido(uuid,text,text)          -> least(saldo, 4)
-- Quem já tinha ganhado o formulário com +2 passou para +1:
update public.pontos_movimentos
   set pontos = 1, descricao = 'Formulário respondido: +1% no próximo pedido'
 where motivo = 'formulario' and pontos = 2;
