import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Radii, Spacing } from '@/constants/theme';
import {
  PONTOS_TAREFA,
  PREMIOS,
  situacaoFeedback,
  useCancelarResgate,
  usePontos,
  useResgatarPontos,
  type MovimentoPontos,
} from '@/lib/pontos';
import { useToast } from '@/lib/toast-context';

const ICONE_MOTIVO: Record<string, keyof typeof Ionicons.glyphMap> = {
  pedido_2k: 'cart-outline',
  ia_pedido: 'sparkles-outline',
  formulario: 'clipboard-outline',
  feedback_texto: 'chatbubble-ellipses-outline',
  feedback_video: 'videocam-outline',
  resgate: 'gift-outline',
  estorno: 'return-down-back-outline',
  ajuste: 'create-outline',
};

const ROTULO_SITUACAO = { fazer: null, pendente: 'Em análise', aprovado: 'Concluído', recusado: 'Não aprovado' } as const;

export default function PontosScreen() {
  const { data, isLoading, refetch, isRefetching } = usePontos();
  const resgatar = useResgatarPontos();
  const cancelar = useCancelarResgate();
  const { mostrarToast } = useToast();

  if (isLoading || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CabecalhoVoltar titulo="Meus pontos" />
        <ActivityIndicator style={styles.carregando} />
      </SafeAreaView>
    );
  }

  const { saldo, movimentos, resgateDisponivel, feedbacks, respondeuFormulario } = data;
  const proximo = PREMIOS.find((p) => p.pontos > saldo);
  const fbTexto = situacaoFeedback(feedbacks, 'texto');
  const fbVideo = situacaoFeedback(feedbacks, 'video');

  function confirmarTroca(pontos: number, percentual: number) {
    Alert.alert('Trocar pontos', `Trocar ${pontos} pontos por ${percentual}% de desconto no seu próximo pedido?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Trocar',
        onPress: () =>
          resgatar.mutate(pontos, {
            onSuccess: () => mostrarToast(`Pronto! ${percentual}% de desconto no próximo pedido.`),
            onError: (e) => mostrarToast(e instanceof Error ? e.message : 'Não foi possível trocar agora.'),
          }),
      },
    ]);
  }

  function confirmarCancelamento(id: string) {
    Alert.alert('Desistir do desconto', 'Os pontos voltam para o seu saldo.', [
      { text: 'Manter desconto', style: 'cancel' },
      {
        text: 'Devolver pontos',
        style: 'destructive',
        onPress: () =>
          cancelar.mutate(id, {
            onSuccess: () => mostrarToast('Pontos devolvidos.'),
            onError: (e) => mostrarToast(e instanceof Error ? e.message : 'Não foi possível cancelar agora.'),
          }),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Meus pontos" />
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
        <View style={styles.saldo}>
          <ThemedText type="small" style={styles.saldoRotulo}>
            Seu saldo
          </ThemedText>
          <ThemedText style={styles.saldoNumero}>{saldo}</ThemedText>
          <ThemedText type="small" style={styles.saldoTexto}>
            pontos
          </ThemedText>
          {proximo && !resgateDisponivel ? (
            <>
              <View style={styles.barra}>
                <View style={[styles.barraCheia, { width: `${Math.min(100, Math.max(0, (saldo / proximo.pontos) * 100))}%` }]} />
              </View>
              <ThemedText type="small" style={styles.saldoRotulo}>
                Faltam {proximo.pontos - saldo} pontos para {proximo.percentual}% de desconto
              </ThemedText>
            </>
          ) : null}
        </View>

        {resgateDisponivel ? (
          <View style={styles.descontoAtivo}>
            <Ionicons name="pricetag" size={22} color={BrandColors.fundoEscuro} />
            <View style={styles.flex}>
              <ThemedText type="smallBold">{Number(resgateDisponivel.percentual)}% de desconto garantido</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Vale no seu próximo pedido, aplicado automaticamente no checkout.
              </ThemedText>
              <Pressable onPress={() => confirmarCancelamento(resgateDisponivel.id)} hitSlop={6}>
                <ThemedText type="small" style={styles.link}>
                  Desistir e devolver os pontos
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        <ThemedText type="smallBold" style={styles.secao}>
          Trocar pontos
        </ThemedText>
        <View style={styles.premios}>
          {PREMIOS.map((p) => {
            const pode = saldo >= p.pontos && !resgateDisponivel;
            return (
              <View key={p.pontos} style={[styles.premio, !pode && styles.premioBloqueado]}>
                <ThemedText style={styles.premioPercentual}>{p.percentual}%</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  de desconto
                </ThemedText>
                <ThemedText type="smallBold">{p.pontos} pts</ThemedText>
                <Pressable
                  style={[styles.premioBotao, !pode && styles.premioBotaoDesligado]}
                  disabled={!pode || resgatar.isPending}
                  onPress={() => confirmarTroca(p.pontos, p.percentual)}>
                  <ThemedText type="smallBold" style={styles.premioBotaoTexto}>
                    Trocar
                  </ThemedText>
                </Pressable>
              </View>
            );
          })}
        </View>
        {resgateDisponivel ? (
          <ThemedText type="small" themeColor="textSecondary">
            Use o desconto que você já trocou antes de fazer outra troca.
          </ThemedText>
        ) : null}

        <ThemedText type="smallBold" style={styles.secao}>
          Ganhe pontos
        </ThemedText>
        <Tarefa icone="cart-outline" titulo="Pedido de R$ 2.000 ou mais" detalhe="A cada pedido" pontos={PONTOS_TAREFA.pedido_2k} />
        <Tarefa
          icone="sparkles-outline"
          titulo="Use a RDL AI para montar o pedido"
          detalhe="Converse com a RDL AI no dia do pedido"
          pontos={PONTOS_TAREFA.ia_pedido}
          onPress={() => router.push('/(tabs)/assistente')}
        />
        <Tarefa
          icone="clipboard-outline"
          titulo="Responda o formulário"
          detalhe="Uma vez · leva 2 minutos"
          pontos={PONTOS_TAREFA.formulario}
          situacao={respondeuFormulario ? 'Concluído' : null}
          onPress={respondeuFormulario ? undefined : () => router.push('/pontos/formulario')}
        />
        <Tarefa
          icone="chatbubble-ellipses-outline"
          titulo="Feedback em texto"
          detalhe="Uma vez · pontos após aprovação"
          pontos={PONTOS_TAREFA.feedback_texto}
          situacao={ROTULO_SITUACAO[fbTexto]}
          onPress={fbTexto === 'fazer' || fbTexto === 'recusado' ? () => router.push('/pontos/feedback?tipo=texto') : undefined}
        />
        <Tarefa
          icone="videocam-outline"
          titulo="Feedback em vídeo"
          detalhe="Uma vez · pontos após aprovação"
          pontos={PONTOS_TAREFA.feedback_video}
          situacao={ROTULO_SITUACAO[fbVideo]}
          onPress={fbVideo === 'fazer' || fbVideo === 'recusado' ? () => router.push('/pontos/feedback?tipo=video') : undefined}
        />

        <ThemedText type="smallBold" style={styles.secao}>
          Extrato
        </ThemedText>
        {movimentos.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Nenhuma movimentação ainda. Complete uma tarefa acima para começar.
          </ThemedText>
        ) : (
          movimentos.map((m) => <LinhaExtrato key={m.id} movimento={m} />)
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.regras}>
          Pontos de pedido são retirados se o pedido for cancelado. O desconto trocado vale para um pedido e é aplicado sobre o valor dos
          produtos.
        </ThemedText>
        <Button titulo="Ver catálogo" variante="secundario" icone="grid-outline" onPress={() => router.push('/(tabs)/catalogos')} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Tarefa({
  icone,
  titulo,
  detalhe,
  pontos,
  situacao,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  detalhe: string;
  pontos: number;
  situacao?: string | null;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.cartao} onPress={onPress} disabled={!onPress}>
      <View style={styles.icone}>
        <Ionicons name={icone} size={20} color={BrandColors.fundoEscuro} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{titulo}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {situacao ? `${detalhe} · ${situacao}` : detalhe}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={situacao === 'Concluído' ? styles.pontosFeito : styles.pontos}>
        +{pontos}
      </ThemedText>
      {onPress ? <Ionicons name="chevron-forward" size={18} color="#9A9CA8" /> : null}
    </Pressable>
  );
}

function LinhaExtrato({ movimento }: { movimento: MovimentoPontos }) {
  const positivo = movimento.pontos > 0;
  const data = new Date(movimento.criado_em).toLocaleDateString('pt-BR');
  return (
    <View style={styles.cartao}>
      <View style={styles.icone}>
        <Ionicons name={ICONE_MOTIVO[movimento.motivo] ?? 'ellipse-outline'} size={20} color={BrandColors.fundoEscuro} />
      </View>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{movimento.descricao}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {data}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" style={positivo ? styles.pontos : styles.pontosNegativos}>
        {positivo ? `+${movimento.pontos}` : `− ${Math.abs(movimento.pontos)}`}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  carregando: { marginTop: Spacing.five },
  scroll: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  flex: { flex: 1, gap: 2 },
  saldo: { backgroundColor: BrandColors.fundoEscuro, borderRadius: 16, padding: Spacing.three, gap: 2 },
  saldoRotulo: { color: '#C9CBE0' },
  saldoNumero: { color: BrandColors.dourado, fontSize: 44, lineHeight: 52, fontWeight: '700' },
  saldoTexto: { color: '#E6E7F2' },
  barra: { height: 8, borderRadius: 4, backgroundColor: '#2A2F66', marginTop: Spacing.two, marginBottom: Spacing.one, overflow: 'hidden' },
  barraCheia: { height: '100%', backgroundColor: BrandColors.dourado, borderRadius: 4 },
  descontoAtivo: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#FBF4DF',
    borderWidth: 1,
    borderColor: BrandColors.dourado,
  },
  link: { color: BrandColors.fundoEscuro, textDecorationLine: 'underline', marginTop: Spacing.one },
  secao: { marginTop: Spacing.three, color: BrandColors.fundoEscuro, fontSize: 16 },
  premios: { flexDirection: 'row', gap: Spacing.two },
  premio: { flex: 1, alignItems: 'center', gap: 2, padding: Spacing.two, borderRadius: 12, borderWidth: 1, borderColor: BrandColors.dourado },
  premioBloqueado: { borderColor: '#E5E6EC' },
  premioPercentual: { fontSize: 26, lineHeight: 32, fontWeight: '700', color: BrandColors.fundoEscuro },
  premioBotao: { marginTop: Spacing.one, alignSelf: 'stretch', alignItems: 'center', paddingVertical: 8, borderRadius: Radii.pilula, backgroundColor: BrandColors.dourado },
  premioBotaoDesligado: { backgroundColor: '#E5E6EC' },
  premioBotaoTexto: { color: BrandColors.fundoEscuro },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E6EC',
  },
  icone: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F1EB', alignItems: 'center', justifyContent: 'center' },
  pontos: { color: '#1E8E3E' },
  pontosFeito: { color: '#9A9CA8' },
  pontosNegativos: { color: '#C0392B' },
  regras: { marginTop: Spacing.two },
});
