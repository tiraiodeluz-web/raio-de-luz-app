import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors, Radii, Spacing } from '@/constants/theme';

// O app já procura atualização (EAS Update) toda vez que abre e baixa em
// segundo plano; sem isto, ela só entraria na próxima vez que o app fosse
// fechado e aberto. A faixa avisa que a nova versão está pronta e aplica no toque.
export function AvisoAtualizacao() {
  const { isUpdateAvailable, isUpdatePending, isDownloading } = Updates.useUpdates();
  const insets = useSafeAreaInsets();

  // A checagem automática só avisa que existe; o download começa aqui.
  useEffect(() => {
    if (isUpdateAvailable && !isUpdatePending && !isDownloading) {
      Updates.fetchUpdateAsync().catch(() => {});
    }
  }, [isUpdateAvailable, isUpdatePending, isDownloading]);

  if (!isUpdatePending) return null;

  return (
    <Pressable
      style={[styles.faixa, { bottom: insets.bottom + 72 }]}
      onPress={() => Updates.reloadAsync().catch(() => {})}
      accessibilityRole="button">
      <Ionicons name="sparkles-outline" size={18} color={BrandColors.dourado} />
      <Text style={styles.texto}>Nova versão pronta — toque para atualizar</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  faixa: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radii.pilula,
    backgroundColor: BrandColors.fundoEscuro,
    elevation: 6,
  },
  texto: { flex: 1, color: '#ffffff', fontWeight: '700' },
});
