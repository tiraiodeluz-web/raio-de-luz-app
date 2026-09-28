import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

// Provisória: dados completos, política de privacidade, sobre o app e
// exclusão de conta entram na etapa 6. Por ora só mostra quem está logado
// e permite sair, para testar o fluxo de login/cadastro da etapa 3.
export default function ContaScreen() {
  const { session, perfil, sair } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Conta</ThemedText>
        {session ? (
          <>
            <ThemedText themeColor="textSecondary">
              {perfil?.nome || session.user.email}
              {perfil?.tipo === 'admin' ? ' · admin' : ''}
            </ThemedText>
            <Button titulo="Sair" variante="secundario" onPress={sair} />
          </>
        ) : (
          <ThemedText themeColor="textSecondary">Você não está logado.</ThemedText>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.four, gap: Spacing.two },
});
