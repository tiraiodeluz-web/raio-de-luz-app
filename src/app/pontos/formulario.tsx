import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Radii, Spacing } from '@/constants/theme';
import { DESCONTO_POR_ACAO, useResponderFormulario } from '@/lib/pontos';
import { useToast } from '@/lib/toast-context';

// Perguntas do formulário (as respostas ficam em formulario_respostas.respostas,
// com estas chaves; o painel mostra na aba Pontos → Formulários).
const COMO_PEDIA = ['WhatsApp', 'Telefone', 'Representante / visita', 'Indo à loja', 'Outro'];
const FREQUENCIA = ['Toda semana', 'A cada 15 dias', 'Uma vez por mês', 'A cada 2 meses ou mais'];

export default function FormularioScreen() {
  const responder = useResponderFormulario();
  const { mostrarToast } = useToast();
  const [nota, setNota] = useState<number | null>(null);
  const [comoPedia, setComoPedia] = useState<string | null>(null);
  const [frequencia, setFrequencia] = useState<string | null>(null);
  const [gosta, setGosta] = useState('');
  const [melhorar, setMelhorar] = useState('');
  const [produtos, setProdutos] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function enviar() {
    setErro(null);
    if (nota === null || !comoPedia || !frequencia) return setErro('Responda as perguntas de escolha.');
    if (gosta.trim().length < 3 || melhorar.trim().length < 3) return setErro('Conte o que você gosta e o que podemos melhorar.');
    responder.mutate(
      {
        nota_recomendacao: nota,
        como_pedia_antes: comoPedia,
        frequencia_compra: frequencia,
        o_que_gosta: gosta.trim(),
        o_que_melhorar: melhorar.trim(),
        produtos_desejados: produtos.trim(),
      },
      {
        onSuccess: () => {
          mostrarToast(`Obrigado! Você ganhou +${DESCONTO_POR_ACAO.formulario}% de desconto no próximo pedido.`);
          router.back();
        },
        onError: (e) => setErro(e instanceof Error ? e.message : 'Não foi possível enviar agora.'),
      },
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Formulário" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={60}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ThemedText themeColor="textSecondary">
            Responda e ganhe +{DESCONTO_POR_ACAO.formulario}% de desconto no próximo pedido. Suas respostas ajudam a melhorar o app e o atendimento.
          </ThemedText>

          <Pergunta titulo="1. De 0 a 10, quanto você recomendaria o app da Raio de Luz a outro lojista?">
            <View style={styles.notas}>
              {Array.from({ length: 11 }, (_, n) => (
                <Opcao key={n} texto={String(n)} selecionada={nota === n} onPress={() => setNota(n)} compacta />
              ))}
            </View>
          </Pergunta>

          <Pergunta titulo="2. Antes do app, como você fazia seus pedidos?">
            <View style={styles.opcoes}>
              {COMO_PEDIA.map((o) => (
                <Opcao key={o} texto={o} selecionada={comoPedia === o} onPress={() => setComoPedia(o)} />
              ))}
            </View>
          </Pergunta>

          <Pergunta titulo="3. Com que frequência você repõe artigos religiosos na sua loja?">
            <View style={styles.opcoes}>
              {FREQUENCIA.map((o) => (
                <Opcao key={o} texto={o} selecionada={frequencia === o} onPress={() => setFrequencia(o)} />
              ))}
            </View>
          </Pergunta>

          <TextField rotulo="4. O que você mais gosta no app?" value={gosta} onChangeText={setGosta} multiline style={styles.texto} />
          <TextField rotulo="5. O que podemos melhorar?" value={melhorar} onChangeText={setMelhorar} multiline style={styles.texto} />
          <TextField
            rotulo="6. Que produtos você gostaria de encontrar no catálogo? (opcional)"
            value={produtos}
            onChangeText={setProdutos}
            multiline
            style={styles.texto}
          />

          {erro ? <ThemedText style={styles.erro}>{erro}</ThemedText> : null}
          <Button titulo="Enviar respostas" icone="send" onPress={enviar} carregando={responder.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Pergunta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={styles.pergunta}>
      <ThemedText type="smallBold">{titulo}</ThemedText>
      {children}
    </View>
  );
}

function Opcao({ texto, selecionada, onPress, compacta }: { texto: string; selecionada: boolean; onPress: () => void; compacta?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.opcao, compacta && styles.opcaoCompacta, selecionada && styles.opcaoSelecionada]}>
      <ThemedText type="small" style={selecionada ? styles.opcaoTextoSelecionado : undefined}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  pergunta: { gap: Spacing.two },
  notas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  opcao: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radii.pilula, borderWidth: 1, borderColor: '#C6C8D2' },
  opcaoCompacta: { width: 40, alignItems: 'center', paddingHorizontal: 0 },
  opcaoSelecionada: { backgroundColor: BrandColors.fundoEscuro, borderColor: BrandColors.fundoEscuro },
  opcaoTextoSelecionado: { color: '#ffffff', fontWeight: '700' },
  texto: { minHeight: 80, textAlignVertical: 'top' },
  erro: { color: '#D64545' },
});
