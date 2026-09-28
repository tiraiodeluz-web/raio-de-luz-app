import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { SeletorQuantidade } from '@/components/seletor-quantidade';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useAdicionarAoCarrinho } from '@/lib/carrinho';
import { formatarReais, percentualDesconto, precoExibido } from '@/lib/formatacao';
import { useProdutoDetalhe, type SantoDoProduto } from '@/lib/produtos';

export default function DetalheProdutoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { data, isLoading } = useProdutoDetalhe(id);
  const adicionar = useAdicionarAoCarrinho();

  const [santoEscolhido, setSantoEscolhido] = useState<SantoDoProduto | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [adicionado, setAdicionado] = useState(false);

  useEffect(() => {
    if (data) {
      setQuantidade(data.produto.embalagem);
      setSantoEscolhido(data.santos[0] ?? null);
    }
  }, [data]);

  if (isLoading || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CabecalhoVoltar />
        <ActivityIndicator style={styles.carregando} />
      </SafeAreaView>
    );
  }

  const { produto, santos } = data;
  const precisaEscolherSanto = produto.personalizavel && santos.length > 0;
  const foto = (precisaEscolherSanto && santoEscolhido?.fotoUrl) || produto.imagem_principal;
  const preco = precoExibido(produto.preco, produto.preco_promocional);
  const desconto = percentualDesconto(produto.preco, produto.preco_promocional);

  function adicionarAoCarrinho() {
    // Regra 17 (bug corrigido): sem login, manda para o Login como no resto do app.
    if (!session) {
      router.push('/(auth)/login');
      return;
    }
    adicionar.mutate(
      { produtoId: produto.id, quantidade, santoId: santoEscolhido?.id ?? null },
      { onSuccess: () => setAdicionado(true) },
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo={produto.nome} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedView type="backgroundElement" style={styles.fotoContainer}>
          {foto ? <Image source={{ uri: foto }} style={styles.foto} contentFit="cover" /> : null}
          {desconto > 0 ? (
            <View style={styles.selo}>
              <ThemedText type="small" style={styles.seloTexto}>
                {desconto}% OFF
              </ThemedText>
            </View>
          ) : null}
        </ThemedView>

        <View style={styles.corpo}>
          <ThemedText type="title" style={styles.nome}>
            {produto.nome}
          </ThemedText>
          <ThemedText themeColor="textSecondary">Embalagem com {produto.embalagem} unidades</ThemedText>

          <View style={styles.precos}>
            {desconto > 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.precoRiscado}>
                {formatarReais(produto.preco)}
              </ThemedText>
            ) : null}
            <ThemedText type="title" style={styles.precoAtual}>
              {formatarReais(preco)}
            </ThemedText>
          </View>

          {precisaEscolherSanto ? (
            <View style={styles.secaoSantos}>
              <ThemedText type="smallBold">Escolha o santo</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listaSantos}>
                {santos.map((santo) => {
                  const selecionado = santo.id === santoEscolhido?.id;
                  return (
                    <Pressable key={santo.id} style={styles.santoItem} onPress={() => setSantoEscolhido(santo)}>
                      <ThemedView
                        type="backgroundElement"
                        style={[styles.santoFotoContainer, selecionado && styles.santoSelecionado]}>
                        {santo.fotoUrl ? (
                          <Image source={{ uri: santo.fotoUrl }} style={styles.santoFoto} contentFit="cover" />
                        ) : null}
                      </ThemedView>
                      <ThemedText type="small" numberOfLines={1} style={styles.santoNome}>
                        {santo.nome}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.secaoQuantidade}>
            <ThemedText type="smallBold">Quantidade</ThemedText>
            <SeletorQuantidade quantidade={quantidade} embalagem={produto.embalagem} onAlterar={setQuantidade} />
          </View>

          {produto.descricao ? <ThemedText themeColor="textSecondary">{produto.descricao}</ThemedText> : null}
        </View>
      </ScrollView>

      <View style={styles.rodape}>
        <Button
          titulo={adicionado ? 'Adicionado ao carrinho!' : 'Adicionar ao carrinho'}
          onPress={adicionarAoCarrinho}
          carregando={adicionar.isPending}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  carregando: { marginTop: Spacing.five },
  scroll: { paddingBottom: Spacing.six },
  fotoContainer: { aspectRatio: 1 },
  foto: { width: '100%', height: '100%' },
  selo: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    backgroundColor: '#D64545',
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  seloTexto: { color: '#ffffff' },
  corpo: { padding: Spacing.three, gap: Spacing.three },
  nome: { fontSize: 22, lineHeight: 28 },
  precos: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  precoRiscado: { textDecorationLine: 'line-through' },
  precoAtual: { fontSize: 24, lineHeight: 30 },
  secaoSantos: { gap: Spacing.two },
  listaSantos: { gap: Spacing.two },
  santoItem: { alignItems: 'center', width: 72, gap: Spacing.half },
  santoFotoContainer: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  santoSelecionado: { borderColor: '#C9A227' },
  santoFoto: { width: '100%', height: '100%' },
  santoNome: { textAlign: 'center' },
  secaoQuantidade: { gap: Spacing.two },
  rodape: { padding: Spacing.three },
});
