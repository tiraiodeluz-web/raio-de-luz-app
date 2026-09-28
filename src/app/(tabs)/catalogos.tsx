import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EstadoVazio } from '@/components/estado-vazio';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WhatsAppFlutuante } from '@/components/whatsapp-flutuante';
import { Spacing } from '@/constants/theme';
import { useCatalogos } from '@/lib/produtos';

export default function CatalogosScreen() {
  const catalogos = useCatalogos();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedText type="title" style={styles.titulo}>
        Nossos Catálogos
      </ThemedText>

      {catalogos.isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <FlatList
          data={catalogos.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={<EstadoVazio icone="albums-outline" titulo="Nenhum catálogo publicado ainda" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/catalogo/${item.id}`)}>
              <ThemedView type="backgroundElement" style={styles.banner}>
                {item.imagem_url ? (
                  <Image source={{ uri: item.imagem_url }} style={styles.imagem} contentFit="cover" />
                ) : null}
                <ThemedView style={styles.legenda}>
                  <ThemedText type="smallBold">{item.nome}</ThemedText>
                </ThemedView>
              </ThemedView>
            </Pressable>
          )}
        />
      )}

      <WhatsAppFlutuante />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  titulo: { fontSize: 22, lineHeight: 28, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  carregando: { marginTop: Spacing.five },
  lista: { padding: Spacing.three, gap: Spacing.three },
  banner: { borderRadius: 14, overflow: 'hidden', aspectRatio: 16 / 9 },
  imagem: { width: '100%', height: '100%', position: 'absolute' },
  legenda: { padding: Spacing.two, marginTop: 'auto', backgroundColor: 'transparent' },
});
