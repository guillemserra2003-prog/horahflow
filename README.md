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

- **Supabase** (proyecto `horahflow`, Frankfurt): tablas `profiles`, `user_data`, `stripe_customers`, `stripe_events`, `ai_usage`, `inbound_addresses`, `inbound_emails`, `alert_log`, todas con RLS. El plan solo lo cambia el servidor (`stripe-webhook`).
- **Stripe**: enlaces de pago y portal de cliente en `site.config.json`. El portal permite cambiar entre Pro y Empresas (mensual/anual) y cancelar a final de periodo.
- **IA**: función `ai` con límites diarios por plan. Clave `ANTHROPIC_API_KEY` en los secretos de Supabase.
- **Correo saliente**: Resend desde hola@ y avisos@horahflow.com. **Correo entrante de hola@**: ImprovMX.

## Reenvío de recibos y avisos

- Cada usuario crea direcciones `<token>@recibos.horahflow.com` (Gratis 1, Pro 5, Empresas 25; lo controla `create_inbound_address` en la base de datos).
- El subdominio `recibos.horahflow.com` recibe con **Resend Inbound** → webhook `email.received` → función `inbound`. Secretos: `RESEND_API_KEY` y `RESEND_WEBHOOK_SECRET`.
- `inbound` comprueba la firma, descarga el correo, desempaqueta los reenvíos manuales, guarda el código de confirmación de Gmail y descarta lo que no es un cobro. Los recibos esperan en `inbound_emails` hasta que la app los importa (y se borran a los 60 días).
- **Avisos**: `pg_cron` llama cada día a las 7:15 UTC a la función `daily` (clave `CRON_KEY` en `private.config`). Envía a Pro/Empresas los cobros de los próximos días, las fugas nuevas y, el día 1, el resumen del mes. `alert_log` evita repetir avisos.
- Prueba sin enviar nada: `select net.http_post(url:='https://jmqikuquouqvcmkimrdk.supabase.co/functions/v1/daily', headers:=jsonb_build_object('Content-Type','application/json','x-cron-key',(select value from private.config where key='CRON_KEY')), body:='{"user":"<id>","dry":true}'::jsonb);`

### Si cambias `src/engine.js`

Las funciones `inbound` y `daily` descargan el motor de `https://horahflow.com/server/engine.js` y solo lo ejecutan si su SHA-256 coincide con `ENGINE_SHA256` de `supabase/functions/*/engine-loader.ts`. El build falla si no coinciden: actualiza la huella en los dos archivos, haz push y vuelve a desplegar `inbound` y `daily`.

## Gmail con un clic (pendiente)

Necesita `googleClientId`. El permiso `gmail.readonly` es restringido: en modo prueba solo 100 usuarios añadidos a mano; para abrirlo a todos Google exige verificación y auditoría de seguridad anual. Mientras tanto, el reenvío cubre Gmail y cualquier otro correo.

## Probar en local

```
node build.mjs && cd dist && python3 -m http.server 8000
```
