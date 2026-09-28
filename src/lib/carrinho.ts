import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

type AdicionarAoCarrinhoParams = {
  produtoId: string;
  quantidade?: number;
  santoId?: string | null;
};

// Chama a função do banco (adicionar_ao_carrinho): ela valida quantidade
// múltipla da embalagem, se o produto aceita santo e soma quantidade quando
// o item (produto + santo) já está no carrinho — regra 7.
export function useAdicionarAoCarrinho() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ produtoId, quantidade, santoId }: AdicionarAoCarrinhoParams) => {
      const { data, error } = await supabase.rpc('adicionar_ao_carrinho', {
        p_produto_id: produtoId,
        p_quantidade: quantidade,
        p_santo_id: santoId ?? undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrinho'] });
    },
  });
}
