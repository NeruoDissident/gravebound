// How the Crypt plays for the bot: how long a visit lasts, how often the seal breaks and the sarcophagus is made.
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const skeleton=b=>'<!doctype html><html><head><meta charset=utf8></head><body>'+b+'</body></html>';
(async()=>{const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await br.newPage({viewport:{width:480,height:300}});const logs=[];pg.on('pageerror',e=>logs.push('PAGEERROR '+e.message));
  await pg.route('**/*',r=>{const u=r.request().url();if(u.includes('three.js/r128/three.min.js'))return r.fulfill({path:path.join(root,'node_modules/three/build/three.min.js'),contentType:'application/javascript'});
    const m=u.match(/three@0\.128\.0\/(examples\/js\/.+)$/);if(m)return r.fulfill({path:path.join(root,'node_modules/three',m[1]),contentType:'application/javascript'});
    if(u.startsWith('http://local.test/'))return r.fulfill({body:skeleton(fs.readFileSync(path.join(root,'dist/gravebound-3d.html'),'utf8')),contentType:'text/html'});return r.abort();});
  await pg.goto('http://local.test/');await pg.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready,null,{timeout:150000,polling:400});
  for(const cls of ['knight','rogue','mage','cleric']){
    console.log(JSON.stringify(await pg.evaluate(cls=>{__gb.hold(true);const out={cls,visits:0,sealed:0,done:0,drained:0,secs:[],sigilHits:0,stuck:0,hp:[]};
      for(let v=0;v<12;v++){UI.menu(null);startRun(cls);G.auto=true;DEV.on=true;G.bot={hl:0,hr:0,tl:30,tr:30,pl:0,plT:.7};G.stuck=[];devKey('d5');out.visits++;let t=0,seal=false,was=false;
        while(t<150){__gb.advance(.5,0);t+=.5;if(G.focusTier===4)was=true;if(!seal&&!T.wing.seal[0].on){seal=true;out.sealed++;}
          if(G.run.wing.done){out.done++;break;}if(was&&G.focusTier!==4&&G.balls.length&&G.balls[0].st==='live'){out.drained++;break;}if(G.mode==='over')break;}
        out.secs.push(t);out.stuck+=G.stuck.length;out.hp.push(Math.round(G.run.hp));}
      out.avg=Math.round(out.secs.reduce((a,b)=>a+b,0)/out.secs.length);out.secs=out.secs.join(',');out.hp=out.hp.join(',');return out;},cls)));}
  console.log(logs.join('\n')||'no page errors');await br.close();})();
