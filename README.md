# HorahFlow · horahflow.com

Web completa en un único archivo (`dist/index.html`): inicio, demo interactiva, precios, blog, registro/acceso y la app (resumen, suscripciones, calendario, ahorro, gastos, correos y ajustes).

## Publicar en horahflow.com
1. Sube la carpeta `dist/` a Vercel, Netlify o cualquier hosting estático (no necesita build).
2. Apunta el dominio `horahflow.com` al proyecto.

## Activar Gmail (10 min)
1. Google Cloud Console → crea un proyecto → habilita **Gmail API**.
2. Pantalla de consentimiento OAuth: tipo "Externo", añade el ámbito `gmail.readonly` y tus usuarios de prueba.
3. Credenciales → ID de cliente OAuth → "Aplicación web" → origen autorizado `https://horahflow.com`.
4. Pega el ID en `googleClientId` dentro de `window.HF_CONFIG` (al principio de `dist/index.html`, o en `build.py` y vuelve a ejecutar `python3 build.py`).

Importante: `gmail.readonly` es un ámbito **restringido**. En modo prueba funciona con hasta 100 usuarios que añadas a mano. Para abrirlo al público, Google exige verificar la app y pasar una evaluación de seguridad (CASA) anual con un auditor externo. Mientras tanto, los usuarios pueden subir su correo exportado con Google Takeout (.mbox), que ya funciona.

## Pagos
Crea tres Payment Links en Stripe (Pro mensual, Pro anual, Empresas) y pégalos en `stripe`. Sin enlaces, los planes se activan en "modo prueba".

## Cuentas (Supabase, proyecto `horahflow`, Frankfurt)
- Tablas: `profiles` (plan, cliente de Stripe), `user_data` (fragmentos de recibos + preferencias, jsonb), `stripe_customers`, `stripe_events`. Todas con RLS.
- El plan solo lo cambia el servidor (función `stripe-webhook`), nunca el navegador.
- En Supabase → Authentication → URL Configuration: Site URL `https://horahflow.com` y redirect `https://horahflow.com/**`.

## Estructura
- `src/engine.js` — motor de análisis (detección de importes, servicios, frecuencia, brechas, alternativas).
- `src/core.js` — almacenamiento, cuentas, Gmail, lectura de .eml/.mbox.
- `src/site.js` — web pública y blog.
- `src/app.js` — la app.
- `build.py` — une todo en `dist/index.html`.
