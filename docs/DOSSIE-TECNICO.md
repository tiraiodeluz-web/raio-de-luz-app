# Dossiê técnico — Raio de Luz Religiosos (app B2B + painel web)

Atualizado em 05/11/2026. Repositório: `tiraiodeluz-web/raio-de-luz-app` (branch de trabalho `claude/oi-1ee7f4`, espelhada em `main`; a Expo e o painel publicam a partir do `main`).
Dono do projeto: Carlos (tiraiodeluz@gmail.com), único responsável de TI da empresa. Comunicação em português (pt-BR); explicar de forma simples, sem jargão.

---

## 1. VISÃO GERAL

**O que é.** Aplicativo Android (iOS ainda não) de pedidos no atacado da **Raio de Luz Religiosos**, distribuidora de artigos religiosos que vende para lojistas (B2B). Substitui o app antigo feito em Bubble.io. Há também um **painel administrativo web** para a equipe.

**Para quem.**
- **Cliente (lojista):** se cadastra com CNPJ, confirma o e-mail, espera aprovação, navega pelo catálogo, monta carrinho e envia pedido (que vai para o WhatsApp da equipe e fica registrado no banco).
- **Admin (equipe):** aprova cadastros, gerencia catálogo/preços/fotos/banners/cupons/kits, acompanha pedidos e clientes, envia notificações, vê relatórios e custo da IA. Usa o painel web (e uma área `/admin` dentro do app).

**Problema que resolve.** Pedido rápido e sem erro para lojistas (embalagens múltiplas, santo/personalização), catálogo sempre atualizado, avisos por push, e gestão sem depender de Bubble.

**Status atual (05/11/2026).**
- App funcionando em **APK interno canal `preview`** (distribuído por link; testadores próprios). Não há versão de loja (Play Store/App Store) nem iPhone (falta conta Apple Developer).
- Painel no ar: https://raiodeluz-painel.expo.app
- Banco em **Supabase plano grátis** (projeto `zjkhlvomxhtafajbzbjb`, região sa-east-1). Recomendado migrar para Pro antes do lançamento amplo.
- Último APK novo gerado com logo/ícone de notificação corrigidos (build `018889e7-d2cc-4b08-a94e-bf94146d3a38`, commit `bf6473b`). Mudanças de tela posteriores foram por atualização OTA.
- E-mails de cadastro/senha em português por SMTP próprio (Resend, domínio `raiodeluzreligiosos.com.br` verificado). E-mail de "cadastro aprovado" disparado pela Edge Function.

---

## 2. STACK E INFRAESTRUTURA

**App (`/`)**
- Expo SDK **57** (`expo ~57.0.25`), React Native **0.86.3**, React **19.2.3**, TypeScript **~6.0** (strict), `reactCompiler` e `typedRoutes` ligados.
- **Expo Router ~57** (rotas por arquivo em `src/app/`, abas em `src/app/(tabs)`), `@tanstack/react-query` (cache), `@supabase/supabase-js`, `expo-notifications`, `expo-updates` (OTA), `expo-image`, `expo-image-picker`, `expo-print` + `expo-sharing` (PDF do pedido), `expo-file-system`, `react-native-reanimated 4`, `@react-native-community/netinfo` (carrinho offline), `@react-native-async-storage/async-storage`.
- Bundle id/package: `com.raiodeluzreligiosos.mobile`; scheme: `raiodeluz`; owner Expo `tiraiodeluzs-team`; EAS projectId `41e9a84f-4016-4b3c-ab74-e0b335dc343a`.
- `runtimeVersion: { policy: "fingerprint" }` — OTA só chega a APK compatível. Mudança **nativa** (ícone, splash, ícone de notificação, permissões, plugins, pacotes com código nativo) **exige APK novo**; mudança de JS/telas vai por OTA.
- Android 12+: o ícone do splash é recortado em círculo (logo deve caber nos 2/3 centrais). `app.json`: splash `imageWidth 288`; plugin de notificações com `icon: assets/images/notification-icon.png` (96×96+ branco/transparente), `color #C9A227`, `defaultChannel: padrao-v2`.

**Painel (`painel/`)** — projeto separado com `package.json` próprio: Vite 8, React 19, react-router 8 (**HashRouter**), `@tanstack/react-query`, `read-excel-file`. Importa tipos/utilitários do app com alias `@/` → `../src` (por isso o `tsconfig.json` do app **exclui** `painel`). Não importar do app módulos que puxam `react-native` (quebra o build do Vite; ex.: `@/lib/kits` — já tivemos esse erro).

**Backend — Supabase** (`zjkhlvomxhtafajbzbjb`): PostgreSQL + RLS, Auth (e-mail/senha), Storage (bucket público `catalogo`, só admin escreve; bucket `pedidos-pdf` privado com acesso por função), Edge Functions (Deno), `pg_cron`, `pg_net`. Todo SQL está em `supabase/migrations/` (56 arquivos, ordem por data).

**Publicação / EAS**
- `eas.json`: perfis `development`, `preview` (APK, canal `preview`), `production` (canal `production`, ainda não usado).
- `.eas/workflows/publicar-atualizacao.yml`: OTA para o canal `preview` (`workflow_dispatch`, input `mensagem`).
- `.eas/workflows/publicar-painel.yml`: build do painel e `eas deploy --prod --dev-domain raiodeluz-painel`; roda sozinho a cada push em `main` que altere `painel/**`.
- Comandos úteis: `npx expo start`, `npx tsc --noEmit`, `npx expo lint`, `npx expo install <pacote>` (sempre em vez de npm install), `npx eas-cli@latest build -p android --profile preview`, `npx eas-cli@latest workflow:run publicar-atualizacao.yml`. No painel: `cd painel && npm ci && npm run build` (precisa também `npm ci` na raiz, pois o Vite lê `expo/tsconfig.base`).
- Dica operacional: ao disparar workflows pela API/MCP, passar o SHA do commit (`gitRef`); a fila da Expo às vezes atrasa ou executa fora de ordem. Uma OTA leva ~3 a 30 min. Quem abre o app baixa na 1ª abertura e aplica na 2ª.

**Variáveis de ambiente (apenas nomes)**
- App e painel (build): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (chave *publicável*, não secreta; está em `eas.json` e nos workflows).
- Secrets das Edge Functions (Supabase → Edge Functions → Secrets): `ANTHROPIC_API_KEY`, `ASSISTENTE_MODELO` (opcional, padrão `claude-haiku-5-5`), `ASSISTENTE_LIMITE_DIARIO` (opcional, padrão 60), `RESEND_API_KEY`, `EXPO_ACCESS_TOKEN` (opcional); `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`/`SUPABASE_PUBLISHABLE_KEYS` já são injetadas pelo Supabase.
- Banco, tabela `privado.config` (chave→valor, nunca expor): `push_segredo`, `n8n_carrinho_url`, `carrinho_msg_60min`, `carrinho_msg_1dia`.
- Arquivo `google-services.json` (FCM/Android) referenciado em `app.json`.

**URLs.** Painel: https://raiodeluz-painel.expo.app · Supabase: `https://zjkhlvomxhtafajbzbjb.supabase.co` · Página pós-confirmação de e-mail: `https://raiodeluz-painel.expo.app/email-confirmado.html` (`painel/public/email-confirmado.html`) · Links "abrir no app": `https://<projeto>.supabase.co/functions/v1/abrir/<rota>` (função `abrir`, devolve 302 para `raiodeluz://<rota>`).

**Configuração manual no Supabase Auth** (feita pelo dono): SMTP próprio Resend (`smtp.resend.com:465`, usuário `resend`, remetente `nao-responda@raiodeluzreligiosos.com.br`, nome "Raio de Luz Religiosos"); Site URL = página `email-confirmado.html`; Redirect URLs incluem `raiodeluz://**`; modelos de e-mail em `supabase/emails/*.html` (colados no painel do Supabase). Pendente avaliar: proteção contra senhas vazadas (indisponível no plano grátis).

---

## 3. DADOS E INTEGRAÇÕES

### 3.1 Tabelas (schema `public`; campos principais)
- **perfis** (1:1 `auth.users`): `id, nome, cnpj (unique), razao_social, telefone, cep, cidade, uf, tipo (enum admin|cliente), cadastro_aprovado, aprovado_em, codigo (sequencial do cliente), limite_credito, versao_app ('classica'|'2.0'), ultimo_acesso, notificacoes_lidas_em, ultimo_produto_carrinho, carrinho_msg_60min_em, carrinho_msg_1dia_em, bubble_id`.
- **produtos**: `id, sku (unique), nome, referencia, descricao, preco, preco_promocional, preco_efetivo (coluna gerada), embalagem (múltiplo mínimo), estoque, ativo, destaque, vendas, personalizavel, imagem_principal, imagens, categoria_id, catalogo_id, busca, bubble_id`.
- **categorias** / **catalogos**: `id, nome, ordem, ativo, foto_url` (categorias) / `imagem_url` (catálogos — capa **vertical 5:7**, 1000×1400 px).
- **santos**: `id, nome, codigo, foto_url, ordem, ativo`. Código `'15'` = "Personalizado".
- **produto_santos** (variações): `produto_id, santo_id, foto_url` (foto do produto com aquele santo).
- **banners**: `id, titulo, foto_url (1200×600, 2:1), link, ordem, ativo`. `link`: `/catalogo/<id>`, `/categoria/<id>`, `/produto/<id>`, `https://wa.me/...` ou site.
- **kits** (`id, nome, descricao, imagem_url, ativo`) e **kit_itens** (`kit_id, produto_id, santo_id, quantidade, ordem`). Kit não tem preço próprio: soma dos itens.
- **carrinho_itens**: `usuario_id, produto_id, santo_id, quantidade, personalizacao`. **carrinhos_compartilhados**: `id, criado_por, itens (jsonb)`.
- **pedidos**: `id, numero, cliente_id, status (enum), subtotal, desconto, total, cupom_codigo, observacoes, endereco_entrega (jsonb), cliente_snapshot (jsonb), codigo_rastreio, status_alterado_em`. **pedido_itens**: `pedido_id, produto_id, sku, produto_nome, santo_id, santo_nome, quantidade, preco_unitario, subtotal, personalizacao, imagem_url`. Enum `status_pedido`: `aguardando_pagamento, pago, em_separacao, em_producao, enviado, entregue, cancelado`.
- **enderecos** (do cliente), **cupons** (`codigo, valor` fixo em R$, `ativo`), **favoritos**.
- **notificacoes**: `id, titulo, corpo, legenda, imagem_url, rota_destino, catalogo_destino_id, destinatario_id (null = todos), evento (null = envio manual/geral), criado_por`. **fila_push**: `notificacao_id, status (pendente|enviando|enviado|erro), tentativas, erro`. **dispositivos_push**: `usuario_id, token (Expo), plataforma, ativo`. **eventos_push**: `chave, titulo, corpo (com {placeholders}), rota, publico, ativo` — chaves: `cadastro_novo` (admins), `cadastro_aprovado`, `pedido_novo` (admins), `pedido_status`.
- **produto_visualizacoes** (`produto_id, usuario_id, dia, vezes`), **assistente_uso** (`usuario_id, dia, mensagens, tokens_entrada, tokens_saida`), **erros_app** (`mensagem, stack, tela, origem, fatal, plataforma, versao_app, usuario_id`).
- Schema `privado` (não exposto): `config`, funções de trigger/cron.

### 3.2 Funções SQL (RPC) principais
`eh_admin`, `pode_comprar`, `adicionar_ao_carrinho` (p_produto_id, p_quantidade, p_santo_id, p_personalizacao), `adicionar_kit_ao_carrinho`, `admin_salvar_kit`, `criar_pedido(p_endereco_id, p_observacoes, p_cupom)`, `validar_cupom`, `repetir_pedido`, `compartilhar_carrinho` / `carrinho_compartilhado_itens_v2`, `produtos_busca`, `produtos_por_codigos`, `produtos_recomendados`, `categorias_do_catalogo` / `catalogos_da_categoria`, `registrar_dispositivo` / `remover_dispositivo`, `registrar_visualizacao_produto`, `contar_notificacoes_nao_lidas` / `marcar_notificacoes_lidas`, `badge_por_token` (só service_role), `importar_produtos_lote` (admin, máx. 500 por lote), `cnpj_disponivel`, `excluir_minha_conta`, relatórios/painel: `painel_resumo`, `metricas_admin`, `relatorio_produtos`, `relatorio_clientes`, `relatorio_interesse`, `relatorio_custo_ia`, `carrinhos_abandonados`. Internas de push: `push_segredo_confere`, `reservar_fila_push`, `tokens_clientes_aprovados`.

### 3.3 Edge Functions (`supabase/functions/`)
- **processar-fila-push** (`verify_jwt=false`, protegida por cabeçalho `x-push-segredo` conferido via RPC): chamada pelo banco (`pg_net`) quando entra item em `fila_push`; envia pelo Expo Push (`https://exp.host/--/api/v2/push/send`, canal `padrao-v2`, `priority: high`, `badge` = não lidas do dono do aparelho, `richContent.image`). Se `evento = 'cadastro_aprovado'`, também envia e-mail pela API do Resend (`https://api.resend.com/emails`; sem `RESEND_API_KEY`, é pulado). Marca `DeviceNotRegistered` como `ativo=false`.
- **assistente** ("RDL AI"): chama a API Anthropic (`@anthropic-ai/sdk`, modelo `claude-haiku-5-5`) com ferramentas que consultam o catálogo (busca, kits, mostrar produtos, sugerir respostas); limite diário por usuário (`ASSISTENTE_LIMITE_DIARIO`); registra tokens em `assistente_uso`.
- **abrir**: redireciona `https://.../functions/v1/abrir/<rota>` para `raiodeluz://<rota>` (WhatsApp só deixa clicáveis links https).

### 3.4 Integrações externas
- **Resend**: SMTP do Auth e e-mail transacional de cadastro aprovado.
- **Expo Push / FCM**: notificações.
- **Anthropic API**: assistente.
- **BrasilAPI**: consulta de CNPJ no cadastro (`src/lib/brasil-api.ts`) e CEP.
- **WhatsApp** (`src/lib/whatsapp.ts`): `wa.me/5543996081065` (número da equipe/pedidos). Pedido abre WhatsApp com "Oi acabei de realizar o pedido N° X" + link do PDF; "Falar com vendedor" na RDL AI.
- **n8n**: UM fluxo conhecido — carrinho abandonado. `pg_cron` (`carrinho-abandonado`, a cada 5 min) chama `privado.processar_carrinhos_abandonados()`, que faz `net.http_post` para a URL em `privado.config('n8n_carrinho_url')` com `{nome, telefone, mensagem, etapa}` (etapas `60min` e `1dia`; controla com `carrinho_msg_60min_em`/`carrinho_msg_1dia_em`). **A definição do fluxo no n8n NÃO está neste repositório** (quem envia o WhatsApp é o n8n). Também `fila-push-reprocessar` (`pg_cron`, 1/min) reprocessa a fila de push.
- **Google Fotos** (`lh3.googleusercontent.com`): as fotos legadas de produtos/santos vêm de lá; `src/lib/imagem.ts` (`urlImagem(url, 'miniatura'|'card'|'grande')`) reescreve a URL para o tamanho/formato certo (WebP). Imagens enviadas pelo painel vão para o Storage do Supabase (WebP) e passam sem alteração.
- **Bubble** (legado): colunas `bubble_id` guardam o id antigo. Dados já migrados.

### 3.5 Autenticação e autorização
- Supabase Auth, e-mail+senha, com confirmação de e-mail. Cadastro grava `nome, cnpj, razao_social, telefone, cep, cidade, uf` em `raw_user_meta_data`; trigger cria o `perfis`. Sessão persistida (AsyncStorage); `detectSessionInUrl: false`; recuperação de senha por deep link `raiodeluz:///(auth)/redefinir-senha`.
- **RLS em todas as tabelas.** Catálogo (produtos, categorias, catalogos, santos, produto_santos, banners, kits, kit_itens com `ativo`) é **legível por `anon`** (vitrine pública) — decisão herdada da proposta de "app público"; revisar se o app for só para aprovados. Escrita só admin (`eh_admin()`).
- Trigger `tg_perfis_protege_campos`: cliente não pode alterar `tipo, cadastro_aprovado, aprovado_em, codigo, cnpj, versao_app`, campos de carrinho abandonado; admin (ou `app.interno=1`, ou `auth.uid()` nulo, i.e. SQL direto) pode.
- Painel só abre para `perfis.tipo = 'admin'`; guard de rotas do app em `src/app/_layout.tsx`.

---

## 4. REGRAS DE NEGÓCIO

- **Quem compra:** `pode_comprar()` = admin OU `cadastro_aprovado`. Cadastro novo fica em "Aguardando aprovação" (tela `(auth)/aguardando-aprovacao`); só admin aprova.
- **Preço:** `preco_efetivo = preco_promocional` se `> 0`, senão `preco`. Desconto exibido = % entre `preco` e `preco_efetivo`. Cupom = **valor fixo em R$** (`cupons.valor`), limitado ao subtotal (`least(valor, subtotal)`), válido se `ativo` (código case-insensitive).
- **Embalagem:** quantidade mínima e múltiplos de `produtos.embalagem` (o seletor de quantidade anda de embalagem em embalagem; `adicionar_ao_carrinho` usa a embalagem como padrão).
- **Santo/personalização:** só produtos com `personalizavel=true` guardam `santo_id` (senão vira null). Santo de `codigo='15'` ("Personalizado") **exige** texto em `personalizacao`; itens personalizados nunca somam quantidade com outros (texto único). Itens iguais (produto+santo+personalização) somam quantidade.
- **Fotos do santo:** foto grande = `produto_santos.foto_url` → `santos.foto_url` → foto do produto. Miniaturas do seletor de santo = `santos.foto_url` (cadastrada em Painel → Santos); sem ela, foto do produto; "Personalizado" sem foto mostra ícone de lápis (`SantoDoProduto.miniaturaUrl` em `src/lib/produtos.ts`). Carrinho, tela do kit e carrinho do cliente no admin usam `src/lib/fotos-santo.ts`.
- **Pedido (`criar_pedido`):** exige cadastro aprovado e endereço do cliente; subtotal = Σ `quantidade × preco_efetivo` dos itens de **produtos ativos**; carrinho vazio → erro; grava `cliente_snapshot` e `endereco_entrega` (histórico imutável), copia itens (`pedido_copiar_itens`), atualiza `produtos.vendas`, limpa carrinho e zera avisos de carrinho abandonado. `limite_credito` (se houver) só é **exibido** no checkout (não bloqueia).
- **Status do pedido:** enum acima; mudança dispara push `pedido_status` ao cliente (`eventos_push`); novo pedido e novo cadastro disparam push aos admins.
- **Kits:** vão ao carrinho como itens normais, cada um no seu preço; item de produto inativo é pulado (`adicionar_kit_ao_carrinho` informa quantos entraram/ficaram indisponíveis). Santo fixado no kit nunca é "Personalizado". Card do kit mostra "N produtos · M itens" (tipos × unidades).
- **Carrinho offline:** sem internet, itens ficam em fila local (`src/lib/carrinho-offline.ts`) e sincronizam ao voltar.
- **Versão do app por cliente (`perfis.versao_app`):** `classica` esconde recursos 2.0 (assistente, kits, compartilhar carrinho/produto, repetir pedido, recomendados) — usado para demonstrar antes/depois; só admin altera.
- **Notificações:** `destinatario_id null AND evento null` = geral (todos os clientes aprovados + admins); com `evento` = automática. Contador de não lidas = notificações com `criado_em > perfis.notificacoes_lidas_em` destinadas ao usuário (ou gerais); abrir a tela Notificações chama `marcar_notificacoes_lidas`. Número no ícone: `setBadgeCountAsync` no app + `badge` no push (iOS; no Android o launcher soma as notificações da bandeja).
- **Assistente RDL AI:** limite diário de mensagens por usuário; primeira sugestão sempre "Falar com vendedor"; só consulta/mostra catálogo (não cria pedido sozinho).
- **Busca (`produtos_busca`):** palavra a palavra, sem acento, singular (remove "s" final se >4 letras), ignora stopwords; casa nome, SKU, referência, categoria e santos; SKU exato/prefixo vem primeiro; precisa de ≥60% das palavras; só produtos ativos com imagem.
- **Importação de planilha (painel):** linha = variação; agrupa por `GROUPING KEY` → um produto por SKU; coluna sem título entre PACKAGE SIZE e GROUPING KEY = código do santo (vai para `produto_santos` com a foto da linha, `personalizavel=true`); `categoria` e `catalogo` (colunas novas) casam por nome sem acento/caixa e **são criados se não existirem**; preço = moda dos preços; avisos para preços divergentes/sem preço (sem preço válido não importa). Lote máx. 500.
- **Imagens do painel:** recorte obrigatório na proporção do campo (banner 2:1, kit 1:1, capa de catálogo 5:7, notificação 16:9) com "Usar sem recortar"; conversão para WebP no navegador antes de enviar ao Storage.
- **Permissões:** cliente só vê/edita os próprios dados (carrinho, pedidos, endereços, favoritos); admin vê tudo; PDF do pedido: cliente dono ou admin (`pode_acessar_pdf_pedido`).

---

## 5. DECISÕES E HISTÓRICO

**Decisões**
- **Expo + Supabase em vez de continuar no Bubble:** app nativo, custo previsível, código próprio. Segurança no banco (RLS + funções `security definer`), não no app. RLS testada com blocos `DO` desfeitos (rollback).
- **Painel web separado (Vite) em vez de telas admin só no app:** produtividade em desktop (planilhas, recorte de foto, relatórios). Hospedado no EAS Hosting, `HashRouter` por ser site estático.
- **OTA (expo-updates) com fingerprint:** correções sem reinstalar; APK novo só para mudança nativa.
- **Imagens:** miniaturas por tamanho de uso (card ≈12 KB, miniatura ≈6 KB, medido 21/10/2026) vs ~100 KB originais.
- **Push por fila no banco + Edge Function** (não direto do app): confiável, reprocessa falhas (cron 1/min, até 5 tentativas), segredo `x-push-segredo`.
- **Edge Function `abrir` com 302:** a plataforma Supabase reescreve HTML para text/plain, então não dá para servir página.
- **SMTP próprio (Resend):** o envio padrão do Supabase é limitado e não deixa editar modelos.
- **Remoção do botão flutuante de WhatsApp**, aba "RDL AI" na barra inferior (Início, Catálogos, RDL AI, Carrinho, Conta), "Meus pedidos" dentro de Conta (acima de Favoritos).

**Problemas já resolvidos (para não repetir)**
- `File.move()` do `expo-file-system` é assíncrono no SDK 57: sem `await`, o PDF dava ENOENT.
- MCP do Supabase não executa DELETE/DROP sem filtro (trava): usar lotes com `where` ou arquivo SQL manual.
- Splash cortado no Android 12 e ausência de ícone de notificação → arquivos novos + APK novo.
- Link do e-mail de confirmação abria `localhost`: Site URL do Supabase estava no padrão.
- `@/lib/kits` importado no painel puxou `react-native` e quebrou o build (copiar o helper).
- Cards de produto desalinhados: nome com 2 linhas reservadas (`${nome}\n`), preço em duas linhas fixas, botão com `marginTop:'auto'`.
- Push de aprovação não chegava a quem nunca abriu o app antes de ser aprovado (aparelho sem token registrado); registro de token acontece no 1º login, mesmo pendente.
- Workflows da Expo disparados por commit às vezes pegam commit antigo: sempre passar o SHA.
- Funções internas de pedido bloqueadas para `anon/authenticated` (`bloqueia_funcoes_internas_pedido`), faxina de segurança em `20261021121000_faxina_seguranca.sql`.

---

## 6. PENDÊNCIAS

**Do dono (ações manuais)**
- Trocar o branch padrão do GitHub para `main` (Settings → General).
- Rodar `supabase/manutencao/limpar_funcoes_antigas.sql` no SQL Editor do Supabase.
- Contratar **Supabase Pro** antes de liberar para clientes (plano grátis pausa por inatividade e não tem backup diário); habilitar proteção contra senhas vazadas (só no Pro).
- Substituir as capas horizontais antigas dos catálogos por arte vertical 1000×1400.
- Definir fotos dos santos em Painel → Santos (quanto mais, melhor ficam as miniaturas).

**Técnicas**
- **Teste de carga** nunca feito (o ambiente do agente não alcança o Supabase). Capacidade hoje é estimativa.
- **Busca:** 90–475 ms (multi-palavra é a pior). Ideia: coluna de texto pré-calculada + índice (meta < 10 ms).
- ~260 produtos com foto pesada; otimizar.
- Catálogo legível sem login (RLS `*_ler_publico`): confirmar se é desejado.
- Foto do santo ainda não aplicada no **carrinho compartilhado por link** (vem pronta da RPC `carrinho_compartilhado_itens_v2`), no PDF e na lista de pedidos; a foto do santo no painel (página do produto) sobe sem recorte.
- Número no ícone com app fechado só funciona garantido no iPhone; Android depende do launcher.
- `limite_credito` apenas exibido, não bloqueia pedido.
- Não há iPhone: precisa de conta Apple Developer; sem Play Store (APK interno); canal `production` ainda sem uso.
- Contagem atual de produtos: na última medição 1.640 (todos foram apagados a pedido em 26–27/10 e reimportados pela planilha; **confirmar no banco**).
- Neste ambiente de desenvolvimento, `npx tsc --noEmit` reporta 1 erro antigo e inofensivo: `@/global.css` sem declaração; `expo lint` pode falhar por falta de rede.
- Última sessão perdeu temporariamente permissão do MCP do Supabase para `execute_sql` — verificar acesso.

**Ideias em discussão (não iniciadas)**
- Lembrete de reposição por cliente via push com botão; programa de pontos/cashback (definir objetivo); integração com ERP **Command Perfect** (verificar se há API); atalho de contato para quem usa versão Clássica; alerta no painel quando a fila de push/erros falhar; aviso na tela "Aguardando aprovação" para ativar notificações; versão web de teste para Safari; o app "público" proposto em PDF foi só analisado, não executado.

---

## 7. ARQUIVOS-CHAVE

**Raiz**
- `app.json` — nome, scheme, plugins (splash, notificações, image-picker), `runtimeVersion`, URL de updates. · `eas.json` — perfis de build e envs públicos. · `AGENTS.md`/`CLAUDE.md` — regras para agentes (ler docs do Expo da versão certa, usar `expo install`, rodar lint+typecheck). · `.eas/workflows/*.yml` — OTA e deploy do painel. · `docs/DOSSIE-TECNICO.md` — este arquivo.

**`src/app/` (rotas)** — `(tabs)/index` (home: banners, kits, ofertas, mais vendidos; sino com contador), `(tabs)/catalogos` (capas 5:7 em 2 colunas), `(tabs)/assistente` (RDL AI), `(tabs)/carrinho`, `(tabs)/conta`; `produto/[id]` (galeria, seletor de santo, personalização), `kit/[id]`, `checkout`, `pedidos`, `pedido/[id]`, `notificacoes`, `favoritos`, `busca`, `carrinho-compartilhado/[id]`; `(auth)/login|esqueci-senha|redefinir-senha|aguardando-aprovacao|escolher-modo`; `admin/*` (menu admin no app: clientes, pedidos, kits, notificação, eventos push, erros, carrinhos abandonados); `_layout.tsx` (providers + guarda de rotas + tratador de toque em notificação, que navega para `data.rota`).

**`src/lib/` (regra e acesso a dados)** — `supabase.ts` (cliente, lê as 2 envs públicas), `auth-context.tsx` (sessão, perfil, registra push/último acesso), `produtos.ts` (listas, detalhe, santos, miniaturas, notificações), `carrinho.ts` / `carrinho-offline.ts`, `kits.ts`, `fotos-santo.ts`, `pedidos.ts`, `pedido-pdf.ts` + `pedido-pdf-html.ts` (PDF A4 → Storage → link no WhatsApp), `notificacoes-push.ts` (permissão, token, canal `padrao-v2`), `notificacoes-lidas.ts` (contador + badge), `assistente.ts`, `versao-app.ts` (`useRecursos20`), `imagem.ts` (`urlImagem`), `whatsapp.ts`, `admin.ts`, `monitor-erros.ts` (grava em `erros_app`), `brasil-api.ts`, `mascaras.ts`, `formatacao.ts`. Trecho essencial (regra do preço):
```ts
// src/lib/formatacao.ts → precoExibido(preco, promocional) usa promocional se > 0
```
**`src/components/`** — `produto-card.tsx` (card alinhado), `kit-card.tsx`, `seletor-santo-sheet.tsx`, `comprar-rapido.tsx`, `banner-carrossel.tsx`, `button.tsx`, `text-field.tsx`.

**`painel/src/`** — `App.tsx` (rotas), `componentes/estrutura.tsx` (menu lateral), `componentes/campo-imagem.tsx` + `recortador.tsx` (upload com recorte), `componentes/seletor-link.tsx` (link de destino de notificação), `componentes/ui.tsx`; `paginas/`: `inicio, pedidos, pedido, clientes, cliente, cupons, notificacoes, produtos, produto, importar, cadastros (categorias/catálogos/santos), kits, banners, relatorios, custo-ia, erros, login`; `lib/planilha.ts` (parser da planilha de produtos), `lib/imagens.ts` (comprime para WebP e sobe ao bucket `catalogo`, pastas: produtos, santos-produto, banners, categorias, catalogos, santos, kits, notificacoes), `lib/dados.ts` (hooks de listas), `lib/sessao.tsx`, `lib/custo-ia.ts`.

**`supabase/`** — `migrations/` (tudo do banco; **toda mudança de banco entra aqui E é aplicada no projeto**), `functions/processar-fila-push|assistente|abrir`, `emails/confirmar-cadastro.html` e `redefinir-senha.html` (modelos do Auth), `manutencao/limpar_funcoes_antigas.sql`. Migrações de referência: `..._schema.sql` (tabelas), `..._rls.sql` (políticas + trigger de proteção de campos), `..._funcoes.sql` (carrinho/pedido/cupom), `..._push.sql` (eventos/fila), `..._rotinas.sql` (cron + n8n), `20261021120000_busca_por_palavra.sql`, `20261021140200_importar_produtos.sql`, `20261028150000_notificacoes_nao_lidas.sql`.

**Como validar uma mudança:** `npx tsc --noEmit` + `npx expo lint`; painel: `cd painel && npx vite build`; banco: testar com `DO` + rollback; publicar: commit → `main` → workflow OTA (app) / automático (painel) / build novo só se mudar algo nativo.
