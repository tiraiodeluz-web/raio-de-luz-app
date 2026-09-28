import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// Aberta pelo link "Esqueci minha senha" do e-mail (deep link raiodeluz://redefinir-senha).
// Repare: em Supabase → Authentication → URL Configuration, "raiodeluz://redefinir-senha"
// precisa estar na lista de Redirect URLs, senão o Supabase recusa o link.
export default function RedefinirSenhaScreen() {
  const url = Linking.useLinkingURL();
  const [sessaoPronta, setSessaoPronta] = useState(false);
  const [erroLink, setErroLink] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    (async () => {
      try {
        if (url.includes('code=')) {
          const codigo = new URLSearchParams(url.split('?')[1] ?? '').get('code');
          if (!codigo) throw new Error('sem código');
          const { error } = await supabase.auth.exchangeCodeForSession(codigo);
          if (error) throw error;
        } else if (url.includes('access_token=')) {
          const parametros = new URLSearchParams((url.split('#')[1] ?? url.split('?')[1] ?? '').replace(/^\?/, ''));
          const access_token = parametros.get('access_token');
          const refresh_token = parametros.get('refresh_token');
          if (!access_token || !refresh_token) throw new Error('sem token');
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        } else {
          return;
        }
        setSessaoPronta(true);
      } catch {
        setErroLink('Este link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".');
      }
    })();
  }, [url]);

  if (erroLink) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.erro}>{erroLink}</ThemedText>
          <Button titulo="Voltar ao login" onPress={() => router.replace('/(auth)/login')} />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!sessaoPronta) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText themeColor="textSecondary">Abrindo o link de redefinição...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return <FormularioNovaSenha />;
}

function FormularioNovaSenha() {
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  async function salvar() {
    setErro(null);
    if (senha.length < 6) {
      setErro('A senha precisa ter ao menos 6 caracteres.');
      return;
    }
    if (senha !== confirmar) {
      setErro('As senhas não conferem.');
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setConcluido(true);
  }

  if (concluido) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.titulo}>
            Senha alterada!
          </ThemedText>
          <Button
            titulo="Ir para o login"
            onPress={async () => {
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            }}
          />
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.titulo}>
          Nova senha
        </ThemedText>
        <TextField rotulo="Nova senha" value={senha} onChangeText={setSenha} secureTextEntry />
        <TextField rotulo="Confirmar nova senha" value={confirmar} onChangeText={setConfirmar} secureTextEntry />
        {erro ? <ThemedText style={styles.erro}>{erro}</ThemedText> : null}
        <Button titulo="Salvar" onPress={salvar} carregando={enviando} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.four, gap: Spacing.three },
  titulo: { fontSize: 28, lineHeight: 34 },
  erro: { color: '#D64545' },
});
