import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

const DURACAO_SPLASH_MS = 4000;

// Boas-vindas: logo + spinner por ~4s. Quem decide para onde ir a partir daqui
// (Início, Login, Aguardando aprovação ou "Ir para?") é o guardião de rotas em
// src/app/_layout.tsx — aqui só aguardamos a sessão carregar e o tempo mínimo passar.
export default function BoasVindas() {
  const { carregando, session } = useAuth();
  const partiuEm = useRef(Date.now());

  useEffect(() => {
    if (carregando) return;

    const passado = Date.now() - partiuEm.current;
    const faltam = Math.max(DURACAO_SPLASH_MS - passado, 0);
    const id = setTimeout(() => {
      router.replace(session ? '/(tabs)' : '/(auth)/login');
    }, faltam);

    return () => clearTimeout(id);
  }, [carregando, session]);

  return (
    <ThemedView style={styles.container}>
      <Image source={require('@/assets/images/icon.png')} style={styles.logo} contentFit="contain" />
      <ActivityIndicator color={BrandColors.dourado} style={styles.spinner} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.fundoEscuro,
    gap: Spacing.five,
  },
  logo: { width: 160, height: 160 },
  spinner: { marginTop: Spacing.two },
});
