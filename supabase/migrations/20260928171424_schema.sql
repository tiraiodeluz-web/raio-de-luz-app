create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.tipo_usuario as enum ('admin', 'cliente');
create type public.status_pedido as enum (
  'aguardando_pagamento','pago','em_separacao','em_producao','enviado','entregue','cancelado'
);

create or replace function public.tg_set_atualizado_em()
returns trigger language plpgsql set search_path = public as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

create table public.perfis (
  id                        uuid primary key references auth.users(id) on delete cascade,
  nome                      text not null default '',
  cnpj                      text unique,
  razao_social              text,
  telefone                  text,
  cep                       text,
  cidade                    text,
  uf                        text,
  codigo                    text,
  tipo                      public.tipo_usuario not null default 'cliente',
  foto_url                  text,
  cadastro_aprovado         boolean not null default false,
  aprovado_em               timestamptz,
  ultimo_acesso             timestamptz,
  ultimo_produto_carrinho   timestamptz,
  carrinho_msg_60min_em     timestamptz,
  carrinho_msg_1dia_em      timestamptz,
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz not null default now(),
  bubble_id                 text unique,
  constraint cnpj_formato check (cnpj is null or cnpj ~ '^[0-9]{14}$')
);
create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function public.tg_set_atualizado_em();
create index perfis_aprovacao_idx on public.perfis (cadastro_aprovado, tipo);

create table public.catalogos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  imagem_url    text,
  ordem         integer not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  bubble_id     text unique
);
create trigger catalogos_atualizado_em before update on public.catalogos
  for each row execute function public.tg_set_atualizado_em();

create table public.categorias (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  foto_url      text,
  ordem         integer not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  bubble_id     text unique
);
create trigger categorias_atualizado_em before update on public.categorias
  for each row execute function public.tg_set_atualizado_em();

create table public.santos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  codigo        text,
  foto_url      text,
  ordem         integer not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  bubble_id     text unique
);
create trigger santos_atualizado_em before update on public.santos
  for each row execute function public.tg_set_atualizado_em();

create table public.produtos (
  id                 uuid primary key default gen_random_uuid(),
  sku                text not null unique,
  nome               text not null,
  referencia         text,
  descricao          text,
  preco              numeric(12,2) not null check (preco >= 0),
  preco_promocional  numeric(12,2) check (preco_promocional is null or preco_promocional >= 0),
  preco_efetivo      numeric(12,2) generated always as (
                       case when coalesce(preco_promocional, 0) > 0 then preco_promocional else preco end
                     ) stored,
  embalagem          integer not null default 1 check (embalagem >= 1),
  estoque            integer,
  ativo              boolean not null default true,
  destaque           boolean not null default false,
  vendas             integer not null default 0,
  personalizavel     boolean not null default false,
  imagem_principal   text,
  imagens            text[] not null default '{}',
  catalogo_id        uuid references public.catalogos(id) on delete set null,
  categoria_id       uuid references public.categorias(id) on delete set null,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  bubble_id          text unique,
  busca              text generated always as (
                       lower(coalesce(nome,'') || ' ' || coalesce(sku,'') || ' ' || coalesce(referencia,''))
                     ) stored
);
create trigger produtos_atualizado_em before update on public.produtos
  for each row execute function public.tg_set_atualizado_em();
create index produtos_catalogo_idx  on public.produtos (catalogo_id) where ativo;
create index produtos_categoria_idx on public.produtos (categoria_id) where ativo;
create index produtos_destaque_idx  on public.produtos (destaque) where ativo;
create index produtos_vendas_idx    on public.produtos (vendas desc) where ativo;
create index produtos_busca_trgm    on public.produtos using gin (busca extensions.gin_trgm_ops);

create table public.produto_santos (
  produto_id uuid not null references public.produtos(id) on delete cascade,
  santo_id   uuid not null references public.santos(id) on delete cascade,
  foto_url   text,
  primary key (produto_id, santo_id)
);
create index produto_santos_santo_idx on public.produto_santos (santo_id);

create table public.cupons (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null,
  valor         numeric(12,2) not null check (valor > 0),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  bubble_id     text unique
);
create unique index cupons_codigo_idx on public.cupons (upper(codigo));

create table public.carrinho_itens (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references public.perfis(id) on delete cascade,
  produto_id    uuid not null references public.produtos(id) on delete cascade,
  santo_id      uuid references public.santos(id) on delete set null,
  quantidade    integer not null check (quantidade > 0),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index carrinho_itens_unico
  on public.carrinho_itens (usuario_id, produto_id, coalesce(santo_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index carrinho_itens_produto_idx on public.carrinho_itens (produto_id);
create index carrinho_itens_santo_idx on public.carrinho_itens (santo_id);
create trigger carrinho_itens_atualizado_em before update on public.carrinho_itens
  for each row execute function public.tg_set_atualizado_em();

create table public.enderecos (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references public.perfis(id) on delete cascade,
  cep           text not null,
  rua           text not null,
  numero        text not null,
  complemento   text,
  bairro        text not null,
  cidade        text not null,
  estado        text not null,
  principal     boolean not null default false,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index enderecos_usuario_idx on public.enderecos (usuario_id);
create unique index enderecos_um_principal on public.enderecos (usuario_id) where principal;
create trigger enderecos_atualizado_em before update on public.enderecos
  for each row execute function public.tg_set_atualizado_em();

create table public.pedidos (
  id               uuid primary key default gen_random_uuid(),
  numero           bigint generated always as identity (start with 1) unique,
  cliente_id       uuid references public.perfis(id) on delete set null,
  status           public.status_pedido not null default 'aguardando_pagamento',
  subtotal         numeric(12,2) not null default 0,
  desconto         numeric(12,2) not null default 0,
  total            numeric(12,2) not null default 0,
  cupom_codigo     text,
  observacoes      text,
  codigo_rastreio  text,
  endereco_entrega jsonb,
  cliente_snapshot jsonb,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  status_alterado_em timestamptz not null default now()
);
create index pedidos_cliente_idx on public.pedidos (cliente_id, criado_em desc);
create index pedidos_status_idx  on public.pedidos (status, criado_em desc);
create trigger pedidos_atualizado_em before update on public.pedidos
  for each row execute function public.tg_set_atualizado_em();

create table public.pedido_itens (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid not null references public.pedidos(id) on delete cascade,
  produto_id     uuid references public.produtos(id) on delete set null,
  santo_id       uuid references public.santos(id) on delete set null,
  sku            text not null,
  produto_nome   text not null,
  santo_nome     text,
  imagem_url     text,
  quantidade     integer not null check (quantidade > 0),
  preco_unitario numeric(12,2) not null,
  subtotal       numeric(12,2) not null
);
create index pedido_itens_pedido_idx on public.pedido_itens (pedido_id);
create index pedido_itens_produto_idx on public.pedido_itens (produto_id);
create index pedido_itens_santo_idx on public.pedido_itens (santo_id);

create table public.banners (
  id            uuid primary key default gen_random_uuid(),
  titulo        text,
  conteudo      text,
  autor         text,
  foto_url      text not null,
  ordem         integer not null default 0,
  ativo         boolean not null default true,
  data_envio    timestamptz,
  criado_em     timestamptz not null default now(),
  bubble_id     text unique
);

create table public.notificacoes (
  id                  uuid primary key default gen_random_uuid(),
  titulo              text not null,
  corpo               text not null,
  legenda             text,
  imagem_url          text,
  rota_destino        text,
  catalogo_destino_id uuid references public.catalogos(id) on delete set null,
  destinatario_id     uuid references public.perfis(id) on delete cascade,
  evento              text,
  criado_por          uuid references public.perfis(id) on delete set null,
  criado_em           timestamptz not null default now()
);
create index notificacoes_dest_idx on public.notificacoes (destinatario_id, criado_em desc);
create index notificacoes_catalogo_idx on public.notificacoes (catalogo_destino_id);
create index notificacoes_criado_por_idx on public.notificacoes (criado_por);
