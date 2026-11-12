// Casos reales (anonimizados) que el motor tiene que clasificar bien: node test/real-inbox.test.js
const fs = require('fs'), path = require('path');
const scope = {}; new Function('window', fs.readFileSync(path.join(__dirname, '../src/engine.js'), 'utf8'))(scope);
const E = scope.HFEngine;
const emails = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/real-inbox.json'), 'utf8'));
const a = E.analyze(emails, {}, new Date('2026-11-12T20:00:00Z'));
let fail = 0;
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FAIL ') + m); if (!c) fail++; };
const sub = n => a.subs.find(s => s.merchant === n);
const one = n => a.oneoffs.filter(c => c.merchant === n);

ok(!sub('TikTok Shop'), 'TikTok Shop no es una suscripción');
ok(one('TikTok Shop').length === 2, 'TikTok: 2 pedidos (los avisos de reparto y entrega no cuentan otra vez)');
ok(!a.leaks.some(l => l.type === 'subida' && /TikTok/.test(l.title)), 'TikTok: sin «subida de precio»');
ok(!a.leaks.some(l => l.type === 'duplicado'), 'Sin falsos cobros duplicados (mismo recibo reenviado y pegado)');
ok(one('Anthropic').length === 1 && one('Anthropic')[0].kind === 'compra', 'Créditos de Anthropic: una compra puntual');
ok(sub('Claude Pro') && sub('Claude Pro').amount === 21.78 && !sub('Claude Pro').priceUp, 'Claude Pro: 21,78 € al mes, sin subida falsa');
ok(sub('ChatGPT Plus') && sub('ChatGPT Plus').amount === 22.99, 'ChatGPT por Apple: 22,99 € (total, no subtotal)');
ok(sub('iCloud+') && sub('iCloud+').amount === 2.99, 'iCloud+: 2,99 € (total, no subtotal)');
ok(!a.charges.some(c => c.merchant.startsWith('Lovable') && c.date.getMonth() === 5), 'Pago fallido de Lovable: no es un gasto');
ok(sub('Vercel') && sub('Vercel').count === 1 && one('Vercel').length === 1, 'Vercel: plan Pro (suscripción) y dominio (compra) separados');
ok(sub('Cofidis') && sub('Cofidis').cat === 'deudas' && sub('Cofidis').debt, 'Cofidis: préstamo mensual');
ok(one('ZARA').length === 2 && one('ZARA').every(c => c.cat === 'compras'), 'Zara: dos compras, no suscripción');
ok(one('Booking.com').length === 1, 'Reenvío a mano de Booking: comercio Booking.com, no el usuario');
ok(one('Ionos').length === 1, 'Factura de IONOS reenviada por otra cuenta: comercio Ionos');
ok(one('Moonshot AI').length === 1 && one('Moonshot AI')[0].cat === 'software', 'Moonshot AI: software (y no «transporte» por «stripe»)');
ok(!E.maybeReceipt(emails.find(e => e.id === 'r8')), 'El servidor no guarda pagos fallidos');

console.log(fail ? `\n${fail} FALLOS` : '\nTodo OK'); process.exit(fail ? 1 : 0);
