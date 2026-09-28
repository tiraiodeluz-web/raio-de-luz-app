import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';

type Props = {
  id: string;
  nome: string;
  fotoUrl: string | null;
};

export function CategoriaPill({ id, nome, fotoUrl }: Props) {
  return (
    <Pressable style={styles.container} onPress={() => router.push(`/categoria/${id}`)}>
      <View style={styles.circulo}>
        {fotoUrl ? <Image source={{ uri: fotoUrl }} style={styles.imagem} contentFit="cover" /> : null}
      </View>
      <ThemedText type="smallBold" numberOfLines={2} style={styles.nome}>
        {nome.toUpperCase()}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: 78, gap: Spacing.half },
  circulo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: BrandColors.fundoEscuro,
    backgroundColor: '#F0F0F3',
  },
  imagem: { width: '100%', height: '100%' },
  nome: { textAlign: 'center', fontSize: 11, lineHeight: 14 },
});
