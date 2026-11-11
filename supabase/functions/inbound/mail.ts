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
