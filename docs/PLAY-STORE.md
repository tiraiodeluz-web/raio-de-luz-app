# Publicação na Google Play — roteiro e respostas prontas

Atualizado em 06/11/2026. App: **Raio de Luz Religiosos** · pacote `com.raiodeluzreligiosos.mobile` (não pode mudar depois de publicado).

## 1. Links públicos (já no ar após o deploy do painel)
- Política de privacidade: https://raiodeluz-painel.expo.app/politica-de-privacidade.html
- Exclusão de conta: https://raiodeluz-painel.expo.app/excluir-conta.html
(O texto da política foi atualizado em 05/11/2026 para refletir o assistente de IA, fotos enviadas ao assistente, notificações e registros técnicos. Revisar/aprovar.)

## 1.1 Decisão (06/11/2026): substituir o app do Bubble
O pacote `com.raiodeluzreligiosos.mobile` já existia na Play Console (app do Bubble, último envio em 22/07/2026, teste interno). O app novo **substitui** esse cadastro. Consequências:
- **versionCode:** a Expo agora usa o do `app.json` (`android.versionCode`, hoje 1000; `eas.json` com `appVersionSource: local`). Para cada nova versão enviada à Play, aumentar esse número (a Play recusa número repetido ou menor).
- **Chave de assinatura:** se a Play recusar o `.aab` por "chave de assinatura diferente", o app do Bubble foi enviado com outra chave de envio. Solução: na Play Console (Teste e lançamento → Configuração → Integridade do app / "Protegido com o Google Play" → Assinatura do app) pedir a **redefinição da chave de envio** e depois enviar o `.aab` da Expo. Leva alguns dias.
- Mudar `eas.json` altera o *fingerprint* (runtime de OTA): APKs antigos de teste deixam de receber atualização e precisam de APK novo.

## 2. Gerar o pacote e enviar
1. expo.dev → projeto `raio-de-luz-app` → **Workflows → "Construir app para a Play Store" → Run** (gera o `.aab`, `versionCode` sobe sozinho). Na primeira vez o EAS cria e guarda a chave de assinatura (upload key); não perca o acesso à conta Expo.
2. Play Console → criar o app → **Teste interno** → enviar o `.aab` (manual) ou configurar `eas submit` (precisa da chave de serviço da Play Console; `eas.json` já aponta para a faixa `internal` como rascunho).
3. Atualizações de tela/regra depois do lançamento: workflow **"Publicar atualização (produção)"** (canal `production`). O workflow antigo "Publicar atualização" continua só para os APKs de teste (canal `preview`).

## 3. Acesso ao app (revisores)
O app exige login e aprovação. Em **Conteúdo do app → Acesso ao app** informar uma conta de teste **já aprovada**:
1. Criar um cadastro no próprio app com um e-mail da empresa (ex.: `revisao@raiodeluzreligiosos.com.br`) e CNPJ válido, confirmar o e-mail.
2. Aprovar no painel (Clientes → aprovar).
3. Informar e-mail + senha na Play Console e a instrução: "Entre com o e-mail e a senha. Todo o catálogo e o carrinho estão liberados."

## 4. Segurança dos dados (formulário "Data safety")
- Coleta dados? **Sim**. Criptografados em trânsito? **Sim** (HTTPS). Usuário pode pedir exclusão? **Sim** (no app e pela URL acima).
- Dados e finalidade:
  - **Informações pessoais:** nome, e-mail, telefone, endereço, e "outras" (CNPJ/razão social) — função do app, gerenciamento de conta, comunicações.
  - **Fotos:** só se o usuário enviar ao assistente (opcional) — função do app.
  - **Atividade no app:** produtos vistos, último acesso (análises internas) e mensagens enviadas ao assistente (conteúdo do usuário) — função do app e análises.
  - **Informações e desempenho do app:** registros de falhas/erros — análises.
  - **Identificadores:** identificador do aparelho para notificações (token) — comunicações.
- Não coleta: localização, contatos, dados financeiros/de pagamento (pagamento é fora do app), saúde, microfone.
- Compartilhamento: provedores que processam em nome da empresa (hospedagem do banco, IA do assistente, envio de notificações/e-mail). Se a Play pedir, declarar como processadores de serviço.
- Anúncios: **não**. Público-alvo: **18+** (B2B). Categoria sugerida: Compras (ou Negócios).

## 5. Ficha da loja
- **Nome:** Raio de Luz Religiosos
- **Descrição curta (≤80):** Peça no atacado artigos religiosos de forma rápida e prática.
- **Descrição completa (sugestão):** App oficial da Raio de Luz Artigos Religiosos para lojistas. Veja catálogos completos, escolha santos e personalizações, monte o carrinho, envie o pedido pelo WhatsApp e acompanhe o histórico. Tire dúvidas e encontre produtos com a RDL AI, nossa assistente de compras. Receba avisos de pedidos e novidades. Cadastro com CNPJ, sujeito à aprovação da equipe.
- **Ícone 512×512:** gerar em Painel → Ícone do app (`icone-play-store-512.png`).
- **Imagem de destaque:** 1024×500 (criar). **Capturas:** mínimo 2 de celular (início, produto, carrinho, RDL AI).
- Classificação de conteúdo: responder o questionário (sem violência/jogos/compras dentro do app com cobrança digital).
- E-mail de contato da loja e política de privacidade: usar os links da seção 1.

## 6. Antes de abrir para clientes
- **Supabase Pro** (plano grátis pausa por inatividade e não tem backup diário).
- Apagar dados de teste (contas "Bot Import"/"Teste", notificações de teste enviadas a todos).
- Conferir com o dono se a conta de desenvolvedor é de empresa (pode exigir D-U-N-S) ou pessoal (pode exigir teste fechado com testadores antes de produção — confirmar regra vigente na Play Console).
