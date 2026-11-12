// HorahFlow · Recepción de recibos reenviados (Resend Inbound → webhook email.received)
// Cada usuario tiene direcciones privadas del tipo <token>@recibos.horahflow.com.
// Solo se guardan los correos que parecen un cobro, y solo hasta que la app los importa (máx. 60 días).
// Secretos: RESEND_API_KEY, RESEND_WEBHOOK_SECRET (whsec_...). SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadEngine } from "./engine-loader.ts";
import { unwrapForward, verifySvix, gmailVerification, forwardSource } from "./mail.ts";

const DOMAIN = "recibos.horahflow.com";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const LIMIT: Record<string, number> = { free: 1, pro: 5, business: 25 };

async function secret(name: string): Promise<string | undefined> {
  const v = Deno.env.get(name);
  if (v) return v;
  const { data } = await db.rpc("get_private_config", { k: name });
  return data ?? undefined;
}
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const raw = await req.text();
  const whsec = await secret("RESEND_WEBHOOK_SECRET");
  const apiKey = await secret("RESEND_API_KEY");
  if (!whsec || !apiKey) return json({ error: "no configurado" }, 503);
  if (!(await verifySvix(raw, req.headers, whsec))) return json({ error: "firma no válida" }, 401);

  const E = await loadEngine();
  const event = JSON.parse(raw);
  if (event.type !== "email.received") return json({ ignored: event.type });
  const emailId: string = event.data?.email_id;
  if (!emailId) return json({ error: "sin id" }, 400);

  // Contenido completo desde la API de Resend (el webhook solo trae metadatos)
  const r = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!r.ok) return json({ error: "resend " + r.status }, 502); // Resend reintentará
  const mail = await r.json();

  const recipients: string[] = [...(mail.to || []), ...(event.data?.to || []), ...(mail.cc || [])].map((x: string) => String(x).toLowerCase());
  const tokens = [...new Set(recipients.map((a) => (a.match(new RegExp(`([a-z0-9]{6,24})@${DOMAIN.replace(/\./g, "\\.")}`)) || [])[1]).filter(Boolean))] as string[];
  if (!tokens.length) return json({ ignored: "destinatario desconocido" });

  const from = String(mail.from || "");
  const subject = String(mail.subject || "");
  const text = mail.text ? String(mail.text) : E.htmlToText(String(mail.html || ""));
  const receivedAt = mail.created_at ? new Date(mail.created_at) : new Date();
  if (/@horahflow\.com\b/i.test(from)) return json({ ignored: "bucle" });

  const results: unknown[] = [];
  for (const token of tokens) {
    const { data: addr } = await db.from("inbound_addresses").select("id,user_id,created_at,source_email").eq("token", token).maybeSingle();
    if (!addr) { results.push({ token, ignored: "no existe" }); continue; }

    // Límite del plan: solo cuentan las N direcciones más antiguas
    const { data: prof } = await db.from("profiles").select("plan").eq("id", addr.user_id).maybeSingle();
    const lim = LIMIT[prof?.plan || "free"] ?? 1;
    const { data: allowed } = await db.from("inbound_addresses").select("id").eq("user_id", addr.user_id).order("created_at").limit(lim);
    if (!(allowed || []).some((a: { id: string }) => a.id === addr.id)) { results.push({ token, ignored: "fuera del plan" }); continue; }

    // Correo de confirmación de reenvío de Gmail: se muestra el código en la app
    const v = gmailVerification(from, subject, text);
    if (v) {
      const src = forwardSource(text);
      await db.from("inbound_addresses").update({ verify_code: v.code, verify_link: v.link, verify_at: new Date().toISOString(), confirmed_at: null, ...(src ? { source_email: src } : {}) }).eq("id", addr.id);
      results.push({ token, verify: true }); continue;
    }

    // Ha llegado un correo reenviado de verdad: la dirección está conectada
    const nowIso = new Date().toISOString();
    const src = addr.source_email ? "" : forwardSource("", mail.headers);
    await db.from("inbound_addresses").update({ last_seen_at: nowIso, ...(src ? { source_email: src } : {}) }).eq("id", addr.id);
    await db.from("inbound_addresses").update({ confirmed_at: nowIso }).eq("id", addr.id).is("confirmed_at", null);

    // Reenvío manual: se recupera el remitente, asunto y fecha originales
    const m = unwrapForward({ from, subject, body: text, date: receivedAt });
    const candidate = { from: m.from, subject: m.subject, date: m.date.toISOString(), body: m.body };
    if (!E.toCharge(candidate) && !E.maybeReceipt(candidate)) { results.push({ token, ignored: "no parece un cobro" }); continue; }

    const { count } = await db.from("inbound_emails").select("id", { count: "exact", head: true }).eq("user_id", addr.user_id);
    if ((count ?? 0) >= 3000) { results.push({ token, ignored: "cola llena" }); continue; }

    const { error } = await db.from("inbound_emails").insert({
      user_id: addr.user_id, address_id: addr.id, resend_id: `${emailId}:${token}`,
      from_addr: m.from.slice(0, 300), subject: m.subject.slice(0, 500), received_at: m.date.toISOString(), body: m.body.slice(0, 8000),
    });
    if (error && error.code !== "23505") { console.error(error); return json({ error: "db" }, 500); }
    await db.rpc("inbound_touch", { a: addr.id });
    results.push({ token, stored: !error });
  }
  return json({ ok: true, results });
});
