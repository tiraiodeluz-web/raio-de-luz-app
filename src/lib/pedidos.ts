import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';

export type StatusPedido = Enums<'status_pedido'>;

// Rótulo e cor de cada status (mesmo texto de public.status_pedido_rotulo no banco).
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

// Regra 10 / decisão tomada #6: só o admin cancela — a lixeira sai de Meus pedidos.
export function usePedidos() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['pedidos', 'meus', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id,numero,status,total,criado_em')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePedidoDetalhe(id: string | undefined) {
  return useQuery({
    queryKey: ['pedidos', 'detalhe', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: pedido, error } = await supabase.from('pedidos').select('*').eq('id', id as string).single();
      if (error) throw error;

      const { data: itens, error: erroItens } = await supabase
        .from('pedido_itens')
        .select('*')
        .eq('pedido_id', pedido.id)
        .order('id', { ascending: true });
      if (erroItens) throw erroItens;

      return { pedido, itens: itens ?? [] };
    },
  });
}
