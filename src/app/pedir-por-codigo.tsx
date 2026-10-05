import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useAdicionarPorCodigos } from '@/lib/carrinho';

// Pra quem já tem a lista anotada em outro lugar (WhatsApp, papel, o PDF do
// catálogo) e não quer navegar produto por produto. Um código por linha,
// quantidade opcional com "x" (ver parseCodigos em lib/carrinho.ts — não
// vírgula, de propósito, pra não ter ambiguidade com número solto).
// Produtos personalizáveis (que pedem escolha de santo) não dá pra resolver
// só pelo código — ficam de fora com aviso, igual produto não encontrado.
const EXEMPLO = 'CH.032\nAD.025 x3\nCH.008-1';

export default function PedirPorCodigoScreen() {
  const { session } = useAuth();
  const [texto, setTexto] = useState('');
  const adicionar = useAdicionarPorCodigos();

  async function enviar() {
    if (!session) {
      router.push('/(auth)/login');
      return;
    }
    if (!texto.trim()) return;
    try {
      const resultado = await adicionar.mutateAsync(texto);
      const partes: string[] = [];
      if (resultado.adicionados > 0) partes.push(`${resultado.adicionados} produto(s) adicionados ao carrinho.`);
      if (resultado.naoEncontrados.length > 0) partes.push(`Não encontrados: ${resultado.naoEncontrados.join(', ')}.`);
      if (resultado.personalizaveis.length > 0) {
        partes.push(`Precisam de santo escolhido na página do produto: ${resultado.personalizaveis.join(', ')}.`);
      }
      if (resultado.adicionados === 0) {
        Alert.alert('Nada adicionado', partes.join('\n\n') || 'Nenhum código válido encontrado.');
        return;
      }
      setTexto('');
      Alert.alert('Pronto', partes.join('\n\n'), [
        { text: 'Continuar', style: 'cancel' },
        { text: 'Ir para o carrinho', onPress: () => router.push('/(tabs)/carrinho') },
      ]);
    } catch (e) {
      Alert.alert('Não foi possível', e instanceof Error ? e.message : 'Tente novamente.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Adicionar por código" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={60}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText themeColor="textSecondary">
            Cole ou digite os códigos dos produtos, um por linha. Pra pedir mais de uma unidade, escreva a
            quantidade depois: "AD.025 x3".
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.exemplo} onPress={() => setTexto(EXEMPLO)}>
            Exemplo (toque para usar):{'\n'}
            {EXEMPLO}
          </ThemedText>

          <TextField
            rotulo="Códigos"
            value={texto}
            onChangeText={setTexto}
            placeholder={'CH.032\nAD.025 x3'}
            multiline
            numberOfLines={8}
            autoCapitalize="characters"
            style={styles.campo}
          />

          <Button
            titulo="Adicionar ao carrinho"
            icone="cart"
            onPress={enviar}
            carregando={adicionar.isPending}
            disabled={!texto.trim()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scroll: { padding: Spacing.three, gap: Spacing.three },
  exemplo: { fontStyle: 'italic' },
  campo: { minHeight: 140, textAlignVertical: 'top' },
});
