import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';

type Props = {
  titulo: string;
  verMaisHref?: Href;
};

export function SecaoCabecalho({ titulo, verMaisHref }: Props) {
  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.titulo}>
        {titulo}
      </ThemedText>
      {verMaisHref ? (
        <Pressable onPress={() => router.push(verMaisHref)}>
          <ThemedText type="smallBold" style={styles.verMais}>
            Ver mais
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  titulo: { fontSize: 20, lineHeight: 26 },
  verMais: { color: BrandColors.dourado },
});
