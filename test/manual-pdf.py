# Cobros a mano + extracto en PDF con contraseña: python3 test/manual-pdf.py
import asyncio, pypdf
from playwright.async_api import async_playwright
_src = open('test/forward.py').read(); MOCK = _src[_src.index("r'''") + 4:_src.index("'''", _src.index("r'''") + 4)]
LIB = '/opt/npm-tools/node_modules/pdfjs-dist/legacy/build/'
STMT = '''<html><body style="font-family:Arial;padding:40px"><h2>Liquidación Mensual: Periodo del 23 de septiembre al 22 de octubre de 2026</h2>
<p>Crédito al consumo en modalidad REVOLVING · Financiera Ejemplo, S.L.U.</p><p>Saldo dispuesto inicial 1425,65 €</p><p>(−) Pagos realizados -67,95 € Cuota mensual abonada por el titular.</p>
<p style="letter-spacing:6px">CANTIDAD A PAGAR</p><p>65,15 €</p><p>PRÓXIMO PAGO 24 de octubre de 2026</p></body></html>'''
async def lib(route):
    f = route.request.url.split('/')[-1]
    await route.fulfill(status=200, content_type='text/javascript', headers={'Access-Control-Allow-Origin': '*'}, body=open(LIB + f, 'rb').read())
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        t = await b.new_page(); await t.set_content(STMT); await t.pdf(path='/tmp/pdft/extracto.pdf'); await t.close()
        r = pypdf.PdfReader('/tmp/pdft/extracto.pdf'); w = pypdf.PdfWriter()
        for pg_ in r.pages: w.add_page(pg_)
        w.encrypt('12345678Z', algorithm='AES-128'); w.write('/tmp/pdft/Liquidacion-Mensual.pdf')
        for tag, vp in (('d', {'width': 1280, 'height': 900}), ('m', {'width': 390, 'height': 844})):
            pg = await (await b.new_context(viewport=vp)).new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('**/supabase.min.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=MOCK))
            await pg.route('**/pdfjs-dist@*/**', lib)
            await pg.add_init_script("setInterval(()=>{ if (typeof Tour!=='undefined' && Tour.open) Tour.end(); }, 150)")
            await pg.goto('file:///home/claude/horahflow/dist/index.html#app-correos'); await pg.wait_for_timeout(2500)
            # 1. Añadir un cobro a mano
            await pg.evaluate("location.hash='app-suscripciones'"); await pg.wait_for_timeout(700)
            await pg.click('[data-manual-new]'); await pg.wait_for_timeout(200)
            await pg.click('#mn-save'); print(tag, 'sin nombre:', await pg.inner_text('#mn-err'))
            await pg.fill('#mn-name', 'Préstamo coche'); await pg.fill('#mn-amt', '1.210,50'); await pg.click('#mn-save'); await pg.wait_for_timeout(500)
            row = await pg.evaluate("Data.analysis.subs.filter(s=>s.manual).map(s=>[s.merchant,s.amount,s.cycle,s.cat,s.status])")
            print(tag, 'a mano:', row, '| chip:', await pg.evaluate("[...document.querySelectorAll('[data-sub^=manual]')].length"))
            await pg.screenshot(path=f'shots/{tag}-manual-lista.png', full_page=True)
            await pg.click('[data-sub^=manual]'); await pg.wait_for_timeout(300)
            print(tag, 'detalle:', (await pg.inner_text('.modal')).replace('\n', ' | ')[:160])
            await pg.screenshot(path=f'shots/{tag}-manual-detalle.png')
            await pg.click('#m-edit'); await pg.wait_for_timeout(200)
            print(tag, 'editar precargado:', await pg.input_value('#mn-amt'), await pg.input_value('#mn-date'))
            await pg.fill('#mn-amt', '111'); await pg.select_option('#mn-cyc', 'monthly'); await pg.click('#mn-save'); await pg.wait_for_timeout(400)
            print(tag, 'editado:', await pg.evaluate("Data.analysis.subs.filter(s=>s.manual).map(s=>s.amount)"), '| prefs guardadas:', await pg.evaluate("Data.state.prefs.manual.length"))
            # 2. Aviso de PDF con contraseña llegado por reenvío
            await pg.evaluate("Data.state.prefs.pdfLocked=[{from:'Financiera Ejemplo',subject:'Aquí está el extracto mensual de tu crédito',date:new Date().toISOString(),files:['Liquidacion-Mensual.pdf']}]; Data.save('prefs'); location.hash='app-correos'")
            await pg.wait_for_timeout(700)
            print(tag, 'aviso PDF:', (await pg.inner_text('.card >> nth=0')).split('\n')[0])
            await pg.screenshot(path=f'shots/{tag}-pdf-aviso.png')
            # 3. Subir el PDF: pide la contraseña (primero mal, luego bien)
            await pg.set_input_files('#c-file', ['/tmp/pdft/Liquidacion-Mensual.pdf'])
            await pg.wait_for_selector('#pdfpw', timeout=15000); await pg.screenshot(path=f'shots/{tag}-pdf-clave.png')
            await pg.fill('#pdfpw', 'mala'); await pg.click('#pdfpw-ok')
            await pg.wait_for_selector('#pdfpw', timeout=15000); await pg.wait_for_timeout(200)
            print(tag, 'clave mala:', 'no es correcta' in await pg.inner_text('.modal:has(#pdfpw)'))
            await pg.fill('#pdfpw', '12345678Z'); await pg.press('#pdfpw', 'Enter')
            await pg.wait_for_selector('.toast', timeout=20000); print(tag, 'aviso:', await pg.inner_text('.toast'))
            await pg.wait_for_timeout(500)
            print(tag, 'cobro del PDF:', await pg.evaluate("Data.analysis.subs.filter(s=>/financiera|liquidaci/i.test(s.merchant)).map(s=>[s.merchant,s.amount,s.cycle,s.debt])"), '| aviso quitado:', await pg.evaluate("(Data.state.prefs.pdfLocked||[]).length===0"))
            # 4. Saltar la contraseña
            await pg.evaluate("location.hash='app-correos'"); await pg.wait_for_timeout(500)
            await pg.set_input_files('#c-file', ['/tmp/pdft/Liquidacion-Mensual.pdf'])
            await pg.wait_for_selector('#pdfpw-skip', timeout=15000); await pg.click('#pdfpw-skip')
            await pg.wait_for_selector('.toast', timeout=20000); await pg.wait_for_timeout(300); print(tag, 'saltado:', await pg.inner_text('.toast'))
            print(tag, 'errores:', errs)
        await b.close()
asyncio.run(main())
