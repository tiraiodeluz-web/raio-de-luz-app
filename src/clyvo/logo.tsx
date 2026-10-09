import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { cores, fontes } from './tokens';

// Símbolo da marca: "C" com pixels que se conectam ao sistema.
const SIMBOLO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#38A8FF"/><stop offset="1" stop-color="#2F5BFF"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#0B1226"/><path d="M50 18H36a14 14 0 0 0 0 28h14" fill="none" stroke="url(#g)" stroke-width="9" stroke-linejoin="round"/><rect x="9" y="28" width="6" height="6" rx="1.2" fill="#38A8FF"/><rect x="17.5" y="24" width="5" height="5" rx="1" fill="#2F7BFF"/><rect x="17.5" y="35" width="5" height="5" rx="1" fill="#2F7BFF" opacity=".7"/><rect x="9" y="20" width="4" height="4" rx=".8" fill="#2F7BFF" opacity=".55"/><rect x="9" y="40" width="4" height="4" rx=".8" fill="#38A8FF" opacity=".55"/></svg>`;

export const SIMBOLO_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(SIMBOLO_SVG)}`;

export function Logo({ tamanho = 36, mostrarTexto = true }: { tamanho?: number; mostrarTexto?: boolean }) {
  return (
    <View style={styles.linha} accessibilityRole="image" accessibilityLabel="Clyvo Tecnologia">
      <Image source={{ uri: SIMBOLO_DATA_URI }} style={{ width: tamanho, height: tamanho }} contentFit="contain" />
      {mostrarTexto ? (
        <View>
          <Text style={[styles.nome, { fontSize: tamanho * 0.56 }]}>CLYVO</Text>
          <Text style={[styles.sub, { fontSize: Math.max(tamanho * 0.22, 7) }]}>TECNOLOGIA</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nome: { color: cores.branco, fontFamily: fontes.titulo, fontWeight: '800', letterSpacing: 1, lineHeight: 20 },
  sub: { color: cores.azulClaro, fontFamily: fontes.corpo, fontWeight: '600', letterSpacing: 4.2, marginTop: 2 },
});
