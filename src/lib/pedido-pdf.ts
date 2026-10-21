import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { montarHtmlPedido, type PedidoPdf } from '@/lib/pedido-pdf-html';
import { supabase } from '@/lib/supabase';

const PAGINA_A4 = { width: 595, height: 842 };

async function buscarPedido(pedidoId: string): Promise<PedidoPdf> {
  const { data, error } = await supabase
    .from('pedidos')
    .select(
      `id, numero, criado_em, subtotal, desconto, total, cupom_codigo, cliente_snapshot,
       pedido_itens ( sku, produto_nome, santo_nome, quantidade, preco_unitario, personalizacao,
         santos ( codigo ), produtos ( catalogos ( nome ) ) )`,
    )
    .eq('id', pedidoId)
    .single();
  if (error) throw error;
  return data as unknown as PedidoPdf;
}

// Gera o PDF no aparelho e devolve o arquivo já com nome legível
// (aparece assim no WhatsApp/e-mail de quem receber).
export async function gerarPdfPedido(pedidoId: string): Promise<{ arquivo: File; numero: number }> {
  const pedido = await buscarPedido(pedidoId);
  const { uri } = await Print.printToFileAsync({ html: montarHtmlPedido(pedido), ...PAGINA_A4 });
  const destino = new File(Paths.cache, `Pedido-${pedido.numero}-Raio-de-Luz.pdf`);
  if (destino.exists) destino.delete();
  // move() é assíncrono neste SDK: sem o await, o arquivo ainda não está no
  // destino quando o upload/compartilhamento tenta ler (erro ENOENT).
  await new File(uri).move(destino);
  return { arquivo: destino, numero: pedido.numero };
}

// Admin (e cliente) compartilham o PDF pelo menu do celular: WhatsApp,
// e-mail, Drive, impressora...
let compartilhando = false;

export async function compartilharPdfPedido(pedidoId: string): Promise<void> {
  // Toque repetido enquanto a janela de compartilhar já está aberta dá erro
  // "Another share request is being processed": ignora o segundo toque.
  if (compartilhando) return;
  compartilhando = true;
  try {
    const { arquivo, numero } = await gerarPdfPedido(pedidoId);
    await Sharing.shareAsync(arquivo.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Pedido #${numero} — Raio de Luz`,
    });
  } finally {
    compartilhando = false;
  }
}

const VALIDADE_LINK_SEGUNDOS = 60 * 60 * 24 * 365;

// Link do WhatsApp (wa.me) não leva anexo; então o PDF vai pra pasta
// privada "pedidos-pdf" e a mensagem leva um link assinado (vale 1 ano).
export async function linkPdfPedido(pedidoId: string): Promise<string> {
  const { arquivo } = await gerarPdfPedido(pedidoId);
  const caminho = `${pedidoId}.pdf`;
  const { error: erroUpload } = await supabase.storage
    .from('pedidos-pdf')
    .upload(caminho, await arquivo.bytes(), { contentType: 'application/pdf', upsert: true });
  if (erroUpload) throw erroUpload;
  const { data, error } = await supabase.storage.from('pedidos-pdf').createSignedUrl(caminho, VALIDADE_LINK_SEGUNDOS);
  if (error) throw error;
  return data.signedUrl;
}
