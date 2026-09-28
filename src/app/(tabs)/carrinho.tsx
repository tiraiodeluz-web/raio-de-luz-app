import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EstadoVazio } from '@/components/estado-vazio';
import { SeletorQuantidade } from '@/components/seletor-quantidade';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
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
import { formatarReais } from '@/lib/formatacao';

export default function CarrinhoScreen() {
  const { session } = useAuth();
  const { data: itens, isLoading } = useItensCarrinho();
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

  const listaItens = itens ?? [];
  const subtotal = calcularSubtotalCarrinho(listaItens);
  const desconto = cupom ? Math.min(cupom.valor, subtotal) : 0;
  const total = subtotal - desconto;

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
    router.push({ pathname: '/checkout', params: cupom ? { cupom: cupom.codigo } : {} });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedText type="title" style={styles.titulo}>
        Carrinho
      </ThemedText>

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
            onAlterarQuantidade={(quantidade) => alterarQuantidade.mutate({ id: item.id, quantidade })}
            onRemover={() => removerItem.mutate(item.id)}
          />
        )}
        ListFooterComponent={
          listaItens.length > 0 ? (
            <View style={styles.rodapeLista}>
              <View style={styles.linhaCupom}>
                <View style={styles.campoCupom}>
                  <TextField
                    rotulo="Cupom de desconto"
                    value={codigoCupom}
                    onChangeText={setCodigoCupom}
                    autoCapitalize="characters"
                    placeholder="Código"
                    erro={erroCupom ?? undefined}
                  />
                </View>
                <Button titulo="Aplicar" variante="secundario" onPress={aplicarCupom} carregando={verificandoCupom} />
              </View>
              {cupom ? (
                <ThemedText type="small" style={styles.cupomAplicado}>
                  Cupom {cupom.codigo} aplicado: −{formatarReais(cupom.valor)}
                </ThemedText>
              ) : null}

              <ThemedView type="backgroundElement" style={styles.resumo}>
                <LinhaResumo rotulo="Subtotal" valor={formatarReais(subtotal)} />
                {desconto > 0 ? <LinhaResumo rotulo="Desconto" valor={`− ${formatarReais(desconto)}`} /> : null}
                <LinhaResumo rotulo="Total" valor={formatarReais(total)} destaque />
              </ThemedView>

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
  item: ItemCarrinho;
  onAlterarQuantidade: (quantidade: number) => void;
  onRemover: () => void;
}) {
  const preco = item.produto.preco_promocional && item.produto.preco_promocional > 0 ? item.produto.preco_promocional : item.produto.preco;

  return (
    <ThemedView type="backgroundElement" style={styles.item}>
      <Image source={{ uri: item.produto.imagem_principal ?? undefined }} style={styles.itemImagem} contentFit="cover" />
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
        <Ionicons name="trash-outline" size={20} />
      </Pressable>
    </ThemedView>
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
  safeArea: { flex: 1 },
  titulo: { fontSize: 22, lineHeight: 28, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  carregando: { marginTop: Spacing.five },
  botaoEntrar: { paddingHorizontal: Spacing.four },
  lista: { padding: Spacing.three, gap: Spacing.two, flexGrow: 1 },
  item: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.two, borderRadius: 10 },
  itemImagem: { width: 72, height: 72, borderRadius: 8 },
  itemInfo: { flex: 1, gap: Spacing.half },
  itemLinhaBaixo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.one },
  itemRemover: { padding: Spacing.half },
  rodapeLista: { gap: Spacing.two, marginTop: Spacing.two },
  linhaCupom: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-end' },
  campoCupom: { flex: 1 },
  cupomAplicado: { color: '#1E8E3E' },
  resumo: { borderRadius: 10, padding: Spacing.three, gap: Spacing.one },
  linhaResumo: { flexDirection: 'row', justifyContent: 'space-between' },
});
