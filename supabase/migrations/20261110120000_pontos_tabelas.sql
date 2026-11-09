-- Programa de pontos (tela "Meus pontos" no app).
-- Ganha pontos: pedido com subtotal >= R$ 2.000 (25), pedido feito com ajuda
-- da RDL AI (25), responder o formulário (20, uma vez), feedback em texto
-- (10, uma vez) e em vídeo (30, uma vez) — os feedbacks só pontuam depois de
-- aprovados pelo admin no painel. Troca: 60 pts = 3%, 80 = 5%, 100 = 7% de
-- desconto, aplicado no próximo pedido (criar_pedido).
-- O saldo é a soma de pontos_movimentos (extrato), nunca um número solto.

create table public.pontos_movimentos (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references public.perfis(id) on delete cascade,
  pontos        integer not null check (pontos <> 0),
  motivo        text not null check (motivo in ('pedido_2k', 'ia_pedido', 'formulario', 'feedback_texto',
                                                'feedback_video', 'resgate', 'estorno', 'ajuste')),
  referencia_id uuid,
  descricao     text not null,
  criado_em     timestamptz not null default now()
);
create index pontos_movimentos_usuario_idx on public.pontos_movimentos (usuario_id, criado_em desc);
-- Cada pedido pontua uma vez por regra (e tem no máximo um estorno).
create unique index pontos_mov_por_referencia on public.pontos_movimentos (usuario_id, motivo, referencia_id)
  where motivo in ('pedido_2k', 'ia_pedido', 'estorno', 'resgate');
-- Tarefas que só valem uma vez por cliente.
create unique index pontos_mov_tarefa_unica on public.pontos_movimentos (usuario_id, motivo)
  where motivo in ('formulario', 'feedback_texto', 'feedback_video');

create table public.pontos_resgates (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfis(id) on delete cascade,
  pontos      integer not null check (pontos > 0),
  percentual  numeric(5,2) not null check (percentual > 0 and percentual < 100),
  status      text not null default 'disponivel' check (status in ('disponivel', 'usado', 'cancelado')),
  pedido_id   uuid references public.pedidos(id) on delete set null,
  criado_em   timestamptz not null default now(),
  usado_em    timestamptz
);
-- Um desconto por vez esperando o próximo pedido.
create unique index pontos_resgate_um_disponivel on public.pontos_resgates (usuario_id) where status = 'disponivel';
create index pontos_resgates_pedido_idx on public.pontos_resgates (pedido_id);

create table public.feedbacks (
  id                      uuid primary key default gen_random_uuid(),
  usuario_id              uuid not null references public.perfis(id) on delete cascade,
  tipo                    text not null check (tipo in ('texto', 'video')),
  texto                   text,
  video_path              text,
  consentimento_marketing boolean not null check (consentimento_marketing),
  status                  text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  motivo_recusa           text,
  analisado_em            timestamptz,
  criado_em               timestamptz not null default now(),
  check ((tipo = 'texto' and texto is not null) or (tipo = 'video' and video_path is not null))
);
create index feedbacks_usuario_idx on public.feedbacks (usuario_id, criado_em desc);
create index feedbacks_status_idx on public.feedbacks (status, criado_em desc);

create table public.formulario_respostas (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null unique references public.perfis(id) on delete cascade,
  respostas   jsonb not null,
  criado_em   timestamptz not null default now()
);

alter table public.pedidos
  add column desconto_pontos numeric(12,2) not null default 0,
  add column pontos_resgate_id uuid references public.pontos_resgates(id) on delete set null;

alter table public.pontos_movimentos enable row level security;
alter table public.pontos_resgates enable row level security;
alter table public.feedbacks enable row level security;
alter table public.formulario_respostas enable row level security;

-- Leitura: o próprio cliente ou admin. Escrita só pelas funções abaixo.
create policy pontos_movimentos_ler on public.pontos_movimentos for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_admin()));
create policy pontos_resgates_ler on public.pontos_resgates for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_admin()));
create policy feedbacks_ler on public.feedbacks for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_admin()));
create policy formulario_respostas_ler on public.formulario_respostas for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_admin()));

revoke all on public.pontos_movimentos, public.pontos_resgates, public.feedbacks, public.formulario_respostas from anon;

-- Vídeos de depoimento: bucket privado, cada cliente grava só na própria
-- pasta (<id do usuário>/...), admin lê tudo. 50 MB é o limite do plano grátis.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedbacks', 'feedbacks', false, 52428800, array['video/*'])
on conflict (id) do nothing;

create policy feedbacks_video_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'feedbacks' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy feedbacks_video_ler on storage.objects for select to authenticated
  using (bucket_id = 'feedbacks' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.eh_admin())));
