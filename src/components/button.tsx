import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandColors, Radii, Spacing } from '@/constants/theme';

type Props = Omit<PressableProps, 'style'> & {
  titulo: string;
  variante?: 'primario' | 'secundario' | 'texto';
  carregando?: boolean;
  icone?: keyof typeof Ionicons.glyphMap;
  corIcone?: string;
};

export function Button({ titulo, variante = 'primario', carregando, icone, corIcone, disabled, ...rest }: Props) {
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
        <View style={styles.conteudo}>
          {icone ? (
            <Ionicons
              name={icone}
              size={20}
              color={corIcone ?? (variante === 'primario' ? '#ffffff' : BrandColors.fundoEscuro)}
            />
          ) : null}
          <ThemedText
            type="smallBold"
            numberOfLines={1}
            themeColor={variante === 'primario' ? undefined : 'text'}
            style={[styles.textoBase, variante === 'primario' && styles.textoPrimario]}>
            {titulo}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: Radii.pilula,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexShrink: 1 },
  textoBase: { flexShrink: 1 },
  primario: { backgroundColor: BrandColors.fundoEscuro },
  secundario: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: BrandColors.fundoEscuro,
  },
  texto: { backgroundColor: 'transparent', minHeight: 36 },
  textoPrimario: { color: '#ffffff' },
  desabilitado: { opacity: 0.5 },
  pressionado: { opacity: 0.8 },
});
