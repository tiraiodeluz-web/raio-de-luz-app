import { Linking } from 'react-native';

// Regra 13: pedido e suporte vão para este número; o botão flutuante usa um
// número diferente (o botão flutuante foi removido do app).
const NUMERO_PEDIDOS = '5543996081065';

// O link do PDF vai no texto: wa.me não aceita anexo (ver lib/pedido-pdf.ts).
export function abrirWhatsAppPedido(numeroPedido: number, linkPdf?: string | null) {
  const mensagem = `Oi acabei de realizar o pedido N° ${numeroPedido}`;
  const texto = encodeURIComponent(linkPdf ? `${mensagem}\n\nPDF do pedido: ${linkPdf}` : mensagem);
  return Linking.openURL(`https://wa.me/${NUMERO_PEDIDOS}?text=${texto}`);
}

// "Falar com vendedor" (primeira opção do chat da RDL AI): abre o WhatsApp da
// equipe comercial já se apresentando. Usa o mesmo número dos pedidos/suporte.
export function abrirWhatsAppVendedor(quem?: string | null) {
  const nome = quem ? `Sou ${quem} e vim` : 'Vim';
  const texto = encodeURIComponent(`Olá! ${nome} pelo app da Raio de Luz e gostaria de falar com um vendedor.`);
  return Linking.openURL(`https://wa.me/${NUMERO_PEDIDOS}?text=${texto}`);
}
