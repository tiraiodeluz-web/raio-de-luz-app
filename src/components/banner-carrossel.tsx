import { Image } from 'expo-image';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const LARGURA_TELA = Dimensions.get('window').width;
const LARGURA_BANNER = LARGURA_TELA - Spacing.three * 2;

type Banner = { id: string; titulo: string | null; foto_url: string };

export function BannerCarrossel({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null;

  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.conteudo}
      snapToInterval={LARGURA_BANNER + Spacing.two}
      decelerationRate="fast">
      {banners.map((banner) => (
        <ThemedView key={banner.id} type="backgroundElement" style={styles.banner}>
          <Image source={{ uri: banner.foto_url }} style={styles.imagem} contentFit="cover" />
        </ThemedView>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  banner: {
    width: LARGURA_BANNER,
    height: LARGURA_BANNER * 0.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  imagem: { width: '100%', height: '100%' },
});
