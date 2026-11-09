import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { DESCONTO_MAXIMO, DESCONTO_POR_ACAO, situacaoFeedback, usePontos, type MovimentoPontos } from '@/lib/pontos';

const ICONE_MOTIVO: Record<string, keyof typeof Ionicons.glyphMap> = {
  pedido: 'cart-outline',
  formulario: 'clipboard-outline',
  feedback_video: 'videocam-outline',
  resgate: 'pricetag-outline',
  estorno_desconto: 'return-down-back-outline',
  estorno_credito: 'return-down-back-outline',
  ajuste: 'create-outline',
};

const ROTULO_SITUACAO = { fazer: null, pendente: 'Em análise', aprovado: 'Concluído', recusado: 'Não aprovado' } as const;

export default function PontosScreen() {
  const { data, isLoading, refetch, isRefetching } = usePontos();

  if (isLoading || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CabecalhoVoltar titulo="Meu desconto" />
        <ActivityIndicator style={styles.carregando} />
      </SafeAreaView>
    );
  }

  const { desconto, movimentos, feedbacks, respondeuFormulario } = data;
  const fbVideo = situacaoFeedback(feedbacks);

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Meu desconto" />
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
        <View style={styles.saldo}>
          <ThemedText type="small" style={styles.saldoRotulo}>
            Seu desconto no próximo pedido
          </ThemedText>
          <ThemedText style={styles.saldoNumero}>{desconto}%</ThemedText>
          <ThemedText type="small" style={styles.saldoRotulo}>
            {desconto > 0
              ? 'Aplicado automaticamente no checkout do seu próximo pedido.'
              : `Complete as tarefas abaixo e ganhe até ${DESCONTO_MAXIMO}% de desconto.`}
          </ThemedText>
          <View style={styles.barra}>
            <View style={[styles.barraCheia, { width: `${Math.min(100, (desconto / DESCONTO_MAXIMO) * 100)}%` }]} />
          </View>
          <ThemedText type="small" style={styles.saldoRotulo}>
            Máximo de {DESCONTO_MAXIMO}% por pedido
          </ThemedText>
        </View>

        <ThemedText type="smallBold" style={styles.secao}>
          Como ganhar desconto
        </ThemedText>
        <Tarefa
          icone="cart-outline"
          titulo="Faça um pedido"
          detalhe="A cada pedido pago · vale para o próximo"
          percentual={DESCONTO_POR_ACAO.pedido}
          onPress={() => router.push('/(tabs)/catalogos')}
        />
        <Tarefa
          icone="clipboard-outline"
          titulo="Responda o formulário"
          detalhe="Uma vez · leva 2 minutos"
          percentual={DESCONTO_POR_ACAO.formulario}
          situacao={respondeuFormulario ? 'Concluído' : null}
          onPress={respondeuFormulario ? undefined : () => router.push('/pontos/formulario')}
        />
        <Tarefa
          icone="videocam-outline"
          titulo="Feedback em vídeo"
          detalhe="Uma vez · vale depois da aprovação"
          percentual={DESCONTO_POR_ACAO.feedback_video}
          situacao={ROTULO_SITUACAO[fbVideo]}
          onPress={fbVideo === 'fazer' || fbVideo === 'recusado' ? () => router.push('/pontos/feedback') : undefined}
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
          O desconto vale para um pedido: depois de usado, volta a zero e você pode ganhar de novo. Se o pedido for cancelado, o desconto
          usado volta e o que ele tinha gerado é retirado. O desconto é aplicado sobre o valor dos produtos.
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
  percentual,
  situacao,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  detalhe: string;
  percentual: number;
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
        +{percentual}%
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
        {positivo ? `+${movimento.pontos}%` : `− ${Math.abs(movimento.pontos)}%`}
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
  saldoNumero: { color: BrandColors.dourado, fontSize: 48, lineHeight: 56, fontWeight: '700' },
  barra: { height: 8, borderRadius: 4, backgroundColor: '#2A2F66', marginTop: Spacing.two, marginBottom: Spacing.one, overflow: 'hidden' },
  barraCheia: { height: '100%', backgroundColor: BrandColors.dourado, borderRadius: 4 },
  secao: { marginTop: Spacing.three, color: BrandColors.fundoEscuro, fontSize: 16 },
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
