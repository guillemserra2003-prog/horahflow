// Utilidades de correo: firma de webhooks (Svix), reenvíos manuales y verificación de Gmail

const enc = new TextEncoder();
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
function bytesToB64(b: Uint8Array): string {
  let s = ""; for (const x of b) s += String.fromCharCode(x); return btoa(s);
}
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Verifica la firma de Resend (formato Svix). */
export async function verifySvix(body: string, h: Headers, secret: string, now = Date.now()): Promise<boolean> {
  const id = h.get("svix-id"), ts = h.get("svix-timestamp"), sig = h.get("svix-signature");
  if (!id || !ts || !sig) return false;
  if (Math.abs(now / 1000 - Number(ts)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", b64ToBytes(secret.replace(/^whsec_/, "")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = bytesToB64(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${id}.${ts}.${body}`))));
  return sig.split(" ").some((p) => { const [v, s] = p.split(","); return v === "v1" && !!s && safeEq(s, mac); });
}

/** Correo de Gmail para confirmar el reenvío automático: devolvemos el código y el enlace. */
export function gmailVerification(from: string, subject: string, text: string): { code: string; link: string } | null {
  if (!/forwarding-noreply@google\.com/i.test(from)) return null;
  const code = (subject.match(/#(\d{6,12})/) || text.match(/(?:c[oó]digo de confirmaci[oó]n|confirmation code)\D{0,20}(\d{6,12})/i) || [])[1] || "";
  const link = (text.match(/https:\/\/(?:mail-settings|mail)\.google\.com\/\S+/) || [])[0] || "";
  return code || link ? { code, link: link.replace(/[)>\].,]+$/, "") } : null;
}

/** Correo de origen: en la verificación de Gmail («x@gmail.com ha solicitado reenviar…») o en las cabeceras X-Forwarded-For. */
export function forwardSource(text: string, headers?: unknown): string {
  const ok = (e: string) => !/@(?:[a-z0-9-]+\.)*(?:horahflow\.com|google\.com|googlemail\.com)$/i.test(e);
  const h: Record<string, string> = {};
  if (Array.isArray(headers)) for (const x of headers as any[]) { if (x && x.name) h[String(x.name).toLowerCase()] = String(x.value ?? ""); }
  else if (headers && typeof headers === "object") for (const [k, v] of Object.entries(headers as Record<string, unknown>)) h[k.toLowerCase()] = String(v ?? "");
  const pick = (s: string) => (s.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []).map((e) => e.toLowerCase()).find(ok) || "";
  return (pick(h["x-forwarded-for"] || "") || pick(h["x-original-to"] || "") || pick(text.slice(0, 2000))).slice(0, 254);
}

const MONTHS: Record<string, number> = {
  jan: 0, ene: 0, january: 0, enero: 0, feb: 1, february: 1, febrero: 1, mar: 2, march: 2, marzo: 2, apr: 3, abr: 3, april: 3, abril: 3,
  may: 4, mayo: 4, jun: 5, june: 5, junio: 5, jul: 6, july: 6, julio: 6, aug: 7, ago: 7, august: 7, agosto: 7,
  sep: 8, sept: 8, set: 8, september: 8, septiembre: 8, setiembre: 8, oct: 9, october: 9, octubre: 9, nov: 10, november: 10, noviembre: 10,
  dec: 11, dic: 11, december: 11, diciembre: 11,
};
/** Fechas como «Tue, Nov 4, 2026 at 10:00 AM», «mar, 4 nov 2026, 10:00», «4 de noviembre de 2026», «04/11/2026». */
export function looseDate(s: string): Date | null {
  s = s.toLowerCase().replace(/\./g, " ");
  const year = (s.match(/\b(20\d\d)\b/) || [])[1];
  const time = s.match(/\b(\d{1,2}):(\d{2})\s*(am|pm|a\s?m|p\s?m)?/);
  let h = time ? Number(time[1]) : 12; const min = time ? Number(time[2]) : 0;
  if (time?.[3]?.startsWith("p") && h < 12) h += 12;
  if (time?.[3]?.startsWith("a") && h === 12) h = 0;
  const num = s.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d\d)\b/);
  if (num) { const d = new Date(Number(num[3]), Number(num[2]) - 1, Number(num[1]), h, min); return isNaN(+d) ? null : d; }
  if (!year) return null;
  const words = s.split(/[^a-záéíóúñ0-9]+/);
  // Se toma el último nombre de mes con un día al lado («mar, 4 nov» → noviembre, no marzo)
  let mi = -1, near = 0;
  words.forEach((w, i) => {
    if (!(w in MONTHS) || w.length < 3) return;
    const n = [words[i - 1], words[i - 2], words[i + 1]].map((x) => Number(x)).find((x) => x >= 1 && x <= 31);
    if (n) { mi = i; near = n; }
  });
  if (mi < 0) return null;
  const d = new Date(Number(year), MONTHS[words[mi]], near, h, min);
  return isNaN(+d) ? null : d;
}

const MARKERS = /(-{2,}\s*(forwarded message|mensaje reenviado|original message|mensaje original)\s*-{2,}|begin forwarded message:|inicio del mensaje reenviado:|^_{8,}$)/im;
const FIELD = /^\s*\*?(from|de|date|fecha|sent|enviado(?: el)?|subject|asunto|to|para|cc)\*?\s*:\s*(.*)$/i;

/** Si el correo es un reenvío manual, recupera el remitente, asunto, fecha y cuerpo originales. */
export function unwrapForward(m: { from: string; subject: string; body: string; date: Date }) {
  const body = m.body.replace(/\r/g, "");
  const mk = body.match(MARKERS);
  const fwdSubject = /^\s*(fwd?|rv|tr|reenv(iado|io)?)\s*:/i.test(m.subject);
  if (!mk && !fwdSubject) return m;
  const start = mk ? (mk.index ?? 0) + mk[0].length : 0;
  const lines = body.slice(start).split("\n");
  const f: Record<string, string> = {};
  let i = 0, seen = 0;
  for (; i < Math.min(lines.length, 30); i++) {
    const l = lines[i].trim();
    if (!l) { if (seen >= 2) break; else continue; }
    const x = l.match(FIELD);
    if (x) { const k = x[1].toLowerCase(); f[k] = x[2].trim(); seen++; } else if (seen >= 2) break;
  }
  if (seen < 2) return { ...m, subject: m.subject.replace(/^\s*((fwd?|rv|tr|reenv(iado|io)?)\s*:\s*)+/i, "") };
  let from = f["from"] || f["de"] || m.from;
  from = from.replace(/\[mailto:([^\]]+)\]/i, "<$1>").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const sub = f["subject"] || f["asunto"] || m.subject.replace(/^\s*((fwd?|rv|tr|reenv(iado|io)?)\s*:\s*)+/i, "");
  const dstr = f["date"] || f["fecha"] || f["sent"] || f["enviado"] || f["enviado el"] || "";
  const date = (dstr && looseDate(dstr)) || m.date;
  return { from, subject: sub, date, body: lines.slice(i).join("\n").trim() || body };
}

// ---------- Lector de correos adjuntos (.eml) ----------
// Para «Reenviar como archivo adjunto»: Gmail y Outlook mandan cada correo original como un .eml.

const latin1 = (b: Uint8Array) => { let s = ""; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192)); return s; };
const toBytes = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 255);
function decodeText(b: Uint8Array, charset = "utf-8"): string {
  const cs = (charset || "utf-8").toLowerCase().replace(/^"|"$/g, "");
  try { return new TextDecoder(cs === "latin1" ? "iso-8859-1" : cs).decode(b); } catch { return new TextDecoder("utf-8").decode(b); }
}
function qpDecode(s: string): Uint8Array {
  s = s.replace(/=\r?\n/g, "");
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "=" && /^[0-9a-f]{2}$/i.test(s.slice(i + 1, i + 3))) { out.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; }
    else out.push(s.charCodeAt(i) & 255);
  }
  return Uint8Array.from(out);
}
function b64Decode(s: string): Uint8Array { try { return toBytes(atob(s.replace(/[^A-Za-z0-9+/=]/g, ""))); } catch { return new Uint8Array(); } }

/** «=?UTF-8?B?...?=» y «=?iso-8859-1?Q?...?=» en cabeceras. */
export function decodeWords(s: string): string {
  return s.replace(/\?=\s+=\?/g, "?==?").replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_, cs, enc, txt) =>
    decodeText(enc.toLowerCase() === "b" ? b64Decode(txt) : qpDecode(txt.replace(/_/g, " ")), cs));
}
function splitHead(raw: string): [Record<string, string>, string] {
  const m = raw.match(/\r?\n\r?\n/);
  const head = m ? raw.slice(0, m.index) : raw, body = m ? raw.slice((m.index ?? 0) + m[0].length) : "";
  const h: Record<string, string> = {};
  for (const line of head.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) {
    const i = line.indexOf(":"); if (i < 1) continue;
    const k = line.slice(0, i).trim().toLowerCase(); if (!(k in h)) h[k] = line.slice(i + 1).trim();
  }
  return [h, body];
}
const param = (v: string, p: string) => ((v || "").match(new RegExp(`${p}\\s*=\\s*"?([^";]+)"?`, "i")) || [])[1] || "";

export type Pdf = { name: string; bytes: Uint8Array };
export const MAX_PDF_BYTES = 3_000_000, MAX_PDFS = 2;
/** ¿Es un PDF? Por tipo o por nombre (Outlook a veces lo manda como octet-stream). */
export const isPdf = (type = "", name = "") => /application\/(x-)?pdf/i.test(type) || (/octet-stream/i.test(type) && /\.pdf$/i.test(name)) || (!type && /\.pdf$/i.test(name));

function walk(raw: string, acc: { text: string; html: string; pdfs: Pdf[] }, depth = 0) {
  if (depth > 6) return;
  const [h, body] = splitHead(raw);
  const ct = (h["content-type"] || "text/plain").toLowerCase();
  if (ct.startsWith("multipart/")) {
    const b = param(h["content-type"], "boundary"); if (!b) return;
    const parts = body.split("--" + b);
    for (const p of parts.slice(1)) { if (p.startsWith("--")) break; walk(p.replace(/^\r?\n/, ""), acc, depth + 1); }
    return;
  }
  const enc = (h["content-transfer-encoding"] || "").toLowerCase();
  const name = decodeWords(param(h["content-disposition"], "filename") || param(h["content-type"], "name"));
  if (isPdf(ct, name)) {
    if (acc.pdfs.length < MAX_PDFS && body.length < MAX_PDF_BYTES * 1.4) {
      const bytes = enc.includes("base64") ? b64Decode(body) : toBytes(body);
      if (bytes.length > 4 && bytes.length <= MAX_PDF_BYTES) acc.pdfs.push({ name: name || "factura.pdf", bytes });
    }
    return;
  }
  if (/attachment/i.test(h["content-disposition"] || "")) return;
  if (!ct.startsWith("text/")) return;
  const bytes = enc.includes("base64") ? b64Decode(body) : enc.includes("quoted") ? qpDecode(body) : toBytes(body);
  const txt = decodeText(bytes, param(h["content-type"], "charset"));
  if (ct.startsWith("text/plain") && !acc.text) acc.text = txt;
  else if (ct.startsWith("text/html") && !acc.html) acc.html = txt;
}

/** Lee un .eml y devuelve remitente, asunto, fecha y cuerpo (texto o HTML). */
export function parseEml(input: Uint8Array | string): { from: string; subject: string; date: Date | null; text: string; html: string; pdfs: Pdf[] } {
  const raw = typeof input === "string" ? input : latin1(input);
  const [h] = splitHead(raw);
  const acc = { text: "", html: "", pdfs: [] as Pdf[] };
  walk(raw, acc);
  const d = h["date"] ? new Date(h["date"]) : null;
  return { from: decodeWords(h["from"] || ""), subject: decodeWords(h["subject"] || ""), date: d && !isNaN(+d) ? d : null, text: acc.text, html: acc.html, pdfs: acc.pdfs };
}
