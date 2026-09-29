import type { ReactNode } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

// Texto oficial fornecido pelo Carlos em 29/09/2026 (última atualização:
// 15/07/2026). Qualquer alteração deve vir dele — é o texto legal usado
// também na publicação nas lojas (Apple/Google exigem essa política numa
// URL pública, não só dentro do app).
export default function PoliticaPrivacidadeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Política de privacidade" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText themeColor="textSecondary" style={styles.atualizacao}>
          Última atualização: 15 de julho de 2026
        </ThemedText>

        <ThemedText themeColor="textSecondary">
          A <ThemedText type="smallBold">RAIO DE LUZ ARTIGOS RELIGIOSOS LTDA - ME</ThemedText>, inscrita no CNPJ{' '}
          <ThemedText type="smallBold">07.296.573/0001-53</ThemedText>, com sede na Rua Ailton Senra, nº 193, Parque
          Jandira, Santo Antônio da Platina - PR, respeita a privacidade de seus clientes e está comprometida com a
          proteção dos dados pessoais tratados por meio deste aplicativo, em conformidade com a Lei nº 13.709/2018
          (Lei Geral de Proteção de Dados – LGPD).
        </ThemedText>

        <Secao titulo="1. Dados coletados">
          Para utilização do aplicativo, poderão ser coletados e armazenados os seguintes dados: nome completo,
          razão social, CNPJ, e-mail, telefone, CEP, endereço completo, cidade e estado, histórico de pedidos
          realizados e dados necessários para autenticação no aplicativo.{'\n\n'}O aplicativo não coleta dados de
          localização (GPS), não acessa a câmera e não acessa a galeria de fotos do dispositivo.
        </Secao>

        <Secao titulo="2. Finalidade da coleta">
          Os dados são utilizados para: identificar e autenticar o usuário; permitir o acesso ao aplicativo;
          processar e registrar pedidos; facilitar o preenchimento de informações cadastrais; consultar dados
          públicos de CNPJ e CEP por meio de serviços de terceiros; entrar em contato quando necessário; enviar
          notificações relacionadas ao andamento dos pedidos e comunicações importantes; e melhorar a experiência
          de utilização do aplicativo.
        </Secao>

        <Secao titulo="3. Pedidos">
          Os pedidos realizados por meio do aplicativo representam apenas uma solicitação de compra encaminhada à
          RAIO DE LUZ ARTIGOS RELIGIOSOS LTDA - ME.{'\n\n'}O pagamento não é realizado pelo aplicativo, sendo tratado
          diretamente entre a empresa e o cliente pelos meios comerciais adotados pela empresa.
        </Secao>

        <Secao titulo="4. Compartilhamento de dados">
          Os dados pessoais poderão ser compartilhados somente quando necessário para a prestação dos serviços,
          incluindo: plataforma de hospedagem responsável pela infraestrutura do aplicativo; serviços de consulta de
          CEP; serviços de consulta de CNPJ; prestadores de serviços essenciais ao funcionamento do aplicativo; e
          autoridades públicas, quando exigido por lei.{'\n\n'}A RAIO DE LUZ ARTIGOS RELIGIOSOS LTDA - ME não
          comercializa nem vende dados pessoais a terceiros.
        </Secao>

        <Secao titulo="5. Notificações">
          O aplicativo poderá enviar notificações (push) relacionadas ao funcionamento do serviço, incluindo
          atualizações sobre pedidos, novidades e comunicações importantes.{'\n\n'}O usuário poderá desativar as
          notificações nas configurações do próprio dispositivo.
        </Secao>

        <Secao titulo="6. Segurança das informações">
          A empresa adota medidas técnicas e administrativas para proteger os dados pessoais contra acessos não
          autorizados, perda, alteração, divulgação ou destruição.{'\n\n'}Embora sejam adotadas práticas de segurança
          reconhecidas, nenhum sistema é totalmente imune a riscos.
        </Secao>

        <Secao titulo="7. Direitos do titular dos dados">
          Nos termos da LGPD, o usuário poderá solicitar: confirmação da existência de tratamento de dados; acesso
          aos dados pessoais; correção de informações incompletas ou desatualizadas; exclusão dos dados, quando
          aplicável; informações sobre o compartilhamento dos dados; e revogação de consentimento, quando o
          tratamento depender dele.{'\n\n'}As solicitações poderão ser encaminhadas pelo e-mail informado nesta
          Política. Você também pode pedir a exclusão da sua conta e dos seus dados diretamente pela tela Conta,
          dentro do próprio app.
        </Secao>

        <Secao titulo="8. Retenção dos dados">
          Os dados serão armazenados pelo tempo necessário para atender às finalidades descritas nesta Política,
          cumprir obrigações legais, fiscais e regulatórias ou enquanto houver relação comercial entre as partes.
        </Secao>

        <Secao titulo="9. Alterações desta Política">
          Esta Política poderá ser atualizada a qualquer momento para refletir alterações legais, operacionais ou
          melhorias no aplicativo.{'\n\n'}A versão mais recente estará sempre disponível no aplicativo.
        </Secao>

        <View style={styles.contato}>
          <ThemedText type="smallBold">10. Contato</ThemedText>
          <ThemedText themeColor="textSecondary">
            Em caso de dúvidas sobre esta Política de Privacidade ou sobre o tratamento de dados pessoais, entre em
            contato:
          </ThemedText>
          <ThemedText type="smallBold" style={styles.empresa}>
            RAIO DE LUZ ARTIGOS RELIGIOSOS LTDA - ME
          </ThemedText>
          <ThemedText themeColor="textSecondary">CNPJ: 07.296.573/0001-53</ThemedText>
          <ThemedText themeColor="textSecondary">
            Endereço: Rua Ailton Senra, nº 193, Parque Jandira, Santo Antônio da Platina - PR
          </ThemedText>
          <ThemedText
            type="smallBold"
            style={styles.link}
            onPress={() => Linking.openURL('mailto:tiraiodeluz@gmail.com')}>
            tiraiodeluz@gmail.com
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={styles.secao}>
      <ThemedText type="smallBold">{titulo}</ThemedText>
      <ThemedText themeColor="textSecondary">{children}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  atualizacao: { fontStyle: 'italic' },
  secao: { gap: Spacing.one },
  contato: { gap: Spacing.one, marginTop: Spacing.two },
  empresa: { marginTop: Spacing.one },
  link: { textDecorationLine: 'underline' },
});
