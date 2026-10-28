import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { formatarReais } from '@/lib/formatacao';
import { totalDoKit, type Kit } from '@/lib/kits';

export function KitCard({ kit }: { kit: Kit }) {
  const quantidadeItens = kit.itens.length;
  const quantidadeProdutos = kit.itens.reduce((soma, item) => soma + item.quantidade, 0);
  return (
    <Pressable style={styles.container} onPress={() => router.push(`/kit/${kit.id}`)}>
      <View style={styles.imagemContainer}>
        {kit.imagem_url ? <Image source={{ uri: kit.imagem_url }} style={styles.imagem} contentFit="cover" /> : null}
        <View style={styles.selo}>
          <ThemedText type="small" style={styles.seloTexto}>
            KIT
          </ThemedText>
        </View>
      </View>
      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {kit.nome}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {quantidadeItens} {quantidadeItens === 1 ? 'item' : 'itens'} · {quantidadeProdutos} {quantidadeProdutos === 1 ? 'produto' : 'produtos'}
        </ThemedText>
        <ThemedText type="smallBold" style={styles.preco}>
          {formatarReais(totalDoKit(kit.itens))}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 12, borderWidth: 1, borderColor: '#E5E6EC', backgroundColor: '#ffffff', overflow: 'hidden' },
  imagemContainer: { aspectRatio: 1, backgroundColor: '#F3F1EB' },
  imagem: { width: '100%', height: '100%' },
  selo: {
    position: 'absolute',
    top: Spacing.one,
    left: Spacing.one,
    backgroundColor: BrandColors.dourado,
    borderRadius: 6,
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
  },
  seloTexto: { color: '#ffffff', fontWeight: '700' },
  info: { padding: Spacing.two, gap: Spacing.half },
  preco: { color: BrandColors.fundoEscuro },
});
