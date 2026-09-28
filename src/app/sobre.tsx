import Constants from 'expo-constants';
import { Linking, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { LINKS_INSTITUCIONAIS } from '@/constants/institucional';

export default function SobreScreen() {
  const versao = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Sobre o aplicativo" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="title" style={styles.titulo}>
          Raio de Luz Religiosos
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Catálogo B2B de artigos religiosos: monte seu carrinho, escolha o santo de cada produto e finalize o
          pedido pelo WhatsApp.
        </ThemedText>

        {LINKS_INSTITUCIONAIS.site ? (
          <Button titulo="Site" variante="secundario" onPress={() => Linking.openURL(LINKS_INSTITUCIONAIS.site!)} />
        ) : null}
        {LINKS_INSTITUCIONAIS.instagram ? (
          <Button
            titulo="Instagram"
            variante="secundario"
            onPress={() => Linking.openURL(LINKS_INSTITUCIONAIS.instagram!)}
          />
        ) : null}
        <Button titulo="WhatsApp" variante="secundario" onPress={() => Linking.openURL(LINKS_INSTITUCIONAIS.whatsapp)} />
        {LINKS_INSTITUCIONAIS.email ? (
          <Button
            titulo="E-mail"
            variante="secundario"
            onPress={() => Linking.openURL(`mailto:${LINKS_INSTITUCIONAIS.email}`)}
          />
        ) : null}

        <ThemedText type="small" themeColor="textSecondary" style={styles.versao}>
          Versão {versao}
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: Spacing.three, gap: Spacing.three },
  titulo: { fontSize: 22, lineHeight: 28 },
  versao: { marginTop: Spacing.three },
});
