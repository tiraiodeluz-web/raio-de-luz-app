import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { GradeProdutos } from '@/components/grade-produtos';
import { useProdutos } from '@/lib/produtos';

// Regra 4: "Em oferta" = produtos ativos com destaque, ordenados por preço.
export default function OfertasScreen() {
  const query = useProdutos({ tipo: 'destaque' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Em oferta" />
      <GradeProdutos query={query} mostrarContagem mostrarComprar mensagemVazio="Nenhuma oferta no momento" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
});
