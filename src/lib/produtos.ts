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
        .select('id,titulo,foto_url,link,ordem')
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
  | { tipo: 'catalogo'; id: string; categoriaId?: string | null }
  | { tipo: 'categoria'; id: string; catalogoId?: string | null }
  | { tipo: 'destaque' }
  | { tipo: 'mais-vendidos' }
  | { tipo: 'busca'; termo: string };

// 20 por vez em todas as listas: carrega mais ao rolar e, como garantia,
// pelo botão "Ver mais" no fim da lista (pedido do cliente em 28/09/2026).
const TAMANHO_PAGINA: Record<FiltroProdutos['tipo'], number> = {
  catalogo: 20,
  categoria: 20,
  destaque: 20,
  'mais-vendidos': 20,
  busca: 20,
};

// Listagens completas ("Ver mais"/"Ver todas"), paginadas.
export function useProdutos(filtro: FiltroProdutos) {
  const tamanho = TAMANHO_PAGINA[filtro.tipo];

  return useInfiniteQuery({
    queryKey: ['produtos', 'lista', filtro],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      // Busca usa uma função à parte: prioriza sku exato/começa-com antes do
      // nome, porque o cliente B2B decora o código do catálogo ("CH.032") e
      // espera achar na hora — um ilike comum ordenado por nome não garante isso.
      if (filtro.tipo === 'busca') {
        const { data, error } = await supabase.rpc('produtos_busca', {
          p_termo: filtro.termo.trim(),
          p_offset: pageParam,
          p_limite: tamanho,
        });
        if (error) throw error;
        const linhas = data ?? [];
        const itens = linhas.map(({ total: _total, ...resto }) => resto) as ProdutoResumo[];
        const total = linhas[0]?.total ?? 0;
        return {
          itens,
          total,
          proximaPagina: itens.length === tamanho ? pageParam + tamanho : undefined,
        };
      }

      let query = supabase
        .from('produtos')
        .select(COLUNAS_RESUMO, { count: 'exact' })
        .eq('ativo', true)
        .not('imagem_principal', 'is', null)
        .range(pageParam, pageParam + tamanho - 1);

      switch (filtro.tipo) {
        case 'catalogo':
          query = query.eq('catalogo_id', filtro.id);
          if (filtro.categoriaId) query = query.eq('categoria_id', filtro.categoriaId);
          query = query.order('nome', { ascending: true });
          break;
        case 'categoria':
          query = query.eq('categoria_id', filtro.id);
          if (filtro.catalogoId) query = query.eq('catalogo_id', filtro.catalogoId);
          query = query.order('nome', { ascending: true });
          break;
        case 'destaque':
          query = query.eq('destaque', true).order('preco_efetivo', { ascending: true });
          break;
        case 'mais-vendidos':
          query = query.order('vendas', { ascending: false });
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

// Regra: produtos com o mesmo "prefixo" de SKU (ex.: AD020-1/-2/-3) são
// variações do mesmo item — a função no banco prioriza esses e completa com
// produtos da mesma categoria até ter pelo menos 10.
export function useProdutosRecomendados(produtoId: string | undefined) {
  return useQuery({
    queryKey: ['produtos', 'recomendados', produtoId],
    enabled: !!produtoId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('produtos_recomendados', { p_produto_id: produtoId as string });
      if (error) throw error;
      return (data ?? []) as ProdutoResumo[];
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

export type OpcaoFiltro = { id: string; nome: string; qtd: number };

// Chips de filtro: no catálogo, as categorias que têm produto nele; na
// categoria, os catálogos que têm produto nela (nunca oferece filtro vazio).
export function useOpcoesFiltro(origem: 'catalogo' | 'categoria', id: string | undefined) {
  return useQuery({
    queryKey: ['produtos', 'opcoes-filtro', origem, id],
    enabled: !!id,
    queryFn: async (): Promise<OpcaoFiltro[]> => {
      const { data, error } =
        origem === 'catalogo'
          ? await supabase.rpc('categorias_do_catalogo', { p_catalogo_id: id as string })
          : await supabase.rpc('catalogos_da_categoria', { p_categoria_id: id as string });
      if (error) throw error;
      return (data ?? []).map((o) => ({ id: o.id, nome: o.nome, qtd: Number(o.qtd) }));
    },
  });
}
