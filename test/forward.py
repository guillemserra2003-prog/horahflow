import asyncio, json
from playwright.async_api import async_playwright
MOCK = r'''
window.__calls=[]; window.__plan='free';
window.__addr=[]; window.__inbox=[
 {id:1,address_id:'a1',resend_id:'r1:tok',from_addr:'Spotify <no-reply@spotify.com>',subject:'Tu recibo de Spotify',received_at:'2026-10-12T09:00:00Z',body:'Spotify Premium. Total: 11,99 €. Suscripción mensual.'},
 {id:2,address_id:'a1',resend_id:'r2:tok',from_addr:'Spotify <no-reply@spotify.com>',subject:'Tu recibo de Spotify',received_at:'2026-09-12T09:00:00Z',body:'Spotify Premium. Total: 11,99 €. Suscripción mensual.'},
 {id:3,address_id:'a1',resend_id:'r3:tok',from_addr:'Netflix <info@account.netflix.com>',subject:'Tu recibo de Netflix',received_at:'2026-11-05T09:00:00Z',body:'Netflix. Total: 13,99 €. Plan Estándar, mensual.'}];
window.supabase={createClient(){
 const session={user:{id:'u1',email:'g@x.com',user_metadata:{name:'Guillem'}}}; const db={user_data:{}};
 const chain=(t)=>{const o={_op:'select',_f:{},_in:null,
   select(){return o},eq(k,v){o._f[k]=v;return o},order(){return o},limit(){return o},in(k,v){o._in=v;return o},
   maybeSingle(){ if(t==='profiles') return Promise.resolve({data:{name:'Guillem',plan:__plan},error:null}); return Promise.resolve({data:db.user_data.u1||null,error:null})},
   upsert(row){__calls.push('UPSERT'); db.user_data.u1={state:row.state,prefs:row.prefs}; return Promise.resolve({error:null})},
   update(p){o._op='update';o._p=p;__calls.push('UPDATE:'+t+':'+Object.keys(p).join(','));return o},
   delete(){o._op='delete';return o},
   then(res,rej){let r={data:null,error:null};
     if(t==='inbound_addresses'){ if(o._op==='select') r.data=__addr.slice(); else if(o._op==='delete'){__addr=__addr.filter(a=>a.id!==o._f.id);} else if(o._op==='update'){const a=__addr.find(a=>a.id===o._f.id); if(a) Object.assign(a,o._p);} }
     else if(t==='inbound_emails'){ if(o._op==='select') r.data=__inbox.slice(); else if(o._op==='delete'){__calls.push('DEL_INBOX:'+o._in.join(',')); __inbox=__inbox.filter(x=>!o._in.includes(x.id));} }
     else if(t==='user_data' && o._op==='update'){ if(db.user_data.u1) db.user_data.u1.prefs=o._p.prefs; }
     return Promise.resolve(r).then(res,rej);}};return o};
 return {from:chain,
  rpc(name,args){ __calls.push('RPC:'+name);
    if(name==='create_inbound_address'){ const lim={free:1,pro:5,business:25}[__plan]; if(__addr.length>=lim) return Promise.resolve({data:null,error:{message:'mailbox_limit'}});
      const a={id:'a'+(__addr.length+1),token:'tok'+(__addr.length+1)+'abcdef',label:args.p_label,created_at:new Date().toISOString(),received_count:0,last_received_at:null}; __addr.push(a); return Promise.resolve({data:a,error:null}); }
    return Promise.resolve({data:null,error:null}); },
  functions:{invoke:()=>Promise.resolve({data:{results:[]},error:null})},
  auth:{onAuthStateChange(){}, getSession:()=>Promise.resolve({data:{session}})}};
}};'''
async def run(p, w, h, tag):
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = await b.new_context(viewport={'width':w,'height':h}); await ctx.grant_permissions(['clipboard-read','clipboard-write'])
    pg = await ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.route('**/supabase.min.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=MOCK))
    await pg.add_init_script("localStorage.setItem('hf:x','1')")
    await pg.goto('file:///home/claude/horahflow/dist/index.html#app-correos'); await pg.wait_for_selector('.tour', timeout=5000)
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(1500)
    print(tag,'tutorial tras cerrar (debe ser 0):', await pg.evaluate("document.querySelectorAll('.tour').length"))
    # sin direcciones; los recibos pendientes (dirección a1 no existe aún) se importan igual
    print(tag,'recibos importados al abrir:', await pg.evaluate("Data.state.emails.length"), 'pendientes:', await pg.evaluate("__inbox.length"))
    await pg.screenshot(path=f'shots/{tag}-fwd-empty.png', full_page=True)
    await pg.click('#addr-new'); await pg.wait_for_timeout(200)
    await pg.fill('#an-l','Gmail personal'); await pg.click('#an-b'); await pg.wait_for_timeout(500)
    print(tag,'direcciones:', await pg.evaluate("Inbound.addresses.map(a=>Inbound.email(a))"))
    # límite gratis: no debe aparecer botón de nueva
    print(tag,'botón nueva visible (debe ser False):', bool(await pg.query_selector('#addr-new')))
    # verificación de Gmail
    await pg.evaluate("__addr[0].verify_code='987654321';__addr[0].verify_link='https://mail-settings.google.com/mail/vf-abc';__addr[0].verify_at=new Date().toISOString(); Inbound.load().then(()=>route())"); await pg.wait_for_timeout(400)
    print(tag,'verificación:', (await pg.inner_text('.verify')).replace('\n',' '))
    await pg.click('[data-fwd="outlook"]'); await pg.wait_for_timeout(150)
    print(tag,'guía outlook:', (await pg.inner_text('.fwd-guide'))[:60].replace('\n',' '))
    await pg.click('[data-fwd="gmail"]'); await pg.wait_for_timeout(150)
    await pg.click('.copyline [data-copy]'); await pg.wait_for_timeout(200)
    print(tag,'portapapeles:', await pg.evaluate("navigator.clipboard.readText()"))
    await pg.screenshot(path=f'shots/{tag}-fwd.png', full_page=True)
    # Pro: segunda dirección + ajustes de avisos
    await pg.evaluate("__plan='pro'; Auth.refreshProfile ? Auth.refreshProfile().then(()=>route()) : null"); await pg.wait_for_timeout(600)
    print(tag,'plan ahora:', await pg.evaluate("Auth.plan().id"))
    await pg.evaluate("location.hash='app-ajustes'"); await pg.wait_for_timeout(400)
    await pg.click('#s-alerts'); await pg.wait_for_timeout(800)
    print(tag,'prefs.emailAlerts tras desmarcar:', await pg.evaluate("Data.state.prefs.emailAlerts"), 'llamadas:', [c for c in await pg.evaluate('__calls') if 'UPDATE' in c or 'UPSERT' in c][-2:])
    await pg.screenshot(path=f'shots/{tag}-ajustes.png', full_page=True)
    print(tag,'errores:', errs)
    await b.close()
async def main():
    async with async_playwright() as p:
        await run(p,1300,900,'d'); await run(p,390,820,'m')
if __name__ == "__main__": asyncio.run(main())
