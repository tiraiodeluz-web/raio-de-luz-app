import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatarReais, percentualDesconto, precoExibido } from '@/lib/formatacao';
import type { ProdutoResumo } from '@/lib/produtos';

type Props = {
  produto: ProdutoResumo;
  mostrarComprar?: boolean;
  onComprar?: (produto: ProdutoResumo) => void;
};

export function ProdutoCard({ produto, mostrarComprar, onComprar }: Props) {
  const preco = precoExibido(produto.preco, produto.preco_promocional);
  const desconto = percentualDesconto(produto.preco, produto.preco_promocional);
  const temDesconto = desconto > 0;

  return (
    <Pressable style={styles.container} onPress={() => router.push(`/produto/${produto.id}`)}>
      <ThemedView type="backgroundElement" style={styles.imagemContainer}>
        <Image source={{ uri: produto.imagem_principal ?? undefined }} style={styles.imagem} contentFit="cover" />
        {temDesconto ? (
          <View style={styles.selo}>
            <ThemedText type="small" style={styles.seloTexto}>
              {desconto}% OFF
            </ThemedText>
          </View>
        ) : null}
      </ThemedView>

      <ThemedText type="small" numberOfLines={2} style={styles.nome}>
        {produto.nome}
      </ThemedText>

      <View style={styles.precos}>
        {temDesconto ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.precoRiscado}>
            {formatarReais(produto.preco)}
          </ThemedText>
        ) : null}
        <ThemedText type="smallBold">{formatarReais(preco)}</ThemedText>
      </View>

      {mostrarComprar ? (
        <Button titulo="Comprar" variante="secundario" onPress={() => onComprar?.(produto)} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: Spacing.half, maxWidth: '48%' },
  imagemContainer: {
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  imagem: { width: '100%', height: '100%' },
  selo: {
    position: 'absolute',
    top: Spacing.one,
    left: Spacing.one,
    backgroundColor: '#D64545',
    borderRadius: 6,
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
  },
  seloTexto: { color: '#ffffff' },
  nome: { minHeight: 36 },
  precos: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one, flexWrap: 'wrap' },
  precoRiscado: { textDecorationLine: 'line-through' },
});
