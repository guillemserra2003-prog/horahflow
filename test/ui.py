import asyncio, sys
from playwright.async_api import async_playwright
URL='file:///home/claude/horahflow/dist/index.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1360,'height':900})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type=='error' and errs.append(m.text))
        await pg.goto(URL); await pg.wait_for_timeout(800)
        await pg.screenshot(path='shots/1-home.png')
        await pg.goto(URL+'#demo'); await pg.wait_for_timeout(500)
        await pg.click('#demo-run'); await pg.wait_for_timeout(3500)
        await pg.screenshot(path='shots/2-demo.png')
        await pg.goto(URL+'#precios'); await pg.wait_for_timeout(500); await pg.screenshot(path='shots/3-precios.png')
        # register
        await pg.goto(URL+'#registro'); await pg.wait_for_timeout(300)
        await pg.fill('#f-name','Guigui'); await pg.fill('#f-email','test@horahflow.com'); await pg.fill('#f-pass','password123')
        await pg.click('#f-btn'); await pg.wait_for_timeout(800)
        await pg.screenshot(path='shots/4-empty.png')
        print('hash after register', await pg.evaluate('location.hash'))
        # paste receipts
        await pg.click('#c-paste'); await pg.fill('#p-txt','De: Netflix <info@netflix.com>\nAsunto: Tu recibo\nFecha: 05/10/2026\nTotal: 13,99 €\n---\nDe: Netflix <info@netflix.com>\nAsunto: Tu recibo\nFecha: 05/11/2026\nTotal: 13,99 €\n---\nDe: Spotify <no-reply@spotify.com>\nAsunto: Tu recibo de Spotify\nFecha: 12/11/2026\nImporte: 11,99 €')
        await pg.click('#p-go'); await pg.wait_for_timeout(500)
        await pg.screenshot(path='shots/5-sources.png')
        # upload eml
        open('/tmp/r.eml','w').write('From: "Adobe" <message@adobe.com>\nSubject: =?UTF-8?Q?Factura_de_tu_plan?=\nDate: Mon, 2 Nov 2026 10:00:00 +0100\nContent-Type: text/html; charset=utf-8\nContent-Transfer-Encoding: quoted-printable\n\n<p>Creative Cloud cuota mensual. Total pagado: 14,99 =E2=82=AC</p>')
        await pg.set_input_files('#c-file','/tmp/r.eml'); await pg.wait_for_timeout(700)
        print('toast', await pg.evaluate("document.querySelector('.toast')?.textContent"))
        # load demo data via logout & demo
        await pg.goto(URL+'#app'); await pg.wait_for_timeout(400); await pg.screenshot(path='shots/6-mine.png')
        print('mine', (await pg.inner_text('.kpis'))[:200].replace('\n',' | '))
        await pg.evaluate("Auth.logout(); location.hash='entrar'"); await pg.wait_for_timeout(400)
        print('auth hash', await pg.evaluate('location.hash'), await pg.evaluate("!!document.querySelector('#f-demo')"))
        await pg.click('#f-demo'); await pg.wait_for_timeout(600)
        await pg.screenshot(path='shots/7-overview.png', full_page=True)
        await pg.click('.suggest button'); await pg.wait_for_timeout(200)
        await pg.fill('#ask-q','¿cuánto pago de netflix?'); await pg.press('#ask-q','Enter'); await pg.wait_for_timeout(200)
        print('chat', await pg.inner_text('#chat'))
        for v in ['app-suscripciones','app-calendario','app-ahorro','app-gastos','app-correos','app-ajustes']:
            await pg.evaluate(f"location.hash='{v}'"); await pg.wait_for_timeout(400)
            await pg.screenshot(path=f'shots/8-{v}.png', full_page=True)
        await pg.evaluate("location.hash='app-suscripciones'"); await pg.wait_for_timeout(300)
        await pg.click('tr[data-sub="netflix"]'); await pg.wait_for_timeout(300); await pg.screenshot(path='shots/9-modal.png')
        await pg.keyboard.press('Escape')
        await pg.evaluate("location.hash='blog-correo-no-banco'"); await pg.wait_for_timeout(400); await pg.screenshot(path='shots/10-post.png')
        m = await b.new_page(viewport={'width':390,'height':844}, is_mobile=True)
        m.on('pageerror', lambda e: errs.append('M:'+str(e)))
        await m.goto(URL); await m.wait_for_timeout(600); await m.screenshot(path='shots/11-mobile-home.png')
        await m.goto(URL+'#entrar'); await m.wait_for_timeout(300); await m.click('#f-demo'); await m.wait_for_timeout(500); await m.screenshot(path='shots/12-mobile-app.png', full_page=True)
        print('ERRORS', errs)
        await b.close()
asyncio.run(main())
