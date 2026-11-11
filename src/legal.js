/* =========================================================
   HorahFlow · Textos legales (España / UE)
   Datos del titular en CFG.legal. El aviso legal solo se muestra
   cuando están completos (LSSI art. 10).
   ========================================================= */
const LEGAL_UPDATED = '11 de noviembre de 2026';
const LG = () => Object.assign({ name: 'Guillem Serra Sentinella', email: 'gserrasentinella@gmail.com', nif: '', address: '' }, CFG.legal || {});
const legalComplete = () => !!(LG().nif && LG().address);

const LEGAL = {
  privacidad: {
    title: 'Política de privacidad',
    html: () => { const L = LG(); return `
<p>En HorahFlow nos tomamos en serio tu privacidad, sobre todo porque trabajamos con información sobre tus gastos. Aquí te explicamos, sin letra pequeña, qué datos tratamos, para qué y qué derechos tienes, conforme al Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).</p>

<h2>1. Responsable del tratamiento</h2>
<ul><li><b>Responsable:</b> ${esc(L.name)}</li>${L.nif ? `<li><b>NIF:</b> ${esc(L.nif)}</li>` : ''}${L.address ? `<li><b>Domicilio:</b> ${esc(L.address)}</li>` : ''}
<li><b>Correo para cualquier cuestión de privacidad:</b> <a class="link" href="mailto:${esc(L.email)}">${esc(L.email)}</a></li></ul>

<h2>2. Qué datos tratamos</h2>
<ul>
<li><b>Datos de tu cuenta:</b> nombre, correo electrónico y contraseña (guardada cifrada; nadie puede leerla, tampoco nosotros).</li>
<li><b>Datos de tus recibos:</b> cuando conectas tu correo, subes archivos o pegas texto, el análisis se hace en tu navegador. De cada recibo guardamos solo un fragmento con el comercio, el importe, la fecha y la frecuencia. <b>Nunca guardamos tus correos completos ni los que no son recibos.</b></li>
<li><b>Tus preferencias en la app:</b> qué suscripciones usas, cuáles has cancelado, avisos, etc.</li>
<li><b>Datos de pago:</b> si contratas un plan, el pago lo procesa Stripe. HorahFlow no ve ni guarda los datos de tu tarjeta; solo recibimos el estado de tu suscripción.</li>
<li><b>Estadísticas anónimas de visitas</b> (sin cookies ni identificadores personales), con Vercel Web Analytics.</li>
<li><b>Datos técnicos mínimos:</b> registros de acceso y seguridad (por ejemplo, dirección IP y hora de inicio de sesión) que generan nuestros proveedores para proteger el servicio.</li>
</ul>
<p>No pedimos ni tratamos datos bancarios, ni contraseñas de tu correo, ni datos especialmente protegidos.</p>

<h2>3. Para qué los usamos y con qué base legal</h2>
<ul>
<li><b>Prestarte el servicio</b> (crear tu cuenta, analizar tus recibos, mostrarte tus gastos, alertas y consejos): ejecución del contrato que aceptas al registrarte (art. 6.1.b RGPD).</li>
<li><b>Leer tu Gmail</b> si decides conectarlo: tu consentimiento expreso, que das en la pantalla de Google y puedes retirar cuando quieras.</li>
<li><b>Gestionar pagos y facturación:</b> ejecución del contrato y cumplimiento de obligaciones legales fiscales (art. 6.1.c RGPD).</li>
<li><b>Seguridad y prevención del fraude:</b> interés legítimo en mantener el servicio seguro (art. 6.1.f RGPD).</li>
<li><b>Correos de servicio</b> (confirmar tu cuenta, cambiar la contraseña, avisos importantes sobre tu cuenta o tu plan): ejecución del contrato. No te enviaremos publicidad sin tu permiso.</li>
</ul>
<p>No vendemos tus datos, no los usamos para publicidad y no tomamos decisiones automatizadas con efectos jurídicos sobre ti.</p>

<h2>4. Inteligencia artificial</h2>
<p>Para responder a tus preguntas en Flow, generar tu análisis personalizado y leer recibos poco habituales usamos la IA de Anthropic (Claude) desde nuestro servidor. Solo le enviamos un resumen de tus gastos o el fragmento del recibo, nunca tus correos completos ni tus datos de acceso. Anthropic actúa como encargado del tratamiento y no utiliza estos datos para entrenar sus modelos. Las respuestas de la IA son orientativas y pueden contener errores.</p>

<h2>5. Uso de datos de Google</h2>
<p>El uso y la transferencia a cualquier otra aplicación de la información recibida de las API de Google por parte de HorahFlow cumplen la <a class="link" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener">Política de Datos de Usuario de los Servicios API de Google</a>, incluidos los requisitos de uso limitado. El permiso es de solo lectura, se usa únicamente para encontrar tus recibos y se revoca al terminar cada sincronización.</p>

<h2>6. Quién más trata tus datos (encargados del tratamiento)</h2>
<p>Para funcionar usamos proveedores que tratan datos por cuenta nuestra, con contrato y garantías:</p>
<ul>
<li><b>Supabase</b>: base de datos y cuentas de usuario. Servidores en la Unión Europea (Frankfurt, Alemania).</li>
<li><b>Vercel</b>: alojamiento de la web.</li>
<li><b>Stripe</b>: pagos y facturación.</li>
<li><b>Resend</b>: envío de correos del servicio (servidores en Irlanda).</li>
<li><b>Anthropic</b>: inteligencia artificial (ver apartado 4).</li>
<li><b>Google</b>: solo si conectas tu Gmail.</li>
</ul>
<p>Algunos de estos proveedores tienen sede en Estados Unidos. Cuando hay transferencias internacionales, se realizan con las garantías previstas en el RGPD: el Marco de Privacidad de Datos UE-EE. UU. o cláusulas contractuales tipo aprobadas por la Comisión Europea.</p>

<h2>7. Cuánto tiempo los conservamos</h2>
<ul>
<li>Mientras tengas tu cuenta activa.</li>
<li>Si borras tus recibos o eliminas tu cuenta desde Ajustes, los borramos de inmediato de la aplicación. Las copias de seguridad técnicas se eliminan solas en un máximo de 7 días.</li>
<li>Los datos de facturación se conservan el tiempo que exige la ley (normalmente 6 años, art. 30 del Código de Comercio).</li>
</ul>

<h2>8. Tus derechos</h2>
<p>Puedes ejercer en cualquier momento tus derechos de <b>acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad</b>, así como <b>retirar tu consentimiento</b>, escribiendo a <a class="link" href="mailto:${esc(L.email)}">${esc(L.email)}</a>. Muchas de estas acciones las puedes hacer tú mismo desde <b>Ajustes</b> (editar tu nombre, borrar tus recibos, eliminar tu cuenta, exportar tus datos en el plan Pro).</p>
<p>Si consideras que no hemos atendido bien tu solicitud, puedes reclamar ante la <a class="link" href="https://www.aepd.es" target="_blank" rel="noopener">Agencia Española de Protección de Datos</a>.</p>

<h2>9. Seguridad</h2>
<p>Toda la comunicación va cifrada (HTTPS). Cada usuario solo puede acceder a sus propios datos gracias a reglas de seguridad en la base de datos, y tu plan de pago solo puede modificarlo nuestro servidor tras la confirmación de Stripe.</p>

<h2>10. Edad mínima</h2>
<p>HorahFlow está dirigido a mayores de 18 años.</p>

<h2>11. Cambios en esta política</h2>
<p>Si hacemos cambios importantes te avisaremos por correo o en la propia app antes de que entren en vigor.</p>`; }
  },

  cookies: {
    title: 'Política de cookies',
    html: () => { const L = LG(); return `
<p>Esta política explica qué cookies y tecnologías similares usa horahflow.com, conforme al artículo 22.2 de la Ley 34/2002 (LSSI) y la guía de la Agencia Española de Protección de Datos.</p>

<h2>Resumen</h2>
<p><b>HorahFlow no usa cookies publicitarias, de seguimiento ni de analítica de terceros.</b> Solo usamos el almacenamiento técnico imprescindible para que la web funcione, que no necesita tu consentimiento. Por eso no verás un banner de cookies.</p>

<h2>Qué guardamos en tu navegador</h2>
<p>En lugar de cookies, usamos el almacenamiento local del navegador (<i>localStorage</i>) para:</p>
<ul>
<li><b>Mantener tu sesión iniciada</b> de forma segura (token de acceso de Supabase). Es técnica y necesaria.</li>
<li><b>Guardar una copia local de tus datos</b> para que la app cargue rápido y funcione aunque falle la conexión un momento. Es técnica y necesaria.</li>
<li><b>Recordar tus preferencias de uso</b> dentro de la app. Es técnica y necesaria.</li>
</ul>
<h2>Estadísticas de visitas sin cookies</h2>
<p>Para saber cuántas personas visitan la web y qué páginas leen usamos Vercel Web Analytics, que <b>no usa cookies</b>, no guarda tu dirección IP y no permite identificarte ni seguirte entre webs. Solo vemos datos agregados (por ejemplo, «120 visitas al blog hoy»).</p>
<p>Esta información se queda en tu dispositivo y se borra al cerrar sesión, al eliminar tu cuenta o al limpiar los datos de navegación.</p>

<h2>Servicios de terceros</h2>
<ul>
<li><b>Pago con Stripe:</b> cuando pulsas «Pasar a Pro» vas a una página de Stripe (stripe.com), que usa sus propias cookies necesarias para procesar el pago de forma segura y prevenir el fraude. Consulta la <a class="link" href="https://stripe.com/es/legal/cookies-policy" target="_blank" rel="noopener">política de cookies de Stripe</a>.</li>
<li><b>Tipografía:</b> la fuente de la web se carga desde Google Fonts, lo que implica que tu navegador comunica tu dirección IP a Google al descargarla. Google no instala cookies por este servicio.</li>
<li><b>Inicio de sesión con Google:</b> solo si conectas tu Gmail, Google puede usar sus propias cookies en su ventana de acceso.</li>
</ul>

<h2>Cómo borrar estos datos</h2>
<p>Puedes cerrar sesión, eliminar tu cuenta desde Ajustes o borrar los datos del sitio desde la configuración de tu navegador (Chrome, Safari, Firefox o Edge).</p>

<h2>Contacto</h2>
<p>Si tienes cualquier duda, escríbenos a <a class="link" href="mailto:${esc(L.email)}">${esc(L.email)}</a>.</p>`; }
  },

  terminos: {
    title: 'Condiciones de uso y contratación',
    html: () => { const L = LG(); return `
<p>Estas condiciones regulan el uso de HorahFlow (horahflow.com) y la contratación de sus planes. Al crear una cuenta las aceptas. Están escritas para que se entiendan; si algo no está claro, escríbenos.</p>

<h2>1. Quién presta el servicio</h2>
<p>HorahFlow es un servicio de ${esc(L.name)}${legalComplete() ? ` (NIF ${esc(L.nif)})` : ''}. Contacto: <a class="link" href="mailto:${esc(L.email)}">${esc(L.email)}</a>.${legalComplete() ? ' Más datos en el <a class="link" href="#aviso-legal">aviso legal</a>.' : ''}</p>

<h2>2. Qué es HorahFlow</h2>
<p>Una herramienta que analiza los recibos de tu correo para mostrarte tus suscripciones, tus cobros recurrentes y tus gastos, y darte ideas para ahorrar. Es <b>informativa</b>: no es un banco, no mueve dinero, no cancela servicios en tu nombre y <b>no constituye asesoramiento financiero</b>. Los importes son estimaciones a partir de los recibos que encontramos y pueden no recoger cobros que no te llegan por correo.</p>

<h2>3. Tu cuenta</h2>
<ul>
<li>Debes ser mayor de 18 años y dar un correo válido que te pertenezca.</li>
<li>Eres responsable de mantener tu contraseña en secreto.</li>
<li>Solo puedes conectar buzones de correo que sean tuyos o que estés autorizado a gestionar.</li>
<li>Puedes eliminar tu cuenta cuando quieras desde Ajustes.</li>
</ul>

<h2>4. Planes y precios</h2>
<ul>
<li><b>Gratis:</b> sin coste y sin fecha de caducidad, con las funciones y límites indicados en la página de precios.</li>
<li><b>Pro y Empresas:</b> suscripción mensual o anual al precio mostrado en el momento de contratar. <b>Los precios incluyen IVA.</b></li>
<li>El pago se realiza con tarjeta a través de Stripe. La suscripción <b>se renueva automáticamente</b> al final de cada periodo hasta que la canceles.</li>
<li>Si cambiamos los precios, te avisaremos con al menos 30 días de antelación y el cambio se aplicará en tu siguiente renovación. Podrás cancelar antes si no estás de acuerdo.</li>
<li>Puedes descargar tus facturas desde «Gestionar suscripción y facturas» en Ajustes.</li>
</ul>

<h2>5. Cancelación</h2>
<p>Puedes cancelar tu suscripción en cualquier momento, en un clic, desde <b>Ajustes → Gestionar suscripción y facturas</b>. Seguirás teniendo el plan hasta el final del periodo ya pagado y después pasarás al plan Gratis, sin perder tus datos.</p>

<h2>6. Derecho de desistimiento y devoluciones</h2>
<p>Si eres consumidor, tienes <b>14 días naturales</b> desde la contratación para desistir sin dar explicaciones. En HorahFlow te devolvemos el <b>importe íntegro</b> aunque ya hayas empezado a usar el plan. Para ejercerlo, escríbenos a <a class="link" href="mailto:${esc(L.email)}">${esc(L.email)}</a> indicando el correo de tu cuenta; te devolveremos el dinero en un máximo de 14 días por el mismo medio de pago.</p>

<h2>7. Uso aceptable</h2>
<p>No está permitido usar HorahFlow para fines ilegales, intentar acceder a datos de otros usuarios, saturar o atacar el servicio, ni revender el acceso sin autorización. Podemos suspender cuentas que incumplan estas normas, avisándote siempre que sea posible.</p>

<h2>8. Disponibilidad y responsabilidad</h2>
<p>Trabajamos para que HorahFlow esté siempre disponible y funcione correctamente, pero puede haber interrupciones puntuales por mantenimiento o causas ajenas. Las recomendaciones de ahorro, incluidas las generadas por IA, son orientativas: la decisión de cancelar o contratar cualquier servicio es siempre tuya. Nada de lo anterior limita los derechos que te reconoce la normativa de consumidores.</p>

<h2>9. Propiedad intelectual</h2>
<p>La marca HorahFlow, el diseño y el software de la web pertenecen a su titular. Tus datos son tuyos: puedes exportarlos (plan Pro) o borrarlos cuando quieras.</p>

<h2>10. Cambios en estas condiciones</h2>
<p>Si cambiamos estas condiciones de forma relevante te avisaremos con antelación por correo o en la app.</p>

<h2>11. Ley aplicable</h2>
<p>Estas condiciones se rigen por la ley española. Si eres consumidor, podrás acudir a los tribunales de tu domicilio. Antes de cualquier reclamación, escríbenos: casi todo se soluciona hablando.</p>`; }
  },

  'aviso-legal': {
    title: 'Aviso legal',
    html: () => { const L = LG(); return `
<p>En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI), se informa de los datos del titular de este sitio web:</p>
<ul>
<li><b>Titular:</b> ${esc(L.name)}</li>
<li><b>NIF:</b> ${esc(L.nif)}</li>
<li><b>Domicilio:</b> ${esc(L.address)}</li>
<li><b>Correo electrónico:</b> <a class="link" href="mailto:${esc(L.email)}">${esc(L.email)}</a></li>
<li><b>Sitio web:</b> horahflow.com</li>
<li><b>Actividad:</b> servicio online de análisis de gastos y suscripciones a partir de recibos de correo electrónico.</li>
</ul>

<h2>Condiciones de uso del sitio</h2>
<p>El acceso a esta web atribuye la condición de usuario e implica la aceptación de este aviso legal, de la <a class="link" href="#privacidad">política de privacidad</a>, de la <a class="link" href="#cookies">política de cookies</a> y, si creas una cuenta, de las <a class="link" href="#terminos">condiciones de uso y contratación</a>.</p>

<h2>Propiedad intelectual e industrial</h2>
<p>Los contenidos, textos, diseño, logotipos y software de horahflow.com son titularidad de ${esc(L.name)} o se usan con autorización. No está permitida su reproducción con fines comerciales sin permiso expreso.</p>

<h2>Responsabilidad</h2>
<p>La información del blog y de la web tiene carácter divulgativo y no constituye asesoramiento financiero. El titular no se hace responsable del uso que se haga de ella ni del contenido de sitios web de terceros enlazados.</p>

<h2>Legislación aplicable</h2>
<p>Este aviso legal se rige por la legislación española.</p>`; }
  }
};

function renderLegal(which) {
  if (which === 'aviso-legal' && !legalComplete()) which = 'terminos';
  const doc = LEGAL[which] || LEGAL.privacidad;
  const others = Object.keys(LEGAL).filter(k => k !== which && (k !== 'aviso-legal' || legalComplete()));
  root.innerHTML = navHTML() + `<main><article class="article"><a class="back" href="#inicio">← Inicio</a>
    <h1>${doc.title}</h1><div class="meta">Última actualización: ${LEGAL_UPDATED}</div>
    <div class="content">${doc.html()}</div>
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid var(--line);display:flex;gap:18px;flex-wrap:wrap;font-size:14px">${others.map(k => `<a class="link" href="#${k}">${LEGAL[k].title}</a>`).join('')}</div>
  </article></main>` + footerHTML();
  bindNav(); window.scrollTo(0, 0);
}
