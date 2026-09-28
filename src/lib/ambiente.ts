import Constants, { AppOwnership } from 'expo-constants';

// Expo Go (a partir do SDK 53) quebra só de importar 'expo-notifications' —
// o próprio módulo lança uma exceção na avaliação, antes de qualquer função
// ser chamada. Por isso esta constante fica num arquivo à parte, que NÃO
// importa expo-notifications: os lugares que precisam do módulo usam
// require() condicional (ver src/lib/notificacoes-push.ts), e só depois de
// checar RODANDO_NO_EXPO_GO aqui.
//
// Constants.appOwnership é a API depreciada, mas é a única forma direta de
// diferenciar o Expo Go de um development build de verdade (que suporta
// push normalmente) — executionEnvironment sozinho não distingue os dois.
export const RODANDO_NO_EXPO_GO = Constants.appOwnership === AppOwnership.Expo;
