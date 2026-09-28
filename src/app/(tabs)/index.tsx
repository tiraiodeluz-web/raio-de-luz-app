import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BannerCarrossel } from '@/components/banner-carrossel';
import { CategoriaPill } from '@/components/categoria-pill';
import { ComprarRapido } from '@/components/comprar-rapido';
import { EstadoVazio } from '@/components/estado-vazio';
import { ProdutoCard } from '@/components/produto-card';
import { SecaoCabecalho } from '@/components/secao-cabecalho';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WhatsAppFlutuante } from '@/components/whatsapp-flutuante';
import { Spacing } from '@/constants/theme';
import {
  useBanners,
  useCategorias,
  useProdutosDestaque,
  useProdutosMaisVendidosResumo,
  type ProdutoResumo,
} from '@/lib/produtos';

export default function InicioScreen() {
  const banners = useBanners();
  const categorias = useCategorias(10);
  const destaque = useProdutosDestaque(10);
  const maisVendidos = useProdutosMaisVendidosResumo(10);
  const [produtoParaComprar, setProdutoParaComprar] = useState<ProdutoResumo | null>(null);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Cabecalho />

        {banners.data && banners.data.length > 0 ? <BannerCarrossel banners={banners.data} /> : null}

        <View style={styles.secao}>
          <SecaoCabecalho titulo="Categorias" verMaisHref="/categorias" />
          {categorias.isLoading ? (
            <ActivityIndicator style={styles.carregandoHorizontal} />
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categorias.data ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listaHorizontal}
              renderItem={({ item }) => <CategoriaPill id={item.id} nome={item.nome} fotoUrl={item.foto_url} />}
              ListEmptyComponent={<EstadoVazio titulo="Nenhuma categoria ainda" />}
            />
          )}
        </View>

        <View style={styles.secao}>
          <SecaoCabecalho titulo="Em oferta" verMaisHref="/ofertas" />
          {destaque.isLoading ? (
            <ActivityIndicator style={styles.carregandoHorizontal} />
          ) : destaque.data && destaque.data.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={destaque.data}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listaHorizontal}
              renderItem={({ item }) => (
                <View style={styles.cardHorizontal}>
                  <ProdutoCard produto={item} mostrarComprar onComprar={setProdutoParaComprar} />
                </View>
              )}
            />
          ) : (
            <EstadoVazio titulo="Nenhuma oferta no momento" />
          )}
        </View>

        <View style={styles.secao}>
          <SecaoCabecalho titulo="Mais vendidos" verMaisHref="/mais-vendidos" />
          {maisVendidos.isLoading ? (
            <ActivityIndicator style={styles.carregandoHorizontal} />
          ) : maisVendidos.data && maisVendidos.data.length > 0 ? (
            <View style={styles.grade2Colunas}>
              {maisVendidos.data.map((produto) => (
                <ProdutoCard key={produto.id} produto={produto} />
              ))}
            </View>
          ) : (
            <EstadoVazio titulo="Ainda sem vendas" />
          )}
        </View>
      </ScrollView>

      <WhatsAppFlutuante />

      {produtoParaComprar ? (
        <ComprarRapido produto={produtoParaComprar} onFechar={() => setProdutoParaComprar(null)} />
      ) : null}
    </SafeAreaView>
  );
}

function Cabecalho() {
  return (
    <ThemedView style={styles.cabecalho}>
      <ThemedText type="title" style={styles.logo}>
        Raio de Luz
      </ThemedText>
      <View style={styles.cabecalhoIcones}>
        <Pressable onPress={() => router.push('/busca')} hitSlop={8}>
          <Ionicons name="search" size={24} />
        </Pressable>
        <Pressable onPress={() => router.push('/notificacoes')} hitSlop={8}>
          <Ionicons name="notifications-outline" size={24} />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingBottom: Spacing.six, gap: Spacing.four },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  logo: { fontSize: 22, lineHeight: 26 },
  cabecalhoIcones: { flexDirection: 'row', gap: Spacing.three },
  secao: { gap: Spacing.two },
  listaHorizontal: { paddingHorizontal: Spacing.three, gap: Spacing.three },
  carregandoHorizontal: { marginVertical: Spacing.three },
  cardHorizontal: { width: 160 },
  grade2Colunas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
});
