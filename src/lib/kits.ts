import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { precoExibido } from '@/lib/formatacao';
import { supabase } from '@/lib/supabase';

export type ItemKit = {
  id: string;
  quantidade: number;
  ordem: number;
  produto: {
    id: string;
    nome: string;
    sku: string;
    preco: number;
    preco_promocional: number | null;
    imagem_principal: string | null;
    embalagem: number;
    ativo: boolean;
    personalizavel: boolean;
  };
  santo: { id: string; nome: string } | null;
};

export type Kit = {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  ativo: boolean;
  itens: ItemKit[];
};

const SELECT_KIT = `id, nome, descricao, imagem_url, ativo, criado_em,
  kit_itens ( id, quantidade, ordem,
    produtos ( id, nome, sku, preco, preco_promocional, imagem_principal, embalagem, ativo, personalizavel ),
    santos ( id, nome ) )`;

type LinhaKit = {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  ativo: boolean;
  kit_itens: { id: string; quantidade: number; ordem: number; produtos: ItemKit['produto'] | null; santos: ItemKit['santo'] }[];
};

function paraKit(linha: LinhaKit): Kit {
  const itens = linha.kit_itens
    .filter((i) => i.produtos !== null)
    .map((i) => ({ id: i.id, quantidade: i.quantidade, ordem: i.ordem, produto: i.produtos as ItemKit['produto'], santo: i.santos }))
    .sort((a, b) => a.ordem - b.ordem);
  return { id: linha.id, nome: linha.nome, descricao: linha.descricao, imagem_url: linha.imagem_url, ativo: linha.ativo, itens };
}

// Só itens de produtos ativos contam — produto desativado depois do kit
// montado não entra no carrinho (adicionar_kit_ao_carrinho pula ele).
export function precoUnitarioItem(item: ItemKit): number {
  return precoExibido(item.produto.preco, item.produto.preco_promocional);
}

export function totalDoKit(itens: ItemKit[]): number {
  return itens.filter((i) => i.produto.ativo).reduce((soma, i) => soma + precoUnitarioItem(i) * i.quantidade, 0);
}

export function textoConteudoKit(itens: { quantidade: number; nome: string; santoNome: string | null }[]): string {
  const linhas = itens.map((i) => `${i.quantidade} ${i.nome}${i.santoNome ? ` (${i.santoNome})` : ''}`);
  return ['Esse kit contém:', ...linhas].join('\n');
}

export function useKits() {
  return useQuery({
    queryKey: ['kits', 'vitrine'],
    queryFn: async () => {
      // Admin também enxerga kit inativo pela RLS — o filtro garante que a
      // vitrine mostre só o que o cliente vê.
      const { data, error } = await supabase.from('kits').select(SELECT_KIT).eq('ativo', true).order('criado_em', { ascending: false });
      if (error) throw error;
      return (data as unknown as LinhaKit[]).map(paraKit);
    },
  });
}

export function useKitsAdmin() {
  return useQuery({
    queryKey: ['kits', 'admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('kits').select(SELECT_KIT).order('criado_em', { ascending: false });
      if (error) throw error;
      return (data as unknown as LinhaKit[]).map(paraKit);
    },
  });
}

export function useKit(id: string | undefined) {
  return useQuery({
    queryKey: ['kits', 'detalhe', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('kits').select(SELECT_KIT).eq('id', id as string).maybeSingle();
      if (error) throw error;
      return data ? paraKit(data as unknown as LinhaKit) : null;
    },
  });
}

export function useAdicionarKitAoCarrinho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (kitId: string) => {
      const { data, error } = await supabase.rpc('adicionar_kit_ao_carrinho', { p_kit_id: kitId });
      if (error) throw error;
      const resultado = data?.[0];
      return { adicionados: resultado?.itens_adicionados ?? 0, indisponiveis: resultado?.itens_indisponiveis ?? 0 };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['carrinho'] }),
  });
}

export type ItemKitFormulario = { produtoId: string; santoId: string | null; quantidade: number };

export type SalvarKitParams = {
  id: string | null;
  nome: string;
  descricao: string;
  imagemUrl: string | null;
  ativo: boolean;
  itens: ItemKitFormulario[];
};

export function useSalvarKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (kit: SalvarKitParams) => {
      const { data, error } = await supabase.rpc('admin_salvar_kit', {
        p_id: kit.id,
        p_nome: kit.nome,
        p_descricao: kit.descricao,
        p_imagem_url: kit.imagemUrl,
        p_ativo: kit.ativo,
        p_itens: kit.itens.map((i) => ({ produto_id: i.produtoId, santo_id: i.santoId, quantidade: i.quantidade })),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kits'] }),
  });
}

export function useExcluirKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kits'] }),
  });
}
