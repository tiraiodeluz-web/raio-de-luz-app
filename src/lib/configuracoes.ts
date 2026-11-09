import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

// Valor mínimo (em R$, produtos) para enviar um pedido. Vem da tabela
// "configuracoes" (chave pedido_minimo) e é conferido também na criar_pedido.
// Se a consulta falhar, vale 500: o banco recusa pedido abaixo disso de qualquer jeito.
export const PEDIDO_MINIMO_PADRAO = 500;

export function usePedidoMinimo(): number {
  const { data } = useQuery({
    queryKey: ['configuracoes', 'pedido_minimo'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: linha, error } = await supabase.from('configuracoes').select('valor').eq('chave', 'pedido_minimo').maybeSingle();
      if (error) throw error;
      const n = Number(linha?.valor);
      return Number.isFinite(n) ? n : PEDIDO_MINIMO_PADRAO;
    },
  });
  return data ?? PEDIDO_MINIMO_PADRAO;
}
