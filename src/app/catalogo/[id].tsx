import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { GradeProdutos } from '@/components/grade-produtos';
import { supabase } from '@/lib/supabase';
import { useProdutos } from '@/lib/produtos';

export default function CatalogoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const catalogo = useQuery({
    queryKey: ['catalogos', 'nome', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('catalogos').select('nome').eq('id', id as string).single();
      if (error) throw error;
      return data;
    },
  });
  const query = useProdutos({ tipo: 'catalogo', id: id as string });

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo={catalogo.data?.nome ?? 'Catálogo'} />
      <GradeProdutos query={query} mostrarContagem mostrarComprar mensagemVazio="Nenhum produto neste catálogo" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});
