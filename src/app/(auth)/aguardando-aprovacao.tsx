import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

export default function AguardandoAprovacaoScreen() {
  const { sair } = useAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.titulo}>
          Cadastro realizado!
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.texto}>
          Seu cadastro está em análise e será aprovado em até 1 dia útil. Você recebe um aviso assim que
          liberarmos o seu acesso.
        </ThemedText>
        <Button titulo="Entendi" onPress={sair} />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  titulo: { fontSize: 28, lineHeight: 34 },
  texto: { marginBottom: Spacing.three },
});
