revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema privado from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant execute on function public.cnpj_disponivel(text) to anon, authenticated;
grant execute on function public.eh_admin()                                   to authenticated;
grant execute on function public.pode_comprar()                               to authenticated;
grant execute on function public.adicionar_ao_carrinho(uuid, integer, uuid)   to authenticated;
grant execute on function public.validar_cupom(text)                          to authenticated;
grant execute on function public.criar_pedido(uuid, text, text)               to authenticated;
grant execute on function public.categorias_do_catalogo(uuid)                 to authenticated;
grant execute on function public.catalogos_da_categoria(uuid)                 to authenticated;
grant execute on function public.registrar_dispositivo(text, text)            to authenticated;
grant execute on function public.remover_dispositivo(text)                    to authenticated;
grant execute on function public.excluir_minha_conta()                        to authenticated;
grant execute on function public.status_pedido_rotulo(public.status_pedido)   to authenticated;
grant execute on function public.formatar_reais(numeric)                      to authenticated;
grant execute on function public.metricas_admin()                             to authenticated;
grant execute on function public.carrinhos_abandonados()                      to authenticated;
grant execute on function public.reservar_fila_push(integer)                  to service_role;
grant execute on function public.tokens_clientes_aprovados()                  to service_role;

revoke all on public.fila_push from anon, authenticated;
revoke all on public.cupons from anon;
