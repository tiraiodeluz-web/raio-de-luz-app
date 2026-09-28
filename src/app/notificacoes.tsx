import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { EstadoVazio } from '@/components/estado-vazio';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
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
            <View style={styles.item}>
              <Ionicons name="notifications" size={20} color={BrandColors.dourado} />
              <View style={styles.itemTexto}>
                <ThemedText type="smallBold">{item.titulo}</ThemedText>
                <ThemedText themeColor="textSecondary">{item.corpo}</ThemedText>
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  lista: { padding: Spacing.three, gap: Spacing.two },
  item: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderRadius: 10,
    padding: Spacing.three,
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E6EC',
  },
  itemTexto: { flex: 1, gap: Spacing.half },
});
