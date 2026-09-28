import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = {
  titulo: string;
  descricao: string;
};

// Tela provisória: as etapas 3 a 7 do plano de migração substituem cada aba
// por sua versão final (vitrine, carrinho, checkout, pedidos, conta, admin).
export function TabPlaceholder({ titulo, descricao }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container} type="background">
        <ThemedText type="title">{titulo}</ThemedText>
        <ThemedText type="default" themeColor="textSecondary" style={styles.descricao}>
          {descricao}
        </ThemedText>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  descricao: { textAlign: 'left' },
});
