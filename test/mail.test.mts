import { unwrapForward, verifySvix, gmailVerification, looseDate } from '../supabase/functions/inbound/mail.ts';
import { createHmac } from 'node:crypto';
let fail = 0; const ok = (c: boolean, m: string) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + m); if (!c) fail++; };

// Svix
const secretRaw = Buffer.from('supersecretkey-1234567890abcdef').toString('base64');
const body = '{"type":"email.received","data":{"email_id":"abc"}}';
const ts = String(Math.floor(Date.now() / 1000));
const sig = createHmac('sha256', Buffer.from(secretRaw, 'base64')).update(`msg_1.${ts}.${body}`).digest('base64');
const H = (s: string, t = ts) => new Headers({ 'svix-id': 'msg_1', 'svix-timestamp': t, 'svix-signature': s });
ok(await verifySvix(body, H(`v1,${sig}`), 'whsec_' + secretRaw), 'firma válida');
ok(await verifySvix(body, H(`v1,xxx v1,${sig}`), 'whsec_' + secretRaw), 'varias firmas');
ok(!(await verifySvix(body + ' ', H(`v1,${sig}`), 'whsec_' + secretRaw)), 'cuerpo alterado rechazado');
ok(!(await verifySvix(body, H(`v1,${sig}`, String(Number(ts) - 1000)), 'whsec_' + secretRaw)), 'timestamp viejo rechazado');
ok(!(await verifySvix(body, new Headers(), 'whsec_' + secretRaw)), 'sin cabeceras rechazado');

// Gmail
const g = gmailVerification('Equipo de Gmail <forwarding-noreply@google.com>', '(#123456789) Confirmación de reenvío de Gmail - Recibir correo de pepe@gmail.com', 'Para permitir... haz clic en el enlace: https://mail-settings.google.com/mail/vf-%5BANGjdJ%5D-abc. Código de confirmación: 123456789');
ok(!!g && g.code === '123456789' && g.link.startsWith('https://mail-settings.google.com/mail/vf-'), 'gmail código y enlace ' + JSON.stringify(g));
ok(gmailVerification('Netflix <info@netflix.com>', '(#1234567) x', '') === null, 'no gmail -> null');

// Fechas
const d1 = looseDate('Tue, Nov 4, 2026 at 10:05 AM'); ok(!!d1 && d1.getMonth() === 10 && d1.getDate() === 4 && d1.getHours() === 10, 'fecha inglés gmail ' + d1);
const d2 = looseDate('mar, 4 nov 2026, 19:30'); ok(!!d2 && d2.getMonth() === 10 && d2.getDate() === 4 && d2.getHours() === 19, 'fecha español gmail ' + d2);
const d3 = looseDate('martes, 4 de noviembre de 2026 8:15'); ok(!!d3 && d3.getMonth() === 10 && d3.getDate() === 4, 'fecha larga es ' + d3);
const d4 = looseDate('04/11/2026 9:00'); ok(!!d4 && d4.getMonth() === 10 && d4.getDate() === 4, 'fecha numérica ' + d4);
const d5 = looseDate('Monday, November 3, 2026 3:40 PM'); ok(!!d5 && d5.getDate() === 3 && d5.getHours() === 15, 'outlook inglés ' + d5);

// Reenvío manual Gmail español
const now = new Date('2026-11-11T10:00:00Z');
let r = unwrapForward({ from: 'Pepe <pepe@gmail.com>', subject: 'Fwd: Tu recibo de Netflix', date: now, body: 'mira esto\n\n---------- Forwarded message ---------\nDe: Netflix <info@account.netflix.com>\nDate: mar, 4 nov 2026, 10:00\nSubject: Tu recibo de Netflix\nTo: <pepe@gmail.com>\n\nGracias. Total: 13,99 €\nPlan Estándar' });
ok(r.from === 'Netflix <info@account.netflix.com>' && r.subject === 'Tu recibo de Netflix' && r.date.getDate() === 4 && r.date.getMonth() === 10 && /13,99/.test(r.body) && !/Forwarded/.test(r.body), 'gmail reenvío ' + JSON.stringify({ f: r.from, s: r.subject, d: r.date }));
// Outlook español
r = unwrapForward({ from: 'Ana <ana@outlook.com>', subject: 'RV: Factura de Movistar', date: now, body: '________________________________\nDe: Movistar <facturas@movistar.es>\nEnviado: lunes, 3 de noviembre de 2026 8:00\nPara: ana@outlook.com\nAsunto: Factura de Movistar\n\nImporte total: 45,00 €' });
ok(r.from.includes('facturas@movistar.es') && r.subject === 'Factura de Movistar' && r.date.getDate() === 3, 'outlook reenvío ' + JSON.stringify({ f: r.from, s: r.subject, d: r.date }));
// Apple Mail
r = unwrapForward({ from: 'Yo <yo@icloud.com>', subject: 'Fwd: Your receipt from Apple', date: now, body: 'Begin forwarded message:\n\nFrom: Apple <no_reply@email.apple.com>\nSubject: Your receipt from Apple.\nDate: 2 November 2026 at 09:12:00 CET\nTo: yo@icloud.com\n\nTotal 2,99 €' });
ok(r.from.includes('no_reply@email.apple.com') && r.date.getDate() === 2, 'apple reenvío ' + JSON.stringify({ f: r.from, s: r.subject, d: r.date }));
// Reenvío automático (sin marcador) se queda igual
r = unwrapForward({ from: 'Spotify <no-reply@spotify.com>', subject: 'Tu recibo de Spotify', date: now, body: 'Total: 11,99 €' });
ok(r.from.includes('spotify') && r.date === now, 'auto-reenvío intacto');
// mailto de outlook
r = unwrapForward({ from: 'x <x@y.com>', subject: 'RV: Recibo', date: now, body: '-----Original Message-----\nFrom: Uber [mailto:noreply@uber.com]\nSent: Monday, November 3, 2026 3:40 PM\nSubject: Tu viaje\n\nTotal 12,30 €' });
ok(r.from === 'Uber <noreply@uber.com>' && r.subject === 'Tu viaje', 'mailto ' + r.from);
console.log(fail ? `\n${fail} FALLOS` : '\nTodo OK'); process.exit(fail ? 1 : 0);
