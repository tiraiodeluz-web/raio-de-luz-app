import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

type Perfil = { id: string; nome: string; razao_social: string | null; tipo: 'admin' | 'cliente' };

type Sessao = {
  session: Session | null;
  perfil: Perfil | null;
  carregando: boolean;
  sair: () => Promise<void>;
};

const Contexto = createContext<Sessao | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSession(nova);
      if (!nova) {
        setPerfil(null);
        setCarregando(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const usuarioId = session?.user.id;
  useEffect(() => {
    if (!usuarioId) return;
    setCarregando(true);
    supabase
      .from('perfis')
      .select('id, nome, razao_social, tipo')
      .eq('id', usuarioId)
      .single()
      .then(({ data }) => {
        setPerfil(data ?? null);
        setCarregando(false);
      });
  }, [usuarioId]);

  async function sair() {
    await supabase.auth.signOut();
  }

  return <Contexto.Provider value={{ session, perfil, carregando, sair }}>{children}</Contexto.Provider>;
}

export function useSessao() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useSessao fora do SessaoProvider');
  return valor;
}
