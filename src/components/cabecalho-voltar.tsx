import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  titulo?: string;
};

// O Stack raiz fica com headerShown: false (visual próprio em vez do header
// nativo); as telas fora das abas usam este cabeçalho.
export function CabecalhoVoltar({ titulo }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={styles.voltar}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>
      {titulo ? (
        <ThemedText type="smallBold" numberOfLines={1} style={styles.titulo}>
          {titulo}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  voltar: { padding: Spacing.half },
  titulo: { flex: 1 },
});
