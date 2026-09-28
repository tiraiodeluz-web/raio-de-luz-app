import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { GradeProdutos } from '@/components/grade-produtos';
import { useProdutos } from '@/lib/produtos';
import { supabase } from '@/lib/supabase';

export default function CategoriaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoria = useQuery({
    queryKey: ['categorias', 'nome', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('nome').eq('id', id as string).single();
      if (error) throw error;
      return data;
    },
  });
  const query = useProdutos({ tipo: 'categoria', id: id as string });

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo={categoria.data?.nome ?? 'Categoria'} />
      <GradeProdutos query={query} mostrarContagem mostrarComprar mensagemVazio="Nenhum produto nesta categoria" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
});
