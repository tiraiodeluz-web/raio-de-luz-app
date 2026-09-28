import Constants from 'expo-constants';
import * as Device from 'expo-device';
// Import só de tipos: não gera um require() real no bundle, então não
// dispara o crash do Expo Go (ver ambiente.ts). O módulo em si só é
// carregado (via require() lá embaixo) depois de checar RODANDO_NO_EXPO_GO.
import type * as NotificationsType from 'expo-notifications';
import { Platform } from 'react-native';

import { RODANDO_NO_EXPO_GO } from '@/lib/ambiente';
import { supabase } from '@/lib/supabase';

function carregarNotifications(): typeof NotificationsType {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications');
}

// Canal Android usado pela Edge Function processar-fila-push (channelId:
// "padrao"). Sem criar o canal aqui, o Android não sabe como notificar
// (nem toca som) numa mensagem "data-only" via FCM.
const CANAL_ANDROID = 'padrao';

export async function configurarNotificacoes() {
  if (RODANDO_NO_EXPO_GO) return;
  const Notifications = carregarNotifications();

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
      name: 'Raio de Luz',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

// Guarda o último token registrado nesta sessão do app, só para conseguir
// desativá-lo no banco quando o usuário sai (ver removerDispositivoAtual).
let tokenAtual: string | null = null;

// Regra: "o app pede permissão... proponho pedir após o login". Chamado
// pelo AuthProvider sempre que há uma sessão — não incomoda quem já
// respondeu (o SO só pergunta uma vez) e garante que quem ainda está
// aguardando aprovação já fica registrado pra receber o push de aprovado.
export async function registrarDispositivoPush() {
  if (RODANDO_NO_EXPO_GO) return;

  try {
    // Simulador/emulador não tem push de verdade e getExpoPushTokenAsync falha.
    if (!Device.isDevice) return;

    const Notifications = carregarNotifications();
    const permissaoAtual = await Notifications.getPermissionsAsync();
    let concedida = permissaoAtual.granted;
    if (!concedida && permissaoAtual.canAskAgain) {
      const pedida = await Notifications.requestPermissionsAsync();
      concedida = pedida.granted;
    }
    if (!concedida) return;

    // Sem projeto EAS configurado ainda (pendente — ver README), não tem
    // como pedir o token Expo: a chamada abaixo precisa do projectId.
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('[push] EXPO_PUBLIC não achou extra.eas.projectId — configure o EAS antes de testar push.');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    tokenAtual = token;

    const plataforma = Platform.OS === 'ios' ? 'ios' : 'android';
    const { error } = await supabase.rpc('registrar_dispositivo', { p_token: token, p_plataforma: plataforma });
    if (error) console.warn('[push] falha ao registrar dispositivo:', error.message);
  } catch (erro) {
    console.warn('[push] falha ao registrar dispositivo:', erro);
  }
}

// Chamado ao sair (não apaga o histórico, só marca este aparelho como
// inativo para esta conta — cada login registra de novo).
export async function removerDispositivoAtual() {
  if (RODANDO_NO_EXPO_GO || !tokenAtual) return;
  try {
    await supabase.rpc('remover_dispositivo', { p_token: tokenAtual });
  } catch (erro) {
    console.warn('[push] falha ao remover dispositivo:', erro);
  } finally {
    tokenAtual = null;
  }
}
