import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useAlternarFavorito, useFavoritosIds } from '@/lib/favoritos';
import { formatarReais, percentualDesconto, precoExibido } from '@/lib/formatacao';
import type { ProdutoResumo } from '@/lib/produtos';

type Props = {
  produto: ProdutoResumo;
  mostrarComprar?: boolean;
  onComprar?: (produto: ProdutoResumo) => void;
};

export function ProdutoCard({ produto, mostrarComprar, onComprar }: Props) {
  const { session } = useAuth();
  const { data: favoritosIds } = useFavoritosIds();
  const alternarFavorito = useAlternarFavorito();
  const favoritado = favoritosIds?.has(produto.id) ?? false;

  const preco = precoExibido(produto.preco, produto.preco_promocional);
  const desconto = percentualDesconto(produto.preco, produto.preco_promocional);
  const temDesconto = desconto > 0;

  function tocarFavorito() {
    if (!session) {
      router.push('/(auth)/login');
      return;
    }
    alternarFavorito.mutate({ produtoId: produto.id, favoritado });
  }

  return (
    <Pressable style={styles.container} onPress={() => router.push(`/produto/${produto.id}`)}>
      <View style={styles.imagemContainer}>
        <Image source={{ uri: produto.imagem_principal ?? undefined }} style={styles.imagem} contentFit="contain" />
        {temDesconto ? (
          <View style={styles.selo}>
            <ThemedText type="small" style={styles.seloTexto}>
              {desconto}% OFF
            </ThemedText>
          </View>
        ) : null}
        <Pressable onPress={tocarFavorito} hitSlop={8} style={styles.favorito}>
          <Ionicons name={favoritado ? 'heart' : 'heart-outline'} size={18} color={favoritado ? '#D64545' : '#ffffff'} />
        </Pressable>
      </View>

      <ThemedText type="small" numberOfLines={2} style={styles.nome}>
        {produto.nome}
      </ThemedText>

      <View style={styles.precos}>
        {temDesconto ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.precoRiscado}>
            {formatarReais(produto.preco)}
          </ThemedText>
        ) : null}
        <ThemedText type="smallBold" style={styles.preco}>
          {formatarReais(preco)}
        </ThemedText>
      </View>

      {mostrarComprar ? (
        <Button titulo="Comprar" icone="cart" arredondamento={Radii.cartao} onPress={() => onComprar?.(produto)} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 144,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E6EC',
    borderRadius: 10,
    padding: Spacing.two,
  },
  imagemContainer: {
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  imagem: { width: '100%', height: '100%' },
  selo: {
    position: 'absolute',
    top: Spacing.one,
    left: Spacing.one,
    backgroundColor: '#1E8E3E',
    borderRadius: 6,
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
  },
  seloTexto: { color: '#ffffff' },
  favorito: {
    position: 'absolute',
    top: Spacing.one,
    right: Spacing.one,
    width: 28,
    height: 28,
    borderRadius: Radii.pilula,
    backgroundColor: '#00000055',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nome: { minHeight: 36, textAlign: 'center' },
  precos: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one, flexWrap: 'wrap', justifyContent: 'center' },
  preco: { fontSize: 17 },
  precoRiscado: { textDecorationLine: 'line-through' },
});
