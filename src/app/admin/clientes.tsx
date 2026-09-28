import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminCabecalho } from '@/components/admin-cabecalho';
import { Button } from '@/components/button';
import { EstadoVazio } from '@/components/estado-vazio';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { clienteOnline, useAprovarCliente, useClientesAdmin, useTotaisClientes, type ClienteAdmin } from '@/lib/admin';
import { formatarReais } from '@/lib/formatacao';
import { apenasDigitos, mascararTelefone } from '@/lib/mascaras';
import { supabase } from '@/lib/supabase';

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function ClientesAdminScreen() {
  // Deep link do push "novo cadastro" abre direto na aba Aprovar (?aba=aprovar).
  const { aba: abaParam } = useLocalSearchParams<{ aba?: string }>();
  const [aba, setAba] = useState<'aprovados' | 'aprovar'>(abaParam === 'aprovar' ? 'aprovar' : 'aprovados');
  const [busca, setBusca] = useState('');
  const totais = useTotaisClientes();
  const clientes = useClientesAdmin(aba, busca);
  const gastos = useGastosPorCliente((clientes.data ?? []).map((c) => c.id));
  const aprovar = useAprovarCliente();

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminCabecalho titulo="Clientes" />

      <View style={styles.totais}>
        <ThemedText themeColor="textSecondary">{totais.data?.total ?? 0} clientes</ThemedText>
        <ThemedText themeColor="textSecondary">{totais.data?.online ?? 0} online agora</ThemedText>
      </View>

      <View style={styles.segmentado}>
        <SegmentoBotao titulo="Aprovados" ativo={aba === 'aprovados'} onPress={() => setAba('aprovados')} />
        <SegmentoBotao titulo="Aprovar" ativo={aba === 'aprovar'} onPress={() => setAba('aprovar')} />
      </View>

      <View style={styles.campoBusca}>
        <TextField rotulo="Buscar por código" value={busca} onChangeText={setBusca} placeholder="Código do cliente" />
      </View>

      {clientes.isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <FlatList
          data={clientes.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <EstadoVazio icone="people-outline" titulo={aba === 'aprovados' ? 'Nenhum cliente aprovado ainda' : 'Nenhum cadastro para aprovar'} />
          }
          renderItem={({ item }) => (
            <CardCliente
              cliente={item}
              gasto={gastos[item.id] ?? 0}
              aba={aba}
              onAprovar={() => aprovar.mutate(item.id)}
              aprovando={aprovar.isPending}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function CardCliente({
  cliente,
  gasto,
  aba,
  onAprovar,
  aprovando,
}: {
  cliente: ClienteAdmin;
  gasto: number;
  aba: 'aprovados' | 'aprovar';
  onAprovar: () => void;
  aprovando: boolean;
}) {
  const online = clienteOnline(cliente.ultimo_acesso);

  return (
    <Pressable onPress={() => router.push(`/admin/cliente/${cliente.id}`)}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardCabecalho}>
          <ThemedText type="smallBold" style={styles.cardNome}>
            {cliente.razao_social || cliente.nome}
          </ThemedText>
          {online ? <View style={styles.pontoOnline} /> : null}
          {cliente.telefone ? (
            <Pressable onPress={() => Linking.openURL(`https://wa.me/55${apenasDigitos(cliente.telefone!)}`)} hitSlop={8}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </Pressable>
          ) : null}
        </View>
        {cliente.codigo ? <ThemedText type="small" themeColor="textSecondary">Código: {cliente.codigo}</ThemedText> : null}
        {cliente.telefone ? <ThemedText type="small" themeColor="textSecondary">{mascararTelefone(cliente.telefone)}</ThemedText> : null}
        <ThemedText type="small" themeColor="textSecondary">
          Total gasto: {formatarReais(gasto)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Último acesso: {cliente.ultimo_acesso ? FORMATADOR_DATA.format(new Date(cliente.ultimo_acesso)) : '—'}
        </ThemedText>
        {aba === 'aprovar' ? <Button titulo="Aprovar" onPress={onAprovar} carregando={aprovando} /> : null}
      </ThemedView>
    </Pressable>
  );
}

function SegmentoBotao({ titulo, ativo, onPress }: { titulo: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.segmento, ativo && styles.segmentoAtivo]} onPress={onPress}>
      <ThemedText type="smallBold" style={ativo ? styles.segmentoTextoAtivo : undefined}>
        {titulo}
      </ThemedText>
    </Pressable>
  );
}

// Uma consulta só para todos os clientes visíveis, em vez de uma por card.
function useGastosPorCliente(ids: string[]) {
  const { data } = useQuery({
    queryKey: ['admin', 'clientes', 'gastos', ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('pedidos').select('cliente_id,total').in('cliente_id', ids).neq('status', 'cancelado');
      if (error) throw error;
      return (data ?? []).reduce<Record<string, number>>((acc, linha) => {
        if (!linha.cliente_id) return acc;
        acc[linha.cliente_id] = (acc[linha.cliente_id] ?? 0) + linha.total;
        return acc;
      }, {});
    },
  });
  return data ?? {};
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  totais: { flexDirection: 'row', gap: Spacing.three, paddingHorizontal: Spacing.three, marginBottom: Spacing.one },
  segmentado: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three, marginTop: Spacing.two },
  segmento: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: BrandColors.fundoEscuro },
  segmentoAtivo: { backgroundColor: BrandColors.fundoEscuro },
  segmentoTextoAtivo: { color: '#ffffff' },
  campoBusca: { paddingHorizontal: Spacing.three, marginTop: Spacing.two },
  carregando: { marginTop: Spacing.five },
  lista: { padding: Spacing.three, gap: Spacing.two },
  card: { borderRadius: 10, padding: Spacing.three, gap: Spacing.half },
  cardCabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  cardNome: { flex: 1 },
  pontoOnline: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E8E3E' },
});
