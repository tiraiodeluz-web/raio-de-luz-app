drop policy banners_admin on public.banners;
create policy banners_admin_insert on public.banners for insert to authenticated with check ((select public.eh_admin()));
create policy banners_admin_update on public.banners for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy banners_admin_delete on public.banners for delete to authenticated using ((select public.eh_admin()));

drop policy catalogos_admin on public.catalogos;
create policy catalogos_admin_insert on public.catalogos for insert to authenticated with check ((select public.eh_admin()));
create policy catalogos_admin_update on public.catalogos for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy catalogos_admin_delete on public.catalogos for delete to authenticated using ((select public.eh_admin()));

drop policy categorias_admin on public.categorias;
create policy categorias_admin_insert on public.categorias for insert to authenticated with check ((select public.eh_admin()));
create policy categorias_admin_update on public.categorias for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy categorias_admin_delete on public.categorias for delete to authenticated using ((select public.eh_admin()));

drop policy produto_santos_admin on public.produto_santos;
create policy produto_santos_admin_insert on public.produto_santos for insert to authenticated with check ((select public.eh_admin()));
create policy produto_santos_admin_update on public.produto_santos for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy produto_santos_admin_delete on public.produto_santos for delete to authenticated using ((select public.eh_admin()));

drop policy produtos_admin on public.produtos;
create policy produtos_admin_insert on public.produtos for insert to authenticated with check ((select public.eh_admin()));
create policy produtos_admin_update on public.produtos for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy produtos_admin_delete on public.produtos for delete to authenticated using ((select public.eh_admin()));

drop policy santos_admin on public.santos;
create policy santos_admin_insert on public.santos for insert to authenticated with check ((select public.eh_admin()));
create policy santos_admin_update on public.santos for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy santos_admin_delete on public.santos for delete to authenticated using ((select public.eh_admin()));
