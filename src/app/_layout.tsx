import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { RODANDO_NO_EXPO_GO } from '@/lib/notificacoes-push';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <GuardiaoDeRotas />
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
      {/* Expo Go (SDK 53+) não suporta as APIs nativas de notificação — nem
          chamá-las. RODANDO_NO_EXPO_GO é fixo durante toda a vida do app,
          então montar/desmontar este componente condicionalmente aqui é
          seguro (nunca alterna, não quebra a ordem dos hooks). */}
      {!RODANDO_NO_EXPO_GO ? <TratadorDeNotificacoes carregando={carregando} router={router} /> : null}
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
