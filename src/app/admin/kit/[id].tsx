import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { SeletorQuantidade } from '@/components/seletor-quantidade';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Radii, Spacing } from '@/constants/theme';
import { formatarReais, precoExibido } from '@/lib/formatacao';
import { textoConteudoKit, useExcluirKit, useKit, useSalvarKit } from '@/lib/kits';
import { buscarProdutoDetalhe, ehSantoPersonalizado, useProdutos, type ProdutoResumo, type SantoDoProduto } from '@/lib/produtos';
import { useToast } from '@/lib/toast-context';
import { enviarImagemParaStorage } from '@/lib/upload-imagem';
import { urlImagem } from '@/lib/imagem';

type ItemFormulario = {
  chave: string;
  produto: { id: string; nome: string; imagem_principal: string | null; embalagem: number; preco: number; preco_promocional: number | null };
  // Santos que dá pra fixar no kit. "Personalizado" fica de fora: ele exige
  // o texto do cliente, e o kit vai pro carrinho sem passar por esse campo.
  santos: SantoDoProduto[];
  santoId: string | null;
  quantidade: number;
};

function mensagemDeErro(erro: unknown, padrao: string) {
  return (erro as { message?: string } | null)?.message ?? padrao;
}

export default function KitFormularioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ehNovo = id === 'novo';
  const queryClient = useQueryClient();
  const { data: kitExistente, isLoading } = useKit(ehNovo ? undefined : id);
  const salvar = useSalvarKit();
  const excluir = useExcluirKit();
  const { mostrarToast } = useToast();

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [imagemNova, setImagemNova] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [itens, setItens] = useState<ItemFormulario[]>([]);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [adicionandoProduto, setAdicionandoProduto] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const inicializado = useRef(false);

  async function santosDoProduto(produtoId: string) {
    const detalhe = await queryClient.fetchQuery({
      queryKey: ['produtos', 'detalhe', produtoId],
      queryFn: () => buscarProdutoDetalhe(produtoId),
    });
    return detalhe.produto.personalizavel ? detalhe.santos.filter((s) => !ehSantoPersonalizado(s)) : [];
  }

  useEffect(() => {
    if (!kitExistente || inicializado.current) return;
    inicializado.current = true;
    setNome(kitExistente.nome);
    setDescricao(kitExistente.descricao ?? '');
    setAtivo(kitExistente.ativo);
    setImagemUrl(kitExistente.imagem_url);
    (async () => {
      const carregados = await Promise.all(
        kitExistente.itens.map(async (item) => ({
          chave: item.id,
          produto: item.produto,
          santos: item.produto.personalizavel ? await santosDoProduto(item.produto.id) : [],
          santoId: item.santo?.id ?? null,
          quantidade: item.quantidade,
        })),
      );
      setItens(carregados);
    })().catch((e) => setErro(mensagemDeErro(e, 'Não foi possível carregar os itens do kit.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitExistente]);

  async function escolherImagem() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão necessária', 'Autorize o acesso às fotos para escolher a imagem do kit.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!resultado.canceled) setImagemNova(resultado.assets[0]);
  }

  async function adicionarProduto(produto: ProdutoResumo) {
    setBuscaAberta(false);
    setAdicionandoProduto(true);
    try {
      const santos = await santosDoProduto(produto.id);
      setItens((atual) => [
        ...atual,
        {
          chave: `${produto.id}-${Date.now()}`,
          produto: {
            id: produto.id,
            nome: produto.nome,
            imagem_principal: produto.imagem_principal,
            embalagem: produto.embalagem,
            preco: produto.preco,
            preco_promocional: produto.preco_promocional,
          },
          santos,
          santoId: santos.length === 1 ? santos[0].id : null,
          quantidade: produto.embalagem,
        },
      ]);
    } catch (e) {
      mostrarToast(mensagemDeErro(e, 'Não foi possível adicionar o produto.'));
    } finally {
      setAdicionandoProduto(false);
    }
  }

  function atualizarItem(chave: string, mudanca: Partial<ItemFormulario>) {
    setItens((atual) => atual.map((item) => (item.chave === chave ? { ...item, ...mudanca } : item)));
  }

  function preencherDescricao() {
    setDescricao(
      textoConteudoKit(
        itens.map((item) => ({
          quantidade: item.quantidade,
          nome: item.produto.nome,
          santoNome: item.santos.find((s) => s.id === item.santoId)?.nome ?? null,
        })),
      ),
    );
  }

  async function salvarKit() {
    setErro(null);
    setTentouSalvar(true);
    if (!nome.trim()) return setErro('Informe o nome do kit.');
    if (!imagemNova && !imagemUrl) return setErro('Escolha a foto do kit.');
    if (itens.length === 0) return setErro('Adicione pelo menos um produto.');
    if (itens.some((item) => item.santos.length > 0 && !item.santoId)) return setErro('Escolha o santo dos produtos marcados.');

    try {
      let urlFinal = imagemUrl;
      if (imagemNova) {
        setEnviandoImagem(true);
        urlFinal = await enviarImagemParaStorage(imagemNova.uri, imagemNova.mimeType, 'kits');
        setEnviandoImagem(false);
        setImagemUrl(urlFinal);
        setImagemNova(null);
      }
      await salvar.mutateAsync({
        id: ehNovo ? null : id,
        nome: nome.trim(),
        descricao,
        imagemUrl: urlFinal,
        ativo,
        itens: itens.map((item) => ({ produtoId: item.produto.id, santoId: item.santoId, quantidade: item.quantidade })),
      });
      mostrarToast('Kit salvo!');
      router.back();
    } catch (e) {
      setEnviandoImagem(false);
      setErro(mensagemDeErro(e, 'Não foi possível salvar agora.'));
    }
  }

  function confirmarExclusao() {
    Alert.alert('Excluir kit', 'O kit some do app para todos os clientes. Os produtos continuam no catálogo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await excluir.mutateAsync(id);
            mostrarToast('Kit excluído.');
            router.back();
          } catch (e) {
            mostrarToast(mensagemDeErro(e, 'Não foi possível excluir.'));
          }
        },
      },
    ]);
  }

  if (!ehNovo && isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CabecalhoVoltar titulo="Kit" />
        <ActivityIndicator style={styles.carregando} />
      </SafeAreaView>
    );
  }

  const total = itens.reduce((soma, item) => soma + precoExibido(item.produto.preco, item.produto.preco_promocional) * item.quantidade, 0);
  const fotoExibida = imagemNova?.uri ?? imagemUrl;

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar
        titulo={ehNovo ? 'Novo kit' : 'Editar kit'}
        acao={
          !ehNovo ? (
            <Pressable onPress={confirmarExclusao} hitSlop={8}>
              <Ionicons name="trash-outline" size={22} color="#D64545" />
            </Pressable>
          ) : null
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={60}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ThemedText type="smallBold">Foto do kit</ThemedText>
          <Pressable onPress={escolherImagem} style={[styles.foto, !fotoExibida && styles.fotoVazia]}>
            {fotoExibida ? (
              <Image source={{ uri: fotoExibida }} style={styles.fotoImagem} contentFit="cover" />
            ) : (
              <View style={styles.fotoPlaceholder}>
                <Ionicons name="image-outline" size={28} color={BrandColors.fundoEscuro} />
                <ThemedText type="smallBold">Escolher da galeria</ThemedText>
              </View>
            )}
          </Pressable>

          <TextField rotulo="Nome do kit" value={nome} onChangeText={setNome} placeholder="Ex.: Kit Oração" />

          <View style={styles.linhaAtivo}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">Visível para clientes</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Desligado, o kit fica salvo mas não aparece no app.
              </ThemedText>
            </View>
            <Switch value={ativo} onValueChange={setAtivo} trackColor={{ true: BrandColors.fundoEscuro }} />
          </View>

          <ThemedText type="smallBold">Produtos do kit</ThemedText>
          {itens.map((item) => (
            <LinhaItemFormulario
              key={item.chave}
              item={item}
              destacarSanto={tentouSalvar}
              onAlterar={(mudanca) => atualizarItem(item.chave, mudanca)}
              onRemover={() => setItens((atual) => atual.filter((i) => i.chave !== item.chave))}
            />
          ))}
          <Button
            titulo="Adicionar produto"
            icone="add"
            variante="secundario"
            onPress={() => setBuscaAberta(true)}
            carregando={adicionandoProduto}
          />
          {itens.length > 0 ? (
            <ThemedText themeColor="textSecondary">Total do kit: {formatarReais(total)}</ThemedText>
          ) : null}

          <TextField
            rotulo="Descrição (aparece para o cliente)"
            value={descricao}
            onChangeText={setDescricao}
            placeholder={'Esse kit contém:\n1 vela\n1 terço\n1 capela MDF'}
            multiline
            style={styles.descricao}
          />
          {itens.length > 0 ? (
            <Button titulo="Preencher com os produtos do kit" icone="list" variante="texto" onPress={preencherDescricao} />
          ) : null}

          {erro ? <ThemedText style={styles.erro}>{erro}</ThemedText> : null}
          <Button titulo="Salvar kit" icone="checkmark" onPress={salvarKit} carregando={salvar.isPending || enviandoImagem} />
        </ScrollView>
      </KeyboardAvoidingView>

      <BuscaProdutoModal visivel={buscaAberta} onFechar={() => setBuscaAberta(false)} onEscolher={adicionarProduto} />
    </SafeAreaView>
  );
}

function LinhaItemFormulario({
  item,
  destacarSanto,
  onAlterar,
  onRemover,
}: {
  item: ItemFormulario;
  destacarSanto: boolean;
  onAlterar: (mudanca: Partial<ItemFormulario>) => void;
  onRemover: () => void;
}) {
  const faltaSanto = destacarSanto && item.santos.length > 0 && !item.santoId;
  return (
    <View style={[styles.item, faltaSanto && styles.itemErro]}>
      <View style={styles.itemTopo}>
        <Image source={{ uri: urlImagem(item.produto.imagem_principal, 'miniatura') }} style={styles.itemImagem} contentFit="cover" />
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {item.produto.nome}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatarReais(precoExibido(item.produto.preco, item.produto.preco_promocional))} cada
          </ThemedText>
        </View>
        <Pressable onPress={onRemover} hitSlop={8}>
          <Ionicons name="close-circle-outline" size={24} color="#D64545" />
        </Pressable>
      </View>

      {item.santos.length > 0 ? (
        <View style={styles.santos}>
          <ThemedText type="small" style={faltaSanto ? styles.erro : undefined} themeColor={faltaSanto ? undefined : 'textSecondary'}>
            {faltaSanto ? 'Escolha o santo:' : 'Santo:'}
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.santosLista}>
            {item.santos.map((santo) => {
              const selecionado = santo.id === item.santoId;
              return (
                <Pressable
                  key={santo.id}
                  style={[styles.santoChip, selecionado && styles.santoChipSelecionado]}
                  onPress={() => onAlterar({ santoId: santo.id })}>
                  <ThemedText type="small" style={selecionado ? styles.santoChipTextoSelecionado : undefined}>
                    {santo.nome}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.itemQuantidade}>
        <ThemedText type="small" themeColor="textSecondary">
          Quantidade
        </ThemedText>
        <SeletorQuantidade quantidade={item.quantidade} embalagem={item.produto.embalagem} onAlterar={(quantidade) => onAlterar({ quantidade })} />
      </View>
    </View>
  );
}

function BuscaProdutoModal({
  visivel,
  onFechar,
  onEscolher,
}: {
  visivel: boolean;
  onFechar: () => void;
  onEscolher: (produto: ProdutoResumo) => void;
}) {
  const [texto, setTexto] = useState('');
  const [termo, setTermo] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setTermo(texto), 400);
    return () => clearTimeout(timer);
  }, [texto]);

  const query = useProdutos({ tipo: 'busca', termo });
  const produtos = query.data?.pages.flatMap((pagina) => pagina.itens) ?? [];

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={onFechar}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.modalCabecalho}>
          <Pressable onPress={onFechar} hitSlop={8}>
            <Ionicons name="close" size={26} color={BrandColors.fundoEscuro} />
          </Pressable>
          <ThemedText type="title" style={styles.modalTitulo}>
            Adicionar produto
          </ThemedText>
        </View>
        <View style={styles.modalBusca}>
          <TextField value={texto} onChangeText={setTexto} autoFocus placeholder="Nome ou código do produto" icone="search" />
        </View>
        <FlatList
          data={produtos}
          keyExtractor={(produto) => produto.id}
          contentContainerStyle={styles.modalLista}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
          }}
          ListEmptyComponent={
            query.isFetching ? (
              <ActivityIndicator style={styles.carregando} />
            ) : (
              <ThemedText themeColor="textSecondary" style={styles.modalVazio}>
                {termo.trim() ? 'Nenhum produto encontrado' : 'Digite para buscar'}
              </ThemedText>
            )
          }
          renderItem={({ item: produto }) => (
            <Pressable style={styles.resultado} onPress={() => onEscolher(produto)}>
              <Image source={{ uri: urlImagem(produto.imagem_principal, 'miniatura') }} style={styles.itemImagem} contentFit="cover" />
              <View style={styles.flex}>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {produto.nome}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {produto.sku} · {formatarReais(precoExibido(produto.preco, produto.preco_promocional))}
                </ThemedText>
              </View>
              <Ionicons name="add-circle-outline" size={24} color={BrandColors.fundoEscuro} />
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  carregando: { marginTop: Spacing.five },
  scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  foto: { aspectRatio: 1, borderRadius: 12, overflow: 'hidden' },
  fotoVazia: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#C6C8D2' },
  fotoImagem: { width: '100%', height: '100%' },
  fotoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  linhaAtivo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  descricao: { minHeight: 110, textAlignVertical: 'top' },
  erro: { color: '#D64545' },
  item: { gap: Spacing.two, padding: Spacing.two, borderRadius: 10, borderWidth: 1, borderColor: '#E5E6EC' },
  itemErro: { borderColor: '#D64545' },
  itemTopo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  itemImagem: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#F3F1EB' },
  itemQuantidade: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  santos: { gap: Spacing.one },
  santosLista: { gap: Spacing.one },
  santoChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radii.pilula,
    borderWidth: 1,
    borderColor: '#C6C8D2',
  },
  santoChipSelecionado: { backgroundColor: BrandColors.fundoEscuro, borderColor: BrandColors.fundoEscuro },
  santoChipTextoSelecionado: { color: '#ffffff', fontWeight: '700' },
  modalCabecalho: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  modalTitulo: { fontSize: 18, color: BrandColors.fundoEscuro },
  modalBusca: { paddingHorizontal: Spacing.three, marginBottom: Spacing.two },
  modalLista: { padding: Spacing.three, gap: Spacing.two, flexGrow: 1 },
  modalVazio: { textAlign: 'center', marginTop: Spacing.four },
  resultado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
});
