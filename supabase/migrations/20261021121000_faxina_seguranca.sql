-- Faxina apontada pelo verificador de segurança do Supabase:
-- 1) compartilhar_carrinho e repetir_pedido exigem login (usam auth.uid());
--    tira a permissão do visitante não logado (anon).
-- 2) Fixa o search_path das funções que estavam sem, pra ninguém conseguir
--    "trocar" uma tabela por outra de mesmo nome em outro schema.
-- cnpj_disponivel continua liberada pro anon de propósito: o cadastro
-- consulta antes de a pessoa ter login.
revoke execute on function public.compartilhar_carrinho() from public, anon;
revoke execute on function public.repetir_pedido(uuid) from public, anon;
grant execute on function public.compartilhar_carrinho() to authenticated;
grant execute on function public.repetir_pedido(uuid) to authenticated;

alter function public.produtos_recomendados(uuid, integer) set search_path to 'public';
alter function public.produtos_por_codigos(text[]) set search_path to 'public';
alter function public.carrinho_compartilhado_itens(uuid) set search_path to 'public';
alter function public.carrinho_compartilhado_itens_v2(uuid) set search_path to 'public';
