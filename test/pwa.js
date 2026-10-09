// The hosted build as an installable PWA: served over http from dist/, on a phone viewport with touch.
// Checks the manifest and icons, the service worker taking control, an offline reload, and the touch rules.
const { chromium } = require('playwright');const http=require('http'),fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.webmanifest':'application/manifest+json','.png':'image/png'};
const srv=http.createServer((q,s)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(root,'dist',p);
  if(!fs.existsSync(f)){s.writeHead(404);return s.end();}s.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s);}).listen(0);
(async()=>{const port=srv.address().port,url='http://127.0.0.1:'+port+'/';const log=[],ok=(n,v)=>log.push((v?'ok   ':'FAIL ')+n);
  const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const ctx=await br.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.abort());
  await pg.goto(url);await pg.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready,null,{timeout:150000,polling:500});
  const man=await pg.evaluate(async()=>{const l=document.querySelector('link[rel=manifest]');const m=await (await fetch(l.href)).json();const icons=await Promise.all(m.icons.map(async i=>{const r=await fetch(new URL(i.src,l.href));return r.ok&&r.headers.get('content-type')==='image/png';}));return {m,icons,apple:!!document.querySelector('link[rel=apple-touch-icon]'),vp:document.querySelector('meta[name=viewport]').content};});
  ok('manifest: name, standalone display, start url',man.m.name&&/fullscreen|standalone/.test(man.m.display)&&man.m.start_url);
  ok('manifest: 192, 512 and maskable icons all load',man.icons.every(Boolean)&&man.m.icons.some(i=>i.purpose==='maskable'));
  ok('apple touch icon and a no-zoom viewport',man.apple&&/user-scalable=no/.test(man.vp)&&/maximum-scale=1/.test(man.vp));
  await pg.evaluate(()=>navigator.serviceWorker.ready);await pg.reload({waitUntil:'domcontentloaded',timeout:150000});await pg.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:30000});
  ok('service worker installed and controlling the page',await pg.evaluate(()=>!!navigator.serviceWorker.controller));
  await ctx.setOffline(true);await pg.reload({waitUntil:'domcontentloaded',timeout:150000});await pg.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready,null,{timeout:150000,polling:500}).catch(()=>{});
  ok('reloads and runs offline',await pg.evaluate(()=>typeof R3!=='undefined'&&R3.ready&&!!document.querySelector('#menu button')));
  await ctx.setOffline(false);
  const css=await pg.evaluate(()=>{const g=(el,p)=>getComputedStyle(el)[p];return {html:g(document.documentElement,'touchAction'),stage:g(document.getElementById('stage'),'touchAction'),zone:g(document.getElementById('tL'),'touchAction'),sel:g(document.body,'userSelect')||g(document.body,'webkitUserSelect'),callout:g(document.body,'webkitTouchCallout'),over:g(document.documentElement,'overscrollBehaviorY')};});
  ok('html: touch-action manipulation, no overscroll ('+css.html+', '+css.over+')',css.html==='manipulation'&&css.over==='none');
  ok('table and flip zones take every touch ('+css.stage+', '+css.zone+')',css.stage==='none'&&css.zone==='none');
  ok('no text selection and no long-press callout ('+css.sel+', '+css.callout+')',css.sel==='none'&&(css.callout==='none'||css.callout===undefined));
  // play: start a run with touch and check a flip zone holds when the thumb drifts off it
  await pg.evaluate(()=>{__gb.hold(true);setQuality('low',true);UI.menu(null);startRun('knight');__gb.advance(.5,1);__gb.hold(false);});
  const box=await pg.locator('#tL').boundingBox();
  const drift=await pg.evaluate(([x,y])=>{const el=document.getElementById('tL'),f=T.flips.find(q=>q.tier===2&&q.side<0);
    const ev=(type,px)=>el.dispatchEvent(new PointerEvent(type,{pointerId:7,pointerType:'touch',isPrimary:true,clientX:px,clientY:y,bubbles:true}));
    ev('pointerdown',x);const a=f.on;el.dispatchEvent(new PointerEvent('pointerleave',{pointerId:7,pointerType:'touch',bubbles:true}));const b=f.on;ev('pointerup',x);return [a,b,f.on];},[box.x+40,box.y+box.height-80]);
  ok('a flip zone holds the flipper when the thumb drifts off it ('+drift+')',drift[0]&&drift[1]&&!drift[2]);
  const two=await pg.evaluate(()=>{const L=document.getElementById('tL'),R=document.getElementById('tR'),fl=T.flips.find(q=>q.tier===2&&q.side<0),fr=T.flips.find(q=>q.tier===2&&q.side>0);
    const ev=(el,type,id)=>el.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',bubbles:true}));ev(L,'pointerdown',1);ev(R,'pointerdown',2);const both=fl.on&&fr.on;ev(L,'pointerup',1);const right=!fl.on&&fr.on;ev(R,'pointerup',2);return both&&right&&!fr.on;});
  ok('two thumbs flip both sides independently',two);
  await pg.evaluate(()=>{gfxInfo();});const cb=await pg.locator('#camBtn').boundingBox();ok('a 44 px view button up top on touch ('+(cb&&[Math.round(cb.y),Math.round(cb.width),Math.round(cb.height)])+')',cb&&cb.y<160&&cb.width>=44&&cb.height>=44);
  const v0=await pg.evaluate(()=>R3.camMode);await pg.tap('#camBtn');ok('tapping it changes the view',await pg.evaluate(v=>R3.camMode!==v,v0));
  // a rotation whose resize event never arrives (iOS): the canvas must still match the screen, never stretched
  await pg.evaluate(()=>{removeEventListener('resize',resize);if(window.visualViewport)visualViewport.removeEventListener('resize',resize);});
  await pg.setViewportSize({width:844,height:390});await pg.waitForTimeout(1200);
  const asp=await pg.evaluate(()=>{const st=document.getElementById('stage');return [st.clientWidth/st.clientHeight,R3.camera.aspect,R3.w,R3.h];});
  ok('landscape after a missed resize: no stretch ('+asp.map(x=>+x.toFixed(3))+')',Math.abs(asp[0]-asp[1])<.01);
  await pg.setViewportSize({width:390,height:844});await pg.waitForTimeout(1200);
  const asp2=await pg.evaluate(()=>{const st=document.getElementById('stage');return [st.clientWidth/st.clientHeight,R3.camera.aspect];});ok('and back to portrait',Math.abs(asp2[0]-asp2[1])<.01);
  await pg.screenshot({path:path.join(root,'test/out/pwa-phone.png'),timeout:90000});
  ok('no page errors',!errs.length);console.log(log.join('\n'));console.log(errs.join('\n'));
  const f=log.filter(l=>l.startsWith('FAIL')).length;console.log(f+' failed of '+log.length);if(f)process.exitCode=1;await br.close();srv.close();})();
