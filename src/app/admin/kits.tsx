import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminCabecalho } from '@/components/admin-cabecalho';
import { Button } from '@/components/button';
import { EstadoVazio } from '@/components/estado-vazio';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatarReais } from '@/lib/formatacao';
import { totalDoKit, useKitsAdmin } from '@/lib/kits';

export default function KitsAdminScreen() {
  const { data: kits, isLoading } = useKitsAdmin();

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminCabecalho titulo="Kits" />
      <View style={styles.novo}>
        <Button titulo="Novo kit" icone="add" onPress={() => router.push('/admin/kit/novo')} />
      </View>
      {isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <FlatList
          data={kits ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <EstadoVazio icone="gift-outline" titulo="Nenhum kit ainda" descricao="Monte um kit juntando produtos que combinam." />
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/admin/kit/${item.id}`)}>
              <Image source={{ uri: item.imagem_url ?? undefined }} style={styles.imagem} contentFit="cover" />
              <View style={styles.info}>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {item.nome}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.itens.length} {item.itens.length === 1 ? 'item' : 'itens'} · {formatarReais(totalDoKit(item.itens))}
                </ThemedText>
                {!item.ativo ? (
                  <View style={styles.inativo}>
                    <ThemedText type="small" style={styles.inativoTexto}>
                      Oculto para clientes
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  novo: { paddingHorizontal: Spacing.three, marginBottom: Spacing.two },
  carregando: { marginTop: Spacing.five },
  lista: { padding: Spacing.three, gap: Spacing.two, flexGrow: 1 },
  card: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.two, borderRadius: 10, borderWidth: 1, borderColor: '#E5E6EC' },
  imagem: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#F3F1EB' },
  info: { flex: 1, gap: Spacing.half },
  inativo: { alignSelf: 'flex-start', backgroundColor: '#F3F1EB', borderRadius: 6, paddingHorizontal: Spacing.one, paddingVertical: 2 },
  inativoTexto: { color: '#8A6D1B', fontWeight: '700' },
});
