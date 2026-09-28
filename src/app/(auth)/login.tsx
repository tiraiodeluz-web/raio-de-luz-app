import { Image } from 'expo-image';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { BrasilApiError, buscarCnpj } from '@/lib/brasil-api';
import { apenasDigitos, cnpjValido, emailValido, mascararCnpj, mascararTelefone } from '@/lib/mascaras';
import { supabase } from '@/lib/supabase';

type Aba = 'entrar' | 'cadastrar';

export default function LoginScreen() {
  const { aba: abaInicial } = useLocalSearchParams<{ aba?: string }>();
  const [aba, setAba] = useState<Aba>(abaInicial === 'cadastrar' ? 'cadastrar' : 'entrar');

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={40}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} contentFit="contain" />

          <View style={styles.segmentado}>
            <SegmentoBotao titulo="Entrar" ativo={aba === 'entrar'} onPress={() => setAba('entrar')} />
            <SegmentoBotao titulo="Cadastrar" ativo={aba === 'cadastrar'} onPress={() => setAba('cadastrar')} />
          </View>

          {aba === 'entrar' ? <FormularioEntrar /> : <FormularioCadastrar />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SegmentoBotao({ titulo, ativo, onPress }: { titulo: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.segmento, ativo && styles.segmentoAtivo]} onPress={onPress}>
      <ThemedText type="smallBold" style={ativo ? styles.segmentoTextoAtivo : undefined}>
        {titulo}
      </ThemedText>
    </Pressable>
  );
}

function FormularioEntrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    setErro(null);
    if (!emailValido(email) || senha.length === 0) {
      setErro('Informe e-mail e senha válidos.');
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEnviando(false);
    if (error) {
      setErro('E-mail ou senha incorretos.');
    }
    // sessão + perfil carregados via AuthProvider; o guardião de rotas em
    // src/app/_layout.tsx decide para onde ir (Início, Aguardando aprovação ou "Ir para?")
  }

  return (
    <ThemedView style={styles.formulario}>
      <TextField
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry textContentType="password" />
      {erro ? <ThemedText style={styles.erro}>{erro}</ThemedText> : null}
      <Button titulo="Entrar" onPress={entrar} carregando={enviando} />
      <Link href="/(auth)/esqueci-senha" asChild>
        <Button titulo="Esqueci minha senha" variante="texto" />
      </Link>
    </ThemedView>
  );
}

function FormularioCadastrar() {
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cep, setCep] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [cnpjIndisponivel, setCnpjIndisponivel] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Busca razão social e CEP assim que o CNPJ estiver completo (14 dígitos).
  useEffect(() => {
    if (!cnpjValido(cnpj)) {
      setRazaoSocial('');
      setCnpjIndisponivel(false);
      return;
    }
    let ativo = true;
    setBuscandoCnpj(true);
    setErros((e) => ({ ...e, cnpj: '' }));

    (async () => {
      try {
        const digitos = apenasDigitos(cnpj);
        const [{ data: disponivel }, info] = await Promise.all([
          supabase.rpc('cnpj_disponivel', { p_cnpj: digitos }),
          buscarCnpj(digitos),
        ]);
        if (!ativo) return;
        if (disponivel === false) {
          setCnpjIndisponivel(true);
          setErros((e) => ({ ...e, cnpj: 'Este CNPJ já tem cadastro.' }));
          return;
        }
        setCnpjIndisponivel(false);
        setRazaoSocial(info.razaoSocial);
        setCep(info.cep);
        setCidade(info.cidade);
        setUf(info.uf);
      } catch (e) {
        if (!ativo) return;
        setErros((prev) => ({
          ...prev,
          cnpj: e instanceof BrasilApiError ? e.message : 'Não foi possível consultar o CNPJ.',
        }));
      } finally {
        if (ativo) setBuscandoCnpj(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [cnpj]);

  async function cadastrar() {
    setErroGeral(null);
    setSucesso(null);
    const novosErros: Record<string, string> = {};
    if (!nome.trim()) novosErros.nome = 'Informe o nome.';
    if (!cnpjValido(cnpj)) novosErros.cnpj = 'CNPJ inválido.';
    if (cnpjIndisponivel) novosErros.cnpj = 'Este CNPJ já tem cadastro.';
    if (apenasDigitos(celular).length < 10) novosErros.celular = 'Celular inválido.';
    if (!emailValido(email)) novosErros.email = 'E-mail inválido.';
    if (senha.length < 6) novosErros.senha = 'A senha precisa ter ao menos 6 caracteres.';
    if (senha !== confirmarSenha) novosErros.confirmarSenha = 'As senhas não conferem.';
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: {
          nome: nome.trim(),
          cnpj: apenasDigitos(cnpj),
          razao_social: razaoSocial,
          telefone: apenasDigitos(celular),
          cep,
          cidade,
          uf,
        },
      },
    });
    setEnviando(false);

    if (error) {
      setErroGeral(error.message === 'User already registered' ? 'Este e-mail já tem cadastro.' : error.message);
      return;
    }
    if (!data.session) {
      // Projeto exige confirmação por e-mail antes de liberar a sessão.
      setSucesso('Cadastro enviado! Confira seu e-mail para confirmar a conta antes de entrar.');
    }
    // Com sessão criada, o guardião de rotas manda para "Aguardando aprovação".
  }

  return (
    <ThemedView style={styles.formulario}>
      <TextField rotulo="Nome" value={nome} onChangeText={setNome} erro={erros.nome} />
      <TextField
        rotulo="CNPJ"
        value={mascararCnpj(cnpj)}
        onChangeText={(v) => setCnpj(apenasDigitos(v))}
        keyboardType="number-pad"
        erro={erros.cnpj}
      />
      <TextField
        rotulo="Razão social"
        value={razaoSocial}
        onChangeText={setRazaoSocial}
        placeholder={buscandoCnpj ? 'Consultando...' : 'Preenchida a partir do CNPJ'}
        editable={!buscandoCnpj}
      />
      <TextField
        rotulo="Celular"
        value={mascararTelefone(celular)}
        onChangeText={(v) => setCelular(apenasDigitos(v))}
        keyboardType="phone-pad"
        erro={erros.celular}
      />
      <TextField
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        erro={erros.email}
      />
      <TextField rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry erro={erros.senha} />
      <TextField
        rotulo="Confirmar senha"
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
        secureTextEntry
        erro={erros.confirmarSenha}
      />
      {erroGeral ? <ThemedText style={styles.erro}>{erroGeral}</ThemedText> : null}
      {sucesso ? <ThemedText style={styles.sucesso}>{sucesso}</ThemedText> : null}
      <Button titulo="Cadastrar" onPress={cadastrar} carregando={enviando} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.four, gap: Spacing.four },
  logo: { width: 96, height: 96, alignSelf: 'center' },
  segmentado: { flexDirection: 'row', gap: Spacing.two },
  segmento: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BrandColors.fundoEscuro,
  },
  segmentoAtivo: { backgroundColor: BrandColors.fundoEscuro },
  segmentoTextoAtivo: { color: '#ffffff' },
  formulario: { gap: Spacing.three },
  erro: { color: '#D64545' },
  sucesso: { color: '#1E8E3E' },
});
