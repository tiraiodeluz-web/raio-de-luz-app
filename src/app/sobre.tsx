import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { ThemedText } from '@/components/themed-text';
import { BrandColors, Spacing } from '@/constants/theme';
import { DESENVOLVIDO_POR, LINKS_INSTITUCIONAIS } from '@/constants/institucional';

export default function SobreScreen() {
  const versao = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Sobre o aplicativo" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Image
          source={require('@/assets/images/logo-cabecalho.png')}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="Raio de Luz Religiosos"
        />
        <ThemedText themeColor="textSecondary" style={styles.descricao}>
          O aplicativo oficial do Raio de Luz Artigos Religiosos, feito especialmente para você fazer seus pedidos
          de forma rápida, prática e segura.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.versao}>
          Versão do aplicativo: {versao}
        </ThemedText>

        <ThemedText type="title" style={styles.contatoTitulo}>
          Contato
        </ThemedText>
        <View style={styles.cartoes}>
          {LINKS_INSTITUCIONAIS.site ? (
            <LinhaContato
              icone="globe-outline"
              titulo="Site Oficial"
              valor={LINKS_INSTITUCIONAIS.site}
              onPress={() => Linking.openURL(`https://${LINKS_INSTITUCIONAIS.site}`)}
            />
          ) : null}
          {LINKS_INSTITUCIONAIS.instagram ? (
            <LinhaContato
              icone="logo-instagram"
              titulo="Instagram"
              valor={`@${LINKS_INSTITUCIONAIS.instagram}`}
              onPress={() => Linking.openURL(`https://instagram.com/${LINKS_INSTITUCIONAIS.instagram}`)}
            />
          ) : null}
          <LinhaContato
            icone="logo-whatsapp"
            titulo="WhatsApp"
            valor="(43) 99608-1065"
            onPress={() => Linking.openURL(LINKS_INSTITUCIONAIS.whatsapp)}
          />
          {LINKS_INSTITUCIONAIS.email ? (
            <LinhaContato
              icone="mail-outline"
              titulo="E-mail"
              valor={LINKS_INSTITUCIONAIS.email}
              onPress={() => Linking.openURL(`mailto:${LINKS_INSTITUCIONAIS.email}`)}
            />
          ) : null}
        </View>

        <Pressable
          style={styles.desenvolvidoPor}
          onPress={() => Linking.openURL(DESENVOLVIDO_POR.instagram)}
          accessibilityRole="link">
          <ThemedText type="small" themeColor="textSecondary">
            Desenvolvido por
          </ThemedText>
          <Ionicons name="logo-instagram" size={16} color={BrandColors.fundoEscuro} />
          <ThemedText type="smallBold">{DESENVOLVIDO_POR.nome}</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function LinhaContato({
  icone,
  titulo,
  valor,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  titulo: string;
  valor: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.cartao} onPress={onPress}>
      <Ionicons name={icone} size={22} color={BrandColors.fundoEscuro} />
      <View style={styles.cartaoTexto}>
        <ThemedText type="smallBold">{titulo}</ThemedText>
        <ThemedText themeColor="textSecondary" numberOfLines={1}>
          {valor}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: Spacing.three, gap: Spacing.two, alignItems: 'center' },
  logo: { width: 160, height: 90, marginTop: Spacing.two },
  descricao: { textAlign: 'center', marginTop: Spacing.two },
  versao: { marginBottom: Spacing.three },
  contatoTitulo: { alignSelf: 'flex-start', fontSize: 20, marginTop: Spacing.two, marginBottom: Spacing.one },
  cartoes: { width: '100%', gap: Spacing.two },
  cartao: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E6EC',
    padding: Spacing.three,
  },
  cartaoTexto: { flex: 1, gap: 2 },
  desenvolvidoPor: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half, marginTop: Spacing.four },
});
