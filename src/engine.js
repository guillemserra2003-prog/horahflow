/* =========================================================
   HorahFlow · Motor de análisis de gastos a partir de correos
   Todo se procesa en el navegador del usuario.
   ========================================================= */
(function (global) {
  'use strict';

  const CATS = {
    streaming: { label: 'Streaming y vídeo', color: '#2F8F5B' },
    musica:    { label: 'Música y audio',    color: '#5CC57A' },
    software:  { label: 'Software e IA',     color: '#3D3A4F' },
    nube:      { label: 'Nube y almacenamiento', color: '#7A7790' },
    telecom:   { label: 'Móvil e internet',  color: '#4A6B60' },
    hogar:     { label: 'Luz, agua y hogar', color: '#A3B8AE' },
    deporte:   { label: 'Deporte y salud',   color: '#8FD6A3' },
    comida:    { label: 'Comida a domicilio', color: '#D9A441' },
    transporte:{ label: 'Transporte',        color: '#C46B4E' },
    compras:   { label: 'Compras online',    color: '#B5B2C4' },
    formacion: { label: 'Formación',         color: '#6E9FB8' },
    social:    { label: 'Social y ocio',     color: '#9C7BB5' },
    otros:     { label: 'Otros',             color: '#CFCDD8' }
  };

  // Catálogo de servicios conocidos. alts = alternativas gratuitas o más baratas.
  const CATALOG = [
    { id: 'netflix', name: 'Netflix', re: /netflix/i, cat: 'streaming', rec: true, cycle: 'monthly',
      cancel: 'https://www.netflix.com/cancelplan',
      alts: [{ n: 'RTVE Play', d: 'Series, cine y documentales gratis.', u: 'https://www.rtve.es/play/' },
             { n: 'Pluto TV', d: 'Canales gratuitos con anuncios.', u: 'https://pluto.tv/' },
             { n: 'Rotar plataformas', d: 'Suscríbete un mes, ve lo que quieres y cancela. Ahorra 6–8 meses al año.' }] },
    { id: 'hbo', name: 'Max (HBO)', re: /\bhbo\b|hbomax|\bmax\.com|warner bros\. discovery/i, cat: 'streaming', rec: true, cycle: 'monthly',
      cancel: 'https://help.max.com/',
      alts: [{ n: 'Rotar con otras plataformas', d: 'Activa Max solo cuando salga la temporada que sigues.' }] },
    { id: 'disney', name: 'Disney+', re: /disney\s?\+|disneyplus|disney plus/i, cat: 'streaming', rec: true, cycle: 'monthly',
      cancel: 'https://www.disneyplus.com/account',
      alts: [{ n: 'Plan con anuncios', d: 'El plan Estándar con anuncios cuesta bastante menos.' }] },
    { id: 'prime', name: 'Amazon Prime', re: /amazon prime|prime video|suscripci[oó]n prime|membres[ií]a prime|prime membership/i, cat: 'streaming', rec: true, cycle: 'yearly',
      cancel: 'https://www.amazon.es/mc',
      alts: [{ n: 'Pagar envíos solo cuando hagan falta', d: 'Si haces menos de 1 pedido al mes, Prime no compensa.' }] },
    { id: 'dazn', name: 'DAZN', re: /\bdazn\b/i, cat: 'streaming', rec: true, cycle: 'monthly', cancel: 'https://www.dazn.com/',
      alts: [{ n: 'Pase mensual puntual', d: 'Contrátalo solo en los meses de competición que te interesen.' }] },
    { id: 'filmin', name: 'Filmin', re: /filmin/i, cat: 'streaming', rec: true, cycle: 'monthly', cancel: 'https://www.filmin.es/',
      alts: [{ n: 'eFilm', d: 'Cine gratis con el carnet de tu biblioteca pública.', u: 'https://efilm.online/' }] },
    { id: 'youtube', name: 'YouTube Premium', re: /youtube premium|youtube music/i, cat: 'musica', rec: true, cycle: 'monthly',
      cancel: 'https://www.youtube.com/paid_memberships',
      alts: [{ n: 'Plan Familiar', d: 'Compartido entre 6 personas sale mucho más barato.' }] },
    { id: 'spotify', name: 'Spotify', re: /spotify/i, cat: 'musica', rec: true, cycle: 'monthly',
      cancel: 'https://www.spotify.com/account/subscription/',
      alts: [{ n: 'Spotify Free', d: 'Gratis con anuncios.', u: 'https://www.spotify.com/' },
             { n: 'Plan Duo o Familiar', d: 'Compartido sale por 3–4 €/persona.' }] },
    { id: 'apple-music', name: 'Apple Music', re: /apple music/i, cat: 'musica', rec: true, cycle: 'monthly', cancel: 'https://support.apple.com/es-es/118428',
      alts: [{ n: 'Spotify Free', d: 'Gratis con anuncios.', u: 'https://www.spotify.com/' }] },
    { id: 'audible', name: 'Audible', re: /audible/i, cat: 'musica', rec: true, cycle: 'monthly', cancel: 'https://www.audible.es/account',
      alts: [{ n: 'eBiblio', d: 'Audiolibros y ebooks gratis con tu biblioteca pública.', u: 'https://ebiblio.es/' }] },
    { id: 'kindle', name: 'Kindle Unlimited', re: /kindle unlimited/i, cat: 'formacion', rec: true, cycle: 'monthly', cancel: 'https://www.amazon.es/kindle-dbs/ku/ku-central',
      alts: [{ n: 'eBiblio', d: 'Préstamo gratuito de ebooks.', u: 'https://ebiblio.es/' }] },
    { id: 'icloud', name: 'iCloud+', re: /icloud/i, cat: 'nube', rec: true, cycle: 'monthly', cancel: 'https://support.apple.com/es-es/108047',
      alts: [{ n: 'Limpiar fotos duplicadas', d: 'Muchas veces liberando espacio basta con el plan de 50 GB.' }] },
    { id: 'google-one', name: 'Google One', re: /google one|google storage|almacenamiento de google/i, cat: 'nube', rec: true, cycle: 'monthly', cancel: 'https://one.google.com/settings',
      alts: [{ n: '15 GB gratis', d: 'Vacía Gmail y Drive de adjuntos grandes antes de pagar.' }] },
    { id: 'dropbox', name: 'Dropbox', re: /dropbox/i, cat: 'nube', rec: true, cycle: 'monthly', cancel: 'https://www.dropbox.com/account/plan',
      alts: [{ n: 'Google Drive', d: '15 GB gratuitos.', u: 'https://drive.google.com/' },
             { n: 'pCloud / MEGA', d: 'Planes gratuitos de 10–20 GB.' }] },
    { id: 'chatgpt', name: 'ChatGPT Plus', re: /openai|chatgpt/i, cat: 'software', rec: true, cycle: 'monthly', cancel: 'https://help.openai.com/',
      alts: [{ n: 'Versiones gratuitas de asistentes IA', d: 'Para uso ocasional, el plan gratuito suele bastar.' }] },
    { id: 'claude', name: 'Claude Pro', re: /anthropic|claude\.ai/i, cat: 'software', rec: true, cycle: 'monthly', cancel: 'https://claude.ai/settings',
      alts: [{ n: 'Plan gratuito', d: 'Para uso ocasional, el plan gratuito suele bastar.' }] },
    { id: 'adobe', name: 'Adobe Creative Cloud', re: /adobe/i, cat: 'software', rec: true, cycle: 'monthly', cancel: 'https://account.adobe.com/plans',
      alts: [{ n: 'Photopea', d: 'Editor tipo Photoshop gratis en el navegador.', u: 'https://www.photopea.com/' },
             { n: 'GIMP / Inkscape', d: 'Software libre para foto y vector.', u: 'https://www.gimp.org/' },
             { n: 'DaVinci Resolve', d: 'Edición de vídeo profesional gratuita.', u: 'https://www.blackmagicdesign.com/products/davinciresolve' }] },
    { id: 'm365', name: 'Microsoft 365', re: /microsoft 365|office 365|microsoft\.com.*suscrip/i, cat: 'software', rec: true, cycle: 'yearly', cancel: 'https://account.microsoft.com/services',
      alts: [{ n: 'LibreOffice', d: 'Suite ofimática gratuita.', u: 'https://www.libreoffice.org/' },
             { n: 'Google Docs', d: 'Gratis y en la nube.', u: 'https://docs.google.com/' }] },
    { id: 'canva', name: 'Canva Pro', re: /canva/i, cat: 'software', rec: true, cycle: 'monthly', cancel: 'https://www.canva.com/settings/billing-and-teams',
      alts: [{ n: 'Canva Free', d: 'La versión gratuita cubre la mayoría de usos.', u: 'https://www.canva.com/' }] },
    { id: 'notion', name: 'Notion', re: /notion/i, cat: 'software', rec: true, cycle: 'monthly', cancel: 'https://www.notion.so/',
      alts: [{ n: 'Obsidian', d: 'Notas locales, gratis para uso personal.', u: 'https://obsidian.md/' }] },
    { id: 'linkedin', name: 'LinkedIn Premium', re: /linkedin/i, cat: 'formacion', rec: true, cycle: 'monthly', cancel: 'https://www.linkedin.com/premium/manage/',
      alts: [{ n: 'LinkedIn gratuito', d: 'Actívalo solo en épocas de búsqueda activa de empleo.' }] },
    { id: 'duolingo', name: 'Duolingo Super', re: /duolingo/i, cat: 'formacion', rec: true, cycle: 'yearly', cancel: 'https://www.duolingo.com/settings/subscription',
      alts: [{ n: 'Duolingo gratis', d: 'Mismo contenido, con anuncios.', u: 'https://www.duolingo.com/' }] },
    { id: 'gym', name: 'Gimnasio', re: /basic-?fit|altafit|mcfit|holmes place|dir\b|anytime fitness|gimnasio|fitness park|synergym|vivagym/i, cat: 'deporte', rec: true, cycle: 'monthly', cancel: '',
      alts: [{ n: 'Entrenar en casa o al aire libre', d: 'Apps gratuitas como Nike Training Club + parque.', u: 'https://www.nike.com/ntc-app' }] },
    { id: 'strava', name: 'Strava', re: /strava/i, cat: 'deporte', rec: true, cycle: 'monthly', cancel: 'https://www.strava.com/account',
      alts: [{ n: 'Strava gratuito', d: 'El registro de actividades sigue siendo gratis.' }] },
    { id: 'movistar', name: 'Movistar', re: /movistar|telef[oó]nica/i, cat: 'telecom', rec: true, cycle: 'monthly', cancel: '',
      alts: [{ n: 'Comparar tarifas', d: 'Operadores low-cost (Digi, Lowi, O2) ofrecen fibra+móvil por mucho menos.' }] },
    { id: 'vodafone', name: 'Vodafone', re: /vodafone/i, cat: 'telecom', rec: true, cycle: 'monthly', cancel: '',
      alts: [{ n: 'Comparar tarifas', d: 'Revisa permanencias y compara con operadores low-cost.' }] },
    { id: 'orange', name: 'Orange', re: /\borange\b/i, cat: 'telecom', rec: true, cycle: 'monthly', cancel: '', alts: [{ n: 'Comparar tarifas', d: 'Revisa permanencias y compara con operadores low-cost.' }] },
    { id: 'digi', name: 'Digi', re: /\bdigi\b/i, cat: 'telecom', rec: true, cycle: 'monthly', cancel: '', alts: [] },
    { id: 'iberdrola', name: 'Iberdrola', re: /iberdrola/i, cat: 'hogar', rec: true, cycle: 'monthly', cancel: '',
      alts: [{ n: 'Comparador de la CNMC', d: 'Compara tarifas de luz y gas oficiales.', u: 'https://comparador.cnmc.gob.es/' }] },
    { id: 'endesa', name: 'Endesa', re: /endesa/i, cat: 'hogar', rec: true, cycle: 'monthly', cancel: '',
      alts: [{ n: 'Comparador de la CNMC', d: 'Compara tarifas de luz y gas oficiales.', u: 'https://comparador.cnmc.gob.es/' }] },
    { id: 'naturgy', name: 'Naturgy', re: /naturgy/i, cat: 'hogar', rec: true, cycle: 'monthly', cancel: '',
      alts: [{ n: 'Comparador de la CNMC', d: 'Compara tarifas de luz y gas oficiales.', u: 'https://comparador.cnmc.gob.es/' }] },
    { id: 'glovo', name: 'Glovo', re: /glovo/i, cat: 'comida', rec: false, alts: [{ n: 'Cocinar en lote', d: 'Batch cooking el domingo = 3–4 pedidos menos por semana.' }] },
    { id: 'justeat', name: 'Just Eat', re: /just ?eat/i, cat: 'comida', rec: false, alts: [{ n: 'Recoger en el local', d: 'Ahorras gastos de envío y servicio.' }] },
    { id: 'ubereats', name: 'Uber Eats', re: /uber eats/i, cat: 'comida', rec: false, alts: [{ n: 'Recoger en el local', d: 'Ahorras gastos de envío y servicio.' }] },
    { id: 'uber', name: 'Uber', re: /\buber\b(?! eats)/i, cat: 'transporte', rec: false, alts: [{ n: 'Transporte público', d: 'Abono mensual o bono de viajes.' }] },
    { id: 'cabify', name: 'Cabify', re: /cabify/i, cat: 'transporte', rec: false, alts: [{ n: 'Transporte público', d: 'Abono mensual o bono de viajes.' }] },
    { id: 'bolt', name: 'Bolt', re: /\bbolt\b/i, cat: 'transporte', rec: false, alts: [] },
    { id: 'amazon', name: 'Amazon', re: /amazon/i, cat: 'compras', rec: false, alts: [{ n: 'Regla de las 48 horas', d: 'Deja el producto en el carrito 2 días antes de comprar.' }] },
    { id: 'aliexpress', name: 'AliExpress', re: /aliexpress/i, cat: 'compras', rec: false, alts: [] },
    { id: 'shein', name: 'Shein', re: /shein/i, cat: 'compras', rec: false, alts: [] },
    { id: 'zara', name: 'Zara', re: /\bzara\b/i, cat: 'compras', rec: false, alts: [] },
    { id: 'tinder', name: 'Tinder', re: /tinder/i, cat: 'social', rec: true, cycle: 'monthly', cancel: '', alts: [] },
    { id: 'playstation', name: 'PlayStation Plus', re: /playstation/i, cat: 'social', rec: true, cycle: 'monthly', cancel: '', alts: [{ n: 'Plan anual en ofertas', d: 'En rebajas el anual sale hasta un 30 % más barato.' }] },
    { id: 'xbox', name: 'Xbox Game Pass', re: /xbox|game pass/i, cat: 'social', rec: true, cycle: 'monthly', cancel: '', alts: [] },
    { id: 'twitch', name: 'Twitch', re: /twitch/i, cat: 'social', rec: true, cycle: 'monthly', cancel: '', alts: [] },
    { id: 'patreon', name: 'Patreon', re: /patreon/i, cat: 'social', rec: true, cycle: 'monthly', cancel: '', alts: [] }
  ];

  const FX = { EUR: 1, USD: 0.92, GBP: 1.17 };
  const CYCLE = {
    weekly:    { label: 'Semanal',    days: 7,   perMonth: 4.33 },
    monthly:   { label: 'Mensual',    days: 30,  perMonth: 1 },
    bimonthly: { label: 'Bimestral',  days: 61,  perMonth: 0.5 },
    quarterly: { label: 'Trimestral', days: 91,  perMonth: 1 / 3 },
    yearly:    { label: 'Anual',      days: 365, perMonth: 1 / 12 }
  };

  const RX_RECEIPT = /recibo|factura|receipt|invoice|tu pago|payment|pago (?:realizado|confirmado|recibido)|cargo|charged|hemos cobrado|pedido|order|renovaci[oó]n|renewal|renew|suscripci[oó]n|subscription|membres[ií]a|membership|cuota|importe|total pagado|billing|facturaci[oó]n|transacci[oó]n|compra|purchase|trip|viaje/i;
  const RX_RECUR = /suscripci[oó]n|subscription|renovaci[oó]n|renewal|renew|membres[ií]a|membership|mensual|monthly|anual|annual|yearly|cuota|tu plan|your plan|premium|plus\b|recurrente|recurring/i;
  const RX_TRIAL = /prueba gratuita|periodo de prueba|free trial|trial (?:ends|ended|period)|tu prueba|fin de la prueba/i;
  const RX_REFUND = /reembolso|refund|devoluci[oó]n|abono a tu cuenta/i;
  const RX_MARKETING = /hasta un \d+ ?%|ofertas? exclusiv|newsletter|black friday|date de baja|unsubscribe|no te lo pierdas/i;
  const RX_AMOUNT = /(?:(€|EUR|USD|US\$|\$|£|GBP)\s?(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?))|(?:(\d{1,3}(?:[.,\s]\d{3})*[.,]\d{1,2}|\d+(?:[.,]\d{1,2})?)\s?(€|EUR|euros?|USD|\$|£|GBP))/gi;

  function parseNum(s) {
    s = String(s).replace(/\s/g, '');
    const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    if (lc > -1 && ld > -1) {
      if (lc > ld) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (lc > -1) {
      s = (s.length - lc - 1 <= 2) ? s.replace(',', '.') : s.replace(/,/g, '');
    } else if (ld > -1) {
      if (s.length - ld - 1 === 3 && s.split('.').length > 1 && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '');
    }
    const n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  function normCur(c) {
    c = (c || '').toUpperCase();
    if (c === '€' || c.startsWith('EUR')) return 'EUR';
    if (c === '$' || c === 'US$' || c === 'USD') return 'USD';
    if (c === '£' || c === 'GBP') return 'GBP';
    return 'EUR';
  }

  function extractAmount(text) {
    const found = [];
    let m;
    RX_AMOUNT.lastIndex = 0;
    while ((m = RX_AMOUNT.exec(text))) {
      const cur = normCur(m[1] || m[4]);
      const val = parseNum(m[2] || m[3]);
      if (!isFinite(val) || val <= 0 || val > 20000) continue;
      const before = text.slice(Math.max(0, m.index - 28), m.index).toLowerCase();
      let score = 0;
      if (/total|importe|amount|cargo|charged|cobrad|pagad|paid|precio|price|a pagar|you paid|has pagado/.test(before)) score += 3;
      if (/total/.test(before)) score += 2;
      if (/subtotal|iva|vat|tax|impuesto|descuento|discount|ahorra|env[ií]o|shipping|antes|was\b/.test(before.slice(-14))) score -= 3;
      found.push({ val, cur, score, eur: Math.round(val * (FX[cur] || 1) * 100) / 100 });
    }
    if (!found.length) return null;
    found.sort((a, b) => b.score - a.score || b.eur - a.eur);
    return found[0];
  }

  function senderName(from) {
    if (!from) return '';
    const m = from.match(/^\s*"?([^"<]+?)"?\s*</);
    if (m && m[1].trim() && !/@/.test(m[1])) return m[1].trim();
    const d = from.match(/@([\w.-]+)/);
    if (d) {
      const parts = d[1].split('.').filter(p => !/^(mail|email|e|info|news|noreply|no-reply|account|accounts|billing|em|send|mg|notifications?)$/i.test(p));
      const core = parts.length > 1 ? parts[parts.length - 2] : parts[0];
      return core ? core.charAt(0).toUpperCase() + core.slice(1) : '';
    }
    return from.trim();
  }

  function cleanMerchant(n) {
    return n.replace(/\b(no-?reply|noreply|equipo de|team|billing|facturaci[oó]n|recibos?|receipts?|pagos?|payments?)\b/gi, '').replace(/\s{2,}/g, ' ').trim() || n;
  }

  function identify(email) {
    const hay = `${email.from || ''} ${email.subject || ''}`;
    for (const c of CATALOG) if (c.re.test(hay)) return c;
    const body = (email.body || '').slice(0, 600);
    for (const c of CATALOG) if (c.rec && c.re.test(body)) return c;
    return null;
  }

  function guessCat(text) {
    const t = text.toLowerCase();
    if (/restaurante|pizza|burger|sushi|comida|food|delivery/.test(t)) return 'comida';
    if (/taxi|viaje|trip|ride|renfe|vueling|ryanair|iberia|gasolin|parking|aparcamiento/.test(t)) return 'transporte';
    if (/luz|electricidad|gas natural|agua|seguro|alquiler|comunidad/.test(t)) return 'hogar';
    if (/fibra|m[oó]vil|internet|telefon/.test(t)) return 'telecom';
    if (/software|app|licencia|license|saas|cloud|hosting|dominio|domain/.test(t)) return 'software';
    if (/curso|course|academy|formaci/.test(t)) return 'formacion';
    if (/pedido|order|compra|purchase|tienda|shop/.test(t)) return 'compras';
    return 'otros';
  }

  /** Convierte un correo en un cargo (o null si no es un gasto). */
  function toCharge(email) {
    const subject = email.subject || '';
    const body = (email.body || '').replace(/\s+/g, ' ');
    const text = `${subject} . ${body}`;
    if (RX_REFUND.test(subject)) return null;
    if (!RX_RECEIPT.test(text)) return null;
    if (RX_MARKETING.test(text) && !/recibo|factura|receipt|invoice|cargo|charged/i.test(text)) return null;
    const svc = identify(email);
    const date = new Date(email.date);
    if (isNaN(date)) return null;
    const merchant = svc && svc.id !== 'gym' ? svc.name : cleanMerchant(senderName(email.from)) || (svc && svc.name);
    // Inicio de prueba gratuita sin cargo: se registra como aviso, no como gasto
    if (RX_TRIAL.test(text) && /(?:hoy|today|ahora)[^.]{0,20}\b0[.,]00\b|\b0[.,]00\s?€/i.test(text)) {
      return { trialOnly: true, key: svc ? svc.id : merchant.toLowerCase().replace(/[^a-z0-9]+/g, '-'), merchant, date };
    }
    const amt = extractAmount(text);
    if (!amt) return null;
    const cat = (email.cat && CATS[email.cat]) ? email.cat : (svc ? svc.cat : guessCat(text));
    const recurringHint = (svc && svc.rec) || RX_RECUR.test(text);
    let cycleHint = null;
    if (/anual|annual|yearly|al año|per year|\/año|\/year/i.test(text)) cycleHint = 'yearly';
    else if (/semanal|weekly/i.test(text)) cycleHint = 'weekly';
    else if (/trimestral|quarterly/i.test(text)) cycleHint = 'quarterly';
    else if (/mensual|monthly|al mes|per month|\/mes|\/month/i.test(text)) cycleHint = 'monthly';
    return {
      id: email.id || (merchant + date.getTime()),
      merchant, key: (svc ? svc.id : merchant.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
      svc: svc ? svc.id : null, cat, date, amount: amt.eur, original: amt.val, currency: amt.cur,
      recurringHint, cycleHint, trial: RX_TRIAL.test(text),
      subject, source: email.source || 'correo', account: email.account || ''
    };
  }

  /** ¿Parece un recibo aunque las reglas no sepan leerlo? (candidato para la IA) */
  function maybeReceipt(email) {
    const text = `${email.subject || ''} . ${(email.body || '').replace(/\s+/g, ' ')}`;
    if (RX_REFUND.test(email.subject || '')) return false;
    if (!RX_RECEIPT.test(text)) return false;
    if (RX_MARKETING.test(text) && !/recibo|factura|receipt|invoice|cargo|charged/i.test(text)) return false;
    return !toCharge(email);
  }

  function addCycle(d, cycle, n = 1) {
    const r = new Date(d);
    if (cycle === 'monthly') r.setMonth(r.getMonth() + n);
    else if (cycle === 'bimonthly') r.setMonth(r.getMonth() + 2 * n);
    else if (cycle === 'quarterly') r.setMonth(r.getMonth() + 3 * n);
    else if (cycle === 'yearly') r.setFullYear(r.getFullYear() + n);
    else r.setDate(r.getDate() + 7 * n);
    return r;
  }

  const DAY = 864e5;
  const median = a => { const s = [...a].sort((x, y) => x - y); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

  function detectCycle(dates) {
    if (dates.length < 2) return null;
    const gaps = [];
    for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i - 1]) / DAY);
    const g = median(gaps);
    if (g >= 5 && g <= 9) return 'weekly';
    if (g >= 25 && g <= 36) return 'monthly';
    if (g >= 54 && g <= 66) return 'bimonthly';
    if (g >= 84 && g <= 96) return 'quarterly';
    if (g >= 340 && g <= 390) return 'yearly';
    return null;
  }

  /** Análisis completo. prefs = { usage: {key: 'si'|'no'|'aveces'}, cancelled: {key:true} } */
  function analyze(emails, prefs = {}, now = new Date()) {
    const usage = prefs.usage || {}, cancelled = prefs.cancelled || {};
    // 1. Correos -> cargos (sin duplicar el mismo correo)
    const seen = new Set();
    const charges = [], trials = {};
    for (const e of emails) {
      const sig = (e.id || '') + '|' + (e.subject || '') + '|' + e.date;
      if (seen.has(sig)) continue; seen.add(sig);
      const c = toCharge(e);
      if (c && c.trialOnly) trials[c.key] = c.date;
      else if (c) charges.push(c);
    }
    charges.sort((a, b) => a.date - b.date);

    // 2. Agrupar por comercio
    const groups = {};
    for (const c of charges) (groups[c.key] = groups[c.key] || []).push(c);

    const subs = [], oneoffs = [], leaks = [];
    const svcById = Object.fromEntries(CATALOG.map(c => [c.id, c]));

    for (const key in groups) {
      if (prefs.ignored && prefs.ignored[key]) continue;
      const g = groups[key];
      const first = g[0], last = g[g.length - 1];
      const svc = first.svc ? svcById[first.svc] : null;
      // Eliminar cargos duplicados (mismo importe en <4 días) pero registrarlos como brecha
      const clean = [];
      for (const c of g) {
        const prev = clean[clean.length - 1];
        if (prev && Math.abs(c.date - prev.date) < 4 * DAY && Math.abs(c.amount - prev.amount) < 0.01 && (first.recurringHint)) {
          leaks.push({ type: 'duplicado', sev: 3, key, merchant: c.merchant,
            title: `Cobro duplicado en ${c.merchant}`,
            detail: `Se cobraron ${fmt(c.amount)} dos veces (${fmtDate(prev.date)} y ${fmtDate(c.date)}). Pide la devolución al servicio.`,
            saving: 0, oneTime: c.amount });
          continue;
        }
        clean.push(c);
      }
      const dates = clean.map(c => c.date);
      const amounts = clean.map(c => c.amount);
      let cycle = detectCycle(dates);
      const similar = amounts.length > 1 && (Math.max(...amounts) - Math.min(...amounts)) / Math.max(...amounts) < 0.2;
      const hinted = g.some(c => c.recurringHint);
      const isRec = (hinted && (svc ? svc.rec !== false : true)) || (cycle && similar && clean.length >= 3);
      if (!isRec) { oneoffs.push(...clean); continue; }
      if (!cycle) cycle = g.find(c => c.cycleHint)?.cycleHint || (svc && svc.cycle) || 'monthly';
      const lastC = clean[clean.length - 1];
      let next = addCycle(lastC.date, cycle);
      const overdue = (now - lastC.date) / DAY > CYCLE[cycle].days * 1.6;
      let k = 1; while (next < now && k < 60) { next = addCycle(lastC.date, cycle, ++k); }
      const prevC = clean.length > 1 ? clean[clean.length - 2] : null;
      // Facturas variables (luz, agua...): se usa la media y no se marca subida
      const variable = lastC.cat === 'hogar' || new Set(amounts.map(a => a.toFixed(2))).size >= 3;
      let priceUp = null;
      if (!variable && prevC) {
        let j = clean.length - 2;
        while (j >= 0 && Math.abs(clean[j].amount - lastC.amount) < 0.01) j--;
        if (j >= 0 && lastC.amount > clean[j].amount * 1.03 && (now - clean[j + 1].date) / DAY < 200)
          priceUp = { from: clean[j].amount, to: lastC.amount, date: clean[j + 1].date };
      }
      const trial = g.some(c => c.trial) || !!trials[key];
      const recent = clean.slice(-3).map(c => c.amount);
      const ref = variable ? recent.reduce((a, b) => a + b, 0) / recent.length : lastC.amount;
      const s = {
        key, merchant: lastC.merchant, svc: svc ? svc.id : null, cat: lastC.cat, cycle,
        amount: round2(ref), variable, currency: lastC.currency, original: lastC.original,
        monthly: Math.round(ref * CYCLE[cycle].perMonth * 100) / 100,
        first: clean[0].date, last: lastC.date, next, count: clean.length,
        totalPaid: Math.round(amounts.reduce((a, b) => a + b, 0) * 100) / 100,
        priceUp, trial, status: cancelled[key] ? 'cancelada' : (overdue ? 'inactiva' : 'activa'),
        usage: usage[key] || null, history: clean,
        cancel: svc ? svc.cancel : '', alts: svc ? svc.alts : [], account: lastC.account
      };
      subs.push(s);
    }

    const active = subs.filter(s => s.status === 'activa');
    const monthlyRec = round2(active.reduce((a, s) => a + s.monthly, 0));

    // 3. Brechas
    for (const s of active) {
      if (s.priceUp) leaks.push({ type: 'subida', sev: 2, key: s.key, merchant: s.merchant,
        title: `${s.merchant} ha subido de precio`,
        detail: `Pasó de ${fmt(s.priceUp.from)} a ${fmt(s.priceUp.to)} (+${Math.round((s.priceUp.to / s.priceUp.from - 1) * 100)} %) desde el ${fmtDate(s.priceUp.date)}. Revisa si te compensa o si hay un plan más barato.`,
        saving: round2((s.priceUp.to - s.priceUp.from) * CYCLE[s.cycle].perMonth) });
      if (s.trial) leaks.push({ type: 'prueba', sev: 2, key: s.key, merchant: s.merchant,
        title: `La prueba gratuita de ${s.merchant} ya se cobra`,
        detail: `Empezó como prueba y ahora pagas ${fmt(s.amount)} ${CYCLE[s.cycle].label.toLowerCase()}. ¿Lo decidiste tú o se te pasó?`,
        saving: s.monthly });
      if (s.usage === 'no') leaks.push({ type: 'sinuso', sev: 3, key: s.key, merchant: s.merchant,
        title: `Pagas ${s.merchant} y dices que no lo usas`,
        detail: `Cancelarlo te ahorra ${fmt(s.monthly * 12)} al año.`, saving: s.monthly });
      const days = (s.next - now) / DAY;
      if (s.cycle === 'yearly' && days <= 30) leaks.push({ type: 'renovacion', sev: 2, key: s.key, merchant: s.merchant,
        title: `${s.merchant} se renueva en ${Math.max(0, Math.ceil(days))} días`,
        detail: `Cargo anual de ${fmt(s.amount)} el ${fmtDate(s.next)}. Si no lo vas a usar, cancélalo antes.`, saving: 0, oneTime: s.amount });
    }
    // Solapamientos por categoría
    const byCat = {};
    for (const s of active) (byCat[s.cat] = byCat[s.cat] || []).push(s);
    const overlapLimit = { streaming: 2, musica: 1, nube: 1, software: 3 };
    for (const cat in overlapLimit) {
      const list = byCat[cat] || [];
      if (list.length > overlapLimit[cat]) {
        const sorted = [...list].sort((a, b) => b.monthly - a.monthly);
        const saving = round2(sorted.slice(overlapLimit[cat]).reduce((a, s) => a + s.monthly, 0));
        leaks.push({ type: 'solape', sev: 2, key: 'cat-' + cat, merchant: CATS[cat].label,
          title: `${list.length} servicios de ${CATS[cat].label.toLowerCase()} a la vez`,
          detail: `${list.map(s => s.merchant).join(', ')}. Rotarlos (uno cada vez) te ahorraría unos ${fmt(saving)}/mes.`, saving });
      }
    }
    // Gasto hormiga (pedidos/trayectos frecuentes)
    const since = new Date(now - 90 * DAY);
    const recentOne = oneoffs.filter(c => c.date >= since);
    const byMerchant = {};
    for (const c of recentOne) (byMerchant[c.key] = byMerchant[c.key] || []).push(c);
    for (const k in byMerchant) {
      const l = byMerchant[k];
      const perMonth = round2(l.reduce((a, c) => a + c.amount, 0) / 3);
      if (l.length >= 6 && perMonth >= 30 && ['comida', 'transporte', 'compras', 'otros'].includes(l[0].cat)) {
        leaks.push({ type: 'hormiga', sev: l[0].cat === 'compras' ? 1 : 2, key: k, merchant: l[0].merchant,
          title: `Gasto hormiga en ${l[0].merchant}`,
          detail: `${Math.round(l.length / 3)} cargos al mes de media, unos ${fmt(perMonth)}/mes. Reducirlo a la mitad son ${fmt(perMonth * 6)} al año.`,
          saving: round2(perMonth / 2) });
      }
    }
    // Pequeñas que suman
    const small = active.filter(s => s.monthly < 5);
    if (small.length >= 3) leaks.push({ type: 'pequenas', sev: 1, key: 'small', merchant: 'Varias',
      title: `${small.length} suscripciones pequeñas que suman`,
      detail: `${small.map(s => s.merchant).join(', ')}: ${fmt(small.reduce((a, s) => a + s.monthly, 0))}/mes que pasan desapercibidos.`, saving: 0 });

    leaks.sort((a, b) => b.sev - a.sev || (b.saving || 0) - (a.saving || 0));
    // Ahorro potencial (sin contar dos veces el mismo servicio)
    const counted = new Set();
    let potential = 0;
    for (const l of leaks) { if (!l.saving || counted.has(l.key)) continue; counted.add(l.key); potential += l.saving; }
    potential = round2(Math.min(potential, monthlyRec + oneoffMonthly(oneoffs, now)));

    // 4. Tendencia mensual (6 meses)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ y: d.getFullYear(), m: d.getMonth(), partial: i === 0, label: d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''), rec: 0, one: 0 });
    }
    const allCharges = [...subs.flatMap(s => s.history), ...oneoffs];
    for (const c of allCharges) {
      const mo = months.find(x => x.y === c.date.getFullYear() && x.m === c.date.getMonth());
      if (!mo) continue;
      if (oneoffs.includes(c)) mo.one += c.amount; else mo.rec += c.amount;
    }
    months.forEach(m => { m.rec = round2(m.rec); m.one = round2(m.one); m.total = round2(m.rec + m.one); });

    // 5. Por categoría (mensual: recurrente + media de puntuales de 3 meses)
    const catTotals = {};
    for (const s of active) catTotals[s.cat] = (catTotals[s.cat] || 0) + s.monthly;
    for (const c of recentOne) catTotals[c.cat] = (catTotals[c.cat] || 0) + c.amount / 3;
    const categories = Object.entries(catTotals).map(([k, v]) => ({ key: k, label: CATS[k].label, color: CATS[k].color, value: round2(v) }))
      .sort((a, b) => b.value - a.value);

    const oneMonthly = oneoffMonthly(oneoffs, now);
    const monthlyAll = round2(monthlyRec + oneMonthly);
    const score = Math.max(5, Math.min(99, Math.round(100 - (monthlyAll ? potential / monthlyAll * 160 : 0) - leaks.filter(l => l.sev >= 2).length * 2)));

    const upcoming = active.filter(s => (s.next - now) / DAY <= 31).sort((a, b) => a.next - b.next);

    return {
      charges, subs: subs.sort((a, b) => b.monthly - a.monthly), active, oneoffs, leaks, months, categories, upcoming,
      totals: { monthlyRec, yearlyRec: round2(monthlyRec * 12), oneMonthly, monthlyAll, potential, yearlyPotential: round2(potential * 12), score,
        emails: emails.length, found: charges.length },
      tips: buildTips(active, categories, leaks)
    };
  }

  function oneoffMonthly(oneoffs, now) {
    const since = new Date(now - 90 * DAY);
    return round2(oneoffs.filter(c => c.date >= since).reduce((a, c) => a + c.amount, 0) / 3);
  }

  function buildTips(active, categories, leaks) {
    const tips = [];
    const has = cat => active.some(s => s.cat === cat);
    if (active.some(s => s.cycle === 'monthly' && ['software', 'formacion', 'nube'].includes(s.cat)))
      tips.push({ t: 'Pasa a anual lo que usas todo el año', d: 'Las herramientas que usas cada mes suelen costar un 15–20 % menos en pago anual.' });
    if (has('streaming')) tips.push({ t: 'Rota tus plataformas de vídeo', d: 'Mantén solo una activa y cambia cada mes según lo que quieras ver.' });
    if (active.some(s => ['spotify', 'youtube', 'netflix', 'icloud', 'google-one'].includes(s.svc)))
      tips.push({ t: 'Comparte un plan familiar', d: 'Spotify, YouTube, iCloud o Google One cuestan mucho menos repartidos entre 4–6 personas.' });
    if (has('telecom') || has('hogar')) tips.push({ t: 'Revisa luz, fibra y móvil una vez al año', d: 'Son los gastos fijos más grandes y los que más bajan al comparar o llamar para negociar.' });
    if (categories.some(c => c.key === 'comida' && c.value > 40)) tips.push({ t: 'Pon un tope semanal a los pedidos a domicilio', d: 'Los gastos de envío y servicio suelen añadir un 25–30 % al precio de la comida.' });
    tips.push({ t: 'Usa una tarjeta solo para suscripciones', d: 'Una tarjeta virtual o prepago con saldo limitado evita cobros sorpresa y renovaciones olvidadas.' });
    tips.push({ t: 'Calendario antes que fuerza de voluntad', d: 'Activa los avisos 3 días antes de cada cobro y decide con calma si renovar.' });
    return tips.slice(0, 6);
  }

  const round2 = n => Math.round(n * 100) / 100;
  const fmt = n => (n || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  const fmtDate = d => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  /* ---------- Lectura de .eml / .mbox / texto pegado ---------- */
  function decodeQP(s) {
    return s.replace(/=\r?\n/g, '').replace(/(=[0-9A-F]{2})+/gi, m => {
      try { return decodeURIComponent(m.replace(/=/g, '%')); } catch { return m.replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))); }
    });
  }
  function decodeB64(s) {
    try { const bin = atob(s.replace(/\s/g, '')); const bytes = Uint8Array.from(bin, c => c.charCodeAt(0)); return new TextDecoder('utf-8').decode(bytes); } catch { return ''; }
  }
  function decodeHeader(v) {
    return (v || '').replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_, cs, enc, txt) =>
      enc.toUpperCase() === 'B' ? decodeB64(txt) : decodeQP(txt.replace(/_/g, ' '))).replace(/\s+/g, ' ').trim();
  }
  function htmlToText(h) {
    return h.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ').replace(/<br\s*\/?>|<\/p>|<\/tr>|<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&euro;/g, '€').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/[ \t]+/g, ' ');
  }
  function parseHeaders(block) {
    const h = {};
    block.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/).forEach(line => {
      const i = line.indexOf(':'); if (i > 0) h[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
    });
    return h;
  }
  function decodePart(headers, body) {
    const te = (headers['content-transfer-encoding'] || '').toLowerCase();
    let out = te === 'base64' ? decodeB64(body) : te === 'quoted-printable' ? decodeQP(body) : body;
    if (/text\/html/i.test(headers['content-type'] || '')) out = htmlToText(out);
    return out;
  }
  function extractBody(headers, body, depth = 0) {
    const ct = headers['content-type'] || 'text/plain';
    const bm = ct.match(/boundary="?([^";]+)"?/i);
    if (/multipart/i.test(ct) && bm && depth < 5) {
      const parts = body.split('--' + bm[1]).slice(1);
      let plain = '', html = '';
      for (const p of parts) {
        if (p.startsWith('--')) break;
        const sep = p.search(/\r?\n\r?\n/);
        if (sep < 0) continue;
        const ph = parseHeaders(p.slice(0, sep)); const pb = p.slice(sep).replace(/^\r?\n\r?\n/, '');
        const pct = ph['content-type'] || 'text/plain';
        if (/multipart/i.test(pct)) { const t = extractBody(ph, pb, depth + 1); if (t) plain = plain || t; }
        else if (/text\/plain/i.test(pct)) plain += decodePart(ph, pb);
        else if (/text\/html/i.test(pct)) html += decodePart(ph, pb);
      }
      return plain.trim().length > 20 ? plain : html || plain;
    }
    return decodePart(headers, body);
  }
  function parseEml(raw, source = 'archivo') {
    const sep = raw.search(/\r?\n\r?\n/);
    if (sep < 0) return null;
    const h = parseHeaders(raw.slice(0, sep));
    const body = extractBody(h, raw.slice(sep).replace(/^\r?\n\r?\n/, ''));
    if (!h.date && !h.subject) return null;
    return { id: h['message-id'] || null, from: decodeHeader(h.from), subject: decodeHeader(h.subject), date: h.date ? new Date(h.date).toISOString() : new Date().toISOString(), body, source };
  }
  function parseMbox(raw, source = 'archivo') {
    return raw.split(/\r?\n(?=From \S+.*\d{4}\r?\n)/).map(m => parseEml(m.replace(/^From \S+.*\r?\n/, ''), source)).filter(Boolean);
  }
  /** Texto pegado: bloques separados por línea "---" o por cabeceras "De:/From:" */
  function parsePasted(txt, source = 'pegado') {
    const blocks = txt.split(/\n-{3,}\n|\n(?=(?:De|From):\s)/i).map(b => b.trim()).filter(Boolean);
    const out = [];
    for (const b of blocks) {
      const from = (b.match(/^(?:De|From):\s*(.+)$/mi) || [])[1] || '';
      const subject = (b.match(/^(?:Asunto|Subject):\s*(.+)$/mi) || [])[1] || b.split('\n')[0].slice(0, 120);
      const dateS = (b.match(/^(?:Fecha|Date):\s*(.+)$/mi) || [])[1];
      let date = dateS ? parseLooseDate(dateS) : null;
      if (!date) { const dm = b.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/); if (dm) date = new Date(+(dm[3].length === 2 ? '20' + dm[3] : dm[3]), +dm[2] - 1, +dm[1]); }
      out.push({ from: from || subject, subject, date: (date && !isNaN(date) ? date : new Date()).toISOString(), body: b, source });
    }
    return out;
  }
  function parseLooseDate(s) {
    // Formato europeo primero (dd/mm/aaaa)
    const m = s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
    if (m) return new Date(+(m[3].length === 2 ? '20' + m[3] : m[3]), +m[2] - 1, +m[1], 12);
    const d = new Date(s); if (!isNaN(d)) return d;
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const m2 = s.toLowerCase().match(/(\d{1,2}) de (\w{3})\w* de (\d{4})/);
    if (m2 && meses.indexOf(m2[2]) > -1) return new Date(+m2[3], meses.indexOf(m2[2]), +m2[1]);
    return null;
  }

  /* ---------- Bandeja de demostración ---------- */
  function demoInbox(now = new Date(), account = 'demo@horahflow.com') {
    const E = [];
    const mk = (from, subject, d, body) => E.push({ id: 'demo-' + E.length, from, subject, date: d.toISOString(), body, source: 'demo', account });
    const monthsBack = (n, day) => { const d = new Date(now.getFullYear(), now.getMonth() - n, day, 9, 12); return d; };
    const eur = n => n.toFixed(2).replace('.', ',') + ' €';
    for (let i = 6; i >= 0; i--) {
      const take = d => d <= now;
      let d;
      d = monthsBack(i, 5);  if (take(d)) mk('Netflix <info@account.netflix.com>', 'Tu recibo de Netflix', d, `Hola, gracias por tu suscripción. Plan Estándar. Total: ${eur(i >= 3 ? 12.99 : 13.99)} cobrados a tu Visa ···4417.`);
      d = monthsBack(i, 12); if (take(d)) mk('Spotify <no-reply@spotify.com>', 'Tu recibo de Spotify', d, `Spotify Premium Individual. Importe: ${eur(11.99)}. Tu próxima facturación será el mes que viene.`);
      d = monthsBack(i, 18); if (take(d)) mk('Disney+ <disneyplus@mail.disneyplus.com>', 'Confirmación de pago de tu suscripción', d, `Disney+ Estándar mensual. Total: ${eur(9.99)}.`);
      d = monthsBack(i, 22); if (take(d)) mk('Max <max@mail.max.com>', 'Recibo de tu suscripción a Max', d, `HBO Max plan Básico con anuncios. Importe cobrado: ${eur(9.99)}.`);
      d = monthsBack(i, 3);  if (take(d)) mk('Apple <no_reply@email.apple.com>', 'Tu factura de Apple', d, `iCloud+ con 200 GB (mensual). Total ${eur(2.99)}.`);
      d = monthsBack(i, 9);  if (take(d)) mk('OpenAI <noreply@tm.openai.com>', 'Your ChatGPT Plus subscription receipt', d, `ChatGPT Plus Subscription (monthly). Amount paid: $20.00.`);
      d = monthsBack(i, 15); if (take(d)) mk('Adobe <message@adobe.com>', 'Factura de tu plan de Adobe', d, `Plan Creative Cloud Fotografía 20 GB, cuota mensual. Total pagado: ${eur(i >= 4 ? 11.99 : 14.99)}.`);
      d = monthsBack(i, 1);  if (take(d)) mk('Basic-Fit <info@basic-fit.com>', 'Recibo de tu cuota de Basic-Fit', d, `Cuota mensual Comfort. Importe: ${eur(29.99)}. ¡Te esperamos en el club!`);
      d = monthsBack(i, 27); if (take(d)) mk('Movistar <facturas@movistar.es>', 'Tu factura de Movistar ya está disponible', d, `miMovistar Fibra 1Gb + móvil. Importe total de la factura: ${eur(i === 1 ? 72.50 : 68.90)}.`);
      d = monthsBack(i, 20); if (take(d)) mk('Iberdrola <clientes@iberdrola.es>', 'Factura de electricidad', d, `Tu factura de luz del periodo. Total a pagar: ${eur([61.2, 58.4, 49.9, 55.3, 64.8, 70.1, 66.5][i])}. Se cargará en tu cuenta.`);
      d = monthsBack(i, 25); if (take(d)) mk('LinkedIn <billing@linkedin.com>', 'Tu recibo de LinkedIn Premium', d, `LinkedIn Premium Career, suscripción mensual. Total: ${eur(39.99)}.`);
      // Glovo / Uber / Amazon puntuales
      [2, 6, 9, 13, 16, 19, 23, 26, 29].forEach((dd, j) => { const x = monthsBack(i, dd); if (take(x) && (j + i) % 3 !== 0) mk('Glovo <noreply@glovoapp.com>', 'Tu pedido de Glovo ha sido entregado', x, `Gracias por tu pedido. Total pagado: ${eur(14 + ((j * 7 + i * 3) % 17))}.`); });
      [4, 11, 17, 24].forEach((dd, j) => { const x = monthsBack(i, dd); if (take(x)) mk('Uber Receipts <noreply@uber.com>', 'Tu viaje del ' + x.toLocaleDateString('es-ES'), x, `Gracias por viajar con Uber. Total ${eur(8.5 + ((j * 5 + i) % 9))}.`); });
      [8, 21].forEach((dd, j) => { const x = monthsBack(i, dd); if (take(x)) mk('Amazon.es <confirmar-envio@amazon.es>', 'Tu pedido de Amazon.es ha sido enviado', x, `Pedido #40${i}${j}-77. Total del pedido: ${eur(19.9 + ((i * 13 + j * 29) % 60))}.`); });
    }
    // Duplicado de Spotify
    const dup = monthsBack(2, 13); mk('Spotify <no-reply@spotify.com>', 'Tu recibo de Spotify', dup, `Spotify Premium Individual. Importe: ${eur(11.99)}.`);
    // Canva: prueba que pasa a pago
    mk('Canva <no-reply@canva.com>', 'Tu prueba gratuita de Canva Pro ha comenzado', monthsBack(3, 6), 'Disfruta de 30 días de prueba gratuita. Después se cobrará 11,99 € al mes. Importe hoy: 0,00 €');
    [2, 1, 0].forEach(n => { const d = monthsBack(n, 6); if (d <= now) mk('Canva <no-reply@canva.com>', 'Recibo de Canva Pro', d, 'Tu suscripción de Canva Pro se ha renovado. Total: 11,99 €. Fin de la prueba gratuita.'); });
    // Anuales
    const prime = new Date(now); prime.setFullYear(prime.getFullYear() - 1); prime.setDate(prime.getDate() + 12);
    mk('Amazon.es <prime@amazon.es>', 'Confirmación de tu membresía Amazon Prime', prime, 'Gracias por renovar Prime. Cuota anual: 49,90 €.');
    const duo = new Date(now); duo.setFullYear(duo.getFullYear() - 1); duo.setDate(duo.getDate() + 40);
    mk('Duolingo <no-reply@duolingo.com>', 'Recibo de Duolingo Super', duo, 'Suscripción anual a Super Duolingo. Total: 83,99 €.');
    // Marketing (debe ignorarse)
    mk('Zara <news@zara.com>', 'Black Friday: hasta un 50 % de descuento', monthsBack(0, 2), 'No te lo pierdas: ofertas exclusivas desde 9,99 €. Date de baja aquí.');
    return E.filter(e => new Date(e.date) <= now);
  }

  global.HFEngine = { analyze, toCharge, maybeReceipt, parseEml, parseMbox, parsePasted, htmlToText, demoInbox, extractAmount, CATS, CYCLE, CATALOG, fmt, fmtDate };
})(typeof window !== 'undefined' ? window : globalThis);
