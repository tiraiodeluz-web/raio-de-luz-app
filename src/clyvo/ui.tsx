import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { cores, fontes } from './tokens';

export type EstadoPressable = PressableStateCallbackType & { hovered?: boolean; focused?: boolean };

// Estilos que só existem na web (react-native-web repassa ao CSS).
export const web = (estilo: Record<string, unknown>): ViewStyle =>
  (Platform.OS === 'web' ? estilo : {}) as ViewStyle;

// Largura usada na renderização estática e na primeira renderização do cliente,
// para que a hidratação coincida; depois da montagem vale a largura real.
const LARGURA_INICIAL = 1280;

export function useLayout() {
  const { width: real } = useWindowDimensions();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const width = montado ? real : LARGURA_INICIAL;
  return {
    largura: width,
    celular: width < 720,
    tablet: width >= 720 && width < 1080,
    desktop: width >= 1080,
    ate_tablet: width < 1080,
  };
}

export function Container({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { celular } = useLayout();
  return (
    <View style={[{ width: '100%', maxWidth: 1200, alignSelf: 'center', paddingHorizontal: celular ? 20 : 32 }, style]}>
      {children}
    </View>
  );
}

// Surge suavemente quando entra na tela (web); nas demais plataformas, já visível.
export function Reveal({ children, atraso = 0, style }: { children: ReactNode; atraso?: number; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<View>(null);
  const anim = useRef(new Animated.Value(Platform.OS === 'web' ? 0 : 1)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const mostrar = () =>
      Animated.timing(anim, { toValue: 1, duration: 600, delay: atraso, useNativeDriver: Platform.OS !== 'web' }).start();
    const no = ref.current as unknown as Element | null;
    if (!no || typeof IntersectionObserver === 'undefined') {
      mostrar();
      return;
    }
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          mostrar();
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(no);
    return () => obs.disconnect();
  }, [anim, atraso]);

  return (
    <Animated.View
      ref={ref}
      style={[
        style,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

type Variante = 'primario' | 'secundario' | 'fantasma';

interface BotaoProps {
  rotulo: string;
  variante?: Variante;
  /** Link externo (abre em nova aba). */
  href?: string;
  onPress?: () => void;
  grande?: boolean;
  largo?: boolean;
  acessibilidade?: string;
}

export function Botao({ rotulo, variante = 'primario', href, onPress, grande, largo, acessibilidade }: BotaoProps) {
  const [foco, setFoco] = useState(false);

  const corpo = (hovered: boolean, pressed: boolean) => {
    const estilo: StyleProp<ViewStyle>[] = [
      styles.botao,
      grande && styles.botaoGrande,
      largo && { alignSelf: 'stretch' },
      variante === 'primario' && {
        backgroundColor: hovered ? '#4F90FF' : cores.azul,
        ...web({ boxShadow: hovered ? '0 8px 28px rgba(47,123,255,0.55)' : '0 4px 18px rgba(47,123,255,0.35)' }),
      },
      variante === 'secundario' && {
        borderWidth: 1,
        borderColor: hovered ? cores.azulClaro : cores.bordaForte,
        backgroundColor: hovered ? 'rgba(56,168,255,0.1)' : 'transparent',
      },
      variante === 'fantasma' && { backgroundColor: hovered ? 'rgba(255,255,255,0.08)' : 'transparent' },
      pressed && { opacity: 0.85 },
      foco && { borderWidth: 2, borderColor: cores.ciano },
      web({ transition: 'all 180ms ease', cursor: 'pointer' }),
    ];
    return estilo;
  };

  const texto = (
    <Text style={[styles.botaoTexto, grande && { fontSize: 16 }, variante !== 'primario' && { color: cores.texto }]}>
      {rotulo}
    </Text>
  );

  const comum = {
    onFocus: () => setFoco(true),
    onBlur: () => setFoco(false),
    accessibilityLabel: acessibilidade ?? (href ? `${rotulo} (abre em nova aba)` : rotulo),
  };

  if (href) {
    return (
      <Pressable
        accessibilityRole="link"
        {...comum}
        // @ts-expect-error href/hrefAttrs são props web do react-native-web
        href={href}
        hrefAttrs={{ target: '_blank', rel: 'noopener noreferrer' }}
        onPress={Platform.OS === 'web' ? undefined : () => Linking.openURL(href)}
        style={({ hovered, pressed }: EstadoPressable) => corpo(!!hovered, pressed)}
      >
        {texto}
      </Pressable>
    );
  }
  return (
    <Pressable accessibilityRole="button" onPress={onPress} {...comum} style={({ hovered, pressed }: EstadoPressable) => corpo(!!hovered, pressed)}>
      {texto}
    </Pressable>
  );
}

export function TituloSecao({
  etiqueta,
  titulo,
  subtitulo,
  centralizado = true,
}: {
  etiqueta: string;
  titulo: string;
  subtitulo?: string;
  centralizado?: boolean;
}) {
  const { celular } = useLayout();
  const alinhamento = centralizado ? 'center' : 'left';
  return (
    <View style={{ alignItems: centralizado ? 'center' : 'flex-start', marginBottom: celular ? 32 : 52 }}>
      <View style={styles.etiqueta}>
        <View style={styles.etiquetaPonto} />
        <Text style={styles.etiquetaTexto}>{etiqueta}</Text>
      </View>
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.h2, { fontSize: celular ? 28 : 40, lineHeight: celular ? 36 : 50, textAlign: alinhamento }]}
      >
        {titulo}
      </Text>
      {subtitulo ? (
        <Text style={[styles.subtitulo, { textAlign: alinhamento, fontSize: celular ? 16 : 18 }]}>{subtitulo}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  botao: {
    minHeight: 44,
    paddingHorizontal: 22,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  botaoGrande: { minHeight: 54, paddingHorizontal: 28 },
  botaoTexto: { color: cores.branco, fontFamily: fontes.corpo, fontWeight: '600', fontSize: 15, textAlign: 'center' },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: 'rgba(47,123,255,0.08)',
    marginBottom: 18,
  },
  etiquetaPonto: { width: 6, height: 6, borderRadius: 3, backgroundColor: cores.ciano },
  etiquetaTexto: {
    color: cores.azulClaro,
    fontFamily: fontes.corpo,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  h2: { color: cores.texto, fontFamily: fontes.titulo, fontWeight: '700', letterSpacing: -0.8, maxWidth: 780 },
  subtitulo: { color: cores.textoSuave, fontFamily: fontes.corpo, marginTop: 14, maxWidth: 640, lineHeight: 26 },
});
