import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { EstadoVazio } from '@/components/estado-vazio';
import { StatusPedidoBadge } from '@/components/status-pedido-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { usePedidosDoCliente } from '@/lib/admin';
import { formatarReais } from '@/lib/formatacao';

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function PedidosDoClienteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: pedidos, isLoading } = usePedidosDoCliente(id);

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Pedidos do cliente" />
      {isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <FlatList
          data={pedidos ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={<EstadoVazio icone="receipt-outline" titulo="Este cliente ainda não fez pedidos" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/admin/pedido/${item.id}`)}>
              <ThemedView type="backgroundElement" style={styles.item}>
                <StatusPedidoBadge status={item.status} />
                <ThemedText type="smallBold">Pedido Nº {item.numero}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {formatarReais(item.total)} · {FORMATADOR_DATA.format(new Date(item.criado_em))}
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  carregando: { marginTop: Spacing.five },
  lista: { padding: Spacing.three, gap: Spacing.two },
  item: { borderRadius: 10, padding: Spacing.three, gap: Spacing.half },
});
