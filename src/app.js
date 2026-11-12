/* =========================================================
   HorahFlow · la app
   ========================================================= */
const TABS = [
  ['app', 'Resumen', I.home], ['app-suscripciones', 'Suscripciones', I.repeat], ['app-calendario', 'Calendario', I.cal],
  ['app-ahorro', 'Ahorro', I.leaf], ['app-gastos', 'Gastos', I.receipt], ['app-correos', 'Correos', I.mail], ['app-ajustes', 'Ajustes', I.gear]
];
let calMonth = null, subFilter = { q: '', cat: '', status: 'activa' }, txFilter = { q: '', cat: '', kind: '' }, chatLog = [];

function appShell(active, content) {
  const a = Data.analysis, u = Auth.user, plan = Auth.plan();
  const leakCount = a.leaks.filter(l => l.sev >= 2).length;
  return `<div class="app">
    <aside class="side-nav">
      <a href="#inicio" class="logo"><img src="${LOGO}" alt="HorahFlow"></a>
      <nav>${TABS.map(([h, l, i]) => `<a href="#${h}" class="${h === active ? 'on' : ''}">${i}<span>${l}</span>${h === 'app' && leakCount ? `<span class="badge">${leakCount}</span>` : ''}</a>`).join('')}</nav>
      <div class="bottom">
        ${u.demo ? `<div class="plan-box" style="background:var(--green-soft);border-color:transparent"><b>Estás en la demo</b><p class="hint" style="margin:4px 0 10px">Datos de ejemplo. Crea tu cuenta para analizar tu correo.</p><a class="btn btn-dark btn-sm btn-block" href="#registro">Crear cuenta</a></div>` :
        plan.id === 'free' ? `<div class="plan-box"><b>Plan Gratis</b><p class="hint" style="margin:4px 0 10px">Hasta 5 correos y avisos por email antes de cada cobro.</p><button class="btn btn-dark btn-sm btn-block" data-buy="pro">Pasar a Pro</button></div>` :
        `<div class="plan-box"><b>Plan ${plan.name}</b>${u.planTest ? '<p class="hint">Modo prueba</p>' : ''}</div>`}
        <div class="me"><span class="av">${esc(u.name.charAt(0).toUpperCase())}</span><div class="who"><b>${esc(u.name)}</b><span>${esc(u.email)}</span></div>
          <button title="Salir" aria-label="Salir" id="logout" style="margin-left:auto;color:var(--faint)">${I.out}</button></div>
      </div>
    </aside>
    <main class="main">${content}</main>
    <nav class="mobile-tabs">${TABS.filter(t => t[0] !== 'app-gastos').map(([h, l, i]) => `<a href="#${h}" class="${h === active ? 'on' : ''}">${i}<span>${l}</span></a>`).join('')}</nav>
  </div>`;
}

function renderApp(view) {
  if (!Auth.user) { location.hash = 'entrar'; return; }
  Data.load();
  const a = Data.analysis;
  const empty = !Data.state.emails.length && view !== 'app-correos' && view !== 'app-ajustes';
  let html;
  if (empty) html = emptyHTML();
  else html = ({
    'app': overviewHTML, 'app-suscripciones': subsHTML, 'app-calendario': calendarHTML, 'app-ahorro': savingsHTML,
    'app-gastos': txHTML, 'app-correos': sourcesHTML, 'app-ajustes': settingsHTML
  }[view] || overviewHTML)(a);
  root.innerHTML = appShell(view, html);
  $('#logout').onclick = () => { Auth.logout(); location.hash = 'inicio'; };
  if (Inbound.available() && !Auth.user.demo && Inbound._for !== Auth.user.id) {
    Inbound._for = Auth.user.id;
    Inbound.load().then(() => { if (location.hash === '#app-correos') route(); }).catch(() => {});
    Inbound.watch(n => {
      toast(`${n} ${n === 1 ? 'recibo nuevo importado' : 'recibos nuevos importados'} de tu correo`);
      if (/^#app/.test(location.hash) && !(document.activeElement && document.activeElement.matches('input,textarea,select')) && !document.querySelector('.modal-bg,.tour')) { const y = scrollY; route(); scrollTo(0, y); }
    });
  }
  bindAppView(view);
  window.scrollTo(0, 0);
  if (!Data.state.prefs.tourDone && !Tour.open) setTimeout(() => { if (!Tour.open && Data.state && !Data.state.prefs.tourDone) Tour.start(); }, 350);
}

/* ---------- Tutorial de bienvenida (primera vez que entras) ---------- */
const Tour = {
  open: false, i: 0,
  steps: [
    { t: 'Bienvenido a HorahFlow', p: 'Te enseñamos en 1 minuto qué hace cada apartado. Puedes saltarlo cuando quieras y volver a verlo desde Ajustes.' },
    { h: 'app', t: 'Resumen', p: 'Tu foto general: cuánto pagas al mes y al año, tu nota de salud financiera y las fugas más importantes que hemos encontrado.' },
    { h: 'app-suscripciones', t: 'Suscripciones', p: 'Todo lo que se renueva solo. Toca cualquiera para ver su historial de precios, marcarla como cancelada o ver cómo darte de baja.' },
    { h: 'app-calendario', t: 'Calendario', p: 'Qué día te cobra cada servicio. Así decides a tiempo si lo cancelas antes de la próxima renovación.' },
    { h: 'app-ahorro', t: 'Ahorro', p: 'Cuánto puedes ahorrar y cómo: alternativas gratis o más baratas y un plan de ahorro hecho por IA a partir de tus gastos.' },
    { h: 'app-gastos', t: 'Gastos', p: 'Cada cobro detectado en tus recibos, con buscador y filtros. En los planes de pago puedes exportarlo a CSV.' },
    { h: 'app-correos', t: 'Correos', p: 'Aquí creas tu dirección privada de reenvío: configúrala una vez en tu correo y tus recibos llegan solos. También puedes subir archivos o pegar recibos.' },
    { h: 'app-ajustes', t: 'Ajustes', p: 'Tu perfil, tu plan, los avisos por correo y el control total de tus datos: puedes borrarlos cuando quieras.' },
    { sel: '#ask', t: 'Pregúntale a Flow', p: 'En el Resumen tienes a Flow, tu asistente: pregúntale en lenguaje normal, por ejemplo «¿cuánto gasto en streaming?».' },
    { t: '¡Listo!', p: 'Empieza conectando tu correo. En unos segundos verás a dónde se va tu dinero.', last: true }
  ],
  target(st) {
    if (st.sel) return $(st.sel);
    if (!st.h) return null;
    const mob = matchMedia('(max-width: 900px)').matches;
    return $(`${mob ? '.mobile-tabs' : '.side-nav nav'} a[href="#${st.h}"]`);
  },
  start() {
    if (this.open || !Auth.user || !$('.app')) return;
    this.open = true; this.i = 0;
    this.el = document.createElement('div'); this.el.className = 'tour'; this.el.setAttribute('role', 'dialog'); this.el.setAttribute('aria-modal', 'true'); this.el.setAttribute('aria-label', 'Tutorial de HorahFlow');
    this.el.innerHTML = '<div class="tour-hole"></div><div class="tour-card" tabindex="-1"></div>';
    document.body.appendChild(this.el);
    this.onKey = e => { if (e.key === 'Escape') this.end(); else if (e.key === 'ArrowRight') this.go(1); else if (e.key === 'ArrowLeft') this.go(-1); };
    this.onResize = () => this.paint();
    addEventListener('keydown', this.onKey); addEventListener('resize', this.onResize); addEventListener('scroll', this.onResize, { passive: true });
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      ({ next: () => this.go(1), prev: () => this.go(-1), skip: () => this.end(), mail: () => { this.end(); location.hash = 'app-correos'; } })[b.dataset.t]();
    });
    this.paint();
  },
  go(d) { const n = this.i + d; if (n < 0) return; if (n >= this.steps.length) return this.end(); this.i = n; this.paint(); },
  paint() {
    const st = this.steps[this.i], tg = this.target(st), hole = $('.tour-hole', this.el), card = $('.tour-card', this.el);
    const n = this.steps.length;
    card.innerHTML = `<div class="tour-prog"><span style="width:${Math.round((this.i + 1) / n * 100)}%"></span></div>
      <div class="hint" style="font-size:13px;font-weight:700">${this.i + 1} de ${n}</div>
      <h3>${st.t}</h3><p>${st.p}</p>
      <div class="tour-btns">${st.last ? `<button class="btn btn-ghost btn-sm" data-t="skip">Cerrar</button><button class="btn btn-dark btn-sm" data-t="mail">Conectar mi correo ${I.arrow}</button>`
        : `<button class="link tour-skip" data-t="skip">Saltar tutorial</button><span style="flex:1"></span>${this.i ? '<button class="btn btn-ghost btn-sm" data-t="prev">Atrás</button>' : ''}<button class="btn btn-dark btn-sm" data-t="next">${this.i ? 'Siguiente' : 'Empezar'}</button>`}</div>`;
    const vis = tg && tg.getClientRects().length;
    if (vis && st.sel) tg.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = vis ? tg.getBoundingClientRect() : null;
    this.el.classList.toggle('center', !r);
    if (r) {
      const pad = 6;
      Object.assign(hole.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      const cw = Math.min(360, innerWidth - 24), ch = card.offsetHeight, gap = 14;
      let x, y;
      if (r.right + gap + cw < innerWidth) { x = r.right + gap; y = Math.min(Math.max(12, r.top + r.height / 2 - ch / 2), innerHeight - ch - 12); }
      else { x = Math.min(Math.max(12, r.left + r.width / 2 - cw / 2), innerWidth - cw - 12); y = r.top - ch - gap > 12 ? r.top - ch - gap : Math.min(r.bottom + gap, innerHeight - ch - 12); }
      Object.assign(card.style, { left: x + 'px', top: y + 'px', width: cw + 'px' });
    } else {
      Object.assign(hole.style, { left: '50%', top: '50%', width: '0px', height: '0px' });
      Object.assign(card.style, { left: '', top: '', width: '' });
    }
    card.focus({ preventScroll: true });
  },
  end() {
    if (!this.open) return;
    this.open = false; this.el?.remove();
    removeEventListener('keydown', this.onKey); removeEventListener('resize', this.onResize); removeEventListener('scroll', this.onResize);
    if (Auth.user && Data.state && !Data.state.prefs.tourDone) { Data.state.prefs.tourDone = Date.now(); Data.save('prefs'); }
  }
};

function emptyHTML() {
  return `<div class="empty fade-in"><span class="dot green" style="width:64px;height:64px;border-radius:20px;margin:0 auto">${I.mail}</span>
    <h2>Conecta tu correo para empezar</h2><p>Buscaremos tus recibos y facturas y en un minuto verás tus suscripciones, tus próximos cobros y dónde puedes ahorrar.</p>
    <a class="btn btn-dark" href="#app-correos">Conectar correo ${I.arrow}</a>
    <div style="margin-top:14px"><button class="link" id="load-demo" style="font-size:14px">o carga datos de ejemplo</button></div></div>`;
}

function topbar(title, sub, right = '') {
  const srcs = Data.state.sources;
  return `<div class="topbar"><div><h1>${title}</h1>${sub ? `<p class="sub" style="font-size:15px">${sub}</p>` : ''}</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${right}${srcs.length ? `<a class="chip" href="#app-correos">${I.mail} ${srcs.length} ${srcs.length === 1 ? 'fuente' : 'fuentes'}</a>` : ''}</div></div>`;
}

/* ---------- Resumen ---------- */
function overviewHTML(a) {
  const t = a.totals, hi = Math.max(...a.months.map(m => m.total), 1), cmax = Math.max(...a.categories.map(c => c.value), 1);
  const hour = new Date().getHours();
  const greet = hour < 13 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';
  const scoreTxt = t.score >= 75 ? 'Muy bien. Tus gastos están bajo control.' : t.score >= 50 ? 'Bien, pero hay fugas que puedes cerrar.' : 'Tienes varias fugas importantes. Empieza por las rojas.';
  return topbar(`${greet}, ${esc(Auth.user.name.split(' ')[0])}`, `Analizados ${t.emails} correos · ${t.found} cargos encontrados`) + `
  <div class="kpis fade-in">
    <div class="card kpi"><div class="l">Suscripciones / mes</div><div class="v num">${fmt(t.monthlyRec)}</div><div class="s">${a.active.length} activas</div></div>
    <div class="card kpi"><div class="l">Al año en recurrentes</div><div class="v num">${fmt0(t.yearlyRec)}</div><div class="s">si no cambias nada</div></div>
    <div class="card kpi"><div class="l">Gasto variable / mes</div><div class="v num">${fmt(t.oneMonthly)}</div><div class="s">media últimos 3 meses</div></div>
    <div class="card kpi hl"><div class="l">Puedes ahorrar</div><div class="v num">${fmt0(t.yearlyPotential)}</div><div class="s">al año · ${fmt(t.potential)}/mes</div></div>
  </div>
  <div class="grid-2">
    <div class="card"><h3>Brechas detectadas <small>${a.leaks.length}</small></h3>
      ${a.leaks.length ? a.leaks.slice(0, 6).map(leakHTML).join('') : '<p class="hint">No hemos encontrado fugas. ¡Bien hecho!</p>'}
      ${a.leaks.length > 6 ? `<a href="#app-ahorro" class="link" style="display:inline-block;margin-top:14px;font-size:14px">Ver las ${a.leaks.length}</a>` : ''}
    </div>
    <div style="display:grid;gap:16px;align-content:start">
      <div class="card"><h3>Salud de tus gastos</h3><div class="score">${ringHTML(t.score)}<div><b style="font-size:15px">${scoreTxt}</b><p class="hint" style="font-size:14px;margin-top:6px">La nota baja con cada fuga y con lo que podrías ahorrar respecto a lo que gastas.</p></div></div></div>
      <div class="card"><h3><span style="display:flex;gap:8px;align-items:center">${I.spark} Pregúntale a Flow</span><small>tu asistente</small></h3>
        <form class="ask" id="ask"><input class="input" id="ask-q" placeholder="¿Cuánto gasto en streaming?" autocomplete="off"><button class="btn btn-dark btn-sm" style="height:46px">Preguntar</button></form>
        <div class="chat" id="chat">${chatLog.map(m => `<div class="msg ${m.r}">${m.t}</div>`).join('')}</div>
        <div class="suggest">${['¿Qué me cobran esta semana?', '¿Cuál es la más cara?', '¿Dónde puedo ahorrar?', '¿Cuánto gasto al año?'].map(s => `<button type="button" data-q="${s}">${s}</button>`).join('')}</div>
      </div>
    </div>
  </div>
  <div class="grid-2b">
    <div class="card"><h3>Por categoría <small>al mes</small></h3><div class="bars">
      ${a.categories.map(c => `<div class="barrow"><span class="name"><i style="background:${c.color}"></i>${c.label}</span><span class="track"><b style="width:${c.value / cmax * 100}%;background:${c.color}"></b></span><span class="amt num">${fmt(c.value)}</span></div>`).join('')}
    </div></div>
    <div class="card"><h3>Últimos 6 meses <span class="legend"><span><i style="background:var(--ink-2)"></i>Recurrente</span><span><i style="background:#8FD6A3"></i>Variable</span></span></h3>
      <div class="trend">${a.months.map(m => `<div class="col ${m.partial ? 'partial' : ''}" title="${m.label}: ${fmt(m.total)}"><span class="tt num">${fmt0(m.total)}</span>
        <div class="stack" style="height:${Math.max(4, m.total / hi * 130)}px"><div class="o" style="flex:${m.one}"></div><div class="r" style="flex:${m.rec}"></div></div>
        <span class="lab">${m.label}${m.partial ? '*' : ''}</span></div>`).join('')}</div>
      <p class="hint" style="font-size:12px;margin-top:8px">* Mes en curso</p>
    </div>
  </div>
  <div class="card"><h3>Próximos cobros <small>${fmt(a.upcoming.reduce((s, x) => s + x.amount, 0))} en 30 días</small></h3>
    ${a.upcoming.length ? `<table class="table"><tbody>${a.upcoming.slice(0, 8).map(s => upcomingRow(s)).join('')}</tbody></table>` : '<p class="hint">No hay cobros previstos en los próximos 30 días.</p>'}
    <a href="#app-calendario" class="link" style="display:inline-block;margin-top:14px;font-size:14px">Ver calendario</a>
  </div>`;
}
function upcomingRow(s) {
  const days = Math.ceil((s.next - new Date()) / 864e5);
  const when = days <= 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`;
  return `<tr class="clickable" data-sub="${esc(s.key)}"><td><div class="svc">${logoSq(s.merchant)}<div>${esc(s.merchant)}<small>${E.CATS[s.cat].label}</small></div></div></td>
    <td class="hide-m">${fmtDate(s.next)}</td><td><span class="chip ${days <= Data.state.prefs.alertDays ? 'amber' : ''}">${when}</span></td><td class="right"><b class="num">${fmt(s.amount)}</b></td></tr>`;
}
function ringHTML(score) {
  const r = 52, c = 2 * Math.PI * r, col = score >= 75 ? '#2F8F5B' : score >= 50 ? '#B7791F' : '#C2412D';
  return `<div class="ring"><svg width="120" height="120"><circle cx="60" cy="60" r="${r}" stroke="#F1F0F5" stroke-width="12" fill="none"/>
    <circle cx="60" cy="60" r="${r}" stroke="${col}" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - score / 100)}"/></svg>
    <div class="val num">${score}<small>de 100</small></div></div>`;
}

/* ---------- Flow: asistente ---------- */
function mdLite(t) {
  return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n- /g, '<br>• ').replace(/^- /, '• ').replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
}
function flowAnswer(q) {
  const a = Data.analysis, t = a.totals, s = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const list = arr => arr.map(x => `<b>${esc(x.merchant)}</b> ${fmt(x.amount)}`).join(', ');
  const now = new Date();
  // ¿Pregunta por un servicio concreto?
  const sub = a.subs.find(x => s.includes(x.merchant.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(' ')[0]));
  if (sub) return `Pagas <b>${esc(sub.merchant)}</b>: ${fmt(sub.amount)} (${E.CYCLE[sub.cycle].label.toLowerCase()}), unos ${fmt(sub.monthly * 12)} al año. Te lo han cobrado ${sub.count} ${sub.count === 1 ? 'vez' : 'veces'} desde ${fmtDate(sub.first)} (${fmt(sub.totalPaid)} en total). Próximo cobro: ${fmtDate(sub.next)}.${sub.priceUp ? ` Ojo: ha subido de ${fmt(sub.priceUp.from)} a ${fmt(sub.priceUp.to)}.` : ''}`;
  const cat = Object.entries(E.CATS).find(([k, c]) => s.includes(k) || c.label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[ ,]/).some(w => w.length > 3 && s.includes(w)));
  if (cat && /gast|pag|cuanto|cuesta/.test(s)) {
    const c = a.categories.find(x => x.key === cat[0]); const items = a.active.filter(x => x.cat === cat[0]);
    return c ? `En ${cat[1].label.toLowerCase()} gastas unos <b>${fmt(c.value)}/mes</b>${items.length ? ': ' + list(items) : ''}.` : `No he encontrado gastos en ${cat[1].label.toLowerCase()}.`;
  }
  if (/semana|manana|hoy|proxim|cobran|cobra|viene/.test(s)) {
    const lim = /semana/.test(s) ? 7 : /manana/.test(s) ? 1.5 : /hoy/.test(s) ? 1 : 30;
    const up = a.upcoming.filter(x => (x.next - now) / 864e5 <= lim);
    return up.length ? `En ${lim <= 1.5 ? (lim === 1 ? 'el día de hoy' : 'mañana') : lim === 7 ? 'los próximos 7 días' : 'los próximos 30 días'} te cobrarán <b>${fmt(up.reduce((x, y) => x + y.amount, 0))}</b>: ${up.map(x => `${esc(x.merchant)} (${fmtDate(x.next)}, ${fmt(x.amount)})`).join(', ')}.` : 'No tienes cobros previstos en ese periodo.';
  }
  if (/cara|caro|mayor|mas gast/.test(s)) { const top = [...a.active].sort((x, y) => y.monthly - x.monthly).slice(0, 3); return `Tus suscripciones más caras al mes: ${top.map(x => `<b>${esc(x.merchant)}</b> ${fmt(x.monthly)}/mes`).join(', ')}.`; }
  if (/ahorr|recort|reduc|fuga|brecha/.test(s)) { const l = a.leaks.filter(x => x.saving).slice(0, 3); return l.length ? `Puedes ahorrar unos <b>${fmt0(t.yearlyPotential)} al año</b>. Lo primero: ${l.map(x => `${esc(x.title.toLowerCase())} (${fmt(x.saving)}/mes)`).join('; ')}.` : 'No veo ahorros claros ahora mismo. Marca en Suscripciones las que no usas y lo recalculo.'; }
  if (/ano|anual|year/.test(s)) return `Al año pagas <b>${fmt0(t.yearlyRec)}</b> en suscripciones y unos <b>${fmt0(t.oneMonthly * 12)}</b> en gasto variable. En total, <b>${fmt0(t.monthlyAll * 12)}</b>.`;
  if (/mes|mensual|total|cuanto/.test(s)) return `Cada mes pagas <b>${fmt(t.monthlyRec)}</b> en ${a.active.length} suscripciones y unos <b>${fmt(t.oneMonthly)}</b> en compras y pedidos. Total: <b>${fmt(t.monthlyAll)}</b>.`;
  if (/cuantas|numero|suscripciones/.test(s)) return `Tienes <b>${a.active.length} suscripciones activas</b>: ${a.active.map(x => esc(x.merchant)).join(', ')}.`;
  if (/hola|buenas/.test(s)) return '¡Hola! Pregúntame cuánto gastas, qué te cobran esta semana o dónde puedes ahorrar.';
  return 'Aún no sé responder a eso. Prueba con «¿cuánto gasto en música?», «¿qué me cobran esta semana?» o pregúntame por un servicio, como «¿cuánto pago de Netflix?».';
}

/* ---------- Suscripciones ---------- */
function subsHTML(a) {
  const f = subFilter;
  const rows = a.subs.filter(s => (!f.status || s.status === f.status) && (!f.cat || s.cat === f.cat) && (!f.q || s.merchant.toLowerCase().includes(f.q.toLowerCase())));
  const cats = [...new Set(a.subs.map(s => s.cat))];
  return topbar('Suscripciones', `${a.active.length} activas · ${fmt(a.totals.monthlyRec)} al mes · ${fmt0(a.totals.yearlyRec)} al año`) + `
  <div class="tools"><input class="input" id="sf-q" placeholder="Buscar servicio…" value="${esc(f.q)}">
    <select class="input" id="sf-cat"><option value="">Todas las categorías</option>${cats.map(c => `<option value="${c}" ${f.cat === c ? 'selected' : ''}>${E.CATS[c].label}</option>`).join('')}</select>
    <select class="input" id="sf-status">${[['activa', 'Activas'], ['inactiva', 'Sin cobros recientes'], ['cancelada', 'Canceladas'], ['', 'Todas']].map(([v, l]) => `<option value="${v}" ${f.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
  </div>
  <div class="card" style="padding:12px 10px">
  ${rows.length ? `<table class="table"><thead><tr><th>Servicio</th><th class="hide-m">Frecuencia</th><th class="hide-m">Próximo cobro</th><th class="right">Importe</th><th class="hide-m">¿Lo usas?</th></tr></thead><tbody>
  ${rows.map(s => `<tr class="clickable" data-sub="${esc(s.key)}">
    <td><div class="svc">${logoSq(s.merchant)}<div>${esc(s.merchant)} ${s.priceUp ? `<span class="chip amber" style="padding:1px 7px;font-size:11px">↑ precio</span>` : ''}${s.trial ? ` <span class="chip amber" style="padding:1px 7px;font-size:11px">era prueba</span>` : ''}<small>${E.CATS[s.cat].label}${s.account ? ' · ' + esc(s.account) : ''}</small></div></div></td>
    <td class="hide-m">${E.CYCLE[s.cycle].label}${s.variable ? ' <span class="hint">· variable</span>' : ''}</td>
    <td class="hide-m">${s.status === 'activa' ? fmtDate(s.next) : `<span class="chip">${s.status === 'cancelada' ? 'Cancelada' : 'Último: ' + fmtDate(s.last)}</span>`}</td>
    <td class="right"><b class="num">${fmt(s.amount)}</b>${s.cycle !== 'monthly' ? `<div class="hint num">${fmt(s.monthly)}/mes</div>` : ''}</td>
    <td class="hide-m"><div class="seg" data-usage="${esc(s.key)}">${[['si', 'Sí'], ['aveces', 'A veces'], ['no', 'No']].map(([v, l]) => `<button class="${s.usage === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div></td>
  </tr>`).join('')}</tbody></table>` : '<p class="hint" style="padding:20px">No hay suscripciones con estos filtros.</p>'}
  </div>
  <p class="hint" style="margin-top:12px">Marca «No» en lo que no usas y lo sumaremos a tu ahorro. Pulsa una fila para ver el historial, alternativas y cómo darte de baja.</p>`;
}

function subModal(key) {
  const s = Data.analysis.subs.find(x => x.key === key); if (!s) return;
  const P = Data.state.prefs;
  modal(`<div style="display:flex;gap:14px;align-items:center;margin-bottom:18px">${logoSq(s.merchant, 48)}<div><h2 style="margin:0">${esc(s.merchant)}</h2><span class="hint">${E.CATS[s.cat].label} · ${E.CYCLE[s.cycle].label}</span></div></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px">
      <div class="card" style="padding:12px"><div class="hint" style="font-size:12px;font-weight:700">Cuota</div><b class="num">${fmt(s.amount)}</b></div>
      <div class="card" style="padding:12px"><div class="hint" style="font-size:12px;font-weight:700">Al año</div><b class="num">${fmt(s.monthly * 12)}</b></div>
      <div class="card" style="padding:12px"><div class="hint" style="font-size:12px;font-weight:700">Pagado</div><b class="num">${fmt(s.totalPaid)}</b></div>
    </div>
    ${s.priceUp ? `<div class="leak" style="padding:0 0 14px">${''}<span class="dot amber">${I.up}</span><div class="txt"><b>Subida de precio</b><p>De ${fmt(s.priceUp.from)} a ${fmt(s.priceUp.to)} desde el ${fmtDate(s.priceUp.date)}.</p></div></div>` : ''}
    <h4 style="margin-bottom:8px">Historial de cobros</h4>
    <div style="max-height:160px;overflow:auto;border:1px solid var(--line);border-radius:10px;margin-bottom:18px">
      ${[...s.history].reverse().map(c => `<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--line);font-size:14px"><span>${new Date(c.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span><b class="num">${fmt(c.amount)}${c.currency !== 'EUR' ? ` <span class="hint">(${c.original} ${c.currency})</span>` : ''}</b></div>`).join('')}
    </div>
    ${s.alts && s.alts.length ? `<h4 style="margin-bottom:4px">Alternativas</h4>${s.alts.map(altHTML).join('')}` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px">
      ${s.cancel ? `<a class="btn btn-dark btn-sm" href="${esc(s.cancel)}" target="_blank" rel="noopener">Cómo darse de baja ${I.arrow}</a>` : ''}
      <button class="btn btn-ghost btn-sm" id="m-cancel">${P.cancelled[key] ? 'Marcar como activa' : 'Ya la he cancelado'}</button>
      <button class="btn btn-ghost btn-sm" id="m-ignore">No es una suscripción</button>
    </div>`, (bg, close) => {
    $('#m-cancel', bg).onclick = () => { if (P.cancelled[key]) delete P.cancelled[key]; else P.cancelled[key] = Date.now(); Data.save('prefs'); close(); toast(P.cancelled[key] ? `${s.merchant} marcada como cancelada` : `${s.merchant} vuelve a estar activa`); route(); };
    $('#m-ignore', bg).onclick = () => { P.ignored[key] = true; Data.save('prefs'); close(); toast(`${s.merchant} ya no se tendrá en cuenta`); route(); };
  });
}
function altHTML(x) {
  return `<div class="alt-row"><div><b>${x.u ? `<a href="${esc(x.u)}" target="_blank" rel="noopener" style="border-bottom:1px solid var(--line-2)">${esc(x.n)}</a>` : esc(x.n)}</b><p>${esc(x.d)}</p></div>${x.u ? '<span class="free">Gratis</span>' : ''}</div>`;
}

/* ---------- Calendario ---------- */
function calendarHTML(a) {
  const now = new Date();
  if (!calMonth) calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const events = {};
  const push = (d, e) => { if (d.getFullYear() === y && d.getMonth() === m) (events[d.getDate()] = events[d.getDate()] || []).push(e); };
  for (const s of a.subs) {
    for (const c of s.history) push(c.date, { name: s.merchant, amount: c.amount, past: true });
    if (s.status !== 'activa') continue;
    let d = new Date(s.next), k = 0;
    while (d.getFullYear() * 12 + d.getMonth() <= y * 12 + m && k < 60) { if (d > now) push(d, { name: s.merchant, amount: s.amount, past: false }); d = addCyc(d, s.cycle); k++; }
  }
  const first = new Date(y, m, 1), start = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < start; i++) cells.push(`<div class="d out"></div>`);
  let monthTotal = 0;
  for (let d = 1; d <= days; d++) {
    const ev = events[d] || []; const tot = ev.reduce((x, e) => x + e.amount, 0); monthTotal += tot;
    const today = d === now.getDate() && m === now.getMonth() && y === now.getFullYear();
    cells.push(`<div class="d ${today ? 'today' : ''}"><span class="dn">${d}</span>${ev.slice(0, 3).map(e => `<div class="ev ${e.amount >= 40 ? 'big' : ''}" style="${e.past ? 'opacity:.55' : ''}" title="${esc(e.name)} · ${fmt(e.amount)}"><span>${esc(e.name)}</span><b class="num">${Math.round(e.amount)}€</b></div>`).join('')}${ev.length > 3 ? `<span class="hint" style="font-size:11px">+${ev.length - 3} más</span>` : ''}${tot ? `<span class="tot num">${fmt(tot)}</span>` : ''}</div>`);
  }
  while (cells.length % 7) cells.push(`<div class="d out"></div>`);
  const lbl = calMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }), label = lbl.charAt(0).toUpperCase() + lbl.slice(1);
  const up = a.upcoming;
  return topbar('Calendario de cobros', 'Cuándo te cobra cada suscripción', `<button class="btn btn-ghost btn-sm" id="cal-prev" aria-label="Mes anterior">←</button><b style="min-width:140px;text-align:center">${label}</b><button class="btn btn-ghost btn-sm" id="cal-next" aria-label="Mes siguiente">→</button>`) + `
  <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
    <div class="card kpi"><div class="l">Recurrentes este mes</div><div class="v num">${fmt(monthTotal)}</div></div>
    <div class="card kpi"><div class="l">Próximos 7 días</div><div class="v num">${fmt(up.filter(s => (s.next - now) / 864e5 <= 7).reduce((x, s) => x + s.amount, 0))}</div></div>
    <div class="card kpi"><div class="l">Próximos 30 días</div><div class="v num">${fmt(up.reduce((x, s) => x + s.amount, 0))}</div></div>
  </div>
  <div class="cal">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<div class="h">${d}</div>`).join('')}${cells.join('')}</div>
  <p class="hint" style="margin-top:10px">Los cobros pasados aparecen atenuados. En rojo, los de 40 € o más.</p>`;
}
function addCyc(d, c) { const r = new Date(d); if (c === 'yearly') r.setFullYear(r.getFullYear() + 1); else if (c === 'quarterly') r.setMonth(r.getMonth() + 3); else if (c === 'bimonthly') r.setMonth(r.getMonth() + 2); else if (c === 'weekly') r.setDate(r.getDate() + 7); else r.setMonth(r.getMonth() + 1); return r; }

/* ---------- Ahorro ---------- */
function savingsHTML(a) {
  const withAlts = a.active.filter(s => s.alts && s.alts.length).sort((x, y) => y.monthly - x.monthly);
  return topbar('Ahorro', 'Dónde se escapa tu dinero y cómo recuperarlo') + `
  <div class="card kpi hl" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
    <div><div class="l">Ahorro potencial</div><div class="v num" style="font-size:44px">${fmt0(a.totals.yearlyPotential)} <span style="font-size:18px;color:#B9B6C9">al año</span></div><div class="s">${fmt(a.totals.potential)} al mes si cierras todas las brechas</div></div>
    <a class="btn btn-green" href="#app-suscripciones">Revisar suscripciones</a>
  </div>
  <div class="card" id="ai-card" style="margin-bottom:16px">${aiAdviceHTML()}</div>
  <div class="grid-2">
    <div class="card"><h3>Todas las brechas <small>${a.leaks.length}</small></h3>${a.leaks.map(leakHTML).join('') || '<p class="hint">Sin brechas detectadas.</p>'}</div>
    <div class="card" style="align-self:start"><h3>Consejos para ti</h3>${a.tips.map(t => `<div class="tip"><span class="dot green">${I.leaf}</span><div><b>${esc(t.t)}</b><p>${esc(t.d)}</p></div></div>`).join('')}</div>
  </div>
  <h2 style="font-size:20px;letter-spacing:-.02em;margin:28px 0 14px">Alternativas a lo que pagas</h2>
  <div class="alts-grid">${withAlts.map(s => `<div class="alt-card"><div class="head">${logoSq(s.merchant)}<div><b>${esc(s.merchant)}</b><div class="hint">${E.CATS[s.cat].label}</div></div><div class="p num">${fmt(s.monthly)}<small>al mes</small></div></div>${s.alts.map(altHTML).join('')}</div>`).join('')}</div>`;
}

function aiAdviceHTML(loading) {
  const adv = Data.state.prefs.aiAdvice && Data.state.prefs.aiAdvice.text ? Data.state.prefs.aiAdvice : null;
  const head = `<h3><span style="display:flex;gap:8px;align-items:center">${I.spark} Tu análisis personalizado</span>${adv ? `<small>${fmtDate(adv.at)}</small>` : ''}</h3>`;
  if (!AI.available()) return head + `<p class="hint" style="font-size:15px">${Auth.user.demo ? 'Crea tu cuenta gratis para que la IA analice tus gastos y te diga por dónde empezar a ahorrar.' : 'Disponible con cuenta en horahflow.com.'}</p>`;
  if (loading) return head + `<p class="hint">Analizando tus gastos…</p><div class="progress" style="width:100%;margin-top:10px"><i style="width:60%"></i></div>`;
  if (adv) return head + `<div style="font-size:15px;line-height:1.7">${mdLite(adv.text)}</div><button class="btn btn-ghost btn-sm" id="ai-run" style="margin-top:14px">Actualizar análisis</button>`;
  return head + `<p class="hint" style="font-size:15px;margin-bottom:14px">La IA revisa tus suscripciones y gastos y te dice qué cambiar primero y cuánto ahorrarías.</p><button class="btn btn-dark btn-sm" id="ai-run">${I.spark} Generar mi análisis</button>`;
}
async function runAdvice() {
  const card = $('#ai-card'); card.innerHTML = aiAdviceHTML(true);
  try {
    const r = await AI.call({ action: 'advice', context: AI.context(Data.analysis) });
    if (!r || !r.advice) throw Object.assign(new Error('empty'), { code: 'ai_error' });
    Data.state.prefs.aiAdvice = { text: r.advice, at: Date.now() }; Data.save('prefs');
  } catch (e) {
    toast(e.code === 'limit' ? 'Has llegado al límite de análisis de hoy en tu plan.' : e.code === 'not_configured' ? 'La IA se está activando. Vuelve a probar en un rato.' : 'No se pudo generar el análisis. Inténtalo de nuevo.', 4500);
  }
  card.innerHTML = aiAdviceHTML(); $('#ai-run')?.addEventListener('click', runAdvice);
}

/* ---------- Gastos ---------- */
function allTx(a) {
  const recKeys = new Set(a.subs.map(s => s.key));
  return [...a.subs.flatMap(s => s.history.map(c => ({ ...c, kind: 'Suscripción' }))), ...a.oneoffs.map(c => ({ ...c, kind: recKeys.has(c.key) ? 'Suscripción' : 'Puntual' }))].sort((x, y) => y.date - x.date);
}
function txHTML(a) {
  const f = txFilter;
  const tx = allTx(a).filter(c => (!f.cat || c.cat === f.cat) && (!f.kind || c.kind === f.kind) && (!f.q || (c.merchant + ' ' + c.subject).toLowerCase().includes(f.q.toLowerCase())));
  const cats = [...new Set(a.charges.map(c => c.cat))];
  const total = tx.reduce((x, c) => x + c.amount, 0);
  return topbar('Gastos', `${tx.length} cargos · ${fmt(total)}`, `<button class="btn btn-ghost btn-sm" id="export">${I.upload} Exportar CSV</button>`) + `
  <div class="tools"><input class="input" id="tf-q" placeholder="Buscar comercio o asunto…" value="${esc(f.q)}">
    <select class="input" id="tf-cat"><option value="">Todas las categorías</option>${cats.map(c => `<option value="${c}" ${f.cat === c ? 'selected' : ''}>${E.CATS[c].label}</option>`).join('')}</select>
    <select class="input" id="tf-kind">${[['', 'Todos'], ['Suscripción', 'Suscripciones'], ['Puntual', 'Puntuales']].map(([v, l]) => `<option value="${v}" ${f.kind === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div class="card" style="padding:12px 10px"><table class="table"><thead><tr><th>Fecha</th><th>Comercio</th><th class="hide-m">Categoría</th><th class="hide-m">Tipo</th><th class="right">Importe</th></tr></thead><tbody>
  ${tx.slice(0, 300).map(c => `<tr><td class="num" style="white-space:nowrap">${new Date(c.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })}</td><td><b>${esc(c.merchant)}</b><div class="hint" style="font-size:12px;max-width:340px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.subject)}</div></td><td class="hide-m">${E.CATS[c.cat].label}</td><td class="hide-m"><span class="chip ${c.kind === 'Suscripción' ? '' : 'green'}">${c.kind}</span></td><td class="right"><b class="num">${fmt(c.amount)}</b></td></tr>`).join('')}
  </tbody></table>${tx.length > 300 ? `<p class="hint" style="padding:12px">Mostrando 300 de ${tx.length}. Exporta para verlos todos.</p>` : ''}</div>`;
}
function exportCSV() {
  if (!Auth.plan().export) { modal(`<h2>Exportar es de Pro</h2><p class="hint" style="font-size:15px;margin:8px 0 18px">Con Pro puedes exportar todos tus gastos a CSV para abrirlos en Excel o Google Sheets.</p><button class="btn btn-dark btn-block" data-buy="pro" data-close>Ver Pro</button>`); return; }
  const rows = [['Fecha', 'Comercio', 'Categoría', 'Tipo', 'Importe (EUR)', 'Importe original', 'Moneda', 'Asunto', 'Cuenta']];
  allTx(Data.analysis).forEach(c => rows.push([new Date(c.date).toISOString().slice(0, 10), c.merchant, E.CATS[c.cat].label, c.kind, c.amount.toFixed(2).replace('.', ','), String(c.original).replace('.', ','), c.currency, c.subject, c.account || '']));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
  download('horahflow-gastos.csv', csv);
  modal(`<h2>CSV listo</h2><p class="hint" style="font-size:15px;margin:8px 0 18px">Si la descarga no empieza, copia el contenido y pégalo en una hoja de cálculo.</p><button class="btn btn-dark btn-block" id="cp">${I.copy} Copiar CSV</button>`, bg => { $('#cp', bg).onclick = () => copyText(csv); });
}

/* ---------- Correos / fuentes ---------- */
const GMAIL_QUERY = 'subject:(recibo OR factura OR receipt OR invoice OR suscripción OR subscription OR renovación OR renewal OR "tu pedido" OR "your order" OR "confirmación de pago" OR "payment")';
const gmailSearch = q => 'https://mail.google.com/mail/u/0/#search/' + encodeURIComponent(q);
let fwdTab = null, guideOpen = null;
function guessProvider() {
  const d = ((Auth.user && Auth.user.email) || '').split('@')[1] || '';
  return /gmail|googlemail/.test(d) ? 'gmail' : /outlook|hotmail|live|msn/.test(d) ? 'outlook' : 'gmail';
}
const EXT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const gShot = (src, alt) => `<a class="g-shot" href="${src}" target="_blank" rel="noopener" title="Ver en grande"><img src="${src}" alt="${esc(alt)}" width="1100" height="620" loading="lazy" decoding="async"></a>`;

/** Pasos de conexión para una dirección: cada paso se marca solo cuando lo detectamos. */
function guideSteps(a) {
  const prov = fwdTab || guessProvider(), email = Inbound.email(a), months = Auth.plan().history;
  const seen = a.last_seen_at || a.last_received_at;
  const verified = !!(a.confirmed_at || (seen && (!a.verify_at || new Date(seen) > new Date(a.verify_at))));
  const waitingConfirm = !verified && !!a.verify_at;
  const filterDone = verified && (((Data.state.prefs.filterDone || {})[a.id]) || (a.received_count || 0) > (a.last_import_count || 0));
  const imported = !!a.last_import_at;
  const copyAddr = `<button class="btn btn-dark btn-sm" data-copy="${esc(email)}">${I.copy} Copiar mi dirección</button>`;
  const histQ = GMAIL_QUERY + ' newer_than:' + months + 'm';
  const more = Auth.plan().id === 'free' ? `<p class="g-up">${I.zap} Con <b>Pro</b> importas hasta 24 meses de historial. <button class="link" data-buy="pro">Pasar a Pro</button></p>` : '';
  const S = {
    gmail: [
      { t: 'Permite que Gmail te reenvíe', done: verified,
        d: waitingConfirm ? `<div class="g-alert"><b>Gmail te ha mandado la confirmación.</b> Pulsa el botón, luego «Confirmar» en la página de Google, y vuelve aquí.</div>
            <div class="g-btns">${a.verify_link ? `<a class="btn btn-green" href="${esc(a.verify_link)}" target="_blank" rel="noopener">Confirmar en Google ${EXT}</a>` : ''}${a.verify_code ? `<button class="btn btn-ghost btn-sm" data-copy="${esc(a.verify_code)}">Copiar código ${esc(a.verify_code)}</button>` : ''}<button class="btn btn-ghost btn-sm" data-verifydone="${a.id}">Ya lo he confirmado</button></div>`
          : `<p>Copia tu dirección, abre los ajustes de Gmail y pégala en <b>«Añadir una dirección de reenvío»</b>. En unos segundos verás aquí el botón para confirmarlo.</p>
            <div class="g-btns">${copyAddr}<a class="btn btn-ghost btn-sm" href="https://mail.google.com/mail/u/0/#settings/fwdandpop" target="_blank" rel="noopener">Abrir ajustes de Gmail ${EXT}</a></div>${gShot('/media/guia/g1.webp', 'Ajustes de Gmail: Reenvío, Añadir una dirección de reenvío, pegar la dirección y Siguiente')}<p class="g-wait"><span class="spin"></span>Esperando a Gmail…</p>` },
      { t: 'Elige qué se reenvía: solo recibos', done: filterDone,
        d: `<p>Abre Gmail con la búsqueda ya preparada, pulsa el icono de opciones de la barra, <b>«Crear filtro»</b>, marca <b>«Reenviarlo a»</b> con tu dirección y guarda. El resto de tu correo no sale de Gmail.</p>
            <div class="g-btns"><a class="btn btn-dark btn-sm" href="${gmailSearch(GMAIL_QUERY)}" target="_blank" rel="noopener">Abrir Gmail con la búsqueda ${EXT}</a><button class="btn btn-ghost btn-sm" data-copy="${esc(GMAIL_QUERY)}">${I.copy} Copiar búsqueda</button><button class="btn btn-ghost btn-sm" data-filterdone="${a.id}">Ya lo he hecho</button></div>${gShot('/media/guia/g2.webp', 'Gmail: opciones de búsqueda, Crear filtro, Reenviarlo a tu dirección y Crear filtro')}` },
      { t: `Trae tus recibos de los últimos ${months} meses`, done: imported, opt: true,
        d: `<p>Abre tus recibos de los últimos ${months} meses, selecciónalos todos y usa <b>⋮ → «Reenviar como archivo adjunto»</b> a tu dirección. En un minuto los verás aquí.</p>
            <div class="g-btns"><a class="btn btn-dark btn-sm" href="${gmailSearch(histQ)}" target="_blank" rel="noopener">Abrir mis recibos ${EXT}</a>${copyAddr.replace('btn-dark', 'btn-ghost')}</div>${gShot('/media/guia/g3.webp', 'Gmail: seleccionar todos, menú de tres puntos, Reenviar como archivo adjunto y enviar a tu dirección')}
            <p class="g-note">Solo funciona en Gmail desde el ordenador. Si tienes más de 50 recibos, repítelo en la página siguiente.</p>${more}` }
    ],
    outlook: [
      { t: 'Crea una regla de reenvío', done: verified || filterDone,
        d: `<p>En Outlook abre <b>Reglas → Agregar nueva regla</b>: si <b>el asunto incluye</b> «recibo», «factura», «receipt», «invoice» o «pedido», <b>reenviar a</b> tu dirección. Guarda y listo.</p>
            <div class="g-btns">${copyAddr}<a class="btn btn-ghost btn-sm" href="https://outlook.live.com/mail/0/options/mail/rules" target="_blank" rel="noopener">Abrir reglas de Outlook ${EXT}</a><button class="btn btn-ghost btn-sm" data-verifydone="${a.id}">Ya la he creado</button></div>${gShot('/media/guia/o1.webp', 'Outlook: nueva regla, el asunto incluye recibo o factura, reenviar a tu dirección y guardar')}` },
      { t: `Trae tus recibos de los últimos ${months} meses`, done: imported, opt: true,
        d: `<p>Busca «recibo» o «factura» en Outlook, selecciona los correos y pulsa <b>Reenviar</b>: Outlook los adjunta todos en un solo mensaje. Envíalo a tu dirección.</p>
            <div class="g-btns"><a class="btn btn-dark btn-sm" href="https://outlook.live.com/mail/0/" target="_blank" rel="noopener">Abrir Outlook ${EXT}</a>${copyAddr.replace('btn-dark', 'btn-ghost')}</div>${gShot('/media/guia/o2.webp', 'Outlook: seleccionar los recibos, Reenviar y enviar a tu dirección')}${more}` }
    ],
    other: [
      { t: 'Crea una regla de reenvío', done: verified || filterDone,
        d: `<p>En los ajustes de tu correo (iCloud, Yahoo, el de tu empresa…) busca <b>Reglas</b> o <b>Filtros</b> y crea una: si el asunto contiene «recibo» o «factura», <b>reenviar a</b> tu dirección.</p>
            <div class="g-btns">${copyAddr}<button class="btn btn-ghost btn-sm" data-verifydone="${a.id}">Ya la he creado</button></div>` },
      { t: 'Trae tu historial', done: imported, opt: true,
        d: `<p>Reenvía tus recibos antiguos a tu dirección (si tu correo deja «reenviar como adjunto», puedes mandar muchos de golpe) o sube un archivo .mbox/.eml más abajo.</p><div class="g-btns">${copyAddr}</div>${more}` }
    ]
  }[prov];
  const cur = S.findIndex(x => !x.done);
  const allDone = cur === -1 || (S.slice(cur).every(x => x.opt) && imported);
  const tabs = `<div class="tabs-mini" id="fwd-tabs">${[['gmail', 'Gmail'], ['outlook', 'Outlook · Hotmail'], ['other', 'Otro']].map(([k, l]) => `<button class="${prov === k ? 'on' : ''}" data-fwd="${k}">${l}</button>`).join('')}</div>`;
  const open = guideOpen == null ? !allDone : guideOpen;
  if (!open) return `<div class="g-done">${I.check}<div><b>Todo listo.</b> Tus recibos llegan solos.${imported ? ` Importamos ${a.last_import_count || 0} recibos de tu historial.` : ''}</div><button class="link" data-guide="1">Ver los pasos</button></div>`;
  return `${tabs}<ol class="gsteps">${S.map((x, i) => {
    const state = x.done ? 'done' : i === (cur < 0 ? S.length : cur) ? 'now' : 'next';
    const ok = x.done && i === S.length - 1 && imported ? `<span class="g-ok">${a.last_import_count || 0} recibos importados</span>` : '';
    return `<li class="g-step ${state}"><div class="g-num">${x.done ? I.check : i + 1}</div><div class="g-body"><button class="g-title" data-gstep="${i}"><b>${x.t}</b>${x.opt && !x.done ? '<span class="chip">Opcional</span>' : ''}${ok}</button>${state === 'now' || guideStep === i ? `<div class="g-content">${x.d}</div>` : ''}</div></li>`;
  }).join('')}</ol>${allDone ? '<button class="link" data-guide="0" style="margin-top:6px">Ocultar los pasos</button>' : ''}`;
}
let guideStep = null;

let _autoAddr = false;
function autoCreateAddr() {
  if (_autoAddr) return; _autoAddr = true;
  Inbound.create('Mi correo').then(() => route()).catch(err => { _autoAddr = false; toast(err.message, 4000); });
}
function addressRow(a) {
  const email = Inbound.email(a), st = Inbound.state(a), who = a.source_email || 'Tu correo';
  const seen = a.last_seen_at || a.last_received_at;
  const ST = {
    connected: ['green', 'Conectado', a.received_count ? `${a.received_count} ${a.received_count === 1 ? 'recibo' : 'recibos'} · último ${fmtDate(a.last_received_at || seen)}` : 'Conectado. Tus próximos recibos llegarán solos.'],
    pending: ['amber', 'Pendiente de confirmar', 'Confirma el reenvío en Google (paso 1).'],
    idle: ['red', 'Sin actividad', `No llega nada desde el ${fmtDate(seen)}. Revisa que el filtro de reenvío siga activo.`],
    none: ['grey', 'Sin conectar', 'Sigue los pasos de abajo: 2 minutos.'],
    paused: ['amber', 'Pausada', 'Supera el límite de direcciones de tu plan.'],
  }[st];
  const pill = `<span class="conn ${ST[0]}" title="${esc(ST[2])}"><i></i><b>${esc(who)}</b><span>· ${ST[1]}</span></span>`;
  const verify = '';
  return `<div class="addr${st === 'paused' ? ' off' : ''}"><div class="conn-row">${pill}<small class="conn-note">${esc(ST[2])}</small></div><div class="addr-top"><div class="addr-main"><b>${esc(a.label)}</b><div class="copyline"><code>${esc(email)}</code><button class="btn btn-dark btn-sm" data-copy="${esc(email)}">${I.copy} Copiar</button></div></div>
    <div class="addr-side"><div style="display:flex;gap:6px"><button class="btn btn-ghost btn-sm" data-rename="${a.id}">Renombrar</button><button class="btn btn-ghost btn-sm" data-deladdr="${a.id}" aria-label="Eliminar dirección">${I.x}</button></div></div></div>${verify}</div>`;
}
function sourcesHTML() {
  const plan = Auth.plan(), st = Data.state, cloud = Inbound.available() && !Auth.user.demo;
  const addrs = Inbound.addresses, used = addrs.length, canAdd = used < plan.mailboxes;
  const fwd = !cloud
    ? `<p class="hint" style="font-size:15px">${Auth.user.demo ? 'Crea tu cuenta gratis para tener tu dirección privada de reenvío.' : 'El reenvío automático necesita una cuenta en la nube.'}</p>${Auth.user.demo ? '<a class="btn btn-dark btn-sm" href="#registro">Crear cuenta gratis</a>' : ''}`
    : !Inbound.loaded ? '<p class="hint">Cargando tus direcciones…</p>'
    : !addrs.length ? (autoCreateAddr(), '<p class="hint"><span class="spin"></span> Creando tu dirección privada…</p>')
    : `${addrs.map(addressRow).join('')}
      ${addrs.some(x => Inbound.state(x) === 'connected') ? `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px">${canAdd ? `<button class="btn btn-${addrs.length ? 'ghost' : 'dark'} btn-sm" id="addr-new">+ ${addrs.length ? 'Otra dirección' : 'Crear mi dirección'}</button>` : `<span class="hint">Tu plan ${plan.name} incluye ${plan.mailboxes} ${plan.mailboxes === 1 ? 'dirección' : 'direcciones'}.</span>${plan.id !== 'business' ? `<button class="btn btn-dark btn-sm" data-buy="${plan.id === 'free' ? 'pro' : 'business'}">${plan.id === 'free' ? 'Pro: hasta 5 correos' : 'Empresas: hasta 25'}</button>` : ''}`}
      ${addrs.length ? '<button class="btn btn-ghost btn-sm" id="addr-sync">Comprobar ahora</button>' : ''}</div>` : ''}
      <div class="fwd-guide">${guideSteps(addrs.find(x => Inbound.state(x) !== 'connected') || addrs[0])}</div>`;
  return topbar('Correos', cloud ? `${used} de ${plan.mailboxes} ${plan.mailboxes === 1 ? 'dirección de reenvío' : 'direcciones de reenvío'} en tu plan ${plan.name} · archivos y texto pegado sin límite` : 'Conecta tus recibos') + `
  <div class="card fwd-card"><div class="fwd-head"><span class="dot green">${I.mail}</span><div><h3 style="margin:0">Conecta tu correo</h3>
    <p class="hint" style="font-size:15px;margin-top:4px">Tu correo reenvía a HorahFlow solo tus recibos y facturas. Sin contraseñas y sin acceso al resto de tus correos. Se hace una vez y tarda 2 minutos.</p></div></div>
    ${fwd}</div>
  <h3 class="sec-mini">Otras formas de añadir recibos</h3>
  <div class="connect-grid two">
    <div class="connect"><span class="dot gray">${I.upload}</span><h4>Subir archivos</h4><p>Correos .eml o un archivo .mbox (Google Takeout, Outlook, Apple Mail o Thunderbird). Ideal para traer tu historial de golpe.</p>
      <label class="btn btn-ghost btn-sm" for="c-file" style="cursor:pointer">Elegir archivos</label><input type="file" id="c-file" multiple accept=".eml,.mbox,.txt,message/rfc822" class="hidden"></div>
    <div class="connect"><span class="dot gray">${I.copy}</span><h4>Pegar recibos</h4><p>Copia el texto de uno o varios correos y pégalo. Útil para revisar algo rápido.</p><button class="btn btn-ghost btn-sm" id="c-paste">Pegar texto</button></div>
  </div>
  <div class="drop" id="drop">${I.upload}<div style="margin-top:6px">Arrastra aquí tus archivos .eml o .mbox</div></div>
  <div class="card" style="margin-top:16px"><h3>Fuentes <small>${st.emails.length} recibos guardados</small></h3>
    ${st.sources.length ? st.sources.map(s => `<div class="source"><span class="dot ${s.type === 'reenvio' ? 'green' : 'gray'}">${s.type === 'reenvio' ? I.mail : s.type === 'gmail' ? I.google : s.type === 'demo' ? I.spark : s.type === 'archivo' ? I.upload : I.copy}</span>
      <div class="info"><b>${esc(s.label)}</b><span>${esc(s.account || '')} · ${s.count} recibos · actualizado ${fmtDate(s.updated || s.added)}</span></div>
      <button class="btn btn-ghost btn-sm" data-remove="${s.id}">Quitar</button></div>`).join('') :
    `<p class="hint">Aún no hay recibos.${Auth.user.demo ? '' : ' <button class="link" id="load-demo">Cargar datos de ejemplo</button>'}</p>`}
  </div>
  <div class="card" style="margin-top:16px;display:flex;gap:14px;align-items:flex-start"><span class="dot green">${I.shield}</span><div><b>Cómo tratamos tus correos</b><p class="hint" style="font-size:14px;margin-top:2px">Nunca te pedimos la contraseña de tu correo ni del banco. Los correos reenviados que no son un cobro se descartan al llegar; los recibos esperan en nuestro servidor de la UE solo hasta que la app los importa (como mucho 60 días). Los archivos que subes se leen en tu navegador. De cada recibo guardamos solo el fragmento con el comercio, el importe y la fecha.</p></div></div>`;
}

function progressModal(title) {
  let setP;
  const close = modal(`<h2>${title}</h2><p class="hint" id="pm-t" style="margin:8px 0 14px">Preparando…</p><div class="progress" style="width:100%"><i id="pm-b"></i></div>`, bg => {
    setP = (done, total, txt) => { $('#pm-t', bg).textContent = txt + (total ? ` ${done}/${total}` : ''); $('#pm-b', bg).style.width = (total ? done / total * 100 : 15) + '%'; };
  });
  return { set: (...x) => setP(...x), close };
}

async function handleFiles(files) {
  if (!files.length) return;
  if (Auth.user.demo) { toast('Crea tu cuenta para subir tus propios correos'); return; }
  const account = 'Archivos subidos';
  const pm = progressModal('Leyendo archivos');
  try {
    pm.set(0, 0, 'Analizando…');
    const emails = await readFiles(files);
    const added = await Data.addEmails({ type: 'archivo', label: files.length === 1 ? files[0].name : `${files.length} archivos`, account }, emails, (d, t, txt) => pm.set(d, t, txt));
    pm.close();
    toast(added ? `${added} recibos encontrados en ${emails.length} correos` : `No hemos encontrado recibos en ${emails.length} correos`, 3500);
    if (added) location.hash = 'app'; else route();
  } catch (e) { pm.close(); toast('No se pudo leer el archivo: ' + e.message, 4000); }
}

function pasteModal() {
  if (Auth.user.demo) { toast('Crea tu cuenta para añadir tus propios recibos'); return; }
  modal(`<h2>Pegar recibos</h2><p class="hint" style="margin:6px 0 14px">Pega uno o varios correos. Separa cada uno con una línea <b>---</b>. Si incluyes las líneas «De:», «Asunto:» y «Fecha:» el análisis será más preciso.</p>
    <textarea class="input" id="p-txt" placeholder="De: Netflix <info@netflix.com>&#10;Asunto: Tu recibo&#10;Fecha: 05/11/2026&#10;Total: 13,99 €&#10;---&#10;De: Spotify…"></textarea>
    <button class="btn btn-dark btn-block" id="p-go" style="margin-top:14px">Analizar</button>`, (bg, close) => {
    $('#p-go', bg).onclick = async () => {
      const txt = $('#p-txt', bg).value.trim(); if (!txt) return;
      const account = 'Recibos pegados';
      $('#p-go', bg).disabled = true; $('#p-go', bg).textContent = 'Analizando…';
      const added = await Data.addEmails({ type: 'pegado', label: 'Texto pegado', account }, E.parsePasted(txt));
      close(); toast(added ? `${added} recibos añadidos` : 'No hemos encontrado importes en el texto', 3500); route();
    };
  });
}

/* ---------- Ajustes ---------- */
function settingsHTML() {
  const u = Auth.user, plan = Auth.plan(), P = Data.state.prefs;
  return topbar('Ajustes', '') + `<div style="display:grid;gap:16px;max-width:760px">
  <div class="card"><h3>Perfil</h3><form id="s-prof" style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end">
    <div class="field" style="margin:0"><label for="s-name">Nombre</label><input class="input" id="s-name" value="${esc(u.name)}" ${u.demo ? 'disabled' : ''}></div>
    <button class="btn btn-dark" ${u.demo ? 'disabled' : ''}>Guardar</button></form><p class="hint" style="margin-top:10px">Correo de la cuenta: ${esc(u.email)}</p></div>
  <div class="card"><h3>Plan <span class="chip ${plan.id === 'free' ? '' : 'green'}">${plan.name}${u.planTest ? ' · prueba' : ''}</span></h3>
    <p class="hint" style="font-size:15px;margin-bottom:14px">${plan.mailboxes} ${plan.mailboxes === 1 ? 'correo' : 'correos'} · ${plan.history} meses de historial · ${plan.alerts ? 'avisos activados' : 'sin avisos'} · ${plan.export ? 'exportación CSV' : 'sin exportación'}</p>
    ${u.planEnd && plan.id !== 'free' ? `<p class="hint" style="margin:-6px 0 14px">${u.planStatus === 'canceled' ? 'Termina' : 'Se renueva'} el ${new Date(u.planEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>` : ''}
    <div style="display:flex;gap:8px;flex-wrap:wrap">${plan.id === 'free' ? '<button class="btn btn-dark btn-sm" data-buy="pro">Pasar a Pro</button><button class="btn btn-ghost btn-sm" data-buy="business">Plan Empresas</button>' : ''}
    ${u.cloud && (u.customer || plan.id !== 'free') && CFG.stripe.portal ? `<a class="btn btn-ghost btn-sm" href="${esc(CFG.stripe.portal + '?prefilled_email=' + encodeURIComponent(u.email))}" target="_blank" rel="noopener">Gestionar suscripción y facturas</a>` : ''}
    ${!u.cloud && plan.id !== 'free' && !u.demo ? '<button class="btn btn-ghost btn-sm" id="s-down">Volver a Gratis</button>' : ''}</div></div>
  <div class="card"><h3>Avisos por correo ${plan.alerts ? '' : '<span class="chip">Pro</span>'}</h3>
    ${plan.alerts && !u.demo ? `<p class="hint" style="font-size:15px;margin-bottom:14px">Te escribimos a <b>${esc(u.email)}</b> por la mañana, solo cuando hay algo que ver.</p>
    <label class="switch-row"><input type="checkbox" id="s-alerts" ${P.emailAlerts !== false ? 'checked' : ''}><span><b>Antes de cada cobro y cuando detectemos una fuga</b><small>Duplicados, subidas de precio y pruebas que pasan a pago.</small></span></label>
    <label class="switch-row"><span style="flex:1"><b>Avisarme</b><small>Antelación del aviso de cada cobro.</small></span><select class="input" id="s-days" style="width:auto;height:38px">${[1, 2, 3, 5, 7].map(d => `<option ${P.alertDays === d ? 'selected' : ''} value="${d}">${d} ${d === 1 ? 'día' : 'días'} antes</option>`).join('')}</select></label>
    <label class="switch-row"><input type="checkbox" id="s-digest" ${P.monthlyDigest !== false ? 'checked' : ''}><span><b>Resumen mensual</b><small>El día 1 de cada mes: lo que pagas, lo más caro y lo que puedes ahorrar.</small></span></label>`
    : `<p class="hint" style="font-size:15px;margin-bottom:14px">Con Pro te avisamos por correo unos días antes de cada cobro, cuando una suscripción sube de precio o te cobran dos veces, y te mandamos un resumen cada mes.</p>${u.demo ? '<a class="btn btn-dark btn-sm" href="#registro">Crear cuenta</a>' : '<button class="btn btn-dark btn-sm" data-buy="pro">Pasar a Pro</button>'}`}</div>
  <div class="card"><h3>Tutorial</h3><p class="hint" style="font-size:15px;margin-bottom:12px">Repasa en un minuto qué hace cada apartado de HorahFlow.</p><button class="btn btn-ghost btn-sm" id="s-tour">Ver tutorial de nuevo</button></div>
  <div class="card"><h3>Privacidad y datos</h3>
    <p class="hint" style="font-size:15px;margin-bottom:14px">${u.cloud ? `Guardamos ${Data.state.emails.length} fragmentos de recibos (comercio, importe y fecha) en tu cuenta, para verlos desde cualquier dispositivo. Nunca guardamos tus correos completos.` : `Tus recibos se guardan solo en este navegador (${Data.state.emails.length} recibos).`} ${Store.persistent || u.cloud ? '' : '<b>Este navegador no permite guardar datos: se perderán al cerrar la página.</b>'}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" id="s-wipe">Borrar todos mis recibos</button>${u.demo ? '' : '<button class="btn btn-ghost btn-sm" id="s-del" style="color:var(--red)">Eliminar mi cuenta</button>'}<button class="btn btn-ghost btn-sm" id="s-out">${I.out} Cerrar sesión</button></div></div>
  </div>`;
}

function confirmModal(title, text, label, fn) {
  modal(`<h2>${title}</h2><p class="hint" style="font-size:15px;margin:8px 0 20px">${text}</p><div style="display:flex;gap:8px"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="cf-ok" style="background:var(--red)">${label}</button></div>`,
    (bg, close) => { $('#cf-ok', bg).onclick = () => { close(); fn(); }; });
}

/* ---------- Eventos ---------- */
function bindAppView(view) {
  $('#load-demo')?.addEventListener('click', async () => { await Data.addEmails({ type: 'demo', label: 'Bandeja de ejemplo', account: 'demo@horahflow.com' }, E.demoInbox()); toast('Datos de ejemplo cargados'); location.hash = 'app'; route(); });
  $$('[data-sub]').forEach(r => r.addEventListener('click', e => { if (e.target.closest('.seg')) return; subModal(r.dataset.sub); }));
  $$('[data-usage]').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; e.stopPropagation();
    const k = seg.dataset.usage, P = Data.state.prefs; P.usage[k] = P.usage[k] === b.dataset.v ? null : b.dataset.v; Data.save('prefs');
    const y = window.scrollY; route(); window.scrollTo(0, y);
    if (P.usage[k] === 'no') toast('Lo sumamos a tu ahorro potencial');
  }));
  const ask = $('#ask');
  if (ask) {
    const paint = () => { const c = $('#chat'); if (!c) return; c.innerHTML = chatLog.map(m => `<div class="msg ${m.r}">${m.t}</div>`).join(''); c.scrollTop = c.scrollHeight; };
    let busy = false;
    const go = async q => {
      if (!q.trim() || busy) return;
      busy = true; $('#ask-q').value = '';
      chatLog.push({ r: 'u', t: esc(q) });
      if (AI.available()) {
        const thinking = { r: 'a', t: '<span class="hint">Pensando…</span>' }; chatLog.push(thinking); paint();
        try { const r = await AI.call({ action: 'ask', question: q, context: AI.context(Data.analysis) }); if (!r || !r.answer) throw Object.assign(new Error('empty'), { code: 'ai_error' }); thinking.t = mdLite(r.answer); }
        catch (e) { thinking.t = (e.code === 'limit' ? '<span class="hint">Has usado todas las preguntas a la IA de hoy en tu plan. Te respondo con lo básico:</span><br>' : '') + flowAnswer(q); }
      } else chatLog.push({ r: 'a', t: flowAnswer(q) });
      chatLog = chatLog.slice(-10); paint(); busy = false;
    };
    ask.onsubmit = e => { e.preventDefault(); go($('#ask-q').value); };
    $$('.suggest button').forEach(b => b.onclick = () => go(b.dataset.q));
  }
  const live = (id, obj, key, v) => { const el = $(id); if (!el) return; el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { obj[key] = el.value; const pos = el.selectionStart; route(); const n = $(id); if (n && n.tagName === 'INPUT') { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } }); };
  live('#sf-q', subFilter, 'q'); live('#sf-cat', subFilter, 'cat'); live('#sf-status', subFilter, 'status');
  live('#tf-q', txFilter, 'q'); live('#tf-cat', txFilter, 'cat'); live('#tf-kind', txFilter, 'kind');
  $('#cal-prev')?.addEventListener('click', () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); route(); });
  $('#cal-next')?.addEventListener('click', () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); route(); });
  $('#export')?.addEventListener('click', exportCSV);
  $('#ai-run')?.addEventListener('click', runAdvice);
  $$('[data-copy]').forEach(b => b.onclick = async e => { e.preventDefault(); try { await navigator.clipboard.writeText(b.dataset.copy); toast('Copiado'); } catch { prompt('Copia este texto:', b.dataset.copy); } });
  const reGuide = () => { const y = scrollY; route(); scrollTo(0, y); };
  $$('[data-fwd]').forEach(b => b.onclick = () => { fwdTab = b.dataset.fwd; guideStep = null; reGuide(); });
  $$('[data-gstep]').forEach(b => b.onclick = () => { const i = +b.dataset.gstep; guideStep = guideStep === i ? null : i; reGuide(); });
  $$('[data-guide]').forEach(b => b.onclick = () => { guideOpen = b.dataset.guide === '1'; reGuide(); });
  $$('[data-filterdone]').forEach(b => b.onclick = () => { Data.state.prefs.filterDone = { ...(Data.state.prefs.filterDone || {}), [b.dataset.filterdone]: Date.now() }; Data.save('prefs'); toast('¡Perfecto! Tus recibos nuevos llegarán solos.', 4000); reGuide(); });
  if (view === 'app-correos') Inbound.fastWatch(changed => { if (location.hash === '#app-correos' && !document.querySelector('.modal-bg')) reGuide(); if (changed && changed.imported) toast(`¡Listo! Hemos importado ${changed.imported} recibos de tu historial.`, 6000); });
  else Inbound.fastWatch(null);
  $('#addr-new')?.addEventListener('click', e => {
    const first = !Inbound.addresses.length;
    modal(`<h2>${first ? 'Tu dirección de reenvío' : 'Nueva dirección'}</h2><p class="hint" style="font-size:15px;margin:6px 0 14px">Ponle un nombre para reconocer de qué correo vienen los recibos.</p>
      <form id="an-f"><div class="field"><label for="an-l">Nombre</label><input class="input" id="an-l" maxlength="40" value="${first ? 'Mi correo' : ''}" placeholder="Gmail personal, trabajo…" required></div><button class="btn btn-dark btn-block" id="an-b">Crear dirección</button><p class="err" id="an-e"></p></form>`,
      (bg, close) => { $('#an-l', bg).focus(); $('#an-f', bg).onsubmit = async ev => { ev.preventDefault(); const btn = $('#an-b', bg); btn.disabled = true;
        try { await Inbound.create($('#an-l', bg).value); close(); toast('Dirección creada. Cópiala y configura el reenvío.'); route(); }
        catch (err) { $('#an-e', bg).textContent = err.message; btn.disabled = false; } }; });
  });
  $('#addr-sync')?.addEventListener('click', async e => { const b = e.currentTarget; b.disabled = true; b.textContent = 'Comprobando…'; await Inbound.load().catch(() => {}); const n = await Inbound.sync(); toast(n ? `${n} recibos nuevos importados` : 'No hay recibos nuevos todavía'); route(); });
  $$('[data-verifydone]').forEach(b => b.onclick = async () => { b.disabled = true;
    try { await Inbound.confirm(b.dataset.verifydone); toast('¡Hecho! Siguiente paso.', 3000); const y = scrollY; route(); scrollTo(0, y); }
    catch (err) { b.disabled = false; toast(err.message, 4000); } });
  $$('[data-rename]').forEach(b => b.onclick = () => { const a = Inbound.addresses.find(x => x.id === b.dataset.rename); if (!a) return;
    modal(`<h2>Renombrar</h2><form id="rn-f"><div class="field"><label for="rn-l">Nombre</label><input class="input" id="rn-l" maxlength="40" value="${esc(a.label)}" required></div><button class="btn btn-dark btn-block">Guardar</button></form>`,
      (bg, close) => { $('#rn-f', bg).onsubmit = async ev => { ev.preventDefault(); try { await Inbound.rename(a.id, $('#rn-l', bg).value); close(); route(); } catch (err) { toast(err.message, 4000); } }; }); });
  $$('[data-deladdr]').forEach(b => b.onclick = () => confirmModal('¿Eliminar esta dirección?', 'Dejará de recibir recibos al momento. Quita también la regla de reenvío de tu correo. Los recibos que ya importaste se quedan en tu cuenta.', 'Eliminar', async () => { try { await Inbound.remove(b.dataset.deladdr); toast('Dirección eliminada'); route(); } catch (err) { toast(err.message, 4000); } }));
  $('#c-paste')?.addEventListener('click', pasteModal);
  $('#c-file')?.addEventListener('change', e => handleFiles([...e.target.files]));
  const drop = $('#drop');
  if (drop) {
    drop.onclick = () => $('#c-file').click();
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => handleFiles([...e.dataTransfer.files]));
  }
  $$('[data-remove]').forEach(b => b.onclick = () => confirmModal('¿Quitar esta fuente?', 'Se borrarán los recibos que vienen de ella. Puedes volver a conectarla cuando quieras.', 'Quitar', () => { Data.removeSource(b.dataset.remove); toast('Fuente eliminada'); route(); }));
  $('#s-prof')?.addEventListener('submit', e => { e.preventDefault(); Auth.update({ name: $('#s-name').value.trim() || Auth.user.name }); toast('Perfil guardado'); route(); });
  $('#s-days')?.addEventListener('change', e => { Data.state.prefs.alertDays = +e.target.value; Data.save('prefs'); toast('Avisos actualizados'); });
  $('#s-alerts')?.addEventListener('change', e => { Data.state.prefs.emailAlerts = e.target.checked; Data.save('prefs'); toast(e.target.checked ? 'Avisos por correo activados' : 'Avisos por correo desactivados'); });
  $('#s-digest')?.addEventListener('change', e => { Data.state.prefs.monthlyDigest = e.target.checked; Data.save('prefs'); toast(e.target.checked ? 'Resumen mensual activado' : 'Resumen mensual desactivado'); });
  $('#s-down')?.addEventListener('click', () => { Auth.update({ plan: 'free', planTest: false }); toast('Has vuelto al plan Gratis'); route(); });
  $('#s-wipe')?.addEventListener('click', () => confirmModal('¿Borrar todos tus recibos?', 'Se eliminarán todos los recibos y fuentes guardados en este navegador. Tu cuenta seguirá activa.', 'Borrar', () => { Data.wipe(); toast('Datos borrados'); route(); }));
  $('#s-del')?.addEventListener('click', () => confirmModal('¿Eliminar tu cuenta?', 'Se borrarán tu cuenta y todos tus datos. Si tienes una suscripción, cancélala antes desde «Gestionar suscripción». No se puede deshacer.', 'Eliminar cuenta', async () => { try { await Auth.remove(); location.hash = 'inicio'; toast('Cuenta eliminada'); } catch (e) { toast('No se pudo eliminar: ' + e.message, 4000); } }));
  $('#s-out')?.addEventListener('click', () => { Auth.logout(); location.hash = 'inicio'; });
  $('#s-tour')?.addEventListener('click', () => Tour.start());
}

/* ---------- Enrutado ---------- */
const root = document.getElementById('root');
function route() {
  const h = (location.hash || '#inicio').slice(1);
  document.title = 'HorahFlow · Controla tus suscripciones y gastos desde tu correo';
  if (h.startsWith('app')) {
    if (!Auth.user) { location.hash = 'entrar'; return; }
    if (h === 'app-correos' && Auth.user.demo) { /* permitido: muestra opciones */ }
    renderApp(h); document.title = (TABS.find(t => t[0] === h) || TABS[0])[1] + ' · HorahFlow'; return;
  }
  if (Auth.user && Auth.user.demo && !h.startsWith('app')) Auth.exitDemo();
  if (h === 'pago-ok') return paymentReturn();
  if (h === 'confirmado') return renderConfirmed();
  // El blog y los textos legales son páginas reales (mejor para Google); los enlaces antiguos con # redirigen
  if (h === 'blog') { location.replace('/blog/'); return; }
  if (h.startsWith('blog-')) { location.replace('/blog/' + h.slice(5) + '/'); return; }
  if (['privacidad', 'cookies', 'terminos', 'aviso-legal'].includes(h) && /^https?:/.test(location.protocol)) { location.replace('/' + (h === 'terminos' ? 'condiciones' : h) + '/'); return; }
  if (h === 'entrar' || h === 'registro') { if (Auth.user && !Auth.user.demo) { location.hash = 'app'; return; } return renderAuth(h); }
  if (['privacidad', 'terminos', 'cookies', 'aviso-legal'].includes(h)) return renderLegal(h);
  const scroll = { demo: 'demo-sec', precios: 'precios-sec', 'como-funciona': 'como-funciona-sec' }[h];
  renderLanding(scroll);
}

document.addEventListener('click', onBuyClick);
root.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center"><div class="progress"><i style="width:40%"></i></div></div>';
Auth.init().catch(e => console.warn(e)).finally(() => { window.addEventListener('hashchange', route); route(); });

function renderConfirmed() {
  const st = Auth.confirmState || (Auth.user ? 'ok' : 'ok-nosession');
  const ok = st !== 'used';
  root.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--soft)">
    <div class="card fade-in" style="max-width:440px;width:100%;text-align:center;padding:40px 28px">
      <img src="${LOGO}" alt="HorahFlow" style="height:28px;width:auto;margin:0 auto 28px">
      <span class="dot green" style="width:64px;height:64px;border-radius:50%;margin:0 auto 18px">${svg('<path d="M20 6 9 17l-5-5"/>', 30)}</span>
      <h1 style="font-size:28px;letter-spacing:-.03em;margin-bottom:8px">${ok ? '¡Cuenta confirmada!' : 'Tu cuenta ya estaba confirmada'}</h1>
      <p class="hint" style="font-size:16px;margin-bottom:26px">${st === 'ok' ? `Todo listo${Auth.user ? ', ' + esc(Auth.user.name.split(' ')[0]) : ''}. Ya puedes descubrir a dónde se va tu dinero.`
        : st === 'ok-nosession' ? 'Todo listo. Entra con tu correo y contraseña para empezar.'
        : 'Este enlace ya se había usado. Entra con tu correo y contraseña.'}</p>
      <a class="btn btn-dark btn-block" href="#${Auth.user ? 'app-correos' : 'entrar'}">${Auth.user ? 'Ir a HorahFlow' : 'Entrar en HorahFlow'} ${I.arrow}</a>
    </div></div>`;
  window.scrollTo(0, 0);
}

async function paymentReturn() {
  if (!Auth.user) { location.hash = 'entrar'; return; }
  location.hash = 'app-ajustes';
  toast('Pago recibido. Activando tu plan…', 4000);
  for (let i = 0; i < 8; i++) {
    await new Promise(r => setTimeout(r, 2500));
    await Auth.refreshProfile();
    if (Auth.plan().id !== 'free') { toast(`¡Plan ${Auth.plan().name} activado! Gracias por apoyar HorahFlow.`, 4000); route(); return; }
  }
  toast('Tu pago está procesándose. El plan se activará en unos minutos.', 5000);
}
