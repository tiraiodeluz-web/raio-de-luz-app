import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type Props = TextInputProps & {
  rotulo: string;
  erro?: string;
};

export function TextField({ rotulo, erro, style, ...rest }: Props) {
  const theme = useTheme();
  const scheme = useColorScheme();
  const placeholderColor = Colors[scheme === 'unspecified' ? 'light' : scheme].textSecondary;

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {rotulo}
      </ThemedText>
      <TextInput
        placeholderTextColor={placeholderColor}
        style={[
          styles.input,
          { color: theme.text, borderColor: erro ? '#D64545' : theme.backgroundSelected },
          style,
        ]}
        {...rest}
      />
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
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  erro: { color: '#D64545' },
});
