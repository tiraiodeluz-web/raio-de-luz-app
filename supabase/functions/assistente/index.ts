// Edge Function: assistente
//
// Assistente de compras com IA (Claude). O app manda o histórico curto da
// conversa; a função chama o modelo com ferramentas que consultam o
// catálogo e mexem no carrinho **como o próprio cliente** (cliente Supabase
// criado com o token dele, então toda a RLS e as funções do banco valem
// igual ao app). Preço/estoque sempre vêm do banco, nunca do texto da IA.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY         obrigatório
//   ASSISTENTE_MODELO         opcional (padrão claude-haiku-5-5)
//   ASSISTENTE_LIMITE_DIARIO  opcional (padrão 60 mensagens por cliente/dia)
//
// Deploy com verify_jwt = false: a função valida o usuário no código
// (auth.getUser), porque o verify_jwt da plataforma não entende as chaves
// novas (sb_publishable_...).
import Anthropic from "npm:@anthropic-ai/sdk@0.136.0";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";

const MODELO = Deno.env.get("ASSISTENTE_MODELO") || "claude-haiku-5-5";
const LIMITE_DIARIO = Number(Deno.env.get("ASSISTENTE_LIMITE_DIARIO") || "60");
const MAX_RODADAS = 6;
const MAX_HISTORICO = 16;
const MAX_TEXTO = 1500;

const SISTEMA = `Você é o assistente de compras do app da Raio de Luz Religiosos, distribuidora de artigos religiosos que vende no atacado para lojistas. Você conversa pelo celular com o lojista e ajuda a encontrar produtos do catálogo e montar o pedido.

Como agir:
- Responda em português do Brasil, curto e direto, como numa conversa de WhatsApp: 1 a 3 frases. Sem markdown, sem títulos, sem listas longas.
- Só fale de produtos que vieram das ferramentas. Nunca invente produto, preço, estoque, prazo ou desconto. Preço em reais no formato R$ 2,62.
- Para buscar, use buscar_produtos com poucas palavras-chave (ex.: "chaveiro", "terço aparecida", ou o código "CH.032"). Se não achar, tente outra palavra (sinônimo, singular, só o tipo do produto) antes de dizer que não tem.
- Sempre que recomendar ou listar produtos, chame mostrar_produtos com os ids (até 8, do mais relevante ao menos). O app mostra os cards com foto, preço e botão de comprar, então no texto comente só o essencial, sem repetir a lista.
- Quantidade: cada produto é vendido em embalagens (campo embalagem) e a quantidade tem que ser múltipla dela. Se o cliente pedir um número que não é múltiplo (ex.: 20 com embalagem 6), proponha o múltiplo mais próximo (18 ou 24) antes de adicionar. Sem quantidade informada, use uma embalagem.
- Santos: produto personalizável tem variações por santo e o santo é obrigatório para adicionar. Use ver_produto para pegar o santo_id certo. Se o cliente não disse o santo, pergunte e sugira as opções. O santo "Personalizado" exige o texto da personalização (nome, frase, data): pergunte antes de adicionar.
- Só adicione ao carrinho quando o cliente pedir claramente (ex.: "adiciona", "quero 12", "coloca no carrinho"). Depois, confirme em uma frase o que entrou.
- Pedir de novo: ver_ultimos_pedidos e repetir_pedido. Kits prontos: listar_kits, mostrar_kits e adicionar_kit_ao_carrinho.
- Você não finaliza pedido, não aplica cupom e não negocia preço, prazo ou frete. Para fechar o pedido, oriente a abrir o Carrinho do app. Para negociar, oriente a falar com o vendedor pelo WhatsApp do app.
- Fotos: o cliente pode mandar foto de um produto (imagem de santo, terço, chaveiro, peça de outro fornecedor) ou de uma lista de pedido escrita à mão ou impressa. Descreva em poucas palavras o que você entendeu e busque no catálogo o equivalente mais próximo. Se for lista de pedido, leia item por item, busque cada um e mostre o que achou; confirme com o cliente antes de adicionar tudo, e diga quais itens não encontrou. Se a foto estiver ilegível, peça outra.
- Se o assunto não for produtos ou pedidos da loja, diga com gentileza que você só ajuda com as compras na Raio de Luz.
- Escreva a resposta e, na mesma mensagem, chame sugerir_respostas com 2 ou 3 próximos passos curtos que o cliente provavelmente vai querer tocar (ex.: "Adicionar 12", "Ver outros santos", "Repetir último pedido").`;

const FERRAMENTAS: Anthropic.Tool[] = [
  {
    name: "buscar_produtos",
    description:
      "Busca produtos ativos do catálogo por palavras-chave (nome, código, categoria ou santo), sem diferenciar acentos. Sem termo, devolve os mais vendidos. Devolve id, sku, nome, preço, embalagem, se é personalizável (tem santo) e os santos disponíveis.",
    input_schema: {
      type: "object",
      properties: {
        termo: { type: "string", description: "Palavras-chave curtas. Ex.: 'chaveiro', 'terço aparecida', 'CH.032'." },
        preco_maximo: { type: "number", description: "Preço unitário máximo em reais." },
        apenas_ofertas: { type: "boolean", description: "true para só produtos em oferta." },
      },
    },
  },
  {
    name: "ver_produto",
    description: "Detalhes de um produto: descrição, preço, embalagem e a lista de santos (com santo_id) quando é personalizável.",
    input_schema: {
      type: "object",
      properties: { produto_id: { type: "string" } },
      required: ["produto_id"],
    },
  },
  {
    name: "adicionar_ao_carrinho",
    description:
      "Adiciona um produto ao carrinho do cliente. Só use quando o cliente pedir. quantidade deve ser múltipla da embalagem. santo_id é obrigatório em produto personalizável; personalizacao é obrigatória quando o santo é 'Personalizado'.",
    input_schema: {
      type: "object",
      properties: {
        produto_id: { type: "string" },
        quantidade: { type: "integer", minimum: 1 },
        santo_id: { type: "string" },
        personalizacao: { type: "string", description: "Texto da personalização (só para o santo 'Personalizado')." },
      },
      required: ["produto_id", "quantidade"],
    },
  },
  {
    name: "ver_carrinho",
    description: "Itens que estão no carrinho do cliente agora, com quantidades e subtotal.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "ver_ultimos_pedidos",
    description: "Os 5 últimos pedidos do cliente, com número, data, status, total e itens.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "repetir_pedido",
    description: "Coloca no carrinho todos os itens ainda disponíveis de um pedido anterior do cliente. Só use quando o cliente pedir.",
    input_schema: {
      type: "object",
      properties: { pedido_id: { type: "string" } },
      required: ["pedido_id"],
    },
  },
  {
    name: "listar_kits",
    description: "Kits prontos montados pela loja (vários produtos juntos), com itens e total.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "adicionar_kit_ao_carrinho",
    description: "Coloca todos os produtos de um kit no carrinho. Só use quando o cliente pedir.",
    input_schema: {
      type: "object",
      properties: { kit_id: { type: "string" } },
      required: ["kit_id"],
    },
  },
  {
    name: "mostrar_produtos",
    description: "Mostra para o cliente os cards (foto, preço, botão de comprar) dos produtos indicados, na ordem dada.",
    input_schema: {
      type: "object",
      properties: { produto_ids: { type: "array", items: { type: "string" }, maxItems: 8 } },
      required: ["produto_ids"],
    },
  },
  {
    name: "mostrar_kits",
    description: "Mostra para o cliente os cards dos kits indicados.",
    input_schema: {
      type: "object",
      properties: { kit_ids: { type: "array", items: { type: "string" }, maxItems: 6 } },
      required: ["kit_ids"],
    },
  },
  {
    name: "sugerir_respostas",
    description: "Mostra até 3 botões de resposta rápida para o cliente tocar. Textos curtos (até 30 caracteres).",
    input_schema: {
      type: "object",
      properties: { opcoes: { type: "array", items: { type: "string" }, maxItems: 3 } },
      required: ["opcoes"],
    },
  },
];

const FERRAMENTAS_DE_EXIBICAO = new Set(["mostrar_produtos", "mostrar_kits", "sugerir_respostas"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type MensagemApp = {
  papel: "cliente" | "assistente";
  texto: string;
  produtos?: { id: string; nome: string }[];
  // Só a mensagem nova traz a foto (JPEG em base64, já reduzida no app); nas
  // anteriores vem só temFoto, pra não pagar a imagem de novo a cada rodada.
  temFoto?: boolean;
  fotoBase64?: string;
};

// ~4,5 MB de imagem; o app manda bem menos (lado maior 1280px).
const MAX_FOTO_BASE64 = 6_000_000;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

type Saida = { produtoIds: string[]; kitIds: string[]; sugestoes: string[]; carrinhoAlterado: boolean };

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}

function chavePublica(): string {
  const chaves = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (chaves) {
    try {
      const padrao = JSON.parse(chaves).default;
      if (padrao) return padrao;
    } catch {
      // cai pra chave legada abaixo
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY")!;
}

function precoEfetivo(p: { preco: number; preco_promocional: number | null }) {
  return p.preco_promocional && p.preco_promocional > 0 ? p.preco_promocional : p.preco;
}

function resumirSantos(lista: string | null) {
  if (!lista) return null;
  const nomes = lista.split(", ");
  return nomes.length > 10 ? `${nomes.slice(0, 10).join(", ")} e mais ${nomes.length - 10}` : lista;
}

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function idValido(v: unknown): string {
  if (typeof v !== "string" || !UUID.test(v)) throw new Error("id inválido");
  return v;
}

async function executarFerramenta(
  db: SupabaseClient,
  nome: string,
  entrada: Record<string, unknown>,
  saida: Saida,
): Promise<unknown> {
  switch (nome) {
    case "buscar_produtos": {
      const { data, error } = await db.rpc("assistente_buscar_produtos", {
        p_termo: texto(entrada.termo),
        p_preco_max: typeof entrada.preco_maximo === "number" ? entrada.preco_maximo : null,
        p_apenas_ofertas: entrada.apenas_ofertas === true,
        p_limite: 10,
      });
      if (error) throw error;
      const produtos = (data ?? []).map((p: Record<string, unknown>) => ({
        id: p.id,
        sku: p.sku,
        nome: p.nome,
        preco: p.preco,
        embalagem: p.embalagem,
        categoria: p.categoria,
        em_oferta: p.em_oferta,
        personalizavel: p.personalizavel,
        santos: p.personalizavel ? resumirSantos(p.santos as string | null) : undefined,
      }));
      return produtos.length ? { produtos } : { produtos: [], aviso: "Nada encontrado com esse termo." };
    }

    case "ver_produto": {
      const { data, error } = await db
        .from("produtos")
        .select("id, sku, nome, descricao, preco, preco_promocional, embalagem, personalizavel, ativo, produto_santos ( santos ( id, nome, codigo, ordem ) )")
        .eq("id", idValido(entrada.produto_id))
        .maybeSingle();
      if (error) throw error;
      if (!data || !data.ativo) return { erro: "Produto indisponível." };
      const santos = data.personalizavel
        ? (data.produto_santos ?? [])
            .map((ps: { santos: unknown }) => ps.santos as { id: string; nome: string; codigo: string | null; ordem: number } | null)
            .filter((s): s is { id: string; nome: string; codigo: string | null; ordem: number } => !!s)
            .sort((a, b) => a.ordem - b.ordem)
            .map((s) => ({ santo_id: s.id, nome: s.nome, exige_personalizacao: s.codigo === "15" || undefined }))
        : [];
      return {
        id: data.id,
        sku: data.sku,
        nome: data.nome,
        descricao: data.descricao,
        preco: precoEfetivo(data),
        embalagem: data.embalagem,
        personalizavel: data.personalizavel,
        santos,
      };
    }

    case "adicionar_ao_carrinho": {
      const quantidade = Number(entrada.quantidade);
      if (!Number.isInteger(quantidade) || quantidade < 1) return { erro: "Quantidade inválida." };
      const { error } = await db.rpc("adicionar_ao_carrinho", {
        p_produto_id: idValido(entrada.produto_id),
        p_quantidade: quantidade,
        p_santo_id: entrada.santo_id ? idValido(entrada.santo_id) : null,
        // Sempre informado (mesmo null): o banco tem duas versões da função
        // e só esse parâmetro garante que resolva pra versão nova.
        p_personalizacao: texto(entrada.personalizacao),
      });
      if (error) return { erro: error.message };
      saida.carrinhoAlterado = true;
      return { ok: true, adicionado: { produto_id: entrada.produto_id, quantidade } };
    }

    case "ver_carrinho": {
      const { data, error } = await db
        .from("carrinho_itens")
        .select("quantidade, personalizacao, produtos ( nome, preco, preco_promocional, embalagem ), santos ( nome )")
        .order("criado_em", { ascending: true });
      if (error) throw error;
      let subtotal = 0;
      const itens = (data ?? []).flatMap((i: Record<string, unknown>) => {
        const p = i.produtos as { nome: string; preco: number; preco_promocional: number | null; embalagem: number } | null;
        if (!p) return [];
        const preco = precoEfetivo(p);
        subtotal += preco * (i.quantidade as number);
        return [{
          produto: p.nome,
          santo: (i.santos as { nome: string } | null)?.nome,
          personalizacao: i.personalizacao ?? undefined,
          quantidade: i.quantidade,
          preco_unitario: preco,
        }];
      });
      return { itens, subtotal: Math.round(subtotal * 100) / 100 };
    }

    case "ver_ultimos_pedidos": {
      const { data, error } = await db
        .from("pedidos")
        .select("id, numero, status, total, criado_em, pedido_itens ( produto_nome, santo_nome, quantidade, personalizacao )")
        .order("criado_em", { ascending: false })
        .limit(5);
      if (error) throw error;
      return { pedidos: data ?? [] };
    }

    case "repetir_pedido": {
      const { data, error } = await db.rpc("repetir_pedido", { p_pedido_id: idValido(entrada.pedido_id) });
      if (error) return { erro: error.message };
      saida.carrinhoAlterado = true;
      return data?.[0] ?? { itens_adicionados: 0, itens_indisponiveis: 0 };
    }

    case "listar_kits": {
      const { data, error } = await db
        .from("kits")
        .select("id, nome, descricao, kit_itens ( quantidade, produtos ( nome, preco, preco_promocional, ativo ), santos ( nome ) )")
        .eq("ativo", true)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      const kits = (data ?? []).map((k: Record<string, unknown>) => {
        let total = 0;
        const itens = (k.kit_itens as Record<string, unknown>[]).flatMap((i) => {
          const p = i.produtos as { nome: string; preco: number; preco_promocional: number | null; ativo: boolean } | null;
          if (!p || !p.ativo) return [];
          total += precoEfetivo(p) * (i.quantidade as number);
          return [`${i.quantidade}x ${p.nome}${(i.santos as { nome: string } | null)?.nome ? ` (${(i.santos as { nome: string }).nome})` : ""}`];
        });
        return { id: k.id, nome: k.nome, itens, total: Math.round(total * 100) / 100 };
      });
      return { kits };
    }

    case "adicionar_kit_ao_carrinho": {
      const { data, error } = await db.rpc("adicionar_kit_ao_carrinho", { p_kit_id: idValido(entrada.kit_id) });
      if (error) return { erro: error.message };
      saida.carrinhoAlterado = true;
      return data?.[0] ?? { itens_adicionados: 0, itens_indisponiveis: 0 };
    }

    case "mostrar_produtos": {
      const ids = (Array.isArray(entrada.produto_ids) ? entrada.produto_ids : []).filter((id) => typeof id === "string" && UUID.test(id));
      for (const id of ids.slice(0, 8)) if (!saida.produtoIds.includes(id)) saida.produtoIds.push(id);
      return { ok: true, exibidos: ids.length };
    }

    case "mostrar_kits": {
      const ids = (Array.isArray(entrada.kit_ids) ? entrada.kit_ids : []).filter((id) => typeof id === "string" && UUID.test(id));
      for (const id of ids.slice(0, 6)) if (!saida.kitIds.includes(id)) saida.kitIds.push(id);
      return { ok: true, exibidos: ids.length };
    }

    case "sugerir_respostas": {
      const opcoes = (Array.isArray(entrada.opcoes) ? entrada.opcoes : [])
        .filter((o): o is string => typeof o === "string" && o.trim().length > 0)
        .map((o) => o.trim().slice(0, 40))
        .slice(0, 3);
      saida.sugestoes = opcoes;
      return { ok: true };
    }

    default:
      return { erro: `Ferramenta desconhecida: ${nome}` };
  }
}

// O app guarda só texto + os produtos mostrados; aqui vira o histórico do
// modelo. Os ids dos produtos mostrados vão junto pra ele conseguir
// responder "adiciona o segundo" sem buscar de novo.
function montarHistorico(mensagens: MensagemApp[]): Anthropic.MessageParam[] {
  const historico: Anthropic.MessageParam[] = [];
  for (const m of mensagens.slice(-MAX_HISTORICO)) {
    const conteudo = String(m.texto ?? "").slice(0, MAX_TEXTO).trim();
    if (m.papel === "assistente") {
      const produtos = (m.produtos ?? []).slice(0, 8).map((p, i) => `${i + 1}. ${p.nome} (id ${p.id})`).join("; ");
      const completo = [conteudo, produtos ? `[Produtos mostrados: ${produtos}]` : ""].filter(Boolean).join("\n");
      if (completo && historico.length > 0) historico.push({ role: "assistant", content: completo });
    } else {
      const foto = typeof m.fotoBase64 === "string" ? m.fotoBase64 : "";
      if (foto && foto.length <= MAX_FOTO_BASE64 && BASE64.test(foto)) {
        historico.push({
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: foto } },
            { type: "text", text: conteudo || "O que é isso? Vocês têm?" },
          ],
        });
      } else if (conteudo || m.temFoto) {
        historico.push({ role: "user", content: m.temFoto ? `[O cliente mandou uma foto nesta mensagem.] ${conteudo}`.trim() : conteudo });
      }
    }
  }
  return historico;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405);

  const chaveAnthropic = Deno.env.get("ANTHROPIC_API_KEY");
  if (!chaveAnthropic) return json({ erro: "O assistente ainda não foi configurado." }, 503);

  const autorizacao = req.headers.get("Authorization") ?? "";
  const token = autorizacao.replace(/^Bearer\s+/i, "");
  if (!token) return json({ erro: "Faça login para usar o assistente." }, 401);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, chavePublica(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: usuario, error: erroUsuario } = await db.auth.getUser(token);
  if (erroUsuario || !usuario.user) return json({ erro: "Sessão expirada. Entre de novo no app." }, 401);

  let corpo: { mensagens?: MensagemApp[] };
  try {
    corpo = await req.json();
  } catch {
    return json({ erro: "Requisição inválida." }, 400);
  }
  const recebidas = Array.isArray(corpo.mensagens) ? corpo.mensagens : [];
  if (recebidas.some((m) => typeof m?.fotoBase64 === "string" && m.fotoBase64.length > MAX_FOTO_BASE64)) {
    return json({ erro: "Foto muito grande. Tente outra." }, 413);
  }
  const historico = montarHistorico(recebidas);
  if (historico.length === 0 || historico[historico.length - 1].role !== "user") {
    return json({ erro: "Mensagem vazia." }, 400);
  }

  const { data: usadasHoje, error: erroUso } = await db.rpc("assistente_registrar_mensagem");
  if (erroUso) {
    const status = erroUso.code === "42501" ? 403 : 500;
    return json({ erro: status === 403 ? "O assistente fica disponível depois que seu cadastro for aprovado." : erroUso.message }, status);
  }
  if ((usadasHoje as number) > LIMITE_DIARIO) {
    return json({ erro: "Você atingiu o limite de mensagens do assistente por hoje. Amanhã libera de novo!" }, 429);
  }

  const anthropic = new Anthropic({ apiKey: chaveAnthropic });
  const saida: Saida = { produtoIds: [], kitIds: [], sugestoes: [], carrinhoAlterado: false };
  const mensagens: Anthropic.MessageParam[] = historico;
  let textoFinal = "";
  let tokensEntrada = 0;
  let tokensSaida = 0;

  try {
    for (let rodada = 0; rodada < MAX_RODADAS; rodada++) {
      const resposta = await anthropic.messages.create({
        model: MODELO,
        max_tokens: 4096,
        system: SISTEMA,
        tools: FERRAMENTAS,
        messages: mensagens,
        output_config: { effort: "low" },
        cache_control: { type: "ephemeral" },
      });
      tokensEntrada += resposta.usage.input_tokens + (resposta.usage.cache_read_input_tokens ?? 0) + (resposta.usage.cache_creation_input_tokens ?? 0);
      tokensSaida += resposta.usage.output_tokens;

      if (resposta.stop_reason === "refusal") {
        textoFinal = "Desculpe, não consigo ajudar com isso. Posso te ajudar a encontrar produtos da loja?";
        break;
      }

      const textoDaRodada = resposta.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      if (textoDaRodada) textoFinal = textoDaRodada;

      const usos = resposta.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (resposta.stop_reason !== "tool_use" || usos.length === 0) break;

      mensagens.push({ role: "assistant", content: resposta.content });
      const resultados: Anthropic.ToolResultBlockParam[] = await Promise.all(
        usos.map(async (uso) => {
          try {
            const resultado = await executarFerramenta(db, uso.name, (uso.input ?? {}) as Record<string, unknown>, saida);
            const deuErro = typeof resultado === "object" && resultado !== null && "erro" in resultado;
            return { type: "tool_result" as const, tool_use_id: uso.id, content: JSON.stringify(resultado), is_error: deuErro || undefined };
          } catch (e) {
            const mensagem = (e as { message?: string } | null)?.message ?? "falha";
            return { type: "tool_result" as const, tool_use_id: uso.id, content: JSON.stringify({ erro: mensagem }), is_error: true };
          }
        }),
      );
      mensagens.push({ role: "user", content: resultados });

      // Se o modelo já escreveu a resposta e só pediu ferramentas de
      // exibição (cards/sugestões), não precisa de mais uma ida ao modelo.
      if (textoDaRodada && usos.every((u) => FERRAMENTAS_DE_EXIBICAO.has(u.name))) break;
    }
  } catch (e) {
    console.error("assistente: erro na API", e);
    return json({ erro: "O assistente está indisponível agora. Tente de novo em instantes." }, 502);
  } finally {
    await db.rpc("assistente_registrar_tokens", { p_entrada: tokensEntrada, p_saida: tokensSaida });
  }

  let produtos: unknown[] = [];
  if (saida.produtoIds.length > 0) {
    const { data } = await db
      .from("produtos")
      .select("id, sku, nome, preco, preco_promocional, preco_efetivo, imagem_principal, embalagem")
      .in("id", saida.produtoIds)
      .eq("ativo", true);
    const porId = new Map((data ?? []).map((p: { id: string }) => [p.id, p]));
    produtos = saida.produtoIds.map((id) => porId.get(id)).filter(Boolean);
  }

  return json({
    texto: textoFinal || "Pronto! Posso ajudar com mais alguma coisa?",
    produtos,
    kitIds: saida.kitIds,
    sugestoes: saida.sugestoes,
    carrinhoAlterado: saida.carrinhoAlterado,
  });
});
