import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { StatusPedidoBadge } from '@/components/status-pedido-badge';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { formatarReais } from '@/lib/formatacao';
import { usePedidoDetalhe, useRepetirPedido } from '@/lib/pedidos';

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

type Endereco = {
  cep: string;
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
};

export default function DetalhePedidoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = usePedidoDetalhe(id);
  const repetir = useRepetirPedido();

  async function pedirDeNovo() {
    if (!id) return;
    try {
      const { adicionados, indisponiveis } = await repetir.mutateAsync(id);
      if (adicionados === 0) {
        Alert.alert('Nada pra adicionar', 'Nenhum item deste pedido está disponível no catálogo agora.');
        return;
      }
      const aviso = indisponiveis > 0 ? `\n\n${indisponiveis} item(ns) não puderam ser adicionados (produto saiu de linha ou santo indisponível).` : '';
      Alert.alert('Adicionado ao carrinho', `${adicionados} item(ns) foram pro seu carrinho.${aviso}`, [
        { text: 'Continuar vendo', style: 'cancel' },
        { text: 'Ir para o carrinho', onPress: () => router.push('/(tabs)/carrinho') },
      ]);
    } catch (e) {
      Alert.alert('Não foi possível', e instanceof Error ? e.message : 'Tente novamente.');
    }
  }

  if (isLoading || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CabecalhoVoltar titulo="Pedido" />
        <ActivityIndicator style={styles.carregando} />
      </SafeAreaView>
    );
  }

  const { pedido, itens } = data;
  const endereco = pedido.endereco_entrega as Endereco | null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo={`Pedido Nº ${pedido.numero}`} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cabecalho}>
          <StatusPedidoBadge status={pedido.status} semFundo />
          <ThemedText themeColor="textSecondary">{FORMATADOR_DATA.format(new Date(pedido.criado_em))}</ThemedText>
        </View>

        {pedido.codigo_rastreio ? (
          <ThemedText themeColor="textSecondary">Rastreio: {pedido.codigo_rastreio}</ThemedText>
        ) : null}

        {endereco ? (
          <View style={styles.secao}>
            <ThemedText type="smallBold">Endereço de entrega</ThemedText>
            <ThemedText themeColor="textSecondary">
              {endereco.rua}, {endereco.numero}
              {endereco.complemento ? ` — ${endereco.complemento}` : ''}
              {'\n'}
              {endereco.bairro}, {endereco.cidade} - {endereco.estado}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.secao}>
          <ThemedText type="smallBold">Itens</ThemedText>
          {itens.map((item) => (
            <View key={item.id} style={styles.item}>
              <Image source={{ uri: item.imagem_url ?? undefined }} style={styles.itemImagem} contentFit="cover" />
              <View style={styles.itemInfo}>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {item.produto_nome}
                </ThemedText>
                {item.santo_nome ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Santo: {item.santo_nome}
                  </ThemedText>
                ) : null}
                {item.personalizacao ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Personalização: {item.personalizacao}
                  </ThemedText>
                ) : null}
                <ThemedText type="small" themeColor="textSecondary">
                  {item.quantidade} × {formatarReais(item.preco_unitario)}
                </ThemedText>
              </View>
              <ThemedText type="smallBold">{formatarReais(item.subtotal)}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.resumo}>
          <ThemedText type="smallBold" style={styles.resumoTitulo}>
            Resumo do Pedido
          </ThemedText>
          <LinhaResumo rotulo="Subtotal" valor={formatarReais(pedido.subtotal)} />
          {pedido.desconto > 0 ? (
            <LinhaResumo rotulo={`Desconto${pedido.cupom_codigo ? ` (${pedido.cupom_codigo})` : ''}`} valor={`− ${formatarReais(pedido.desconto)}`} />
          ) : null}
          <LinhaResumo rotulo="Total" valor={formatarReais(pedido.total)} destaque />
        </View>

        {pedido.observacoes ? (
          <View style={styles.secao}>
            <ThemedText type="smallBold">Observações</ThemedText>
            <ThemedText themeColor="textSecondary">{pedido.observacoes}</ThemedText>
          </View>
        ) : null}

        <Button titulo="Pedir de novo" icone="repeat" onPress={pedirDeNovo} carregando={repetir.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LinhaResumo({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <View style={styles.linhaResumo}>
      <ThemedText type={destaque ? 'smallBold' : 'small'} themeColor={destaque ? undefined : 'textSecondary'}>
        {rotulo}
      </ThemedText>
      <ThemedText type={destaque ? 'smallBold' : 'small'}>{valor}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  carregando: { marginTop: Spacing.five },
  scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  cabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secao: { gap: Spacing.one },
  item: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E6EC',
  },
  itemImagem: { width: 56, height: 56, borderRadius: 8 },
  itemInfo: { flex: 1, gap: Spacing.half },
  resumo: { borderRadius: 10, padding: Spacing.three, gap: Spacing.one, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#E5E6EC' },
  resumoTitulo: { marginBottom: Spacing.one, color: BrandColors.fundoEscuro },
  linhaResumo: { flexDirection: 'row', justifyContent: 'space-between' },
});
