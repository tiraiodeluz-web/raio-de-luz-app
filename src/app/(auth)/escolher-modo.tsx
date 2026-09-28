import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

// Só admins veem esta tela ao entrar (perfis.tipo = 'admin').
export default function EscolherModoScreen() {
  const { escolherModo, perfil } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.titulo}>
          Olá, {perfil?.nome || 'admin'}!
        </ThemedText>
        <ThemedText themeColor="textSecondary">Ir para?</ThemedText>
        <Button titulo="Administrador" onPress={() => escolherModo('admin')} />
        <Button titulo="Usuário" variante="secundario" onPress={() => escolherModo('cliente')} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.four, gap: Spacing.three },
  titulo: { fontSize: 28, lineHeight: 34 },
});
