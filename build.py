import base64, pathlib
S = pathlib.Path('src')
b64 = lambda f: 'data:image/png;base64,' + base64.b64encode((S/f).read_bytes()).decode()
config = '''window.HF_CONFIG = {
  // 1) Gmail: crea un ID de cliente OAuth (tipo "Aplicación web") en Google Cloud,
  //    añade https://horahflow.com como origen autorizado y pégalo aquí.
  googleClientId: '',
  // 2) Opcional: cuentas en la nube con Supabase Auth (si se deja vacío, las cuentas son locales).
  supabaseUrl: 'https://jmqikuquouqvcmkimrdk.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptcWlrdXF1b3VxdmNta2ltcmRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0MTgwMDUsImV4cCI6MjEwOTk5NDAwNX0.e7EJlj-4okNexW920ySz34_3eo_g00U9x1ClearDQAs',
  // Datos del titular para los textos legales (el aviso legal aparece cuando nif y address están rellenos)
  legal: { name: 'Guillem Serra Sentinella', email: 'gserrasentinella@gmail.com', nif: '', address: '' },
  // 3) Pagos: enlaces de pago (Payment Links) de Stripe y portal de cliente.
  stripe: {
    pro: 'https://buy.stripe.com/5kQcMYew50Y47IL4q36EU00',
    proYear: 'https://buy.stripe.com/14AfZa73D36cfbd1dR6EU01',
    business: 'https://buy.stripe.com/9B68wI0FfgX2bZ13lZ6EU02',
    businessYear: 'https://buy.stripe.com/eVq14ggEdfSY8MPcWz6EU03',
    portal: 'https://billing.stripe.com/p/login/5kQcMYew50Y47IL4q36EU00'
  }
};'''
html = f'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HorahFlow — Descubre a dónde se va tu dinero</title>
<meta name="description" content="HorahFlow lee los recibos de tu correo, detecta tus suscripciones y cobros recurrentes y te dice dónde se escapa tu dinero.">
<meta property="og:title" content="HorahFlow — Descubre a dónde se va tu dinero">
<meta property="og:description" content="Suscripciones olvidadas, subidas de precio, cobros duplicados y gasto hormiga. Conecta tu correo y descúbrelo en un minuto.">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="{b64('icon.png')}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
{(S/'styles.css').read_text()}
</style>
</head>
<body>
<div id="root"></div>
<script>
{config}
window.HF_LOGO = "{b64('logo.png')}";
window.HF_LOGO_FULL = "{b64('logo-full.png')}";
</script>
<script>
{(S/'engine.js').read_text()}
</script>
<script>
{(S/'core.js').read_text()}
{(S/'site.js').read_text()}
{(S/'legal.js').read_text()}
{(S/'app.js').read_text()}
</script>
</body>
</html>
'''
pathlib.Path('dist').mkdir(exist_ok=True)
pathlib.Path('dist/index.html').write_text(html)
print(len(html))
