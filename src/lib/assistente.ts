import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ProdutoResumo } from '@/lib/produtos';
import { supabase } from '@/lib/supabase';

export type MensagemChat = {
  id: string;
  papel: 'cliente' | 'assistente';
  texto: string;
  produtos?: ProdutoResumo[];
  kitIds?: string[];
  sugestoes?: string[];
  carrinhoAlterado?: boolean;
  // Mensagem de erro local (sem internet, limite etc.) — não vai pro modelo.
  erro?: boolean;
};

type RespostaAssistente = {
  texto: string;
  produtos: ProdutoResumo[];
  kitIds: string[];
  sugestoes: string[];
  carrinhoAlterado: boolean;
};

async function mensagemDoErro(erro: unknown): Promise<string> {
  if (erro instanceof FunctionsHttpError) {
    try {
      const corpo = await (erro.context as Response).json();
      if (typeof corpo?.erro === 'string') return corpo.erro;
    } catch {
      // corpo não era JSON — cai na mensagem padrão
    }
  }
  if (erro instanceof FunctionsFetchError) return 'Sem conexão com a internet. Tente de novo.';
  return 'O assistente está indisponível agora. Tente de novo em instantes.';
}

// Manda a conversa (só texto + produtos mostrados) pra Edge Function
// "assistente", que roda o modelo e as ferramentas como o próprio cliente.
export function useEnviarAoAssistente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversa: MensagemChat[]): Promise<RespostaAssistente> => {
      const mensagens = conversa
        .filter((m) => !m.erro)
        .map((m) => ({
          papel: m.papel,
          texto: m.texto,
          produtos: m.produtos?.map((p) => ({ id: p.id, nome: p.nome })),
        }));
      const { data, error } = await supabase.functions.invoke<RespostaAssistente>('assistente', { body: { mensagens } });
      if (error) throw new Error(await mensagemDoErro(error));
      if (!data) throw new Error('Resposta vazia do assistente.');
      return data;
    },
    onSuccess: (resposta) => {
      if (resposta.carrinhoAlterado) queryClient.invalidateQueries({ queryKey: ['carrinho'] });
    },
  });
}
