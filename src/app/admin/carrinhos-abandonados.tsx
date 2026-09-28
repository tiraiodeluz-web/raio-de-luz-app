import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminCabecalho } from '@/components/admin-cabecalho';
import { EstadoVazio } from '@/components/estado-vazio';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useCarrinhosAbandonados } from '@/lib/admin';
import { formatarReais } from '@/lib/formatacao';

export default function CarrinhosAbandonadosScreen() {
  const { data: carrinhos, isLoading } = useCarrinhosAbandonados();

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminCabecalho titulo="Carrinhos abandonados" />
      {isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <FlatList
          data={carrinhos ?? []}
          keyExtractor={(item) => item.usuario_id}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={<EstadoVazio icone="cart-outline" titulo="Nenhum carrinho abandonado" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/admin/carrinho/${item.usuario_id}`)}>
              <ThemedView type="backgroundElement" style={styles.item}>
                <View style={styles.cabecalho}>
                  <ThemedText type="smallBold" style={styles.nome}>
                    {item.razao_social || item.nome}
                  </ThemedText>
                  <View style={[styles.selo, item.whatsapp_enviado ? styles.seloEnviado : styles.seloNaoEnviado]}>
                    <ThemedText type="small" style={styles.seloTexto}>
                      {item.whatsapp_enviado ? 'Enviado' : 'Não enviado'}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText themeColor="textSecondary">
                  {item.itens} {item.itens === 1 ? 'item' : 'itens'} · {formatarReais(item.valor)}
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
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  nome: { flex: 1 },
  selo: { borderRadius: 6, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  seloEnviado: { backgroundColor: '#1E8E3E22' },
  seloNaoEnviado: { backgroundColor: '#00000014' },
  seloTexto: { fontWeight: '700' },
});
