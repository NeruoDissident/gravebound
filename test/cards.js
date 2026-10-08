// The level-up cards: what a draw offers, and that the cards do what they say.
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const skeleton=b=>'<!doctype html><html><head><meta charset=utf8></head><body>'+b+'</body></html>';
(async()=>{const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await br.newPage({viewport:{width:480,height:300}});const logs=[];pg.on('pageerror',e=>logs.push('PAGEERROR '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join('|')));
  await pg.route('**/*',r=>{const u=r.request().url();if(u.includes('three.js/r128/three.min.js'))return r.fulfill({path:path.join(root,'node_modules/three/build/three.min.js'),contentType:'application/javascript'});
    const m=u.match(/three@0\.128\.0\/(examples\/js\/.+)$/);if(m)return r.fulfill({path:path.join(root,'node_modules/three',m[1]),contentType:'application/javascript'});
    if(u.startsWith('http://local.test/'))return r.fulfill({body:skeleton(fs.readFileSync(path.join(root,'dist/gravebound-3d.html'),'utf8')),contentType:'text/html'});return r.abort();});
  await pg.goto('http://local.test/');await pg.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready,null,{timeout:150000,polling:400});
  const out=await pg.evaluate(()=>{__gb.hold(true);setQuality('low',true);const log=[],ok=(n,v)=>log.push((v?'ok   ':'FAIL ')+n);try{
    let pin=null;const adv=(sec)=>{for(let t=0;t<sec;t+=.1){__gb.advance(.1,0);if(pin&&G.balls[0]){const b=G.balls[0];b.x=pin[0];b.y=pin[1];b.vx=0;b.vy=0;b.st='live';}}};
    const fresh=(cls,tier,comp)=>{UI.menu(null);startRun(cls,comp||null);G.auto=false;DEV.on=true;__gb.advance(.5,1);devKey('d'+(tier+1));__gb.advance(.1,1);G.enemies=[];G.pickups=[];G.save=999;G.run.hp=G.mods.maxHp;G.wave.t=999;G.ambT=999;
      const cx=tier===2?303:320;G.balls=[newBall(cx,TY[tier]+800,0,0)];pin=[cx,TY[tier]+800];quests().forEach(q=>{q.steps=q.steps.filter(o=>o.t!=='kill');});return G.balls[0];};
    const give=id=>{G.run.perks.push(id);recalc();};const kind=n=>{const p=PERKS.find(p=>p.name===n);return p&&p.kind;};
    const only=(t,tier)=>{const e=spawnEnemy(t,tier||0);e.spawn=0;return e;};
    // the draw: table and stat cards, a keystone sometimes past level 3, never a class card
    {fresh('mage',0);let keys=0,bad=0;for(let k=0;k<40;k++){G.run.level=k%2?2:6;G.run.perks=[];openChoice('perk');const c=G.choice;const kinds=c.opts.map(o=>kind(o.name));if(c.opts.length!==3||kinds.some(x=>x==='class'||x===undefined))bad++;if(kinds.includes('key'))keys++;G.choice=null;UI.menu(null);}
      ok('every boon draw is three table/stat cards, a keystone sometimes ('+keys+'/20)',bad===0&&keys>0&&keys<20);
      G.run.perks=['bloodPact'];G.run.level=6;let anyKey=0;for(let k=0;k<20;k++){openChoice('perk');if(G.choice.opts.some(o=>kind(o.name)==='key'))anyKey++;G.choice=null;UI.menu(null);}ok('only one keystone per run',anyKey===0);}
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
    {const b=fresh('knight',0,'tank');give('twinSoul');pin=null;G.run.charge=100;rally();ok('Twin Soul doubles the Rally ('+G.rallyT+')',G.rallyT===40);}
    {fresh('knight',0);give('hourglass');ok('Hourglass doubles ball save ('+G.mods.save+')',G.mods.save===26);G.run.wing={key:'crypt',open:true,done:false,prog:0};enterWing({id:'catacombs'});ok('and the wing clock ('+G.wingT+')',G.wingT===160);}
    {fresh('knight',0);give('deathWish');const e=only('skeleton');G.run.charge=0;killEnemy(e);ok('Death Wish: kills fill 10 ('+G.run.charge.toFixed(1)+')',G.run.charge>=10);const c1=G.run.charge;hurt(5);ok('wounds drain 10',G.run.charge<=c1-10+.01);}
    }catch(e){log.push('FAIL threw after the checks above: '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' | '));}return log;});
  console.log(out.join('\n'));const nf=out.filter(l=>l.startsWith('FAIL')).length;console.log(nf+' failed of '+out.length);console.log(logs.join('\n')||'no page errors');await br.close();if(nf||logs.length)process.exitCode=1;})();
