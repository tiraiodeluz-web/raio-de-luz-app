import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { RODANDO_NO_EXPO_GO } from '@/lib/ambiente';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

const CHAVE = ['notificacoes', 'nao-lidas'];

// Quantas notificações chegaram depois da última vez que a pessoa abriu a
// tela de notificações. Alimenta o número do sininho e do ícone do app.
export function useNotificacoesNaoLidas() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CHAVE,
    enabled: !!session,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('contar_notificacoes_nao_lidas');
      if (error) throw error;
      return data ?? 0;
    },
  });

  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') queryClient.invalidateQueries({ queryKey: CHAVE });
    });
    return () => assinatura.remove();
  }, [queryClient]);

  const total = session ? (query.data ?? 0) : 0;

  // Número no ícone do app (launchers que suportam; no iPhone, sempre).
  useEffect(() => {
    if (RODANDO_NO_EXPO_GO) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Notifications = require('expo-notifications') as typeof import('expo-notifications');
      Notifications.setBadgeCountAsync(total).catch(() => {});
    } catch {}
  }, [total]);

  return total;
}

export function useMarcarNotificacoesLidas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('marcar_notificacoes_lidas');
      if (error) throw error;
    },
    onSuccess: () => queryClient.setQueryData(CHAVE, 0),
  });
}
