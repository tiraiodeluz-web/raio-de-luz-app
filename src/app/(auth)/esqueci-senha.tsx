import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { emailValido } from '@/lib/mascaras';
import { supabase } from '@/lib/supabase';

export default function EsqueciSenhaScreen() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    setErro(null);
    if (!emailValido(email)) {
      setErro('Informe um e-mail válido.');
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('/(auth)/redefinir-senha'),
    });
    setEnviando(false);
    // Não revelamos se o e-mail existe ou não: sempre mostramos o aviso de sucesso.
    if (error && error.status && error.status >= 500) {
      setErro('Não foi possível enviar agora. Tente de novo em instantes.');
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.titulo}>
            Verifique seu e-mail
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.texto}>
            Se {email.trim()} tiver um cadastro, enviamos um link para redefinir a senha.
          </ThemedText>
          <Button titulo="Voltar ao login" onPress={() => router.replace('/(auth)/login')} />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.titulo}>
          Esqueci minha senha
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.texto}>
          Informe o e-mail do seu cadastro para receber o link de redefinição.
        </ThemedText>
        <TextField
          rotulo="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {erro ? <ThemedText style={styles.erro}>{erro}</ThemedText> : null}
        <Button titulo="Enviar" onPress={enviar} carregando={enviando} />
        <Button titulo="Voltar" variante="texto" onPress={() => router.back()} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.four, gap: Spacing.three },
  titulo: { fontSize: 28, lineHeight: 34 },
  texto: { marginBottom: Spacing.two },
  erro: { color: '#D64545' },
});
