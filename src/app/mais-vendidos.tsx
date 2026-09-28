import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { GradeProdutos } from '@/components/grade-produtos';
import { useProdutos } from '@/lib/produtos';

// Regra 4 (bug #14 corrigido): ordenado do que mais vende para o que menos vende.
export default function MaisVendidosScreen() {
  const query = useProdutos({ tipo: 'mais-vendidos' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Mais vendidos" />
      <GradeProdutos query={query} mostrarContagem mensagemVazio="Ainda sem vendas" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});
