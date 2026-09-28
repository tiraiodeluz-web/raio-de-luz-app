import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminCabecalho } from '@/components/admin-cabecalho';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { useMetricasAdmin } from '@/lib/admin';
import { useAuth } from '@/lib/auth-context';
import { formatarReais } from '@/lib/formatacao';

export default function MetricasScreen() {
  const { data, isLoading } = useMetricasAdmin();
  const { perfil } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminCabecalho titulo="Métricas" />
      <View style={styles.boasVindas}>
        <ThemedText type="title" style={styles.ola}>
          Olá, {perfil?.nome || 'Admin'}
        </ThemedText>
        <ThemedText themeColor="textSecondary">Bem-vindo ao painel administrativo</ThemedText>
      </View>
      {isLoading || !data ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <ScrollView contentContainerStyle={styles.grade}>
          <Cartao icone="bag-handle-outline" cor="#5B3FD1" titulo="Pedidos" valor={String(data.pedidos_total)} variacao={`+${data.pedidos_hoje} hoje`} />
          <Cartao icone="cash-outline" cor="#1E8E3E" titulo="Faturamento" valor={formatarReais(data.faturamento_total)} variacao={`${formatarReais(data.faturamento_hoje)} hoje`} />
          <Cartao icone="time-outline" cor={BrandColors.dourado} titulo="Pendentes" valor={String(data.aguardando)} variacao="Aguardando" />
          <Cartao icone="layers-outline" cor="#2563EB" titulo="Em Separação" valor={String(data.em_separacao)} variacao="Separando" />
          <Cartao icone="paper-plane-outline" cor="#0D9488" titulo="Enviados" valor={String(data.enviados)} variacao="Em trânsito" />
          <Cartao icone="trash-outline" cor="#D64545" titulo="Cancelados" valor={String(data.cancelados)} variacao="Cancelados" />
          <Cartao icone="cart-outline" cor="#5B3FD1" titulo="Carrinhos Abandonados" valor={String(data.carrinhos_abandonados)} />
          <Cartao icone="person-add-outline" cor={BrandColors.dourado} titulo="Cadastros Pendentes" valor={String(data.cadastros_pendentes)} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Cartao({
  icone,
  cor,
  titulo,
  valor,
  variacao,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  cor: string;
  titulo: string;
  valor: string;
  variacao?: string;
}) {
  return (
    <View style={styles.cartao}>
      <View style={styles.cartaoCabecalho}>
        <Ionicons name={icone} size={20} color={cor} />
        <ThemedText type="small">{titulo}</ThemedText>
      </View>
      <ThemedText type="title" style={styles.valor}>
        {valor}
      </ThemedText>
      {variacao ? (
        <ThemedText type="small" style={[styles.variacao, { color: cor }]}>
          {variacao}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  boasVindas: { paddingHorizontal: Spacing.three, gap: Spacing.half, marginBottom: Spacing.two },
  ola: { fontSize: 22, lineHeight: 28 },
  carregando: { marginTop: Spacing.five },
  grade: { padding: Spacing.three, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  cartao: {
    width: '46%',
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E6EC',
  },
  cartaoCabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  valor: { fontSize: 24, lineHeight: 30 },
  variacao: { fontWeight: '700' },
});
