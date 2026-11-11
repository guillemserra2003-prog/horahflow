import asyncio, json
from playwright.async_api import async_playwright
MOCK = r'''
window.__calls=[]; window.__mode='ok';
window.supabase={createClient(){
 const session={user:{id:'u1',email:'g@x.com',user_metadata:{name:'Guillem'}}}; const db={user_data:{}};
 const q=(t)=>{const o={_f:{},select(){return o},eq(k,v){o._f[k]=v;return o},
   maybeSingle(){ if(t==='profiles') return Promise.resolve({data:{name:'Guillem',plan:'free'},error:null}); return Promise.resolve({data:db.user_data.u1||null,error:null})},
   upsert(row){db.user_data.u1={state:row.state}; return Promise.resolve({error:null})}};return o};
 return {from:q,
  functions:{invoke:(name,{body})=>{ __calls.push(body.action);
    if(__mode==='nokey') return Promise.resolve({data:null,error:{context:{json:async()=>({error:'not_configured'})}}});
    if(body.action==='ask') return Promise.resolve({data:{answer:'Gastas **38,13 €** al mes en streaming: Netflix, Disney+, Max y Prime.'},error:null});
    if(body.action==='advice') return Promise.resolve({data:{advice:'Tienes margen claro de ahorro.\n- Cancela Max (HBO): **119,88 €/año**.\n- Pasa Spotify a Duo: **60 €/año**.\nPoco a poco se nota.'},error:null});
    if(body.action==='parse') return Promise.resolve({data:{results:body.items.map((it,i)=>({i,merchant:'Clínica Dental Sonrisa',amount:45,currency:'EUR',recurring:false,cycle:null,category:'otros'}))},error:null});
  }},
  auth:{onAuthStateChange(){}, getSession:()=>Promise.resolve({data:{session}})}};
}};'''
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1300,'height':900}); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/supabase.min.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=MOCK))
        await pg.goto('file:///home/claude/horahflow/dist/index.html#app-correos'); await pg.wait_for_timeout(900)
        # 1) cargar ejemplo y pegar un recibo raro
        await pg.click('#load-demo'); await pg.wait_for_timeout(600)
        await pg.evaluate("location.hash='app-correos'"); await pg.wait_for_timeout(400)
        await pg.click('#c-paste'); await pg.fill('#p-txt','De: Clinica Dental Sonrisa <pagos@sonrisa.es>\nAsunto: Factura de su visita\nFecha: 03/11/2026\nSu pago se ha procesado. Concepto: revisión anual. Valor abonado: 45 eu.')
        await pg.click('#p-go'); await pg.wait_for_timeout(800)
        found = await pg.evaluate("Data.analysis.charges.filter(c=>/Sonrisa/.test(c.merchant)).map(c=>[c.merchant,c.amount,c.cat])")
        print('recibo raro leído por IA:', found)
        # 2) Flow
        await pg.evaluate("location.hash='app'"); await pg.wait_for_timeout(500)
        await pg.fill('#ask-q','¿Cuánto gasto en streaming?'); await pg.press('#ask-q','Enter'); await pg.wait_for_timeout(500)
        print('Flow IA:', (await pg.inner_text('#chat')).replace('\n',' | '))
        # 3) Ahorro
        await pg.evaluate("location.hash='app-ahorro'"); await pg.wait_for_timeout(500)
        await pg.click('#ai-run'); await pg.wait_for_timeout(600)
        print('Análisis:', (await pg.inner_text('#ai-card')).replace('\n',' | ')[:220])
        await pg.screenshot(path='shots/ai-ahorro.png', clip={'x':248,'y':0,'width':1052,'height':520})
        # 4) sin clave → respaldo local
        await pg.evaluate("__mode='nokey'; location.hash='app'"); await pg.wait_for_timeout(500)
        await pg.fill('#ask-q','¿Cuál es la más cara?'); await pg.press('#ask-q','Enter'); await pg.wait_for_timeout(500)
        print('Sin clave:', (await pg.inner_text('#chat')).split('\n')[-1][:120])
        print('llamadas:', await pg.evaluate('__calls'), 'ERR', errs)
        await b.close()
asyncio.run(main())
