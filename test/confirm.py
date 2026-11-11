import asyncio
from playwright.async_api import async_playwright
def mock(mode):
    return r'''window.supabase={createClient(url){ window.__url=url;
 const sess = %s;
 const q=()=>{const o={select(){return o},eq(){return o},maybeSingle(){ if(%s) return Promise.reject(new TypeError('Load failed')); return Promise.resolve({data:{name:'Guillem Serra',plan:'free'},error:null})}, upsert(){return Promise.resolve({error:null})}};return o};
 return {from:q, auth:{onAuthStateChange(){}, getSession:()=>Promise.resolve({data:{session:sess}}),
   signInWithPassword:()=>Promise.reject(new TypeError('Load failed'))}};
}};''' % ( "{user:{id:'u1',email:'g@x.com',user_metadata:{name:'Guillem'}}}" if mode in ('ok','net') else 'null', 'true' if mode=='net' else 'false')
async def run(p, mode, url):
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = await b.new_page(viewport={'width':390,'height':800}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.route('**/supabase.min.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=mock(mode)))
    await pg.goto(url); await pg.wait_for_timeout(900)
    txt = (await pg.inner_text('body'))[:160].replace('\n',' | ')
    print(mode, '→', await pg.evaluate('location.hash'), '|', txt, '| errs', errs)
    if mode=='used':
        await pg.click('text=Entrar en HorahFlow'); await pg.wait_for_timeout(300)
        await pg.fill('#f-email','g@x.com'); await pg.fill('#f-pass','12345678'); await pg.click('#f-btn'); await pg.wait_for_timeout(400)
        print('   login sin red →', await pg.inner_text('#f-err'))
    if mode=='ok':
        await pg.screenshot(path='shots/confirmado.png')
        await pg.click('text=Ir a HorahFlow'); await pg.wait_for_timeout(500); print('   botón →', await pg.evaluate('location.hash'))
    await b.close()
async def main():
    base='file:///home/claude/horahflow/dist/index.html?confirmado=1'
    async with async_playwright() as p:
        await run(p,'ok', base+'#access_token=x&type=signup')
        await run(p,'used', base+'#error=access_denied&error_code=otp_expired')
        await run(p,'net', base+'#access_token=x&type=signup')
asyncio.run(main())
