import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { CategoriaPill } from '@/components/categoria-pill';
import { EstadoVazio } from '@/components/estado-vazio';
import { Spacing } from '@/constants/theme';
import { useCategorias } from '@/lib/produtos';

export default function CategoriasScreen() {
  const categorias = useCategorias();

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Categorias" />
      <FlatList
        data={categorias.data ?? []}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.linha}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          !categorias.isLoading ? <EstadoVazio icone="grid-outline" titulo="Nenhuma categoria ainda" /> : null
        }
        renderItem={({ item }) => <CategoriaPill id={item.id} nome={item.nome} fotoUrl={item.foto_url} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  lista: { padding: Spacing.three, gap: Spacing.three },
  linha: { justifyContent: 'space-between' },
});
