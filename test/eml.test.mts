import { parseEml, decodeWords } from "../supabase/functions/inbound/mail.ts";
let fail = 0; const ok = (c: boolean, m: string) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++; };
const eml1 = [
 "From: =?UTF-8?Q?Netflix_Espa=C3=B1a?= <info@account.netflix.com>",
 "Subject: =?UTF-8?B?VHUgcmVjaWJvIGRlIE5ldGZsaXg=?=",
 "Date: Tue, 14 Oct 2026 08:12:00 +0200",
 'Content-Type: multipart/alternative; boundary="b1"',
 "", "--b1", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: quoted-printable", "",
 "Plan Est=C3=A1ndar: 14,99 =E2=82=AC al mes. Pr=",
 "=C3=B3ximo cobro 14 nov.", "--b1", "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "",
 btoa("<p>Plan</p>"), "--b1--", ""].join("\r\n");
const r1 = parseEml(new TextEncoder().encode(eml1));
ok(r1.from === "Netflix España <info@account.netflix.com>", "from: " + r1.from);
ok(r1.subject === "Tu recibo de Netflix", "subject: " + r1.subject);
ok(r1.date?.toISOString() === "2026-10-14T06:12:00.000Z", "date");
ok(r1.text.includes("Estándar: 14,99 € al mes. Próximo"), "texto QP: " + r1.text);
ok(r1.html === "<p>Plan</p>", "html base64");
// Latin-1 y solo HTML, dentro de mixed con un PDF adjunto
const eml2 = ["From: Endesa <facturas@endesa.es>", "Subject: =?iso-8859-1?Q?Tu_factura_de_electricidad?=", "Date: 3 Sep 2026 10:00:00 +0000",
 "Content-Type: multipart/mixed; boundary=XX", "", "--XX", "Content-Type: text/html; charset=iso-8859-1", "Content-Transfer-Encoding: quoted-printable", "",
 "<b>Importe: 63,20 =80? no</b> a=F1o", "--XX", "Content-Type: application/pdf", "Content-Disposition: attachment; filename=f.pdf", "Content-Transfer-Encoding: base64", "", "JVBERi0=", "--XX--"].join("\n");
const r2 = parseEml(eml2);
ok(r2.subject === "Tu factura de electricidad", "subject latin1 Q");
ok(r2.html.includes("año"), "html latin1: " + r2.html);
ok(r2.text === "", "sin texto plano");
ok(decodeWords("=?UTF-8?B?SG9s?= =?UTF-8?B?YQ==?=") === "Hola", "palabras partidas");
console.log(fail ? fail + " FALLOS" : "Todo OK"); if (fail) process.exit(1);
