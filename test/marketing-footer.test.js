// Correos reales de compra traen pie publicitario («Black Friday», «date de baja», newsletter…).
// Deben contarse. Las newsletters de verdad (sin pedido, sin total, sin pago) deben seguir fuera.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const g = {};
new Function('window', fs.readFileSync(path.join(__dirname, '..', 'src', 'engine.js'), 'utf8'))(g);
const E = g.HFEngine;
const mk = (from, subject, body, date = '2026-11-06T10:00:00Z') => ({ from, subject, date, body });
const FOOT = [
  'Si no quieres recibir más correos, date de baja aquí.',
  'Suscríbete a nuestra newsletter y no te lo pierdas.',
  'Ya llega el Black Friday: hasta un 70% de descuento en miles de productos.',
  'Unsubscribe | Privacy policy',
];

test('confirmaciones de pedido con pie publicitario cuentan como compra', () => {
  const orders = [
    mk('Zalando <info@service-mail.zalando.es>', '¡Gracias por tu pedido!',
      'Fecha de la compra 06.11.2026 Número de pedido 10000000000000 Tu artículo de Zalando Nike SB Zapatillas 59,95 € Talla: 44 Cantidad: 1 Completa el look Modo de pago Apple Pay Subtotal 59,95 € Envío Gratis Total IVA incluido 59,95 € Plus Hazte Plus'),
    mk('Amazon.es <confirmar-envio@amazon.es>', 'Pedido realizado: «Auriculares…»',
      'Gracias por tu pedido. Pedido n.º 405-0000000-0000000 Total del pedido: 24,99 € Método de pago: Visa'),
    mk('SHEIN <noreply@shein.com>', 'Confirmación de tu pedido',
      'Hola, tu pedido GSH00000 se ha realizado. Subtotal 31,40 € Envío 0,00 € Total: 31,40 € Pagado con PayPal'),
    mk('TikTok Shop <no-reply@shop.tiktok.com>', '¡Tu pedido se ha confirmado!',
      'ID de pedido 5770000000 Total 97,99 € Forma de pago: tarjeta'),
    mk('Glovo <no-reply@glovoapp.com>', 'Detalles de tu pedido', 'Resumen de tu pedido Productos 18,90 € Envío 2,64 € Total 21,54 € Pagado con tarjeta'),
  ];
  for (const o of orders) for (const f of FOOT) {
    const c = E.toCharge({ ...o, body: `${o.body}\n${f}` });
    assert.ok(c, `descartado: ${o.from} + «${f.slice(0, 30)}»`);
    assert.strictEqual(c.kind, 'compra', `${o.from} debería ser compra`);
  }
});

test('el importe de Zalando es el total (59,95 €) y el 6 de noviembre', () => {
  const c = E.toCharge(mk('Zalando <info@service-mail.zalando.es>', '¡Gracias por tu pedido!',
    `Número de pedido 10000000000000 Nike SB Zapatillas 59,95 € Modo de pago Apple Pay Subtotal 59,95 € Envío Gratis Total IVA incluido 59,95 €\n${FOOT[2]}`));
  assert.strictEqual(c.amount, 59.95);
  assert.strictEqual(c.merchant, 'Zalando');
  assert.strictEqual(c.date.toISOString().slice(0, 10), '2026-11-06');
});

test('las newsletters siguen sin contar', () => {
  const promos = [
    mk('Zalando <info@service-mail.zalando.es>', 'Black Friday: hasta un 70% en zapatillas', 'Descubre las ofertas exclusivas. Zapatillas desde 29,95 €. Haz tu pedido antes del domingo. Date de baja aquí.'),
    mk('Amazon.es <store-news@amazon.es>', 'Ofertas exclusivas para ti', 'Echa un vistazo: Kindle por 89,99 €. No te lo pierdas. Unsubscribe'),
    mk('Spotify <no-reply@spotify.com>', 'Prueba Premium', '3 meses por 0 €, después 11,99 €/mes. Newsletter. Date de baja.'),
  ];
  for (const p of promos) {
    assert.strictEqual(E.toCharge(p), null, `no debería contar: ${p.subject}`);
    assert.strictEqual(E.maybeReceipt(p), false, `no debería ir a revisión: ${p.subject}`);
  }
});
