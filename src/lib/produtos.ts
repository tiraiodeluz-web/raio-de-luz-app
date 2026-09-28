import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

// Regra 3: cada linha de `produtos` já é uma vitrine por SKU (a coluna sku é
// única no schema) — diferente do Bubble antigo, não precisamos agrupar por
// SKU no app. Regra 3 também exige imagem_principal preenchida.
export type ProdutoResumo = Pick<
  Tables<'produtos'>,
  'id' | 'sku' | 'nome' | 'preco' | 'preco_promocional' | 'preco_efetivo' | 'imagem_principal' | 'embalagem'
>;

const COLUNAS_RESUMO = 'id,sku,nome,preco,preco_promocional,preco_efetivo,imagem_principal,embalagem';

export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('id,titulo,foto_url,ordem')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCategorias(limite?: number) {
  return useQuery({
    queryKey: ['categorias', limite ?? 'todas'],
    queryFn: async () => {
      let query = supabase
        .from('categorias')
        .select('id,nome,foto_url,ordem')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (limite) query = query.limit(limite);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCatalogos() {
  return useQuery({
    queryKey: ['catalogos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogos')
        .select('id,nome,imagem_url,ordem')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

// Seções da Home (limite curto, sem paginação — "Ver mais" leva pra tela cheia).
export function useProdutosDestaque(limite: number) {
  return useQuery({
    queryKey: ['produtos', 'destaque', limite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select(COLUNAS_RESUMO)
        .eq('ativo', true)
        .eq('destaque', true)
        .not('imagem_principal', 'is', null)
        .order('preco_efetivo', { ascending: true })
        .limit(limite);
      if (error) throw error;
      return data as ProdutoResumo[];
    },
  });
}

export function useProdutosMaisVendidosResumo(limite: number) {
  return useQuery({
    queryKey: ['produtos', 'mais-vendidos-resumo', limite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select(COLUNAS_RESUMO)
        .eq('ativo', true)
        .not('imagem_principal', 'is', null)
        .order('vendas', { ascending: false })
        .limit(limite);
      if (error) throw error;
      return data as ProdutoResumo[];
    },
  });
}

export type FiltroProdutos =
  | { tipo: 'catalogo'; id: string }
  | { tipo: 'categoria'; id: string }
  | { tipo: 'destaque' }
  | { tipo: 'mais-vendidos' }
  | { tipo: 'busca'; termo: string };

const TAMANHO_PAGINA: Record<FiltroProdutos['tipo'], number> = {
  catalogo: 30,
  categoria: 30,
  destaque: 30,
  'mais-vendidos': 30,
  busca: 20,
};

// Listagens completas ("Ver mais"/"Ver todas"), paginadas.
export function useProdutos(filtro: FiltroProdutos) {
  const tamanho = TAMANHO_PAGINA[filtro.tipo];

  return useInfiniteQuery({
    queryKey: ['produtos', 'lista', filtro],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from('produtos')
        .select(COLUNAS_RESUMO, { count: 'exact' })
        .eq('ativo', true)
        .not('imagem_principal', 'is', null)
        .range(pageParam, pageParam + tamanho - 1);

      switch (filtro.tipo) {
        case 'catalogo':
          query = query.eq('catalogo_id', filtro.id).order('nome', { ascending: true });
          break;
        case 'categoria':
          query = query.eq('categoria_id', filtro.id).order('nome', { ascending: true });
          break;
        case 'destaque':
          query = query.eq('destaque', true).order('preco_efetivo', { ascending: true });
          break;
        case 'mais-vendidos':
          query = query.order('vendas', { ascending: false });
          break;
        case 'busca':
          query = query.ilike('busca', `%${filtro.termo.trim().toLowerCase()}%`).order('nome', { ascending: true });
          break;
      }

      const { data, error, count } = await query;
      if (error) throw error;
      const itens = (data ?? []) as ProdutoResumo[];
      return {
        itens,
        total: count ?? 0,
        proximaPagina: itens.length === tamanho ? pageParam + tamanho : undefined,
      };
    },
    getNextPageParam: (ultimaPagina) => ultimaPagina.proximaPagina,
    enabled: filtro.tipo !== 'busca' || filtro.termo.trim().length > 0,
  });
}

export type SantoDoProduto = { id: string; nome: string; fotoUrl: string | null };

export type ProdutoDetalhe = {
  produto: Tables<'produtos'>;
  santos: SantoDoProduto[];
};

// Regra 15 (bug corrigido): só mostra santos com variação ativa para este
// produto (join em produto_santos), nunca a tabela santos inteira.
export function useProdutoDetalhe(id: string | undefined) {
  return useQuery({
    queryKey: ['produtos', 'detalhe', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: produto, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('id', id as string)
        .single();
      if (error) throw error;

      let santos: SantoDoProduto[] = [];
      if (produto.personalizavel) {
        const { data: linhas, error: erroSantos } = await supabase
          .from('produto_santos')
          .select('foto_url, santos ( id, nome, foto_url, ordem )')
          .eq('produto_id', produto.id);
        if (erroSantos) throw erroSantos;
        santos = (linhas ?? [])
          .map((linha) => {
            const santo = linha.santos as { id: string; nome: string; foto_url: string | null; ordem: number } | null;
            if (!santo) return null;
            return { id: santo.id, nome: santo.nome, fotoUrl: linha.foto_url ?? santo.foto_url, ordem: santo.ordem };
          })
          .filter((s): s is SantoDoProduto & { ordem: number } => s !== null)
          .sort((a, b) => a.ordem - b.ordem)
          .map(({ id: santoId, nome, fotoUrl }) => ({ id: santoId, nome, fotoUrl }));
      }

      return { produto, santos } satisfies ProdutoDetalhe;
    },
  });
}

export function useNotificacoes() {
  return useQuery({
    queryKey: ['notificacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('id,titulo,corpo,imagem_url,rota_destino,criado_em')
        .order('criado_em', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}
