import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminCabecalho } from '@/components/admin-cabecalho';
import { EstadoVazio } from '@/components/estado-vazio';
import { StatusPedidoBadge } from '@/components/status-pedido-badge';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { usePedidosAdmin, type StatusFiltro } from '@/lib/admin';
import { formatarReais } from '@/lib/formatacao';

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const FILTROS: { rotulo: string; valor: StatusFiltro }[] = [
  { rotulo: 'Todos', valor: 'todos' },
  { rotulo: 'Pendentes', valor: 'aguardando_pagamento' },
  { rotulo: 'Pagos', valor: 'pago' },
  { rotulo: 'Em separação', valor: 'em_separacao' },
  { rotulo: 'Em produção', valor: 'em_producao' },
  { rotulo: 'Enviados', valor: 'enviado' },
  { rotulo: 'Entregues', valor: 'entregue' },
  { rotulo: 'Cancelados', valor: 'cancelado' },
];

export default function PedidosAdminScreen() {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusFiltro>('todos');
  const { data: pedidos, isLoading } = usePedidosAdmin({ busca, status });

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminCabecalho titulo="Pedidos" />

      <View style={styles.campoBusca}>
        <TextField rotulo="Buscar por número" value={busca} onChangeText={setBusca} keyboardType="number-pad" placeholder="Nº do pedido" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
        {FILTROS.map((filtro) => {
          const ativo = filtro.valor === status;
          return (
            <Pressable key={filtro.valor} style={[styles.filtro, ativo && styles.filtroAtivo]} onPress={() => setStatus(filtro.valor)}>
              <ThemedText type="small" style={ativo ? styles.filtroTextoAtivo : undefined}>
                {filtro.rotulo}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <FlatList
          data={pedidos ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={<EstadoVazio icone="receipt-outline" titulo="Nenhum pedido encontrado" />}
          renderItem={({ item }) => {
            const cliente = item.cliente_snapshot as { nome?: string; razao_social?: string } | null;
            return (
              <Pressable onPress={() => router.push(`/admin/pedido/${item.id}`)}>
                <ThemedView type="backgroundElement" style={styles.item}>
                  <StatusPedidoBadge status={item.status} />
                  <ThemedText type="smallBold">Pedido Nº {item.numero}</ThemedText>
                  <ThemedText themeColor="textSecondary">{cliente?.razao_social || cliente?.nome}</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {formatarReais(item.total)} · {FORMATADOR_DATA.format(new Date(item.criado_em))}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  campoBusca: { paddingHorizontal: Spacing.three },
  filtros: { paddingHorizontal: Spacing.three, gap: Spacing.one, paddingVertical: Spacing.two },
  filtro: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: 16, borderWidth: 1, borderColor: BrandColors.fundoEscuro },
  filtroAtivo: { backgroundColor: BrandColors.fundoEscuro },
  filtroTextoAtivo: { color: '#ffffff' },
  carregando: { marginTop: Spacing.five },
  lista: { padding: Spacing.three, gap: Spacing.two },
  item: { borderRadius: 10, padding: Spacing.three, gap: Spacing.half },
});
