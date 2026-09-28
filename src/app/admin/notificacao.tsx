import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminCabecalho } from '@/components/admin-cabecalho';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useEnviarNotificacao } from '@/lib/admin';

export default function EnviarNotificacaoScreen() {
  const [titulo, setTitulo] = useState('');
  const [legenda, setLegenda] = useState('');
  const [corpo, setCorpo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const enviar = useEnviarNotificacao();

  async function enviarNotificacao() {
    setErro(null);
    if (!titulo.trim() || !corpo.trim()) {
      setErro('Preencha ao menos o título e o corpo.');
      return;
    }
    try {
      await enviar.mutateAsync({ titulo: titulo.trim(), legenda: legenda.trim(), corpo: corpo.trim() });
      setTitulo('');
      setLegenda('');
      setCorpo('');
      Alert.alert('Enviado', 'A notificação foi enviada para todos os clientes.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar agora.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AdminCabecalho titulo="Enviar notificação" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={60}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TextField rotulo="Título" value={titulo} onChangeText={setTitulo} placeholder="Título" icone="text-outline" />
          <TextField rotulo="Subtítulo" value={legenda} onChangeText={setLegenda} placeholder="Opcional" icone="text-outline" />
          <TextField rotulo="Corpo" value={corpo} onChangeText={setCorpo} placeholder="Mensagem" multiline numberOfLines={4} style={styles.corpo} />
          {erro ? <ThemedText style={styles.erro}>{erro}</ThemedText> : null}
          <Button titulo="Enviar para todos" icone="megaphone" onPress={enviarNotificacao} carregando={enviar.isPending} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  flex: { flex: 1 },
  scroll: { padding: Spacing.three, gap: Spacing.three },
  corpo: { minHeight: 100, textAlignVertical: 'top' },
  erro: { color: '#D64545' },
});
