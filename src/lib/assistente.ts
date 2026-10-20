import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

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
  // Foto que o cliente mandou (já reduzida pra JPEG). O base64 só vai pro
  // servidor na mensagem nova — nas anteriores vai só o aviso de que tinha
  // foto, pra não pagar a imagem de novo a cada mensagem.
  foto?: { uri: string; base64: string };
  // Mensagem de erro local (sem internet, limite etc.) — não vai pro modelo.
  erro?: boolean;
};

// Lado maior em 1280px já basta pro modelo ler uma etiqueta ou uma lista
// escrita à mão, e deixa o envio leve (~200 KB) mesmo em 4G fraco.
const LADO_MAXIMO_FOTO = 1280;

export async function prepararFoto(asset: ImagePickerAsset): Promise<{ uri: string; base64: string }> {
  const contexto = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > LADO_MAXIMO_FOTO) {
    contexto.resize(asset.width >= asset.height ? { width: LADO_MAXIMO_FOTO, height: null } : { width: null, height: LADO_MAXIMO_FOTO });
  }
  const imagem = await contexto.renderAsync();
  const resultado = await imagem.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!resultado.base64) throw new Error('Não foi possível preparar a foto.');
  return { uri: resultado.uri, base64: resultado.base64 };
}

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
      const validas = conversa.filter((m) => !m.erro);
      const mensagens = validas.map((m, indice) => ({
        papel: m.papel,
        texto: m.texto,
        produtos: m.produtos?.map((p) => ({ id: p.id, nome: p.nome })),
        temFoto: m.foto ? true : undefined,
        fotoBase64: m.foto && indice === validas.length - 1 ? m.foto.base64 : undefined,
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
