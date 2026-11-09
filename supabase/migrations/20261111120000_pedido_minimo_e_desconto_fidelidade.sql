-- 1) Pedido mínimo (configuracoes.pedido_minimo = R$ 500, conferido na criar_pedido).
-- 2) Fidelidade em % (substitui os pontos de 20261110*): pedido pago +3, formulário +2,
--    feedback em vídeo aprovado +2; o saldo de pontos_movimentos.pontos é o % acumulado
--    (teto 7) aplicado e consumido no próximo pedido.
-- 3) Público das notificações (admin_contar_publico / admin_enviar_notificacao).
-- Aplicado no projeto em partes (config_pedido_minimo_e_desconto_ledger, desconto_triggers_pedido,
-- criar_pedido_minimo_desconto, notificacoes_publico). Resumo do que existe:

create table if not exists public.configuracoes (
  chave text primary key,
  valor text not null,
  atualizado_em timestamptz not null default now()
);
alter table public.configuracoes enable row level security;
create policy configuracoes_ler on public.configuracoes for select to anon, authenticated using (true);
create policy configuracoes_admin_insert on public.configuracoes for insert to authenticated with check ((select public.eh_admin()));
create policy configuracoes_admin_update on public.configuracoes for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
grant select on public.configuracoes to anon;
insert into public.configuracoes (chave, valor) values ('pedido_minimo', '500') on conflict do nothing;

-- Motivos novos do extrato: 'pedido' (+3), 'estorno_desconto', 'estorno_credito'.
alter table public.pontos_movimentos drop constraint if exists pontos_movimentos_motivo_check;
alter table public.pontos_movimentos add constraint pontos_movimentos_motivo_check
  check (motivo in ('pedido_2k', 'ia_pedido', 'formulario', 'feedback_texto', 'feedback_video', 'resgate', 'estorno', 'ajuste', 'pedido', 'estorno_desconto', 'estorno_credito'));
create unique index if not exists pontos_mov_pedido_unico on public.pontos_movimentos (usuario_id, motivo, referencia_id)
  where motivo in ('pedido', 'estorno_desconto', 'estorno_credito');

-- Funções (corpo completo aplicado no banco; ver histórico de migrações do Supabase):
--   privado.tg_pedido_pontos()            -> no-op (não pontua mais na criação)
--   privado.tg_pedido_pontos_status()     -> +3 ao sair de aguardando_pagamento; cancelar devolve o desconto usado e retira o +3
--   public.responder_formulario(jsonb)    -> +2
--   public.admin_avaliar_feedback(...)    -> vídeo aprovado +2 (texto não existe mais)
--   public.enviar_feedback(...)           -> só 'video'
--   public.criar_pedido(...)              -> recusa subtotal < pedido_minimo; aplica least(saldo,7)% sobre (subtotal - cupom) e registra 'resgate' no extrato
--   privado.publico_notificacao(jsonb)    -> ids dos clientes: todos | sem_uso | sem_compra | nunca_comprou | carrinho_abandonado | cliente | regiao | novos | com_desconto
--   public.admin_contar_publico(jsonb)    -> {total, amostra[]}
--   public.admin_enviar_notificacao(...)  -> 'todos' = 1 aviso geral; demais = 1 aviso por cliente
