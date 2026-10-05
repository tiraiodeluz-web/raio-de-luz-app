import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const LARGURA_TELA = Dimensions.get('window').width;
const LARGURA_BANNER = LARGURA_TELA - Spacing.three * 2;
const PASSO = LARGURA_BANNER + Spacing.two;
const INTERVALO_MS = 4000;

type Banner = { id: string; titulo: string | null; foto_url: string };

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
