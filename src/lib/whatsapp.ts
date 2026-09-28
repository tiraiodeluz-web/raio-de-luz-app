import { Linking } from 'react-native';

// Regra 13: pedido e suporte vão para este número; o botão flutuante usa um
// número diferente (ver src/components/whatsapp-flutuante.tsx).
const NUMERO_PEDIDOS = '5543996081065';

export function abrirWhatsAppPedido(numeroPedido: number) {
  const texto = encodeURIComponent(`Oi acabei de realizar o pedido N° ${numeroPedido}`);
  return Linking.openURL(`https://wa.me/${NUMERO_PEDIDOS}?text=${texto}`);
}
