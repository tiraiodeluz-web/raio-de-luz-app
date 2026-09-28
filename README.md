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

## Estado da migração

Este repositório cobre a Etapa 1 (base do projeto) e a Etapa 2 (banco) do
plano de execução. Ainda faltam as etapas 3 a 9 (acesso, vitrine, compra,
cliente, admin, push, lojas e virada) — as 5 abas hoje são telas
provisórias que apontam para a etapa que as substitui.

A carga de ensaio a partir do Bubble depende de liberar a Data API no
Bubble e gerar um token (Settings → API); isso ainda não foi feito.

## Publicação (EAS)

`eas.json` já tem os perfis `development`, `preview` e `production`. O
pacote Android é `com.raiodeluzreligiosos.mobile` (o mesmo do app já
publicado) — mantenha o mesmo keystore ou ative o Play App Signing antes
do primeiro build de produção.
