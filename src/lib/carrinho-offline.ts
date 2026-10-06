import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

const CHAVE_STORAGE = '@raiodeluz/carrinho_offline';
const TENTATIVAS_MAXIMAS = 5;

export type ProdutoSnapshotOffline = {
  nome: string;
  sku: string;
  preco: number;
  preco_promocional: number | null;
  imagem_principal: string | null;
  embalagem: number;
};

export type ItemCarrinhoOffline = {
  id: string;
  produtoId: string;
  quantidade: number;
  santoId: string | null;
  santoNome: string | null;
  fotoUrl: string | null;
  personalizacao: string | null;
  produto: ProdutoSnapshotOffline;
  criadoEm: string;
  tentativas: number;
};

async function lerFilaOffline(): Promise<ItemCarrinhoOffline[]> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_STORAGE);
    return bruto ? (JSON.parse(bruto) as ItemCarrinhoOffline[]) : [];
  } catch {
    return [];
  }
}

async function salvarFilaOffline(fila: ItemCarrinhoOffline[], queryClient: QueryClient) {
  await AsyncStorage.setItem(CHAVE_STORAGE, JSON.stringify(fila));
  queryClient.setQueryData(['carrinho-offline'], fila);
}

export function useFilaCarrinhoOffline() {
  return useQuery({
    queryKey: ['carrinho-offline'],
    queryFn: lerFilaOffline,
    initialData: [] as ItemCarrinhoOffline[],
  });
}

type NovoItemOffline = Omit<ItemCarrinhoOffline, 'id' | 'criadoEm' | 'tentativas'>;

// Produto adicionado ao carrinho sem internet: fica guardado no aparelho
// (AsyncStorage) com os dados já prontos pra exibir (nome, preço, foto —
// ver ProdutoSnapshotOffline), já que sem rede não dá pra buscar isso no
// Supabase. useSincronizarCarrinhoOffline() manda pro banco de verdade
// (via a mesma RPC adicionar_ao_carrinho) assim que a conexão voltar.
export async function adicionarItemOffline(queryClient: QueryClient, item: NovoItemOffline) {
  const fila = await lerFilaOffline();
  const novo: ItemCarrinhoOffline = {
    ...item,
    id: `offline-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    criadoEm: new Date().toISOString(),
    tentativas: 0,
  };
  await salvarFilaOffline([...fila, novo], queryClient);
}

export async function removerItemOffline(queryClient: QueryClient, id: string) {
  const fila = await lerFilaOffline();
  await salvarFilaOffline(fila.filter((item) => item.id !== id), queryClient);
}

export async function alterarQuantidadeOffline(queryClient: QueryClient, id: string, quantidade: number) {
  const fila = await lerFilaOffline();
  await salvarFilaOffline(
    fila.map((item) => (item.id === id ? { ...item, quantidade } : item)),
    queryClient,
  );
}

let sincronizando = false;

// Processa a fila local chamando a mesma RPC usada no fluxo normal — ela já
// sabe somar quantidade quando o item (produto + santo) repete, então não
// precisamos mesclar nada aqui. Item que falhar continua na fila pra
// tentar de novo depois; depois de algumas tentativas sem sucesso, é
// descartado (produto removido/inativo, por exemplo), sem travar os outros.
export async function sincronizarCarrinhoOffline(queryClient: QueryClient) {
  if (sincronizando) return;
  sincronizando = true;
  try {
    let fila = await lerFilaOffline();
    if (fila.length === 0) return;

    const restantes: ItemCarrinhoOffline[] = [];
    let algumSincronizado = false;

    for (const item of fila) {
      const { error } = await supabase.rpc('adicionar_ao_carrinho', {
        p_produto_id: item.produtoId,
        p_quantidade: item.quantidade,
        p_santo_id: item.santoId ?? undefined,
        p_personalizacao: item.personalizacao ?? null,
      });
      if (!error) {
        algumSincronizado = true;
        continue;
      }
      const tentativas = item.tentativas + 1;
      if (tentativas < TENTATIVAS_MAXIMAS) {
        restantes.push({ ...item, tentativas });
      }
      // depois de TENTATIVAS_MAXIMAS falhas seguidas (ex.: produto removido
      // do catálogo), descarta o item em vez de travar a fila pra sempre.
    }

    fila = restantes;
    await salvarFilaOffline(fila, queryClient);
    if (algumSincronizado) queryClient.invalidateQueries({ queryKey: ['carrinho'] });
  } finally {
    sincronizando = false;
  }
}

// Monta a lista de itens pendentes (ainda não sincronizados) prontos pra
// aparecer no carrinho, já mesclando quantidade de duplicados (mesmo
// produto + mesmo santo adicionados mais de uma vez offline).
export function itensOfflineParaExibicao(fila: ItemCarrinhoOffline[]) {
  const porChave = new Map<string, ItemCarrinhoOffline>();
  for (const item of fila) {
    // Personalização entra na chave: cada texto é único, nunca deve somar
    // quantidade com outro item igual mas com personalização diferente.
    const chave = `${item.produtoId}|${item.santoId ?? ''}|${item.personalizacao ?? ''}`;
    const existente = porChave.get(chave);
    if (existente) {
      porChave.set(chave, { ...existente, quantidade: existente.quantidade + item.quantidade });
    } else {
      porChave.set(chave, item);
    }
  }
  return [...porChave.values()];
}

// Monta a ponte com a conexão: sincroniza ao logar/abrir o app e de novo
// toda vez que o aparelho volta a ficar online.
export function useSincronizarCarrinhoOffline(ativo: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ativo) return;
    sincronizarCarrinhoOffline(queryClient);

    const cancelar = NetInfo.addEventListener((estado) => {
      if (estado.isConnected && estado.isInternetReachable !== false) {
        sincronizarCarrinhoOffline(queryClient);
      }
    });

    return cancelar;
  }, [ativo, queryClient]);
}
