import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { ComprarRapido } from '@/components/comprar-rapido';
import { EstadoVazio } from '@/components/estado-vazio';
import { KitCard } from '@/components/kit-card';
import { ProdutoCard } from '@/components/produto-card';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Radii, Spacing } from '@/constants/theme';
import { useEnviarAoAssistente, type MensagemChat } from '@/lib/assistente';
import { useAuth } from '@/lib/auth-context';
import { useKits, type Kit } from '@/lib/kits';
import type { ProdutoResumo } from '@/lib/produtos';

const BOAS_VINDAS: MensagemChat = {
  id: 'boas-vindas',
  papel: 'assistente',
  texto: 'Oi! Sou o assistente da Raio de Luz. Me diga o que você procura ou o que quer pedir, do seu jeito. Ex.: "quero 12 chaveiros de São Bento".',
  sugestoes: ['Repetir meu último pedido', 'Ver os kits', 'Produtos em oferta'],
};

let contador = 0;
function novoId() {
  contador += 1;
  return `${Date.now()}-${contador}`;
}

export default function AssistenteScreen() {
  const { session, perfil } = useAuth();
  const [mensagens, setMensagens] = useState<MensagemChat[]>([BOAS_VINDAS]);
  const [texto, setTexto] = useState('');
  const [produtoParaComprar, setProdutoParaComprar] = useState<ProdutoResumo | null>(null);
  const enviar = useEnviarAoAssistente();
  const kits = useKits();
  const listaRef = useRef<FlatList<MensagemChat>>(null);

  const kitsPorId = useMemo(() => new Map((kits.data ?? []).map((k) => [k.id, k])), [kits.data]);
  const ultimaDoAssistente = [...mensagens].reverse().find((m) => m.papel === 'assistente');

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CabecalhoVoltar titulo="Assistente" />
        <EstadoVazio icone="sparkles-outline" titulo="Faça login para usar o assistente" />
        <View style={styles.botaoEntrar}>
          <Button titulo="Entrar" onPress={() => router.push('/(auth)/login')} />
        </View>
      </SafeAreaView>
    );
  }

  if (perfil && !perfil.cadastro_aprovado && perfil.tipo !== 'admin') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CabecalhoVoltar titulo="Assistente" />
        <EstadoVazio
          icone="sparkles-outline"
          titulo="Disponível após a aprovação do cadastro"
          descricao="Assim que seu cadastro for aprovado, o assistente te ajuda a montar o pedido."
        />
      </SafeAreaView>
    );
  }

  function mandar(conteudo: string) {
    const limpo = conteudo.trim();
    if (!limpo || enviar.isPending) return;
    const doCliente: MensagemChat = { id: novoId(), papel: 'cliente', texto: limpo };
    const conversa = [...mensagens, doCliente];
    setMensagens(conversa);
    setTexto('');
    listaRef.current?.scrollToOffset({ offset: 0, animated: true });
    enviar.mutate(conversa, {
      onSuccess: (resposta) =>
        setMensagens((atual) => [
          ...atual,
          {
            id: novoId(),
            papel: 'assistente',
            texto: resposta.texto,
            produtos: resposta.produtos,
            kitIds: resposta.kitIds,
            sugestoes: resposta.sugestoes,
            carrinhoAlterado: resposta.carrinhoAlterado,
          },
        ]),
      onError: (erro) =>
        setMensagens((atual) => [
          ...atual,
          { id: novoId(), papel: 'assistente', texto: erro instanceof Error ? erro.message : 'Algo deu errado.', erro: true },
        ]),
    });
  }

  function novaConversa() {
    setMensagens([BOAS_VINDAS]);
    setTexto('');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <CabecalhoVoltar
        titulo="Assistente"
        acao={
          mensagens.length > 1 ? (
            <Pressable onPress={novaConversa} hitSlop={8} accessibilityLabel="Nova conversa">
              <Ionicons name="refresh" size={22} color={BrandColors.fundoEscuro} />
            </Pressable>
          ) : null
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList
          ref={listaRef}
          inverted
          data={[...mensagens].reverse()}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.lista}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={enviar.isPending ? <Digitando /> : null}
          renderItem={({ item }) => (
            <Bolha
              mensagem={item}
              kits={(item.kitIds ?? []).map((id) => kitsPorId.get(id)).filter((k): k is Kit => !!k)}
              mostrarSugestoes={item.id === ultimaDoAssistente?.id && !enviar.isPending}
              onSugestao={mandar}
              onComprar={setProdutoParaComprar}
            />
          )}
        />

        <View style={styles.entrada}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Escreva o que você precisa..."
            placeholderTextColor="#8A8D99"
            style={styles.campo}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={() => mandar(texto)}
            disabled={!texto.trim() || enviar.isPending}
            style={[styles.enviar, (!texto.trim() || enviar.isPending) && styles.enviarDesabilitado]}
            accessibilityLabel="Enviar">
            <Ionicons name="send" size={18} color="#ffffff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {produtoParaComprar ? <ComprarRapido produto={produtoParaComprar} onFechar={() => setProdutoParaComprar(null)} /> : null}
    </SafeAreaView>
  );
}

function Bolha({
  mensagem,
  kits,
  mostrarSugestoes,
  onSugestao,
  onComprar,
}: {
  mensagem: MensagemChat;
  kits: Kit[];
  mostrarSugestoes: boolean;
  onSugestao: (texto: string) => void;
  onComprar: (produto: ProdutoResumo) => void;
}) {
  if (mensagem.papel === 'cliente') {
    return (
      <View style={[styles.bolha, styles.bolhaCliente]}>
        <ThemedText style={styles.textoCliente}>{mensagem.texto}</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.blocoAssistente}>
      <View style={[styles.bolha, styles.bolhaAssistente, mensagem.erro && styles.bolhaErro]}>
        <ThemedText>{mensagem.texto}</ThemedText>
      </View>

      {mensagem.produtos && mensagem.produtos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
          {mensagem.produtos.map((produto) => (
            <View key={produto.id} style={styles.card}>
              <ProdutoCard produto={produto} mostrarComprar onComprar={onComprar} />
            </View>
          ))}
        </ScrollView>
      ) : null}

      {kits.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
          {kits.map((kit) => (
            <View key={kit.id} style={styles.card}>
              <KitCard kit={kit} />
            </View>
          ))}
        </ScrollView>
      ) : null}

      {mensagem.carrinhoAlterado ? (
        <Pressable style={styles.verCarrinho} onPress={() => router.push('/(tabs)/carrinho')}>
          <Ionicons name="cart" size={16} color="#ffffff" />
          <ThemedText type="smallBold" style={styles.verCarrinhoTexto}>
            Ver carrinho
          </ThemedText>
        </Pressable>
      ) : null}

      {mostrarSugestoes && mensagem.sugestoes && mensagem.sugestoes.length > 0 ? (
        <View style={styles.sugestoes}>
          {mensagem.sugestoes.map((sugestao) => (
            <Pressable key={sugestao} style={styles.sugestao} onPress={() => onSugestao(sugestao)}>
              <ThemedText type="small" style={styles.sugestaoTexto}>
                {sugestao}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Digitando() {
  return (
    <View style={[styles.bolha, styles.bolhaAssistente, styles.digitando]}>
      <ActivityIndicator size="small" color={BrandColors.fundoEscuro} />
      <ThemedText type="small" themeColor="textSecondary">
        Procurando...
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  botaoEntrar: { paddingHorizontal: Spacing.four },
  lista: { padding: Spacing.three, gap: Spacing.three },
  bolha: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  bolhaCliente: { alignSelf: 'flex-end', backgroundColor: BrandColors.fundoEscuro, borderBottomRightRadius: 4 },
  textoCliente: { color: '#ffffff' },
  blocoAssistente: { gap: Spacing.two },
  bolhaAssistente: { alignSelf: 'flex-start', backgroundColor: '#F1F2F6', borderBottomLeftRadius: 4 },
  bolhaErro: { backgroundColor: '#FDECEC' },
  digitando: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cards: { gap: Spacing.two, paddingRight: Spacing.three },
  card: { width: 150 },
  verCarrinho: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: '#1E8E3E',
    borderRadius: Radii.pilula,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  verCarrinhoTexto: { color: '#ffffff' },
  sugestoes: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  sugestao: {
    borderWidth: 1,
    borderColor: BrandColors.fundoEscuro,
    borderRadius: Radii.pilula,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  sugestaoTexto: { color: BrandColors.fundoEscuro, fontWeight: '600' },
  entrada: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#E5E6EC',
  },
  campo: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: '#F1F2F6',
    paddingHorizontal: Spacing.three,
    paddingTop: 12,
    paddingBottom: 12,
    color: '#111318',
    fontSize: 15,
  },
  enviar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BrandColors.fundoEscuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enviarDesabilitado: { opacity: 0.4 },
});
