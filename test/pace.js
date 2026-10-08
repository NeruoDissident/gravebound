// Pacing probe: the bot plays with no dev keys and we log how many foes are on the ball's level each second,
// when waves start, and how boss fights go (time on the boss's level per visit, hits landed, how the visit ended).
// usage: node test/pace.js [game-minutes per class]
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const skeleton=b=>'<!doctype html><html><head><meta charset=utf8></head><body>'+b+'</body></html>';
(async()=>{const mins=+process.argv[2]||8;
  const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await br.newPage({viewport:{width:480,height:300}});const logs=[];pg.on('pageerror',e=>logs.push('PAGEERROR '+e.message));
  await pg.route('**/*',r=>{const u=r.request().url();if(u.includes('three.js/r128/three.min.js'))return r.fulfill({path:path.join(root,'node_modules/three/build/three.min.js'),contentType:'application/javascript'});
    const m=u.match(/three@0\.128\.0\/(examples\/js\/.+)$/);if(m)return r.fulfill({path:path.join(root,'node_modules/three',m[1]),contentType:'application/javascript'});
    if(u.startsWith('http://local.test/'))return r.fulfill({body:skeleton(fs.readFileSync(path.join(root,'dist/gravebound-3d.html'),'utf8')),contentType:'text/html'});return r.abort();});
  await pg.goto('http://local.test/');await pg.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready,null,{timeout:150000,polling:400});
  await pg.evaluate(()=>{__gb.hold(true);setQuality('low',true);G.opt.endless=true;});
  for(const cls of ['knight','mage']){
    const res=await pg.evaluate(([cls,mins])=>{
      const bot=()=>{G.auto=true;G.bot={hl:0,hr:0,tl:30,tr:30,pl:0,plT:.7};};
      UI.menu(null);startRun(cls);bot();
      const tierSec=[0,0,0,0],foeSec={},waves=[],stages=[];let t=0,lastStage=-1;
      const sw0=startWave;startWave=(tier,why)=>{const ok=sw0(tier,why);if(ok)waves.push([Math.round(t),tier,why,G.wave.active.total]);return ok;};const lw0=launchWave;launchWave=(tier,list,why,c,q)=>{if(why==='call'||why==='cast')waves.push([Math.round(t),tier,why,list.length]);return lw0(tier,list,why,c,q);};
      for(;t<mins*60;t+=.5){__gb.advance(.5,0);
        if(G.choice){choose(0);}if(UI.cur&&UI.cur!=='pause'&&G.mode==='play')UI.menu(null);
        if(G.mode==='over'){UI.menu(null);startRun(cls);bot();}
        const ft=Math.min(3,G.focusTier);tierSec[ft]+=.5;
        if(ft<3){const n=G.enemies.filter(e=>!e.dead&&e.tier===ft).length;foeSec[ft+':'+n]=(foeSec[ft+':'+n]||0)+.5;}
        const q=G.run.main;if(q&&q.si!==lastStage){lastStage=q.si;stages.push([Math.round(t),q.si,qCur(q)&&qCur(q).text.slice(0,40)]);}}
      startWave=sw0;launchWave=lw0;
      return {cls,tierSec,foeSec,waves,stages};},[cls,mins]);
    console.log('\n==',res.cls,'time on level (s):',JSON.stringify({keep:res.tierSec[0],wilds:res.tierSec[1],hollow:res.tierSec[2],grave:res.tierSec[3]}));
    for(const t of [2,1,0]){const rows=Object.entries(res.foeSec).filter(([k])=>+k.split(':')[0]===t).map(([k,v])=>[+k.split(':')[1],v]).sort((a,b)=>a[0]-b[0]);const tot=rows.reduce((a,r)=>a+r[1],0);if(!tot)continue;
      console.log(['keep','wilds','hollow'][t],'foes on level, share of time:',rows.map(r=>r[0]+':'+Math.round(r[1]/tot*100)+'%').join(' '));}
    const gaps=res.waves.slice(1).map((w,i)=>w[0]-res.waves[i][0]);
    console.log('waves:',res.waves.length,'start times',JSON.stringify(res.waves.map(w=>w[0]+'s/'+['K','W','H'][w[1]]+'/'+w[3])));
    console.log('gaps between waves (s):',JSON.stringify(gaps));
    console.log('main quest stages (t, stage, text):',JSON.stringify(res.stages));}
  // the boss visit: wake the Warden, drop the ball on the Wilds, let the bot play; log each visit to the Wilds
  const boss=await pg.evaluate(()=>{const out=[];
    for(let trial=0;trial<12;trial++){UI.menu(null);startRun('knight');G.auto=true;G.bot={hl:0,hr:0,tl:30,tr:30,pl:0,plT:.7};DEV.on=true;
      wakeBoss('warden');__gb.advance(.2,0);devKey('d2');__gb.advance(.1,0);
      const bo=G.boss;let hits=0;const h0=bo.hitBoss;const hb=hitBoss;hitBoss=(b,d,c)=>{if(b===G.boss)hits++;hb(b,d,c);};
      let t=0,end='timeout';for(;t<60;t+=.1){__gb.advance(.1,0);if(G.choice)choose(0);
        if(!bo.alive){end='killed';break;}if(G.focusTier!==1){end=G.focusTier===2?'dropped to Hollow':G.focusTier===0?'climbed to Keep':'other';break;}if(!G.balls.length){end='drained';break;}}
      hitBoss=hb;out.push([Math.round(t*10)/10,hits,end,Math.round(bo.hp)+'/'+Math.round(bo.max||bo.hpMax||0)]);}
    return out;});
  console.log('\nWarden visits (seconds on the Wilds, boss hits, how it ended, boss hp):');boss.forEach(v=>console.log('  ',JSON.stringify(v)));
  console.log(logs.join('\n')||'no page errors');await br.close();})();
