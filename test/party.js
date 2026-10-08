// The party: guards at the drains, swarms that go for them, the Tavern that hires them.
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const skeleton=b=>'<!doctype html><html><head><meta charset=utf8></head><body>'+b+'</body></html>';
(async()=>{const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await br.newPage({viewport:{width:480,height:300}});const logs=[];pg.on('pageerror',e=>logs.push('PAGEERROR '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join('|')));
  await pg.route('**/*',r=>{const u=r.request().url();if(u.includes('three.js/r128/three.min.js'))return r.fulfill({path:path.join(root,'node_modules/three/build/three.min.js'),contentType:'application/javascript'});
    const m=u.match(/three@0\.128\.0\/(examples\/js\/.+)$/);if(m)return r.fulfill({path:path.join(root,'node_modules/three',m[1]),contentType:'application/javascript'});
    if(u.startsWith('http://local.test/'))return r.fulfill({body:skeleton(fs.readFileSync(path.join(root,'dist/gravebound-3d.html'),'utf8')),contentType:'text/html'});return r.abort();});
  await pg.goto('http://local.test/');await pg.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready,null,{timeout:150000,polling:400});
  const out=await pg.evaluate(()=>{__gb.hold(true);G.playerHp=true;setQuality('low',true);const log=[],ok=(n,v)=>log.push((v?'ok   ':'FAIL ')+n);try{
    const adv=(sec)=>{for(let t=0;t<sec;t+=.1)__gb.advance(.1,0);};
    const fresh=(comp,tier)=>{UI.menu(null);startRun('knight',comp);G.auto=false;DEV.on=true;__gb.advance(.5,1);devKey('d'+(tier+1));__gb.advance(.1,1);G.enemies=[];G.pickups=[];G.save=0;G.run.shield=false;G.run.hp=G.mods.maxHp;G.wave.t=999;quests().forEach(q=>{q.steps=q.steps.filter(o=>o.t!=='kill');});return G.run;};
    const posts=t=>guardPosts(t),cx=t=>t===2?303:320;
    // the first pick stands at the centre post
    {const r=fresh('tank',2);ok('the first companion takes the centre post',r.party.length===1&&r.party[0].id==='tank'&&r.party[0].slot==='center');ok('the only post is the Hollow drain',guardPosts(2).length===1&&guardPosts(0).length===0&&guardPosts(1).length===0);ok('riding alone is allowed',(fresh(null,2),G.run.party.length===0));}
    // a ball headed for the centre drain bounces off the guard, at a cost
    {const r=fresh('tank',2),c=r.party[0],p=posts(2)[0];G.balls=[newBall(cx(2),p.y-60,0,420)];adv(.6);const b=G.balls[0];ok('the centre guard catches a draining ball ('+(b?Math.round(b.vy):'gone')+')',b&&b.st==='live'&&b.y<p.y);ok('and it costs the guard health ('+c.hp+')',c.hp<c.maxHp);}
    // a wounded guard holds nothing
    {const r=fresh('tank',2),c=r.party[0],p=posts(2)[0];c.hp=0;G.balls=[newBall(cx(2),p.y-60,0,420)];adv(1.2);ok('a wounded guard lets the ball through',!G.balls.length||G.balls[0].y>p.y+40||G.balls[0].st!=='live');
      c.hp=0;done('townGate',300,TY[2]+400);ok('completing a bank raises them',c.hp>0);}
    // swarms go for the guards; the tank intercepts a strike meant for you
    {const r=fresh('tank',2),c=r.party[0],p=posts(2)[0];G.balls=[newBall(180,TY[2]+600,0,0)];const e=spawnEnemy("skeleton",2);e.spawn=0;adv(.5);ok("a skeleton heads for the guard",e.tgt===c);let g=0;while(e.state!=='hold'&&g++<600){adv(.1);const b=G.balls[0];if(b){b.x=180;b.y=TY[2]+600;b.vx=b.vy=0;b.st='live';}}
      ok('and stops short of it ('+Math.round(p.y-e.y)+')',e.state==='hold'&&e.y<p.y);const hp0=G.run.hp,ch=c.hp;e.atk=.1;for(let k=0;k<40;k++){adv(.1);const b=G.balls[0];if(b){b.x=180;b.y=TY[2]+600;b.vx=b.vy=0;b.st='live';}}
      ok('its strike lands on the guard, not you ('+(ch-c.hp)+' '+[e.state,e.wind.toFixed(1),e.atk.toFixed(1),e.stun.toFixed(1),e.tgt?e.tgt.id:'-',e.dead,G.focusTier,G.balls.length,G.fallen,G.run.hp,hp0,c.slot,c.hp,G.run.party.length,G.run===r,liveGuards(2).length,e.tier,(e.y-TY[0])|0].join('/')+')',c.hp<ch&&G.run.hp===hp0);}
    {const r=fresh('tank',2),c=r.party[0],p=posts(2)[0];const pb=newBall(p.x,p.y-30,0,300);pb.party='dps';const h=c.hp;guardHit(c,p,pb,400);ok('a party ball bouncing off the guard costs it nothing',c.hp===h);const hb=newBall(p.x,p.y-30,0,300);c.cool=0;guardHit(c,p,hb,400);ok('your own ball still does',c.hp<h);}
    {const r=fresh('tank',2),c=r.party[0];G.balls=[newBall(303,TY[2]+600,0,0)];const e=spawnEnemy('troll',2);e.spawn=0;const hp0=G.run.hp,ch=c.hp;foeStrike(e,G.balls[0]);ok('Oakshield intercepts a strike meant for you',G.run.hp===hp0&&c.hp<ch&&c.ready>0);foeStrike(e,G.balls[0]);ok('but not two in a row',G.run.hp<hp0);}
    // the Healer heals on a catch and mends itself; the Striker marks
    {const r=fresh('healer',2),c=r.party[0],p=posts(2)[0];G.run.hp=50;G.balls=[newBall(cx(2),p.y-60,0,420)];adv(.6);ok('a Healer heals you on the catch',G.run.hp>50);const h=c.hp;G.balls=[];adv(2);ok('and mends itself ('+h.toFixed(0)+' → '+c.hp.toFixed(0)+')',c.hp>h);}
    {const r=fresh('dps',2),p=posts(2)[0];const e=spawnEnemy('troll',2);e.spawn=0;e.x=cx(2);e.y=TY[2]+500;G.balls=[newBall(cx(2),p.y-60,0,420)];adv(.6);ok('a Striker marks the nearest foe on the catch',e.marked>0);}
    // the Tavern hires only when you can pay and have room
    {const r=fresh('tank',2);r.gold=0;const h=T.holes.tavern,b=G.balls[0]=newBall(h.x,h.y,0,0);b.st='held';b.held={id:'tavern',t:0};handleHole(h,b);adv(.3);ok('a Tavern visit with no gold opens nothing',!G.choice&&!G.pending.includes('tavern'));}
    }catch(e){log.push('FAIL threw after the checks above: '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' | '));}return log;});
  console.log(out.join('\n'));const nf=out.filter(l=>l.startsWith('FAIL')).length;console.log(nf+' failed of '+out.length);console.log(logs.join('\n')||'no page errors');await br.close();if(nf||logs.length)process.exitCode=1;})();
