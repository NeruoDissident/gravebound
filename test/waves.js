// Waves, the shots that drive them, and the bosses' table moves.
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const skeleton=b=>'<!doctype html><html><head><meta charset=utf8></head><body>'+b+'</body></html>';
(async()=>{const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await br.newPage({viewport:{width:480,height:300}});const logs=[];pg.on('pageerror',e=>logs.push('PAGEERROR '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join('|')));
  await pg.route('**/*',r=>{const u=r.request().url();if(u.includes('three.js/r128/three.min.js'))return r.fulfill({path:path.join(root,'node_modules/three/build/three.min.js'),contentType:'application/javascript'});
    const m=u.match(/three@0\.128\.0\/(examples\/js\/.+)$/);if(m)return r.fulfill({path:path.join(root,'node_modules/three',m[1]),contentType:'application/javascript'});
    if(u.startsWith('http://local.test/'))return r.fulfill({body:skeleton(fs.readFileSync(path.join(root,'dist/gravebound-3d.html'),'utf8')),contentType:'text/html'});return r.abort();});
  await pg.goto('http://local.test/');await pg.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready,null,{timeout:150000,polling:400});
  const out=await pg.evaluate(()=>{__gb.hold(true);setQuality('low',true);const log=[],ok=(n,v)=>log.push((v?'ok   ':'FAIL ')+n);
    let pin=null;const adv=(sec)=>{for(let t=0;t<sec;t+=.1){__gb.advance(.1,0);if(pin&&G.balls[0]){const b=G.balls[0];b.x=pin[0];b.y=pin[1];b.vx=0;b.vy=0;b.st='live';}}};
    const fresh=(camp,tier)=>{UI.menu(null);let n=0;do{startRun('knight');n++;}while(G.run.main.key!==camp&&n<200);G.auto=false;DEV.on=true;__gb.advance(.5,1);devKey('d'+(tier+1));__gb.advance(.1,1);
      G.enemies=[];G.pickups=[];G.save=999;G.run.hp=G.mods.maxHp;G.balls=[newBall(tier===2?303:320,TY[tier]+800,0,0)];pin=[tier===2?303:320,TY[tier]+800];quests().forEach(q=>{q.steps=q.steps.filter(o=>o.t!=='kill');});};
    // a wave comes on the timer, shows on the HUD, and pays out when cleared
    {fresh('necro',2);G.wave.t=1;adv(1.5);const wv=G.wave.active;ok('a wave starts on the timer',!!wv);adv(4);ok('its foes arrive ('+G.enemies.length+' of '+(wv&&wv.total)+')',wv&&G.enemies.length===wv.total&&G.enemies.every(e=>e.wave===wv));
      G.dirty=true;UI.sync(true);ok('HUD shows the wave',/Wave 1/.test(document.getElementById('hud').textContent));const g=G.run.gold;G.enemies.forEach(e=>killEnemy(e));adv(1);ok('clearing it pays a bounty and ends the wave',!G.wave.active&&G.run.gold>g&&G.wave.t>10);}
    // the bell calls one early; the gravestones add to it; the lanes hold the next one off
    {fresh('necro',0);G.wave.t=99;const bell=T.bumps.find(b=>b.bell);ev('bump',bell,G.balls[0],500);ok('the bell calls a wave',!!G.wave.active);}
    {fresh('necro',2);G.wave.t=99;const gs=T.bumps.filter(b=>b.group==='graves');for(let k=0;k<4;k++)ev('bump',gs[k%3],G.balls[0],500);adv(.5);ok('four gravestone hits raise a skeleton',G.enemies.some(e=>e.type==='skeleton'));
      const t0=G.wave.t;const L=T.sets.candles.lanes;L.forEach(l=>ev('lane',l,G.balls[0]));ok('lighting all the lanes holds the watch (+'+(G.wave.t-t0).toFixed(0)+'s)',G.wave.t>t0);}
    {fresh('necro',1);G.wave.t=99;const h=T.holes.catacombs;G.run.wing.open=false;const b=G.balls[0];b.st='held';b.held={id:'catacombs',t:0};handleHole(h,b);pin=null;adv(1.5);ok('the catacombs cough up an Armored Dead',G.enemies.some(e=>e.type==='revenant'));}
    // the Warden bars the Wolf Run while casting
    {fresh('necro',1);G.wave.t=99;wakeBoss('warden');const bo=G.boss;bo.rise=0;while(bo.phase!=='cast')bossNext(bo);ok('Portcullis Slam bars the Wolf Run',T.rails.rampWolf.closed);
      const m=T.mouths.find(q=>q.rail==='rampWolf');pin=null;G.balls=[newBall(m.x,m.y,m.dx*600,m.dy*600)];adv(.2);ok('the ball is thrown back from the barred ramp',G.balls[0].st!=='rail');interruptBoss(bo);ok('the bar lifts when the spell breaks',!T.rails.rampWolf.closed);}
    // Moonfang's howl sends the wolves wild
    {fresh('beast',0);G.wave.t=99;wakeBoss('beast');const bo=G.boss;bo.rise=0;while(bo.phase!=='cast')bossNext(bo);const w=G.enemies.filter(e=>e.type==='wolf');ok('Blood Howl brings wolves ('+w.length+') and they go wild',w.length>=2&&w.every(e=>e.frenzy));bossNext(bo);ok('the frenzy ends with the howl',!G.enemies.some(e=>e.frenzy));}
    // Ashmaw is warded by cultists, and scorches the floor
    {fresh('dragon',0);G.wave.t=99;wakeBoss('dragon');const bo=G.boss;bo.rise=0;ok('Ashmaw opens warded by cultists',bo.phase==='shield'&&G.enemies.filter(e=>e.warder).length===3&&!T.bumps.some(b=>b.ward));
      G.enemies.forEach(e=>killEnemy(e));adv(1.5);ok('slaying the cultists breaks the ward',bo.phase!=='shield'&&bo.stun>0);
      while(bo.phase!=='cast')bossNext(bo);const z=G.zones.find(z=>z.fire);ok('Gravefire scorches the floor',!!z);const hp=G.run.hp;pin=[z.x,z.y];G.balls=[newBall(z.x,z.y,0,0)];adv(1.2);ok('the ball burns inside it ('+(hp-G.run.hp)+')',G.run.hp<hp);
      killBoss(bo);ok('the fire goes out with the dragon',!G.zones.some(z=>z.fire));}
    return log;});
  console.log(out.join('\n'));console.log(out.filter(l=>l.startsWith('FAIL')).length+' failed of '+out.length);console.log(logs.join('\n')||'no page errors');await br.close();})();
