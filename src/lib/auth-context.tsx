import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modoAcesso, setModoAcesso] = useState<ModoAcesso>(null);

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
        await buscarPerfil(data.session.user.id);
        // Regra 12: o último acesso é atualizado ao abrir o app (define quem
        // está "online" para a tela Clientes do admin).
        supabase
          .from('perfis')
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq('id', data.session.user.id)
          .then(() => {});
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
        await buscarPerfil(novaSessao.user.id);
        registrarDispositivoPush();
      } else {
        setPerfil(null);
        setModoAcesso(null);
      }
    });

    return () => {
      ativo = false;
      assinatura.subscription.unsubscribe();
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
