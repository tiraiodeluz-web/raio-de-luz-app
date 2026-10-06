import { useMutation, useQuery } from '@tanstack/react-query';
import { Share } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

// O esquema do app (app.json "scheme": "raiodeluz") sozinho não funciona
// pra compartilhar: WhatsApp (e a maioria dos apps) só deixa clicável um
// link que comece com http(s) — um "raiodeluz://..." nunca fica azul lá.
// Por isso o link compartilhado é https, pra uma Edge Function
// (supabase/functions/abrir) que devolve uma página que redireciona na
// hora pro esquema do app. Expo Router resolve o "raiodeluz://<rota>"
// final direto pra rota de arquivo correspondente (ex.: /produto/<id>).
const BASE_ABRIR = 'https://zjkhlvomxhtafajbzbjb.supabase.co/functions/v1/abrir';

export function linkProduto(produtoId: string) {
  return `${BASE_ABRIR}/produto/${produtoId}`;
}

export function linkCarrinhoCompartilhado(id: string) {
  return `${BASE_ABRIR}/carrinho-compartilhado/${id}`;
}

export async function compartilharProduto(produtoId: string, nome: string) {
  await Share.share({
    message: `Olha esse produto: ${nome}\n${linkProduto(produtoId)}`,
  });
}

// Copia o carrinho atual pra um registro compartilhável (compartilhar_carrinho,
// ver migração carrinhos_compartilhados) e abre o menu de compartilhamento do
// aparelho já com o link pronto. Quem abrir o link (logado) vê a lista de
// itens e escolhe se quer adicionar tudo ao próprio carrinho.
export function useCompartilharCarrinho() {
  return useMutation({
    mutationFn: async (quantidadeItens: number) => {
      const { data: id, error } = await supabase.rpc('compartilhar_carrinho');
      if (error) throw error;
      await Share.share({
        message: `Separei ${quantidadeItens} produto(s) pra você — toque no link pra adicionar tudo direto no seu carrinho:\n${linkCarrinhoCompartilhado(id)}`,
      });
    },
  });
}

export type ItemCarrinhoCompartilhado = Database['public']['Functions']['carrinho_compartilhado_itens']['Returns'][number];

export function useCarrinhoCompartilhado(id: string | undefined) {
  return useQuery({
    queryKey: ['carrinho-compartilhado', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('carrinho_compartilhado_itens', { p_id: id as string });
      if (error) throw error;
      return data;
    },
  });
}

type ResultadoAdicionarCompartilhado = { adicionados: number; indisponiveis: number };

// Adiciona todos os itens de um carrinho compartilhado ao carrinho de quem
// abriu o link — mesma RPC usada no resto do app, chamada em sequência.
export function useAdicionarCarrinhoCompartilhado() {
  return useMutation({
    mutationFn: async (itens: ItemCarrinhoCompartilhado[]): Promise<ResultadoAdicionarCompartilhado> => {
      let adicionados = 0;
      for (const item of itens) {
        const { error } = await supabase.rpc('adicionar_ao_carrinho', {
          p_produto_id: item.produto_id,
          p_quantidade: item.quantidade,
          p_santo_id: item.santo_id ?? undefined,
        });
        if (!error) adicionados += 1;
      }
      return { adicionados, indisponiveis: itens.length - adicionados };
    },
  });
}
