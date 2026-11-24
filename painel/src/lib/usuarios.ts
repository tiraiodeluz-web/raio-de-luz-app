import { useQuery } from '@tanstack/react-query';

import { supabase } from './supabase';

// Chama a Edge Function admin-usuarios (só administradores). Em erro, devolve
// a mensagem em português que a função mandou.
export async function chamarAdminUsuarios<T = { ok: true }>(corpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-usuarios', { body: corpo });
  if (error) {
    let mensagem = 'Não foi possível concluir. Tente de novo.';
    const resposta = (error as { context?: Response }).context;
    if (resposta && typeof resposta.json === 'function') {
      try {
        const j = await resposta.json();
        if (j?.erro) mensagem = String(j.erro);
      } catch {
        // mantém a mensagem padrão
      }
    }
    throw new Error(mensagem);
  }
  if (data?.erro) throw new Error(String(data.erro));
  return data as T;
}

// E-mails de login (ficam no sistema de autenticação, então vêm pela função).
export function useEmails(ids: string[]) {
  const chave = [...ids].sort().join(',');
  return useQuery({
    queryKey: ['emails-usuarios', chave],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async () => (await chamarAdminUsuarios<{ ok: true; emails: Record<string, string> }>({ acao: 'emails', ids })).emails,
  });
}
