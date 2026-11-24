-- Sistema do celular do cliente (ios | android). Marcado à mão no painel e, no
-- futuro, gravado pelo próprio app. Vale mais que o detectado pelas notificações.
alter table public.perfis add column if not exists sistema text check (sistema in ('ios', 'android'));
