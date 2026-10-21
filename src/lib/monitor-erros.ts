import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Monitor de erros caseiro: grava em public.erros_app (admin lê em
// Admin → Erros do app). Sem serviço externo — pega erros de JavaScript,
// que são a maioria; travamento nativo (raro) não chega aqui.
type Origem = 'tela' | 'global' | 'manual';

let telaAtual: string | null = null;
const recentes = new Map<string, number>();
const JANELA_REPETICAO_MS = 60_000;

export function definirTelaAtual(rota: string) {
  telaAtual = rota;
}

function versaoApp(): string {
  const versao = Constants.expoConfig?.version ?? '?';
  return __DEV__ ? `${versao} (dev)` : versao;
}

export async function registrarErro(erro: unknown, origem: Origem, fatal = false): Promise<void> {
  try {
    const comoErro = erro instanceof Error ? erro : new Error(typeof erro === 'string' ? erro : JSON.stringify(erro));
    const mensagem = (comoErro.message || 'Erro sem mensagem').slice(0, 2000);

    // O mesmo erro repetindo em loop (ex.: num render) vira um registro só por minuto.
    const chave = `${mensagem}|${telaAtual}`;
    const agora = Date.now();
    if ((recentes.get(chave) ?? 0) > agora - JANELA_REPETICAO_MS) return;
    recentes.set(chave, agora);

    await supabase.from('erros_app').insert({
      mensagem,
      stack: comoErro.stack?.slice(0, 8000) ?? null,
      tela: telaAtual,
      origem,
      fatal,
      plataforma: `${Platform.OS} ${Platform.Version}`,
      versao_app: versaoApp(),
    });
  } catch {
    // O monitor nunca pode derrubar o app.
  }
}

type ErrorUtilsGlobal = {
  getGlobalHandler: () => (erro: unknown, fatal?: boolean) => void;
  setGlobalHandler: (handler: (erro: unknown, fatal?: boolean) => void) => void;
};

let instalado = false;

// Erros fora de render (botão, efeito, promessa que estoura) passam pelo
// handler global do React Native; o ErrorBoundary do _layout pega os de render.
export function instalarMonitorGlobal() {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsGlobal }).ErrorUtils;
  if (instalado || !errorUtils) return;
  instalado = true;
  const anterior = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((erro, fatal) => {
    void registrarErro(erro, 'global', !!fatal);
    anterior(erro, fatal);
  });
}
