import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = {
  id: string;
  nome: string;
  fotoUrl: string | null;
};

export function CategoriaPill({ id, nome, fotoUrl }: Props) {
  return (
    <Pressable style={styles.container} onPress={() => router.push(`/categoria/${id}`)}>
      <ThemedView type="backgroundElement" style={styles.circulo}>
        {fotoUrl ? <Image source={{ uri: fotoUrl }} style={styles.imagem} contentFit="cover" /> : null}
      </ThemedView>
      <ThemedText type="small" numberOfLines={1} style={styles.nome}>
        {nome}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: 76, gap: Spacing.half },
  circulo: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden' },
  imagem: { width: '100%', height: '100%' },
  nome: { textAlign: 'center' },
});
