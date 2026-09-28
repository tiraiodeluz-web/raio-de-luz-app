-- As rotas de eventos_push foram escritas na etapa 2, antes de as telas
-- reais existirem (etapas 3-7), e não batem com as rotas que o app
-- realmente tem hoje:
--   pedido_novo:        /admin/pedidos/{pedido_id}  →  a lista é /admin/pedidos,
--                        o detalhe é /admin/pedido/[id] (singular)
--   pedido_status:      /pedidos/{pedido_id}        →  a aba é /(tabs)/pedidos,
--                        o detalhe fora da aba é /pedido/[id] (singular)
--   cadastro_aprovado:  /                           →  essa é a splash (Boas-vindas),
--                        o Início de verdade é o grupo /(tabs)

update public.eventos_push set rota = '/admin/pedido/{pedido_id}' where chave = 'pedido_novo';
update public.eventos_push set rota = '/pedido/{pedido_id}'       where chave = 'pedido_status';
update public.eventos_push set rota = '/(tabs)'                   where chave = 'cadastro_aprovado';
-- cadastro_novo (/admin/clientes?aba=aprovar) já bate com a rota real.
