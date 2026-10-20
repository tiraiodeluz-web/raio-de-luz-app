import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { EstadoVazio } from '@/components/estado-vazio';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { formatarReais } from '@/lib/formatacao';
import { precoUnitarioItem, totalDoKit, useAdicionarKitAoCarrinho, useKit, type ItemKit } from '@/lib/kits';
import { useToast } from '@/lib/toast-context';
import { useRecursos20 } from '@/lib/versao-app';

export default function KitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { data: kit, isLoading } = useKit(id);
  const adicionar = useAdicionarKitAoCarrinho();
  const { mostrarToast } = useToast();
  const recursos20 = useRecursos20();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CabecalhoVoltar titulo="Kit" />
        <ActivityIndicator style={styles.carregando} />
      </SafeAreaView>
    );
  }

  if (!kit || !kit.ativo || !recursos20) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CabecalhoVoltar titulo="Kit" />
        <EstadoVazio icone="gift-outline" titulo="Kit indisponível" descricao="Esse kit não está mais disponível." />
      </SafeAreaView>
    );
  }

  const kitAtual = kit;

  function adicionarKit() {
    if (!session) {
      router.push('/(auth)/login');
      return;
    }
    adicionar.mutate(kitAtual.id, {
      onSuccess: ({ adicionados, indisponiveis }) => {
        if (adicionados === 0) {
          mostrarToast('Nenhum item desse kit está disponível agora.');
        } else if (indisponiveis > 0) {
          mostrarToast(`${adicionados} itens adicionados. ${indisponiveis} estão indisponíveis.`);
        } else {
          mostrarToast('Kit adicionado ao carrinho!');
        }
      },
      onError: (erro) =>
        mostrarToast((erro as { message?: string } | null)?.message ?? 'Não foi possível adicionar o kit. Verifique sua internet.'),
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Kit" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.fotoContainer}>
          {kit.imagem_url ? <Image source={{ uri: kit.imagem_url }} style={styles.foto} contentFit="contain" /> : null}
        </View>

        <View style={styles.corpo}>
          <ThemedText type="title" style={styles.nome}>
            {kit.nome}
          </ThemedText>
          <View style={styles.linhaTotal}>
            <ThemedText themeColor="textSecondary">Total do kit</ThemedText>
            <ThemedText type="title" style={styles.total}>
              {formatarReais(totalDoKit(kit.itens))}
            </ThemedText>
          </View>

          {kit.descricao ? <ThemedText style={styles.descricao}>{kit.descricao}</ThemedText> : null}

          <ThemedText type="smallBold" style={styles.tituloItens}>
            Itens do kit
          </ThemedText>
          {kit.itens.map((item) => (
            <LinhaItem key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.rodape}>
        <Button titulo="Adicionar kit ao carrinho" icone="cart" onPress={adicionarKit} carregando={adicionar.isPending} />
      </View>
    </SafeAreaView>
  );
}

function LinhaItem({ item }: { item: ItemKit }) {
  const indisponivel = !item.produto.ativo;
  return (
    <Pressable
      style={[styles.item, indisponivel && styles.itemIndisponivel]}
      disabled={indisponivel}
      onPress={() => router.push(`/produto/${item.produto.id}`)}>
      <Image source={{ uri: item.produto.imagem_principal ?? undefined }} style={styles.itemImagem} contentFit="cover" />
      <View style={styles.itemInfo}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {item.quantidade}x {item.produto.nome}
        </ThemedText>
        {item.santo ? (
          <ThemedText type="small" themeColor="textSecondary">
            Santo: {item.santo.nome}
          </ThemedText>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {indisponivel ? 'Indisponível no momento' : formatarReais(precoUnitarioItem(item) * item.quantidade)}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  carregando: { marginTop: Spacing.five },
  scroll: { paddingBottom: Spacing.six },
  fotoContainer: { aspectRatio: 1, backgroundColor: '#ffffff' },
  foto: { width: '100%', height: '100%' },
  corpo: { padding: Spacing.three, gap: Spacing.two },
  nome: { fontSize: 22, lineHeight: 28, color: BrandColors.fundoEscuro },
  linhaTotal: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  total: { fontSize: 24, lineHeight: 30, color: BrandColors.fundoEscuro },
  descricao: { lineHeight: 22 },
  tituloItens: { marginTop: Spacing.two },
  item: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E6EC',
  },
  itemIndisponivel: { opacity: 0.5 },
  itemImagem: { width: 64, height: 64, borderRadius: 8 },
  itemInfo: { flex: 1, gap: Spacing.half },
  rodape: { padding: Spacing.three },
});
