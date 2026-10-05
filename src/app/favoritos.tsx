import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { EstadoVazio } from '@/components/estado-vazio';
import { ProdutoCard } from '@/components/produto-card';
import { Spacing } from '@/constants/theme';
import { useProdutosFavoritos } from '@/lib/favoritos';

export default function FavoritosScreen() {
  const { data: produtos, isLoading } = useProdutosFavoritos();

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Meus favoritos" />
      {isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <FlatList
          data={produtos ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.linha}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <EstadoVazio
              icone="heart-outline"
              titulo="Nenhum favorito ainda"
              descricao="Toque no coração de um produto pra guardar ele aqui."
            />
          }
          renderItem={({ item }) => (
            <View style={styles.coluna}>
              <ProdutoCard produto={item} />
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
  lista: { padding: Spacing.three, gap: Spacing.three, flexGrow: 1 },
  linha: { gap: Spacing.three },
  coluna: { flex: 1, maxWidth: '48%' },
});
