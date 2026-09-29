import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { BottomTabInset, BrandColors, Spacing } from '@/constants/theme';

type ToastContextValue = {
  mostrarToast: (mensagem: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return ctx;
}

// Toast simples: aparece por cima de tudo, some sozinho. Usado pra
// confirmações rápidas (ex.: "Adicionado ao carrinho!") que antes só
// trocavam o texto do botão — fácil demais de não perceber.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const opacidade = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarToast = useCallback(
    (texto: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setMensagem(texto);
      opacidade.stopAnimation();
      Animated.timing(opacidade, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      timeoutRef.current = setTimeout(() => {
        Animated.timing(opacidade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMensagem(null));
      }, 1800);
    },
    [opacidade],
  );

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      {mensagem ? (
        <Animated.View pointerEvents="none" style={[styles.container, { opacity: opacidade }]}>
          <Text style={styles.texto}>{mensagem}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.four,
    backgroundColor: BrandColors.fundoEscuro,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  texto: { color: '#ffffff', fontWeight: '700', textAlign: 'center' },
});
