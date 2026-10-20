# Ideia guardada: assistente de compras com IA (estilo "Meli")

Status: **MVP implementado em 20/10/2026** — Edge Function `supabase/functions/assistente`,
tela `src/app/assistente.tsx` (botão ✨ no topo da Home), busca
`assistente_buscar_produtos` e controle de uso `assistente_uso` (limite diário
por cliente + tokens gastos). Falta só cadastrar o secret `ANTHROPIC_API_KEY`
no Supabase. Fora do MVP: entrada por voz (o microfone do teclado já funciona),
histórico salvo entre aberturas da tela, tela de custo no admin.

## O que é
Uma tela "Assistente" com chat: o lojista escreve ou fala o que quer
("quero 20 Nossa Senhora Aparecida 30cm", "repete meu último pedido com o
dobro de terços", "tem São Jorge até R$50?") e recebe cards de produto do
**nosso catálogo** com botões de resposta rápida e "adicionar ao carrinho".

## Arquitetura proposta
- Edge Function no Supabase chama a API da Anthropic (chave em secret do
  Supabase, nunca no app).
- A IA só age por ferramentas que nós definimos, reaproveitando o que já existe:
  `buscar_produtos` (nome/santo/categoria/faixa de preço), `ver_produto`,
  `adicionar_ao_carrinho`, `ver_ultimos_pedidos`, `repetir_pedido`.
- Preço e estoque sempre vêm do banco, nunca do texto da IA. Adicionar ao
  carrinho mostra o item antes de confirmar; checkout continua manual.
- Limite de mensagens por cliente/dia para evitar custo por abuso.

## Custo estimado (preços de out/2026, por resposta com busca)
| Modelo | Por resposta | 5.000 respostas/mês |
|---|---|---|
| Claude Haiku 5.5 | ~US$0,001 | ~US$5 (~R$30) |
| Claude Sonnet 5.5 | ~US$0,016 | ~US$80 (~R$440) |

Começar pelo Haiku 5.5 e subir só se errar demais.

## Prós / contras
- Prós: diferencial que ajuda a justificar a mensalidade; pedido mais rápido
  (inclusive por voz); usa carrinho/repetir pedido/personalização existentes.
- Contras: custo variável mensal; só funciona online; depende da qualidade
  do cadastro (nome/categoria/descrição); risco de entender errado (mitigado
  pela confirmação); resposta leva 2–5s (não deixa o resto do app lento).

## Esforço estimado
MVP em ~5–7 dias: Edge Function + ferramentas (2), tela de chat com cards e
chips (2), ajuste e testes com produtos reais (1–2).

## Para começar
Criar conta na Anthropic (cobrança por uso, cartão) e cadastrar a chave como
secret do Supabase (não mandar pelo chat).
