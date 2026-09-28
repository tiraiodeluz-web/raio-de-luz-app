import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';

import { ComprarRapido } from '@/components/comprar-rapido';
import { EstadoVazio } from '@/components/estado-vazio';
import { ProdutoCard } from '@/components/produto-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ProdutoResumo, useProdutos } from '@/lib/produtos';

type QueryResultado = ReturnType<typeof useProdutos>;

type Props = {
  query: QueryResultado;
  mostrarContagem?: boolean;
  mostrarComprar?: boolean;
  mensagemVazio?: string;
};

// Lista completa paginada (catálogo, categoria, busca, ofertas, mais vendidos).
export function GradeProdutos({ query, mostrarContagem, mostrarComprar, mensagemVazio }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = query;
  const itens = data?.pages.flatMap((pagina) => pagina.itens) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const [produtoParaComprar, setProdutoParaComprar] = useState<ProdutoResumo | null>(null);

  if (isLoading) {
    return <ActivityIndicator style={styles.carregando} />;
  }

  return (
    <>
      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.linha}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={
          mostrarContagem && itens.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.contagem}>
              {total} {total === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </ThemedText>
          ) : null
        }
        ListEmptyComponent={
          <EstadoVazio icone="pricetags-outline" titulo={mensagemVazio ?? 'Nenhum produto encontrado'} />
        }
        renderItem={({ item }) => (
          <ProdutoCard produto={item} mostrarComprar={mostrarComprar} onComprar={setProdutoParaComprar} />
        )}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage) fetchNextPage();
        }}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.rodape} /> : null}
      />
      {produtoParaComprar ? (
        <ComprarRapido produto={produtoParaComprar} onFechar={() => setProdutoParaComprar(null)} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  carregando: { marginTop: Spacing.five },
  lista: { padding: Spacing.three, gap: Spacing.three },
  linha: { gap: Spacing.three },
  contagem: { marginBottom: Spacing.two },
  rodape: { marginVertical: Spacing.three },
});
