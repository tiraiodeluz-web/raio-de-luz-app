import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { File } from 'expo-file-system';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

// Programa de pontos. As regras de verdade ficam no banco
// (supabase/migrations/20261110120*_pontos_*.sql); aqui só o que a tela mostra.
export const PREMIOS = [
  { pontos: 60, percentual: 3 },
  { pontos: 80, percentual: 5 },
  { pontos: 100, percentual: 7 },
] as const;

export const PONTOS_TAREFA = {
  pedido_2k: 25,
  ia_pedido: 25,
  formulario: 20,
  feedback_texto: 10,
  feedback_video: 30,
} as const;

export type MovimentoPontos = Tables<'pontos_movimentos'>;
export type ResgatePontos = Tables<'pontos_resgates'>;
export type Feedback = Tables<'feedbacks'>;

const CHAVE = ['pontos'];

export function usePontos() {
  const { session } = useAuth();
  const uid = session?.user.id;
  return useQuery({
    queryKey: [...CHAVE, uid],
    enabled: !!uid,
    queryFn: async () => {
      const [movimentos, resgate, feedbacks, formulario] = await Promise.all([
        supabase.from('pontos_movimentos').select('*').eq('usuario_id', uid as string).order('criado_em', { ascending: false }),
        supabase.from('pontos_resgates').select('*').eq('usuario_id', uid as string).eq('status', 'disponivel').maybeSingle(),
        supabase.from('feedbacks').select('*').eq('usuario_id', uid as string).order('criado_em', { ascending: false }),
        supabase.from('formulario_respostas').select('id').eq('usuario_id', uid as string).maybeSingle(),
      ]);
      for (const r of [movimentos, resgate, feedbacks, formulario]) if (r.error) throw r.error;
      const lista = movimentos.data ?? [];
      return {
        saldo: lista.reduce((soma, m) => soma + m.pontos, 0),
        movimentos: lista,
        resgateDisponivel: resgate.data,
        feedbacks: feedbacks.data ?? [],
        respondeuFormulario: !!formulario.data,
      };
    },
  });
}

// Situação de cada feedback: o último enviado daquele tipo manda.
export function situacaoFeedback(feedbacks: Feedback[], tipo: 'texto' | 'video'): 'fazer' | 'pendente' | 'aprovado' | 'recusado' {
  const ultimo = feedbacks.find((f) => f.tipo === tipo);
  return (ultimo?.status as 'pendente' | 'aprovado' | 'recusado' | undefined) ?? 'fazer';
}

function useInvalidarPontos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CHAVE });
}

export function useResgatarPontos() {
  const invalidar = useInvalidarPontos();
  return useMutation({
    mutationFn: async (pontos: number) => {
      const { error } = await supabase.rpc('resgatar_pontos', { p_pontos: pontos });
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}

export function useCancelarResgate() {
  const invalidar = useInvalidarPontos();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('cancelar_resgate_pontos', { p_id: id });
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
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

export function useEnviarFeedback() {
  const { session } = useAuth();
  const invalidar = useInvalidarPontos();
  return useMutation({
    mutationFn: async (dados: { tipo: 'texto'; texto: string } | { tipo: 'video'; uri: string; mimeType?: string }) => {
      const uid = session?.user.id;
      if (!uid) throw new Error('Entre na sua conta para enviar.');
      const videoPath = dados.tipo === 'video' ? await enviarVideo(uid, dados.uri, dados.mimeType) : null;
      const { error } = await supabase.rpc('enviar_feedback', {
        p_tipo: dados.tipo,
        p_texto: dados.tipo === 'texto' ? dados.texto : null,
        p_video_path: videoPath,
        p_consentimento: true,
      });
      if (error) throw error;
    },
    onSuccess: invalidar,
  });
}
