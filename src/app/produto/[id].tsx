import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { ProdutoCard } from '@/components/produto-card';
import { SecaoCabecalho } from '@/components/secao-cabecalho';
import { SeletorQuantidade } from '@/components/seletor-quantidade';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useAdicionarAoCarrinho } from '@/lib/carrinho';
import { compartilharProduto } from '@/lib/compartilhar';
import { useAlternarFavorito, useFavoritosIds } from '@/lib/favoritos';
import { formatarReais, percentualDesconto, precoExibido } from '@/lib/formatacao';
import { useProdutoDetalhe, useProdutosRecomendados, type SantoDoProduto } from '@/lib/produtos';
import { useToast } from '@/lib/toast-context';

export default function DetalheProdutoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { data, isLoading } = useProdutoDetalhe(id);
  const adicionar = useAdicionarAoCarrinho();
  const { mostrarToast } = useToast();
  const { data: favoritosIds } = useFavoritosIds();
  const alternarFavorito = useAlternarFavorito();

  const recomendados = useProdutosRecomendados(id);

  const [santoEscolhido, setSantoEscolhido] = useState<SantoDoProduto | null>(null);
  const [quantidade, setQuantidade] = useState(1);

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
      {
        produtoId: produto.id,
        quantidade,
        santoId: santoEscolhido?.id ?? null,
        santoNome: santoEscolhido?.nome ?? null,
        fotoUrl: foto,
        produtoSnapshot: {
          nome: produto.nome,
          sku: produto.sku,
          preco: produto.preco,
          preco_promocional: produto.preco_promocional,
          imagem_principal: produto.imagem_principal,
          embalagem: produto.embalagem,
        },
      },
      {
        onSuccess: (resultado) =>
          mostrarToast(
            resultado.offline ? 'Sem internet: vai ser enviado ao carrinho quando a conexão voltar.' : 'Adicionado ao carrinho!',
          ),
        onError: (erro) => mostrarToast(erro instanceof Error ? erro.message : 'Não foi possível adicionar ao carrinho.'),
      },
    );
  }

  const favoritado = favoritosIds?.has(produto.id) ?? false;
  function tocarFavorito() {
    if (!session) {
      router.push('/(auth)/login');
      return;
    }
    alternarFavorito.mutate({ produtoId: produto.id, favoritado });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar
        titulo="Detalhes do Produto"
        acao={
          <Pressable onPress={() => compartilharProduto(produto.id, produto.nome)} hitSlop={8} style={styles.compartilhar}>
            <Ionicons name="share-social-outline" size={22} color={BrandColors.fundoEscuro} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.fotoContainer}>
          {foto ? <Image source={{ uri: foto }} style={styles.foto} contentFit="contain" /> : null}
        </View>

        {precisaEscolherSanto ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listaSantos}>
            {santos.map((santo) => {
              const selecionado = santo.id === santoEscolhido?.id;
              return (
                <Pressable
                  key={santo.id}
                  style={[styles.santoMiniatura, selecionado && styles.santoSelecionado]}
                  onPress={() => setSantoEscolhido(santo)}>
                  {santo.fotoUrl ? <Image source={{ uri: santo.fotoUrl }} style={styles.santoFoto} contentFit="cover" /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={styles.corpo}>
          <View style={styles.linhaNome}>
            <ThemedText type="title" style={styles.nomeFlex}>
              {produto.nome}
            </ThemedText>
            <Pressable onPress={tocarFavorito} hitSlop={8}>
              <Ionicons name={favoritado ? 'heart' : 'heart-outline'} size={26} color={favoritado ? '#D64545' : BrandColors.fundoEscuro} />
            </Pressable>
          </View>
          <ThemedText themeColor="textSecondary">Embalagem: {produto.embalagem}</ThemedText>

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

          {desconto > 0 ? (
            <View style={styles.selo}>
              <ThemedText type="small" style={styles.seloTexto}>
                {desconto}% OFF
              </ThemedText>
            </View>
          ) : null}

          {precisaEscolherSanto ? (
            <ThemedText themeColor="textSecondary">Santo: {santoEscolhido?.nome ?? '—'}</ThemedText>
          ) : null}

          <View style={styles.secaoQuantidade}>
            <ThemedText type="smallBold">Quantidade</ThemedText>
            <SeletorQuantidade quantidade={quantidade} embalagem={produto.embalagem} onAlterar={setQuantidade} />
          </View>

          {produto.descricao ? <ThemedText themeColor="textSecondary">{produto.descricao}</ThemedText> : null}
        </View>

        {recomendados.data && recomendados.data.length > 0 ? (
          <View style={styles.secaoRecomendados}>
            <SecaoCabecalho titulo="Recomendados" />
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={recomendados.data}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listaRecomendados}
              renderItem={({ item }) => (
                <View style={styles.cardRecomendado}>
                  <ProdutoCard produto={item} />
                </View>
              )}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.rodape}>
        <Button
          titulo="Adicionar ao carrinho"
          icone="cart"
          onPress={adicionarAoCarrinho}
          carregando={adicionar.isPending}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  carregando: { marginTop: Spacing.five },
  compartilhar: { marginLeft: 'auto', padding: Spacing.half },
  scroll: { paddingBottom: Spacing.six },
  fotoContainer: { aspectRatio: 1, backgroundColor: '#ffffff' },
  foto: { width: '100%', height: '100%' },
  selo: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E8E3E',
    borderRadius: 6,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  seloTexto: { color: '#ffffff', fontWeight: '700' },
  corpo: { padding: Spacing.three, gap: Spacing.two },
  linhaNome: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  nomeFlex: { flex: 1, fontSize: 22, lineHeight: 28, color: BrandColors.fundoEscuro },
  precos: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  precoRiscado: { textDecorationLine: 'line-through' },
  precoAtual: { fontSize: 24, lineHeight: 30, color: BrandColors.fundoEscuro },
  listaSantos: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  santoMiniatura: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: '#E5E6EC' },
  santoSelecionado: { borderColor: BrandColors.fundoEscuro },
  santoFoto: { width: '100%', height: '100%' },
  secaoQuantidade: { gap: Spacing.two },
  secaoRecomendados: { gap: Spacing.two, marginTop: Spacing.four },
  listaRecomendados: { paddingHorizontal: Spacing.three, gap: Spacing.three },
  cardRecomendado: { width: 162 },
  rodape: { padding: Spacing.three },
});
