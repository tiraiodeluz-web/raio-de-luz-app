// Edge Function: admin-usuarios
//
// Usada só pelo painel web, por administradores. Duas ações:
//   { acao: "criar", nome, email, senha, cnpj?, razao_social?, telefone?, cidade?, uf?, aprovar? }
//       cria o acesso JÁ com e-mail confirmado (sem link de confirmação) e,
//       por padrão, já aprovado.
//   { acao: "senha", usuario_id, senha }
//       define uma nova senha para um cliente.
//
// A permissão é checada no código (token do usuário + perfis.tipo = 'admin'),
// por isso o deploy é com verify_jwt = false (a plataforma não entende as
// chaves sb_publishable_...). A service_role só existe aqui dentro, nunca vai
// pro painel.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
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

const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const digitos = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "") : "");
const EMAIL = /^\S+@\S+\.\S+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ erro: "Faça login no painel." }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const doUsuario = createClient(url, chavePublica(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: quem, error: erroQuem } = await doUsuario.auth.getUser(token);
  if (erroQuem || !quem.user) return json({ erro: "Sessão expirada. Entre de novo no painel." }, 401);
  const { data: perfilQuem } = await doUsuario.from("perfis").select("tipo").eq("id", quem.user.id).maybeSingle();
  if (perfilQuem?.tipo !== "admin") return json({ erro: "Apenas administradores." }, 403);

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return json({ erro: "Requisição inválida." }, 400);
  }

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (corpo.acao === "criar") {
    const nome = texto(corpo.nome);
    const email = texto(corpo.email)?.toLowerCase() ?? "";
    const senha = typeof corpo.senha === "string" ? corpo.senha : "";
    const cnpj = digitos(corpo.cnpj);
    if (!nome) return json({ erro: "Informe o nome." }, 400);
    if (!EMAIL.test(email)) return json({ erro: "E-mail inválido." }, 400);
    if (senha.length < 6) return json({ erro: "A senha precisa ter ao menos 6 caracteres." }, 400);
    if (cnpj && cnpj.length !== 14) return json({ erro: "CNPJ precisa ter 14 números." }, 400);
    if (cnpj) {
      const { data: existe } = await admin.from("perfis").select("id").eq("cnpj", cnpj).maybeSingle();
      if (existe) return json({ erro: "Já existe um cliente com esse CNPJ." }, 409);
    }

    const { data: criado, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome,
        cnpj,
        razao_social: texto(corpo.razao_social),
        telefone: digitos(corpo.telefone),
        cidade: texto(corpo.cidade),
        uf: texto(corpo.uf)?.toUpperCase().slice(0, 2) ?? null,
      },
    });
    if (error || !criado.user) {
      const jaExiste = /already|registered|exists/i.test(error?.message ?? "");
      return json({ erro: jaExiste ? "Já existe um acesso com esse e-mail." : (error?.message ?? "Não foi possível criar.") }, jaExiste ? 409 : 500);
    }

    if (corpo.aprovar !== false) {
      const { error: erroAprovar } = await admin.from("perfis").update({ cadastro_aprovado: true }).eq("id", criado.user.id);
      if (erroAprovar) return json({ erro: `Acesso criado, mas não consegui aprovar: ${erroAprovar.message}`, id: criado.user.id }, 500);
    }
    const { data: perfil } = await admin.from("perfis").select("codigo").eq("id", criado.user.id).maybeSingle();
    return json({ ok: true, id: criado.user.id, codigo: perfil?.codigo ?? null });
  }

  if (corpo.acao === "senha") {
    const id = texto(corpo.usuario_id);
    const senha = typeof corpo.senha === "string" ? corpo.senha : "";
    if (!id) return json({ erro: "Cliente não informado." }, 400);
    if (senha.length < 6) return json({ erro: "A senha precisa ter ao menos 6 caracteres." }, 400);
    const { data: alvo } = await admin.from("perfis").select("tipo").eq("id", id).maybeSingle();
    if (!alvo) return json({ erro: "Cliente não encontrado." }, 404);
    if (alvo.tipo !== "cliente") return json({ erro: "Por aqui só dá para trocar a senha de clientes." }, 403);
    const { error } = await admin.auth.admin.updateUserById(id, { password: senha, email_confirm: true });
    if (error) return json({ erro: error.message }, 500);
    return json({ ok: true });
  }

  // { acao: "emails", ids: [...] } -> { emails: { [id]: "email" } }
  if (corpo.acao === "emails") {
    const ids = new Set((Array.isArray(corpo.ids) ? corpo.ids : []).filter((i): i is string => typeof i === "string").slice(0, 1000));
    const emails: Record<string, string> = {};
    for (let pagina = 1; pagina <= 10 && ids.size > Object.keys(emails).length; pagina++) {
      const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
      if (error) return json({ erro: error.message }, 500);
      for (const u of data.users) if (ids.has(u.id) && u.email) emails[u.id] = u.email;
      if (data.users.length < 1000) break;
    }
    return json({ ok: true, emails });
  }

  // { acao: "trocar_email", usuario_id, email } -> troca na hora, sem link de confirmação.
  // Em outros administradores não pode: só clientes e a própria conta.
  if (corpo.acao === "trocar_email") {
    const id = texto(corpo.usuario_id);
    const email = texto(corpo.email)?.toLowerCase() ?? "";
    if (!id) return json({ erro: "Usuário não informado." }, 400);
    if (!EMAIL.test(email)) return json({ erro: "E-mail inválido." }, 400);
    const { data: alvo } = await admin.from("perfis").select("tipo").eq("id", id).maybeSingle();
    if (!alvo) return json({ erro: "Usuário não encontrado." }, 404);
    if (alvo.tipo !== "cliente" && id !== quem.user.id) return json({ erro: "Não dá para trocar o e-mail de outro administrador." }, 403);
    const { error } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true });
    if (error) {
      const jaExiste = /already|registered|exists/i.test(error.message);
      return json({ erro: jaExiste ? "Já existe um acesso com esse e-mail." : error.message }, jaExiste ? 409 : 500);
    }
    return json({ ok: true });
  }

  return json({ erro: "Ação desconhecida." }, 400);
});
