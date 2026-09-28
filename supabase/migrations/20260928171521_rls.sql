create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid() and tipo = 'admin');
$$;

create or replace function public.pode_comprar()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfis
    where id = auth.uid() and (tipo = 'admin' or cadastro_aprovado)
  );
$$;

revoke execute on function public.eh_admin() from public, anon;
revoke execute on function public.pode_comprar() from public, anon;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.pode_comprar() to authenticated;

alter table public.perfis          enable row level security;
alter table public.catalogos       enable row level security;
alter table public.categorias      enable row level security;
alter table public.santos          enable row level security;
alter table public.produtos        enable row level security;
alter table public.produto_santos  enable row level security;
alter table public.cupons          enable row level security;
alter table public.carrinho_itens  enable row level security;
alter table public.enderecos       enable row level security;
alter table public.pedidos         enable row level security;
alter table public.pedido_itens    enable row level security;
alter table public.banners         enable row level security;
alter table public.notificacoes    enable row level security;

create policy perfis_ler_proprio on public.perfis for select to authenticated
  using (id = (select auth.uid()) or (select public.eh_admin()));
create policy perfis_editar_proprio on public.perfis for update to authenticated
  using (id = (select auth.uid()) or (select public.eh_admin()))
  with check (id = (select auth.uid()) or (select public.eh_admin()));

create or replace function public.tg_perfis_protege_campos()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.eh_admin() or auth.uid() is null or current_setting('app.interno', true) = '1' then
    if new.cadastro_aprovado and not old.cadastro_aprovado then
      new.aprovado_em := now();
    end if;
    return new;
  end if;
  if new.tipo is distinct from old.tipo
     or new.cadastro_aprovado is distinct from old.cadastro_aprovado
     or new.aprovado_em is distinct from old.aprovado_em
     or new.codigo is distinct from old.codigo
     or new.cnpj is distinct from old.cnpj
     or new.carrinho_msg_60min_em is distinct from old.carrinho_msg_60min_em
     or new.carrinho_msg_1dia_em is distinct from old.carrinho_msg_1dia_em
     or new.ultimo_produto_carrinho is distinct from old.ultimo_produto_carrinho
     or new.bubble_id is distinct from old.bubble_id then
    raise exception 'Sem permissão para alterar estes campos' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger perfis_protege_campos before update on public.perfis
  for each row execute function public.tg_perfis_protege_campos();

create policy catalogos_ler on public.catalogos for select to authenticated
  using ((ativo and (select public.pode_comprar())) or (select public.eh_admin()));
create policy catalogos_admin on public.catalogos for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy categorias_ler on public.categorias for select to authenticated
  using ((ativo and (select public.pode_comprar())) or (select public.eh_admin()));
create policy categorias_admin on public.categorias for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy santos_ler on public.santos for select to authenticated
  using ((ativo and (select public.pode_comprar())) or (select public.eh_admin()));
create policy santos_admin on public.santos for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy produtos_ler on public.produtos for select to authenticated
  using ((ativo and (select public.pode_comprar())) or (select public.eh_admin()));
create policy produtos_admin on public.produtos for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy produto_santos_ler on public.produto_santos for select to authenticated
  using ((select public.pode_comprar()));
create policy produto_santos_admin on public.produto_santos for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy banners_ler on public.banners for select to authenticated
  using ((ativo and (select public.pode_comprar())) or (select public.eh_admin()));
create policy banners_admin on public.banners for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy cupons_admin on public.cupons for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy carrinho_proprio on public.carrinho_itens for all to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_admin()))
  with check (usuario_id = (select auth.uid()) and (select public.pode_comprar()));

create policy enderecos_proprio on public.enderecos for all to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_admin()))
  with check (usuario_id = (select auth.uid()) or (select public.eh_admin()));

create policy pedidos_ler on public.pedidos for select to authenticated
  using (cliente_id = (select auth.uid()) or (select public.eh_admin()));
create policy pedidos_admin_editar on public.pedidos for update to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy pedido_itens_ler on public.pedido_itens for select to authenticated
  using (exists (select 1 from public.pedidos p
                 where p.id = pedido_id and (p.cliente_id = (select auth.uid()) or (select public.eh_admin()))));

create policy notificacoes_ler on public.notificacoes for select to authenticated
  using (destinatario_id = (select auth.uid())
         or (destinatario_id is null and evento is null)
         or (select public.eh_admin()));
create policy notificacoes_admin on public.notificacoes for insert to authenticated
  with check ((select public.eh_admin()));
