import type { Enums } from '@/types/database';

export type StatusPedido = Enums<'status_pedido'>;

// Mesmos textos e cores do app (src/lib/pedidos.ts).
export const ROTULO_STATUS: Record<StatusPedido, string> = {
  aguardando_pagamento: 'Aguardando Pagamento',
  pago: 'Pago',
  em_separacao: 'Em Separação',
  em_producao: 'Em Produção',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const COR_STATUS: Record<StatusPedido, string> = {
  aguardando_pagamento: '#B8860B',
  pago: '#2563EB',
  em_separacao: '#7C3AED',
  em_producao: '#0891B2',
  enviado: '#0D9488',
  entregue: '#1E8E3E',
  cancelado: '#D64545',
};

export const ORDEM_STATUS: StatusPedido[] = ['aguardando_pagamento', 'pago', 'em_separacao', 'em_producao', 'enviado', 'entregue', 'cancelado'];
