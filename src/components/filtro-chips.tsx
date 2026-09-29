import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Radii, Spacing } from '@/constants/theme';
import type { OpcaoFiltro } from '@/lib/produtos';

type Props = {
  opcoes: OpcaoFiltro[];
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
};

// Linha de chips roláveis: "Todos" + uma opção por categoria/catálogo.
// Some quando há só uma opção (filtrar não mudaria nada).
export function FiltroChips({ opcoes, selecionado, onSelecionar }: Props) {
  if (opcoes.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.linha}
      style={styles.scroll}>
      <Chip rotulo="Todos" ativo={selecionado === null} onPress={() => onSelecionar(null)} />
      {opcoes.map((opcao) => (
        <Chip
          key={opcao.id}
          rotulo={`${opcao.nome} (${opcao.qtd})`}
          ativo={selecionado === opcao.id}
          onPress={() => onSelecionar(selecionado === opcao.id ? null : opcao.id)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ rotulo, ativo, onPress }: { rotulo: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, ativo && styles.chipAtivo, pressed && styles.pressionado]}>
      <ThemedText type="smallBold" style={[styles.rotulo, ativo && styles.rotuloAtivo]} numberOfLines={1}>
        {rotulo}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  linha: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.two },
  chip: {
    borderRadius: Radii.pilula,
    borderWidth: 1,
    borderColor: BrandColors.fundoEscuro,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    backgroundColor: '#ffffff',
  },
  chipAtivo: { backgroundColor: BrandColors.fundoEscuro },
  pressionado: { opacity: 0.7 },
  rotulo: { color: BrandColors.fundoEscuro, fontSize: 13 },
  rotuloAtivo: { color: '#ffffff' },
});
