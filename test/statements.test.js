// Extractos y liquidaciones en PDF (texto anonimizado tal y como lo saca pdf.js) y cobros añadidos a mano
const test = require('node:test'), assert = require('node:assert');
const fs = require('node:fs'), path = require('node:path');
const g = {}; new Function('window', fs.readFileSync(path.join(__dirname, '../src/engine.js'), 'utf8'))(g); const E = g.HFEngine;
const PDF = '\n\n--- Factura adjunta (PDF) ---\n';

test('liquidación mensual de crédito revolving: la cantidad a pagar, no el último pago', () => {
  const body = 'Tu extracto mensual está disponible. Recuerda realizar el pago mínimo mensual indicado en la app.' + PDF +
    'Liquidación Mensual: Periodo del 23 de septiembre\nCrédito al consumo en modalidad REVOLVING\n1 RESUMEN DEL MES\nSaldo dispuesto inicial 1425,65 €\n(+) Intereses devengados\n(24,19 %) 24,42 €\n(−) Pagos realizados -67,95 € Cuota mensual abonada por el/la titular.\n(=) Saldo dispuesto\nfinal 1382,12 €\nC A N T I D A D A PA G A R\n65,15 €\nP R Ó X I M O PA G O\n24 de octubre de 2026\nL Í M I T E D E C R É D I T O C O N C E D I D O\n2500,00 €';
  const c = E.toCharge({ from: 'Financiera <avisos@financiera.es>', subject: 'Aquí está el extracto mensual de tu crédito', date: '2026-10-23T05:00:00Z', body });
  assert.equal(c.amount, 65.15); assert.equal(c.kind, 'prestamo'); assert.equal(c.cycleHint, 'monthly'); assert.ok(c.stmt);
});

test('información trimestral con tabla: la cuota mensual (no el capital ni la TAE)', () => {
  const body = 'Adjunto puedes encontrar el documento de información trimestral de tu línea de crédito revolving.' + PDF +
    'Detalle de su línea de crédito a fecha 13/10/2026\nModalidad de pago aplazada\nFecha de\ndisposición\nReferencia Crédito\ndispuesto\nTIN TAE Intereses\nestimados\nCuota\nmensual\nNº de\ncuotas\nFecha\nestimada de\namortización\n18/08/2026 00000000000000 2.856,32 € 21,58 % 23,85 % 1.013,38 € 111,00 € 35 02/09/2029\nTAE: Tasa Anual Equivalente. TIN: Tipo de interés nominal anual.';
  const c = E.toCharge({ from: 'Crédito <noreply@credito.es>', subject: 'Información trimestral de tu crédito revolving', date: '2026-10-15T05:00:00Z', body });
  assert.equal(c.amount, 111); assert.equal(c.cycleHint, 'monthly'); assert.equal(c.kind, 'prestamo');
});

test('una factura normal no cambia', () => {
  const c = E.toCharge({ from: 'Netflix <info@netflix.com>', subject: 'Tu recibo de Netflix', date: '2026-10-01T10:00:00Z', body: 'Plan Estándar. Total: 14,99 €. Próximo cobro: 1 de noviembre.' });
  assert.equal(c.amount, 14.99); assert.ok(!c.stmt);
});

test('cobros añadidos a mano: próxima fecha, mensual y sin historial', () => {
  const a = E.analyze([], { manual: [
    { id: 'a', name: 'Préstamo coche', amount: 210.5, cycle: 'monthly', date: '2026-08-05', cat: 'deudas' },
    { id: 'b', name: 'Seguro hogar', amount: 240, cycle: 'yearly', date: '2026-03-10', cat: 'hogar' },
    { id: 'c', name: 'Mal', amount: 0, cycle: 'monthly', date: '2026-01-01' }
  ], cancelled: { 'manual-b': true } }, new Date('2026-11-15T12:00:00'));
  const s = Object.fromEntries(a.subs.map(x => [x.key, x]));
  assert.equal(a.subs.length, 2);
  assert.equal(s['manual-a'].next.getDate(), 5); assert.equal(s['manual-a'].next.getMonth(), 11);
  assert.equal(s['manual-a'].history.length, 0); assert.ok(s['manual-a'].debt);
  assert.equal(s['manual-b'].status, 'cancelada'); assert.equal(s['manual-b'].monthly, 20);
  assert.equal(a.totals.monthlyRec, 210.5);
});
