import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
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
      <View style={styles.imagemContainer}>
        <Image source={{ uri: produto.imagem_principal ?? undefined }} style={styles.imagem} contentFit="contain" />
        {temDesconto ? (
          <View style={styles.selo}>
            <ThemedText type="small" style={styles.seloTexto}>
              {desconto}% OFF
            </ThemedText>
          </View>
        ) : null}
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

      {mostrarComprar ? <Button titulo="Comprar" icone="cart" onPress={() => onComprar?.(produto)} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 144,
    maxWidth: '48%',
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
    backgroundColor: '#D64545',
    borderRadius: 6,
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
  },
  seloTexto: { color: '#ffffff' },
  nome: { minHeight: 36, textAlign: 'center' },
  precos: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one, flexWrap: 'wrap', justifyContent: 'center' },
  preco: { fontSize: 17 },
  precoRiscado: { textDecorationLine: 'line-through' },
});
