import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EstadoVazio } from '@/components/estado-vazio';
import { StatusPedidoBadge } from '@/components/status-pedido-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
        <ThemedText type="title" style={styles.titulo}>
          Meus pedidos
        </ThemedText>
        <EstadoVazio icone="log-in-outline" titulo="Faça login para ver seus pedidos" />
        <Button titulo="Entrar" onPress={() => router.push('/(auth)/login')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedText type="title" style={styles.titulo}>
        Meus pedidos
      </ThemedText>

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

      <WhatsAppFlutuante />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  titulo: { fontSize: 22, lineHeight: 28, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  carregando: { marginTop: Spacing.five },
  lista: { padding: Spacing.three, gap: Spacing.two },
  item: { borderRadius: 10, padding: Spacing.three, gap: Spacing.half },
});
