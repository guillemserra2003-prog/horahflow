// HorahFlow · IA (Claude) en el servidor
// Acciones: ask (preguntas a Flow), advice (análisis personalizado), parse (leer recibos que las reglas no entienden)
// Secretos: ANTHROPIC_API_KEY (o private.config). Opcional: ANTHROPIC_MODEL.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-5-5";
const ALLOWED = ["https://horahflow.com", "https://www.horahflow.com"];

const LIMITS: Record<string, Record<string, number>> = {
  free: { ask: 15, advice: 2, parse: 60 },
  pro: { ask: 300, advice: 20, parse: 2000 },
  business: { ask: 1000, advice: 50, parse: 10000 },
};

function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  const allow = ALLOWED.includes(o) || /\.vercel\.app$/.test(o) ? o : ALLOWED[0];
  return { "Access-Control-Allow-Origin": allow, "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

async function apiKey(): Promise<string | null> {
  const env = Deno.env.get("ANTHROPIC_API_KEY");
  if (env) return env;
  const { data } = await db.rpc("get_private_config", { k: "ANTHROPIC_API_KEY" });
  return data ?? null;
}

async function claude(system: string, user: string, maxTokens = 900): Promise<string> {
  const key = await apiKey();
  if (!key) throw new Error("NO_KEY");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!r.ok) { console.error("anthropic", r.status, await r.text()); throw new Error("AI_ERROR"); }
  const d = await r.json();
  return (d.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("").trim();
}

const STYLE = `Eres Flow, el asistente de HorahFlow, una app española que ayuda a la gente a ver en qué se le va el dinero a partir de los recibos de su correo.
Responde SIEMPRE en castellano de España, con tono cercano, claro y directo. Usa euros con formato español (12,99 €).
Básate SOLO en los datos que te doy; si algo no está en los datos, dilo y no lo inventes.
No des asesoramiento de inversión ni financiero regulado; céntrate en gastos, suscripciones y ahorro doméstico.
Puedes usar **negrita** para resaltar cifras. No uses tablas ni encabezados.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "method" }, 405);

  // Usuario autenticado
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u, error: ue } = await db.auth.getUser(token);
  if (ue || !u?.user) return json(req, { error: "auth" }, 401);
  const uid = u.user.id;

  let body: any;
  try { body = await req.json(); } catch { return json(req, { error: "bad_json" }, 400); }
  const action = String(body.action || "");
  if (!["ask", "advice", "parse"].includes(action)) return json(req, { error: "action" }, 400);

  const { data: prof } = await db.from("profiles").select("plan").eq("id", uid).maybeSingle();
  const plan = prof?.plan ?? "free";
  const units = action === "parse" ? Math.min(Array.isArray(body.items) ? body.items.length : 0, 40) : 1;
  if (!units) return json(req, { results: [] });
  const { data: used } = await db.rpc("bump_ai_usage", { uid, k: action, n: units });
  if ((used ?? 0) > LIMITS[plan][action]) {
    return json(req, { error: "limit", plan, limit: LIMITS[plan][action] }, 429);
  }

  try {
    if (action === "ask") {
      const q = String(body.question || "").slice(0, 500);
      const ctx = JSON.stringify(body.context ?? {}).slice(0, 12000);
      const answer = await claude(STYLE + "\nResponde en 1–4 frases como máximo.", `Datos del usuario (JSON):\n${ctx}\n\nPregunta: ${q}`, 500);
      return json(req, { answer });
    }
    if (action === "advice") {
      const ctx = JSON.stringify(body.context ?? {}).slice(0, 14000);
      const text = await claude(STYLE + `
Escribe un análisis personalizado breve con este formato exacto:
Una primera frase de diagnóstico general.
Después entre 3 y 5 líneas que empiecen por "- ", cada una con una acción concreta, el servicio afectado y el ahorro estimado al año.
Termina con una frase motivadora corta y realista. Máximo 160 palabras.`, `Datos del usuario (JSON):\n${ctx}`, 700);
      return json(req, { advice: text });
    }
    // parse
    const items = (body.items as any[]).slice(0, 40).map((it, i) => ({
      i, from: String(it.from ?? "").slice(0, 120), subject: String(it.subject ?? "").slice(0, 200),
      date: String(it.date ?? "").slice(0, 40), text: String(it.text ?? "").slice(0, 900),
    }));
    const out = await claude(`Extraes datos de recibos de correo electrónico. Devuelve SOLO un array JSON válido, sin texto adicional.
Para cada elemento devuelve {"i":número,"is_charge":true|false,"merchant":"nombre comercial corto","amount":número total cobrado,"currency":"EUR"|"USD"|"GBP","recurring":true|false,"cycle":"weekly"|"monthly"|"quarterly"|"yearly"|null,"category":"streaming"|"musica"|"software"|"nube"|"telecom"|"hogar"|"deporte"|"comida"|"transporte"|"compras"|"formacion"|"social"|"otros"}.
is_charge=false si es publicidad, un aviso sin cobro, un reembolso o no hay importe cobrado. amount es el TOTAL pagado, no subtotales ni impuestos.`,
      JSON.stringify(items), 2500);
    let results: any[] = [];
    try { results = JSON.parse(out.replace(/^```(?:json)?|```$/g, "").trim()); } catch { results = []; }
    results = results.filter((r) => r && typeof r.i === "number" && r.is_charge && typeof r.amount === "number" && r.amount > 0 && r.amount < 20000)
      .map((r) => ({ i: r.i, merchant: String(r.merchant || "").slice(0, 60), amount: r.amount, currency: ["EUR", "USD", "GBP"].includes(r.currency) ? r.currency : "EUR",
        recurring: !!r.recurring, cycle: r.cycle ?? null, category: String(r.category || "otros") }));
    return json(req, { results });
  } catch (e) {
    const msg = (e as Error).message;
    return json(req, { error: msg === "NO_KEY" ? "not_configured" : "ai_error" }, msg === "NO_KEY" ? 503 : 502);
  }
});
