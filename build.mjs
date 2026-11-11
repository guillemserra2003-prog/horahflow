// HorahFlow — build (sin dependencias). Vercel lo ejecuta en cada cambio de GitHub.
// Genera en /dist:
//   /index.html                 la web + la app (una sola página)
//   /blog/, /blog/<slug>/       artículos desde /posts/*.md
//   /privacidad/ /cookies/ /condiciones/ /aviso-legal/
//   /sitemap.xml, /robots.txt, /blog/feed.xml, clave de IndexNow
// Uso: node build.mjs

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const SITE = CFG.url.replace(/\/$/, "");
const DIST = path.join(ROOT, "dist");
const SRC = p => fs.readFileSync(path.join(ROOT, "src", p), "utf8");
const TODAY = new Date().toISOString().slice(0, 10);

/* ---------- utilidades ---------- */
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const write = (p, c) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); };
const copyDir = (a, b) => { fs.mkdirSync(b, { recursive: true }); for (const f of fs.readdirSync(a)) { const s = path.join(a, f), d = path.join(b, f); fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d); } };
const fmtDate = d => new Date(d + "T12:00:00Z").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const slugify = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const jsonld = o => JSON.stringify(o).replace(/</g, "\\u003c");
const dataUri = p => "data:image/png;base64," + fs.readFileSync(path.join(ROOT, "public", p)).toString("base64");

/* ---------- imágenes ---------- */
function imgSize(src) {
  try {
    const b = fs.readFileSync(path.join(ROOT, "public", src));
    if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
      const t = b.toString("ascii", 12, 16);
      if (t === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
      if (t === "VP8L") { const n = b.readUInt32LE(21); return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 }; }
      if (t === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1], len = b.readUInt16BE(i + 2);
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
        i += 2 + len;
      }
    }
  } catch (e) {}
  return null;
}
function imgTag(src, alt, eager) {
  const s = imgSize(src);
  if (!s) throw new Error(`No encuentro la imagen ${src} (debe estar en public${src})`);
  return `<img src="${esc(src)}" alt="${esc(alt)}" width="${s.w}" height="${s.h}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

/* ---------- markdown mínimo ---------- */
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, (m, t, u) => {
      const ext = /^https?:\/\//.test(u) && !u.startsWith(SITE);
      return `<a href="${u}"${ext ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`;
    });
}
const CTA = `<div class="cta-inline"><p>¿Cuánto se te escapa a ti? Descúbrelo en un minuto.</p><a class="btn btn-dark btn-sm" href="/#registro">Probar HorahFlow gratis</a></div>`;
function markdown(md) {
  const out = []; let list = null, para = [];
  const flushP = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
  const flushL = () => { if (list) { out.push(`<${list.t}>${list.items.map(i => `<li>${inline(i)}</li>`).join("")}</${list.t}>`); list = null; } };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim(); let m;
    if (!line) { flushP(); flushL(); continue; }
    if (line === "[[cta]]") { flushP(); flushL(); out.push(CTA); continue; }
    if ((m = line.match(/^!\[(.*?)\]\((\S+?)(?:\s+"(.*)")?\)$/))) { flushP(); flushL(); out.push(`<figure>${imgTag(m[2], m[1])}${m[3] ? `<figcaption>${inline(m[3])}</figcaption>` : ""}</figure>`); continue; }
    if ((m = line.match(/^(#{2,4})\s+(.*)/))) { flushP(); flushL(); const n = m[1].length; out.push(`<h${n} id="${slugify(m[2])}">${inline(m[2])}</h${n}>`); continue; }
    if ((m = line.match(/^[-*]\s+(.*)/))) { flushP(); if (!list || list.t !== "ul") { flushL(); list = { t: "ul", items: [] }; } list.items.push(m[1]); continue; }
    if ((m = line.match(/^\d+[.)]\s+(.*)/))) { flushP(); if (!list || list.t !== "ol") { flushL(); list = { t: "ol", items: [] }; } list.items.push(m[1]); continue; }
    if ((m = line.match(/^>\s?(.*)/))) { flushP(); flushL(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }
    flushL(); para.push(line);
  }
  flushP(); flushL();
  return out.join("\n");
}

/* ---------- artículos ---------- */
function parsePost(file) {
  const src = fs.readFileSync(file, "utf8");
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  const name = path.basename(file);
  if (!m) throw new Error(`Falta la cabecera --- en ${name}`);
  const meta = {};
  for (const l of m[1].split(/\r?\n/)) { const i = l.indexOf(":"); if (i < 0) continue; meta[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, ""); }
  for (const k of ["title", "description", "date", "tag", "image", "imageAlt"]) if (!meta[k]) throw new Error(`Falta "${k}" en ${name}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`Fecha inválida en ${name} (usa AAAA-MM-DD)`);
  if (/PENDIENTE/.test(meta.imageAlt + (meta.imageCaption || ""))) throw new Error(`Completa imageAlt/imageCaption en ${name}`);
  if (!imgSize(meta.image)) throw new Error(`No encuentro la portada ${meta.image} de ${name}`);
  const words = m[2].split(/\s+/).filter(Boolean).length;
  return { ...meta, slug: meta.slug || path.basename(file, ".md"), draft: meta.draft === "true", html: markdown(m[2]), min: Math.max(2, Math.round(words / 200)), words };
}
const all = fs.readdirSync(path.join(ROOT, "posts")).filter(f => f.endsWith(".md")).map(f => parsePost(path.join(ROOT, "posts", f)));
// Borradores (draft: true) y fechas futuras no se publican: así se pueden programar.
const posts = all.filter(p => !p.draft && p.date <= TODAY).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
const seen = new Set(); for (const p of posts) { if (seen.has(p.slug)) throw new Error(`Slug repetido: ${p.slug}`); seen.add(p.slug); }

/* ---------- textos legales (mismo contenido que la app) ---------- */
const legalCtx = vm.createContext({ CFG: { legal: CFG.legal }, esc });
const L = vm.runInContext(SRC("legal.js") + "\n;({ LEGAL, LEGAL_UPDATED, legalComplete })", legalCtx);
const LEGAL_SLUG = { privacidad: "privacidad", cookies: "cookies", terminos: "condiciones", "aviso-legal": "aviso-legal" };
const fixLegalLinks = h => h.replace(/href="#(privacidad|cookies|terminos|aviso-legal)"/g, (x, k) => `href="/${LEGAL_SLUG[k]}/"`);

/* ---------- plantilla común ---------- */
const STYLES = SRC("styles.css");
const HEAD_COMMON = `<meta name="theme-color" content="#ffffff">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<meta property="og:site_name" content="HorahFlow">
<meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="Blog de HorahFlow" href="${SITE}/blog/feed.xml">
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>
<script defer src="/_vercel/insights/script.js"></script>${CFG.googleVerification ? `\n<meta name="google-site-verification" content="${esc(CFG.googleVerification)}">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">`;
const metaTags = ({ title, description, canonical, ogImage, ogType = "website" }) => `<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`;
const pageTitle = t => (t.length + 12 <= 64 ? `${t} | HorahFlow` : t);

const header = `<header class="nav" id="nav"><div class="wrap">
  <a href="/" class="logo" aria-label="HorahFlow, inicio"><img src="/assets/logo.png" alt="HorahFlow" width="520" height="199"></a>
  <nav class="links"><a href="/#como-funciona">Cómo funciona</a><a href="/#demo">Demo</a><a href="/#precios">Precios</a><a href="/blog/">Blog</a></nav>
  <div class="right"><a class="btn btn-ghost btn-sm" href="/#entrar">Entrar</a><a class="btn btn-dark btn-sm" href="/#registro">Empezar gratis</a>
  <button class="burger" aria-label="Menú" onclick="document.getElementById('nav').classList.toggle('open')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button></div>
</div></header>`;
const footer = () => `<footer class="foot"><div class="wrap">
    <div><img src="/assets/logo.png" alt="HorahFlow" width="520" height="199" style="height:26px;width:auto;margin-bottom:14px"><p style="max-width:300px">Encuentra las fugas de dinero que no ves. Suscripciones, cobros recurrentes y gasto hormiga, en un solo panel.</p></div>
    <div><h4>Producto</h4><a href="/#como-funciona">Cómo funciona</a><a href="/#demo">Demo</a><a href="/#precios">Precios</a><a href="/#registro">Crear cuenta</a></div>
    <div><h4>Recursos</h4><a href="/blog/">Blog</a>${posts.slice(0, 2).map(p => `<a href="/blog/${p.slug}/">${esc(p.short || p.title)}</a>`).join("")}</div>
    <div><h4>Legal</h4><a href="/privacidad/">Privacidad</a><a href="/cookies/">Cookies</a><a href="/condiciones/">Condiciones</a>${L.legalComplete() ? '<a href="/aviso-legal/">Aviso legal</a>' : ""}<a href="mailto:hola@horahflow.com">hola@horahflow.com</a></div>
    <div class="legal"><span>© ${new Date().getFullYear()} HorahFlow · horahflow.com</span><span>Hecho en España</span></div>
  </div></footer>`;

function page({ title, description, canonical, ogImage = `${SITE}/assets/og.png`, ogType, body, ld, extraHead = "" }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${metaTags({ title, description, canonical, ogImage, ogType })}
${HEAD_COMMON}
${extraHead}<link rel="stylesheet" href="/assets/site.css">
<script type="application/ld+json">${jsonld(ld)}</script>
</head>
<body>
${header}
<main>
${body}
</main>
${footer()}
<script>addEventListener('scroll',()=>document.getElementById('nav').classList.toggle('scrolled',scrollY>8),{passive:true})</script>
</body>
</html>`;
}
const card = p => `<a class="post-card" href="/blog/${p.slug}/">${imgTag(p.image, p.imageAlt)}
      <div class="body"><span class="cat">${esc(p.tag)}</span><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><span class="date">${fmtDate(p.date)} · ${p.min} min</span></div></a>`;

/* ---------- construir ---------- */
fs.rmSync(DIST, { recursive: true, force: true });
copyDir(path.join(ROOT, "public"), DIST);
// El motor también se publica suelto: lo usan las funciones del servidor (avisos y reenvíos), que comprueban su huella SHA-256
fs.mkdirSync(path.join(DIST, "server"), { recursive: true });
fs.copyFileSync(path.join(ROOT, "src", "engine.js"), path.join(DIST, "server", "engine.js"));
{
  // Seguridad: las funciones del servidor solo aceptan el motor con esta huella. Si cambias src/engine.js,
  // actualiza ENGINE_SHA256 en supabase/functions/*/engine-loader.ts y vuelve a desplegar "inbound" y "daily".
  const crypto = await import("node:crypto");
  const sha = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, "src", "engine.js"))).digest("hex");
  for (const fn of ["inbound", "daily"]) {
    const loader = fs.readFileSync(path.join(ROOT, "supabase", "functions", fn, "engine-loader.ts"), "utf8");
    if (!loader.includes(sha)) throw new Error(`El motor ha cambiado (sha ${sha}) y la función "${fn}" no lo aceptará. Actualiza ENGINE_SHA256 y redespliega (ver README.md).`);
  }
}
write(path.join(DIST, "assets/site.css"), STYLES);

// 1) Portada + app
const faqCtx = vm.createContext({}); const FAQ = vm.runInContext(SRC("faq.js") + "\n;FAQ", faqCtx);
const HOME_TITLE = "HorahFlow · Controla tus suscripciones y gastos desde tu correo";
const HOME_DESC = "HorahFlow lee los recibos de tu correo y encuentra suscripciones olvidadas, subidas de precio y cobros duplicados. Descubre cuánto puedes ahorrar.";
const appConfig = { googleClientId: CFG.googleClientId, supabaseUrl: CFG.supabaseUrl, supabaseAnonKey: CFG.supabaseAnonKey, stripe: CFG.stripe, legal: CFG.legal };
const postsMeta = posts.slice(0, 6).map(p => ({ slug: p.slug, title: p.title, short: p.short, description: p.description, tag: p.tag, image: p.image, imageAlt: p.imageAlt, dateText: fmtDate(p.date), min: p.min }));
const homeLd = { "@context": "https://schema.org", "@graph": [
  { "@type": "Organization", "@id": SITE + "/#org", name: "HorahFlow", url: SITE + "/", logo: `${SITE}/assets/logo.png`, email: "hola@horahflow.com" },
  { "@type": "WebSite", "@id": SITE + "/#web", url: SITE + "/", name: "HorahFlow", inLanguage: "es", publisher: { "@id": SITE + "/#org" } },
  { "@type": "SoftwareApplication", name: "HorahFlow", url: SITE + "/", applicationCategory: "FinanceApplication", operatingSystem: "Web", inLanguage: "es",
    description: HOME_DESC,
    offers: [
      { "@type": "Offer", name: "Gratis", price: "0", priceCurrency: "EUR" },
      { "@type": "Offer", name: "Pro", price: "3.99", priceCurrency: "EUR" },
      { "@type": "Offer", name: "Empresas", price: "18.99", priceCurrency: "EUR" } ] },
  { "@type": "FAQPage", mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) } ] };
const home = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${metaTags({ title: HOME_TITLE, description: HOME_DESC, canonical: SITE + "/", ogImage: `${SITE}/assets/og.png` })}
${HEAD_COMMON}
<style>
${STYLES}
</style>
<script type="application/ld+json">${jsonld(homeLd)}</script>
</head>
<body>
<div id="root"><noscript><div class="wrap" style="padding:60px 24px"><h1>HorahFlow</h1><p>${esc(HOME_DESC)}</p><p>Necesitas activar JavaScript para usar la aplicación.</p><p><a href="/blog/">Leer el blog</a></p></div></noscript></div>
<script>
window.HF_CONFIG = ${JSON.stringify(appConfig)};
window.HF_LOGO = "${dataUri("assets/logo.png")}";
window.HF_LOGO_FULL = "${dataUri("assets/logo-full.png")}";
window.HF_POSTS = ${JSON.stringify(postsMeta).replace(/</g, "\\u003c")};
</script>
<script>
${SRC("engine.js")}
</script>
<script>
${SRC("core.js")}
${SRC("faq.js")}
${SRC("site.js")}
${SRC("legal.js")}
${SRC("app.js")}
</script>
</body>
</html>
`;
write(path.join(DIST, "index.html"), home);

// 2) Blog
write(path.join(DIST, "blog/index.html"), page({
  title: "Blog de ahorro y suscripciones | HorahFlow",
  description: "Ideas prácticas para ahorrar sin hojas de cálculo: suscripciones que no usas, subidas de precio, gasto hormiga, alternativas gratuitas y privacidad.",
  canonical: `${SITE}/blog/`,
  ld: { "@context": "https://schema.org", "@type": "Blog", name: "Blog de HorahFlow", url: `${SITE}/blog/`, inLanguage: "es",
    blogPost: posts.slice(0, 20).map(p => ({ "@type": "BlogPosting", headline: p.title, url: `${SITE}/blog/${p.slug}/`, datePublished: p.date })) },
  body: `<section class="wrap blog-top">
  <span class="kicker">Blog</span>
  <h1>Ideas para que tu dinero no se escape</h1>
  <p class="sub" style="margin-bottom:40px">Suscripciones, ahorro y privacidad, sin hojas de cálculo.</p>
  <div class="blog-grid">
      ${posts.map(card).join("\n      ")}
  </div>
</section>`,
}));
posts.forEach(p => {
  const url = `${SITE}/blog/${p.slug}/`;
  const og = SITE + p.image;
  const related = posts.filter(q => q !== p).sort((a, b) => (b.tag === p.tag) - (a.tag === p.tag)).slice(0, 3);
  write(path.join(DIST, `blog/${p.slug}/index.html`), page({
    title: pageTitle(p.seoTitle || p.title), description: p.description, canonical: url, ogType: "article", ogImage: og,
    extraHead: `<meta property="article:published_time" content="${p.date}">\n<meta property="article:section" content="${esc(p.tag)}">\n`,
    ld: { "@context": "https://schema.org", "@graph": [
      { "@type": "BlogPosting", headline: p.title, description: p.description, datePublished: p.date, dateModified: p.updated || p.date,
        inLanguage: "es", wordCount: p.words, articleSection: p.tag, image: og, mainEntityOfPage: url,
        author: { "@type": "Organization", name: "HorahFlow", url: SITE + "/" },
        publisher: { "@type": "Organization", name: "HorahFlow", logo: { "@type": "ImageObject", url: `${SITE}/assets/logo.png` } } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE + "/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog/` },
        { "@type": "ListItem", position: 3, name: p.title, item: url } ] } ] },
    body: `<article class="article">
  <nav class="crumbs" aria-label="Ruta"><a href="/">Inicio</a> / <a href="/blog/">Blog</a> / <span>${esc(p.tag)}</span></nav>
  <span class="kicker">${esc(p.tag)}</span>
  <h1>${esc(p.title)}</h1>
  <div class="meta"><time datetime="${p.date}">${fmtDate(p.date)}</time> · ${p.min} min de lectura</div>
  <figure class="post-hero">${imgTag(p.image, p.imageAlt, true)}${p.imageCaption ? `<figcaption>${esc(p.imageCaption)}</figcaption>` : ""}</figure>
  <div class="content">
${p.html}
  </div>
  <div class="cta-band" style="margin-top:48px;padding:36px"><div><h2 style="font-size:26px">¿Cuánto se te escapa a ti?</h2><p>Conecta tu correo y lo sabrás en un minuto. Gratis.</p></div><a class="btn btn-green" href="/#registro">Empezar gratis</a></div>
</article>
${related.length ? `<section class="wrap related" style="max-width:1160px;margin-top:64px"><h2 style="font-size:24px;letter-spacing:-.02em;margin-bottom:20px">Sigue leyendo</h2><div class="blog-grid">${related.map(card).join("")}</div></section>` : ""}`,
  }));
});

// 3) Textos legales
const LEGAL_DESC = {
  privacidad: "Qué datos trata HorahFlow, para qué, con qué proveedores y cómo ejercer tus derechos según el RGPD.",
  cookies: "HorahFlow no usa cookies publicitarias ni de seguimiento. Te explicamos el almacenamiento técnico que usamos.",
  terminos: "Condiciones de uso y contratación de HorahFlow: planes, precios con IVA, cancelación y devoluciones en 14 días.",
  "aviso-legal": "Datos del titular de horahflow.com y condiciones de uso del sitio web.",
};
const legalPages = [];
for (const key of Object.keys(LEGAL_SLUG)) {
  if (key === "aviso-legal" && !L.legalComplete()) continue;
  const slug = LEGAL_SLUG[key], url = `${SITE}/${slug}/`, doc = L.LEGAL[key];
  legalPages.push(url);
  write(path.join(DIST, slug, "index.html"), page({
    title: pageTitle(doc.title), description: LEGAL_DESC[key], canonical: url,
    ld: { "@context": "https://schema.org", "@type": "WebPage", name: doc.title, url, inLanguage: "es" },
    body: `<article class="article"><nav class="crumbs"><a href="/">Inicio</a> / <span>${esc(doc.title)}</span></nav>
  <h1>${esc(doc.title)}</h1><div class="meta">Última actualización: ${esc(L.LEGAL_UPDATED)}</div>
  <div class="content">${fixLegalLinks(doc.html())}</div></article>`,
  }));
}

// 4) Sitemap, robots, RSS, IndexNow
const urls = [{ loc: SITE + "/", lastmod: posts[0]?.date || TODAY }, { loc: `${SITE}/blog/`, lastmod: posts[0]?.date || TODAY },
  ...posts.map(p => ({ loc: `${SITE}/blog/${p.slug}/`, lastmod: p.updated || p.date })),
  ...legalPages.map(u => ({ loc: u, lastmod: "2026-11-11" }))];
write(path.join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n")}
</urlset>
`);
write(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /sb/\n\nSitemap: ${SITE}/sitemap.xml\n`);
write(path.join(DIST, "blog/feed.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Blog de HorahFlow</title><link>${SITE}/blog/</link><description>Ideas para ahorrar: suscripciones, gasto hormiga y privacidad.</description><language>es</language>
${posts.slice(0, 30).map(p => `<item><title>${esc(p.title)}</title><link>${SITE}/blog/${p.slug}/</link><guid>${SITE}/blog/${p.slug}/</guid><pubDate>${new Date(p.date + "T08:00:00Z").toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join("\n")}
</channel></rss>
`);
if (CFG.indexNowKey) {
  write(path.join(DIST, `${CFG.indexNowKey}.txt`), CFG.indexNowKey);
  if (process.env.VERCEL_ENV === "production") {
    const since = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
    const fresh = urls.filter(u => u.lastmod >= since).map(u => u.loc);
    if (fresh.length) {
      try {
        const r = await fetch("https://api.indexnow.org/indexnow", { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ host: new URL(SITE).host, key: CFG.indexNowKey, keyLocation: `${SITE}/${CFG.indexNowKey}.txt`, urlList: fresh }) });
        console.log(`IndexNow: ${fresh.length} URL(s) enviadas → HTTP ${r.status}`);
      } catch (e) { console.log("IndexNow: no se pudo avisar (no pasa nada):", e.message); }
    }
  }
}

const pending = all.length - posts.length;
console.log(`✓ ${posts.length} artículos publicados${pending ? ` · ${pending} en borrador o programados` : ""} · ${legalPages.length} páginas legales → dist/`);
