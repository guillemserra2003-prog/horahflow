/* =========================================================
   HorahFlow · núcleo: almacenamiento, cuentas, enrutado, Gmail
   ========================================================= */
const CFG = Object.assign({
  googleClientId: '',          // ID de cliente OAuth de Google (Gmail, solo lectura)
  supabaseUrl: '', supabaseAnonKey: '',  // Opcional: cuentas en la nube con Supabase Auth
  stripe: { pro: '', proYear: '', business: '', businessYear: '', portal: '' }, // Payment Links de Stripe + portal de cliente
  gmailMaxMessages: 400
}, window.HF_CONFIG || {});

const E = window.HFEngine;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = E.fmt, fmtDate = E.fmtDate;
const fmt0 = n => (n || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/* ---------- Almacenamiento seguro (con respaldo en memoria) ---------- */
const Store = (() => {
  const mem = {};
  let ls = null;
  try { ls = window.localStorage; ls.setItem('__hf', '1'); ls.removeItem('__hf'); } catch { ls = null; }
  return {
    get(k, d = null) { try { const v = ls ? ls.getItem(k) : mem[k]; return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { const s = JSON.stringify(v); try { ls ? ls.setItem(k, s) : (mem[k] = s); } catch (e) { mem[k] = s; console.warn('Almacenamiento lleno', e); } },
    del(k) { try { ls ? ls.removeItem(k) : delete mem[k]; } catch { delete mem[k]; } },
    persistent: !!ls
  };
})();

/* ---------- Cuentas ---------- */
const PLANS = {
  free:     { id: 'free', name: 'Gratis', mailboxes: 1, history: 3, alerts: false, export: false },
  pro:      { id: 'pro', name: 'Pro', mailboxes: 5, history: 24, alerts: true, export: true },
  business: { id: 'business', name: 'Empresas', mailboxes: 25, history: 36, alerts: true, export: true }
};

async function hashPass(pass, salt) {
  if (window.crypto && crypto.subtle) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256);
    return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0; for (const c of salt + pass) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h;
}
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

let supa = null;
async function getSupabase() {
  if (!CFG.supabaseUrl || !CFG.supabaseAnonKey) return null;
  if (supa) return supa;
  const proxied = /(^|\.)horahflow\.com$|\.vercel\.app$/.test(location.hostname);
  // Desde nuestro propio dominio (así no lo frena un bloqueador o un cortafuegos); si falla, directo del CDN
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js';
  try { await loadScript(proxied ? '/vendor/supabase.js' : CDN); } catch { await loadScript(CDN).catch(() => {}); }
  if (!window.supabase || !window.supabase.createClient) throw new Error('No hemos podido conectar con HorahFlow. Revisa tu conexión o desactiva el bloqueador de anuncios para esta web y vuelve a intentarlo.');
  const apiUrl = proxied ? location.origin + '/sb' : CFG.supabaseUrl;
  supa = window.supabase.createClient(apiUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' } });
  return supa;
}
function loadScript(src) {
  return new Promise((res, rej) => {
    if ($(`script[src="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src)); document.head.appendChild(s);
  });
}
const cloud = () => !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
const ERR_ES = m => /load failed|failed to fetch|networkerror|network request failed/i.test(m) ? 'No hemos podido conectar con HorahFlow. Revisa tu conexión a internet e inténtalo de nuevo.'
  : /invalid login/i.test(m) ? 'Correo o contraseña incorrectos.' : /not confirmed/i.test(m) ? 'Aún no has confirmado tu correo. Revisa tu bandeja de entrada (y spam).'
  : /already registered|already exists/i.test(m) ? 'Ya existe una cuenta con ese correo. Entra con tu contraseña.' : /email rate limit|over_email_send/i.test(m) ? 'Ahora mismo no podemos enviar el correo de confirmación. Inténtalo de nuevo en unos minutos; si sigue fallando, escríbenos a hola@horahflow.com.'
  : /rate limit|security purposes/i.test(m) ? 'Demasiados intentos seguidos. Espera un poco y vuelve a probar.'
  : /password/i.test(m) && /least|short|weak/i.test(m) ? 'La contraseña es demasiado débil (mínimo 8 caracteres).'
  : /cannot read|undefined|is not a function|unexpected token|typeerror|referenceerror/i.test(m) ? 'Algo ha fallado al conectar. Recarga la página y vuelve a intentarlo; si sigue pasando, escríbenos a hola@horahflow.com.' : m;
const siteBase = () => location.origin + location.pathname;

const Auth = {
  user: null, recovery: false,
  /** Restaura la sesión al abrir la web */
  async init() {
    const sb = await getSupabase().catch(e => { console.warn(e); return null; });
    if (!sb) { this.load(); return; }
    sb.auth.onAuthStateChange((ev, session) => {
      if (ev === 'PASSWORD_RECOVERY') { this.recovery = true; setTimeout(newPasswordModal, 300); }
      if (ev === 'SIGNED_OUT') {
        const wasIn = !!(this.user && this.user.cloud && !this._loggingOut);
        this.user = null; Data.state = null; if (typeof Inbound !== 'undefined') Inbound.stop();
        // Sesión caducada mientras usabas la app: avisamos y llevamos a iniciar sesión
        if (wasIn && /^#app/.test(location.hash)) { location.hash = 'entrar'; setTimeout(() => toast('Tu sesión ha caducado. Vuelve a entrar para continuar.', 6000), 300); }
      }
    });
    const { data } = await sb.auth.getSession();
    if (data.session) {
      try { await this.fromSession(data.session); }
      catch (e) { console.warn(e); this.netError = true; }
    }
    const fromConfirm = /[?&]confirmado=1/.test(location.search);
    if (fromConfirm) {
      const expired = /error_code=/.test(location.hash);
      history.replaceState(null, '', location.pathname + '#confirmado');
      this.confirmState = this.user ? 'ok' : (expired ? 'used' : 'ok-nosession');
      return;
    }
    if (/error_code=/.test(location.hash)) {
      const expired = /otp_expired/.test(location.hash);
      history.replaceState(null, '', this.user ? '#app' : '#entrar');
      setTimeout(() => toast(expired ? 'Ese enlace ya se usó o ha caducado. Si ya confirmaste tu correo, entra con tu contraseña.' : 'No se pudo completar el enlace. Inténtalo de nuevo.', 6000), 400);
    } else if (/type=recovery/.test(location.hash)) history.replaceState(null, '', '#app-ajustes');
    else if (/access_token=|type=signup|type=magiclink/.test(location.hash)) history.replaceState(null, '', this.user ? '#app-correos' : '#entrar');
  },
  async fromSession(session) {
    const sb = await getSupabase();
    const u = session.user;
    const { data: p } = await sb.from('profiles').select('name,plan,plan_status,plan_period_end,stripe_customer_id').eq('id', u.id).maybeSingle();
    this.user = { id: u.id, email: u.email, name: (p && p.name) || u.user_metadata?.name || u.email.split('@')[0], plan: (p && p.plan) || 'free',
      planStatus: p?.plan_status, planEnd: p?.plan_period_end, customer: p?.stripe_customer_id, cloud: true };
    await Data.pull();
    return this.user;
  },
  async refreshProfile() { const sb = await getSupabase(); if (!sb || !this.user?.cloud) return; const { data } = await sb.auth.getSession(); if (data.session) { const st = Data.state; await this.fromSession(data.session); Data.state = Data.state || st; } },
  load() {
    const email = Store.get('hf:session');
    if (email) { const u = Store.get('hf:users', {})[email]; if (u) this.user = u; }
    return this.user;
  },
  async register(name, email, pass) {
    email = email.trim().toLowerCase();
    if (!name.trim()) throw new Error('Escribe tu nombre.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Ese correo no parece válido.');
    if (pass.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
    const sb = await getSupabase();
    if (sb) {
      const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { name: name.trim() }, emailRedirectTo: location.origin + '/?confirmado=1' } });
      if (error) throw new Error(ERR_ES(error.message));
      if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error(ERR_ES('already registered'));
      if (!data.session) return { needsConfirm: true, email };
      return this.fromSession(data.session);
    }
    const users = Store.get('hf:users', {});
    if (users[email]) throw new Error('Ya existe una cuenta con ese correo. Entra con tu contraseña.');
    const salt = rid();
    users[email] = { name: name.trim(), email, salt, hash: await hashPass(pass, salt), plan: 'free', created: Date.now() };
    Store.set('hf:users', users); Store.set('hf:session', email);
    this.user = users[email]; return this.user;
  },
  async login(email, pass) {
    email = email.trim().toLowerCase();
    const sb = await getSupabase();
    if (sb) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw new Error(ERR_ES(error.message));
      return this.fromSession(data.session);
    }
    const users = Store.get('hf:users', {});
    const u = users[email];
    if (!u || (await hashPass(pass, u.salt)) !== u.hash) throw new Error('Correo o contraseña incorrectos.');
    Store.set('hf:session', email); this.user = users[email]; return this.user;
  },
  async resetPassword(email) {
    const sb = await getSupabase(); if (!sb) throw new Error('No disponible en modo local.');
    const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: siteBase() + '#app-ajustes' });
    if (error) throw new Error(ERR_ES(error.message));
  },
  async setPassword(pass) {
    if (pass.length < 8) throw new Error('Mínimo 8 caracteres.');
    const sb = await getSupabase(); const { error } = await sb.auth.updateUser({ password: pass });
    if (error) throw new Error(ERR_ES(error.message));
  },
  demo() { if (this.user && !this.user.demo) this.prev = this.user; this.user = { name: 'Invitado', email: 'demo@horahflow.com', plan: 'pro', demo: true }; Data.demoState = null; return this.user; },
  exitDemo() { this.user = this.prev || null; this.prev = null; },
  logout() {
    const wasCloud = this.user?.cloud;
    Store.del('hf:session'); this.user = null; Data.state = null; Inbound.stop();
    if (wasCloud) getSupabase().then(sb => sb && sb.auth.signOut()).catch(() => {});
  },
  async update(patch) {
    Object.assign(this.user, patch);
    if (this.user.demo) return;
    if (this.user.cloud) { const sb = await getSupabase(); if ('name' in patch) await sb.from('profiles').update({ name: patch.name }).eq('id', this.user.id); return; }
    const users = Store.get('hf:users', {}); users[this.user.email] = this.user; Store.set('hf:users', users);
  },
  async remove() {
    if (!this.user || this.user.demo) return;
    if (this.user.cloud) {
      const sb = await getSupabase(); const { error } = await sb.rpc('delete_my_account');
      if (error) throw new Error(error.message);
      Store.del('hf:cache:' + this.user.id); await sb.auth.signOut().catch(() => {}); this.user = null; Data.state = null; return;
    }
    const users = Store.get('hf:users', {}); delete users[this.user.email]; Store.set('hf:users', users);
    Store.del('hf:data:' + this.user.email); this.logout();
  },
  plan() { return PLANS[(this.user && this.user.plan) || 'free'] || PLANS.free; }
};

/* ---------- Datos del usuario ---------- */
const emptyState = () => ({ sources: [], emails: [], prefs: { usage: {}, cancelled: {}, ignored: {}, alertDays: 3 } });
/** Solo se guarda el fragmento del recibo alrededor del importe, nunca el correo entero */
function receiptSnippet(text) {
  text = String(text || '').replace(/\s+/g, ' ');
  if (text.length <= 700) return text;
  const m = text.search(/(total|importe|amount|cargo|charged|pagad|paid)[^€$£]{0,40}(€|EUR|\$|£|\d)/i);
  const i = m > -1 ? m : Math.max(0, text.search(/\d+[.,]\d{2}\s?(€|EUR)|(€|\$|£)\s?\d/i));
  const hint = (text.match(/[^.]{0,80}(suscripci[oó]n|subscription|mensual|monthly|anual|annual|yearly|renovaci[oó]n|renewal|prueba gratuita|free trial)[^.]{0,80}/i) || [''])[0];
  return (hint + ' … ' + text.slice(Math.max(0, i - 200), i + 300)).trim();
}
const Data = {
  state: null, analysis: null, demoState: null, _t: null,
  key() { return this.user().cloud ? 'hf:cache:' + this.user().id : 'hf:data:' + this.user().email; },
  user() { return Auth.user; },
  async pull() {
    const sb = await getSupabase(); const u = Auth.user;
    const cached = Store.get('hf:cache:' + u.id);
    const { data, error } = await sb.from('user_data').select('state,prefs,updated_at').eq('user_id', u.id).maybeSingle();
    if (error) { console.warn(error); this.state = cached || emptyState(); return; }
    this._hasRow = !!data;
    this.state = (data && data.state && data.state.emails) ? data.state : (cached || emptyState());
    // Las preferencias van en su propia columna (se sincronizan sin reenviar todos los recibos)
    if (data && data.prefs && Object.keys(data.prefs).length) this.state.prefs = Object.assign({}, this.state.prefs, data.prefs);
    this.owner = u.id;
    Store.set('hf:cache:' + u.id, this.state);
  },
  load() {
    const owner = Auth.user.demo ? 'demo' : (Auth.user.id || Auth.user.email);
    if (this.owner !== owner) { this.state = null; this.owner = owner; }
    if (Auth.user.demo) {
      if (!this.demoState) this.demoState = { sources: [{ id: 'demo', type: 'demo', label: 'Bandeja de ejemplo', account: 'demo@horahflow.com', added: Date.now(), count: 0 }], emails: E.demoInbox(), prefs: { usage: {}, cancelled: {}, ignored: {}, alertDays: 3 } };
      this.state = this.demoState;
    } else if (!this.state) this.state = Store.get(this.key(), emptyState());
    this.state.prefs = Object.assign({ usage: {}, cancelled: {}, ignored: {}, alertDays: 3 }, this.state.prefs);
    this.recompute(); return this.state;
  },
  /** kind: 'all' (recibos + preferencias) o 'prefs' (solo preferencias: mucho más ligero) */
  save(kind = 'all') {
    if (!Auth.user.demo) {
      if (kind === 'all') this._dirtyAll = true;
      Store.set(this.key(), this.state);
      if (Auth.user.cloud) { clearTimeout(this._t); this._t = setTimeout(() => this.push(), 600); }
    }
    this.recompute();
  },
  async push(attempt = 0) {
    const sb = await getSupabase(); if (!sb || !Auth.user?.cloud) return;
    const full = this._dirtyAll || !this._hasRow;
    const { prefs, ...rest } = this.state;
    const { error } = full
      ? await sb.from('user_data').upsert({ user_id: Auth.user.id, state: rest, prefs }, { onConflict: 'user_id' })
      : await sb.from('user_data').update({ prefs }).eq('user_id', Auth.user.id);
    if (error) {
      console.warn(error);
      if (attempt === 0) toast('No se pudo guardar en la nube. Lo reintentamos en segundo plano; tus datos siguen en este dispositivo.', 5000);
      if (attempt < 5) setTimeout(() => this.push(attempt + 1), 4000 * (attempt + 1));
      return;
    }
    if (full) { this._dirtyAll = false; this._hasRow = true; }
  },
  recompute() {
    const histMonths = Auth.plan().history;
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - histMonths);
    const emails = this.state.emails.filter(e => new Date(e.date) >= cutoff);
    this.analysis = E.analyze(emails, this.state.prefs);
    this.state.sources.forEach(s => s.count = this.state.emails.filter(e => e.sourceId === s.id || (s.type === 'demo' && e.source === 'demo')).length);
  },
  async addEmails(source, emails, onProgress) {
    const existing = this.state.sources.find(s => s.type === source.type && s.account && s.account === source.account);
    const src = existing || Object.assign({ id: rid(), added: Date.now() }, source);
    if (!existing) this.state.sources.push(src);
    src.updated = Date.now();
    const seen = new Set(this.state.emails.map(e => (e.id || '') + '|' + e.subject + '|' + e.date));
    let added = 0, aiAdded = 0;
    const doubtful = [];
    for (const e of emails) {
      const m = { id: e.id, from: e.from, subject: e.subject, date: e.date, body: receiptSnippet(e.body), source: src.type, sourceId: src.id, account: source.account || '' };
      const k = (m.id || '') + '|' + m.subject + '|' + m.date;
      if (seen.has(k)) continue; seen.add(k);
      // Solo se guardan correos que parecen gastos: nunca el buzón completo
      if (E.toCharge(Object.assign({}, m, { body: e.body }))) { this.state.emails.push(m); added++; }
      else if (E.maybeReceipt(e)) doubtful.push({ e, m });
    }
    // Los recibos que las reglas no saben leer se los pasamos a la IA (solo el fragmento del recibo)
    if (doubtful.length && Auth.user && Auth.user.cloud) {
      const batch = doubtful.sort((a, b) => new Date(b.e.date) - new Date(a.e.date)).slice(0, 40);
      onProgress && onProgress(0, 0, `Leyendo con IA ${batch.length} recibos poco habituales…`);
      try {
        const res = await AI.call({ action: 'parse', items: batch.map(x => ({ from: x.e.from, subject: x.e.subject, date: x.e.date, text: receiptSnippet(x.e.body) })) });
        const CY = { weekly: 'semanal', monthly: 'mensual', quarterly: 'trimestral', yearly: 'anual' };
        for (const r of (res.results || [])) {
          const x = batch[r.i]; if (!x) continue;
          const amt = String(r.amount.toFixed(2)).replace('.', ',') + ' ' + (r.currency === 'EUR' ? '€' : r.currency);
          const m = Object.assign({}, x.m, {
            from: `${r.merchant} <${(x.e.from.match(/<([^>]+)>/) || [, ''])[1]}>`,
            body: `${r.merchant}. Recibo. Total: ${amt}.${r.recurring ? ' Suscripción ' + (CY[r.cycle] || 'mensual') + '.' : ''}`,
            cat: r.category, ai: true
          });
          if (E.toCharge(m)) { this.state.emails.push(m); aiAdded++; }
        }
      } catch (err) { console.warn('IA no disponible', err.message); }
    }
    // Tope de seguridad: se guardan como máximo los 3.000 recibos más recientes
    if (this.state.emails.length > 3000) this.state.emails = this.state.emails.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3000);
    this.save(); return added + aiAdded;
  },
  removeSource(id) {
    const s = this.state.sources.find(x => x.id === id);
    this.state.sources = this.state.sources.filter(x => x.id !== id);
    this.state.emails = this.state.emails.filter(e => e.sourceId !== id && !(s && s.type === 'demo' && e.source === 'demo'));
    this.save();
  },
  mailboxCount() { return Inbound.addresses.length; },
  wipe() { this.state = emptyState(); this.save(); }
};

function newPasswordModal() {
  modal(`<h2>Elige una contraseña nueva</h2><p class="hint" style="margin:6px 0 14px">Mínimo 8 caracteres.</p>
    <input class="input" type="password" id="np" autocomplete="new-password"><div class="err" id="np-e" style="margin-top:8px"></div>
    <button class="btn btn-dark btn-block" id="np-go">Guardar contraseña</button>`, (bg, close) => {
    $('#np-go', bg).onclick = async () => { try { await Auth.setPassword($('#np', bg).value); close(); toast('Contraseña actualizada'); Auth.recovery = false; } catch (e) { $('#np-e', bg).textContent = e.message; } };
  });
}

/* ---------- IA (Claude, en el servidor) ---------- */
const AI = {
  available() { return !!(Auth.user && Auth.user.cloud); },
  async call(payload) {
    const sb = await getSupabase();
    if (!sb || !this.available()) throw Object.assign(new Error('local'), { code: 'local' });
    const { data, error } = await sb.functions.invoke('ai', { body: payload });
    if (error) {
      let code = 'ai_error';
      try { const j = await error.context.json(); code = j.error || code; } catch {}
      throw Object.assign(new Error(code), { code });
    }
    return data;
  },
  /** Resumen compacto de los gastos (sin correos ni textos de recibos) */
  context(a) {
    const r2 = n => Math.round(n * 100) / 100, d = x => new Date(x).toISOString().slice(0, 10);
    const recentOne = {};
    const since = Date.now() - 90 * 864e5;
    a.oneoffs.filter(c => +c.date >= since).forEach(c => { const o = recentOne[c.merchant] = recentOne[c.merchant] || { comercio: c.merchant, categoria: E.CATS[c.cat].label, total_3m: 0, cargos: 0 }; o.total_3m = r2(o.total_3m + c.amount); o.cargos++; });
    return {
      hoy: d(Date.now()),
      totales: { suscripciones_mes: a.totals.monthlyRec, suscripciones_año: a.totals.yearlyRec, gasto_variable_mes: a.totals.oneMonthly, total_mes: a.totals.monthlyAll, ahorro_posible_mes: a.totals.potential, nota_salud: a.totals.score },
      suscripciones: a.subs.map(s => ({ servicio: s.merchant, importe: s.amount, ciclo: s.cycle, al_mes: s.monthly, categoria: E.CATS[s.cat].label, estado: s.status, proximo_cobro: s.status === 'activa' ? d(s.next) : null,
        desde: d(s.first), veces_cobrado: s.count, subida_precio: s.priceUp ? { de: s.priceUp.from, a: s.priceUp.to } : null, era_prueba: s.trial || undefined, uso_declarado: s.usage || undefined,
        alternativas: (s.alts || []).map(x => x.n).slice(0, 3) })),
      gasto_variable_ultimos_3_meses: Object.values(recentOne).sort((x, y) => y.total_3m - x.total_3m).slice(0, 15),
      por_categoria_mes: a.categories.map(c => ({ categoria: c.label, al_mes: c.value })),
      brechas: a.leaks.map(l => ({ tipo: l.type, titulo: l.title, detalle: l.detail, ahorro_mes: l.saving || 0 })),
      ultimos_meses: a.months.map(m => ({ mes: m.label + ' ' + m.y, total: m.total, recurrente: m.rec, variable: m.one, en_curso: !!m.partial }))
    };
  }
};

/* ---------- Reenvío de recibos: direcciones privadas <token>@recibos.horahflow.com ---------- */
const INBOUND_DOMAIN = 'recibos.horahflow.com';
const Inbound = {
  addresses: [], loaded: false, _busy: false, _timer: null, lastSync: 0,
  email(a) { return a.token + '@' + INBOUND_DOMAIN; },
  available() { return !!(Auth.user && Auth.user.cloud); },
  async load() {
    if (!this.available()) { this.addresses = []; this.loaded = true; return this.addresses; }
    const sb = await getSupabase();
    const { data, error } = await sb.from('inbound_addresses').select('*').order('created_at');
    if (error) throw new Error(ERR_ES(error.message));
    this.addresses = data || []; this.loaded = true; return this.addresses;
  },
  async create(label) {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc('create_inbound_address', { p_label: label || 'Mi correo' });
    if (error) {
      if (/mailbox_limit/.test(error.message)) throw Object.assign(new Error('Has llegado al límite de direcciones de tu plan.'), { code: 'limit' });
      throw new Error(ERR_ES(error.message));
    }
    await this.load(); return data;
  },
  async rename(id, label) {
    const sb = await getSupabase();
    const { error } = await sb.from('inbound_addresses').update({ label: String(label).trim().slice(0, 40) || 'Mi correo' }).eq('id', id);
    if (error) throw new Error(ERR_ES(error.message));
    await this.load();
  },
  async remove(id) {
    const sb = await getSupabase();
    const { error } = await sb.from('inbound_addresses').delete().eq('id', id);
    if (error) throw new Error(ERR_ES(error.message));
    await this.load();
  },
  /** Las N direcciones más antiguas son las que funcionan con el plan actual (igual que en el servidor) */
  async confirm(id) {
    const sb = await getSupabase();
    const { error } = await sb.rpc('confirm_inbound_address', { p_id: id });
    if (error) throw new Error(ERR_ES(error.message));
    await this.load();
  },
  /** Estado de conexión: 'paused' | 'pending' | 'connected' | 'idle' | 'none' */
  state(a) {
    if (!this.active(a)) return 'paused';
    const seen = a.last_seen_at || a.last_received_at;
    if (a.verify_at && !a.confirmed_at && !(seen && new Date(seen) > new Date(a.verify_at))) return 'pending';
    if (a.confirmed_at || seen) return seen && (Date.now() - new Date(seen)) > 45 * 864e5 ? 'idle' : 'connected';
    return 'none';
  },
  active(a) { return this.addresses.slice(0, Auth.plan().mailboxes).some(x => x.id === a.id); },
  /** Trae los recibos reenviados pendientes, los añade a tus datos y los borra del servidor */
  async sync() {
    if (!this.available() || this._busy || Auth.user.demo) return 0;
    this._busy = true;
    try {
      const sb = await getSupabase();
      const { data: rows, error } = await sb.from('inbound_emails').select('id,address_id,resend_id,from_addr,subject,received_at,body').order('received_at').limit(500);
      if (error) throw error;
      this.lastSync = Date.now();
      if (!rows || !rows.length) return 0;
      if (!this.loaded) await this.load();
      let added = 0;
      const groups = {};
      rows.forEach(r => (groups[r.address_id] = groups[r.address_id] || []).push(r));
      for (const [aid, list] of Object.entries(groups)) {
        const a = this.addresses.find(x => x.id === aid);
        const account = a ? this.email(a) : 'reenvío';
        added += await Data.addEmails({ type: 'reenvio', label: 'Reenvío · ' + (a ? a.label : 'correo'), account },
          list.map(r => ({ id: r.resend_id, from: r.from_addr, subject: r.subject, date: r.received_at, body: r.body })));
      }
      // Solo se borran del servidor cuando ya están guardados en tu cuenta
      clearTimeout(Data._t); await Data.push();
      if (Data._dirtyAll) return added;
      const ids = rows.map(r => r.id);
      for (let i = 0; i < ids.length; i += 100) await sb.from('inbound_emails').delete().in('id', ids.slice(i, i + 100));
      return added;
    } catch (e) { console.warn('Reenvío:', e.message || e); return 0; }
    finally { this._busy = false; }
  },
  /** Comprueba cada 2 minutos mientras la app está abierta */
  watch(onNew) {
    clearInterval(this._timer);
    if (!this.available()) return;
    const tick = async () => { if (document.hidden) return; const n = await this.sync(); if (n && onNew) onNew(n); };
    this._timer = setInterval(tick, 120000);
    this._tick = tick;
    if (!this._vis) { this._vis = true; document.addEventListener('visibilitychange', () => { if (this._tick && !document.hidden && Date.now() - this.lastSync > 60000) this._tick(); }); }
    tick();
  },
  /** En la pantalla Correos: comprueba cada 6 s para marcar los pasos al momento */
  fastWatch(onChange) {
    clearInterval(this._fast); this._fast = null;
    if (!onChange || !this.available() || Auth.user.demo) return;
    const sig = () => JSON.stringify(this.addresses.map(a => [a.id, a.verify_at, a.confirmed_at, a.last_seen_at, a.received_count, a.last_import_at]));
    const impMap = () => Object.fromEntries(this.addresses.map(a => [a.id, a.last_import_at]));
    let last = sig(), lastImp = impMap(), t0 = Date.now();
    this._fast = setInterval(async () => {
      if (document.hidden) return;
      if (Date.now() - t0 > 20 * 60000) { clearInterval(this._fast); return; }
      try { await this.load(); } catch { return; }
      const now = sig(); if (now === last) return; last = now;
      const prevImp = lastImp; lastImp = impMap();
      const imp = this.addresses.find(a => a.last_import_at && a.last_import_at !== prevImp[a.id]);
      await this.sync();
      onChange({ imported: imp ? imp.last_import_count : 0 });
    }, 6000);
  },
  stop() { clearInterval(this._fast); clearInterval(this._timer); this._tick = null; this._for = null; this.addresses = []; this.loaded = false; }
};

/* ---------- Gmail (OAuth en el navegador, solo lectura) ---------- */
const Gmail = {
  query: 'newer_than:2y (recibo OR factura OR receipt OR invoice OR "tu pedido" OR "your order" OR suscripción OR subscription OR renovación OR renewal OR "pago" OR payment OR cargo OR membresía OR membership OR cuota) -category:promotions',
  async connect(onProgress) {
    if (!CFG.googleClientId) throw Object.assign(new Error('NO_CLIENT_ID'), { code: 'NO_CLIENT_ID' });
    await loadScript('https://accounts.google.com/gsi/client');
    const token = await new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CFG.googleClientId,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        callback: r => r.error ? reject(new Error(r.error)) : resolve(r.access_token),
        error_callback: e => reject(new Error(e.type === 'popup_closed' ? 'Has cerrado la ventana de Google.' : 'Google no ha permitido el acceso.'))
      });
      client.requestAccessToken({ prompt: 'select_account consent' });
    });
    const api = async path => {
      const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + path, { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) throw new Error('Gmail respondió ' + r.status);
      return r.json();
    };
    const profile = await api('profile');
    onProgress && onProgress(0, 0, 'Buscando recibos y facturas…');
    let ids = [], pageToken = '';
    do {
      const r = await api(`messages?maxResults=100&q=${encodeURIComponent(this.query)}${pageToken ? '&pageToken=' + pageToken : ''}`);
      ids.push(...(r.messages || []).map(m => m.id)); pageToken = r.nextPageToken;
    } while (pageToken && ids.length < CFG.gmailMaxMessages);
    ids = ids.slice(0, CFG.gmailMaxMessages);
    const out = []; let done = 0;
    const worker = async () => {
      while (ids.length) {
        const id = ids.shift();
        try { const m = await api(`messages/${id}?format=full`); out.push(this.toEmail(m, profile.emailAddress)); } catch (e) { console.warn(e); }
        onProgress && onProgress(++done, done + ids.length, 'Leyendo correos…');
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    try { google.accounts.oauth2.revoke(token, () => {}); } catch {}
    return { account: profile.emailAddress, emails: out };
  },
  toEmail(m, account) {
    const hdr = n => ((m.payload.headers || []).find(h => h.name.toLowerCase() === n) || {}).value || '';
    const dec = d => { try { const b = atob(d.replace(/-/g, '+').replace(/_/g, '/')); return new TextDecoder().decode(Uint8Array.from(b, c => c.charCodeAt(0))); } catch { return ''; } };
    let plain = '', html = '';
    const walk = p => {
      if (!p) return;
      if (p.mimeType === 'text/plain' && p.body && p.body.data) plain += dec(p.body.data);
      else if (p.mimeType === 'text/html' && p.body && p.body.data) html += dec(p.body.data);
      (p.parts || []).forEach(walk);
    };
    walk(m.payload);
    const body = plain.trim().length > 30 ? plain : (html ? E.htmlToText(html) : m.snippet || '');
    return { id: m.id, from: hdr('from'), subject: hdr('subject'), date: new Date(+m.internalDate).toISOString(), body, source: 'gmail', account };
  }
};

/* ---------- Archivos ---------- */
async function readFiles(files) {
  const out = [];
  for (const f of files) {
    const txt = await f.text();
    if (/\.mbox$/i.test(f.name) || /^From \S+/.test(txt)) out.push(...E.parseMbox(txt, 'archivo'));
    else if (/\.eml$/i.test(f.name) || /^(Received|Return-Path|From|Delivered-To|MIME-Version|Date):/im.test(txt.slice(0, 2000))) { const e = E.parseEml(txt, 'archivo'); if (e) out.push(e); }
    else out.push(...E.parsePasted(txt, 'archivo'));
  }
  return out;
}

/* ---------- UI helpers ---------- */
function toast(msg, ms = 2600) {
  $$('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
function modal(html, onMount) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal fade-in" role="dialog" aria-modal="true"><button class="x" data-close aria-label="Cerrar">${I.x}</button>${html}</div>`;
  const close = () => bg.remove();
  bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
  document.body.appendChild(bg); onMount && onMount(bg, close); return close;
}
function colorFor(name) {
  const pal = ['#3D3A4F', '#2F8F5B', '#4A6B60', '#C46B4E', '#6E9FB8', '#9C7BB5', '#D9A441', '#16151F', '#5B8C6E', '#7A7790'];
  let h = 0; for (const c of name) h = (h * 33 + c.charCodeAt(0)) >>> 0; return pal[h % pal.length];
}
const logoSq = (name, size = 36) => `<span class="logo-sq" style="background:${colorFor(name)};width:${size}px;height:${size}px">${esc(name.replace(/[^A-Za-zÀ-ÿ0-9]/g, '').charAt(0).toUpperCase())}</span>`;
function copyText(text) {
  if (navigator.clipboard) return navigator.clipboard.writeText(text).then(() => toast('Copiado al portapapeles')).catch(() => fallbackCopy(text));
  fallbackCopy(text);
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); toast('Copiado al portapapeles'); } catch { toast('No se pudo copiar'); } ta.remove();
}
function download(name, text, type = 'text/csv') {
  try {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  } catch { copyText(text); }
}

/* ---------- Iconos ---------- */
const svg = (p, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const I = {
  home: svg('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  list: svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  cal: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  leaf: svg('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>'),
  receipt: svg('<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11"/>'),
  mail: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
  gear: svg('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>', 16),
  shield: svg('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>'),
  zap: svg('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
  alert: svg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>'),
  up: svg('<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>'),
  copy: svg('<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'),
  x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  upload: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>'),
  spark: svg('<path d="M12 3l1.9 5.8L20 10.7l-5 3.6 1.9 5.7-4.9-3.6L7.1 20l1.9-5.7-5-3.6 6.1-1.9z"/>'),
  out: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  arrow: svg('<path d="M5 12h14M12 5l7 7-7 7"/>', 16),
  repeat: svg('<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>'),
  clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  copy2: svg('<path d="M8 4v12a2 2 0 0 0 2 2h8"/>'),
  menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  google: '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>'
};
