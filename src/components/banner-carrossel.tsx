import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Dimensions, Linking, Pressable, ScrollView, StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const LARGURA_TELA = Dimensions.get('window').width;
const LARGURA_BANNER = LARGURA_TELA - Spacing.three * 2;
const PASSO = LARGURA_BANNER + Spacing.two;
const INTERVALO_MS = 4000;

type Banner = { id: string; titulo: string | null; foto_url: string; link: string | null };

// Link do banner pode ser uma rota interna (ex.: "/catalogo/<id>") ou uma
// URL externa (ex.: "https://..."), igual ao rota_destino das notificações.
function abrirLink(link: string) {
  if (link.startsWith('http://') || link.startsWith('https://')) {
    Linking.openURL(link);
  } else {
    router.push(link as never);
  }
}

export function BannerCarrossel({ banners }: { banners: Banner[] }) {
  const scrollRef = useRef<ScrollView>(null);
  const indiceRef = useRef(0);

  // Auto-rotação: troca de banner sozinho a cada 4s, voltando ao primeiro
  // depois do último. Pausa a cada troca manual (o índice é resincronizado
  // no onMomentumScrollEnd), então não briga com o swipe do usuário.
  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => {
      const proximo = (indiceRef.current + 1) % banners.length;
      indiceRef.current = proximo;
      scrollRef.current?.scrollTo({ x: proximo * PASSO, animated: true });
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [banners.length]);

  function aoParar(e: NativeSyntheticEvent<NativeScrollEvent>) {
    indiceRef.current = Math.round(e.nativeEvent.contentOffset.x / PASSO);
  }

  if (banners.length === 0) return null;

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.conteudo}
      snapToInterval={PASSO}
      decelerationRate="fast"
      onMomentumScrollEnd={aoParar}>
      {banners.map((banner) => (
        <Pressable
          key={banner.id}
          disabled={!banner.link}
          onPress={() => banner.link && abrirLink(banner.link)}
          style={styles.banner}>
          <ThemedView type="backgroundElement" style={styles.banner}>
            <Image source={{ uri: banner.foto_url }} style={styles.imagem} contentFit="cover" />
          </ThemedView>
        </Pressable>
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
