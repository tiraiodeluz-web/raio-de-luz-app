-- Corrige a regra 2 (sem login, o cliente navega pela Home e Catálogos):
-- as políticas antigas exigiam pode_comprar() (cadastro aprovado ou admin)
-- até para SELECT, então nem visitante anônimo nem cadastro pendente viam
-- produto nenhum. A vitrine agora é pública; só ações de compra (carrinho,
-- cupom, pedido) continuam exigindo aprovação.

drop policy catalogos_ler on public.catalogos;
create policy catalogos_ler_publico on public.catalogos for select to anon, authenticated
  using (ativo);
create policy catalogos_ler_admin on public.catalogos for select to authenticated
  using ((select public.eh_admin()));

drop policy categorias_ler on public.categorias;
create policy categorias_ler_publico on public.categorias for select to anon, authenticated
  using (ativo);
create policy categorias_ler_admin on public.categorias for select to authenticated
  using ((select public.eh_admin()));

drop policy santos_ler on public.santos;
create policy santos_ler_publico on public.santos for select to anon, authenticated
  using (ativo);
create policy santos_ler_admin on public.santos for select to authenticated
  using ((select public.eh_admin()));

drop policy produtos_ler on public.produtos;
create policy produtos_ler_publico on public.produtos for select to anon, authenticated
  using (ativo);
create policy produtos_ler_admin on public.produtos for select to authenticated
  using ((select public.eh_admin()));

drop policy produto_santos_ler on public.produto_santos;
create policy produto_santos_ler_publico on public.produto_santos for select to anon, authenticated
  using (exists (select 1 from public.produtos p where p.id = produto_id and p.ativo));
create policy produto_santos_ler_admin on public.produto_santos for select to authenticated
  using ((select public.eh_admin()));

drop policy banners_ler on public.banners;
create policy banners_ler_publico on public.banners for select to anon, authenticated
  using (ativo);
create policy banners_ler_admin on public.banners for select to authenticated
  using ((select public.eh_admin()));

-- As funções que essas políticas chamavam (pode_comprar/eh_admin) só têm
-- EXECUTE para authenticated; por isso as políticas públicas acima não as
-- chamam (senão dariam erro de permissão para o role anon).
grant select on public.catalogos, public.categorias, public.santos,
  public.produtos, public.produto_santos, public.banners to anon;
