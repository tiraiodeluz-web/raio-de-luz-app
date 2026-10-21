import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider, usePathname, useRouter, useSegments, type ErrorBoundaryProps, type Href } from 'expo-router';
// Import só de tipos — não gera um require() real no bundle (ver
// src/lib/ambiente.ts e notificacoes-push.ts para o porquê).
import type * as NotificationsType from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { RODANDO_NO_EXPO_GO } from '@/lib/ambiente';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { useSincronizarCarrinhoOffline } from '@/lib/carrinho-offline';
import { definirTelaAtual, instalarMonitorGlobal, registrarErro } from '@/lib/monitor-erros';
import { ToastProvider } from '@/lib/toast-context';

SplashScreen.preventAutoHideAsync();
instalarMonitorGlobal();

const queryClient = new QueryClient();

// Erro de render em qualquer tela: registra pro admin ver e mostra uma tela
// amigável em vez de fechar o app. Fica fora dos providers (por isso usa só
// componentes básicos e o supabase direto).
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    void registrarErro(error, 'tela', true);
  }, [error]);

  return (
    <View style={estilosErro.container}>
      <Text style={estilosErro.titulo}>Ops! Algo deu errado nesta tela.</Text>
      <Text style={estilosErro.texto}>O problema já foi registrado para a nossa equipe. Tente de novo.</Text>
      <Pressable onPress={retry} style={estilosErro.botao} accessibilityRole="button">
        <Text style={estilosErro.botaoTexto}>Tentar de novo</Text>
      </Pressable>
    </View>
  );
}

const estilosErro = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: '#ffffff' },
  titulo: { fontSize: 18, fontWeight: '700', color: '#010534', textAlign: 'center' },
  texto: { fontSize: 15, color: '#4A4D5A', textAlign: 'center' },
  botao: { marginTop: 8, backgroundColor: '#010534', borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14 },
  botaoTexto: { color: '#ffffff', fontWeight: '700' },
});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* O app não tem dark mode de verdade (fundo branco fixo em quase
            toda tela) — forçar DefaultTheme evita header/tab bar do sistema
            virarem escuros e descasarem do resto da UI quando o celular
            está em modo escuro. */}
        <ThemeProvider value={DefaultTheme}>
          <ToastProvider>
            <GuardiaoDeRotas />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Decide, a cada mudança de sessão/perfil/rota, se a tela atual é permitida:
// - cadastro pendente (tipo cliente, não aprovado) só pode estar em Aguardando aprovação
// - admin sem "Ir para?" escolhido só pode estar em Escolher modo
// - já autenticado e liberado não deveria estar em Login/Cadastro
// Fora isso, navegação é livre — a Home e os Catálogos continuam abertos sem login (regra 2).
function GuardiaoDeRotas() {
  const { session, perfil, carregando, modoAcesso } = useAuth();
  // Tipagem de rotas do Expo Router gera tuplas por rota válida; aqui só
  // precisamos ler os dois primeiros segmentos como texto de qualquer rota.
  const segments = useSegments() as string[];
  const router = useRouter();
  const pathname = usePathname();

  useSincronizarCarrinhoOffline(!!session);

  useEffect(() => {
    definirTelaAtual(pathname);
  }, [pathname]);

  useEffect(() => {
    if (carregando) return;

    const grupo = segments[0];
    const tela = segments[1];

    const precisaAguardarAprovacao = !!session && perfil?.tipo === 'cliente' && !perfil.cadastro_aprovado;
    const precisaEscolherModo = !!session && perfil?.tipo === 'admin' && !modoAcesso;
    const liberadoParaComprar = !!session && !precisaAguardarAprovacao && !precisaEscolherModo;

    if (precisaAguardarAprovacao && tela !== 'aguardando-aprovacao') {
      router.replace('/(auth)/aguardando-aprovacao');
      return;
    }
    if (precisaEscolherModo && tela !== 'escolher-modo') {
      router.replace('/(auth)/escolher-modo');
      return;
    }
    // "redefinir-senha" fica de fora: o link de recuperação cria uma sessão válida
    // mesmo para quem já está aprovado, e a própria tela decide quando sair de lá.
    const telasQueSaemAoLiberar = new Set(['login', 'esqueci-senha', 'escolher-modo', undefined]);
    if (liberadoParaComprar && grupo === '(auth)' && telasQueSaemAoLiberar.has(tela)) {
      router.replace('/(tabs)');
    }
  }, [carregando, session, perfil, modoAcesso, segments, router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      {/* Expo Go (SDK 53+) quebra só de importar expo-notifications — nem
          chega a chamar nada. RODANDO_NO_EXPO_GO é fixo durante toda a vida
          do app, então montar/desmontar este componente condicionalmente
          aqui é seguro (nunca alterna, não quebra a ordem dos hooks), e é
          o que evita o require() do módulo problemático no Expo Go. */}
      {/* Na web (usada só para pré-visualizar telas) não existe push. */}
      {!RODANDO_NO_EXPO_GO && Platform.OS !== 'web' ? (
        <TratadorDeNotificacoes carregando={carregando} router={router} />
      ) : null}
    </>
  );
}

// Toque numa notificação (app em segundo plano ou fechado — "cold start")
// navega para a rota gravada em eventos_push.rota, já com os placeholders
// substituídos pelo banco (ex.: /pedido/<uuid>).
function TratadorDeNotificacoes({
  carregando,
  router,
}: {
  carregando: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Notifications = require('expo-notifications') as typeof NotificationsType;
  const resposta = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (carregando || !resposta) return;
    const rota = resposta.notification.request.content.data?.rota;
    Notifications.clearLastNotificationResponse();
    if (typeof rota === 'string' && rota.length > 0) {
      router.push(rota as Href);
    }
  }, [carregando, resposta, router]);

  return null;
}
