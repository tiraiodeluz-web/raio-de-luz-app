import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';

type Props = {
  titulo: string;
  verMaisHref?: Href;
  icone?: keyof typeof Ionicons.glyphMap;
  corIcone?: string;
};

export function SecaoCabecalho({ titulo, verMaisHref, icone, corIcone }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.tituloLinha}>
        {icone ? <Ionicons name={icone} size={20} color={corIcone ?? BrandColors.fundoEscuro} /> : null}
        <ThemedText type="subtitle" style={styles.titulo}>
          {titulo}
        </ThemedText>
      </View>
      {verMaisHref ? (
        <Pressable onPress={() => router.push(verMaisHref)}>
          <ThemedText type="smallBold" style={styles.verMais}>
            Ver todas
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
  tituloLinha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  titulo: { fontSize: 20, lineHeight: 26 },
  verMais: { color: BrandColors.dourado },
});
