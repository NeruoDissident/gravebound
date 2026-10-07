// Full-game soak in the real page: the bot plays each class with choices auto-picked, dev keys push the quest
// line forward so bosses, multiball and the Grave all come up, and a frame is rendered every so often so the
// 3D actors and the overlay run in every state. Any exception fails the run.
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const skeleton=b=>'<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"><style>body{margin:0}[hidden]{display:none!important}</style></head><body>'+b+'</body></html>';
(async()=>{const mins=+process.argv[2]||3;
  const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await br.newPage({viewport:{width:640,height:400}});const logs=[];pg.on('pageerror',e=>logs.push('PAGEERROR '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join(' | ')));pg.on('console',m=>{if(m.type()==='error'&&!/ERR_FAILED/.test(m.text()))logs.push(m.text());});
  await pg.route('**/*',r=>{const u=r.request().url();if(u.includes('three.js/r128/three.min.js'))return r.fulfill({path:path.join(root,'node_modules/three/build/three.min.js'),contentType:'application/javascript'});
    const m=u.match(/three@0\.128\.0\/(examples\/js\/.+)$/);if(m)return r.fulfill({path:path.join(root,'node_modules/three',m[1]),contentType:'application/javascript'});
    if(u.startsWith('http://local.test/'))return r.fulfill({body:skeleton(fs.readFileSync(path.join(root,'dist/gravebound-3d.html'),'utf8')),contentType:'text/html'});return r.abort();});
  await pg.goto('http://local.test/');await pg.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready,null,{timeout:150000,polling:400});
  await pg.evaluate(()=>{__gb.hold(true);setQuality('low',true);});
  for(const cls of ['knight','rogue','mage','cleric']){
    const res=await pg.evaluate(([cls,mins])=>{const seen={},err=[];UI.menu(null);startRun(cls);G.auto=true;DEV.on=true;G.bot={hl:0,hr:0,tl:30,tr:30,pl:0,plT:.7};
      const note=k=>{seen[k]=(seen[k]||0)+1;};let runs=1;
      try{for(let s=0;s<mins*60;s+=1.5){
          if(G.mode==='over'){UI.menu(null);startRun(cls);G.auto=true;G.bot={hl:0,hr:0,tl:30,tr:30,pl:0,plT:.7};runs++;}
          const k=Math.round(s/1.5);if(k%20===10)devKey('dn');if(k%47===30)devKey('dg');if(k%61===40)devKey('db');if(k%83===70)devKey('d'+(1+k%3));
          if(k%9===4){G.run.charge=100;}
          __gb.advance(1.5,1);
          if(G.boss)note('boss:'+G.boss.key+':'+G.boss.phase);if(G.inGrave)note('grave');if(G.balls.length>1)note('multiball');if(G.zones.length)note('zone');if(G.booms.length)note('boom');if(G.bolts.length)note('bolt');
          if(G.enemies.length)note('foes');if(G.pickups.length)note('pickups');if(G.balls.some(b=>b.pow))note('power');if(G.balls.some(b=>b.arm>0))note('armed');if(G.fallen)note('fallen');for(const c in G.curse)if(G.curse[c]>0)note('curse:'+c);
          for(const b of G.balls)if(!isFinite(b.x)||!isFinite(b.y))err.push('nan ball');}}catch(e){err.push(e.message+' @ '+(e.stack||'').split('\n').slice(1,4).join(' | '));}
      const r=G.run;return {cls,runs,score:r.score,level:r.level,kills:r.kills,bosses:r.bossKills,quests:r.questsDone,stuck:G.stuck.length,seen:Object.keys(seen).sort().map(k=>k+'×'+seen[k]).join(' '),err};},[cls,mins]);
    console.log(JSON.stringify(res));}
  console.log(logs.slice(0,10).join('\n')||'no page errors');await br.close();})();
