import type { ReactNode } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CabecalhoVoltar } from '@/components/cabecalho-voltar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

// Mesmo texto da página pública (painel/public/termos-de-uso.html). Proposta redigida em
// 16 de novembro de 2026: deve ser revisada por quem responde juridicamente pela empresa.
export default function TermosDeUsoScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <CabecalhoVoltar titulo="Termos de uso" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText themeColor="textSecondary" style={styles.atualizacao}>
          Última atualização: 16 de novembro de 2026
        </ThemedText>

        <ThemedText themeColor="textSecondary">
          Estes Termos regulam o uso do aplicativo Raio de Luz Religiosos, da RAIO DE LUZ ARTIGOS RELIGIOSOS LTDA - ME.
        </ThemedText>

        <Secao titulo="1. Aceitação">
          Ao criar uma conta e usar o aplicativo Raio de Luz Religiosos, você declara que leu e concorda com estes Termos de Uso e com a Política de Privacidade. Se não concordar, não utilize o aplicativo.
        </Secao>

        <Secao titulo="2. Quem pode usar">
          O aplicativo é destinado a lojistas e demais empresas, com CNPJ ativo, que compram artigos religiosos no atacado da RAIO DE LUZ ARTIGOS RELIGIOSOS LTDA - ME (CNPJ 07.296.573/0001-53). O cadastro depende de aprovação da equipe, que pode negá-lo ou cancelá-lo, por exemplo, se os dados informados forem falsos ou incompletos.{'\n\n'}Você é responsável pelas informações do cadastro, por mantê-las atualizadas e pela guarda da sua senha.
        </Secao>

        <Secao titulo="3. Catálogo, preços e pedidos">
          As fotos, os preços, as embalagens e a disponibilidade dos produtos podem mudar sem aviso. Um pedido feito pelo aplicativo é uma solicitação de compra e só se confirma depois da análise e do retorno da equipe da Raio de Luz, que combina com você o frete e a forma de pagamento. Pode haver valor mínimo por pedido, informado no próprio aplicativo.{'\n\n'}O pagamento não é feito dentro do aplicativo.
        </Secao>

        <Secao titulo="4. Programa de desconto de fidelidade">
          O aplicativo pode oferecer desconto de fidelidade em percentual, concedido por ações como pedido pago, formulário respondido e feedback aprovado, conforme as regras exibidas na tela "Meu desconto". O desconto vale para o pedido seguinte, tem teto definido, não pode ser convertido em dinheiro e é retirado ou devolvido se o pedido que o gerou ou o utilizou for cancelado. A Raio de Luz pode alterar ou encerrar o programa, sem afetar descontos já concedidos e ainda não usados.
        </Secao>

        <Secao titulo="5. Assistente RDL AI">
          A RDL AI usa inteligência artificial de terceiros para ajudar a encontrar produtos e montar pedidos. Ela pode errar: confira sempre produtos, quantidades e valores no carrinho antes de finalizar. O uso é opcional e exige a sua permissão no aplicativo. As mensagens e fotos que você enviar são tratadas conforme a Política de Privacidade.
        </Secao>

        <Secao titulo="6. Feedbacks e depoimentos">
          Se você enviar um depoimento em vídeo e marcar a autorização, a Raio de Luz poderá usá-lo, com o seu nome e o da sua loja, em materiais de divulgação e marketing, sem custo. Você declara que o conteúdo é seu e que não viola direitos de terceiros. Para pedir a retirada de um conteúdo, fale com a empresa pelos canais de contato.
        </Secao>

        <Secao titulo="7. Uso adequado">
          É proibido usar o aplicativo para fraudar pedidos ou descontos, acessar contas de outras pessoas, copiar ou coletar dados do catálogo de forma automática, tentar burlar a segurança ou prejudicar o funcionamento do serviço.
        </Secao>

        <Secao titulo="8. Propriedade intelectual">
          O aplicativo, a marca Raio de Luz, as fotos e os textos do catálogo pertencem à Raio de Luz ou a seus licenciantes. Estes Termos não transferem nenhum direito sobre eles.
        </Secao>

        <Secao titulo="9. Disponibilidade">
          Fazemos o possível para manter o aplicativo no ar, mas ele pode ficar indisponível por manutenção, falhas de internet ou de terceiros. A empresa não responde por perdas decorrentes de indisponibilidade que fujam do seu controle razoável.
        </Secao>

        <Secao titulo="10. Exclusão da conta">
          Você pode excluir a sua conta a qualquer momento, na aba Conta do aplicativo (Excluir minha conta) ou pelo endereço raiodeluz-painel.expo.app/excluir-conta.html. Os pedidos já realizados continuam guardados pela empresa para fins legais e fiscais.
        </Secao>

        <Secao titulo="11. Alterações destes Termos">
          Podemos atualizar estes Termos. Quando a mudança for relevante, avisaremos pelo aplicativo. Continuar usando o aplicativo depois do aviso significa que você concorda com a nova versão.
        </Secao>

        <Secao titulo="12. Lei aplicável e foro">
          Estes Termos seguem as leis do Brasil. Fica eleito o foro da comarca de Santo Antônio da Platina - PR para resolver dúvidas decorrentes deles, salvo disposição legal em contrário.
        </Secao>

        <View style={styles.contato}>
          <ThemedText type="smallBold">13. Contato</ThemedText>
          <ThemedText type="smallBold">RAIO DE LUZ ARTIGOS RELIGIOSOS LTDA - ME</ThemedText>
          <ThemedText themeColor="textSecondary">CNPJ: 07.296.573/0001-53</ThemedText>
          <ThemedText themeColor="textSecondary">Endereço: Rua Ailton Senra, nº 193, Parque Jandira, Santo Antônio da Platina - PR</ThemedText>
          <ThemedText type="smallBold" style={styles.link} onPress={() => Linking.openURL('mailto:contato@raiodeluzreligiosos.com.br')}>
            contato@raiodeluzreligiosos.com.br
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
  link: { textDecorationLine: 'underline' },
});
