// The spellbook: unlock on level-up, cast from the table, upgrades, stacking; and the Rally.
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
    const fresh=(cls,tier,comp)=>{UI.menu(null);startRun(cls,comp||null);G.auto=false;DEV.on=true;__gb.advance(.5,1);devKey('d'+(tier+1));__gb.advance(.1,1);G.enemies=[];G.pickups=[];G.save=999;G.run.hp=G.mods.maxHp;G.wave.t=999;quests().forEach(q=>{q.steps=q.steps.filter(o=>o.t!=='kill');});
      const cx=tier===2?303:320;G.balls=[newBall(cx,TY[tier]+700,0,0)];G.balls[0].hero=true;pin=[cx,TY[tier]+700];G.pending=[];G.choice=null;UI.menu(null);return G.balls[0];};
    const only=(t,tier)=>{const e=spawnEnemy(t,tier);e.spawn=0;return e;};const S=id=>spellDef(id);
    // the level-up screen: four cards, unlock, then level up with three rows and a back
    {fresh('mage',0);G.run.level=2;openChoice('book');let c=G.choice;ok('level-up shows the four class abilities',c&&c.opts.length===4&&c.opts.every(o=>o.tag==='Unlock')&&c.opts.map(o=>o.name).join()==='Frost Nova,Arcane Barrier,Meteor Shower,Blink Strike');
      choose(2);ok('picking one unlocks it',spellRank('meteor')===0&&!G.choice);openChoice('book');c=G.choice;ok('next time it offers Level up',/Level up/.test(c.opts[2].tag)&&c.opts[0].tag==='Unlock');
      choose(2);c=G.choice;ok('Level up opens three rows and Back with numbers ('+(c&&c.opts[0].desc)+')',c&&c.kind==='bookUp'&&c.opts.length===4&&/8 s → 11 s/.test(c.opts[0].desc)&&c.opts[3].name==='Back');
      choose(3);ok('Back returns to the four',G.choice&&G.choice.kind==='book');choose(2);choose(0);ok('a row levels the ability',spellRank('meteor')===1&&spellVal('meteor','dur')===11&&!G.choice);
      G.run.xp=xpNeed(G.run.level);xp(1);ok('a level-up queues the spellbook, not a boon',G.pending.includes('book'));G.pending=[];}
    // casting from the table: each purpose has its goal
    {const b=fresh('mage',0);unlockSpell('meteor');ev('ramp',T.rails.rampTower,b);ok('one ramp is progress ('+goalText('striker')+')',G.run.goal.striker===1&&!spellOn('meteor'));ev('ramp',T.rails.rampTower,b);ok('two ramps cast the Striker',spellOn('meteor')&&G.run.goal.striker===0);}
    {const b=fresh('knight',0);unlockSpell('charge');done('guard',320,TY[0]+500);ok('a bank casts the Breaker',spellOn('charge'));adv(.2);ok('Charge keeps the ball armed',b.arm>0);}
    {const b=fresh('rogue',0);unlockSpell('knives');const o=T.sens.find(s=>s.kind==='orbit'&&s.tier===0);b.vy=-300;ev('orbit',o,b);ok('an orbit is half the Pressure goal',G.run.goal.pressure===10);for(let k=0;k<10;k++)ev('spin',T.sens.find(s=>s.kind==='spin'&&s.tier===0),b);ok('ten spins finish it',spellOn('knives'));}
    {const b=fresh('cleric',2);unlockSpell('sanctuary');const L=T.sets.candles.lanes;ev('lane',L[0],b);ev('lane',L[1],b);ok('lanes count toward the Guard goal',G.run.goal.guard===2);const h=T.holes.tavern;b.st='held';b.held={id:'tavern',t:0};handleHole(h,b);ok('a scoop before three lanes does nothing',!spellOn('sanctuary'));
      b.st='live';ev('inlane',T.sens.find(s=>s.kind==='inlane'&&s.tier===2),b);b.st='held';b.held={id:'tavern',t:0};handleHole(h,b);ok('three lanes then a scoop casts the Guard',spellOn('sanctuary'));}
    // stacking and extension
    {fresh('mage',0);unlockSpell('meteor');unlockSpell('frostNova');castSpell('meteor',G.balls[0]);castSpell('frostNova',G.balls[0]);ok('two abilities run at once',G.casts.length===2);const t0=spellCast('meteor').t;castSpell('meteor',G.balls[0]);ok('recasting extends ('+t0+' → '+spellCast('meteor').t+')',spellCast('meteor').t>t0&&spellCast('meteor').t<=16);castSpell('meteor',G.balls[0]);ok('capped at twice the base',spellCast('meteor').t===16);}
    // the effects
    {const b=fresh('mage',0);unlockSpell('meteor');const e=only('troll',0);e.x=b.x;e.y=b.y-40;castSpell('meteor',b);adv(3);ok('Meteor Shower wounds foes around the ball ('+Math.round(e.maxHp-e.hp)+')',e.hp<e.maxHp);}
    {const b=fresh('rogue',0);unlockSpell('knives');const e=only('troll',0);e.x=b.x+100;e.y=b.y;castSpell('knives',b);adv(1.3);ok('Fan of Knives reaches a foe',e.hp<e.maxHp);}
    {const b=fresh('mage',0);unlockSpell('frostNova');const e=only('skeleton',0);e.x=b.x+60;e.y=b.y;e.wind=1;castSpell('frostNova',b);adv(1.4);ok('Frost Nova freezes a wind-up',e.stun>0&&e.wind<=0);}
    {const b=fresh('cleric',0);unlockSpell('consecration');castSpell('consecration',b);adv(.9);ok('Consecration lays hallowed ground',G.zones.some(z=>z.trail));}
    {const b=fresh('knight',0);unlockSpell('aegis');castSpell('aegis',b);const hp=G.run.hp;hurt(40);ok('Aegis halves damage ('+(hp-G.run.hp)+')',hp-G.run.hp<=20);G.save=0;G.run.shield=false;pin=null;G.balls=[];onDrain(b);ok('and returns a lost ball',G.plunge.auto>0);G.sub=null;}
    {const b=fresh('mage',0);unlockSpell('barrier');castSpell('barrier',b);const e=only('troll',0);e.x=b.x+60;e.y=b.y;const hp=G.run.hp;foeStrike(e,b);foeStrike(e,b);foeStrike(e,b);ok('Arcane Barrier absorbs three strikes',G.run.hp===hp&&!spellOn('barrier'));ok('and detonates when it breaks',e.hp<e.maxHp||e.dead);}
    {const b=fresh('knight',0);unlockSpell('shieldWall');castSpell('shieldWall',b);const e=only('troll',0);const hp=G.run.hp,eh=e.hp;foeStrike(e,b);ok('Shield Wall blocks a strike and throws it back',G.run.hp===hp&&e.hp<eh);}
    {const b=fresh('rogue',0);unlockSpell('smoke');castSpell('smoke',b);const e=only('troll',0);const hp=G.run.hp;foeStrike(e,b);ok('Smoke: strikes miss',G.run.hp===hp);}
    {const b=fresh('rogue',0);unlockSpell('markedPrey');castSpell('markedPrey',b);const e=only('troll',0);strikeEnemy(e,b,500);ok('Marked Prey crits and marks',e.marked>0);}
    {const b=fresh('knight',0);unlockSpell('warcry');castSpell('warcry',b);const e=only('troll',0);strikeEnemy(e,b,500);ok('Warcry staggers on every hit',e.stun>0);}
    {const b=fresh('cleric',0);unlockSpell('judgement');castSpell('judgement',b);const e=only('troll',0);e.x=b.x+80;e.y=b.y;ev('sling',T.slings[0].s,b,300);ok('Judgement calls holy fire on a sling hit',e.hp<e.maxHp);}
    {const b=fresh('cleric',0);unlockSpell('radiance');castSpell('radiance',b);const e=only('goblin',0);e.x=b.x+120;e.y=b.y;b.tk=0;updatePowers(.1);ok('Radiance burns a living foe at range',e.hp<e.maxHp);}
    {const b=fresh('rogue',0);unlockSpell('cloak');castSpell('cloak',b);adv(.2);ok('Cloak keeps the ball phased and hidden',G.phase>0&&G.hidden);}
    // boons after a boss
    {fresh('knight',1);wakeBoss('warden');const bo=G.boss;bo.rise=0;killBoss(bo);ok('a boss kill queues a boon',G.pending.includes('perk'));openChoice('perk');ok('boons are table, stat or keystone only',G.choice.opts.every(o=>{const p=PERKS.find(q=>q.name===o.name);return p&&p.kind!=='class';}));G.choice=null;UI.menu(null);G.pending=[];}
    // Rally
    {const b=fresh('knight',2,'tank');G.run.charge=100;pin=null;rally();ok('a full meter rallies the party: one ball per companion',G.balls.filter(x=>x.party).length===1&&G.balls.some(x=>x.party==='tank')&&G.rallyT===20&&G.run.charge===0);
      ok('the camera follows the hero',focusBall()===b);const pb=G.balls.find(x=>x.party);pb.y=H+60;adv(.3);ok('a party ball that drains just vanishes',!G.balls.some(x=>x.party)&&G.balls.length===1&&G.balls[0]===b);
      G.run.charge=100;rally();adv(.3);G.save=0;G.run.shield=false;G.run.party[0].hp=0;b.y=H+60;adv(.3);ok('the hero draining ends the Rally and the ball',!G.balls.some(x=>x.party)&&G.sub==='bonus');G.sub=null;}
    {fresh('knight',2,'tank');G.run.charge=100;pin=null;rally();for(let k=0;k<25&&G.balls.some(x=>x.party);k++){adv(1);const pb=G.balls.find(x=>x.party);if(pb){pb.x=303;pb.y=TY[2]+600;pb.vx=pb.vy=0;}}ok('the party withdraws when the time is up',!G.balls.some(x=>x.party)&&G.rallyT===0);}
    {fresh('knight',2);G.run.charge=100;rally();ok('alone, the call goes unanswered',G.balls.length===1&&G.run.charge===0);}
    return log;});
  console.log(out.join('\n'));const nf=out.filter(l=>l.startsWith('FAIL')).length;console.log(nf+' failed of '+out.length);console.log(logs.join('\n')||'no page errors');await br.close();if(nf||logs.length)process.exitCode=1;})();
