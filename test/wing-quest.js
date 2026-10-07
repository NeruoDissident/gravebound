// Walks each campaign to its wing step and through the wing by the real route:
// gate scoop -> tunnel -> wing -> the wing's own task -> goal -> tunnel back -> quest moves on.
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const skeleton=b=>'<!doctype html><html><head><meta charset=utf8></head><body>'+b+'</body></html>';
(async()=>{const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await br.newPage({viewport:{width:480,height:300}});const logs=[];pg.on('pageerror',e=>logs.push('PAGEERROR '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join('|')));
  await pg.route('**/*',r=>{const u=r.request().url();if(u.includes('three.js/r128/three.min.js'))return r.fulfill({path:path.join(root,'node_modules/three/build/three.min.js'),contentType:'application/javascript'});
    const m=u.match(/three@0\.128\.0\/(examples\/js\/.+)$/);if(m)return r.fulfill({path:path.join(root,'node_modules/three',m[1]),contentType:'application/javascript'});
    if(u.startsWith('http://local.test/'))return r.fulfill({body:skeleton(fs.readFileSync(path.join(root,'dist/gravebound-3d.html'),'utf8')),contentType:'text/html'});return r.abort();});
  await pg.goto('http://local.test/');await pg.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready,null,{timeout:150000,polling:400});
  const out=await pg.evaluate(()=>{__gb.hold(true);setQuality('low',true);const log=[],ok=(n,v)=>log.push((v?'ok   ':'FAIL ')+n);
    const ROUTES={necro:'crypt',beast:'den',dragon:'hoard'};
    const park=(x,y,vx,vy)=>{const b=G.balls[0];b.st='live';b.x=x;b.y=y;b.vx=vx||0;b.vy=vy||0;};
    for(const camp in ROUTES){const key=ROUTES[camp],d=WINGS[key],tw=T.wings[key],y=tw.y,tier=tw.tier,P=n=>'['+key+'] '+n;
      UI.menu(null);let n=0;do{startRun('knight');n++;}while(G.run.main.key!==camp&&n<200);G.auto=true;DEV.on=true;const r=G.run,q=r.main;
      ok(P(camp+' campaign has the wing as its sixth of nine steps'),q.key===camp&&q.steps.length===9&&q.stages[5]===d.name&&q.steps[5].id==='wing'&&r.wing.key===key);
      ok(P('shut at the start'),!r.wing.open&&!wingReady(d.gate));
      let guard=0;while(qCur(q)&&qCur(q).id!=='wing'&&guard++<12){devKey('dn');__gb.advance(3,1);}
      ok(P('reached the wing step, and it opened the wing'),qCur(q)&&qCur(q).id==='wing'&&r.wing.open);
      devKey('d2');__gb.advance(.2,1);ok(P('gate "'+d.gate+'" lit for the main quest'),G.lit[d.gate]&&G.lit[d.gate].includes('main'));
      if(key==='hoard')ok(P('the Sealed Door stands open'),T.banks.door.segs.every(s=>!s.on));
      const h=T.holes[d.gate];G.balls=[newBall(h.x,h.y-3,0,40)];G.mb=null;G.save=0;__gb.advance(.1,1);ok(P('scoop took the ball'),G.balls[0].st==='held'&&G.balls[0].held.plan==='tunnel');
      __gb.advance(2.6,3);ok(P('ball is in the wing'),G.focusTier===tier&&G.balls[0].tier===tier);ok(P('clock running: '+G.wingT.toFixed(1)),G.wingT>70&&G.wingT<90);ok(P('goal sealed'),tw.seal[0].on);
      ok(P('HUD: '+document.getElementById('hObj').textContent),document.getElementById('hObj').textContent===d.sealed(r.wing.prog||0));
      const t0=G.wingT;
      if(key==='crypt')for(const s of T.banks.sigils.segs){park((s.x1+s.x2)/2+(s.x1<320?30:-30),(s.y1+s.y2)/2,s.x1<320?-700:700,0);__gb.advance(.15,1);}
      if(key==='den'){let it=0,max=0;while(tw.seal[0].on&&it++<60){park(320,y+470,0,-60);__gb.advance(.5,1);const pk=G.enemies.filter(e=>e.pack&&!e.dead);max=Math.max(max,pk.length);if(pk[0]&&pk[0].spawn<=0)killEnemy(pk[0]);}
        ok(P('the pack came, never more than two at once ('+max+')'),max>=1&&max<=2);ok(P('three kills counted'),r.wing.prog===3);}
      if(key==='hoard'){ok(P('six coins laid out'),G.pickups.filter(p=>p.hoard).length+(r.wing.prog||0)===6);let it=0;while(tw.seal[0].on&&it++<12){const c=G.pickups.find(p=>p.hoard);if(!c)break;park(c.x,c.y,0,0);__gb.advance(.4,1);}ok(P('six coins counted'),r.wing.prog===6);}
      ok(P('seal broke'),!tw.seal[0].on);ok(P('time was added'),G.wingT>t0);
      park(320,y+260,0,-900);__gb.advance(.4,1);
      ok(P('goal took the ball'),r.wing.done);ok(P('quest moved past the wing'),q.si===6&&qCur(q).id!=='wing');
      if(key==='hoard')ok(P('the Sealed Door shut behind you'),T.banks.door.segs.every(s=>s.on));
      __gb.advance(3.4,3);ok(P('ball is back on the main table: '+G.balls.map(b=>b.st+'/'+b.tier).join(',')),G.balls.length===1&&G.balls[0].tier<=2&&G.balls[0].st==='live');ok(P('wing shut again'),!wingReady(d.gate));ok(P('a relic was granted'),r.relics.length>=1);
      ok(P('nothing left behind in the wing'),!G.enemies.some(e=>e.tier===tier&&!e.dead)&&!G.pickups.some(p=>p.hoard));
      // a second visit, leaving by the drain
      const dk='d'+(5+WING_KEYS.indexOf(key));devKey(dk);__gb.advance(2.5,2);ok(P('second visit in'),G.focusTier===tier);park(320,y+WLEN+10,0,300);__gb.advance(.3,1);
      ok(P('drain starts the trip back'),G.balls[0].st==='tunnel');__gb.advance(1.9,2);ok(P('back out, ball not lost: '+G.balls.map(b=>b.st+'/'+b.tier).join(',')+' left '+r.ballsLeft),G.balls.length===1&&G.balls[0].tier<=2&&r.ballsLeft===3);
      // the clock running out
      devKey(dk);__gb.advance(2.5,2);G.enemies.forEach(e=>{e.dead=true;});__gb.advance(.05,1);G.wingT=.3;park(320,y+450,0,-50);__gb.advance(.6,1);ok(P('clock kills the flippers'),G.tilt>0);park(320,y+WLEN+10,0,300);__gb.advance(1.9,2);ok(P('tilt cleared on the way out'),G.tilt<=0&&G.balls.length===1&&G.balls[0].tier<=2);}
    return log;});
  console.log(out.join('\n'));console.log(out.filter(l=>l.startsWith('FAIL')).length+' failed of '+out.length);
  console.log(logs.join('\n')||'no page errors');await br.close();})();
