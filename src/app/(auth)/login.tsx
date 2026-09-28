import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Radii, Spacing } from '@/constants/theme';
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
          <LogoMarca />

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

// TODO: trocar por <Image> com o logo real (PNG transparente) quando o
// arquivo chegar — por ora recria o texto do print em fontes do sistema.
function LogoMarca() {
  return (
    <View style={styles.logoContainer}>
      <ThemedText style={styles.logoTitulo}>RAIO DE LUZ</ThemedText>
      <View style={styles.logoLinha} />
      <ThemedText style={styles.logoSubtitulo}>RELIGIOSOS</ThemedText>
      <ThemedText style={styles.logoSlogan}>Inspiração e Fé em cada detalhe!</ThemedText>
    </View>
  );
}

function SegmentoBotao({ titulo, ativo, onPress }: { titulo: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.segmento, ativo && styles.segmentoAtivo]} onPress={onPress}>
      <ThemedText type="smallBold" style={ativo ? styles.segmentoTextoAtivo : styles.segmentoTextoInativo}>
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
    <View style={styles.formulario}>
      <TextField
        rotulo="E-mail"
        icone="mail-outline"
        claro
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        rotulo="Senha"
        icone="lock-closed-outline"
        claro
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        textContentType="password"
      />
      {erro ? <ThemedText style={styles.erro}>{erro}</ThemedText> : null}
      <Link href="/(auth)/esqueci-senha" asChild>
        <Pressable style={styles.linkCentralizado}>
          <ThemedText style={styles.linkClaro}>Esqueci minha senha</ThemedText>
        </Pressable>
      </Link>
      <Button titulo="Entrar" onPress={entrar} carregando={enviando} />
    </View>
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
    <View style={styles.formulario}>
      <TextField rotulo="Nome" icone="person-outline" claro value={nome} onChangeText={setNome} erro={erros.nome} />
      <TextField
        rotulo="CNPJ"
        icone="business-outline"
        claro
        value={mascararCnpj(cnpj)}
        onChangeText={(v) => setCnpj(apenasDigitos(v))}
        keyboardType="number-pad"
        placeholder="Somente números"
        erro={erros.cnpj}
      />
      <TextField
        rotulo="Razão Social"
        icone="business-outline"
        claro
        value={razaoSocial}
        onChangeText={setRazaoSocial}
        placeholder={buscandoCnpj ? 'Consultando...' : 'Digite a razão social da empresa'}
        editable={!buscandoCnpj}
      />
      <TextField
        rotulo="Celular"
        icone="call-outline"
        claro
        value={mascararTelefone(celular)}
        onChangeText={(v) => setCelular(apenasDigitos(v))}
        keyboardType="phone-pad"
        erro={erros.celular}
      />
      <TextField
        rotulo="E-mail"
        icone="mail-outline"
        claro
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        erro={erros.email}
      />
      <TextField
        rotulo="Senha"
        icone="lock-closed-outline"
        claro
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        erro={erros.senha}
      />
      <TextField
        rotulo="Confirme sua senha"
        icone="lock-closed-outline"
        claro
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
        secureTextEntry
        erro={erros.confirmarSenha}
      />
      {erroGeral ? <ThemedText style={styles.erro}>{erroGeral}</ThemedText> : null}
      {sucesso ? <ThemedText style={styles.sucesso}>{sucesso}</ThemedText> : null}
      <Button titulo="Registrar" onPress={cadastrar} carregando={enviando} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BrandColors.fundoEscuro },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.four, gap: Spacing.four },
  logoContainer: { alignItems: 'center', gap: Spacing.one, marginBottom: Spacing.two },
  logoTitulo: { color: '#ffffff', fontSize: 30, fontWeight: '700', letterSpacing: 1 },
  logoLinha: { width: 160, height: 1, backgroundColor: '#ffffff88', marginVertical: Spacing.half },
  logoSubtitulo: { color: '#ffffff', fontSize: 16, fontWeight: '600', letterSpacing: 3 },
  logoSlogan: { color: '#ffffffcc', fontStyle: 'italic', fontSize: 12, marginTop: Spacing.half },
  segmentado: { flexDirection: 'row', backgroundColor: '#E4E5EA', borderRadius: Radii.pilula, padding: 4, gap: 4 },
  segmento: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pilula,
  },
  segmentoAtivo: { backgroundColor: BrandColors.fundoEscuro },
  segmentoTextoAtivo: { color: '#ffffff' },
  segmentoTextoInativo: { color: BrandColors.fundoEscuro },
  formulario: { gap: Spacing.three, marginTop: Spacing.three },
  linkCentralizado: { alignSelf: 'center', paddingVertical: Spacing.one },
  linkClaro: { color: '#ffffff', textDecorationLine: 'underline' },
  erro: { color: '#FF8A8A' },
  sucesso: { color: '#8DE0A6' },
});
