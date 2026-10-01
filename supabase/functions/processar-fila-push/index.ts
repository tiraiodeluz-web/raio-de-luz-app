// Edge Function: processar-fila-push
// Lê a fila_push, descobre os aparelhos de cada notificação e envia pelo Expo Push
// (que entrega via FCM no Android e APNs no iOS).
//
// Chamada pelo banco (pg_net) com o cabeçalho x-push-segredo.
// O segredo fica em privado.config('push_segredo') e é conferido via RPC.
// Variável opcional (Supabase → Edge Functions → Secrets):
//   EXPO_ACCESS_TOKEN  só se "Enhanced push security" estiver ligado no Expo
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem por padrão.
import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_URL = "https://exp.host/--/api/v2/push/send";
const LOTE_FILA = 50;
const LOTE_EXPO = 100;

type Notificacao = {
  id: string;
  titulo: string;
  corpo: string;
  imagem_url: string | null;
  rota_destino: string | null;
  catalogo_destino_id: string | null;
  destinatario_id: string | null;
};

type Mensagem = {
  to: string;
  title: string;
  body: string;
  sound: "default";
  channelId: string;
  // Sem isso o FCM entrega como mensagem "normal" (só gaveta, sem acender
  // tela nem banner) — precisa de "high" pra virar heads-up de verdade.
  priority: "high";
  data: Record<string, unknown>;
  richContent?: { image: string };
};

Deno.serve(async (req) => {
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Só o próprio banco (pg_net) chama esta função: confere o segredo guardado em privado.config
  const { data: ok } = await db.rpc("push_segredo_confere", { p_segredo: req.headers.get("x-push-segredo") });
  if (ok !== true) return new Response("não autorizado", { status: 401 });

  // Reserva um lote (pendente → enviando) para não enviar duas vezes
  const { data: fila, error } = await db.rpc("reservar_fila_push", { p_limite: LOTE_FILA });
  if (error) return resposta({ erro: error.message }, 500);
  if (!fila?.length) return resposta({ enviados: 0 });

  const ids = fila.map((f: { notificacao_id: string }) => f.notificacao_id);
  const { data: notifs } = await db
    .from("notificacoes")
    .select("id,titulo,corpo,imagem_url,rota_destino,catalogo_destino_id,destinatario_id")
    .in("id", ids);

  let enviados = 0;
  for (const item of fila as { id: number; notificacao_id: string }[]) {
    const n = (notifs ?? []).find((x: Notificacao) => x.id === item.notificacao_id) as Notificacao | undefined;
    if (!n) {
      await marcar(db, item.id, "erro", "notificação não encontrada");
      continue;
    }
    try {
      const tokens = await tokensDe(db, n.destinatario_id);
      const rota = n.rota_destino ?? (n.catalogo_destino_id ? `/catalogo/${n.catalogo_destino_id}` : null);
      const mensagens: Mensagem[] = tokens.map((to) => ({
        to,
        title: n.titulo,
        body: n.corpo,
        sound: "default",
        channelId: "padrao",
        priority: "high",
        data: { notificacao_id: n.id, rota },
        ...(n.imagem_url ? { richContent: { image: n.imagem_url } } : {}),
      }));
      const invalidos = await enviarExpo(mensagens);
      if (invalidos.length) {
        await db.from("dispositivos_push").update({ ativo: false }).in("token", invalidos);
      }
      await marcar(db, item.id, "enviado", null);
      enviados += mensagens.length;
    } catch (e) {
      await marcar(db, item.id, "erro", String(e));
    }
  }
  return resposta({ enviados });
});

// destinatario nulo = envio manual para todos os clientes aprovados
async function tokensDe(db: ReturnType<typeof createClient>, destinatario: string | null) {
  if (destinatario) {
    const { data } = await db.from("dispositivos_push").select("token")
      .eq("usuario_id", destinatario).eq("ativo", true);
    return (data ?? []).map((d: { token: string }) => d.token);
  }
  const { data } = await db.rpc("tokens_clientes_aprovados");
  return (data ?? []).map((d: { token: string }) => d.token);
}

async function enviarExpo(mensagens: Mensagem[]): Promise<string[]> {
  const invalidos: string[] = [];
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
  const tokenExpo = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (tokenExpo) headers.Authorization = `Bearer ${tokenExpo}`;

  for (let i = 0; i < mensagens.length; i += LOTE_EXPO) {
    const lote = mensagens.slice(i, i + LOTE_EXPO);
    const r = await fetch(EXPO_URL, { method: "POST", headers, body: JSON.stringify(lote) });
    if (!r.ok) throw new Error(`Expo respondeu ${r.status}: ${await r.text()}`);
    const { data } = await r.json();
    (data ?? []).forEach((t: { status: string; details?: { error?: string } }, idx: number) => {
      if (t.status === "error" && t.details?.error === "DeviceNotRegistered") {
        invalidos.push(lote[idx].to);
      }
    });
  }
  return invalidos;
}

async function marcar(db: ReturnType<typeof createClient>, id: number, status: string, erro: string | null) {
  await db.from("fila_push").update({ status, erro, processado_em: new Date().toISOString() }).eq("id", id);
}

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}
