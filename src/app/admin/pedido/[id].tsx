import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { StatusPedidoBadge } from '@/components/status-pedido-badge';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { proximoStatus, useAlterarStatusPedido, usePedidoAdminDetalhe } from '@/lib/admin';
import { formatarReais } from '@/lib/formatacao';
import { apenasDigitos } from '@/lib/mascaras';
import { ROTULO_STATUS } from '@/lib/pedidos';

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

type Endereco = { rua: string; numero: string; complemento: string | null; bairro: string; cidade: string; estado: string };
type ClienteSnapshot = { nome?: string; razao_social?: string; telefone?: string; cnpj?: string };

export default function DetalhePedidoAdminScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = usePedidoAdminDetalhe(id);
  const alterarStatus = useAlterarStatusPedido();

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
  const cliente = pedido.cliente_snapshot as ClienteSnapshot | null;
  const proximo = proximoStatus(pedido.status);

  function confirmarCancelamento() {
    Alert.alert('Cancelar pedido', `Cancelar o pedido Nº ${pedido.numero}?`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Cancelar pedido', style: 'destructive', onPress: () => alterarStatus.mutate({ id: pedido.id, status: 'cancelado' }) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo={`Pedido Nº ${pedido.numero}`} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cabecalho}>
          <StatusPedidoBadge status={pedido.status} />
          <ThemedText themeColor="textSecondary">{FORMATADOR_DATA.format(new Date(pedido.criado_em))}</ThemedText>
        </View>

        <View style={styles.secao}>
          <ThemedText type="smallBold">Cliente</ThemedText>
          <View style={styles.clienteLinha}>
            <ThemedText themeColor="textSecondary" style={styles.clienteTexto}>
              {cliente?.razao_social || cliente?.nome}
            </ThemedText>
            {cliente?.telefone ? (
              <Pressable onPress={() => Linking.openURL(`https://wa.me/55${apenasDigitos(cliente.telefone!)}`)} hitSlop={8}>
                <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              </Pressable>
            ) : null}
          </View>
        </View>

        {endereco ? (
          <View style={styles.secao}>
            <ThemedText type="smallBold">Endereço</ThemedText>
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
                  <ThemedText type="smallBold" style={styles.personalizacao}>
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
          {pedido.desconto > 0 ? <LinhaResumo rotulo="Desconto" valor={`− ${formatarReais(pedido.desconto)}`} /> : null}
          <LinhaResumo rotulo="Total" valor={formatarReais(pedido.total)} destaque />
        </View>
      </ScrollView>

      {pedido.status !== 'cancelado' ? (
        <View style={styles.rodape}>
          {proximo ? (
            <Button
              titulo={`Marcar como ${ROTULO_STATUS[proximo]}`}
              icone="checkmark-done"
              onPress={() => alterarStatus.mutate({ id: pedido.id, status: proximo })}
              carregando={alterarStatus.isPending}
            />
          ) : null}
          <Button titulo="Cancelar pedido" variante="texto" icone="close-circle" corIcone="#D64545" onPress={confirmarCancelamento} />
        </View>
      ) : null}
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
  scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.three },
  cabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secao: { gap: Spacing.one },
  clienteLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clienteTexto: { flex: 1 },
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
  personalizacao: { color: '#B07B13' },
  resumo: { borderRadius: 10, padding: Spacing.three, gap: Spacing.one, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#E5E6EC' },
  resumoTitulo: { marginBottom: Spacing.one, color: BrandColors.fundoEscuro },
  linhaResumo: { flexDirection: 'row', justifyContent: 'space-between' },
  rodape: { padding: Spacing.three, gap: Spacing.one },
});
