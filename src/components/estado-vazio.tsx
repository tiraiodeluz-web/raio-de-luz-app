import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icone?: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descricao?: string;
};

export function EstadoVazio({ icone = 'file-tray-outline', titulo, descricao }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Ionicons name={icone} size={40} color={theme.textSecondary} />
      <ThemedText type="smallBold" style={styles.texto}>
        {titulo}
      </ThemedText>
      {descricao ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.texto}>
          {descricao}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: Spacing.five, gap: Spacing.one },
  texto: { textAlign: 'center' },
});
