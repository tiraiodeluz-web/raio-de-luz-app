import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { EstadoVazio } from '@/components/estado-vazio';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCarrinhoDoCliente } from '@/lib/admin';
import { formatarReais, precoExibido } from '@/lib/formatacao';

export default function CarrinhoDoClienteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: itens, isLoading } = useCarrinhoDoCliente(id);

  const valor = (itens ?? []).reduce(
    (soma, item) => soma + precoExibido(item.produto.preco, item.produto.preco_promocional) * item.quantidade,
    0,
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Carrinho do cliente" />
      {isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <FlatList
          data={itens ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          ListHeaderComponent={
            itens && itens.length > 0 ? (
              <ThemedText type="smallBold" style={styles.total}>
                Total: {formatarReais(valor)}
              </ThemedText>
            ) : null
          }
          ListEmptyComponent={<EstadoVazio icone="cart-outline" titulo="Carrinho vazio" />}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Image source={{ uri: item.produto.imagem_principal ?? undefined }} style={styles.itemImagem} contentFit="cover" />
              <View style={styles.itemInfo}>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {item.produto.nome}
                </ThemedText>
                {item.santo ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Santo: {item.santo.nome}
                  </ThemedText>
                ) : null}
                <ThemedText type="small" themeColor="textSecondary">
                  {item.quantidade} × {formatarReais(precoExibido(item.produto.preco, item.produto.preco_promocional))}
                </ThemedText>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  carregando: { marginTop: Spacing.five },
  lista: { padding: Spacing.three, gap: Spacing.two },
  total: { marginBottom: Spacing.one },
  item: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E6EC',
  },
  itemImagem: { width: 56, height: 56, borderRadius: 8 },
  itemInfo: { flex: 1, gap: Spacing.half },
});
