// HorahFlow · Recepción de recibos reenviados (Resend Inbound → webhook email.received)
// Cada usuario tiene direcciones privadas del tipo <token>@recibos.horahflow.com.
// Solo se guardan los correos que parecen un cobro, y solo hasta que la app los importa (máx. 60 días).
// Secretos: RESEND_API_KEY, RESEND_WEBHOOK_SECRET (whsec_...). SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadEngine } from "./engine-loader.ts";
import { unwrapForward, verifySvix, gmailVerification, forwardSource, parseEml, isPdf, MAX_PDF_BYTES, MAX_PDFS, type Pdf } from "./mail.ts";

const DOMAIN = "recibos.horahflow.com";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const LIMIT: Record<string, number> = { free: 1, pro: 5, business: 25 };
// Meses de historial que se pueden importar (igual que en la app: core.js PLANS.history)
const HISTORY: Record<string, number> = { free: 3, pro: 24, business: 36 };
const MAX_ATTACHED = 120, MAX_EML_BYTES = 3_000_000;
const isEml = (a: any) => /message\/rfc822/i.test(a?.content_type || "") || /\.eml$/i.test(a?.filename || "");

async function secret(name: string): Promise<string | undefined> {
  const v = Deno.env.get(name);
  if (v) return v;
  const { data } = await db.rpc("get_private_config", { k: name });
  return data ?? undefined;
}
// Base64 en trozos (btoa es nativo y rápido; el límite de CPU es de 2 s por llamada)
const b64 = (b: Uint8Array) => { let s = ""; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode(...b.subarray(i, i + 32768)); return btoa(s); };
// Un PDF merece la pena leerlo si el correo parece un recibo o el archivo se llama como una factura
const invoiceName = (n: string) => /factura|invoice|recibo|receipt|ticket|justificante|comprobante|pedido|order|bill/i.test(n || "");

/** Guarda el recibo. Si no trae importe pero sí una factura en PDF, el PDF queda en cola para «pdf-worker». */
async function save(E: any, row: Record<string, unknown>, c: { from: string; subject: string; date: string; body: string }, pdfs: Pdf[]) {
  const hasCharge = !!E.toCharge(c);
  const wantPdf = !hasCharge && pdfs.length > 0 && (E.maybeReceipt(c) || pdfs.some((p) => invoiceName(p.name)));
  if (!hasCharge && !wantPdf && !E.maybeReceipt(c)) return "skip";
  const { data, error } = await db.from("inbound_emails").insert({ ...row, pdf_pending: wantPdf }).select("id").single();
  if (error) return error.code === "23505" ? "dup" : (console.error(error), "error");
  if (wantPdf) {
    const { error: pe } = await db.from("inbound_pdfs").insert(pdfs.slice(0, MAX_PDFS).map((p) => ({ email_id: data.id, filename: p.name.slice(0, 200), data: b64(p.bytes) })));
    if (pe) { console.error("pdf", pe); await db.from("inbound_emails").update({ pdf_pending: false }).eq("id", data.id); return "stored"; }
    return "queued";
  }
  return "stored";
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

  // Lista de adjuntos con enlace de descarga (se pide una sola vez por correo)
  let attCache: any[] | null | undefined;
  const attachmentsList = async () => {
    if (attCache !== undefined) return attCache;
    const lr = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments?limit=100`, { headers: { Authorization: `Bearer ${apiKey}` } });
    attCache = lr.ok ? ((await lr.json()).data || []) : null;
    return attCache;
  };
  let queued = 0;
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

    // Importación del historial: correos reenviados como archivo adjunto (.eml)
    const meta = Array.isArray(mail.attachments) ? mail.attachments : [];
    const attached = meta.filter(isEml);
    if (attached.length) {
      const months = HISTORY[prof?.plan || "free"] ?? 3;
      const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - months);
      const all = await attachmentsList();
      if (!all) return json({ error: "adjuntos" }, 502);
      const list = all.filter(isEml).slice(0, MAX_ATTACHED);
      let stored = 0, old = 0, skipped = 0, pdf = 0;
      for (const att of list) {
        try {
          if (att.size && att.size > MAX_EML_BYTES) { skipped++; continue; }
          const dl = await fetch(att.download_url);
          if (!dl.ok) { skipped++; continue; }
          const e = parseEml(new Uint8Array(await dl.arrayBuffer()));
          const date = e.date || receivedAt;
          if (date < cutoff) { old++; continue; }
          const body = (e.text || E.htmlToText(e.html || "")).trim().slice(0, 20000);
          const c = { from: e.from, subject: e.subject, date: date.toISOString(), body };
          const r = await save(E, {
            user_id: addr.user_id, address_id: addr.id, resend_id: `${emailId}:${token}:${att.id}`,
            from_addr: c.from.slice(0, 300), subject: c.subject.slice(0, 500), received_at: c.date, body: body.slice(0, 8000),
          }, c, e.pdfs);
          if (r === "stored") stored++;
          else if (r === "queued") { stored++; pdf++; }
          else if (r !== "dup") skipped++;
        } catch (err) { console.error("eml", err); skipped++; }
      }
      await db.rpc("inbound_touch_n", { a: addr.id, n: stored });
      results.push({ token, imported: stored, old, skipped, pdf });
      queued += pdf;
      continue;
    }

    // Reenvío manual: se recupera el remitente, asunto y fecha originales
    const m = unwrapForward({ from, subject, body: text, date: receivedAt });
    const candidate = { from: m.from, subject: m.subject, date: m.date.toISOString(), body: m.body };
    // Facturas en PDF adjuntas directamente al correo (p. ej. la ITV o la luz)
    let pdfs: Pdf[] = [];
    const pdfMeta = meta.filter((a: any) => isPdf(a?.content_type, a?.filename));
    if (pdfMeta.length && !E.toCharge(candidate)) {
      const all = await attachmentsList();
      for (const a of (all || []).filter((a: any) => isPdf(a?.content_type, a?.filename)).slice(0, MAX_PDFS)) {
        if (a.size && a.size > MAX_PDF_BYTES) continue;
        try { const dl = await fetch(a.download_url); if (dl.ok) pdfs.push({ name: String(a.filename || "factura.pdf"), bytes: new Uint8Array(await dl.arrayBuffer()) }); } catch (err) { console.error("pdf dl", err); }
      }
    }
    if (!E.toCharge(candidate) && !E.maybeReceipt(candidate) && !pdfs.some((p) => invoiceName(p.name))) { results.push({ token, ignored: "no parece un cobro" }); continue; }

    const { count } = await db.from("inbound_emails").select("id", { count: "exact", head: true }).eq("user_id", addr.user_id);
    if ((count ?? 0) >= 3000) { results.push({ token, ignored: "cola llena" }); continue; }

    const r = await save(E, {
      user_id: addr.user_id, address_id: addr.id, resend_id: `${emailId}:${token}`,
      from_addr: m.from.slice(0, 300), subject: m.subject.slice(0, 500), received_at: m.date.toISOString(), body: m.body.slice(0, 8000),
    }, candidate, pdfs);
    if (r === "error") return json({ error: "db" }, 500);
    if (r === "queued") queued++;
    if (r === "stored" || r === "queued") await db.rpc("inbound_touch", { a: addr.id });
    results.push({ token, stored: r === "stored" || r === "queued", pdf: r === "queued" });
  }
  // Hay facturas en PDF por leer: se avisa al lector (si falla, el cron lo recoge en 5 minutos)
  if (queued) {
    const key = await secret("CRON_KEY");
    const kick = fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/pdf-worker`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron-key": key || "" }, body: "{}" }).catch((e) => console.error("kick", e));
    // @ts-ignore EdgeRuntime existe en Supabase
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(kick); else await kick;
  }
  return json({ ok: true, results });
});
