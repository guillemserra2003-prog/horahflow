# HorahFlow — horahflow.com

Web + app que lee los recibos de tu correo y encuentra suscripciones olvidadas, subidas de precio y gasto hormiga.

## Cómo está montado

- `src/` → la app (una sola página): `engine.js` (análisis), `core.js` (cuentas, datos, Gmail, IA), `site.js` (portada), `app.js` (panel), `legal.js` (textos legales), `faq.js`, `styles.css`.
- `posts/` → **un archivo `.md` por artículo del blog**. Es lo único que se añade para publicar.
- `public/` → logo, iconos, imagen para compartir (`assets/og.png`) e imágenes del blog (`blog/img/`).
- `build.mjs` → genera la web final en `dist/`: portada + app, blog, páginas legales, `sitemap.xml`, `robots.txt`, feed y aviso a buscadores (IndexNow). Vercel lo ejecuta solo en cada cambio de GitHub.
- `site.config.json` → dirección, claves públicas, enlaces de Stripe, datos del titular y verificación de Google Search Console.
- `supabase/functions/` → funciones del servidor: `stripe-webhook` (activa planes) e `ai` (Claude).

## Publicar un artículo

Crea `posts/nombre-del-articulo.md` → se publica en `horahflow.com/blog/nombre-del-articulo/`.

```
---
title: Título del artículo
seoTitle: Título para Google si el anterior es largo (opcional, máx. ~60 caracteres)
description: Resumen de 1–2 frases (120–155 caracteres). Sale en Google y en la tarjeta.
date: 2026-11-12
tag: Suscripciones
short: Texto corto para el pie de página (opcional)
image: /blog/img/nombre-del-articulo.webp
imageAlt: Descripción de la imagen para Google y personas ciegas
imageCaption: Pie de foto
---

Primer párrafo.

## Subtítulo

Texto con **negrita**, *cursiva* y [un enlace](/blog/otro-articulo/).

![Descripción](/blog/img/otra-imagen.webp "Pie de foto")

[[cta]]   ← caja «Probar HorahFlow gratis»
```

- `date` en el futuro → queda **programado** (se publica en la primera actualización a partir de ese día).
- `draft: true` → **borrador**, no se publica.
- La portada (`image`) es obligatoria: 1200×630, `.webp`.
- Si falta algún campo o una imagen, el build falla y Vercel mantiene la versión anterior: nunca se publica nada roto.

## Cuentas, pagos e IA

- **Supabase** (proyecto `horahflow`, Frankfurt): tablas `profiles`, `user_data`, `stripe_customers`, `stripe_events`, `ai_usage`, todas con RLS. El plan solo lo cambia el servidor (`stripe-webhook`).
- **Stripe**: enlaces de pago y portal de cliente en `site.config.json`.
- **IA**: función `ai` con límites diarios por plan. Clave `ANTHROPIC_API_KEY` en los secretos de Supabase.
- **Correo**: envío con Resend desde hola@horahflow.com; recepción con ImprovMX.
- **Gmail con un clic** (pendiente): necesita `googleClientId`. El permiso `gmail.readonly` es restringido: en modo prueba solo 100 usuarios añadidos a mano; para abrirlo a todos Google exige verificación y auditoría de seguridad anual.

## Probar en local

```
node build.mjs && cd dist && python3 -m http.server 8000
```
