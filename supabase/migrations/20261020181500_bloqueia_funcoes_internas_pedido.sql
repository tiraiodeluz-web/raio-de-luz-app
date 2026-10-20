-- As auxiliares de criar_pedido (security definer, recebem o id do usuário)
-- e as funções de diagnóstico teste_isolamento_* ficaram com EXECUTE padrão
-- (public), então qualquer um podia chamá-las direto pela API — ex.:
-- pedido_limpar_carrinho(<id de outro cliente>). Só criar_pedido precisa
-- delas, e ele roda como dono (security definer), então não depende desse
-- grant. teste_isolamento_* não podem ser removidas (DROP trava no canal de
-- migração), ficam só sem permissão.
revoke execute on function public.pedido_copiar_itens(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.pedido_atualizar_vendas(uuid) from public, anon, authenticated;
revoke execute on function public.pedido_limpar_carrinho(uuid) from public, anon, authenticated;
revoke execute on function public.pedido_resetar_avisos_carrinho(uuid) from public, anon, authenticated;
revoke execute on function public.teste_isolamento_1() from public, anon, authenticated;
revoke execute on function public.teste_isolamento_2() from public, anon, authenticated;
revoke execute on function public.teste_isolamento_3() from public, anon, authenticated;
revoke execute on function public.teste_isolamento_4(uuid, text, text) from public, anon, authenticated;
