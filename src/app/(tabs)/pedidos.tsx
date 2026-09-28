import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EstadoVazio } from '@/components/estado-vazio';
import { StatusPedidoBadge } from '@/components/status-pedido-badge';
import { ThemedText } from '@/components/themed-text';
import { WhatsAppFlutuante } from '@/components/whatsapp-flutuante';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { formatarReais } from '@/lib/formatacao';
import { usePedidos } from '@/lib/pedidos';

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function PedidosScreen() {
  const { session } = useAuth();
  const { data: pedidos, isLoading } = usePedidos();

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedText style={styles.titulo}>Meus Pedidos</ThemedText>
        <EstadoVazio icone="log-in-outline" titulo="Faça login para ver seus pedidos" />
        <Button titulo="Entrar" onPress={() => router.push('/(auth)/login')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedText style={styles.titulo}>Meus Pedidos</ThemedText>

      {isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <FlatList
          data={pedidos ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={<EstadoVazio icone="receipt-outline" titulo="Você ainda não fez nenhum pedido" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/pedido/${item.id}`)}>
              <View style={styles.item}>
                <StatusPedidoBadge status={item.status} semFundo />
                <ThemedText>Pedido: {item.numero}</ThemedText>
                <View style={styles.itemLinhaBaixo}>
                  <ThemedText type="smallBold">Valor: {formatarReais(item.total)}</ThemedText>
                  <ThemedText themeColor="textSecondary">Data: {FORMATADOR_DATA.format(new Date(item.criado_em))}</ThemedText>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      <WhatsAppFlutuante />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  titulo: { fontSize: 20, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  carregando: { marginTop: Spacing.five },
  lista: { padding: Spacing.three, gap: Spacing.two },
  item: {
    borderRadius: 10,
    padding: Spacing.three,
    gap: Spacing.half,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E6EC',
  },
  itemLinhaBaixo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.half },
});
