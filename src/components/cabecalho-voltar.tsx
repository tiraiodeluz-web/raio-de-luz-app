import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';

type Props = {
  titulo?: string;
  acao?: React.ReactNode;
};

// O Stack raiz fica com headerShown: false (visual próprio em vez do header
// nativo); as telas fora das abas usam este cabeçalho.
export function CabecalhoVoltar({ titulo, acao }: Props) {
  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={styles.voltar}>
        <Ionicons name="arrow-back" size={24} color={BrandColors.fundoEscuro} />
      </Pressable>
      {titulo ? (
        <ThemedText type="title" numberOfLines={1} style={styles.titulo}>
          {titulo}
        </ThemedText>
      ) : null}
      {acao}
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
  titulo: { flex: 1, fontSize: 18, color: BrandColors.fundoEscuro },
});
