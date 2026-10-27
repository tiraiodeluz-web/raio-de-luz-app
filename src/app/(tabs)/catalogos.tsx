import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EstadoVazio } from '@/components/estado-vazio';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCatalogos } from '@/lib/produtos';

export default function CatalogosScreen() {
  const catalogos = useCatalogos();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedText style={styles.titulo}>Nossos Catálogos</ThemedText>

      {catalogos.isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <FlatList
          data={catalogos.data ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.linha}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={<EstadoVazio icone="albums-outline" titulo="Nenhum catálogo publicado ainda" />}
          renderItem={({ item }) => (
            <View style={styles.coluna}>
              <Pressable onPress={() => router.push(`/catalogo/${item.id}`)} style={styles.capa} accessibilityLabel={item.nome}>
                {item.imagem_url ? (
                  <Image source={{ uri: item.imagem_url }} style={styles.imagem} contentFit="cover" />
                ) : (
                  <ThemedText type="smallBold" style={styles.legendaSemImagem}>
                    {item.nome}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  titulo: { fontSize: 20, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  carregando: { marginTop: Spacing.five },
  lista: { paddingHorizontal: Spacing.two, paddingBottom: Spacing.four, gap: Spacing.two },
  linha: { gap: Spacing.two },
  coluna: { flex: 1, maxWidth: '49%' },
  // Capa vertical (proporção 5:7, como a arte dos catálogos: 1000 x 1400 px).
  capa: {
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 5 / 7,
    backgroundColor: '#F0F0F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagem: { width: '100%', height: '100%' },
  legendaSemImagem: { textAlign: 'center' },
});
