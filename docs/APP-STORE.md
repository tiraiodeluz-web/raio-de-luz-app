# Publicação na App Store (iPhone) — roteiro e respostas prontas

Atualizado em 16/11/2026. App: **Raio de Luz Religiosos** · Bundle ID `com.raiodeluzreligiosos.loja` · inscrição Apple Developer (organização) ID `4YFT43QLSD`, D-U-N-S 898129217.

## 1. Links públicos (painel, EAS Hosting)
- Política de privacidade: https://raiodeluz-painel.expo.app/politica-de-privacidade.html
- Termos de uso: https://raiodeluz-painel.expo.app/termos-de-uso.html (proposta; revisar juridicamente)
- Suporte: https://raiodeluz-painel.expo.app/suporte.html
- Exclusão de conta: https://raiodeluz-painel.expo.app/excluir-conta.html (e no app: Conta → Excluir minha conta)

## 2. Passos técnicos (com a conta Apple ativa)
1. Rodar o build iOS pelo EAS (`npx eas-cli build -p ios --profile production`, interativo na 1ª vez: pede o login Apple, cria certificados, Bundle ID e a chave APNs de notificações).
2. Enviar ao App Store Connect (`eas submit -p ios`) → testar pelo **TestFlight** num iPhone real.
3. No App Store Connect: criar o app, preencher ficha, privacidade e "Informações da revisão" (seções 3 a 6), anexar a build e enviar para análise.
- Já configurado: `ios.icon` com a logo (não é mais o ícone do Expo), `ITSAppUsesNonExemptEncryption = false` (só HTTPS padrão), sem permissão de microfone, textos de câmera/fotos em português.
- `google-services.json` é só Android. Push no iPhone usa APNs via Expo.

## 3. Ficha da loja
- **Nome (≤30):** Raio de Luz Religiosos
- **Subtítulo (≤30):** Pedidos no atacado
- **Categoria:** Compras (secundária: Negócios)
- **Texto promocional (≤170):** Peça artigos religiosos no atacado de forma rápida: catálogo completo, kits prontos, assistente com IA e desconto de fidelidade.
- **Descrição:** App oficial da Raio de Luz Artigos Religiosos para lojistas. Veja os catálogos completos, escolha santos e personalizações, monte o carrinho, envie o pedido e acompanhe o andamento. Encontre produtos e refaça pedidos com a RDL AI, nossa assistente de compras. Receba avisos de pedidos e novidades e ganhe desconto de fidelidade. Cadastro com CNPJ, sujeito à aprovação da equipe.
- **Palavras-chave (≤100):** atacado,artigos religiosos,terços,imagens,santos,lojista,catálogo,pedidos
- **URL de suporte:** link de Suporte acima · **URL de marketing:** https://raiodeluzreligiosos.com.br
- **Direitos autorais:** © 2026 Raio de Luz Artigos Religiosos Ltda - ME
- **Screenshots (obrigatório, de iPhone real ou simulador):** 6,9" (1320×2868) ou 6,5" (1284×2778): início, catálogo, produto com santo, carrinho com pedido mínimo, RDL AI, Meu desconto. Mínimo 3, máximo 10.

## 4. Classificação etária (questionário)
Tudo "Nenhum/Não": violência, conteúdo sexual, palavrões, drogas, jogos de azar, terror, compras dentro do app (não há; pedidos são solicitações pagas fora do app), conteúdo gerado por usuário público (não há). Resultado esperado: **4+**. Conteúdo religioso é só o produto vendido.

## 5. Privacidade do app (rótulos de privacidade da Apple)
Dados **coletados e vinculados à identidade do usuário**, todos para "Funcionalidade do app" (e "Gerenciamento da conta"), **sem rastreamento** (sem publicidade, sem cruzar dados com outros apps):
- **Informações de contato:** nome, e-mail, telefone, endereço físico.
- **Informações financeiras:** nenhuma (pagamento fora do app).
- **Conteúdo do usuário:** fotos ou vídeos (envio opcional ao assistente e ao feedback), outras mensagens (conversa com a RDL AI), formulário.
- **Identificadores:** ID do usuário, ID do dispositivo (token de notificação).
- **Dados de uso:** interação com o produto (produtos vistos, último acesso) para análises internas.
- **Diagnósticos:** dados de falhas.
- **Informações sensíveis/localização/contatos/saúde:** nenhuma. Outras: CNPJ e razão social (dados da empresa).
Terceiros que processam dados em nome da empresa: Supabase (banco), Anthropic (IA do assistente, **só após consentimento no app**), Expo/Apple/Google (notificações), Resend (e-mail), BrasilAPI (consulta de CNPJ/CEP).
**Regra 5.1.2 (IA de terceiros):** o app mostra um aviso e só envia mensagens e fotos à IA depois que o cliente aceita (campo `perfis.ia_consentimento_em`; o servidor também recusa sem ele). Confirmar o texto atual da regra no site da Apple antes de enviar.

## 6. Informações para a revisão da Apple
- **Login exigido:** sim. **Conta de demonstração** (criar antes, ver seção 7): e-mail `[preencher]`, senha `[preencher]`.
- **Notas para o avaliador (colar):**
  > O app é de pedidos B2B no atacado da Raio de Luz Artigos Religiosos e é usado por lojistas com CNPJ cadastrado e aprovado pela empresa, por isso o login é obrigatório. Use a conta de demonstração informada (já aprovada). Fluxo: aba Catálogos → escolha um produto (alguns têm santos) → Adicionar ao carrinho → Carrinho → Finalizar compra (o pedido mínimo é R$ 500 em produtos; a conta de demonstração já tem produtos suficientes no carrinho) → Confirmar pedido. O pagamento NÃO é feito no app: o pedido é uma solicitação de compra, combinada depois com a empresa por WhatsApp. Aba RDL AI: assistente de compras com IA; na primeira vez o app pede a permissão para enviar mensagens a um serviço de IA de terceiros. Exclusão de conta: aba Conta → "Excluir minha conta". Notificações push são opcionais. Não há compras dentro do app, anúncios nem login por redes sociais.
- **Backend no ar durante a revisão:** Supabase em plano **Pro** (o grátis pausa por inatividade e a Apple reprova se o login falhar).
- **Pedidos e produtos de demonstração:** a conta de demonstração deve ter histórico de pedidos (fazer 1 pedido acima de R$ 500 e marcar como entregue no painel) e itens no carrinho.

## 7. Conta de demonstração (também serve para a Play Console)
1. Cadastrar pelo app, com e-mail da empresa (ex.: `revisao@raiodeluzreligiosos.com.br`) e um CNPJ válido; confirmar o e-mail.
2. Aprovar no painel (Clientes → aprovar).
3. Entrar no app com a conta, aceitar o aviso da RDL AI e fazer 1 pedido acima de R$ 500; no painel, marcar o pedido como entregue.
4. Anotar e-mail e senha na ficha de revisão da Apple (e em "Acesso ao app" da Play). Testar o login num aparelho limpo.

## 8. Checklist final
Conta ativa · Bundle ID registrado · build no TestFlight testada em iPhone real (login, senha, cadastro, catálogo, carrinho, pedido, notificação, RDL AI, exclusão de conta) · screenshots · ficha · privacidade · conta de demonstração testada · Supabase Pro · enviar para análise.
