import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Texto provisório — o levantamento da migração não trouxe o texto legal
// definitivo do Bubble. Revisar com um responsável antes de publicar nas
// lojas (a Apple e o Google também exigem essa política numa URL pública,
// não só dentro do app — ver seção "Publicação nas lojas" do levantamento).
export default function PoliticaPrivacidadeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Política de privacidade" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedView type="backgroundElement" style={styles.aviso}>
          <ThemedText type="small">
            Texto provisório, gerado na migração. Precisa ser revisado antes de publicar o app.
          </ThemedText>
        </ThemedView>

        <Secao titulo="Quais dados coletamos">
          Para o cadastro B2B, pedimos nome, CNPJ, razão social, telefone, e-mail, CEP e o endereço de entrega.
          Também guardamos o histórico de pedidos e o carrinho enquanto você usa o app.
        </Secao>
        <Secao titulo="Como usamos esses dados">
          Usamos essas informações para aprovar seu cadastro, processar pedidos, calcular frete e pagamento (a
          combinar pelo WhatsApp) e avisar sobre o andamento do pedido por notificação.
        </Secao>
        <Secao titulo="Com quem compartilhamos">
          Não vendemos seus dados. Compartilhamos o necessário com o Supabase (hospedagem dos dados) e com o
          WhatsApp, quando você mesmo inicia a conversa pelo app.
        </Secao>
        <Secao titulo="Seus direitos">
          Você pode pedir a exclusão da sua conta e dos seus dados a qualquer momento pela tela Conta, dentro do
          próprio app.
        </Secao>
      </ScrollView>
    </SafeAreaView>
  );
}

function Secao({ titulo, children }: { titulo: string; children: string }) {
  return (
    <View style={styles.secao}>
      <ThemedText type="smallBold">{titulo}</ThemedText>
      <ThemedText themeColor="textSecondary">{children}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { padding: Spacing.three, gap: Spacing.three },
  aviso: { borderRadius: 10, padding: Spacing.two },
  secao: { gap: Spacing.one },
});
