import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { EstadoVazio } from '@/components/estado-vazio';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useAdicionarCarrinhoCompartilhado, useCarrinhoCompartilhado, type ItemCarrinhoCompartilhado } from '@/lib/compartilhar';
import { formatarReais, precoExibido } from '@/lib/formatacao';

// Tela aberta pelo link de "compartilhar carrinho" (ver lib/compartilhar.ts).
// Mostra os produtos que a outra pessoa separou e, com um toque, adiciona
// tudo ao carrinho de quem abriu o link — sem precisar navegar produto por
// produto atrás da mesma lista.
export default function CarrinhoCompartilhadoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { data: itens, isLoading } = useCarrinhoCompartilhado(id);
  const adicionar = useAdicionarCarrinhoCompartilhado();

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CabecalhoVoltar titulo="Carrinho compartilhado" />
        <EstadoVazio
          icone="log-in-outline"
          titulo="Faça login para continuar"
          descricao="Entre com sua conta pra ver e adicionar esses produtos ao seu carrinho."
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
        <CabecalhoVoltar titulo="Carrinho compartilhado" />
        <ActivityIndicator style={styles.carregando} />
      </SafeAreaView>
    );
  }

  const lista = itens ?? [];

  async function adicionarTudo() {
    const resultado = await adicionar.mutateAsync(lista);
    if (resultado.indisponiveis > 0) {
      Alert.alert(
        'Adicionado parcialmente',
        `${resultado.adicionados} produto(s) adicionados. ${resultado.indisponiveis} não puderam ser adicionados.`,
      );
    }
    router.replace('/(tabs)/carrinho');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Carrinho compartilhado" />
      <FlatList
        data={lista}
        keyExtractor={(item, indice) => `${item.produto_id}-${item.santo_id ?? ''}-${indice}`}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <EstadoVazio icone="cart-outline" titulo="Link expirado ou inválido" descricao="Os produtos desse link não estão mais disponíveis." />
        }
        renderItem={({ item }) => <ItemLinha item={item} />}
        ListFooterComponent={
          lista.length > 0 ? (
            <Button titulo="Adicionar tudo ao carrinho" icone="cart" onPress={adicionarTudo} carregando={adicionar.isPending} />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function ItemLinha({ item }: { item: ItemCarrinhoCompartilhado }) {
  const preco = precoExibido(item.preco, item.preco_promocional);
  return (
    <View style={styles.item}>
      <Image source={{ uri: item.imagem_principal ?? undefined }} style={styles.itemImagem} contentFit="cover" />
      <View style={styles.itemInfo}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {item.nome}
        </ThemedText>
        {item.santo_nome ? (
          <ThemedText type="small" themeColor="textSecondary">
            Santo: {item.santo_nome}
          </ThemedText>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          Quantidade: {item.quantidade}
        </ThemedText>
        <ThemedText type="smallBold">{formatarReais(preco * item.quantidade)}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
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
});
