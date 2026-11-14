/* =========================================================
   HorahFlow · web pública: inicio, demo, precios, blog, acceso
   ========================================================= */
const LOGO = window.HF_LOGO, LOGO_FULL = window.HF_LOGO_FULL;
const PANEL_SHOTS = [
  ['resumen', 'Resumen', 'Cuánto pagas y tus fugas'],
  ['suscripciones', 'Suscripciones', 'Todo lo que se renueva solo'],
  ['calendario', 'Calendario', 'Qué día te cobra cada uno'],
  ['ahorro', 'Ahorro', 'Alternativas y plan con IA']
];
function bindShots() {
  const box = $('.shots'); if (!box) return;
  const tabs = $$('.shot-tab', box), imgs = $$('.shot-imgs picture', box);
  let i = 0, timer = null, auto = true;
  const show = n => { i = (n + tabs.length) % tabs.length; tabs.forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-selected', k === i); }); imgs.forEach((im, k) => im.classList.toggle('on', k === i)); };
  const play = () => { clearInterval(timer); if (auto) timer = setInterval(() => show(i + 1), 5000); box.classList.toggle('playing', auto); };
  tabs.forEach((t, k) => t.addEventListener('click', () => { auto = false; show(k); play(); }));
  if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) play(); else clearInterval(timer); }), { threshold: 0.3 }).observe(box);
}
/* Calculadora de la portada: [nombre, importe orientativo al mes, marcado por defecto] */
const CALC_ITEMS = [
  ['Plataforma de vídeo', 13.99, true], ['Otra plataforma de vídeo', 9.99, true], ['Música', 11.99, true], ['Almacenamiento en la nube', 2.99, true],
  ['Gimnasio', 35, false], ['Asistente de IA', 20, false], ['Fútbol o deportes en TV', 30, false], ['Videojuegos online', 9.99, false],
  ['Audiolibros o lectura', 9.99, false], ['Prensa digital', 9.99, false], ['Software o apps de trabajo', 12, false], ['Comida a domicilio', 60, false]
];
function bindCalc() {
  const box = $('#calc-items'); if (!box) return;
  const eur = (n, d = 2) => n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' }) + ' €';
  const val = el => Math.max(0, parseFloat($('input', el).value.replace(',', '.')) || 0);
  let shown = { m: 0, y: 0 };
  const count = (id, from, to, d) => {
    const el = $(id), t0 = performance.now(), dur = 450;
    const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = eur(from + (to - from) * e, d); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const d = new Date(); $('#r-date').textContent = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const upd = () => {
    const on = $$('.chipc', box).filter(el => el.classList.contains('on'));
    const m = on.reduce((t, el) => t + val(el), 0), y = m * 12;
    $('#r-lines').innerHTML = on.length ? on.map(el => `<div class="r-line"><span>${esc($('.cn', el).textContent)}</span><i></i><b class="num">${eur(val(el))}</b></div>`).join('') : '<p class="r-empty">Toca un servicio para añadirlo al ticket</p>';
    count('#calc-m', shown.m, m, 2); count('#calc-y', shown.y, y, 0); shown = { m, y };
    $('#calc-5').textContent = m ? `y ${eur(m * 60, 0)} en 5 años` : '';
    const n = Math.floor(y / 60);
    $('#r-fun').textContent = n >= 2 ? `Con eso salís a cenar dos personas ${n} veces al año.` : '';
  };
  const toggle = el => { const on = !el.classList.contains('on'); el.classList.toggle('on', on); el.setAttribute('aria-checked', on); upd(); };
  box.addEventListener('click', e => { const c = e.target.closest('.chipc'); if (!c || e.target.tagName === 'INPUT') return; toggle(c); });
  box.addEventListener('keydown', e => { const c = e.target.closest('.chipc'); if (c && e.target === c && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); toggle(c); } });
  box.addEventListener('input', upd);
  upd();
}
function bindThread() {
  const th = $('#thread'); if (!th) return;
  const steps = $$('.tstep', th);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick = () => {
    if (!th.isConnected) return removeEventListener('scroll', tick);
    const r = th.getBoundingClientRect(), vh = innerHeight;
    const p = reduce ? 1 : Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.55)));
    th.style.setProperty('--p', p.toFixed(3));
    steps.forEach((s, i) => s.classList.toggle('lit', p >= i / (steps.length - 1) - 0.02));
  };
  addEventListener('scroll', tick, { passive: true }); tick();
}
function bindVideo() {
  const v = $('#hf-video'); if (!v || !('IntersectionObserver' in window)) return;
  // Se reproduce solo cuando está a la vista (sin sonido), y se pausa al salir
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }), { threshold: 0.5 }).observe(v);
}
let billingYear = false;

function navHTML() {
  const logged = !!Auth.user && !Auth.user.demo;
  return `<header class="nav" id="nav"><div class="wrap">
    <a href="#inicio" class="logo"><img src="${LOGO}" alt="HorahFlow"></a>
    <nav class="links">
      <a href="#como-funciona">Cómo funciona</a><a href="#demo">Demo</a><a href="#precios">Precios</a><a href="/blog/">Blog</a>
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
    <div><h4>Recursos</h4><a href="/calculadora-suscripciones/">Calculadora de suscripciones</a><a href="/blog/">Blog</a>${(window.HF_POSTS || []).slice(0, 2).map(p => `<a href="/blog/${p.slug}/">${esc(p.short || p.title)}</a>`).join('')}</div>
    <div><h4>Legal</h4><a href="/seguridad/">Seguridad</a><a href="/privacidad/">Privacidad</a><a href="/cookies/">Cookies</a><a href="/condiciones/">Condiciones</a>${legalComplete() ? '<a href="/aviso-legal/">Aviso legal</a>' : ''}<a href="mailto:hola@horahflow.com">hola@horahflow.com</a></div>
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
      <div class="proof"><span>${I.shield} Sin contraseñas</span><span>${I.zap} Resultados en 1 minuto</span><span>${I.check} Sin tarjeta</span></div>
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
    <span>Detecta <b>+45 servicios</b> conocidos</span><span>Lee recibos en <b>español e inglés</b></span><span>Convierte <b>USD y GBP</b> a euros</span><span><b>Nunca</b> pedimos la contraseña de tu correo</span>
  </div></div>

  <section class="block" id="como-funciona-sec"><div class="wrap">
    <div class="sec-head"><span class="kicker">Cómo funciona</span><h2 class="title">Tres pasos. Ninguna hoja de cálculo.</h2><p class="sub">No tienes que apuntar nada. Todo lo que pagas online deja un recibo en tu correo: HorahFlow los encuentra y los ordena por ti.</p></div>
    <div class="video-card"><video id="hf-video" src="/media/horahflow.mp4" poster="/media/horahflow-poster.jpg" muted playsinline loop preload="metadata" controls aria-label="Vídeo: cómo funciona HorahFlow en 44 segundos"></video></div>
    <div class="thread" id="thread">
      <div class="thread-track"><i class="thread-fill"></i><span class="thread-spark"></span></div>
      ${[
        ['Conecta tu correo', 'Te damos una dirección privada: tu correo le reenvía los recibos solo. También puedes subir un archivo o pegarlos. Nunca te pedimos contraseñas.', '<span>Gmail</span><span>Outlook</span><span>iCloud</span><span>.mbox</span>'],
        ['Leemos solo los recibos', 'Separamos facturas y renovaciones de la publicidad. De cada cobro sacamos importe, fecha, frecuencia y categoría.', '<span>155 correos</span><span class="ok">153 cobros</span>'],
        ['Cierra las fugas', 'Ves cuánto pagas, cuándo te lo cobran y qué puedes cancelar, compartir o cambiar por algo gratis.', '<span class="save">−169,47 €/mes</span>']
      ].map(([h, p, tags], i) => `<div class="tstep" data-i="${i}"><span class="tnode">${i + 1}</span><h3>${h}</h3><p>${p}</p><div class="ttags">${tags}</div></div>`).join('')}
    </div>
  </div></section>

  <section class="block alt" id="panel-sec"><div class="wrap">
    <div class="sec-head center"><span class="kicker">Tu panel</span><h2 class="title">Todo lo que pagas, en una sola pantalla.</h2><p class="sub">Así se ve HorahFlow por dentro. Son capturas reales de la app con datos de ejemplo.</p></div>
    <div class="shots">
      <div class="shot-tabs" role="tablist">${PANEL_SHOTS.map(([k, t, d], i) => `<button role="tab" class="shot-tab${i ? '' : ' on'}" data-shot="${k}" aria-selected="${!i}"><b>${t}</b><span>${d}</span><i class="shot-bar"></i></button>`).join('')}</div>
      <div class="shot-frame"><div class="shot-chrome"><i></i><i></i><i></i><span>horahflow.com</span></div>
        <div class="shot-imgs">${PANEL_SHOTS.map(([k, t], i) => `<picture class="${i ? '' : 'on'}" data-img="${k}"><source media="(max-width: 700px)" srcset="/media/app/${k}-m.webp" width="600" height="1200"><img src="/media/app/${k}.webp" alt="Captura de HorahFlow: ${t}" width="1600" height="1025" loading="${i ? 'lazy' : 'eager'}"></picture>`).join('')}</div></div>
    </div>
  </div></section>

  <section class="block"><div class="wrap">
    <div class="sec-head"><span class="kicker">Lo que encuentra</span><h2 class="title">Las brechas por las que se escapa tu dinero.</h2></div>
    <div class="features">
      ${[
        ['red', I.repeat, 'Suscripciones olvidadas', 'Todo lo que se renueva solo: mensual, anual o semanal, con su próximo cobro.', '<span>Almacenamiento nube</span><b>2,99 € · día 14</b>'],
        ['amber', I.up, 'Subidas de precio', 'Te avisa cuando un servicio te cobra más que antes, aunque nadie te lo dijera.', '<span>Fibra + móvil</span><b><s>68,90</s> → 72,50 €</b>'],
        ['red', I.alert, 'Cobros duplicados', 'Dos cargos iguales en pocos días. Te decimos a quién reclamar la devolución.', '<span>Música · 12 y 13 sept</span><b>2 × 11,99 €</b>'],
        ['amber', I.clock, 'Pruebas que pasan a pago', 'Las pruebas gratuitas que acabaron cobrándose sin que lo decidieras.', '<span>Prueba de diseño</span><b><s>0,00</s> → 11,99 €</b>'],
        ['gray', I.list, 'Servicios que se solapan', 'Cuatro plataformas de vídeo a la vez, dos nubes, dos apps de música…', '<span>4 plataformas de vídeo</span><b>48,96 €/mes</b>'],
        ['green', I.leaf, 'Alternativas gratuitas', 'Para cada servicio, opciones gratis o más baratas y el enlace para darte de baja.', '<span>Ofimática de pago</span><b class="g">→ gratis</b>']
      ].map(([c, i, h, p, ex]) => `<div class="feature"><span class="dot ${c}">${i}</span><h3>${h}</h3><p>${p}</p><div class="fx ${c}">${ex}</div></div>`).join('')}
    </div>
  </div></section>

  <section class="block alt" id="conectar"><div class="wrap connect-sec">
    <div>
      <span class="kicker">Conecta tu correo</span><h2 class="title">Lo configuras una vez. Después, funciona solo.</h2>
      <p class="sub" style="margin-bottom:24px">Te damos una dirección privada. Tu correo le reenvía solo los recibos y tu panel se actualiza con cada cobro nuevo, sin que tengas que hacer nada.</p>
      <div class="providers">
        ${[['Gmail', 'Reenvío automático con un filtro', '3 min'], ['Outlook y Hotmail', 'Reenvío automático · conexión con un clic muy pronto', '3 min'], ['iCloud, Yahoo y otros', 'Cualquier correo que permita reglas de reenvío', '3 min'], ['Tu historial', 'Trae tus recibos de los últimos meses con un solo reenvío', '1 min']]
          .map(([n, d, t]) => `<div class="prov"><span class="dot green">${I.check}</span><div><b>${n}</b><span>${d}</span></div><em>${t}</em></div>`).join('')}
      </div>
    </div>
    <div class="flowviz" aria-hidden="true">
      <div class="fv-node"><span class="dot gray">${I.mail}</span><div><b>Tu correo</b><small>Gmail, Outlook, iCloud…</small></div></div>
      <div class="fv-link"><i class="fv-pkt">13,99 €</i></div>
      <div class="fv-node"><span class="dot amber">${I.list}</span><div><b>Filtro «solo recibos»</b><small>facturas, renovaciones, pagos</small></div></div>
      <div class="fv-link"><i class="fv-pkt" style="animation-delay:1.3s">11,99 €</i></div>
      <div class="fv-node"><span class="dot green">${I.shield}</span><div><b class="mono" style="font-size:14px">k7m2xq9f@recibos.horahflow.com</b><small>tu dirección privada</small></div></div>
      <div class="fv-link"><i class="fv-pkt" style="animation-delay:2.6s">72,50 €</i></div>
      <div class="fv-node dark"><img src="${LOGO}" alt="" style="height:20px;filter:brightness(0) invert(1)"><div><b>Tu panel al día</b><small>y un aviso antes de cada cobro</small></div></div>
    </div>
  </div></section>

  <section class="block calc-sec" id="calculadora"><div class="wrap calc">
    <div class="calc-left">
      <span class="kicker">Calculadora</span><h2 class="title">¿Cuánto se te escapa al año?</h2>
      <p class="sub">Toca lo que pagas. Si tu precio es otro, cámbialo. Los importes son orientativos.</p>
      <div class="chips" id="calc-items">${CALC_ITEMS.map((c, i) => `<div class="chipc${c[2] ? ' on' : ''}" data-i="${i}" role="checkbox" aria-checked="${c[2]}" tabindex="0"><span class="tick"></span><span class="cn">${c[0]}</span><span class="ca"><input inputmode="decimal" value="${String(c[1]).replace('.', ',')}" aria-label="Importe al mes de ${c[0]}"><small>€</small></span></div>`).join('')}</div>
    </div>
    <div class="receipt" aria-live="polite">
      <div class="r-head"><img src="${LOGO}" alt=""><div><b>Tu ticket mensual</b><small id="r-date"></small></div></div>
      <div class="r-lines" id="r-lines"></div>
      <div class="r-tot"><span>Al mes</span><b class="num" id="calc-m">0 €</b></div>
      <div class="r-year"><span>Al año se te van</span><b class="num" id="calc-y">0 €</b><small id="calc-5"></small></div>
      <p class="r-fun" id="r-fun"></p>
      <a class="btn btn-dark btn-block" href="#registro">Ver mis gastos reales gratis ${I.arrow}</a>
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
      <p class="sub" style="margin-bottom:22px">Conectar tu banco exige compartir credenciales con terceros y da acceso a todo tu dinero. Tu correo ya tiene los recibos: basta con reenviarlos, y desde ahí no se puede mover ni un euro.</p>
      <div style="display:grid;gap:14px">
        ${[['Sin contraseñas', 'Tú decides qué se reenvía. No tenemos acceso a tu buzón ni podemos enviar, borrar o mover nada.'],
           ['Solo recibos', 'Lo que no es un cobro se descarta al llegar. El resto de tu correo nunca lo vemos.'],
           ['Lo mínimo', 'De cada recibo solo guardamos comercio, importe, fecha y un fragmento. Servidores en la UE.'],
           ['Bórralo cuando quieras', 'Un botón elimina tu cuenta y todos tus datos.']]
          .map(([b, p]) => `<div style="display:flex;gap:12px"><span class="dot green" style="width:26px;height:26px;border-radius:8px">${I.check}</span><div><b>${b}</b><div class="hint" style="font-size:15px">${p}</div></div></div>`).join('')}
      </div>
      <a class="btn btn-ghost btn-sm" href="/seguridad/" style="margin-top:22px">Mira paso a paso cómo protegemos tus datos ${I.arrow}</a></div>
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
    <div class="faq">${[...new Set(FAQ.map(f => f[2]))].map(g => `<h3 class="faq-g">${g}</h3>${FAQ.filter(f => f[2] === g).map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}`).join('')}
      <p class="hint" style="text-align:center;margin-top:26px;font-size:15px">¿Otra duda? Escríbenos a <a class="link" href="mailto:hola@horahflow.com">hola@horahflow.com</a> y te respondemos en persona.</p></div>
  </div></section>

  ${(window.HF_POSTS || []).length ? `<section class="block"><div class="wrap">
    <div class="sec-head" style="display:flex;justify-content:space-between;align-items:flex-end;max-width:none;gap:20px;flex-wrap:wrap"><div><span class="kicker">Blog</span><h2 class="title">Ideas para que tu dinero no se escape.</h2></div><a class="link" href="/blog/">Ver todos los artículos</a></div>
    <div class="blog-grid">${window.HF_POSTS.slice(0, 3).map(p => `<a class="post-card" href="/blog/${p.slug}/"><img class="post-img" src="${esc(p.image)}" alt="${esc(p.imageAlt)}" loading="lazy" width="1200" height="630">
      <div class="body"><span class="cat">${esc(p.tag)}</span><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><span class="date">${esc(p.dateText)} · ${p.min} min</span></div></a>`).join('')}</div>
  </div></section>` : ''}
  <section style="padding-top:96px"><div class="wrap"><div class="cta-band">
    <div><h2>Lo que no ves, también lo pagas.</h2><p>Conecta tu correo y descubre tus fugas en menos de un minuto.</p></div>
    <a class="btn btn-green" href="#registro">Crear cuenta gratis ${I.arrow}</a>
  </div></div></section>
  </main>` + footerHTML();
  bindNav(); bindDemo(); bindPricing(); bindCalc(); bindVideo(); bindThread(); bindShots();
  const pg = $('#priv-grid'); if (pg && window.innerWidth < 900) pg.style.gridTemplateColumns = '1fr';
  if (scrollTo) requestAnimationFrame(() => { const el = $('#' + scrollTo); if (el) window.scrollTo({ top: el.offsetTop - 72, behavior: 'instant' in window ? 'auto' : 'auto' }); });
  else window.scrollTo(0, 0);
}



function plansHTML() {
  const p = billingYear ? { pro: '2,99', biz: '14,25' } : { pro: '3,99', biz: '18,99' };
  const per = billingYear ? 'al mes, facturado anualmente' : 'al mes';
  const li = arr => arr.map(x => `<li>${I.check}<span>${x}</span></li>`).join('');
  return `
  <div class="plan"><h3>Gratis</h3><p class="desc">Para descubrir tus fugas por primera vez.</p>
    <div class="price">0 €</div><div class="per">para siempre</div>
    <ul>${li(['1 correo con reenvío automático', 'Subir archivos y pegar recibos sin límite', 'Suscripciones, fugas y calendario de cobros', 'Alternativas gratuitas', 'Flow: 15 preguntas al día', 'Importa y analiza tus últimos 3 meses'])}</ul>
    <a class="btn btn-ghost btn-block" href="#registro">Empezar gratis</a></div>
  <div class="plan pop"><span class="tag">Más elegido</span><h3>Pro</h3><p class="desc">Para que HorahFlow vigile por ti y te avise antes de pagar.</p>
    <div class="price num">${p.pro} €</div><div class="per">${per}</div>
    <ul>${li(['Hasta 5 correos con reenvío automático', '<b>Aviso por email</b> antes de cada cobro', 'Alerta por email de duplicados, subidas y pruebas que pasan a pago', 'Resumen mensual por email', 'Exportar a CSV / Excel', 'Flow: 300 preguntas al día', '<b>24 meses</b> de historial: importa y analiza tus recibos de los últimos 2 años'])}</ul>
    <button class="btn btn-dark btn-block" data-buy="pro">Pasar a Pro</button></div>
  <div class="plan"><h3>Empresas</h3><p class="desc">Para autónomos y pymes con muchos correos y gastos de empresa.</p>
    <div class="price num">${p.biz} €</div><div class="per">${per}</div>
    <ul>${li(['Todo lo de Pro', 'Hasta 25 correos con reenvío automático (los de tu equipo también)', 'Factura con el NIF de tu empresa', 'Flow: 1.000 preguntas al día', '36 meses de historial'])}</ul>
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


/* ---------- Acceso ---------- */
function renderAuth(mode) {
  const reg = mode === 'registro';
  root.innerHTML = `<div class="auth">
    <div class="side"><a href="#inicio"><img src="${LOGO}" alt="HorahFlow" style="height:30px;width:auto"></a>
      <blockquote>“Pagaba 11 suscripciones. Creía que eran 5.”<div class="hint" style="font-size:15px;font-weight:600;margin-top:14px;letter-spacing:0">Lo que descubre casi todo el mundo la primera vez.</div></blockquote>
      <div style="display:grid;gap:10px;color:var(--muted);font-weight:600;font-size:14px"><span style="display:flex;gap:8px;align-items:center">${I.shield} Sin contraseñas de tu correo</span><span style="display:flex;gap:8px;align-items:center">${I.check} Sin datos bancarios</span><a class="link" href="/seguridad/" target="_blank" rel="noopener" style="font-size:13.5px">Cómo protegemos tus datos</a></div>
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
      ${reg ? `<p class="hint" style="margin-top:12px">Al crear la cuenta aceptas las <a class="link" href="/condiciones/">condiciones</a> y la <a class="link" href="/privacidad/">política de privacidad</a>.</p>` : ''}
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
