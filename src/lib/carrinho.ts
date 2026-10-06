import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/auth-context';
import { adicionarItemOffline, type ProdutoSnapshotOffline } from '@/lib/carrinho-offline';
import { precoExibido } from '@/lib/formatacao';
import { supabase } from '@/lib/supabase';

type AdicionarAoCarrinhoParams = {
  produtoId: string;
  quantidade?: number;
  santoId?: string | null;
  santoNome?: string | null;
  fotoUrl?: string | null;
  // Texto digitado pelo cliente quando o santo escolhido é "Personalizado"
  // (codigo 15) — a função do banco exige isso pra esse santo e recusa sem.
  personalizacao?: string | null;
  // Dados do produto já em mãos na tela (detalhe ou compra rápida) — usados
  // só se precisar guardar o item offline, pra mostrar no carrinho sem
  // precisar de rede.
  produtoSnapshot?: ProdutoSnapshotOffline;
};

export type ResultadoAdicionarAoCarrinho = { offline: boolean };

// Erro de rede de verdade (sem servidor pra responder) é diferente de erro
// de negócio (ex.: quantidade inválida) — só o primeiro deve cair pro
// carrinho offline; o segundo precisa aparecer pro cliente. supabase-js
// não lança excessão nesses casos, só devolve `error` sem "code" (erro de
// negócio vindo do Postgres sempre tem um code, ex. P0001/22003).
function pareceErroDeRede(erro: unknown): boolean {
  if (erro instanceof TypeError) return true;
  // O erro do supabase-js (rede ou de negócio) é um objeto simples
  // ({message, code, ...}), não uma instância de Error — por isso lemos
  // "message" direto em vez de confiar em erro.message/String(erro).
  const comoObjeto = erro as { message?: unknown; code?: unknown } | null;
  if (comoObjeto?.code) return false;
  const mensagem = typeof comoObjeto?.message === 'string' ? comoObjeto.message : String(erro);
  return /network|fetch|timeout|internet|conex/i.test(mensagem);
}

// Chama a função do banco (adicionar_ao_carrinho): ela valida quantidade
// múltipla da embalagem, se o produto aceita santo e soma quantidade quando
// o item (produto + santo) já está no carrinho — regra 7. Sem internet, cai
// pro carrinho offline (lib/carrinho-offline.ts) e sincroniza depois.
export function useAdicionarAoCarrinho() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      produtoId,
      quantidade,
      santoId,
      santoNome,
      fotoUrl,
      personalizacao,
      produtoSnapshot,
    }: AdicionarAoCarrinhoParams): Promise<ResultadoAdicionarAoCarrinho> => {
      const salvarOffline = () =>
        adicionarItemOffline(queryClient, {
          produtoId,
          quantidade: quantidade ?? produtoSnapshot?.embalagem ?? 1,
          santoId: santoId ?? null,
          santoNome: santoNome ?? null,
          fotoUrl: fotoUrl ?? produtoSnapshot?.imagem_principal ?? null,
          personalizacao: personalizacao ?? null,
          produto: produtoSnapshot ?? {
            nome: 'Produto',
            sku: '',
            preco: 0,
            preco_promocional: null,
            imagem_principal: null,
            embalagem: 1,
          },
        });

      const estadoRede = await NetInfo.fetch();
      const online = estadoRede.isConnected !== false && estadoRede.isInternetReachable !== false;

      if (!online) {
        await salvarOffline();
        return { offline: true };
      }

      // O sensor de rede pode dizer "online" e a conexão falhar mesmo assim
      // (sinal instável, DNS bloqueado etc.) — sem este fallback, isso
      // travava a adição sem avisar nada pro cliente.
      try {
        // p_personalizacao sempre vai no payload (mesmo null): o banco tem
        // duas versões da função (antes e depois da personalização) e só
        // informar esse parâmetro garante que o Postgres resolva pra versão
        // nova sem ambiguidade entre as duas assinaturas.
        const { error } = await supabase.rpc('adicionar_ao_carrinho', {
          p_produto_id: produtoId,
          p_quantidade: quantidade,
          p_santo_id: santoId ?? undefined,
          p_personalizacao: personalizacao ?? null,
        });
        if (error) throw error;
        return { offline: false };
      } catch (erro) {
        if (!pareceErroDeRede(erro)) throw erro;
        await salvarOffline();
        return { offline: true };
      }
    },
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: ['carrinho'] });
      if (resultado.offline) queryClient.invalidateQueries({ queryKey: ['carrinho-offline'] });
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
  // Foto do santo escolhido (produto_santos.foto_url), quando existir —
  // sem isso, o carrinho mostrava a mesma foto principal pra todo santo.
  fotoUrl: string | null;
  personalizacao: string | null;
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
          `id, quantidade, produto_id, santo_id, personalizacao,
           produtos ( id, nome, sku, preco, preco_promocional, imagem_principal, embalagem, ativo ),
           santos ( id, nome )`,
        )
        .order('criado_em', { ascending: true });
      if (error) throw error;

      const linhas = (data ?? []).filter((linha) => linha.produtos !== null);

      const produtoIds = [...new Set(linhas.filter((l) => l.santo_id).map((l) => l.produto_id))];
      const fotosPorSanto = new Map<string, string>();
      if (produtoIds.length > 0) {
        const { data: variantes, error: erroVariantes } = await supabase
          .from('produto_santos')
          .select('produto_id, santo_id, foto_url')
          .in('produto_id', produtoIds)
          .not('foto_url', 'is', null);
        if (erroVariantes) throw erroVariantes;
        for (const v of variantes ?? []) {
          if (v.foto_url) fotosPorSanto.set(`${v.produto_id}|${v.santo_id}`, v.foto_url);
        }
      }

      return linhas.map((linha) => {
        const produto = linha.produtos as ItemCarrinho['produto'];
        const santo = linha.santos as ItemCarrinho['santo'];
        const fotoUrl = (santo && fotosPorSanto.get(`${linha.produto_id}|${santo.id}`)) || produto.imagem_principal;
        return { id: linha.id, quantidade: linha.quantidade, produto, santo, fotoUrl, personalizacao: linha.personalizacao };
      });
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
