import { Linking } from 'react-native';

// Regra 13: pedido e suporte vão para este número; o botão flutuante usa um
// número diferente (ver src/components/whatsapp-flutuante.tsx).
const NUMERO_PEDIDOS = '5543996081065';

// O link do PDF vai no texto: wa.me não aceita anexo (ver lib/pedido-pdf.ts).
export function abrirWhatsAppPedido(numeroPedido: number, linkPdf?: string | null) {
  const mensagem = `Oi acabei de realizar o pedido N° ${numeroPedido}`;
  const texto = encodeURIComponent(linkPdf ? `${mensagem}\n\nPDF do pedido: ${linkPdf}` : mensagem);
  return Linking.openURL(`https://wa.me/${NUMERO_PEDIDOS}?text=${texto}`);
}
