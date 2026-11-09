import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { File } from 'expo-file-system';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

// Programa de fidelidade: cada ação soma um % de desconto, que vale (e é
// consumido) no próximo pedido. As regras de verdade ficam no banco
// (supabase/migrations/20261110120*_pontos_* e 20261111*): o "saldo" de
// pontos_movimentos é esse % acumulado.
export const DESCONTO_POR_ACAO = {
  pedido: 3, // quando o pedido é pago
  formulario: 2, // uma vez
  feedback_video: 2, // uma vez, depois de aprovado
} as const;

export const DESCONTO_MAXIMO = 7; // 3 + 2 + 2: teto do desconto no próximo pedido

export type MovimentoPontos = Tables<'pontos_movimentos'>;
export type Feedback = Tables<'feedbacks'>;

const CHAVE = ['pontos'];

export function usePontos() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    queryKey: [...CHAVE, uid],
    enabled: !!uid,
    queryFn: async () => {
      const [movimentos, feedbacks, formulario] = await Promise.all([
        supabase.from('pontos_movimentos').select('*').eq('usuario_id', uid as string).order('criado_em', { ascending: false }),
        supabase.from('feedbacks').select('*').eq('usuario_id', uid as string).eq('tipo', 'video').order('criado_em', { ascending: false }),
        supabase.from('formulario_respostas').select('id').eq('usuario_id', uid as string).maybeSingle(),
      ]);
      for (const r of [movimentos, feedbacks, formulario]) if (r.error) throw r.error;
      const lista = movimentos.data ?? [];
      const saldo = lista.reduce((soma, m) => soma + m.pontos, 0);
      return {
        // % que será aplicado no próximo pedido (mesma conta da criar_pedido)
        desconto: Math.min(Math.max(saldo, 0), DESCONTO_MAXIMO),
        movimentos: lista,
        feedbacks: feedbacks.data ?? [],
        respondeuFormulario: !!formulario.data,
      };
    },
  });
}

// Situação do feedback em vídeo: o último enviado manda.
export function situacaoFeedback(feedbacks: Feedback[]): 'fazer' | 'pendente' | 'aprovado' | 'recusado' {
  const ultimo = feedbacks[0];
  return (ultimo?.status as 'pendente' | 'aprovado' | 'recusado' | undefined) ?? 'fazer';
}

export function useInvalidarPontos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CHAVE });
}

export function useResponderFormulario() {
  const invalidar = useInvalidarPontos();
  return useMutation({
    mutationFn: async (respostas: Record<string, string | number>) => {
      const { error } = await supabase.rpc('responder_formulario', { p_respostas: respostas });
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

// Vídeo vai para o bucket privado "feedbacks", na pasta do próprio cliente.
async function enviarVideo(uid: string, uri: string, mimeType: string | undefined): Promise<string> {
  const extensao = mimeType?.split('/')[1]?.replace('quicktime', 'mov') ?? 'mp4';
  const caminho = `${uid}/${Date.now()}.${extensao}`;
  const bytes = await new File(uri).bytes();
  const { error } = await supabase.storage.from('feedbacks').upload(caminho, bytes, { contentType: mimeType ?? 'video/mp4' });
  if (error) throw error;
  return caminho;
}

export function useEnviarFeedbackVideo() {
  const { session } = useAuth();
  const invalidar = useInvalidarPontos();
  return useMutation({
    mutationFn: async (dados: { uri: string; mimeType?: string }) => {
      const uid = session?.user.id;
      if (!uid) throw new Error('Entre na sua conta para enviar.');
      const videoPath = await enviarVideo(uid, dados.uri, dados.mimeType);
      const { error } = await supabase.rpc('enviar_feedback', { p_tipo: 'video', p_texto: null, p_video_path: videoPath, p_consentimento: true });
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}
