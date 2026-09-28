import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AdminMenu } from '@/components/admin-menu';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';

export function AdminCabecalho({ titulo }: { titulo: string }) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setMenuAberto(true)} hitSlop={8}>
        <Ionicons name="menu" size={26} color={BrandColors.fundoEscuro} />
      </Pressable>
      <ThemedText type="title" style={styles.titulo}>
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
  titulo: { fontSize: 20, color: BrandColors.fundoEscuro },
});
