/* =========================================================
   HorahFlow · web pública: inicio, demo, precios, blog, acceso
   ========================================================= */
const LOGO = window.HF_LOGO, LOGO_FULL = window.HF_LOGO_FULL;
let billingYear = false;

function navHTML() {
  const logged = !!Auth.user && !Auth.user.demo;
  return `<header class="nav" id="nav"><div class="wrap">
    <a href="#inicio" class="logo"><img src="${LOGO}" alt="HorahFlow"></a>
    <nav class="links">
      <a href="#como-funciona">Cómo funciona</a><a href="#demo">Demo</a><a href="#precios">Precios</a><a href="#blog">Blog</a>
    </nav>
    <div class="right">
      ${logged ? `<a class="btn btn-dark btn-sm" href="#app">Ir a mi panel</a>` :
      `<a class="btn btn-ghost btn-sm" href="#entrar">Entrar</a><a class="btn btn-dark btn-sm" href="#registro">Empezar gratis</a>`}
      <button class="burger" id="burger" aria-label="Menú">${I.menu}</button>
    </div></div></header>`;
}

function footerHTML() {
  return `<footer class="foot"><div class="wrap">
    <div><img src="${LOGO}" alt="HorahFlow" style="height:26px;margin-bottom:14px"><p style="max-width:300px">Encuentra las fugas de dinero que no ves. Suscripciones, cobros recurrentes y gasto hormiga, en un solo panel.</p></div>
    <div><h4>Producto</h4><a href="#como-funciona">Cómo funciona</a><a href="#demo">Demo</a><a href="#precios">Precios</a><a href="#registro">Crear cuenta</a></div>
    <div><h4>Recursos</h4><a href="#blog">Blog</a>${POSTS.slice(0, 2).map(p => `<a href="#blog-${p.slug}">${esc(p.short)}</a>`).join('')}</div>
    <div><h4>Legal</h4><a href="#privacidad">Privacidad</a><a href="#terminos">Términos</a><a href="mailto:hola@horahflow.com">hola@horahflow.com</a></div>
    <div class="legal"><span>© ${new Date().getFullYear()} HorahFlow · horahflow.com</span><span>Hecho en España</span></div>
  </div></footer>`;
}

function bindNav() {
  const nav = $('#nav'); if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#burger')?.addEventListener('click', () => nav.classList.toggle('open'));
  $$('.links a', nav).forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
}

/* ---------- Inicio ---------- */
function renderLanding(scrollTo) {
  const demo = E.analyze(E.demoInbox());
  const t = demo.totals;
  const topSubs = demo.subs.slice(0, 4);
  root.innerHTML = navHTML() + `
  <main>
  <section class="hero"><div class="wrap grid">
    <div class="fade-in">
      <span class="eyebrow"><i></i>Tu correo ya sabe en qué gastas</span>
      <h1 class="display">Descubre <em>a dónde se va</em> tu dinero sin darte cuenta.</h1>
      <p class="lead">HorahFlow lee los recibos de tu correo, detecta cada suscripción y cobro recurrente, y te dice dónde están tus fugas de dinero y cómo cerrarlas.</p>
      <div class="ctas">
        <a class="btn btn-dark" href="#registro">Empezar gratis ${I.arrow}</a>
        <a class="btn btn-ghost" href="#demo">Ver la demo</a>
      </div>
      <div class="proof"><span>${I.shield} Solo lectura</span><span>${I.zap} Resultados en 1 minuto</span><span>${I.check} Sin tarjeta</span></div>
    </div>
    <div class="mock fade-in" style="animation-delay:.1s">
      <div class="bar"><i></i><i></i><i></i></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px">
        <div><div class="hint" style="font-weight:700">Pagas cada mes en suscripciones</div><div style="font-size:40px;font-weight:800;letter-spacing:-.03em" class="num">${fmt(t.monthlyRec)}</div></div>
        <span class="chip green">${fmt0(t.yearlyPotential)}/año recuperables</span>
      </div>
      ${topSubs.map(s => `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line)">
        ${logoSq(s.merchant, 32)}<div style="flex:1"><b style="font-size:14px">${esc(s.merchant)}</b><div class="hint">${E.CYCLE[s.cycle].label} · próximo ${fmtDate(s.next)}</div></div>
        <b class="num">${fmt(s.amount)}</b></div>`).join('')}
      <div class="float a"><span class="dot red">${I.alert}</span><div><b>Cobro duplicado</b><div class="hint">Spotify te cobró dos veces</div></div></div>
      <div class="float b"><span class="dot green">${I.up}</span><div><b>Salud financiera</b><div class="hint">Puedes mejorar tu nota a 80+</div></div></div>
    </div>
  </div></section>

  <div class="strip"><div class="wrap">
    <span>Detecta <b>+45 servicios</b> conocidos</span><span>Lee recibos en <b>español e inglés</b></span><span>Convierte <b>USD y GBP</b> a euros</span><span>Tus correos se leen <b>en tu navegador</b></span>
  </div></div>

  <section class="block" id="como-funciona-sec"><div class="wrap">
    <div class="sec-head"><span class="kicker">Cómo funciona</span><h2 class="title">Tres pasos. Ninguna hoja de cálculo.</h2><p class="sub">No tienes que apuntar nada. Todo lo que pagas online deja un recibo en tu correo: HorahFlow los encuentra y los ordena por ti.</p></div>
    <div class="steps">
      <div class="step"><div class="n">01</div><h3>Conecta tu correo</h3><p>Gmail con un clic y permiso de solo lectura, o sube un archivo exportado. Nunca te pedimos la contraseña del banco.</p></div>
      <div class="step"><div class="n">02</div><h3>Analizamos tus recibos</h3><p>Filtramos solo facturas, recibos y renovaciones. Detectamos importe, fecha, frecuencia y categoría de cada cobro.</p></div>
      <div class="step"><div class="n">03</div><h3>Cierra las fugas</h3><p>Ves cuánto pagas, cuándo te lo cobran y qué puedes cancelar, compartir o cambiar por una alternativa gratuita.</p></div>
    </div>
  </div></section>

  <section class="block alt"><div class="wrap">
    <div class="sec-head"><span class="kicker">Lo que encuentra</span><h2 class="title">Las brechas por las que se escapa tu dinero.</h2></div>
    <div class="features">
      ${[
        ['red', I.repeat, 'Suscripciones olvidadas', 'Todo lo que se renueva solo: mensual, anual o semanal, con su próximo cobro.'],
        ['amber', I.up, 'Subidas de precio', 'Te avisa cuando un servicio te cobra más que el mes anterior, aunque nadie te lo dijera.'],
        ['red', I.alert, 'Cobros duplicados', 'Dos cargos iguales en pocos días. Te decimos a quién reclamar la devolución.'],
        ['amber', I.clock, 'Pruebas que pasan a pago', 'Las pruebas gratuitas que acabaron cobrándose sin que lo decidieras.'],
        ['gray', I.list, 'Servicios que se solapan', 'Cuatro plataformas de vídeo a la vez, dos nubes, dos apps de música…'],
        ['green', I.leaf, 'Alternativas gratuitas', 'Para cada servicio, opciones gratis o más baratas y el enlace para darte de baja.']
      ].map(([c, i, h, p]) => `<div class="feature"><span class="dot ${c}">${i}</span><h3>${h}</h3><p>${p}</p></div>`).join('')}
    </div>
  </div></section>

  <section class="block" id="demo-sec"><div class="wrap">
    <div class="sec-head center"><span class="kicker">Demo en vivo</span><h2 class="title">Pruébalo con una bandeja de ejemplo.</h2><p class="sub">Así analiza HorahFlow un correo real de 6 meses. Pulsa el botón y mira qué encuentra.</p></div>
    <div class="demo">
      <div class="inbox"><div class="inbox-head"><span>Bandeja de entrada</span><span class="hint" id="demo-count"></span></div><div class="inbox-list" id="demo-inbox"></div></div>
      <div class="demo-out" id="demo-out">
        <div class="demo-empty" id="demo-empty">
          <span class="dot green" style="width:52px;height:52px;border-radius:16px">${I.spark}</span>
          <h3 style="color:var(--ink);font-size:20px">Analiza la bandeja de ejemplo</h3>
          <p style="max-width:340px">Leeremos cada correo, separaremos los recibos de la publicidad y calcularemos tus fugas.</p>
          <button class="btn btn-green" id="demo-run">${I.spark} Analizar ahora</button>
          <div class="progress hidden" id="demo-prog"><i></i></div>
        </div>
      </div>
    </div>
  </div></section>

  <section class="block alt"><div class="wrap" style="display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center" id="priv-grid">
    <div><span class="kicker">Privacidad primero</span><h2 class="title">¿Por qué el correo y no el banco?</h2>
      <p class="sub" style="margin-bottom:22px">Conectar tu banco exige compartir credenciales con terceros y da acceso a todo tu dinero. Tu correo ya tiene los recibos, y con permiso de solo lectura no se puede mover ni un euro.</p>
      <div style="display:grid;gap:14px">
        ${[['Solo lectura', 'No podemos enviar, borrar ni modificar ningún correo.'],
           ['Solo recibos', 'Buscamos facturas y renovaciones. El resto de tu correo se ignora.'],
           ['Procesado en tu navegador', 'El análisis se hace en tu dispositivo. De cada recibo solo guardamos comercio, importe y fecha.'],
           ['Bórralo cuando quieras', 'Un botón elimina todos tus datos y desconecta tu correo.']]
          .map(([b, p]) => `<div style="display:flex;gap:12px"><span class="dot green" style="width:26px;height:26px;border-radius:8px">${I.check}</span><div><b>${b}</b><div class="hint" style="font-size:15px">${p}</div></div></div>`).join('')}
      </div></div>
    <div class="card" style="padding:28px">
      <div class="hint" style="font-weight:700;margin-bottom:10px">Lo que HorahFlow ve de cada recibo</div>
      <div style="font-family:ui-monospace,Menlo,monospace;font-size:14px;line-height:2;background:var(--soft);border-radius:12px;padding:18px">
        comercio: <b>Netflix</b><br>importe: <b>13,99 €</b><br>fecha: <b>5 nov</b><br>frecuencia: <b>mensual</b><br>categoría: <b>streaming</b>
      </div>
      <p class="hint" style="margin-top:14px;font-size:14px">Nada más. Sin conversaciones, sin contactos, sin adjuntos.</p>
    </div>
  </div></section>

  <section class="block" id="precios-sec"><div class="wrap">
    <div class="sec-head center"><span class="kicker">Precios</span><h2 class="title">Empieza gratis. Paga solo si te ahorra dinero.</h2>
      <div class="toggle" id="bill-toggle"><button data-y="0" class="${billingYear ? '' : 'on'}">Mensual</button><button data-y="1" class="${billingYear ? 'on' : ''}">Anual · −25 %</button></div></div>
    <div class="plans" id="plans">${plansHTML()}</div>
    <p class="hint" style="text-align:center;margin-top:18px">Precios con IVA incluido. Cancela cuando quieras, desde tu panel, en un clic. Predicamos con el ejemplo.</p>
  </div></section>

  <section class="block alt" style="padding-bottom:96px"><div class="wrap">
    <div class="sec-head center"><span class="kicker">Preguntas frecuentes</span><h2 class="title">Lo que suele preguntarse.</h2></div>
    <div class="faq">${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
  </div></section>

  <section style="padding-top:96px"><div class="wrap"><div class="cta-band">
    <div><h2>Lo que no ves, también lo pagas.</h2><p>Conecta tu correo y descubre tus fugas en menos de un minuto.</p></div>
    <a class="btn btn-green" href="#registro">Crear cuenta gratis ${I.arrow}</a>
  </div></div></section>
  </main>` + footerHTML();
  bindNav(); bindDemo(); bindPricing();
  const pg = $('#priv-grid'); if (pg && window.innerWidth < 900) pg.style.gridTemplateColumns = '1fr';
  if (scrollTo) requestAnimationFrame(() => { const el = $('#' + scrollTo); if (el) window.scrollTo({ top: el.offsetTop - 72, behavior: 'instant' in window ? 'auto' : 'auto' }); });
  else window.scrollTo(0, 0);
}

const FAQ = [
  ['¿Necesito dar la contraseña de mi correo?', 'No. Con Gmail usas el inicio de sesión oficial de Google y nos das un permiso de solo lectura que puedes retirar en cualquier momento desde tu cuenta de Google. Si prefieres no conectar nada, puedes subir tus recibos como archivo (.eml o .mbox).'],
  ['¿Qué pasa si pago algo que no me llega por correo?', 'HorahFlow ve lo que deja recibo en tu correo, que es casi todo lo que pagas online y la mayoría de suscripciones. Domiciliaciones que solo aparecen en el banco (alquiler, seguros antiguos) pueden no salir. Puedes subir esos recibos a mano.'],
  ['¿Funciona con Outlook, Hotmail o Yahoo?', 'Hoy conectamos Gmail directamente. Para otros correos puedes exportar tus recibos y subirlos. La conexión directa con Outlook está en camino.'],
  ['¿Puedo cancelar suscripciones desde HorahFlow?', 'Te damos el enlace directo a la página de baja de cada servicio y alternativas gratuitas. La baja la confirmas tú en el servicio, así nadie más toca tus cuentas.'],
  ['¿Para qué sirve el plan Pro?', 'Para quien tiene varios correos (personal, trabajo, el de las compras…) y quiere avisos antes de cada cobro, más historial y exportar sus datos.'],
  ['¿Sirve para empresas o autónomos?', 'Sí. El plan Empresas junta los buzones de un equipo, detecta licencias de software duplicadas entre personas y genera un informe mensual de gastos recurrentes.']
];

function plansHTML() {
  const p = billingYear ? { pro: '2,99', biz: '14,25' } : { pro: '3,99', biz: '18,99' };
  const per = billingYear ? 'al mes, facturado anualmente' : 'al mes';
  const li = arr => arr.map(x => `<li>${I.check}<span>${x}</span></li>`).join('');
  return `
  <div class="plan"><h3>Gratis</h3><p class="desc">Para descubrir tus fugas por primera vez.</p>
    <div class="price">0 €</div><div class="per">para siempre</div>
    <ul>${li(['1 correo conectado', 'Detección de suscripciones y gasto hormiga', 'Calendario de cobros', 'Alternativas gratuitas', '12 meses de historial'])}</ul>
    <a class="btn btn-ghost btn-block" href="#registro">Empezar gratis</a></div>
  <div class="plan pop"><span class="tag">Más elegido</span><h3>Pro</h3><p class="desc">Para controlar todos tus correos y no volver a pagar sin enterarte.</p>
    <div class="price num">${p.pro} €</div><div class="per">${per}</div>
    <ul>${li(['Hasta 5 correos', 'Aviso antes de cada cobro', 'Alerta de subidas de precio y pruebas', '24 meses de historial', 'Exportar a CSV / Excel', 'Asistente Flow sin límites'])}</ul>
    <button class="btn btn-dark btn-block" data-buy="pro">Probar Pro</button></div>
  <div class="plan"><h3>Empresas</h3><p class="desc">Para autónomos y equipos que pagan software en varios sitios.</p>
    <div class="price num">${p.biz} €</div><div class="per">${per} · hasta 25 buzones</div>
    <ul>${li(['Buzones del equipo en un panel', 'Licencias duplicadas entre personas', 'Centros de coste por categoría', 'Informe mensual de recurrentes', '36 meses de historial'])}</ul>
    <button class="btn btn-ghost btn-block" data-buy="business">Elegir Empresas</button></div>`;
}
function bindPricing() {
  $('#bill-toggle')?.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    billingYear = b.dataset.y === '1';
    $$('#bill-toggle button').forEach(x => x.classList.toggle('on', x === b));
    $('#plans').innerHTML = plansHTML();
  });
}
function onBuyClick(e) {
  const b = e.target.closest('[data-buy]'); if (!b) return;
  const plan = b.dataset.buy;
  if (!Auth.user || Auth.user.demo) { sessionStorageSafe('hf:wantPlan', plan); location.hash = 'registro'; return; }
  checkout(plan);
}
function sessionStorageSafe(k, v) { try { sessionStorage.setItem(k, v); } catch { window['_' + k] = v; } }
function sessionGet(k) { try { const v = sessionStorage.getItem(k); sessionStorage.removeItem(k); return v; } catch { const v = window['_' + k]; window['_' + k] = null; return v; } }

function checkout(plan) {
  const L = CFG.stripe;
  const link = plan === 'pro' ? (billingYear ? L.proYear || L.pro : L.pro) : (billingYear ? L.businessYear || L.business : L.business);
  if (link) {
    const sep = link.includes('?') ? '&' : '?';
    const url = link + sep + 'prefilled_email=' + encodeURIComponent(Auth.user.email) + (Auth.user.id ? '&client_reference_id=' + encodeURIComponent(Auth.user.id) : '');
    modal(`<h2>Pasar a ${PLANS[plan].name}</h2><p class="hint" style="font-size:15px;margin:8px 0 20px">El pago lo gestiona Stripe de forma segura. Al terminar volverás a HorahFlow y tu plan se activará automáticamente. Puedes cancelar cuando quieras.</p>
      <a class="btn btn-dark btn-block" href="${esc(url)}">Continuar al pago seguro ${I.arrow}</a>`);
    return;
  }
  if (Auth.user.cloud) {
    modal(`<h2>${PLANS[plan].name} llega muy pronto</h2><p class="hint" style="font-size:15px;margin:8px 0 18px">Estamos terminando de activar los pagos. Mientras tanto, todo el plan Gratis está disponible. Te avisaremos por correo en cuanto puedas pasarte a ${PLANS[plan].name}.</p><button class="btn btn-dark btn-block" data-close>Entendido</button>`);
    return;
  }
  modal(`<h2>Activar ${PLANS[plan].name}</h2>
    <p class="hint" style="font-size:15px;margin:8px 0 18px">Los pagos todavía no están conectados. Puedes activar ${PLANS[plan].name} en <b>modo prueba</b> para usar todas sus funciones ahora mismo, sin coste.</p>
    <button class="btn btn-dark btn-block" id="activate">Activar ${PLANS[plan].name} en modo prueba</button>`, (bg, close) => {
    $('#activate', bg).onclick = () => { Auth.update({ plan, planTest: true }); close(); toast(`Plan ${PLANS[plan].name} activado (modo prueba)`); if (location.hash.startsWith('#app')) route(); else location.hash = 'app'; };
  });
}

/* ---------- Demo interactiva ---------- */
function bindDemo() {
  const inbox = E.demoInbox().sort((a, b) => new Date(b.date) - new Date(a.date));
  const show = inbox.slice(0, 40);
  $('#demo-count').textContent = `${inbox.length} correos`;
  $('#demo-inbox').innerHTML = show.map((m, i) => {
    const name = m.from.split('<')[0].trim();
    return `<div class="mail" data-i="${i}"><span class="av">${esc(name.charAt(0))}</span><div class="meta"><div class="from"><span>${esc(name)}</span><small>${fmtDate(m.date)}</small></div><div class="subj">${esc(m.subject)}</div></div></div>`;
  }).join('');
  $('#demo-run').onclick = async () => {
    $('#demo-run').classList.add('hidden'); const prog = $('#demo-prog'); prog.classList.remove('hidden');
    const rows = $$('#demo-inbox .mail'); const list = $('#demo-inbox');
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]; r.classList.add('scan');
      list.scrollTop = Math.max(0, r.offsetTop - list.offsetTop - 120);
      await new Promise(res => setTimeout(res, 45));
      r.classList.remove('scan'); r.classList.add(E.toCharge(show[i]) ? 'hit' : 'skip');
      $('i', prog).style.width = Math.round((i + 1) / rows.length * 100) + '%';
    }
    renderDemoResult(E.analyze(inbox));
  };
}
function renderDemoResult(a) {
  const t = a.totals;
  $('#demo-out').innerHTML = `<div class="fade-in">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;gap:10px;flex-wrap:wrap"><h3 style="font-size:20px;letter-spacing:-.02em">Resultado del análisis</h3><span class="chip green">${t.found} recibos encontrados</span></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
      <div class="card" style="padding:16px"><div class="hint" style="font-weight:700">Suscripciones</div><div style="font-size:24px;font-weight:800" class="num">${a.active.length}</div></div>
      <div class="card" style="padding:16px"><div class="hint" style="font-weight:700">Recurrente / mes</div><div style="font-size:24px;font-weight:800" class="num">${fmt0(t.monthlyRec)}</div></div>
      <div class="card" style="padding:16px;background:var(--ink);color:#fff;border-color:var(--ink)"><div style="font-weight:700;font-size:13px;color:#B9B6C9">Ahorro posible / año</div><div style="font-size:24px;font-weight:800;color:#7FE09A" class="num">${fmt0(t.yearlyPotential)}</div></div>
    </div>
    <div class="hint" style="font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:12px;margin-bottom:8px">Brechas detectadas</div>
    ${a.leaks.slice(0, 4).map(leakHTML).join('')}
    <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap"><button class="btn btn-dark" id="open-demo">Abrir la demo completa ${I.arrow}</button><a class="btn btn-ghost" href="#registro">Analizar mi correo</a></div>
  </div>`;
  $('#open-demo').onclick = () => { Auth.demo(); location.hash = 'app'; };
}
function leakHTML(l) {
  const c = l.sev >= 3 ? 'red' : l.sev === 2 ? 'amber' : 'gray';
  const ic = { duplicado: I.alert, subida: I.up, prueba: I.clock, solape: I.list, hormiga: I.receipt, renovacion: I.cal, sinuso: I.x, pequenas: I.repeat }[l.type] || I.alert;
  const save = l.saving ? `${fmt(l.saving)}/mes` : l.oneTime ? `${fmt(l.oneTime)}` : '';
  return `<div class="leak"><span class="dot ${c}">${ic}</span><div class="txt"><b>${esc(l.title)}</b><p>${esc(l.detail)}</p></div>${save ? `<span class="save num">${save}</span>` : ''}</div>`;
}

/* ---------- Blog ---------- */
const POSTS = [
  { slug: 'fuga-silenciosa', short: 'La fuga silenciosa', cat: 'Suscripciones', date: '2026-11-04', read: 5, color: 'linear-gradient(135deg,#3D3A4F,#16151F)', mark: '€/mes',
    title: 'La fuga silenciosa: por qué no sabes cuánto pagas en suscripciones',
    excerpt: 'Cada suscripción parece pequeña. El problema no es el precio de una, es que nadie suma todas.',
    body: `<p>Abre tu banco e intenta responder sin mirar: ¿cuántas suscripciones pagas ahora mismo? ¿Qué día se cobra cada una? ¿Cuánto suman al año? Casi nadie lo sabe a la primera, y no es un problema de disciplina. Es un problema de diseño.</p>
<h2>Están diseñadas para no notarse</h2>
<p>Las suscripciones se cobran solas, en días distintos, con importes pequeños y redondeados hacia abajo: 9,99, 4,99, 2,99. Cada una por separado no duele. Además, muchas empiezan con una prueba gratuita que se convierte en pago justo el día que ya no te acuerdas de ella.</p>
<blockquote>Una suscripción de 9,99 € no parece un gasto. Diez de ellas son 1.200 € al año.</blockquote>
<h2>Lo que de verdad cuesta</h2>
<p>El coste real no está en una sola cuota, sino en tres cosas que se acumulan sin que las veas:</p>
<ul><li><b>Las que ya no usas.</b> Te diste de alta para una serie, un proyecto o un viaje, y siguen cobrándose meses después.</li>
<li><b>Las que suben de precio.</b> Los servicios actualizan tarifas con un correo que nadie lee. Pagas un euro más cada mes y no lo notas.</li>
<li><b>Las que se solapan.</b> Tres plataformas de vídeo, dos nubes de fotos, dos apps de música. Pagas por tener opciones que no usas a la vez.</li></ul>
<h2>Cómo verlo todo de una vez</h2>
<p>La buena noticia es que cada cobro online deja rastro: un recibo en tu correo. Ahí está el comercio, el importe, la fecha y muchas veces la frecuencia. Si los juntas, aparece la foto completa.</p>
<p>Eso es exactamente lo que hace HorahFlow: busca esos recibos, agrupa los cobros por servicio, calcula cuándo será el siguiente y te señala los que suben, se duplican o se solapan. No tienes que apuntar nada.</p>
<p>Haz la prueba: dedica cinco minutos a mirar tus suscripciones. Lo más probable es que encuentres al menos una que ya no necesitas.</p>` },
  { slug: 'correo-no-banco', short: 'Por qué el correo y no el banco', cat: 'Privacidad', date: '2026-10-28', read: 4, color: 'linear-gradient(135deg,#4A6B60,#5CC57A)', mark: '@',
    title: 'Por qué HorahFlow lee tu correo y no tu banco',
    excerpt: 'Conectar el banco parece la opción obvia. Te explicamos por qué decidimos lo contrario.',
    body: `<p>La primera idea de HorahFlow fue conectarse al banco. Es lo que hacen muchas apps de finanzas: das acceso a tu cuenta y la app lee los movimientos. Lo descartamos, y queremos contarte por qué.</p>
<h2>El banco lo tiene todo, y ese es el problema</h2>
<p>Para leer tus movimientos, una app necesita un acceso a tu cuenta a través de un intermediario financiero. Ese acceso ve tu saldo, tus nóminas, tus transferencias y todo tu historial. Aunque sea seguro sobre el papel, es mucha confianza para responder una pregunta sencilla: ¿en qué suscripciones se me va el dinero?</p>
<h2>El correo tiene justo lo que hace falta</h2>
<p>Cada servicio te envía un recibo cuando te cobra. Ese recibo dice quién, cuánto y cuándo. Es la información exacta que necesitamos, y nada más.</p>
<ul><li><b>Solo lectura.</b> El permiso que pedimos a Google no permite enviar, borrar ni cambiar nada.</li>
<li><b>Solo recibos.</b> Buscamos facturas, renovaciones y pedidos. El resto de tus correos se ignora.</li>
<li><b>En tu navegador.</b> El análisis se hace en tu dispositivo. Tus correos no se guardan en nuestros servidores.</li>
<li><b>Revocable.</b> Puedes retirar el permiso desde tu cuenta de Google cuando quieras.</li></ul>
<blockquote>No necesitamos ver tu saldo para decirte que pagas Netflix dos veces.</blockquote>
<h2>¿Y lo que no llega por correo?</h2>
<p>Es la parte honesta: algunas domiciliaciones antiguas, como un seguro o el alquiler, puede que no te envíen recibo. Para esos casos puedes subir el recibo a mano. Pero las suscripciones digitales, que son las que más se olvidan, casi siempre dejan rastro en tu bandeja.</p>` },
  { slug: 'alternativas-gratis', short: 'Alternativas gratuitas', cat: 'Ahorro', date: '2026-10-15', read: 6, color: 'linear-gradient(135deg,#16151F,#4A6B60)', mark: '0 €',
    title: 'Alternativas gratuitas a suscripciones que pagas por inercia',
    excerpt: 'No se trata de renunciar a todo, sino de pagar solo por lo que de verdad usas.',
    body: `<p>Ahorrar en suscripciones no significa quedarse sin nada. Muchas veces existe una versión gratuita, pública o compartida que cubre lo que necesitas. Estas son las que más vemos en los análisis de HorahFlow.</p>
<h2>Libros y audiolibros</h2>
<p><b>eBiblio</b> es el servicio de préstamo digital de las bibliotecas públicas en España. Con tu carnet de biblioteca puedes leer ebooks y escuchar audiolibros gratis. Antes de pagar una suscripción de lectura, merece la pena probarlo.</p>
<h2>Cine y series</h2>
<p><b>RTVE Play</b> tiene un catálogo gratuito de series, cine y documentales. Muchas bibliotecas ofrecen también <b>eFilm</b>, cine en streaming con el carnet. Y si tienes varias plataformas, la estrategia que más ahorra es rotarlas: una activa cada mes.</p>
<h2>Diseño, foto y vídeo</h2>
<ul><li><b>Photopea</b>: un editor tipo Photoshop que funciona gratis en el navegador.</li>
<li><b>GIMP e Inkscape</b>: software libre para fotografía y gráficos vectoriales.</li>
<li><b>DaVinci Resolve</b>: edición de vídeo profesional con versión gratuita.</li>
<li><b>Canva</b> gratuito: cubre la mayoría de usos personales.</li></ul>
<h2>Ofimática y nube</h2>
<p><b>LibreOffice</b> y <b>Google Docs</b> sustituyen a la suite de pago para la mayoría de personas. En almacenamiento, antes de ampliar tu plan, limpia adjuntos y fotos duplicadas: a menudo es suficiente.</p>
<blockquote>La mejor alternativa a veces no es otra app, sino compartir un plan familiar.</blockquote>
<h2>Compartir también es ahorrar</h2>
<p>Música, vídeo y almacenamiento tienen planes familiares que, repartidos, cuestan una fracción del individual. HorahFlow te marca qué servicios tienen esa opción y cuánto ahorrarías.</p>` }
];

function renderBlog() {
  root.innerHTML = navHTML() + `<main><section class="block" style="padding-top:64px"><div class="wrap">
    <div class="sec-head"><span class="kicker">Blog</span><h2 class="title">Ideas para que tu dinero no se escape.</h2><p class="sub">Suscripciones, privacidad y ahorro sin hojas de cálculo.</p></div>
    <div class="blog-grid">${POSTS.map(p => `<a class="post-card" href="#blog-${p.slug}">
      <div class="post-cover" style="background:${p.color}">${esc(p.mark)}</div>
      <div class="body"><span class="cat">${p.cat}</span><h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p><span class="date">${new Date(p.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} · ${p.read} min</span></div></a>`).join('')}</div>
  </div></section></main>` + footerHTML();
  bindNav(); window.scrollTo(0, 0);
}
function renderPost(slug) {
  const p = POSTS.find(x => x.slug === slug); if (!p) return renderBlog();
  const others = POSTS.filter(x => x !== p);
  root.innerHTML = navHTML() + `<main><article class="article">
    <a class="back" href="#blog">← Blog</a>
    <h1>${esc(p.title)}</h1><div class="meta">${p.cat} · ${new Date(p.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} · ${p.read} min de lectura</div>
    <div class="content">${p.body}</div>
    <div class="cta-band" style="margin-top:48px;padding:36px"><div><h2 style="font-size:26px">¿Cuánto se te escapa a ti?</h2><p>Conecta tu correo y lo sabrás en un minuto.</p></div><a class="btn btn-green" href="#registro">Empezar gratis</a></div>
    <h3 style="margin:56px 0 16px">Sigue leyendo</h3>
    <div style="display:grid;gap:12px">${others.map(o => `<a href="#blog-${o.slug}" class="card" style="display:block"><b>${esc(o.title)}</b><div class="hint">${esc(o.excerpt)}</div></a>`).join('')}</div>
  </article></main>` + footerHTML();
  bindNav(); window.scrollTo(0, 0);
}

/* ---------- Acceso ---------- */
function renderAuth(mode) {
  const reg = mode === 'registro';
  root.innerHTML = `<div class="auth">
    <div class="side"><a href="#inicio"><img src="${LOGO}" alt="HorahFlow" style="height:30px;width:auto"></a>
      <blockquote>“Pagaba 11 suscripciones. Creía que eran 5.”<div class="hint" style="font-size:15px;font-weight:600;margin-top:14px;letter-spacing:0">Lo que descubre casi todo el mundo la primera vez.</div></blockquote>
      <div style="display:grid;gap:10px;color:var(--muted);font-weight:600;font-size:14px"><span style="display:flex;gap:8px;align-items:center">${I.shield} Acceso de solo lectura</span><span style="display:flex;gap:8px;align-items:center">${I.check} Sin datos bancarios</span></div>
    </div>
    <div class="form-wrap"><form id="auth-form" novalidate>
      <a href="#inicio" class="hidden-d" style="display:block;margin-bottom:28px"><img src="${LOGO}" alt="HorahFlow" style="height:26px;width:auto"></a>
      <h1>${reg ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h1>
      <p class="hint" style="font-size:15px;margin-bottom:26px">${reg ? 'Gratis. Sin tarjeta. En 30 segundos.' : 'Entra para ver tus gastos.'}</p>
      ${reg ? `<div class="field"><label for="f-name">Nombre</label><input class="input" id="f-name" autocomplete="name" placeholder="Tu nombre"></div>` : ''}
      <div class="field"><label for="f-email">Correo electrónico</label><input class="input" id="f-email" type="email" autocomplete="email" placeholder="tu@correo.com"></div>
      <div class="field"><label for="f-pass">Contraseña</label><input class="input" id="f-pass" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" placeholder="${reg ? 'Mínimo 8 caracteres' : '••••••••'}"></div>
      <div class="err" id="f-err"></div>
      <button class="btn btn-dark btn-block" type="submit" id="f-btn">${reg ? 'Crear cuenta' : 'Entrar'}</button>
      ${!reg ? '<p style="margin-top:12px;font-size:14px"><button type="button" class="link" id="f-forgot">¿Has olvidado tu contraseña?</button></p>' : ''}
      ${reg ? `<p class="hint" style="margin-top:12px">Al crear la cuenta aceptas los <a class="link" href="#terminos">términos</a> y la <a class="link" href="#privacidad">política de privacidad</a>.</p>` : ''}
      <div class="divider">o</div>
      <button type="button" class="btn btn-ghost btn-block" id="f-demo">Probar con datos de ejemplo</button>
      <p style="margin-top:22px;font-size:15px;text-align:center">${reg ? '¿Ya tienes cuenta? <a class="link" href="#entrar">Entra</a>' : '¿Aún no tienes cuenta? <a class="link" href="#registro">Créala gratis</a>'}</p>
    </form></div></div>`;
  window.scrollTo(0, 0);
  $('#f-demo').onclick = () => { Auth.demo(); location.hash = 'app'; };
  $('#auth-form').onsubmit = async e => {
    e.preventDefault(); const btn = $('#f-btn'); $('#f-err').textContent = ''; btn.disabled = true;
    try {
      if (reg) {
        const r = await Auth.register($('#f-name').value, $('#f-email').value, $('#f-pass').value);
        if (r && r.needsConfirm) { confirmScreen(r.email); return; }
      } else await Auth.login($('#f-email').value, $('#f-pass').value);
      const want = sessionGet('hf:wantPlan');
      location.hash = reg ? 'app-correos' : 'app';
      if (want) setTimeout(() => checkout(want), 300);
    } catch (err) { $('#f-err').textContent = ERR_ES(err.message || String(err)); btn.disabled = false; }
  };
  $('#f-forgot')?.addEventListener('click', async () => {
    const email = $('#f-email').value.trim();
    if (!email) { $('#f-err').textContent = 'Escribe tu correo y vuelve a pulsar.'; return; }
    try { await Auth.resetPassword(email); $('#f-err').style.color = 'var(--green)'; $('#f-err').textContent = 'Te hemos enviado un enlace para cambiar la contraseña.'; }
    catch (e) { $('#f-err').textContent = ERR_ES(e.message || String(e)); }
  });
  (reg ? $('#f-name') : $('#f-email')).focus();
}
function confirmScreen(email) {
  $('#auth-form').innerHTML = `<span class="dot green" style="width:56px;height:56px;border-radius:18px;margin-bottom:18px">${I.mail}</span>
    <h1>Revisa tu correo</h1><p class="hint" style="font-size:15px;margin:6px 0 22px">Te hemos enviado un enlace de confirmación a <b>${esc(email)}</b>. Púlsalo y entrarás directamente a tu panel. Si no lo ves, mira en spam.</p>
    <a class="btn btn-ghost btn-block" href="#entrar">Ya lo he confirmado, entrar</a>`;
}

function renderLegal(which) {
  const priv = which === 'privacidad';
  root.innerHTML = navHTML() + `<main><article class="article"><a class="back" href="#inicio">← Inicio</a>
    <h1>${priv ? 'Política de privacidad' : 'Términos de uso'}</h1><div class="meta">Última actualización: noviembre de 2026 · Borrador pendiente de revisión legal</div>
    <div class="content">${priv ? `
      <p>HorahFlow analiza recibos y facturas de tu correo para mostrarte tus gastos recurrentes. Esta página explica qué datos usamos y cómo.</p>
      <h2>Qué datos tratamos</h2><ul><li>Tu nombre, correo y contraseña cifrada para gestionar tu cuenta.</li><li>De tu correo, solo los mensajes que parecen recibos, facturas o renovaciones: remitente, asunto, fecha y texto del recibo.</li></ul>
      <h2>Dónde se procesan</h2><p>El análisis de tus correos se realiza en tu navegador. De cada recibo detectado guardamos solo un fragmento (comercio, importe, fecha y frecuencia) en tu cuenta, alojada en servidores de Supabase en la Unión Europea (Frankfurt), para que puedas verlo desde cualquier dispositivo. Nunca guardamos tus correos completos ni los que no son recibos. El permiso de Google es de solo lectura y se revoca al terminar cada sincronización.</p>
      <h2>Inteligencia artificial</h2><p>Para responder a tus preguntas, generar tu análisis personalizado y leer recibos poco habituales usamos la IA de Anthropic (Claude) desde nuestro servidor. Solo le enviamos un resumen de tus gastos o el fragmento del recibo, nunca tus correos completos. Anthropic actúa como encargado del tratamiento y no utiliza estos datos para entrenar sus modelos.</p>
      <h2>Pagos</h2><p>Los pagos los procesa Stripe. HorahFlow no ve ni guarda los datos de tu tarjeta.</p>
      <h2>Responsable</h2><p>Guillem Serra Sentinella · hola@horahflow.com</p>
      <h2>Uso de datos de Google</h2><p>El uso que HorahFlow hace de la información recibida de las API de Google cumple la Política de Datos de Usuario de los Servicios API de Google, incluidos los requisitos de uso limitado. No usamos estos datos para publicidad ni los vendemos o cedemos a terceros.</p>
      <h2>Tus derechos</h2><p>Puedes borrar tus datos o eliminar tu cuenta desde Ajustes en cualquier momento y retirar el acceso a Gmail desde tu cuenta de Google. Para ejercer tus derechos de acceso, rectificación o supresión, escribe a hola@horahflow.com.</p>` : `
      <p>Al usar HorahFlow aceptas estas condiciones.</p>
      <h2>El servicio</h2><p>HorahFlow ofrece una estimación de tus gastos a partir de los recibos de tu correo. Es una herramienta informativa y no constituye asesoramiento financiero. Los importes pueden no recoger cobros que no generan recibo por correo.</p>
      <h2>Planes y pagos</h2><p>El plan Gratis no tiene coste. Los planes de pago se renuevan según el periodo elegido y puedes cancelarlos en cualquier momento desde tu panel; la cancelación es efectiva al final del periodo pagado.</p>
      <h2>Uso responsable</h2><p>Solo puedes conectar buzones de correo que te pertenezcan o que estés autorizado a gestionar.</p>`}
    </div></article></main>` + footerHTML();
  bindNav(); window.scrollTo(0, 0);
}
