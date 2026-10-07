// Walks the necromancer campaign to the Crypt step and through the wing by the real route:
// Catacombs scoop -> tunnel -> wing -> sigils -> sarcophagus -> tunnel back -> quest moves on.
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const skeleton=b=>'<!doctype html><html><head><meta charset=utf8></head><body>'+b+'</body></html>';
(async()=>{const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await br.newPage({viewport:{width:480,height:300}});const logs=[];pg.on('pageerror',e=>logs.push('PAGEERROR '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join('|')));
  await pg.route('**/*',r=>{const u=r.request().url();if(u.includes('three.js/r128/three.min.js'))return r.fulfill({path:path.join(root,'node_modules/three/build/three.min.js'),contentType:'application/javascript'});
    const m=u.match(/three@0\.128\.0\/(examples\/js\/.+)$/);if(m)return r.fulfill({path:path.join(root,'node_modules/three',m[1]),contentType:'application/javascript'});
    if(u.startsWith('http://local.test/'))return r.fulfill({body:skeleton(fs.readFileSync(path.join(root,'dist/gravebound-3d.html'),'utf8')),contentType:'text/html'});return r.abort();});
  await pg.goto('http://local.test/');await pg.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready,null,{timeout:150000,polling:400});
  console.log(JSON.stringify(await pg.evaluate(()=>{__gb.hold(true);setQuality('low',true);const log=[],ok=(n,v)=>log.push((v?'ok   ':'FAIL ')+n);
    UI.menu(null);let n=0;do{startRun('knight');n++;}while(G.run.main.key!=='necro'&&n<60);G.auto=true;DEV.on=true;const r=G.run,q=r.main;
    ok('necro campaign has nine steps with The Crypt sixth',q.steps.length===9&&q.stages[5]==='The Crypt'&&q.steps[5].id==='wing');
    ok('wing shut at the start',!r.wing.open&&!wingReady());
    let guard=0;while(qCur(q)&&qCur(q).id!=='wing'&&guard++<12){devKey('dn');__gb.advance(3,1);}
    ok('reached the wing step',qCur(q)&&qCur(q).id==='wing');ok('wing opened by the step',r.wing.open);
    devKey('d2');__gb.advance(.2,1);ok('Catacombs lit for the main quest',G.lit.catacombs&&G.lit.catacombs.includes('main'));
    // drop the ball into the Catacombs scoop
    const h=T.holes.catacombs;G.balls=[newBall(h.x,h.y-3,0,40)];G.mb=null;G.save=0;__gb.advance(.1,1);ok('scoop took the ball',G.balls[0].st==='held'&&G.balls[0].held.plan==='tunnel');
    __gb.advance(2.6,3);ok('ball is in the Crypt',G.focusTier===4&&G.balls[0].tier===4);ok('timer running: '+G.wingT.toFixed(1),G.wingT>74&&G.wingT<88);
    const obj=document.getElementById('hObj').textContent;ok('HUD names the sigils: '+obj,/sigils/.test(obj));
    // strike each sigil
    for(const s of T.banks.sigils.segs){const b=G.balls[0];b.st='live';b.x=(s.x1+s.x2)/2+(s.x1<320?30:-30);b.y=(s.y1+s.y2)/2;b.vx=s.x1<320?-700:700;b.vy=0;__gb.advance(.15,1);}
    ok('seal broke',!T.wing.seal[0].on);ok('time was added',G.wingT>80);
    {const b=G.balls[0];b.st='live';b.x=320;b.y=WY+260;b.vx=0;b.vy=-900;__gb.advance(.4,1);}
    ok('sarcophagus took the ball',r.wing.done);ok('quest moved past the wing',qCur(q)&&qCur(q).id==='rampRuin');
    __gb.advance(3.2,3);ok('ball is back in the Wilds',G.focusTier===1&&G.balls.length===1&&G.balls[0].st==='live');ok('wing shut again',!wingReady());ok('a relic was granted',r.relics.length>=1);
    // a second visit by drain: open it by hand, go in, fall out the bottom
    r.wing.done=false;devKey('d5');__gb.advance(2.5,2);ok('second visit in',G.focusTier===4);{const b=G.balls[0];b.st='live';b.x=320;b.y=WH+10;b.vx=0;b.vy=300;__gb.advance(.3,1);}
    ok('drain starts the trip back',G.balls[0].st==='tunnel');__gb.advance(1.7,2);ok('back in the Wilds, ball not lost: '+G.balls.map(b=>b.st+'/'+b.tier).join(',')+' left '+r.ballsLeft,G.balls.length===1&&G.balls[0].tier<=2&&r.ballsLeft===3);
    // timer expiry
    devKey('d5');__gb.advance(2.5,2);G.wingT=.3;__gb.advance(.6,1);ok('timer kills the flippers',G.tilt>0);{const b=G.balls[0];b.st='live';b.x=320;b.y=WH+10;b.vy=300;__gb.advance(1.7,2);}ok('tilt cleared on the way out',G.tilt<=0&&G.balls.length===1&&G.balls[0].tier<=2);
    return log;})).replace(/","/g,'\n').replace(/[\[\]"]/g,''));
  console.log(logs.join('\n')||'no page errors');await br.close();})();
