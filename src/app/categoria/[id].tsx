import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { FiltroChips } from '@/components/filtro-chips';
import { GradeProdutos } from '@/components/grade-produtos';
import { useOpcoesFiltro, useProdutos } from '@/lib/produtos';
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
  // Filtro por catálogo dentro desta categoria (pedido do cliente em 28/09/2026)
  const [filtro, setFiltro] = useState<string | null>(null);
  const opcoes = useOpcoesFiltro('categoria', id);
  const query = useProdutos({ tipo: 'categoria', id: id as string, catalogoId: filtro });

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo={categoria.data?.nome ?? 'Categoria'} />
      <GradeProdutos
        query={query}
        mostrarContagem
        mostrarComprar
        mensagemVazio="Nenhum produto nesta categoria"
        filtros={<FiltroChips opcoes={opcoes.data ?? []} selecionado={filtro} onSelecionar={setFiltro} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
});
