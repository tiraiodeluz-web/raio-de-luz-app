import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { COR_STATUS, ROTULO_STATUS, type StatusPedido } from '@/lib/pedidos';

type Props = {
  status: StatusPedido;
  // Meus Pedidos (cliente): texto colorido sem fundo. Pedidos (admin): pílula com fundo leve.
  semFundo?: boolean;
};

export function StatusPedidoBadge({ status, semFundo }: Props) {
  const cor = COR_STATUS[status];
  if (semFundo) {
    return (
      <ThemedText type="smallBold" style={{ color: cor }}>
        {ROTULO_STATUS[status]}
      </ThemedText>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: `${cor}22` }]}>
      <ThemedText type="small" style={[styles.texto, { color: cor }]}>
        {ROTULO_STATUS[status]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  texto: { fontWeight: '700' },
});
