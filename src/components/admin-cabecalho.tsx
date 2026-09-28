import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AdminMenu } from '@/components/admin-menu';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function AdminCabecalho({ titulo }: { titulo: string }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setMenuAberto(true)} hitSlop={8}>
        <Ionicons name="menu" size={26} color={theme.text} />
      </Pressable>
      <ThemedText type="smallBold" style={styles.titulo}>
        {titulo}
      </ThemedText>
      <AdminMenu visivel={menuAberto} onFechar={() => setMenuAberto(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  titulo: { fontSize: 18 },
});
