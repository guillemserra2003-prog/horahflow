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
        plan.id === 'free' ? `<div class="plan-box"><b>Plan Gratis</b><p class="hint" style="margin:4px 0 10px">Conecta hasta 5 correos y recibe avisos antes de cada cobro.</p><button class="btn btn-dark btn-sm btn-block" data-buy="pro">Pasar a Pro</button></div>` :
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
  bindAppView(view);
  window.scrollTo(0, 0);
}

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
    $('#m-cancel', bg).onclick = () => { if (P.cancelled[key]) delete P.cancelled[key]; else P.cancelled[key] = Date.now(); Data.save(); close(); toast(P.cancelled[key] ? `${s.merchant} marcada como cancelada` : `${s.merchant} vuelve a estar activa`); route(); };
    $('#m-ignore', bg).onclick = () => { P.ignored[key] = true; Data.save(); close(); toast(`${s.merchant} ya no se tendrá en cuenta`); route(); };
  });
}
function altHTML(x) {
  return `<div class="alt"><div><b>${x.u ? `<a href="${esc(x.u)}" target="_blank" rel="noopener" style="border-bottom:1px solid var(--line-2)">${esc(x.n)}</a>` : esc(x.n)}</b><p>${esc(x.d)}</p></div>${x.u ? '<span class="free">Gratis</span>' : ''}</div>`;
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
  <div class="grid-2">
    <div class="card"><h3>Todas las brechas <small>${a.leaks.length}</small></h3>${a.leaks.map(leakHTML).join('') || '<p class="hint">Sin brechas detectadas.</p>'}</div>
    <div class="card" style="align-self:start"><h3>Consejos para ti</h3>${a.tips.map(t => `<div class="tip"><span class="dot green">${I.leaf}</span><div><b>${esc(t.t)}</b><p>${esc(t.d)}</p></div></div>`).join('')}</div>
  </div>
  <h2 style="font-size:20px;letter-spacing:-.02em;margin:28px 0 14px">Alternativas a lo que pagas</h2>
  <div class="alts-grid">${withAlts.map(s => `<div class="alt-card"><div class="head">${logoSq(s.merchant)}<div><b>${esc(s.merchant)}</b><div class="hint">${E.CATS[s.cat].label}</div></div><div class="p num">${fmt(s.monthly)}<small>al mes</small></div></div>${s.alts.map(altHTML).join('')}</div>`).join('')}</div>`;
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
function sourcesHTML() {
  const plan = Auth.plan(), used = Data.mailboxCount();
  const st = Data.state;
  return topbar('Correos conectados', `${used} de ${plan.mailboxes} ${plan.mailboxes === 1 ? 'cuenta de Gmail' : 'cuentas de Gmail'} en tu plan ${plan.name} · archivos y texto pegado sin límite`) + `
  <div class="connect-grid">
    <div class="connect"><span class="dot gray">${I.google}</span><h4>Gmail</h4><p>Inicia sesión con Google y danos permiso de solo lectura. Buscamos recibos de los últimos 2 años.</p><button class="btn btn-dark btn-sm" id="c-gmail">Conectar Gmail</button></div>
    <div class="connect"><span class="dot gray">${I.upload}</span><h4>Subir archivos</h4><p>Correos .eml o un archivo .mbox (Google Takeout, Outlook, Apple Mail o Thunderbird).</p>
      <label class="btn btn-ghost btn-sm" for="c-file" style="cursor:pointer">Elegir archivos</label><input type="file" id="c-file" multiple accept=".eml,.mbox,.txt,message/rfc822" class="hidden"></div>
    <div class="connect"><span class="dot gray">${I.copy}</span><h4>Pegar recibos</h4><p>Copia el texto de uno o varios correos y pégalo. Útil para Outlook, Yahoo o cualquier otro.</p><button class="btn btn-ghost btn-sm" id="c-paste">Pegar texto</button></div>
  </div>
  <div class="drop" id="drop">${I.upload}<div style="margin-top:6px">Arrastra aquí tus archivos .eml o .mbox</div></div>
  <div class="card" style="margin-top:16px"><h3>Fuentes <small>${st.emails.length} recibos guardados</small></h3>
    ${st.sources.length ? st.sources.map(s => `<div class="source"><span class="dot ${s.type === 'gmail' ? 'green' : 'gray'}">${s.type === 'gmail' ? I.google : s.type === 'demo' ? I.spark : s.type === 'archivo' ? I.upload : I.copy}</span>
      <div class="info"><b>${esc(s.label)}</b><span>${esc(s.account || '')} · ${s.count} recibos · actualizado ${fmtDate(s.updated || s.added)}</span></div>
      ${s.type === 'gmail' ? `<button class="btn btn-ghost btn-sm" data-resync="${s.id}">Sincronizar</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-remove="${s.id}">Quitar</button></div>`).join('') :
    `<p class="hint">Aún no has conectado ningún correo.${Auth.user.demo ? '' : ' <button class="link" id="load-demo">Cargar datos de ejemplo</button>'}</p>`}
  </div>
  <div class="card" style="margin-top:16px;display:flex;gap:14px;align-items:flex-start"><span class="dot green">${I.shield}</span><div><b>Tu correo se lee en tu dispositivo</b><p class="hint" style="font-size:14px;margin-top:2px">El análisis se hace en tu navegador. De cada recibo solo guardamos el fragmento con el comercio, el importe y la fecha; el resto del correo nunca sale de tu dispositivo. El permiso de Gmail se usa para la lectura y se revoca al terminar; puedes retirarlo también en <a class="link" href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">tu cuenta de Google</a>.</p></div></div>`;
}

function canAddMailbox(account) {
  const plan = Auth.plan();
  const existing = Data.state.sources.some(s => s.account && s.account === account);
  if (existing || Data.mailboxCount() < plan.mailboxes) return true;
  modal(`<h2>Has llegado al límite de tu plan</h2><p class="hint" style="font-size:15px;margin:8px 0 18px">El plan ${plan.name} permite ${plan.mailboxes} ${plan.mailboxes === 1 ? 'correo' : 'correos'}. Con Pro puedes conectar hasta 5 (personal, trabajo, compras…).</p><button class="btn btn-dark btn-block" data-buy="pro" data-close>Pasar a Pro</button>`);
  return false;
}

function progressModal(title) {
  let setP;
  const close = modal(`<h2>${title}</h2><p class="hint" id="pm-t" style="margin:8px 0 14px">Preparando…</p><div class="progress" style="width:100%"><i id="pm-b"></i></div>`, bg => {
    setP = (done, total, txt) => { $('#pm-t', bg).textContent = txt + (total ? ` ${done}/${total}` : ''); $('#pm-b', bg).style.width = (total ? done / total * 100 : 15) + '%'; };
  });
  return { set: (...x) => setP(...x), close };
}

async function connectGmail() {
  if (Auth.user.demo) { modal(`<h2>Crea tu cuenta para conectar Gmail</h2><p class="hint" style="font-size:15px;margin:8px 0 18px">En la demo usamos datos de ejemplo. Con tu cuenta gratuita analizamos tu propio correo.</p><a class="btn btn-dark btn-block" href="#registro" data-close>Crear cuenta gratis</a>`); return; }
  if (!CFG.googleClientId) {
    modal(`<h2>Conexión con Gmail pendiente de activar</h2>
      <p class="hint" style="font-size:15px;margin:8px 0 14px">Esta instalación aún no tiene configurado el acceso a Google. Mientras tanto puedes analizar tu Gmail igual de bien exportando tus recibos:</p>
      <ol style="margin:0 0 18px 20px;font-size:15px;line-height:1.8"><li>Entra en <a class="link" href="https://takeout.google.com/" target="_blank" rel="noopener">Google Takeout</a> y marca solo «Correo».</li><li>Elige «Todos los datos de correo» o solo una etiqueta (por ejemplo, Recibos).</li><li>Descarga el archivo <b>.mbox</b> y súbelo aquí.</li></ol>
      <label class="btn btn-dark btn-block" for="c-file" data-close style="cursor:pointer">Subir archivo .mbox</label>`);
    return;
  }
  const pm = progressModal('Conectando con Gmail');
  try {
    const r = await Gmail.connect((d, t, txt) => pm.set(d, t, txt));
    pm.close();
    if (!canAddMailbox(r.account)) return;
    const added = Data.addEmails({ type: 'gmail', label: 'Gmail', account: r.account }, r.emails);
    toast(`${r.account}: ${added} recibos nuevos`); location.hash = 'app';
  } catch (e) { pm.close(); toast(e.message || 'No se pudo conectar con Gmail', 4000); }
}

async function handleFiles(files) {
  if (!files.length) return;
  if (Auth.user.demo) { toast('Crea tu cuenta para subir tus propios correos'); return; }
  const account = 'Archivos subidos';
  const pm = progressModal('Leyendo archivos');
  try {
    pm.set(0, 0, 'Analizando…');
    const emails = await readFiles(files);
    const added = Data.addEmails({ type: 'archivo', label: files.length === 1 ? files[0].name : `${files.length} archivos`, account }, emails);
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
    $('#p-go', bg).onclick = () => {
      const txt = $('#p-txt', bg).value.trim(); if (!txt) return;
      const account = 'Recibos pegados';
      const added = Data.addEmails({ type: 'pegado', label: 'Texto pegado', account }, E.parsePasted(txt));
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
    ${u.cloud && u.customer && CFG.stripe.portal ? `<a class="btn btn-ghost btn-sm" href="${esc(CFG.stripe.portal + '?prefilled_email=' + encodeURIComponent(u.email))}" target="_blank" rel="noopener">Gestionar suscripción y facturas</a>` : ''}
    ${!u.cloud && plan.id !== 'free' && !u.demo ? '<button class="btn btn-ghost btn-sm" id="s-down">Volver a Gratis</button>' : ''}</div></div>
  <div class="card"><h3>Avisos de cobro ${plan.alerts ? '' : '<span class="chip">Pro</span>'}</h3>
    <p class="hint" style="font-size:15px;margin-bottom:12px">Te marcamos en el panel cada cobro que llega en los próximos días para que decidas a tiempo.</p>
    <label style="display:flex;gap:10px;align-items:center;font-weight:600">Avisar <select class="input" id="s-days" style="width:auto;height:38px" ${plan.alerts ? '' : 'disabled'}>${[1, 3, 5, 7].map(d => `<option ${P.alertDays === d ? 'selected' : ''} value="${d}">${d} ${d === 1 ? 'día' : 'días'}</option>`).join('')}</select> antes de cada cobro</label></div>
  <div class="card"><h3>Privacidad y datos</h3>
    <p class="hint" style="font-size:15px;margin-bottom:14px">${u.cloud ? `Guardamos ${Data.state.emails.length} fragmentos de recibos (comercio, importe y fecha) cifrados en tu cuenta, para verlos desde cualquier dispositivo. Nunca guardamos tus correos completos.` : `Tus recibos se guardan solo en este navegador (${Data.state.emails.length} recibos).`} ${Store.persistent || u.cloud ? '' : '<b>Este navegador no permite guardar datos: se perderán al cerrar la página.</b>'}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" id="s-wipe">Borrar todos mis recibos</button>${u.demo ? '' : '<button class="btn btn-ghost btn-sm" id="s-del" style="color:var(--red)">Eliminar mi cuenta</button>'}<button class="btn btn-ghost btn-sm" id="s-out">${I.out} Cerrar sesión</button></div></div>
  </div>`;
}

function confirmModal(title, text, label, fn) {
  modal(`<h2>${title}</h2><p class="hint" style="font-size:15px;margin:8px 0 20px">${text}</p><div style="display:flex;gap:8px"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-dark" id="cf-ok" style="background:var(--red)">${label}</button></div>`,
    (bg, close) => { $('#cf-ok', bg).onclick = () => { close(); fn(); }; });
}

/* ---------- Eventos ---------- */
function bindAppView(view) {
  $('#load-demo')?.addEventListener('click', () => { Data.addEmails({ type: 'demo', label: 'Bandeja de ejemplo', account: 'demo@horahflow.com' }, E.demoInbox()); toast('Datos de ejemplo cargados'); location.hash = 'app'; route(); });
  $$('[data-sub]').forEach(r => r.addEventListener('click', e => { if (e.target.closest('.seg')) return; subModal(r.dataset.sub); }));
  $$('[data-usage]').forEach(seg => seg.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; e.stopPropagation();
    const k = seg.dataset.usage, P = Data.state.prefs; P.usage[k] = P.usage[k] === b.dataset.v ? null : b.dataset.v; Data.save();
    const y = window.scrollY; route(); window.scrollTo(0, y);
    if (P.usage[k] === 'no') toast('Lo sumamos a tu ahorro potencial');
  }));
  const ask = $('#ask');
  if (ask) {
    const go = q => { if (!q.trim()) return; chatLog.push({ r: 'u', t: esc(q) }, { r: 'a', t: flowAnswer(q) }); chatLog = chatLog.slice(-10); const c = $('#chat'); c.innerHTML = chatLog.map(m => `<div class="msg ${m.r}">${m.t}</div>`).join(''); c.scrollTop = c.scrollHeight; $('#ask-q').value = ''; };
    ask.onsubmit = e => { e.preventDefault(); go($('#ask-q').value); };
    $$('.suggest button').forEach(b => b.onclick = () => go(b.dataset.q));
  }
  const live = (id, obj, key, v) => { const el = $(id); if (!el) return; el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { obj[key] = el.value; const pos = el.selectionStart; route(); const n = $(id); if (n && n.tagName === 'INPUT') { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } }); };
  live('#sf-q', subFilter, 'q'); live('#sf-cat', subFilter, 'cat'); live('#sf-status', subFilter, 'status');
  live('#tf-q', txFilter, 'q'); live('#tf-cat', txFilter, 'cat'); live('#tf-kind', txFilter, 'kind');
  $('#cal-prev')?.addEventListener('click', () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1); route(); });
  $('#cal-next')?.addEventListener('click', () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1); route(); });
  $('#export')?.addEventListener('click', exportCSV);
  $('#c-gmail')?.addEventListener('click', connectGmail);
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
  $$('[data-resync]').forEach(b => b.onclick = connectGmail);
  $('#s-prof')?.addEventListener('submit', e => { e.preventDefault(); Auth.update({ name: $('#s-name').value.trim() || Auth.user.name }); toast('Perfil guardado'); route(); });
  $('#s-days')?.addEventListener('change', e => { Data.state.prefs.alertDays = +e.target.value; Data.save(); toast('Avisos actualizados'); });
  $('#s-down')?.addEventListener('click', () => { Auth.update({ plan: 'free', planTest: false }); toast('Has vuelto al plan Gratis'); route(); });
  $('#s-wipe')?.addEventListener('click', () => confirmModal('¿Borrar todos tus recibos?', 'Se eliminarán todos los recibos y fuentes guardados en este navegador. Tu cuenta seguirá activa.', 'Borrar', () => { Data.wipe(); toast('Datos borrados'); route(); }));
  $('#s-del')?.addEventListener('click', () => confirmModal('¿Eliminar tu cuenta?', 'Se borrarán tu cuenta y todos tus datos. Si tienes una suscripción, cancélala antes desde «Gestionar suscripción». No se puede deshacer.', 'Eliminar cuenta', async () => { try { await Auth.remove(); location.hash = 'inicio'; toast('Cuenta eliminada'); } catch (e) { toast('No se pudo eliminar: ' + e.message, 4000); } }));
  $('#s-out')?.addEventListener('click', () => { Auth.logout(); location.hash = 'inicio'; });
}

/* ---------- Enrutado ---------- */
const root = document.getElementById('root');
function route() {
  const h = (location.hash || '#inicio').slice(1);
  document.title = 'HorahFlow — Descubre a dónde se va tu dinero';
  if (h.startsWith('app')) {
    if (!Auth.user) { location.hash = 'entrar'; return; }
    if (h === 'app-correos' && Auth.user.demo) { /* permitido: muestra opciones */ }
    renderApp(h); document.title = (TABS.find(t => t[0] === h) || TABS[0])[1] + ' · HorahFlow'; return;
  }
  if (Auth.user && Auth.user.demo && !h.startsWith('app')) Auth.exitDemo();
  if (h === 'pago-ok') return paymentReturn();
  if (h === 'blog') return renderBlog();
  if (h.startsWith('blog-')) return renderPost(h.slice(5));
  if (h === 'entrar' || h === 'registro') { if (Auth.user && !Auth.user.demo) { location.hash = 'app'; return; } return renderAuth(h); }
  if (h === 'privacidad' || h === 'terminos') return renderLegal(h);
  const scroll = { demo: 'demo-sec', precios: 'precios-sec', 'como-funciona': 'como-funciona-sec' }[h];
  renderLanding(scroll);
}

document.addEventListener('click', onBuyClick);
root.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center"><div class="progress"><i style="width:40%"></i></div></div>';
Auth.init().catch(e => console.warn(e)).finally(() => { window.addEventListener('hashchange', route); route(); });

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
