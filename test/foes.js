// Puts each foe through its job: the wind-up, the stagger, the thief's loot run, the wolf's lunge, the possessed bumper,
// the ritual at the ramp, the parry, the troll's stagger.
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const skeleton=b=>'<!doctype html><html><head><meta charset=utf8></head><body>'+b+'</body></html>';
(async()=>{const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await br.newPage({viewport:{width:480,height:300}});const logs=[];pg.on('pageerror',e=>logs.push('PAGEERROR '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join('|')));
  await pg.route('**/*',r=>{const u=r.request().url();if(u.includes('three.js/r128/three.min.js'))return r.fulfill({path:path.join(root,'node_modules/three/build/three.min.js'),contentType:'application/javascript'});
    const m=u.match(/three@0\.128\.0\/(examples\/js\/.+)$/);if(m)return r.fulfill({path:path.join(root,'node_modules/three',m[1]),contentType:'application/javascript'});
    if(u.startsWith('http://local.test/'))return r.fulfill({body:skeleton(fs.readFileSync(path.join(root,'dist/gravebound-3d.html'),'utf8')),contentType:'text/html'});return r.abort();});
  await pg.goto('http://local.test/');await pg.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready,null,{timeout:150000,polling:400});
  const out=await pg.evaluate(()=>{__gb.hold(true);setQuality('low',true);const log=[],ok=(n,v)=>log.push((v?'ok   ':'FAIL ')+n);try{
    const fresh=()=>{UI.menu(null);startRun('knight');G.auto=false;DEV.on=true;__gb.advance(.5,1);devKey('d1');__gb.advance(.1,1);pin=null;G.enemies=[];G.pickups=[];G.save=999;G.run.hp=G.mods.maxHp;};
    let pin=null;const ball=(x,y,vx,vy)=>{G.balls=[newBall(x,y,vx||0,vy||0)];pin=vx||vy?null:[x,y];return G.balls[0];};
    const adv=(sec,n)=>{for(let t=0;t<sec;t+=.1){G.enemies=G.enemies.filter(e=>keep.includes(e));__gb.advance(.1,0);if(pin&&G.balls[0]){const b=G.balls[0];b.x=pin[0];b.y=pin[1];b.vx=0;b.vy=0;b.st='live';}}if(n)__gb.draw(1,.05);};
    let keep=[];const only=(t)=>{const e=spawnEnemy(t,0);e.spawn=0;keep=[e];return e;};
    const y0=TY[0];
    // skeleton: walks to the line, winds up, strikes; a hit in the wind-up staggers it
    {fresh();ball(320,y0+800,0,0);const e=only('skeleton');const sy=e.y;adv(4,1);ok('skeleton shambles down the table ('+Math.round(e.y-sy)+')',e.y>sy+60);
      let guard=0;while(e.y<foePosts(0).line&&guard++<40)adv(1,1);ok('reaches the slingshot line and holds',e.state==='hold');
      guard=0;while(e.wind<=0&&guard++<40)adv(.5,1);ok('winds up ('+e.wind.toFixed(1)+'s)',e.wind>0);
      const hp=G.run.hp;adv(2.5,2);ok('the strike lands when nothing stops it ('+(hp-G.run.hp)+')',G.run.hp<hp);
      guard=0;while(e.wind<=0&&guard++<40)adv(.5,1);const hp2=G.run.hp;strikeEnemy(e,G.balls[0],600);ok('a hit in the wind-up staggers it',e.wind<=0&&e.stun>0);const stunned=e.stun;adv(2.5,2);ok('the staggered strike never lands ('+hp2+'>'+G.run.hp+' stun '+stunned.toFixed(1)+' atk '+e.atk.toFixed(1)+' foes '+G.enemies.map(e=>e.type+(e.dead?'x':'')).join(',')+')',G.run.hp===hp2);}
    // thief: steals from the purse and runs for an outlane; killing it gives the gold back
    {fresh();G.run.gold=40;ball(320,y0+800,0,0);const e=only('goblin');let guard=0;while(!e.loot&&guard++<60)adv(.5,1);ok('goblin steals gold ('+(e.loot&&e.loot.gold)+')',e.loot&&e.loot.gold>0&&G.run.gold<40);
      adv(1.5,1);ok('runs for the outlane',e.goal==='flee');const g=G.run.gold;killEnemy(e);ok('loot comes back when it dies',G.run.gold>=g+e.loot.gold);}
    {fresh();G.run.gold=40;ball(320,y0+800,0,0);const e=only('goblin');e.atk=.5;let guard=0;while(!e.dead&&guard++<80)adv(.5,1);ok('left alone, it gets away ('+guard/2+'s) '+[e.state,e.goal,e.loot&&e.loot.gold,e.hopT.toFixed(1),e.wind.toFixed(1),e.atk.toFixed(1),e.stun.toFixed(1),G.focusTier,G.balls.length,G.run.gold].join('/'),e.dead&&!G.enemies.includes(e));}
    // thief: snatches loose loot
    {fresh();ball(320,y0+800,0,0);const e=only('goblin');G.pickups.push({x:e.x+60,y:e.y,tier:0,kind:'heart',t:1,quest:null});let guard=0;while(!e.loot&&guard++<40)adv(.5,1);ok('snatches a loose pickup',e.loot&&e.loot.kind==='heart'&&!G.pickups.length);}
    // wolf: lunges at a passing ball and bats it
    {fresh();const e=only('wolf');e.lungeCd=0;const px=e.x,py=e.y+60,b=ball(px,py,0,0);pin=null;const hp=G.run.hp;let lunged=false;
      for(let k=0;k<12&&G.run.hp===hp;k++){G.enemies=G.enemies.filter(x=>keep.includes(x));b.x=px;b.y=py;b.vx=0;b.vy=0;__gb.advance(.1,0);if(e.state==='lunge'||e.lunge>0)lunged=true;}
      ok('wolf lunges at the ball',lunged);ok('bite lands and bats the ball toward the drain ('+Math.round(b.vx)+','+Math.round(b.vy)+')',G.run.hp<hp&&b.vy>0&&Math.abs(b.vx)>100);}
    // spirit: possesses a bumper; hitting the bumper strikes the spirit
    {fresh();ball(320,y0+800,0,0);const e=only('spirit');let guard=0;while(e.state!=='sit'&&guard++<40)adv(.5,1);const bp=e.post.b;ok('spirit sits on a bumper',e.state==='sit'&&bp.poss===e);
      e.hp=e.maxHp=999;const sc=G.run.score,b=ball(bp.x,bp.y+bp.r+12,0,-500);adv(.1,2);ok('possessed bumper pays nothing ('+(G.run.score-sc)+')',G.run.score-sc<=300*G.run.mult);ok('but the ball strikes the spirit through it',e.hp<e.maxHp||e.dead);
      e.hp=1;e.hitCd=0;ball(bp.x,bp.y+bp.r+12,0,-500);adv(.5,3);ok('and frees the bumper when it dies',!bp.poss);}
    // cultist: chants at a ramp mouth; the ramp breaks the ritual
    {fresh();ball(320,y0+800,0,0);const e=only('cultist');ok('cultist takes a ramp mouth',e.post&&e.post.kind==='mouth');e.castT=2;const mouth=T.mouths.find(m=>m.rail===e.post.rail);
      const b=ball(mouth.x,mouth.y,mouth.dx*700,mouth.dy*700);adv(.2,2);ok('ball up the ramp breaks the ritual',e.castT>e.def.cast&&e.stun>0);}
    // armored dead: holds an orbit entrance; soft hits clang
    {fresh();const e=only('revenant');ok('armored dead holds an orbit entrance',e.post&&e.post.kind==='orbit');{const b=ball(e.x<320?43:597,y0+300,0,200);pin=null;adv(2.5);ok('a ball coming down the orbit behind it gets past ('+Math.round(b.y-y0)+')',b.y>e.y+20||b.st!=='live');}const hp=e.hp;strikeEnemy(e,null,300);ok('a soft hit just clangs',e.hp===hp&&e.armor===2);strikeEnemy(e,null,600);ok('a hard hit cracks the armor',e.armor===1);}
    // knight: guards the statue, parries soft hits and ripostes
    {fresh();const e=only('knight');ok('knight guards the throne',e.post&&e.post.kind==='guard');const b=ball(e.x,e.y+40,0,-200),hp=G.run.hp,eh=e.hp;strikeEnemy(e,b,300);ok('parries a soft hit and ripostes',e.hp===eh&&G.run.hp<hp);strikeEnemy(e,b,900);ok('a hard hit gets through',e.hp<eh||e.armor<1);}
    // troll: holds a scoop, punts the ball, staggers on a hard hit
    {fresh();const e=only('troll');ok('troll holds a scoop',e.post&&e.post.kind==='hole');const b=ball(e.x,e.y+e.r+12,0,-300);adv(.1,2);ok('punts the ball ('+Math.round(b.vy)+')',b.vy>200);
      strikeEnemy(e,b,900);ok('a hard hit staggers it',e.stun>0);e.stun=0;const h=T.holes[e.post.id],sc=G.run.score;pin=null;G.balls=[newBall(h.x,h.y-2,0,30)];let caught=0,was='';for(let k=0;k<80;k++){G.enemies=G.enemies.filter(x=>keep.includes(x));__gb.advance(.1,0);const bb=G.balls[0],st=bb?bb.st:'';if(st==='held'&&was!=='held'&&bb.held&&bb.held.id===e.post.id)caught++;was=st;}ok('a ball leaving the scoop slips past the troll, no capture loop ('+caught+')',caught<=1);}
    // nothing lingers from a wing after it is done: foes die with the wing
    }catch(e){log.push('FAIL threw after the checks above: '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' | '));}return log;});
  console.log(out.join('\n'));const nf=out.filter(l=>l.startsWith('FAIL')).length;console.log(nf+' failed of '+out.length);console.log(logs.join('\n')||'no page errors');await br.close();if(nf||logs.length)process.exitCode=1;})();
