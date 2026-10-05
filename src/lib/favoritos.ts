import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { ProdutoResumo } from '@/lib/produtos';

// Lista de ids favoritados do usuário logado — usada pra saber se o coração
// de um card deve aparecer preenchido, sem precisar de uma query por produto.
export function useFavoritosIds() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['favoritos', 'ids', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase.from('favoritos').select('produto_id');
      if (error) throw error;
      return new Set((data ?? []).map((f) => f.produto_id));
    },
  });
}

export function useAlternarFavorito() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ produtoId, favoritado }: { produtoId: string; favoritado: boolean }) => {
      if (!session) throw new Error('Faça login para favoritar.');
      if (favoritado) {
        const { error } = await supabase.from('favoritos').delete().eq('produto_id', produtoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('favoritos').insert({ usuario_id: session.user.id, produto_id: produtoId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favoritos'] });
    },
  });
}

// Vitrine completa dos favoritos (tela "Meus favoritos").
export function useProdutosFavoritos() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['favoritos', 'produtos', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favoritos')
        .select('produtos(id,sku,nome,preco,preco_promocional,preco_efetivo,imagem_principal,embalagem)')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .map((linha) => linha.produtos)
        .filter((produto): produto is ProdutoResumo => produto !== null);
    },
  });
}
