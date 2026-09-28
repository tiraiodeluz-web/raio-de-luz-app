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

Ainda faltam as etapas 7 a 9 (admin, push, lojas e virada) — a área
administrativa (métricas, pedidos, clientes, carrinhos abandonados,
notificações) ainda não existe; "Ver como admin" mostra um aviso.

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

### O que não pôde ser testado neste ambiente

Sem simulador/dispositivo disponível aqui, a validação foi:
`tsc --noEmit` limpo em todo o app; as consultas da vitrine (etapa 4)
testadas direto no Postgres com `set role anon`; o fluxo de compra
completo da etapa 5 (embalagem múltipla, `adicionar_ao_carrinho` somando
quantidade em vez de duplicar, cupom, `criar_pedido` em transação,
carrinho esvaziado, vendas incrementadas) e a exclusão de conta da etapa 6
(`excluir_minha_conta` apaga `auth.users` e `perfis` em cascata), todos
testados simulando uma sessão autenticada no Postgres
(`request.jwt.claims`) com usuários e produtos de teste, removidos
depois. O fluxo de login/cadastro/redefinição de senha (etapa 3) só foi
validado por leitura. Vale um teste manual completo num dispositivo real
antes de seguir para a etapa 7.

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
