import asyncio
from playwright.async_api import async_playwright
URL='file:///home/claude/horahflow/dist/index.html'
async def run(p, vw, vh, tag):
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    pg = await b.new_page(viewport={'width':vw,'height':vh})
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(URL); await pg.wait_for_timeout(600)
    # vídeo
    await pg.evaluate("document.querySelector('#hf-video').scrollIntoView({block:'center'})"); await pg.wait_for_timeout(1200)
    await pg.screenshot(path=f'shots/{tag}-video.png')
    # calculadora
    await pg.evaluate("document.querySelector('#calculadora').scrollIntoView()"); await pg.wait_for_timeout(300)
    m0 = await pg.text_content('#calc-m')
    await pg.click('.chipc[data-i="4"] .cn')
    await pg.fill('.chipc[data-i="0"] input','20'); await pg.wait_for_timeout(600)
    m1 = await pg.text_content('#calc-m'); y1 = await pg.text_content('#calc-y')
    print(tag,'calc', m0,'->',m1, y1)
    await pg.screenshot(path=f'shots/{tag}-calc.png')
    # demo + tutorial
    await pg.evaluate("Auth.demo(); location.hash='app'"); await pg.wait_for_timeout(1500)
    print(tag,'hash',await pg.evaluate('location.hash'))
    await pg.wait_for_timeout(800)
    n=0
    while await pg.query_selector('.tour') and n<12:
        await pg.screenshot(path=f'shots/{tag}-tour{n}.png')
        h = await pg.text_content('.tour-card h3')
        r = await pg.evaluate("(()=>{const c=document.querySelector('.tour-card').getBoundingClientRect();return [Math.round(c.left),Math.round(c.top),Math.round(c.right),Math.round(c.bottom)]})()")
        print(tag,n,h,r, 'center' if await pg.evaluate("document.querySelector('.tour').classList.contains('center')") else '')
        btn = await pg.query_selector('[data-t="next"]') or await pg.query_selector('[data-t="skip"]')
        await btn.click(); await pg.wait_for_timeout(350); n+=1
    print(tag,'tourDone', await pg.evaluate('Data.state.prefs.tourDone'))
    # cuenta real (local): tutorial al entrar por primera vez, y no vuelve tras recargar
    # cuenta nueva (simulada en local, sin tocar Supabase real)
    await pg.evaluate(f"Auth.exitDemo(); Auth.user={{name:'Prueba',email:'{tag}@test.local',plan:'free'}}; Data.state=null; location.hash='app-correos'"); await pg.wait_for_timeout(1200)
    print(tag,'tour on first login', bool(await pg.query_selector('.tour')))
    await pg.screenshot(path=f'shots/{tag}-tour-empty.png')
    await pg.click('[data-t="skip"]'); await pg.wait_for_timeout(200)
    await pg.evaluate("Data.state=null; location.hash='app'"); await pg.wait_for_timeout(1000)
    print(tag,'tour again after reload of data', bool(await pg.query_selector('.tour')), await pg.evaluate('!!Data.state.prefs.tourDone'))
    await pg.goto(URL+'#app-ajustes'); await pg.wait_for_timeout(500)
    await pg.click('#s-tour'); await pg.wait_for_timeout(300)
    print(tag,'restart', bool(await pg.query_selector('.tour')))
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(200)
    print(tag,'esc closes', not await pg.query_selector('.tour'))
    print(tag,'errors', errs)
    await b.close()
async def main():
    async with async_playwright() as p:
        await run(p,1360,860,'d'); await run(p,390,800,'m')
asyncio.run(main())
