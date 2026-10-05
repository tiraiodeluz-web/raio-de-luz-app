import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { EstadoVazio } from '@/components/estado-vazio';
import { StatusPedidoBadge } from '@/components/status-pedido-badge';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAlterarLimiteCredito, useClienteAdmin, usePedidosDoCliente } from '@/lib/admin';
import { formatarReais } from '@/lib/formatacao';

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function PedidosDoClienteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: cliente } = useClienteAdmin(id);
  const { data: pedidos, isLoading } = usePedidosDoCliente(id);
  const alterarLimite = useAlterarLimiteCredito();

  const [limite, setLimite] = useState('');

  useEffect(() => {
    setLimite(cliente?.limite_credito != null ? String(cliente.limite_credito) : '');
  }, [cliente?.limite_credito]);

  function salvarLimite() {
    if (!id) return;
    alterarLimite.mutate({ clienteId: id, limiteCredito: limite.trim() ? Number(limite.replace(',', '.')) : null });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo={cliente?.razao_social || cliente?.nome || 'Pedidos do cliente'} />
      <View style={styles.secaoLimite}>
        <TextField
          rotulo="Limite de crédito"
          value={limite}
          onChangeText={setLimite}
          keyboardType="decimal-pad"
          placeholder="Sem limite definido"
        />
        <Button titulo="Salvar limite" onPress={salvarLimite} carregando={alterarLimite.isPending} />
      </View>
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
              <View style={styles.item}>
                <StatusPedidoBadge status={item.status} />
                <ThemedText type="smallBold">Pedido Nº {item.numero}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {formatarReais(item.total)} · {FORMATADOR_DATA.format(new Date(item.criado_em))}
                </ThemedText>
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
  secaoLimite: { paddingHorizontal: Spacing.three, gap: Spacing.two, marginBottom: Spacing.two },
  carregando: { marginTop: Spacing.five },
  lista: { padding: Spacing.three, gap: Spacing.two },
  item: { borderRadius: 10, padding: Spacing.three, gap: Spacing.half, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#E5E6EC' },
});
