import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { EstadoVazio } from '@/components/estado-vazio';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { WhatsAppFlutuante } from '@/components/whatsapp-flutuante';
import { BrandColors, Spacing } from '@/constants/theme';
import { BrasilApiError, buscarCep } from '@/lib/brasil-api';
import { calcularSubtotalCarrinho, useCriarPedido, useItensCarrinho, validarCupom, type CupomValidado } from '@/lib/carrinho';
import { useEnderecoPrincipal, useSalvarEndereco } from '@/lib/enderecos';
import { formatarReais } from '@/lib/formatacao';
import { apenasDigitos, mascararCep } from '@/lib/mascaras';
import { abrirWhatsAppPedido } from '@/lib/whatsapp';

export default function CheckoutScreen() {
  const { cupom: cupomParam } = useLocalSearchParams<{ cupom?: string }>();
  const { data: itens, isLoading: carregandoCarrinho } = useItensCarrinho();
  const enderecoPrincipal = useEnderecoPrincipal();
  const salvarEndereco = useSalvarEndereco();
  const criarPedido = useCriarPedido();

  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [complemento, setComplemento] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const [cupom, setCupom] = useState<CupomValidado | null>(null);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<{ numero: number } | null>(null);

  // Regra 9: sugere o endereço salvo nos próximos pedidos.
  useEffect(() => {
    const e = enderecoPrincipal.data;
    if (!e) return;
    setCep(e.cep);
    setRua(e.rua);
    setNumero(e.numero);
    setBairro(e.bairro);
    setComplemento(e.complemento ?? '');
    setCidade(e.cidade);
    setUf(e.estado);
  }, [enderecoPrincipal.data]);

  useEffect(() => {
    if (!cupomParam) return;
    validarCupom(cupomParam).then(setCupom).catch(() => setCupom(null));
  }, [cupomParam]);

  useEffect(() => {
    if (apenasDigitos(cep).length !== 8) return;
    let ativo = true;
    setBuscandoCep(true);
    buscarCep(cep)
      .then((info) => {
        if (!ativo) return;
        setRua((atual) => atual || info.rua);
        setBairro((atual) => atual || info.bairro);
        setCidade(info.cidade);
        setUf(info.uf);
        setErros((prev) => ({ ...prev, cep: '' }));
      })
      .catch((e) => {
        if (!ativo) return;
        setErros((prev) => ({ ...prev, cep: e instanceof BrasilApiError ? e.message : 'Não foi possível consultar o CEP.' }));
      })
      .finally(() => ativo && setBuscandoCep(false));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cep]);

  if (carregandoCarrinho) return null;

  if (pedidoConfirmado) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.confirmacao}>
          <ThemedText type="title" style={styles.tituloConfirmacao}>
            Pedido Nº {pedidoConfirmado.numero} realizado!
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.textoConfirmacao}>
            Continue pelo WhatsApp para combinar pagamento e frete.
          </ThemedText>
          <Button titulo="Abrir WhatsApp" onPress={() => abrirWhatsAppPedido(pedidoConfirmado.numero)} />
          <Button titulo="Ir para o início" variante="texto" onPress={() => router.replace('/(tabs)')} />
        </View>
      </SafeAreaView>
    );
  }

  const listaItens = itens ?? [];
  if (listaItens.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CabecalhoVoltar titulo="Checkout" />
        <EstadoVazio icone="cart-outline" titulo="Seu carrinho está vazio" />
      </SafeAreaView>
    );
  }

  const subtotal = calcularSubtotalCarrinho(listaItens);
  const desconto = cupom ? Math.min(cupom.valor, subtotal) : 0;
  const total = subtotal - desconto;

  async function confirmarPedido() {
    setErroGeral(null);
    const novosErros: Record<string, string> = {};
    if (apenasDigitos(cep).length !== 8) novosErros.cep = 'CEP inválido.';
    if (!rua.trim()) novosErros.rua = 'Informe a rua.';
    if (!numero.trim()) novosErros.numero = 'Informe o número.';
    if (!bairro.trim()) novosErros.bairro = 'Informe o bairro.';
    if (!cidade.trim() || !uf.trim()) novosErros.cep = 'Informe um CEP válido para preencher cidade e UF.';
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    try {
      const endereco = await salvarEndereco.mutateAsync({
        id: enderecoPrincipal.data?.id ?? null,
        dados: {
          cep: apenasDigitos(cep),
          rua: rua.trim(),
          numero: numero.trim(),
          bairro: bairro.trim(),
          complemento: complemento.trim() || null,
          cidade,
          estado: uf,
        },
      });
      const resultado = await criarPedido.mutateAsync({ enderecoId: endereco.id, cupom: cupom?.codigo });
      if (resultado) {
        setPedidoConfirmado({ numero: Number(resultado.numero) });
        abrirWhatsAppPedido(Number(resultado.numero));
      }
    } catch (erro) {
      setErroGeral(erro instanceof Error ? erro.message : 'Não foi possível confirmar o pedido agora.');
    }
  }

  const enviando = salvarEndereco.isPending || criarPedido.isPending;

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Checkout" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={60}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.secaoTitulo}>
            <Ionicons name="location" size={18} color={BrandColors.fundoEscuro} />
            <ThemedText type="smallBold">Endereço de Entrega</ThemedText>
          </View>
          <TextField
            rotulo="CEP"
            value={mascararCep(cep)}
            onChangeText={(v) => setCep(apenasDigitos(v))}
            keyboardType="number-pad"
            erro={erros.cep}
            placeholder={buscandoCep ? 'Consultando...' : '00000-000'}
          />
          <TextField rotulo="Rua" value={rua} onChangeText={setRua} placeholder="Rua" erro={erros.rua} />
          <View style={styles.linha}>
            <View style={styles.colunaCurta}>
              <TextField rotulo="Número" value={numero} onChangeText={setNumero} placeholder="Número" erro={erros.numero} />
            </View>
            <View style={styles.colunaLonga}>
              <TextField
                rotulo="Complemento/referência"
                value={complemento}
                onChangeText={setComplemento}
                placeholder="Opcional"
              />
            </View>
          </View>
          <TextField rotulo="Bairro" value={bairro} onChangeText={setBairro} placeholder="Bairro" erro={erros.bairro} />
          <View style={styles.linha}>
            <View style={styles.colunaLonga}>
              <TextField rotulo="Cidade" value={cidade} editable={false} placeholder="Preenchida pelo CEP" />
            </View>
            <View style={styles.colunaCurta}>
              <TextField rotulo="UF" value={uf} editable={false} placeholder="—" />
            </View>
          </View>

          <View style={styles.resumo}>
            <ThemedText type="smallBold" style={styles.resumoTitulo}>
              Resumo do Pedido
            </ThemedText>
            <LinhaResumo rotulo="Forma de pagamento" valor="A COMBINAR" destaqueDourado />
            <LinhaResumo rotulo="Frete" valor="A COMBINAR" destaqueDourado />
            <View style={styles.separador} />
            <LinhaResumo rotulo="Subtotal" valor={formatarReais(subtotal)} />
            {desconto > 0 ? <LinhaResumo rotulo="Desconto" valor={`− ${formatarReais(desconto)}`} /> : null}
            <LinhaResumo rotulo="Total" valor={formatarReais(total)} destaque />
          </View>

          {erroGeral ? <ThemedText style={styles.erro}>{erroGeral}</ThemedText> : null}
          <Button titulo="Confirmar Pedido" icone="checkmark-done" onPress={confirmarPedido} carregando={enviando} />
        </ScrollView>
      </KeyboardAvoidingView>
      <WhatsAppFlutuante />
    </SafeAreaView>
  );
}

function LinhaResumo({
  rotulo,
  valor,
  destaque,
  destaqueDourado,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  destaqueDourado?: boolean;
}) {
  return (
    <View style={styles.linhaResumo}>
      <ThemedText type={destaque ? 'smallBold' : 'small'} themeColor={destaque ? undefined : 'textSecondary'}>
        {rotulo}
      </ThemedText>
      <ThemedText type={destaque || destaqueDourado ? 'smallBold' : 'small'} style={destaqueDourado ? styles.valorDourado : undefined}>
        {valor}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  secaoTitulo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  linha: { flexDirection: 'row', gap: Spacing.two },
  colunaCurta: { width: 110 },
  colunaLonga: { flex: 1 },
  resumo: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E6EC',
  },
  resumoTitulo: { color: BrandColors.fundoEscuro, marginBottom: Spacing.one },
  separador: { height: 1, backgroundColor: '#E5E6EC', marginVertical: Spacing.one },
  linhaResumo: { flexDirection: 'row', justifyContent: 'space-between' },
  valorDourado: { color: BrandColors.dourado },
  erro: { color: '#D64545' },
  confirmacao: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.four, gap: Spacing.three },
  tituloConfirmacao: { fontSize: 24, lineHeight: 30 },
  textoConfirmacao: { marginBottom: Spacing.two },
});
