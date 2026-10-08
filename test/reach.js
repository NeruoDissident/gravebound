// Shot map: from each flipper, fan balls across angles and speeds and record which features they reach.
// usage: node test/reach.js [tier]   (0 Keep, 1 Wilds, 2 Hollow)
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
const skeleton=b=>'<!doctype html><html><head><meta charset=utf8></head><body>'+b+'</body></html>';
(async()=>{const tier=+(process.argv[2]||2);const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const pg=await br.newPage({viewport:{width:480,height:300}});const logs=[];pg.on('pageerror',e=>logs.push('PAGEERROR '+e.message+' '+(e.stack||'').split('\n').slice(1,3).join('|')));
  await pg.route('**/*',r=>{const u=r.request().url();if(u.includes('three.js/r128/three.min.js'))return r.fulfill({path:path.join(root,'node_modules/three/build/three.min.js'),contentType:'application/javascript'});
    const m=u.match(/three@0\.128\.0\/(examples\/js\/.+)$/);if(m)return r.fulfill({path:path.join(root,'node_modules/three',m[1]),contentType:'application/javascript'});
    if(u.startsWith('http://local.test/'))return r.fulfill({body:skeleton(fs.readFileSync(path.join(root,'dist/gravebound-3d.html'),'utf8')),contentType:'text/html'});return r.abort();});
  await pg.goto('http://local.test/');await pg.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready,null,{timeout:150000,polling:400});
  const out=await pg.evaluate((tier)=>{__gb.hold(true);setQuality('low',true);
    UI.menu(null);startRun('knight');G.auto=false;DEV.on=true;__gb.advance(.5,1);devKey('d'+(tier+1));__gb.advance(.1,1);G.enemies=[];G.pickups=[];G.save=999;G.wave.t=999;G.ambT=999;quests().forEach(q=>{q.steps=q.steps.filter(o=>o.t!=='kill');});
    const seen=[];const ev0=ev;ev=(t,o,b,i)=>{let id=null;if(t==='drop'||t==='target')id=o.bank;else if(t==='hole')id=o.id;else if(t==='rampIn')id=o.id;else if(t==='orbit')id='orbit'+(o.side<0?'L':'R')+o.tier;else if(t==='spin')id=o.id;else if(t==='bump')id=o.group;else if(t==='lane'||t==='inlane'||t==='outlane')id=t;
      if(id&&seen[seen.length-1]!==id)seen.push(id);ev0(t,o,b,i);};
    const cx=tier===2?303:320,yF=TY[tier]+900,res={},first={},drains={},stuck=[],dbg=[];let n=0;
    for(const side of [-1,1])for(let a=-62;a<=62;a+=4)for(const v of [1500,1800,2100]){const x=cx+side*100-side*42,y=yF-16,ra=a*Math.PI/180,vx=v*Math.sin(ra),vy=-v*Math.cos(ra);
      G.queue=[];G.sub=null;G.mb=null;G.choice=null;G.pending=[];G.paused=false;G.run.xp=0;G.plunge.auto=0;G.save=999;G.enemies=[];G.pickups=[];G.balls=[newBall(x,y,vx,vy)];seen.length=0;G.focusTier=tier;const b=G.balls[0];
      for(let t=0;t<3;t+=.05){__gb.advance(.05,0);if(!G.balls.includes(b)||b.y>yF+30||b.st!=='live'&&!(b.st==='rail'&&b.rail.to===tier))break;}
      n++;if((a===2||a===-22||a===22)&&v===1800)dbg.push([side,a,v,seen.slice(),b.st,Math.round(b.x),Math.round(b.y-TY[tier])]);const key=(side<0?'L':'R');for(const id of seen){res[id]=res[id]||{L:0,R:0};res[id][key]++;}if(seen[0]){first[seen[0]]=first[seen[0]]||{L:0,R:0};first[seen[0]][key]++;}
      const bb=G.balls[0];if(bb&&bb.st==='live'&&Math.hypot(bb.vx,bb.vy)<5&&bb.y<yF-40&&!bb.held)stuck.push([Math.round(bb.x),Math.round(bb.y-TY[tier]),side,a,v]);}
    ev=ev0;return {dbg,n,res,first,stuck,shots:Object.keys(T.shots).filter(k=>T.shots[k].tier===tier)};},tier);
  console.log('tier',tier,'samples',out.n);
  const ids=Object.keys(out.res).sort((a,b)=>(out.res[b].L+out.res[b].R)-(out.res[a].L+out.res[a].R));
  for(const id of ids){const r=out.res[id],f=out.first[id]||{L:0,R:0};console.log(id.padEnd(12),'reached L',String(r.L).padStart(3),'R',String(r.R).padStart(3),'  first L',String(f.L).padStart(3),'R',String(f.R).padStart(3));}
  const missing=out.shots.filter(s=>!out.res[s]&&!/^(orbitR|candles|moon|keystone|throne|door|nails)/.test(s));if(missing.length)console.log('NEVER REACHED:',missing.join(', '));
  if(out.stuck.length)console.log('STUCK (x,y,side,angle,v):',JSON.stringify(out.stuck));
  console.log(logs.join('\n')||'no page errors');await br.close();})();
