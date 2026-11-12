// HorahFlow · Lector de facturas en PDF
// «inbound» guarda el correo al momento y deja aquí el PDF (tabla privada inbound_pdfs).
// Esta función lee unos pocos PDF por llamada (límite de 2 s de CPU), añade el texto al recibo,
// lo hace visible para la app y borra el PDF. Si queda cola, se vuelve a llamar a sí misma;
// además, un cron la despierta cada 5 minutos por si algo se queda a medias.
// Protegida con CRON_KEY (private.config).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { pdfText } from "./pdf.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const EMAILS_PER_RUN = 3, MAX_TRIES = 3, BODY_MAX = 8000;
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

async function secret(name: string) {
  const v = Deno.env.get(name); if (v) return v;
  const { data } = await db.rpc("get_private_config", { k: name }); return data ?? undefined;
}
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Deja el recibo visible y borra sus PDF. */
async function release(emailId: number, extra: string) {
  if (extra) {
    const { data: e } = await db.from("inbound_emails").select("body").eq("id", emailId).maybeSingle();
    if (e) {
      const room = Math.max(1000, BODY_MAX - extra.length - 40);
      await db.from("inbound_emails").update({ body: `${String(e.body || "").slice(0, room)}\n\n--- Factura adjunta (PDF) ---\n${extra}`.slice(0, BODY_MAX), pdf_pending: false }).eq("id", emailId);
    }
  } else await db.from("inbound_emails").update({ pdf_pending: false }).eq("id", emailId);
  await db.from("inbound_pdfs").delete().eq("email_id", emailId);
}

Deno.serve(async (req) => {
  const key = await secret("CRON_KEY");
  if (!key || req.headers.get("x-cron-key") !== key) return json({ error: "no autorizado" }, 401);

  // Correos con PDF pendiente (los más antiguos primero)
  const { data: heads } = await db.from("inbound_pdfs").select("email_id,tries").order("id").limit(20);
  const ids = [...new Set((heads || []).map((h: any) => h.email_id as number))].slice(0, EMAILS_PER_RUN);
  let done = 0, failed = 0;
  for (const emailId of ids) {
    const { data: pdfs } = await db.from("inbound_pdfs").select("id,filename,data,tries").eq("email_id", emailId).order("id");
    if (!pdfs?.length) continue;
    // Si un PDF ya ha hecho caer la función varias veces, se suelta el recibo sin él
    if (Math.max(...pdfs.map((p: any) => p.tries)) >= MAX_TRIES) { await release(emailId, ""); failed++; continue; }
    await db.from("inbound_pdfs").update({ tries: (pdfs[0] as any).tries + 1 }).eq("email_id", emailId);
    const texts: string[] = [];
    for (const p of pdfs as any[]) {
      try {
        const t = await pdfText(fromB64(String(p.data)));
        if (t) texts.push(pdfs.length > 1 ? `[${p.filename}]\n${t}` : t);
      } catch (err) { console.error("pdf", p.filename, String(err).slice(0, 200)); }
    }
    await release(emailId, texts.join("\n\n").slice(0, 4000));
    texts.length ? done++ : failed++;
  }

  // ¿Queda cola? Siguiente tanda en otra llamada (cada una tiene su propio límite de CPU)
  const { count } = await db.from("inbound_pdfs").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0 && ids.length) {
    const next = fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/pdf-worker`, { method: "POST", headers: { "Content-Type": "application/json", "x-cron-key": key }, body: "{}" }).catch((e) => console.error("next", e));
    // @ts-ignore EdgeRuntime existe en Supabase
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(next); else await next;
  }
  return json({ ok: true, done, failed, left: count ?? 0 });
});
