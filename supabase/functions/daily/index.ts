// HorahFlow · Avisos diarios por correo (planes Pro y Empresas)
// La llama pg_cron cada mañana. Para cada usuario de pago:
//  · aviso de los cobros que llegan en los próximos días (según «Avisar X días antes»)
//  · alerta de fugas nuevas: cobros duplicados, subidas de precio y pruebas que pasan a pago
//  · el día 1 de cada mes, resumen del mes
// Protegida con la clave CRON_KEY (private.config). Secretos: RESEND_API_KEY.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadEngine } from "./engine-loader.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const HISTORY: Record<string, number> = { free: 12, pro: 24, business: 36 };
const FROM = "HorahFlow <avisos@horahflow.com>";
const SITE = "https://horahflow.com";
const DAY = 86400000;
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

async function secret(name: string): Promise<string | undefined> {
  const v = Deno.env.get(name);
  if (v) return v;
  const { data } = await db.rpc("get_private_config", { k: name });
  return data ?? undefined;
}
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const madrid = (d: Date) => new Date(d.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
const dayStart = (d: Date) => { const x = madrid(d); x.setHours(0, 0, 0, 0); return x; };
const fmtDay = (d: Date) => d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });
function hash(s: string) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function snippet(text: string) {
  text = String(text || "").replace(/\s+/g, " ");
  if (text.length <= 700) return text;
  const m = text.search(/(total|importe|amount|cargo|charged|pagad|paid)[^€$£]{0,40}(€|EUR|\$|£|\d)/i);
  const i = m > -1 ? m : Math.max(0, text.search(/\d+[.,]\d{2}\s?(€|EUR)|(€|\$|£)\s?\d/i));
  const hint = (text.match(/[^.]{0,80}(suscripci[oó]n|subscription|mensual|monthly|anual|annual|yearly|renovaci[oó]n|renewal|prueba gratuita|free trial)[^.]{0,80}/i) || [""])[0];
  return (hint + " … " + text.slice(Math.max(0, i - 200), i + 300)).trim();
}

function layout(title: string, intro: string, inner: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F7F7FA;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#16151F">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7FA;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #ECEBF1;border-radius:16px">
<tr><td style="padding:26px 28px 8px"><img src="${SITE}/assets/logo-full.png" alt="HorahFlow" height="26" style="height:26px;width:auto;display:block"></td></tr>
<tr><td style="padding:10px 28px 0"><h1 style="font-size:21px;line-height:1.3;margin:0 0 8px">${title}</h1><p style="margin:0 0 18px;color:#6B6880;font-size:15px;line-height:1.5">${intro}</p></td></tr>
<tr><td style="padding:0 28px">${inner}</td></tr>
<tr><td style="padding:22px 28px 26px"><a href="${SITE}/#app" style="display:inline-block;background:#16151F;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 20px;border-radius:999px">Abrir HorahFlow</a></td></tr>
</table>
<p style="max-width:560px;color:#9A97AB;font-size:12px;line-height:1.5;margin:14px auto 0">Recibes este correo porque tienes activados los avisos de HorahFlow. Puedes cambiarlos o desactivarlos en <a href="${SITE}/#app-ajustes" style="color:#6B6880">Ajustes</a>.</p>
</td></tr></table></body></html>`;
}
const row = (left: string, sub: string, right: string, color = "#16151F") =>
  `<tr><td style="padding:11px 0;border-top:1px solid #ECEBF1"><b style="font-size:15px">${left}</b><div style="color:#6B6880;font-size:13px;margin-top:2px">${sub}</div></td><td align="right" style="padding:11px 0;border-top:1px solid #ECEBF1;font-weight:800;font-size:15px;white-space:nowrap;color:${color}">${right}</td></tr>`;
const table = (rows: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px">${rows}</table>`;
const h2 = (t: string) => `<p style="margin:18px 0 4px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#2F8F5B">${t}</p>`;

async function send(apiKey: string, to: string, subject: string, html: string, text: string, idem: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idem.slice(0, 256) },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text, headers: { "List-Unsubscribe": `<${SITE}/#app-ajustes>` } }),
  });
  if (!r.ok) throw new Error("Resend " + r.status + " " + (await r.text()).slice(0, 200));
}

// deno-lint-ignore no-explicit-any
async function processUser(E: any, apiKey: string, p: any, now: Date, opts: { dry: boolean; force?: boolean }) {
  const { data: ud } = await db.from("user_data").select("state,prefs").eq("user_id", p.id).maybeSingle();
  const prefs = Object.assign({ usage: {}, cancelled: {}, ignored: {}, alertDays: 3 }, ud?.state?.prefs || {}, ud?.prefs || {});
  if (prefs.emailAlerts === false && prefs.monthlyDigest === false) return { skipped: "avisos desactivados" };
  const stored = (ud?.state?.emails || []) as unknown[];
  const { data: pend } = await db.from("inbound_emails").select("resend_id,from_addr,subject,received_at,body").eq("user_id", p.id).limit(3000);
  const extra = (pend || []).map((x) => ({ id: x.resend_id, from: x.from_addr, subject: x.subject, date: x.received_at, body: snippet(x.body) }))
    .filter((m) => E.toCharge(m));
  const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - (HISTORY[p.plan] || 24));
  // deno-lint-ignore no-explicit-any
  const emails = [...stored, ...extra].filter((e: any) => new Date(e.date) >= cutoff);
  if (!emails.length) return { skipped: "sin recibos" };
  const a = E.analyze(emails, prefs, now);
  const today = dayStart(now);
  const alertDays = Math.max(1, Math.min(14, Number(prefs.alertDays) || 3));

  // deno-lint-ignore no-explicit-any
  const items: { key: string; kind: string; name: string; html: string; text: string }[] = [];
  if (prefs.emailAlerts !== false) {
    for (const s of a.active) {
      const d = Math.round((dayStart(new Date(s.next)).getTime() - today.getTime()) / DAY);
      if (d < 0 || d > alertDays) continue;
      const when = d === 0 ? "hoy" : d === 1 ? "mañana" : `el ${fmtDay(new Date(s.next))}`;
      items.push({ key: `cobro|${s.key}|${new Date(s.next).toISOString().slice(0, 10)}`, kind: "cobro", name: s.merchant,
        html: row(esc(s.merchant), `Se cobra ${esc(when)}${s.variable ? " (importe aproximado)" : ""}`, esc(E.fmt(s.amount))),
        text: `· ${s.merchant}: ${E.fmt(s.amount)}, se cobra ${when}` });
    }
    // deno-lint-ignore no-explicit-any
    for (const l of a.leaks.filter((l: any) => ["duplicado", "subida", "prueba"].includes(l.type)).slice(0, 6)) {
      items.push({ key: `fuga|${l.type}|${l.key}|${hash(l.detail)}`, kind: "fuga", name: l.merchant,
        html: row(esc(l.title), esc(l.detail), l.saving ? esc(E.fmt(l.saving)) + "/mes" : "", "#C2412D"),
        text: `· ${l.title}. ${l.detail}` });
    }
  }
  const ym = today.toISOString().slice(0, 7);
  const digestKey = `resumen|${ym}`;
  const wantDigest = prefs.monthlyDigest !== false && (madrid(now).getDate() === 1 || opts.force);

  const keys = [...items.map((i) => i.key), ...(wantDigest ? [digestKey] : [])];
  if (!keys.length) return { sent: 0 };
  const { data: done } = await db.from("alert_log").select("key").eq("user_id", p.id).in("key", keys);
  const doneSet = new Set((done || []).map((d) => d.key));
  const fresh = items.filter((i) => !doneSet.has(i.key));
  const digest = wantDigest && !doneSet.has(digestKey);
  const out: Record<string, unknown> = { cobros: fresh.filter((i) => i.kind === "cobro").length, fugas: fresh.filter((i) => i.kind === "fuga").length, digest };
  if (opts.dry) return { ...out, dry: true, items: fresh.map((i) => i.text) };

  const name = esc((p.name || "").split(" ")[0] || "");
  if (fresh.length) {
    const cobros = fresh.filter((i) => i.kind === "cobro"), fugas = fresh.filter((i) => i.kind === "fuga");
    const total = a.active.filter((s: { next: string }) => cobros.some((c) => c.key.includes(`|${new Date(s.next).toISOString().slice(0, 10)}`)))
      .reduce((t: number, s: { amount: number }) => t + s.amount, 0);
    const subject = cobros.length
      ? (cobros.length === 1 ? `Aviso: ${cobros[0].name} te cobra pronto` : `Aviso: ${cobros.length} cobros en los próximos días`)
      : (fugas.length === 1 ? "HorahFlow ha encontrado una fuga nueva" : `HorahFlow ha encontrado ${fugas.length} fugas nuevas`);
    const inner = (cobros.length ? h2("Próximos cobros") + table(cobros.map((c) => c.html).join("")) : "") +
      (fugas.length ? h2("Fugas nuevas") + table(fugas.map((c) => c.html).join("")) : "");
    const intro = cobros.length
      ? `${name ? name + ", e" : "E"}stos cobros llegan en los próximos ${alertDays} días${cobros.length > 1 ? ` (${esc(E.fmt(total))} en total)` : ""}. Si no quieres alguno, aún estás a tiempo de cancelarlo.`
      : `${name ? name + ", h" : "H"}emos detectado algo en tus recibos que conviene revisar.`;
    await send(apiKey, p.email, subject, layout(cobros.length ? "Tienes cobros a la vista" : "Fugas nuevas en tus gastos", intro, inner),
      `${subject}\n\n${fresh.map((i) => i.text).join("\n")}\n\nAbre HorahFlow: ${SITE}/#app\nCambia tus avisos en Ajustes: ${SITE}/#app-ajustes`, `hf-${p.id}-${fresh.map((i) => i.key).join(",")}`);
    await db.from("alert_log").insert(fresh.map((i) => ({ user_id: p.id, key: i.key })));
    await new Promise((r) => setTimeout(r, 600));
  }
  if (digest) {
    const t = a.totals;
    const mes = today.toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "Europe/Madrid" });
    const top = a.active.slice(0, 5);
    const inner = table(
      row("Pagas en recurrentes", `${a.active.length} suscripciones activas`, esc(E.fmt(t.monthlyRec)) + "/mes") +
      row("Al año", "Si no cambias nada", esc(E.fmt(t.yearlyRec))) +
      row("Puedes ahorrar", `${a.leaks.length} fugas detectadas`, esc(E.fmt(t.yearlyPotential)) + "/año", "#2F8F5B")) +
      (top.length ? h2("Tus suscripciones más caras") + table(top.map((s: { merchant: string; monthly: number; cat: string }) => row(esc(s.merchant), esc(E.CATS[s.cat]?.label || ""), esc(E.fmt(s.monthly)) + "/mes")).join("")) : "");
    await send(apiKey, p.email, `Tu resumen de ${mes} en HorahFlow`, layout(`Tu resumen de ${esc(mes)}`, "Así están tus gastos recurrentes este mes.", inner),
      `Tu resumen de ${mes}\nRecurrentes: ${E.fmt(t.monthlyRec)}/mes\nAl año: ${E.fmt(t.yearlyRec)}\nPuedes ahorrar: ${E.fmt(t.yearlyPotential)}/año\n\n${SITE}/#app`, `hf-${p.id}-${digestKey}`);
    await db.from("alert_log").insert({ user_id: p.id, key: digestKey });
  }
  return { ...out, sent: (fresh.length ? 1 : 0) + (digest ? 1 : 0) };
}

Deno.serve(async (req) => {
  const key = await secret("CRON_KEY");
  if (!key || req.headers.get("x-cron-key") !== key) return json({ error: "no autorizado" }, 401);
  const apiKey = await secret("RESEND_API_KEY");
  if (!apiKey) return json({ error: "Falta RESEND_API_KEY" }, 503);
  const opts = await req.json().catch(() => ({}));
  const E = await loadEngine();
  const now = opts.now ? new Date(opts.now) : new Date();

  let q = db.from("profiles").select("id,email,name,plan").not("email", "is", null);
  q = opts.user ? q.eq("id", opts.user) : q.in("plan", ["pro", "business"]);
  const { data: users, error } = await q.limit(5000);
  if (error) return json({ error: error.message }, 500);

  const report: Record<string, unknown> = {};
  for (const p of users || []) {
    try { report[p.id] = await processUser(E, apiKey, p, now, { dry: !!opts.dry, force: !!opts.force }); }
    catch (e) { console.error(p.id, e); report[p.id] = { error: String((e as Error).message || e) }; }
  }
  // Limpieza: recibos sin importar de más de 60 días y registros de avisos de más de 400 días
  if (!opts.user) {
    await db.from("inbound_emails").delete().lt("created_at", new Date(Date.now() - 60 * DAY).toISOString());
    await db.from("alert_log").delete().lt("sent_at", new Date(Date.now() - 400 * DAY).toISOString());
  }
  return json({ ok: true, users: (users || []).length, report });
});
