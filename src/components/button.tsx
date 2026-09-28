import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';

type Props = Omit<PressableProps, 'style'> & {
  titulo: string;
  variante?: 'primario' | 'secundario' | 'texto';
  carregando?: boolean;
};

export function Button({ titulo, variante = 'primario', carregando, disabled, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || carregando}
      style={({ pressed }) => [
        styles.base,
        variante === 'primario' && styles.primario,
        variante === 'secundario' && styles.secundario,
        variante === 'texto' && styles.texto,
        (disabled || carregando) && styles.desabilitado,
        pressed && styles.pressionado,
      ]}
      {...rest}>
      {carregando ? (
        <ActivityIndicator color={variante === 'primario' ? '#fff' : BrandColors.fundoEscuro} />
      ) : (
        <ThemedText
          type="smallBold"
          themeColor={variante === 'primario' ? undefined : 'text'}
          style={variante === 'primario' ? styles.textoPrimario : undefined}>
          {titulo}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  primario: { backgroundColor: BrandColors.fundoEscuro },
  secundario: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BrandColors.fundoEscuro,
  },
  texto: { backgroundColor: 'transparent', minHeight: 36 },
  textoPrimario: { color: '#ffffff' },
  desabilitado: { opacity: 0.5 },
  pressionado: { opacity: 0.8 },
});
