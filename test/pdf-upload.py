# Subir facturas en PDF desde «Correos → Subir archivos»: python3 test/pdf-upload.py
import asyncio, sys
from playwright.async_api import async_playwright
_src = open('test/forward.py').read(); MOCK = _src[_src.index("r'''") + 4:_src.index("'''", _src.index("r'''") + 4)]  # solo el simulador, sin ejecutar ese test
LIB = '/opt/npm-tools/node_modules/pdfjs-dist/legacy/build/'
async def lib(route):
    f = route.request.url.split('/')[-1]
    await route.fulfill(status=200, content_type='text/javascript', headers={'Access-Control-Allow-Origin': '*'}, body=open(LIB + f, 'rb').read())
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await (await b.new_context(viewport={'width': 1280, 'height': 900})).new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: print('consola:', m.text[:200]) if m.type in ('error','warning') else None)
        await pg.route('**/supabase.min.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=MOCK.replace("window.__inbox=[", "window.__inbox=[];window.__x=[")))
        await pg.route('**/pdfjs-dist@*/**', lib)
        await pg.add_init_script("localStorage.setItem('hf:x','1'); setInterval(()=>{ if (typeof Tour!=='undefined' && Tour.open) Tour.end(); }, 150)")
        await pg.goto('file:///home/claude/horahflow/dist/index.html#app-correos'); await pg.wait_for_timeout(2000)
        await pg.evaluate("location.hash='app-correos'"); await pg.wait_for_timeout(800)
        print('texto subir:', (await pg.inner_text('.connect-grid')).split('\n')[1][:70])
        await pg.set_input_files('#c-file', ['/tmp/pdft/Factura_ITV.pdf', '/tmp/pdft/factura-luz-octubre.pdf', '/tmp/pdft/escaneado.pdf'])
        await pg.wait_for_timeout(4000)
        print('estado:', await pg.evaluate("[location.hash, !!document.querySelector('.modal'), document.querySelector('.modal')?.innerText?.slice(0,120), Auth.user && Auth.user.demo, (document.querySelector('#c-file')||{}).files?.length, typeof pdfjs, pdfjs && pdfjs.version]"))
        await pg.screenshot(path='shots/pdf-debug.png')
        await pg.wait_for_selector('.toast', timeout=20000)
        print('aviso:', await pg.inner_text('.toast'))
        tx = await pg.evaluate("(() => { const a = HFEngine.analyze(Data.state.emails); return [...a.oneoffs, ...a.subs.map(s=>({merchant:s.name, amount:s.amount, date:s.last||s.next}))].map(c => c.merchant + ' ' + c.amount + ' ' + new Date(c.date).toISOString().slice(0,10)); })()")
        print('gastos:', tx)
        await pg.screenshot(path='shots/pdf-upload.png')
        print('ERRORES JS', errs)
        await b.close()
asyncio.run(main())
