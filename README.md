# Raio de Luz Religiosos — app B2B

App React Native (Expo) que substitui o app Bubble da Raio de Luz Religiosos.
Backend em Supabase (Postgres, Auth, Storage, Edge Functions), hospedado em
São Paulo (`sa-east-1`). O sistema de cotação de frete **não** faz parte
deste app — veja o levantamento de migração para o escopo completo.

## Estrutura

```
src/
  app/            rotas (Expo Router) — src/app/(tabs) tem as 5 abas do cliente
  components/      componentes de UI reutilizáveis
  constants/       tema e cores da marca
  hooks/           hooks (tema, color scheme)
  lib/supabase.ts  cliente Supabase
  types/database.ts tipos gerados a partir do schema do Postgres
supabase/
  migrations/      schema, RLS, funções, push, storage — histórico completo
  functions/       Edge Functions (processar-fila-push)
```

## Configuração

1. Instalar dependências:

   ```bash
   npm install
   ```

2. Variáveis de ambiente — copie `.env.example` para `.env`. A URL e a chave
   publicável (anon) do Supabase já estão preenchidas; não são segredo (o
   acesso aos dados é controlado pelas políticas de RLS de cada tabela, ver
   `supabase/migrations`).

3. Rodar o app:

   ```bash
   npx expo start
   ```

## Banco de dados (Supabase)

O projeto Supabase (`raio-de-luz-app`, região `sa-east-1`) já tem o schema
aplicado. As migrations em `supabase/migrations/` são a fonte da verdade —
para reaplicar do zero num projeto novo:

```bash
npx supabase link --project-ref <project-id>
npx supabase db push
```

Para atualizar os tipos TypeScript depois de uma nova migration:

```bash
npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
```

### Configuração pendente em `privado.config`

Duas chaves ficam vazias até você preencher (não são segredos de app, mas
não têm um valor padrão seguro):

- `n8n_carrinho_url`: URL do webhook do n8n que dispara o WhatsApp de
  carrinho abandonado. Proteja com um token no cabeçalho (ver seção
  Segurança do levantamento).
- A Edge Function `processar-fila-push` precisa do secret
  `EXPO_ACCESS_TOKEN` **apenas** se "Enhanced push security" estiver
  ligado no painel da Expo.

### Configuração pendente no Supabase Auth

Para o link de "Esqueci minha senha" (`redefinir-senha.tsx`) funcionar, em
**Authentication → URL Configuration** do projeto Supabase, adicione
`raiodeluz://redefinir-senha` à lista de Redirect URLs. Sem isso o Supabase
recusa o link enviado por e-mail.

## Estado da migração

Este repositório cobre:

- **Etapa 1** — base do projeto Expo.
- **Etapa 2** — banco (schema, RLS, funções, push) já aplicado no Supabase.
- **Etapa 3** — acesso: splash (`src/app/index.tsx`), login/cadastro com
  BrasilAPI (`src/app/(auth)/login.tsx`), aguardando aprovação, esqueci a
  senha e redefinição de senha por deep link, e o "Ir para?" do admin
  (`escolher-modo.tsx`). O guardião de rotas em `src/app/_layout.tsx`
  decide para onde cada sessão vai.
- **Etapa 4** — vitrine: Início (`(tabs)/index.tsx`), Catálogos
  (`(tabs)/catalogos.tsx`), busca, notificações, "ver todas" de categorias/
  ofertas/mais vendidos, produtos por catálogo/categoria e o detalhe do
  produto com seletor de santo (`src/app/produto/[id].tsx`).
- **Etapa 5** — compra: aba Carrinho (`(tabs)/carrinho.tsx`) com
  quantidade, remover item e cupom, e `src/app/checkout.tsx` com endereço
  (CEP pela BrasilAPI, sugerindo o endereço salvo — regra 9), resumo e
  "Confirmar pedido". Ao confirmar, chama `criar_pedido` (transação no
  banco) e abre o WhatsApp com "Oi acabei de realizar o pedido N° X"
  (regra 13).
- **Etapa 6** — cliente: aba Meus pedidos (`(tabs)/pedidos.tsx`, sem
  cancelar — decisão tomada #6, só o admin cancela) e o detalhe do pedido
  (`src/app/pedido/[id].tsx`); Conta (`(tabs)/conta.tsx`) com foto, nome,
  telefone, CNPJ, política de privacidade, sobre o app, "Ver como admin"
  (para admins) e exclusão de conta (exigência das lojas).
- **Etapa 7** — admin: `src/app/admin/` com menu lateral (Métricas,
  Pedidos, Clientes, Carrinhos abandonados, Enviar notificação, Ver como
  usuário, Sair). Métricas usa a RPC `metricas_admin`; Pedidos tem busca
  por número e filtro por status, com o detalhe avançando o status
  (Aguardando Pagamento → Pago → Em Separação → Em Produção → Enviado →
  Entregue) ou cancelando; Clientes tem abas Aprovados/Aprovar, busca por
  código, total gasto e indicador "online" (regra 12 — por isso
  `perfis.ultimo_acesso` agora é atualizado ao abrir o app, em
  `src/lib/auth-context.tsx`); Carrinhos abandonados usa a RPC
  `carrinhos_abandonados`. `src/app/admin/_layout.tsx` bloqueia quem não
  é admin (a RLS já bloqueia os dados; isso só evita a tela vazia).
- **Etapa 8** — push: registro de aparelho após o login
  (`src/lib/notificacoes-push.ts`, chamado de `auth-context.tsx`), canal
  Android criado em runtime (precisa bater com o `channelId: "padrao"`
  que a Edge Function já usava desde a etapa 2), toque na notificação
  navegando para a rota gravada no evento (`useLastNotificationResponse`
  no guardião de rotas) e a tela `src/app/admin/eventos-push.tsx` pra
  ligar/desligar cada evento (regra: "cada um desligável por
  configuração").

Ainda falta a etapa 9 (lojas e virada).

A carga de ensaio a partir do Bubble depende de liberar a Data API no
Bubble e gerar um token (Settings → API); isso ainda não foi feito.

### Correção de RLS na etapa 4

A migration `20260928180958_vitrine_publica.sql` corrige um problema nas
políticas de `catalogos`, `categorias`, `santos`, `produtos`,
`produto_santos` e `banners`: elas exigiam `pode_comprar()` (cadastro
aprovado ou admin) até para leitura, o que quebrava a regra "sem login, o
cliente navega pela Home e catálogos" — nem visitante anônimo nem cadastro
pendente conseguiam ver produto nenhum. Agora a leitura é pública (só
`ativo = true`); carrinho, cupom e pedido continuam exigindo aprovação.

### Correção na etapa 7: código do cliente nunca era gerado

A migration `20260928194546_codigo_cliente_sequencial.sql` corrige outro
gap: a tela de admin "Clientes" busca e mostra `perfis.codigo`, mas nada
preenchia essa coluna desde o cadastro (etapa 3) — ficava sempre `null`.
Agora um gatilho gera um código sequencial (`C0001`, `C0002`...) no
cadastro, como já existia para o número do pedido.

### Gap conhecido: WhatsApp de cadastro aprovado

O levantamento da migração diz que aprovar um cliente "envia push... e
dispara mensagem de WhatsApp pelo n8n". O push já funciona (evento
`cadastro_aprovado` → fila de push, testado nesta etapa). O disparo de
WhatsApp via n8n não tem, hoje, uma URL de webhook configurada para esse
evento em `privado.config` (só existe `n8n_carrinho_url`, do carrinho
abandonado) — precisa ser adicionado se esse WhatsApp for necessário.

### Correção na etapa 8: rotas de push não batiam com as telas reais

As rotas em `eventos_push.rota` foram escritas na etapa 2, antes de as
telas existirem, e não batiam com o app final. A migration
`20260928195312_corrige_rotas_eventos_push.sql` corrige:

| Evento | Rota errada (etapa 2) | Rota corrigida |
|---|---|---|
| `pedido_novo` (admin) | `/admin/pedidos/{pedido_id}` | `/admin/pedido/{pedido_id}` |
| `pedido_status` (cliente) | `/pedidos/{pedido_id}` | `/pedido/{pedido_id}` |
| `cadastro_aprovado` (cliente) | `/` (é a splash) | `/(tabs)` (Início de verdade) |
| `cadastro_novo` (admin) | `/admin/clientes?aba=aprovar` | mesma — mas a tela ignorava o `?aba`, corrigido em `admin/clientes.tsx` |

Sem essa correção, tocar numa notificação de pedido novo, status
alterado ou cadastro aprovado abriria uma tela errada (ou a splash, no
caso do cadastro aprovado).

### ⚠️ Pendência que bloqueia testar push de verdade: projeto EAS

`getExpoPushTokenAsync` exige um `projectId` do EAS
(`Constants.expoConfig.extra.eas.projectId`), e isso só existe depois de
rodar `eas init` com uma conta Expo — que este ambiente não tem como
fazer (precisa de login interativo). Enquanto isso não for feito,
`src/lib/notificacoes-push.ts` detecta a ausência do `projectId`, avisa
no console e **não tenta buscar o token** (não trava o app, só não
registra push). Depois de criar o projeto EAS (`npx eas init`), nada
mais precisa mudar no código — o `projectId` passa a existir em
`app.json`/`Constants` automaticamente.

Duas outras limitações do ambiente de teste, para quem for validar isso:
- **Push remoto não funciona no Expo Go** desde as versões recentes do
  SDK — precisa de um development build (`eas build --profile
  development` ou `npx expo run:android`/`run:ios`).
- Emulador/simulador não recebe push de verdade
  (`src/lib/notificacoes-push.ts` já pula o registro quando
  `Device.isDevice` é falso) — o teste final precisa de aparelho físico.

### O que não pôde ser testado neste ambiente

Sem simulador/dispositivo disponível aqui, a validação foi:
`tsc --noEmit` limpo em todo o app; as consultas da vitrine (etapa 4)
testadas direto no Postgres com `set role anon`; o fluxo de compra
completo da etapa 5 (embalagem múltipla, `adicionar_ao_carrinho` somando
quantidade em vez de duplicar, cupom, `criar_pedido` em transação,
carrinho esvaziado, vendas incrementadas), a exclusão de conta da etapa 6
(`excluir_minha_conta` apaga `auth.users` e `perfis` em cascata), as
ações do admin na etapa 7 (`metricas_admin`, `carrinhos_abandonados`,
aprovar cliente disparando o push automático, avançar status de pedido
disparando o push automático, enviar notificação) e, na etapa 8, o
liga/desliga de cada evento (`eventos_push.ativo = false` de fato
suprime a notificação; religar volta a disparar — confirmado nos dois
sentidos) e as rotas gravadas em cada evento após a correção acima,
todos testados simulando sessões autenticadas no Postgres
(`request.jwt.claims`) com usuários e produtos de teste, removidos
depois. O que a etapa 8 **não** testa — porque exige um aparelho físico
e um projeto EAS que não existem aqui — é o caminho ponta a ponta real:
pedir a permissão do sistema operacional, registrar o token Expo de
verdade, a Edge Function `processar-fila-push` entregando pelo Expo
Push Service, e o toque na notificação abrindo o app na tela certa. A
lógica de cada etapa desse caminho foi conferida separadamente (a
função do banco que gera a fila, a Edge Function já testada na etapa 2,
e agora as rotas), mas o caminho completo só se prova num teste manual
num aparelho real, depois de criar o projeto EAS. O fluxo de login/
cadastro/redefinição de senha (etapa 3) só foi validado por leitura.

### Texto provisório

`src/app/politica-privacidade.tsx` tem um texto genérico gerado na
migração — precisa ser revisado antes de publicar. `src/constants/
institucional.ts` deixa site, Instagram e e-mail como `null` (a tela
"Sobre o aplicativo" esconde o link em vez de inventar uma URL) até
alguém preencher com os dados reais.

## Publicação (EAS)

`eas.json` já tem os perfis `development`, `preview` e `production`. O
pacote Android é `com.raiodeluzreligiosos.mobile` (o mesmo do app já
publicado) — mantenha o mesmo keystore ou ative o Play App Signing antes
do primeiro build de produção.
