import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet } from 'react-native';

import { BottomTabInset, BrandColors, Spacing } from '@/constants/theme';

// Regra 13: o botão flutuante (Home, Catálogos, Meus pedidos, Checkout) usa
// um número diferente do WhatsApp do pedido/suporte.
const NUMERO_SUPORTE = '5543999636907';

export function WhatsAppFlutuante() {
  return (
    <Pressable
      accessibilityLabel="Falar no WhatsApp"
      style={styles.botao}
      onPress={() => Linking.openURL(`https://wa.me/${NUMERO_SUPORTE}`)}>
      <Ionicons name="logo-whatsapp" size={28} color="#ffffff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    position: 'absolute',
    right: Spacing.three,
    bottom: BottomTabInset + Spacing.three,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BrandColors.whatsapp,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});
