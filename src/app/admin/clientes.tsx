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
import { BrandColors, Radii, Spacing } from '@/constants/theme';
import { clienteOnline, useAprovarCliente, useClientesAdmin, useTotaisClientes, type ClienteAdmin } from '@/lib/admin';
import { formatarReais } from '@/lib/formatacao';
import { apenasDigitos, mascararTelefone } from '@/lib/mascaras';
import { supabase } from '@/lib/supabase';

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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

      <View style={styles.campoBusca}>
        <TextField value={busca} onChangeText={setBusca} placeholder="Buscar cliente..." icone="search" />
      </View>

      <View style={styles.totais}>
        <View style={styles.totalCard}>
          <Ionicons name="people" size={22} color={BrandColors.fundoEscuro} />
          <ThemedText themeColor="textSecondary">Total</ThemedText>
          <ThemedText type="title" style={styles.totalValor}>
            {totais.data?.total ?? 0}
          </ThemedText>
          <ThemedText themeColor="textSecondary">Clientes</ThemedText>
        </View>
        <View style={styles.totalCard}>
          <Ionicons name="radio-button-on" size={22} color="#1E8E3E" />
          <ThemedText themeColor="textSecondary">Total</ThemedText>
          <ThemedText type="title" style={styles.totalValor}>
            {totais.data?.online ?? 0}
          </ThemedText>
          <ThemedText themeColor="textSecondary">On-line</ThemedText>
        </View>
      </View>

      <View style={styles.segmentado}>
        <SegmentoBotao titulo="Aprovados" ativo={aba === 'aprovados'} onPress={() => setAba('aprovados')} />
        <SegmentoBotao titulo="Aprovar" ativo={aba === 'aprovar'} onPress={() => setAba('aprovar')} />
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
      <View style={styles.card}>
        <View style={styles.cardCabecalho}>
          <Ionicons name="person" size={18} color={online ? '#1E8E3E' : '#D64545'} />
          <ThemedText type="smallBold" style={styles.cardNome}>
            {cliente.razao_social || cliente.nome}
          </ThemedText>
        </View>
        <View style={styles.cardLinha}>
          {cliente.telefone ? <ThemedText themeColor="textSecondary">{mascararTelefone(cliente.telefone)}</ThemedText> : null}
          {cliente.telefone ? (
            <Pressable onPress={() => Linking.openURL(`https://wa.me/55${apenasDigitos(cliente.telefone!)}`)} hitSlop={8}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </Pressable>
          ) : null}
        </View>
        <ThemedText type="smallBold">Total gasto: {formatarReais(gasto)}</ThemedText>
        {online ? (
          <ThemedText type="smallBold" style={styles.onlineTexto}>
            Online
          </ThemedText>
        ) : (
          <ThemedText themeColor="textSecondary">
            Último Acesso: {cliente.ultimo_acesso ? FORMATADOR_DATA.format(new Date(cliente.ultimo_acesso)) : '—'}
          </ThemedText>
        )}
        {aba === 'aprovar' ? <Button titulo="Aprovar" onPress={onAprovar} carregando={aprovando} /> : null}
      </View>
    </Pressable>
  );
}

function SegmentoBotao({ titulo, ativo, onPress }: { titulo: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.segmento, ativo && styles.segmentoAtivo]} onPress={onPress}>
      <ThemedText type="smallBold" style={ativo ? styles.segmentoTextoAtivo : styles.segmentoTextoInativo}>
        {titulo.toUpperCase()}
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
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  campoBusca: { paddingHorizontal: Spacing.three },
  totais: { flexDirection: 'row', gap: Spacing.three, paddingHorizontal: Spacing.three, marginTop: Spacing.two },
  totalCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E6EC',
    paddingVertical: Spacing.three,
  },
  totalValor: { fontSize: 22, lineHeight: 28 },
  segmentado: { flexDirection: 'row', backgroundColor: '#E4E5EA', borderRadius: Radii.pilula, padding: 4, gap: 4, marginHorizontal: Spacing.three, marginTop: Spacing.three },
  segmento: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.pilula },
  segmentoAtivo: { backgroundColor: BrandColors.aprovadosAtivo },
  segmentoTextoAtivo: { color: '#ffffff' },
  segmentoTextoInativo: { color: BrandColors.fundoEscuro },
  carregando: { marginTop: Spacing.five },
  lista: { padding: Spacing.three, gap: Spacing.two },
  card: { borderRadius: 10, padding: Spacing.three, gap: Spacing.half, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#E5E6EC' },
  cardCabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  cardNome: { flex: 1 },
  cardLinha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  onlineTexto: { color: '#1E8E3E' },
});
