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
import { WhatsAppFlutuante } from '@/components/whatsapp-flutuante';
import { BrandColors, Radii, Spacing } from '@/constants/theme';
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
          <SecaoCabecalho titulo="Em oferta" verMaisHref="/ofertas" icone="flame" corIcone="#E85D3A" />
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
          <SecaoCabecalho titulo="Mais vendidos" verMaisHref="/mais-vendidos" icone="star" corIcone={BrandColors.dourado} />
          {maisVendidos.isLoading ? (
            <ActivityIndicator style={styles.carregandoHorizontal} />
          ) : maisVendidos.data && maisVendidos.data.length > 0 ? (
            <View style={styles.grade2Colunas}>
              {maisVendidos.data.map((produto) => (
                <ProdutoCard key={produto.id} produto={produto} mostrarComprar onComprar={setProdutoParaComprar} />
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
    <View style={styles.cabecalho}>
      <View style={styles.cabecalhoLogo}>
        <ThemedText style={styles.logoTitulo} numberOfLines={1}>
          RAIO DE LUZ
        </ThemedText>
        <ThemedText style={styles.logoSubtitulo} numberOfLines={1}>
          RELIGIOSOS
        </ThemedText>
      </View>
      <Pressable style={styles.busca} onPress={() => router.push('/busca')}>
        <Ionicons name="search" size={18} color="#8A8D99" />
        <ThemedText type="small" themeColor="textSecondary">
          Buscar produtos...
        </ThemedText>
      </Pressable>
      <Pressable style={styles.sino} onPress={() => router.push('/notificacoes')} hitSlop={8}>
        <Ionicons name="notifications-outline" size={20} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { paddingBottom: Spacing.six, gap: Spacing.four },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  cabecalhoLogo: { gap: 0 },
  logoTitulo: { color: BrandColors.fundoEscuro, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  logoSubtitulo: { color: BrandColors.fundoEscuro, fontSize: 9, fontWeight: '600', letterSpacing: 1 },
  busca: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 40,
    borderRadius: Radii.pilula,
    borderWidth: 1,
    borderColor: '#E5E6EC',
    paddingHorizontal: Spacing.three,
  },
  sino: {
    width: 40,
    height: 40,
    borderRadius: Radii.pilula,
    backgroundColor: BrandColors.fundoEscuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secao: { gap: Spacing.two },
  listaHorizontal: { paddingHorizontal: Spacing.three, gap: Spacing.three },
  carregandoHorizontal: { marginVertical: Spacing.three },
  cardHorizontal: { width: 148 },
  grade2Colunas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
});
