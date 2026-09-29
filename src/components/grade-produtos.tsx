import { useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
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
  // Filtros (chips) fixos no topo da lista; continuam visíveis ao rolar.
  filtros?: ReactNode;
};

// Lista completa paginada (catálogo, categoria, busca, ofertas, mais vendidos).
export function GradeProdutos({ query, mostrarContagem, mostrarComprar, mensagemVazio, filtros }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = query;
  const itens = data?.pages.flatMap((pagina) => pagina.itens) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const [produtoParaComprar, setProdutoParaComprar] = useState<ProdutoResumo | null>(null);

  if (isLoading) {
    return (
      <>
        {filtros}
        <ActivityIndicator style={styles.carregando} />
      </>
    );
  }

  return (
    <>
      {filtros}
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
          <View style={styles.coluna}>
            <ProdutoCard produto={item} mostrarComprar={mostrarComprar} onComprar={setProdutoParaComprar} />
          </View>
        )}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage) fetchNextPage();
        }}
        // Carrega sozinho ao chegar perto do fim; o botão fica como garantia
        // (ex.: lista curta que não rola, ou rolagem rápida demais).
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={styles.rodape} />
          ) : hasNextPage ? (
            <View style={styles.rodape}>
              <Button titulo="Ver mais" variante="secundario" onPress={() => fetchNextPage()} />
            </View>
          ) : null
        }
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
  coluna: { flex: 1, maxWidth: '48%' },
  contagem: { marginBottom: Spacing.two },
  rodape: { marginVertical: Spacing.three },
});
