import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { FiltroChips } from '@/components/filtro-chips';
import { GradeProdutos } from '@/components/grade-produtos';
import { supabase } from '@/lib/supabase';
import { useOpcoesFiltro, useProdutos } from '@/lib/produtos';

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
  // Filtro por categoria dentro deste catálogo (pedido do cliente em 28/09/2026)
  const [filtro, setFiltro] = useState<string | null>(null);
  const opcoes = useOpcoesFiltro('catalogo', id);
  const query = useProdutos({ tipo: 'catalogo', id: id as string, categoriaId: filtro });

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo={catalogo.data?.nome ?? 'Catálogo'} />
      <GradeProdutos
        query={query}
        mostrarContagem
        mostrarComprar
        mensagemVazio="Nenhum produto neste catálogo"
        filtros={<FiltroChips opcoes={opcoes.data ?? []} selecionado={filtro} onSelecionar={setFiltro} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
});
