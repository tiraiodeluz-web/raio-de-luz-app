import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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

// Igual ao Bubble (print da Home de 28/09/2026): faixa azul-escura com o
// logo, campo de busca branco e o sino num círculo branco.
// O logo é um recorte provisório do print — trocar pelo arquivo original.
function Cabecalho() {
  return (
    <View style={styles.cabecalho}>
      <Image
        source={require('@/assets/images/logo-cabecalho.png')}
        style={styles.logo}
        contentFit="contain"
        accessibilityLabel="Raio de Luz Religiosos"
      />
      <Pressable style={styles.busca} onPress={() => router.push('/busca')} accessibilityRole="search">
        <Ionicons name="search" size={18} color={BrandColors.fundoEscuro} />
        <ThemedText type="small" style={styles.buscaTexto} numberOfLines={1}>
          Buscar produtos...
        </ThemedText>
      </Pressable>
      <Pressable
        style={styles.sino}
        onPress={() => router.push('/notificacoes')}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Notificações">
        <Ionicons name="notifications-outline" size={20} color={BrandColors.fundoEscuro} />
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
    paddingVertical: Spacing.three,
    backgroundColor: BrandColors.fundoEscuro,
  },
  logo: { width: 112, height: 41 },
  busca: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: Spacing.two,
  },
  buscaTexto: { color: '#9A9CA8', flexShrink: 1 },
  sino: {
    width: 40,
    height: 40,
    borderRadius: Radii.pilula,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
