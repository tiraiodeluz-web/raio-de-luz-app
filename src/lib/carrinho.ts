import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { precoExibido } from '@/lib/formatacao';
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

export type ItemCarrinho = {
  id: string;
  quantidade: number;
  produto: {
    id: string;
    nome: string;
    sku: string;
    preco: number;
    preco_promocional: number | null;
    imagem_principal: string | null;
    embalagem: number;
    ativo: boolean;
  };
  santo: { id: string; nome: string } | null;
};

// Itens do carrinho do usuário logado, com o produto e o santo escolhido.
export function useItensCarrinho() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['carrinho', 'itens', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carrinho_itens')
        .select(
          `id, quantidade,
           produtos ( id, nome, sku, preco, preco_promocional, imagem_principal, embalagem, ativo ),
           santos ( id, nome )`,
        )
        .order('criado_em', { ascending: true });
      if (error) throw error;

      return (data ?? [])
        .map((linha) => {
          const produto = linha.produtos as ItemCarrinho['produto'] | null;
          if (!produto) return null;
          const santo = linha.santos as ItemCarrinho['santo'];
          return { id: linha.id, quantidade: linha.quantidade, produto, santo };
        })
        .filter((item): item is ItemCarrinho => item !== null);
    },
  });
}

export function calcularSubtotalCarrinho(itens: ItemCarrinho[]): number {
  return itens.reduce((soma, item) => soma + precoExibido(item.produto.preco, item.produto.preco_promocional) * item.quantidade, 0);
}

export function useAlterarQuantidadeCarrinho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantidade }: { id: string; quantidade: number }) => {
      const { error } = await supabase.from('carrinho_itens').update({ quantidade }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['carrinho'] }),
  });
}

export function useRemoverDoCarrinho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('carrinho_itens').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['carrinho'] }),
  });
}

export type CupomValidado = { codigo: string; valor: number };

// Regra 8: um cupom por carrinho, valor fixo em reais.
export async function validarCupom(codigo: string): Promise<CupomValidado | null> {
  const { data, error } = await supabase.rpc('validar_cupom', { p_codigo: codigo });
  if (error) throw error;
  const linha = data?.[0];
  return linha ? { codigo: linha.codigo, valor: linha.valor } : null;
}

type CriarPedidoParams = {
  enderecoId: string;
  observacoes?: string;
  cupom?: string;
};

export function useCriarPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ enderecoId, observacoes, cupom }: CriarPedidoParams) => {
      const { data, error } = await supabase.rpc('criar_pedido', {
        p_endereco_id: enderecoId,
        p_observacoes: observacoes,
        p_cupom: cupom,
      });
      if (error) throw error;
      return data?.[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carrinho'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}
