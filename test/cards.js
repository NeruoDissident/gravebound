// The level-up cards: what a draw offers, and that the cards do what they say.
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
    const fresh=(cls,tier)=>{UI.menu(null);startRun(cls);G.auto=false;DEV.on=true;__gb.advance(.5,1);devKey('d'+(tier+1));__gb.advance(.1,1);G.enemies=[];G.pickups=[];G.save=999;G.run.hp=G.mods.maxHp;G.wave.t=999;G.ambT=999;
      const cx=tier===2?303:320;G.balls=[newBall(cx,TY[tier]+800,0,0)];pin=[cx,TY[tier]+800];quests().forEach(q=>{q.steps=q.steps.filter(o=>o.t!=='kill');});return G.balls[0];};
    const give=id=>{G.run.perks.push(id);recalc();};const kind=n=>{const p=PERKS.find(p=>p.name===n);return p&&p.kind;};
    const only=(t,tier)=>{const e=spawnEnemy(t,tier||0);e.spawn=0;return e;};
    // the draw: one card of your class, one for the table, one stat (or a keystone past level 3)
    {fresh('mage',0);const seen={class:0,table:0,stat:0,key:0,other:0};let keys=0;
      for(let k=0;k<40;k++){G.run.level=k%2?2:6;G.run.perks=[];openChoice('perk');const c=G.choice;const kinds=c.opts.map(o=>kind(o.name));kinds.forEach(x=>seen[x]||x===undefined?seen[x===undefined?'other':x]++:seen[x]++);
        if(!(kinds[0]==='class'&&kinds[1]==='table'&&(kinds[2]==='stat'||kinds[2]==='key')))seen.other++;if(kinds[2]==='key')keys++;if(c.opts.some(o=>PERKS.find(p=>p.name===o.name).cls&&PERKS.find(p=>p.name===o.name).cls!=='mage'))seen.other++;G.choice=null;UI.menu(null);}
      ok('every draw is class + table + stat/keystone, only your own class ('+JSON.stringify(seen)+')',seen.other===0&&seen.class===40&&seen.table===40);ok('keystones turn up sometimes past level 3 ('+keys+'/20)',keys>0&&keys<20);
      G.run.perks=['bloodPact'];G.run.level=6;let anyKey=0;for(let k=0;k<20;k++){openChoice('perk');if(G.choice.opts.some(o=>kind(o.name)==='key'))anyKey++;G.choice=null;UI.menu(null);}ok('only one keystone per run',anyKey===0);}
    // knight: Bulwark staggers the level when Aegis saves the ball; Juggernaut and Unyielding
    {const b=fresh('knight',0);give('bulwark');const e=only('skeleton');e.y=foePosts(0).line;e.wind=1;G.run.shield=true;G.save=0;pin=null;onDrain(b);ok('Bulwark: Aegis save staggers every foe on the level',e.stun>0&&e.wind<=0);}
    {fresh('knight',0);give('unyielding');const e=only('revenant');strikeEnemy(e,G.balls[0],300);ok('Unyielding: the heavy ball shatters armor and staggers',e.armor===0&&e.stun>0);}
    {fresh('knight',0);give('bastion');ability();ok('Bastion: Aegis lasts 24s',G.buffs.aegis===24);const hp=G.run.hp;hurt(30);ok('and cuts damage to a third ('+(hp-G.run.hp)+')',hp-G.run.hp<=8);}
    {const b=fresh('knight',0);give('juggernaut');b.pow={t:3,hits:0};const seg=T.banks.guard.segs[0];ev('drop',seg,b,600);const drops=Object.values(T.banks).filter(B=>B.kind==='drop'&&B.tier===0);ok('Juggernaut: Charge flattens every drop bank on the level ('+drops.length+')',drops.length>=1&&drops.every(B=>B.segs.every(s=>!s.on)));}
    {const b=fresh('cleric',0);give('lantern');const e=only('skeleton');e.x=b.x+120;e.y=b.y;b.tk=0;const hp=e.hp;updatePowers(.1);ok('Relic Lantern: the aura reaches further',e.hp<hp);}
    // rogue: Marked for Death, Opportunist, Poisoned Edge, Cutpurse
    {const b=fresh('rogue',0);give('marked');give('opportunist');const e=only('troll');b.pow={t:3,hits:0};strikeEnemy(e,b,900);ok('Backstab marks the victim',e.marked>0);G.run.charge=0;const c0=G.run.charge;strikeEnemy(e,b,500);ok('marked foe is crit by everything, and crits refill power',G.run.charge>c0);}
    {const b=fresh('rogue',0);give('poison');const e=only('troll');G.buffs.stealth=5;strikeEnemy(e,b,500);const hp=e.hp;adv(2.2);ok('Poisoned Edge bleeds after a crit ('+Math.round(hp-e.hp)+')',e.hp<hp);}
    {const b=fresh('rogue',0);give('cutpurse');const e=only('troll');const g=G.run.gold;G.phase=1;strikeEnemy(e,b,400,true);ok('Cutpurse steals gold through Shadowstep',G.run.gold>g);}
    // mage: Chain Lightning, Scorched Earth, Overcharge, Blink
    {const b=fresh('mage',0);give('chain');const es=[only('troll'),only('troll'),only('troll')];es.forEach((e,i)=>{e.x=320+i*40;e.y=b.y-80;});G.nudgeCd=0;classNudge();ok('Chain Lightning forks Spark to three foes',es.every(e=>e.hp<e.maxHp));}
    {const b=fresh('mage',0);give('scorch');explode(b.x,b.y);const z=G.zones.find(z=>z.pyre);ok('Scorched Earth leaves burning ground',!!z);const e=only('troll');e.x=z.x;e.y=z.y;adv(1.2);ok('foes in it burn',e.hp<e.maxHp);}
    {fresh('mage',0);give('overcharge');const e=only('troll');G.run.charge=100;ability();ok('Overcharge: Arcane Storm hits for 5x ('+Math.round(e.maxHp-e.hp)+') and refunds a third',e.maxHp-e.hp>=G.mods.pow*4.9&&G.run.charge>=30);}
    {const b=fresh('mage',1);give('blink');G.wave.t=999;wakeBoss('warden');const bo=G.boss;bo.rise=0;while(bo.phase!=='cast')bossNext(bo);b.x=bo.x;b.y=bo.y+120;pin=[b.x,b.y];G.nudgeCd=0;classNudge();ok('Blink: Spark breaks a boss spell',bo.phase==='open'&&bo.stun>0);}
    // cleric: Sanctuary, Absolution, Martyr's Light, Smite
    {const b=fresh('cleric',0);give('sanctuary');consecrate(b.x,b.y);ok('Sanctuary: hallowed ground lasts 18s',G.zones[0].t===18);G.run.hp=50;adv(1.1);ok('and heals faster',G.run.hp>=53);}
    {fresh('cleric',0);give('absolution');G.curse={dark:5,weak:5,hex:5};G.nudgeCd=0;classNudge();ok('Absolution lifts every curse',!Object.values(G.curse).some(v=>v>0));}
    {fresh('cleric',0);give('martyr');G.run.hp=5;hurt(50);ok("Martyr's Light: you stand at 40 instead of falling",!G.fallen&&G.run.hp===40);hurt(100);ok('only once per ball',G.fallen);}
    // the table: Ramp Runner, Second Chance, Grave Bargain, Tollgate, Iron Flippers, Hallowed Lanes, Lane Keeper
    {const b=fresh('knight',0);give('rampRunner');G.run.charge=0;ev('ramp',T.rails.rampTower,b);ok('Ramp Runner fills 10 power per ramp',G.run.charge>=10);}
    {const b=fresh('knight',0);give('chance');G.save=0;const o=T.sens.find(s=>s.kind==='outlane'&&s.tier===0);ev('outlane',o,b);ok('Second Chance saves an outlane once',G.save>0);G.save=0;ev('outlane',o,b);ok('only once per ball',G.save<=0);}
    {const b=fresh('knight',0);give('bargain');G.save=0;G.run.shield=false;const g=G.run.gold;pin=null;G.balls=[];onDrain(b);ok('Grave Bargain pays on a real loss',G.run.gold>g);G.sub=null;}
    {const b=fresh('knight',0);give('bargain');G.save=5;const g=G.run.gold;pin=null;G.balls=[];onDrain(b);ok('but not on a saved ball',G.run.gold===g);}
    {fresh('knight',0);give('tollgate');const e=only('skeleton');e.y=foePosts(0).line;e.state='hold';adv(2.2);ok('Tollgate wounds foes holding the slingshot line',e.hp<e.maxHp);}
    {const b=fresh('knight',0);give('ironFlip');const e=only('troll');e.x=b.x;e.y=b.y;ev('flipHit',null,b);ok('Iron Flippers wound foes near the ball on a flip',e.hp<e.maxHp);}
    {const b=fresh('knight',0);give('hallowed');const l=T.sens.find(s=>s.kind==='lane'&&s.tier===2);ev('lane',l,b);ok('Hallowed Lanes ward you after a lane',G.buffs.hallow>0);}
    {const b=fresh('knight',2);give('laneKeeper');G.run.kickback=false;T.sets.candles.lanes.forEach(l=>ev('lane',l,b));ok('Lane Keeper relights the kickback',G.run.kickback);}
    // keystones
    {fresh('knight',0);const h0=G.mods.maxHp,p0=G.mods.pow;give('bloodPact');ok('Blood Pact: double damage, half health',G.mods.pow>=p0*1.99&&G.mods.maxHp<=h0*.51);}
    {const b=fresh('knight',0);give('twinSoul');pin=null;G.run.charge=100;ability();ok('Twin Soul splits a second ball off a full-meter power',G.balls.length===2);}
    {fresh('knight',0);give('hourglass');ok('Hourglass doubles ball save ('+G.mods.save+')',G.mods.save===26);G.run.wing={key:'crypt',open:true,done:false,prog:0};enterWing({id:'catacombs'});ok('and the wing clock ('+G.wingT+')',G.wingT===160);}
    {fresh('knight',0);give('deathWish');const e=only('skeleton');G.run.charge=0;killEnemy(e);ok('Death Wish: kills fill 10 ('+G.run.charge.toFixed(1)+')',G.run.charge>=10);const c1=G.run.charge;hurt(5);ok('wounds drain 10',G.run.charge<=c1-10+.01);}
    return log;});
  console.log(out.join('\n'));const nf=out.filter(l=>l.startsWith('FAIL')).length;console.log(nf+' failed of '+out.length);console.log(logs.join('\n')||'no page errors');await br.close();if(nf||logs.length)process.exitCode=1;})();
