-- Rodar UMA VEZ no Supabase → SQL Editor (projeto raio-de-luz-app).
-- Remove funções que sobraram de testes e versões antigas que o app não usa
-- mais. O canal de migração automática pede confirmação para DROP, por isso
-- este arquivo fica separado para rodar à mão.
--   teste_isolamento_*                      diagnóstico de 06/10, nunca usadas pelo app
--   adicionar_ao_carrinho(uuid,int,uuid)    versão antiga; o app usa a de 4 parâmetros
--   carrinho_compartilhado_itens(uuid)      versão antiga; o app usa a _v2
drop function if exists public.teste_isolamento_1();
drop function if exists public.teste_isolamento_2();
drop function if exists public.teste_isolamento_3();
drop function if exists public.teste_isolamento_4(uuid, text, text);
drop function if exists public.adicionar_ao_carrinho(uuid, integer, uuid);
drop function if exists public.carrinho_compartilhado_itens(uuid);
