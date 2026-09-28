import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EstadoVazio } from '@/components/estado-vazio';
import { ThemedText } from '@/components/themed-text';
import { WhatsAppFlutuante } from '@/components/whatsapp-flutuante';
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
          contentContainerStyle={styles.lista}
          ListEmptyComponent={<EstadoVazio icone="albums-outline" titulo="Nenhum catálogo publicado ainda" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/catalogo/${item.id}`)} style={styles.banner}>
              {item.imagem_url ? (
                <Image source={{ uri: item.imagem_url }} style={styles.imagem} contentFit="cover" />
              ) : (
                <ThemedText type="smallBold" style={styles.legendaSemImagem}>
                  {item.nome}
                </ThemedText>
              )}
            </Pressable>
          )}
        />
      )}

      <WhatsAppFlutuante />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  titulo: { fontSize: 20, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  carregando: { marginTop: Spacing.five },
  lista: { paddingHorizontal: Spacing.two, gap: Spacing.two },
  banner: {
    borderRadius: 10,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    backgroundColor: '#F0F0F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagem: { width: '100%', height: '100%' },
  legendaSemImagem: { textAlign: 'center' },
});
