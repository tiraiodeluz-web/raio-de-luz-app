-- A tela de admin "Clientes" busca e mostra o código do cliente, mas nada
-- preenchia perfis.codigo — ficava sempre null. Gera um código sequencial
-- (C0001, C0002...) automaticamente no cadastro, como já existe para o
-- número do pedido.

create sequence public.perfis_codigo_seq;

create or replace function public.tg_perfis_gerar_codigo()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.codigo is null then
    new.codigo := 'C' || lpad(nextval('public.perfis_codigo_seq')::text, 4, '0');
  end if;
  return new;
end $$;

create trigger perfis_gerar_codigo before insert on public.perfis
  for each row execute function public.tg_perfis_gerar_codigo();

create index if not exists perfis_codigo_idx on public.perfis (codigo);
