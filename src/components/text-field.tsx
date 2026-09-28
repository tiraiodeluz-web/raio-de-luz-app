import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type Props = TextInputProps & {
  rotulo?: string;
  erro?: string;
  icone?: keyof typeof Ionicons.glyphMap;
  // Telas com fundo navy cheio (Login/Cadastro): rótulo em branco, campo
  // sempre com fundo branco (não segue o tema claro/escuro do aparelho).
  claro?: boolean;
};

export function TextField({ rotulo, erro, icone, claro, style, ...rest }: Props) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const placeholderColor = claro ? '#8A8D99' : Colors[scheme === 'unspecified' ? 'light' : scheme].textSecondary;

  return (
    <View style={styles.container}>
      {rotulo ? (
        <ThemedText type="smallBold" themeColor={claro ? undefined : 'textSecondary'} style={claro ? styles.rotuloClaro : undefined}>
          {rotulo}
        </ThemedText>
      ) : null}
      <View
        style={[
          styles.pilula,
          { backgroundColor: claro ? '#ffffff' : theme.background, borderColor: erro ? '#D64545' : claro ? 'transparent' : theme.backgroundSelected },
        ]}>
        {icone ? <Ionicons name={icone} size={18} color={claro ? '#4A4D5A' : theme.textSecondary} style={styles.icone} /> : null}
        <TextInput
          placeholderTextColor={placeholderColor}
          style={[styles.input, { color: claro ? '#111318' : theme.text }, style]}
          {...rest}
        />
      </View>
      {erro ? (
        <ThemedText type="small" style={styles.erro}>
          {erro}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.half },
  rotuloClaro: { color: '#ffffff' },
  pilula: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1,
    borderRadius: Radii.pilula,
    paddingHorizontal: Spacing.three,
  },
  icone: { marginRight: Spacing.one },
  input: { flex: 1, fontSize: 16, paddingVertical: Spacing.two },
  erro: { color: '#D64545' },
});
