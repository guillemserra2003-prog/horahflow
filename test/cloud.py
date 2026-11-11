import asyncio
from playwright.async_api import async_playwright
MOCK = r'''
window.__calls=[];
window.supabase={createClient(){
 let session=null; const db={profiles:{}, user_data:{}};
 const q=(t)=>{const o={_t:t,_f:{},select(){return o},eq(k,v){o._f[k]=v;return o},ilike(){return o},
   maybeSingle(){const key=o._f.id||o._f.user_id;return Promise.resolve({data:db[t][key]||null,error:null})},
   upsert(row){__calls.push(['upsert',t,row]);db[t][row.user_id||row.id]=row;return Promise.resolve({error:null})},
   update(p){__calls.push(['update',t,p]);return {eq:(k,v)=>{Object.assign(db[t][v]||{},p);return Promise.resolve({error:null})}}}};return o};
 return {from:q, rpc:(n)=>{__calls.push(['rpc',n]);return Promise.resolve({error:null})},
  auth:{onAuthStateChange(){}, getSession:()=>Promise.resolve({data:{session}}),
   signUp:({email,options})=>{__calls.push(['signUp',email,options.emailRedirectTo]);return Promise.resolve({data:{user:{identities:[{}]},session:null},error:null})},
   signInWithPassword:({email,password})=>{ if(password!=='password123') return Promise.resolve({data:{},error:{message:'Invalid login credentials'}});
     session={user:{id:'u1',email,user_metadata:{name:'Guigui'}}}; db.profiles.u1={name:'Guigui',plan:'free'}; return Promise.resolve({data:{session},error:null})},
   signOut:()=>{session=null;return Promise.resolve({})}, resetPasswordForEmail:(e)=>{__calls.push(['reset',e]);return Promise.resolve({error:null})}}};
}};'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1300,'height':900}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/supabase.min.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=MOCK))
        await pg.goto('file:///home/claude/horahflow/dist/index.html#registro'); await pg.wait_for_timeout(800)
        await pg.fill('#f-name','Guigui'); await pg.fill('#f-email','g@x.com'); await pg.fill('#f-pass','password123'); await pg.click('#f-btn'); await pg.wait_for_timeout(500)
        print('confirm screen:', (await pg.inner_text('#auth-form'))[:60].replace('\n',' '))
        await pg.evaluate("location.hash='entrar'"); await pg.wait_for_timeout(400)
        await pg.fill('#f-email','g@x.com'); await pg.fill('#f-pass','mala'); await pg.click('#f-btn'); await pg.wait_for_timeout(400)
        print('bad login:', await pg.inner_text('#f-err'))
        await pg.click('#f-forgot'); await pg.wait_for_timeout(300); print('forgot:', await pg.inner_text('#f-err'))
        await pg.fill('#f-pass','password123'); await pg.click('#f-btn'); await pg.wait_for_timeout(600)
        print('hash:', await pg.evaluate('location.hash'))
        await pg.evaluate("location.hash='app-correos'"); await pg.wait_for_timeout(400)
        await pg.click('#c-paste'); await pg.fill('#p-txt','De: Netflix <info@netflix.com>\nAsunto: Tu recibo\nFecha: 05/11/2026\nTotal: 13,99 €'); await pg.click('#p-go'); await pg.wait_for_timeout(1200)
        await pg.click('[data-buy="pro"]'); await pg.wait_for_timeout(300); print('buy modal:', (await pg.inner_text('.modal'))[:70].replace('\n',' '))
        calls = await pg.evaluate('__calls'); print('calls:', [c[:2] for c in calls]); print('upsert state emails:', [len(c[2]['state']['emails']) for c in calls if c[0]=='upsert'])
        print('ERR', errs); await b.close()
asyncio.run(main())
