import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EstadoVazio } from '@/components/estado-vazio';
import { SeletorQuantidade } from '@/components/seletor-quantidade';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import {
  calcularSubtotalCarrinho,
  useAlterarQuantidadeCarrinho,
  useItensCarrinho,
  useRemoverDoCarrinho,
  validarCupom,
  type CupomValidado,
  type ItemCarrinho,
} from '@/lib/carrinho';
import { alterarQuantidadeOffline, itensOfflineParaExibicao, removerItemOffline, useFilaCarrinhoOffline } from '@/lib/carrinho-offline';
import { formatarReais } from '@/lib/formatacao';

type LinhaCarrinho = ItemCarrinho & { pendente?: boolean };

export default function CarrinhoScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { data: itens, isLoading } = useItensCarrinho();
  const { data: filaOffline } = useFilaCarrinhoOffline();
  const alterarQuantidade = useAlterarQuantidadeCarrinho();
  const removerItem = useRemoverDoCarrinho();

  const [codigoCupom, setCodigoCupom] = useState('');
  const [cupom, setCupom] = useState<CupomValidado | null>(null);
  const [erroCupom, setErroCupom] = useState<string | null>(null);
  const [verificandoCupom, setVerificandoCupom] = useState(false);

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.titulo}>
          Carrinho
        </ThemedText>
        <EstadoVazio
          icone="log-in-outline"
          titulo="Faça login para ver seu carrinho"
          descricao="Entre com sua conta para adicionar produtos e finalizar a compra."
        />
        <View style={styles.botaoEntrar}>
          <Button titulo="Entrar" onPress={() => router.push('/(auth)/login')} />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={styles.carregando} />
      </SafeAreaView>
    );
  }

  const itensPendentes: LinhaCarrinho[] = itensOfflineParaExibicao(filaOffline ?? []).map((item) => ({
    id: item.id,
    quantidade: item.quantidade,
    produto: {
      id: item.produtoId,
      nome: item.produto.nome,
      sku: item.produto.sku,
      preco: item.produto.preco,
      preco_promocional: item.produto.preco_promocional,
      imagem_principal: item.produto.imagem_principal,
      embalagem: item.produto.embalagem,
      ativo: true,
    },
    santo: item.santoId ? { id: item.santoId, nome: item.santoNome ?? '' } : null,
    fotoUrl: item.fotoUrl,
    pendente: true,
  }));

  const listaItens: LinhaCarrinho[] = [...(itens ?? []), ...itensPendentes];
  const subtotal = calcularSubtotalCarrinho(listaItens);
  const desconto = cupom ? Math.min(cupom.valor, subtotal) : 0;
  const total = subtotal - desconto;

  function alterarQuantidadeLinha(item: LinhaCarrinho, quantidade: number) {
    if (item.pendente) {
      alterarQuantidadeOffline(queryClient, item.id, quantidade);
    } else {
      alterarQuantidade.mutate({ id: item.id, quantidade });
    }
  }

  function removerLinha(item: LinhaCarrinho) {
    if (item.pendente) {
      removerItemOffline(queryClient, item.id);
    } else {
      removerItem.mutate(item.id);
    }
  }

  async function aplicarCupom() {
    setErroCupom(null);
    if (!codigoCupom.trim()) return;
    setVerificandoCupom(true);
    try {
      const resultado = await validarCupom(codigoCupom.trim());
      if (!resultado) {
        setErroCupom('Cupom inválido.');
        setCupom(null);
      } else {
        setCupom(resultado);
      }
    } catch {
      setErroCupom('Não foi possível validar o cupom agora.');
    } finally {
      setVerificandoCupom(false);
    }
  }

  function finalizarCompra() {
    // Item pendente só existe no aparelho — o pedido é criado a partir do
    // carrinho salvo no banco, então sem sincronizar antes ele ficaria de
    // fora do pedido sem o cliente perceber.
    if (itensPendentes.length > 0) {
      Alert.alert(
        'Sem conexão',
        'Alguns itens foram adicionados sem internet e ainda não foram enviados. Conecte-se à internet antes de finalizar a compra.',
      );
      return;
    }
    router.push({ pathname: '/checkout', params: cupom ? { cupom: cupom.codigo } : {} });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.cabecalho}>
        <ThemedText style={styles.titulo}>Carrinho</ThemedText>
      </View>

      <FlatList
        data={listaItens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <EstadoVazio icone="cart-outline" titulo="Seu carrinho está vazio" descricao="Adicione produtos para continuar." />
        }
        renderItem={({ item }) => (
          <ItemLinha
            item={item}
            onAlterarQuantidade={(quantidade) => alterarQuantidadeLinha(item, quantidade)}
            onRemover={() => removerLinha(item)}
          />
        )}
        ListFooterComponent={
          listaItens.length > 0 ? (
            <View style={styles.rodapeLista}>
              <ThemedText type="smallBold" style={styles.cupomTitulo}>
                Cupom de Desconto
              </ThemedText>
              <View style={styles.linhaCupom}>
                <View style={styles.campoCupom}>
                  <TextField
                    value={codigoCupom}
                    onChangeText={setCodigoCupom}
                    autoCapitalize="characters"
                    placeholder="Código"
                    erro={erroCupom ?? undefined}
                  />
                </View>
                <Button titulo="Aplicar" onPress={aplicarCupom} carregando={verificandoCupom} />
              </View>
              {cupom ? (
                <ThemedText type="small" style={styles.cupomAplicado}>
                  Cupom {cupom.codigo} aplicado: −{formatarReais(cupom.valor)}
                </ThemedText>
              ) : null}

              <View style={styles.resumo}>
                <ThemedText type="smallBold" style={styles.resumoTitulo}>
                  Resumo do Pedido
                </ThemedText>
                <LinhaResumo rotulo="Subtotal" valor={formatarReais(subtotal)} />
                {desconto > 0 ? <LinhaResumo rotulo="Desconto" valor={`− ${formatarReais(desconto)}`} /> : null}
                <LinhaResumo rotulo="Total" valor={formatarReais(total)} destaque />
              </View>

              <Button titulo="Finalizar compra" onPress={finalizarCompra} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function ItemLinha({
  item,
  onAlterarQuantidade,
  onRemover,
}: {
  item: LinhaCarrinho;
  onAlterarQuantidade: (quantidade: number) => void;
  onRemover: () => void;
}) {
  const preco = item.produto.preco_promocional && item.produto.preco_promocional > 0 ? item.produto.preco_promocional : item.produto.preco;

  return (
    <View style={styles.item}>
      <Image source={{ uri: item.fotoUrl ?? undefined }} style={styles.itemImagem} contentFit="cover" />
      <View style={styles.itemInfo}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {item.produto.nome}
        </ThemedText>
        {item.santo ? (
          <ThemedText type="small" themeColor="textSecondary">
            Santo: {item.santo.nome}
          </ThemedText>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          Embalagem: {item.produto.embalagem} un.
        </ThemedText>
        {item.pendente ? (
          <View style={styles.pendenteAviso}>
            <Ionicons name="cloud-offline-outline" size={14} color="#B07B13" />
            <ThemedText type="small" style={styles.pendenteTexto}>
              Sem internet — será enviado ao conectar
            </ThemedText>
          </View>
        ) : null}
        <View style={styles.itemLinhaBaixo}>
          <SeletorQuantidade
            quantidade={item.quantidade}
            embalagem={item.produto.embalagem}
            onAlterar={onAlterarQuantidade}
          />
          <ThemedText type="smallBold">{formatarReais(preco * item.quantidade)}</ThemedText>
        </View>
      </View>
      <Pressable onPress={onRemover} hitSlop={8} style={styles.itemRemover}>
        <Ionicons name="trash-outline" size={20} color={BrandColors.fundoEscuro} />
      </Pressable>
    </View>
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
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  titulo: { fontSize: 20 },
  carregando: { marginTop: Spacing.five },
  botaoEntrar: { paddingHorizontal: Spacing.four },
  lista: { padding: Spacing.three, gap: Spacing.two, flexGrow: 1 },
  item: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E6EC',
  },
  itemImagem: { width: 72, height: 72, borderRadius: 8 },
  itemInfo: { flex: 1, gap: Spacing.half },
  pendenteAviso: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pendenteTexto: { color: '#B07B13' },
  itemLinhaBaixo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.one },
  itemRemover: { padding: Spacing.half },
  rodapeLista: { gap: Spacing.two, marginTop: Spacing.two },
  cupomTitulo: { color: BrandColors.fundoEscuro },
  linhaCupom: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-end' },
  campoCupom: { flex: 1 },
  cupomAplicado: { color: '#1E8E3E' },
  resumo: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E6EC',
  },
  resumoTitulo: { color: BrandColors.fundoEscuro, marginBottom: Spacing.one },
  linhaResumo: { flexDirection: 'row', justifyContent: 'space-between' },
});
