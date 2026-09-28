import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { EstadoVazio } from '@/components/estado-vazio';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useNotificacoes } from '@/lib/produtos';

export default function NotificacoesScreen() {
  const notificacoes = useNotificacoes();

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Notificações" />
      <FlatList
        data={notificacoes.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          !notificacoes.isLoading ? (
            <EstadoVazio icone="notifications-outline" titulo="Nenhuma notificação ainda" />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => item.rota_destino && router.push(item.rota_destino as never)}>
            <ThemedView type="backgroundElement" style={styles.item}>
              <ThemedText type="smallBold">{item.titulo}</ThemedText>
              <ThemedText themeColor="textSecondary">{item.corpo}</ThemedText>
            </ThemedView>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  lista: { padding: Spacing.three, gap: Spacing.two },
  item: { borderRadius: 10, padding: Spacing.three, gap: Spacing.half },
});
