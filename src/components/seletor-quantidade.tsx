import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';

type Props = {
  quantidade: number;
  embalagem: number;
  onAlterar: (quantidade: number) => void;
};

// Regra 5: anda sempre em múltiplos da embalagem; mínimo é uma embalagem.
export function SeletorQuantidade({ quantidade, embalagem, onAlterar }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        style={styles.botao}
        disabled={quantidade <= embalagem}
        onPress={() => onAlterar(Math.max(embalagem, quantidade - embalagem))}>
        <ThemedText type="title" style={styles.simbolo}>
          −
        </ThemedText>
      </Pressable>
      <ThemedText type="smallBold" style={styles.valor}>
        {quantidade}
      </ThemedText>
      <Pressable style={styles.botao} onPress={() => onAlterar(quantidade + embalagem)}>
        <ThemedText type="title" style={styles.simbolo}>
          +
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  botao: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BrandColors.fundoEscuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simbolo: { fontSize: 20, lineHeight: 22 },
  valor: { minWidth: 32, textAlign: 'center' },
});
