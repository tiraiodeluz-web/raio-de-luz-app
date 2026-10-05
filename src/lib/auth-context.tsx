import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { configurarNotificacoes, registrarDispositivoPush, removerDispositivoAtual } from '@/lib/notificacoes-push';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Perfil = Tables<'perfis'>;

// Escolha feita na tela "Ir para?" (só admins veem essa tela). Fica só na
// memória: a cada novo login o admin escolhe de novo.
export type ModoAcesso = 'admin' | 'cliente' | null;

type AuthContextValue = {
  session: Session | null;
  perfil: Perfil | null;
  carregando: boolean;
  modoAcesso: ModoAcesso;
  escolherModo: (modo: Exclude<ModoAcesso, null>) => void;
  atualizarPerfil: () => Promise<void>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Regra 12: cliente é "online" se ultimo_acesso foi há menos de 5 minutos
// (ver clienteOnline em lib/admin.ts) — então, enquanto a sessão existir,
// isso precisa ser renovado periodicamente, não só uma vez na abertura.
const INTERVALO_ULTIMO_ACESSO_MS = 4 * 60 * 1000;

function marcarUltimoAcesso(userId: string) {
  supabase
    .from('perfis')
    .update({ ultimo_acesso: new Date().toISOString() })
    .eq('id', userId)
    .then(() => {});
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modoAcesso, setModoAcesso] = useState<ModoAcesso>(null);
  const userIdRef = useRef<string | null>(null);

  const buscarPerfil = useCallback(async (userId: string) => {
    const { data } = await supabase.from('perfis').select('*').eq('id', userId).single();
    setPerfil(data ?? null);
  }, []);

  useEffect(() => {
    configurarNotificacoes();
  }, []);

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      if (data.session) {
        userIdRef.current = data.session.user.id;
        await buscarPerfil(data.session.user.id);
        marcarUltimoAcesso(data.session.user.id);
        // Etapa 8: registra o token de push. Mesmo cadastro pendente precisa
        // estar registrado pra receber o push de "cadastro aprovado".
        registrarDispositivoPush();
      }
      setCarregando(false);
    });

    const { data: assinatura } = supabase.auth.onAuthStateChange(async (_evento, novaSessao) => {
      if (!ativo) return;
      setSession(novaSessao);
      if (novaSessao) {
        userIdRef.current = novaSessao.user.id;
        await buscarPerfil(novaSessao.user.id);
        // Login novo (ou sessão restaurada fora do getSession inicial) também
        // conta como acesso — sem isso, quem loga pela primeira vez na sessão
        // do app nunca aparecia como "online" pro admin.
        marcarUltimoAcesso(novaSessao.user.id);
        registrarDispositivoPush();
      } else {
        userIdRef.current = null;
        setPerfil(null);
        setModoAcesso(null);
      }
    });

    // Renova ultimo_acesso periodicamente enquanto o app fica aberto, e
    // também ao voltar do background — sem isso, quem usa o app continuamente
    // por mais de 5 minutos "cai" pra offline mesmo estando na tela.
    const intervalo = setInterval(() => {
      if (userIdRef.current) marcarUltimoAcesso(userIdRef.current);
    }, INTERVALO_ULTIMO_ACESSO_MS);

    const assinaturaAppState = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && userIdRef.current) marcarUltimoAcesso(userIdRef.current);
    });

    return () => {
      ativo = false;
      assinatura.subscription.unsubscribe();
      clearInterval(intervalo);
      assinaturaAppState.remove();
    };
  }, [buscarPerfil]);

  const atualizarPerfil = useCallback(async () => {
    if (session) await buscarPerfil(session.user.id);
  }, [session, buscarPerfil]);

  const sair = useCallback(async () => {
    await removerDispositivoAtual();
    await supabase.auth.signOut();
  }, []);

  const valor = useMemo<AuthContextValue>(
    () => ({ session, perfil, carregando, modoAcesso, escolherModo: setModoAcesso, atualizarPerfil, sair }),
    [session, perfil, carregando, modoAcesso, atualizarPerfil, sair],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
