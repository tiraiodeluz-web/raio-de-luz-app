import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminCabecalho } from '@/components/admin-cabecalho';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatarReais } from '@/lib/formatacao';
import { useMetricasAdmin } from '@/lib/admin';

export default function MetricasScreen() {
  const { data, isLoading } = useMetricasAdmin();

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminCabecalho titulo="Métricas" />
      {isLoading || !data ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <ScrollView contentContainerStyle={styles.grade}>
          <Cartao titulo="Total de pedidos" valor={String(data.pedidos_total)} variacao={`+${data.pedidos_hoje} hoje`} />
          <Cartao titulo="Faturamento" valor={formatarReais(data.faturamento_total)} variacao={`${formatarReais(data.faturamento_hoje)} hoje`} />
          <Cartao titulo="Aguardando pagamento" valor={String(data.aguardando)} />
          <Cartao titulo="Em separação" valor={String(data.em_separacao)} />
          <Cartao titulo="Enviados" valor={String(data.enviados)} />
          <Cartao titulo="Cancelados" valor={String(data.cancelados)} />
          <Cartao titulo="Carrinhos abandonados" valor={String(data.carrinhos_abandonados)} />
          <Cartao titulo="Cadastros pendentes" valor={String(data.cadastros_pendentes)} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Cartao({ titulo, valor, variacao }: { titulo: string; valor: string; variacao?: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.cartao}>
      <ThemedText type="small" themeColor="textSecondary">
        {titulo}
      </ThemedText>
      <ThemedText type="title" style={styles.valor}>
        {valor}
      </ThemedText>
      {variacao ? (
        <ThemedText type="small" themeColor="textSecondary">
          {variacao}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  carregando: { marginTop: Spacing.five },
  grade: { padding: Spacing.three, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  cartao: { width: '46%', borderRadius: 12, padding: Spacing.three, gap: Spacing.half },
  valor: { fontSize: 24, lineHeight: 30 },
});
