/* ================= TABLE-TEST RULES =================
   Free play. Every mechanism on the table works (banks, lanes, scoops, tunnels, ramps, kickback, the Grave),
   but the RPG layer (classes, foes, quests, health, saves) is not in this build. The table, physics and audio
   above are the 2D game's own code, untouched, so that layer drops back in on top of the 3D renderer. */
const CLASSES={ // ball feel only: size and how hard bumpers throw it
  knight:{name:'Knight',r:12.5,kx:.6,color:'#c4d0dc',glow:'#8fb0d8'},
  rogue:{name:'Rogue',r:10,kx:1.05,color:'#9a86c8',glow:'#b08cff'},
  mage:{name:'Mage',r:11,kx:1,color:'#6fbcff',glow:'#5fa8ff'},
  cleric:{name:'Cleric',r:11,kx:1,color:'#ffe0a0',glow:'#ffcf70'}};
const CLS_ORDER=['knight','rogue','mage','cleric'];
const G={mode:'title',demo:false,paused:false,balls:[],boss:null,bot:null,attract:true,
  run:{cls:'knight',score:0,kickback:true,grave:{hits:0,need:8,open:false},ramps:0,balls:0},
  t:0,tilt:0,flipPow:1,slingRun:0,in:{l:false,r:false,n:false},plunge:{ready:false,charge:0,held:false,auto:0},
  inGrave:false,graveLive:false,focusTier:2,statues:[],stuck:[],doorT:0,kickT:0,shake:0,nudgeT:0,
  parts:[],floats:[],shotFx:{},flashes:[],queue:[],toast:null,dirty:true,orbitMem:{}};

function later(t,fn){G.queue.push({t,fn});}
function float(x,y,text,color,size){G.floats.push({x,y,text,color:color||'#ffe9b0',size:size||13,t:0});if(G.floats.length>30)G.floats.shift();}
function burst(x,y,n,color,sp,life){for(let i=0;i<n;i++){const a=rand(TAU),v=rand(.3,1)*(sp||220);
    G.parts.push({x,y,h:rand(4,16),vx:Math.cos(a)*v,vy:Math.sin(a)*v,vh:rand(60,220),life:0,max:rand(.3,.8)*(life||1),color});}
  if(G.parts.length>320)G.parts.splice(0,G.parts.length-320);}
function flashAt(x,y,color,power){G.flashes.push({x,y,color,power:power||1});}
function flashShot(id){if(T.shots[id])G.shotFx[id]=1;}
function popup(title,sub,kind){if(G.attract)return;G.toast={title,sub:sub||'',kind:kind||'info',id:(G.toast?G.toast.id:0)+1};}
function focusBall(){let f=null;for(const b of G.balls)if(!f||b.y>f.y)f=b;return f;}
function score(n,x,y,label){G.run.score+=n;G.dirty=true;if(x!==undefined)float(x,y-22,(label?label+' ':'')+fmt(n),label?'#ffd24a':'#ffe9b0',label?15:12);}

function initGame(){buildTable();
  G.statues=[{x:T.bossSpot[0].x,y:T.bossSpot[0].y,r:22,tier:0,id:'throne',on:true,flash:0,cool:0},
             {x:T.bossSpot[1].x,y:T.bossSpot[1].y,r:20,tier:1,id:'keystone',on:true,flash:0,cool:0}];}
function resetTable(){
  for(const s of T.segs){if(s.bank){s.on=true;s.lit=false;}}for(const id in T.banks)T.banks[id].reset=0;
  for(const s of T.sens)s.lit=false;
  Object.assign(G,{balls:[],tilt:0,slingRun:0,inGrave:false,graveLive:false,doorT:0,kickT:0,queue:[],orbitMem:{},parts:[],floats:[]});
  G.plunge={ready:false,charge:0,held:false,auto:0};
  G.run.score=0;G.run.kickback=true;G.run.grave={hits:0,need:8,open:false};G.run.ramps=0;G.dirty=true;}

/* ---------- the Grave ---------- */
function graveHit(o){const g=G.run.grave;if(g.open||G.inGrave)return;g.hits=Math.min(g.need,g.hits+1);G.dirty=true;
  if(g.hits>=g.need)openGrave(true);else if(g.hits%2===0||g.need-g.hits<=2)float(o.x,o.y-34,'GRAVE '+g.hits+'/'+g.need,'#9dffc8',12);}
function openGrave(on){const g=G.run.grave;g.open=on;if(!on)g.hits=0;G.dirty=true;
  if(on){g.hits=g.need;popup('The Grave Opens','Your next lost ball falls into it','good');A.s('summon');}}
function graveCatch(b){const g=G.run.grave;if(!g.open||G.balls.length>1||G.plunge.auto>0)return false;
  g.open=false;g.hits=0;G.inGrave=true;G.graveLive=false;G.dirty=true;
  T.banks.nails.segs.forEach(s=>{s.on=true;});T.banks.nails.reset=0;
  b.tun=Object.assign(resample(catmull([[b.x,b.y],[b.x,GY-40],[T.graveIn.x,GY+150],[T.graveIn.x,T.graveIn.y]],12),6),{grave:true});b.st='tunnel';b.rs=0;b.vx=b.vy=0;
  popup('The Grave','Drive both coffin nails, then shoot the light','boss');A.s('boss');return true;}

/* ---------- table events ---------- */
function ev(type,o,b,imp){const r=G.run;
  if(type==='sling')G.slingRun=(G.slingRun||0)+1;else if(type!=='wall'&&type!=='inlane'&&type!=='outlane')G.slingRun=0;
  switch(type){
  case 'wall':A.s('knock',imp);break;
  case 'flipHit':break;
  case 'sling':score(110);A.s('sling');burst(b.x,b.y,5,'#ffd9a0',160,.5);flashAt(b.x,b.y,PAL[o.tier].glow,.7);break;
  case 'bump':{const col=o.bell?'#ffd070':PAL[o.tier].glow;score(o.bell?800:250,o.x,o.y);A.s(o.bell?'bell':'bump',Math.min(2,o.tier));flashShot(o.group);
    burst(o.x,o.y,8,col,220,.5);flashAt(o.x,o.y,col,1);if(o.group==='graves')graveHit(o);break;}
  case 'target':{o.lit=true;score(500,b.x,b.y);A.s('target');flashShot(o.bank);const B=T.banks[o.bank];
    if(B.segs.every(s=>s.lit)){B.segs.forEach(s=>s.lit=false);done(o.bank,b.x,b.y);}break;}
  case 'drop':{score(750,b.x,b.y);A.s('drop');flashShot(o.bank);const B=T.banks[o.bank];
    if(B.segs.every(s=>!s.on)){B.reset=1.4;done(o.bank,b.x,b.y);}break;}
  case 'lane':case 'inlane':case 'outlane':{score(type==='lane'?400:300);A.s('lane');
    if(o.set){const S=T.sets[o.set];o.lit=true;flashShot(o.set);if(S.lanes.every(l=>l.lit)){S.lanes.forEach(l=>l.lit=false);done(o.set,o.x,o.y);}}
    break;}
  case 'orbit':{const id='orbit'+(o.side<0?'L':'R')+o.tier,m=G.orbitMem;
    if(b.vy<-150){score(3000,o.x,o.y);A.s('orbit');flashShot(id);m[o.tier]={side:o.side,t:G.t};}
    else if(b.vy>80){const p=m[o.tier];if(p&&p.side===-o.side&&G.t-p.t<4){score(6000,o.x,o.y,'FULL ORBIT');m[o.tier]=null;}}
    break;}
  case 'spin':score(150);A.s('spin');flashShot(o.id);break;
  case 'kick':if(r.kickback&&G.tilt<=0){r.kickback=false;G.kickT=10;b.x=41;b.vx=0;b.vy=-2050;A.s('kick');float(b.x+40,b.y-40,'KICKBACK','#9fe8ff',15);burst(b.x,b.y,14,'#9fe8ff',300,.6);flashAt(b.x,b.y,'#9fe8ff',1.2);}break;
  case 'rampIn':A.s('rampIn');break;
  case 'ramp':r.ramps++;score(4000,b.x,b.y,o.name.toUpperCase());A.s('ramp');flashShot(o.id);break;
  case 'rampFail':A.s('knock',260);break;
  case 'hole':handleHole(o,b);break;
  }}
const DONE_TEXT={candles:['Candles Lit','All three Vigil Candles'],moon:['Moonlight','All four Moon Phases'],townGate:['Gate Watch Roused','Kickback relit'],
  smithy:['Sharpened','Smithy targets complete'],chapel:['Blessed','Chapel targets complete'],camp:['Camp Razed','Goblin Camp targets down'],
  door:['Door Broken','The Secret Passage is open'],nails:['The Lid Splits','Shoot the light'],guard:['Guard Broken','Royal Guard targets down'],armory:['Armored','Armory targets complete']};
function done(id,x,y){score(8000,x,y);A.s('bank');const d=DONE_TEXT[id];if(d)popup(d[0],d[1],'good');
  if(id==='door')G.doorT=22;if(id==='townGate'||id==='smithy')G.run.kickback=true;G.dirty=true;}
function openDoor(open){T.banks.door.segs.forEach(s=>s.on=!open);if(!open)G.doorT=0;}
function handleHole(h,b){const hd=b.held;hd.plan='eject';hd.delay=1;A.s('hole');score(2500,h.x,h.y);flashShot(h.id);
  switch(h.id){
  case 'crypt':hd.plan='tunnel';hd.delay=.6;float(h.x,h.y-32,'CRYPT STAIR','#9dffc8',13);break;
  case 'oubliette':hd.plan='tunnel';hd.delay=.6;float(h.x,h.y-32,'DOWN THE OUBLIETTE','#ff9a7a',13);break;
  case 'secret':hd.plan='tunnel';hd.delay=.6;float(h.x,h.y-32,'SECRET STAIR','#ffd24a',13);break;
  case 'rise':hd.plan='tunnel';hd.delay=.5;G.inGrave=false;G.graveLive=false;score(50000,h.x,h.y,'RISEN');popup('Risen','The grave gives you back','main');A.s('victory');break;
  default:float(h.x,h.y-34,h.name.toUpperCase(),'#ffd9a0',12);}}

function collideActors(b){
  for(const s of G.statues){if(!s.on||Math.abs(s.y-b.y)>50)continue;const imp=hitCircle(b,s,s.r,.5);
    if(imp>60&&s.cool<=0){s.cool=.2;s.flash=1;score(600);A.s('target');flashShot(s.id);flashAt(s.x,s.y,PAL[s.tier].acc2,.8);}}}

/* ---------- ball lifecycle ---------- */
function serve(){G.balls.push(newBall(T.shooter.x,T.shooter.y,0,0));G.run.balls++;G.dirty=true;}
function addBall(from){if(G.balls.length>=5)return;
  if(from==='shooter'){G.balls.push(newBall(T.shooter.x,T.shooter.y-6,0,-2280));A.s('launch');return;}
  const h=T.holes[from],b=newBall(h.x,h.y+h.r+2,h.ev[0]*rand(.85,1.15),h.ev[1]);b.noHole=.8;G.balls.push(b);h.glow=1;A.s('eject');}
function addTestBall(){if(G.inGrave||G.balls.length>=5)return;G.plunge.auto=Math.max(G.plunge.auto,.15);popup('Extra Ball','Multiball test','mb');}
function jumpTo(tier){ // test helper: drop the ball above a level's flippers
  if(tier===3){if(G.inGrave)return;G.balls=[];G.plunge.auto=0;G.run.grave.open=true;const b=newBall(303,H+10,0,0);G.balls.push(b);graveCatch(b);return;}
  G.inGrave=false;G.graveLive=false;G.balls=[];const cx=tier===2?303:320;G.balls.push(newBall(cx+rand(-30,30),TY[tier]+560,rand(-60,60),120));G.dirty=true;}
function updatePlunger(dt){const p=G.plunge;
  if(p.auto>0){p.auto-=dt;if(p.auto<=0)addBall('shooter');}
  const b=G.balls.find(b=>b.st==='live'&&b.x>586&&b.y>3040&&Math.abs(b.vy)<60);p.ready=!!b;
  if(!b){p.charge=0;p.held=false;return;}
  if(G.in.n||G.in.r){p.charge=Math.min(1,p.charge+dt/.85);p.held=true;}
  else if(p.held){p.held=false;b.vy=-(1330+620*p.charge);b.y-=3;p.charge=0;A.s('launch');}}
function nudge(){if(G.plunge.ready||G.paused||G.attract&&!G.bot)return;
  for(const b of G.balls)if(b.st==='live'){const cx=b.tier===2?303:320;b.vy-=230;b.vx+=(b.x<cx?1:-1)*90+rand(-40,40);}
  G.shake=Math.max(G.shake,10);G.nudgeT=.25;A.s('nudge');}
function setFlip(side,on){const k=side<0?'l':'r';if(G.in[k]===on)return;G.in[k]=on;for(const f of T.flips)if(f.side===side)f.on=on;
  if(on){if(!G.bot)A.s('flip');for(const id in T.sets){const L=T.sets[id].lanes,v=L.map(l=>l.lit);L.forEach((l,i)=>l.lit=v[(i-side+L.length)%L.length]);}}
  else if(!G.bot)A.s('flipDown');}
function updateBalls(dt){let gone=false;
  for(const b of G.balls){b.age+=dt;if(b.onFlip>0)b.onFlip-=dt;b.tier=tierOf(b.y);
    if(b.st==='live'){
      const sp=Math.hypot(b.vx,b.vy),inLane=b.x>586&&b.y>3000&&b.y<3200;
      if(sp<28&&b.onFlip<=0&&!inLane)b.slow=(b.slow||0)+dt;else b.slow=0;
      if(Math.hypot(b.x-b.sx,b.y-b.sy)>46||b.onFlip>0||inLane){b.sx=b.x;b.sy=b.y;b.still=0;}else b.still+=dt;
      if(b.slow>2||b.still>6){G.stuck.push([Math.round(b.x),Math.round(b.y),b.slow>2?'rest':'trap']);if(G.stuck.length>200)G.stuck.shift();b.vx=rand(-320,320);b.vy=-rand(300,520);b.slow=0;b.still=0;b.sx=b.x;b.sy=b.y;}
      if(G.inGrave?b.y>HW+28:b.y>H+28){if(!G.inGrave&&graveCatch(b)){}else{b.gone=true;gone=true;}}}
    else if(b.st==='held'){const hd=b.held,h=T.holes[hd.id];hd.t+=dt;h.glow=Math.max(h.glow,.6);
      if(hd.t>=hd.delay){
        if(hd.plan==='tunnel'){b.st='tunnel';b.tun=T.tunnels[hd.id];b.rs=0;A.s('chute');}
        else{b.st='live';b.x=h.x;b.y=h.y+h.r+2;b.vx=h.ev[0];b.vy=h.ev[1];b.noHole=.8;b.held=null;b.sx=b.x;b.sy=b.y;A.s('eject');burst(h.x,h.y+12,6,'#ffd9a0',140,.4);}}}
    else if(b.st==='tunnel'){const tn=b.tun;b.rs+=1150*dt;railPos(tn,Math.min(b.rs,tn.len),b);
      if(b.rs>=tn.len&&tn.grave){b.st='live';b.vx=b.vy=0;b.tun=null;b.sx=b.x;b.sy=b.y;G.graveLive=true;A.s('slam');G.shake=14;burst(b.x,b.y,20,'#9dffc8',260,.8);flashAt(b.x,b.y,'#9dffc8',1.5);}
      else if(b.rs>=tn.len){const h=T.holes[tn.to];b.st='held';b.held={id:tn.to,t:0,plan:'eject',delay:.45};b.x=h.x;b.y=h.y;b.tun=null;h.glow=1;}}}
  if(gone){const g=G.balls.filter(b=>b.gone);G.balls=G.balls.filter(b=>!b.gone);for(const b of g)onDrain(b);}}
function onDrain(b){A.s('drain');
  if(G.inGrave){G.inGrave=false;G.graveLive=false;popup('Gravebound','The earth keeps what it is given','bad');}
  if(G.balls.length+(G.plunge.auto>0?1:0)>=1)return;
  later(.7,()=>{if(!G.balls.length&&G.plunge.auto<=0)serve();});}

/* ---------- per-frame ---------- */
function updateRules(dt){
  if(!G.run.kickback){G.kickT-=dt;if(G.kickT<=0){G.run.kickback=true;G.dirty=true;}}
  if(G.doorT>0){G.doorT-=dt;if(G.doorT<=0)openDoor(false);}
  for(const id in T.banks){const B=T.banks[id];if(B.reset>0){B.reset-=dt;if(B.reset<=0&&id!=='door'&&id!=='nails')B.segs.forEach(s=>s.on=true);}}
  for(const s of G.statues){if(s.flash>0)s.flash-=dt*4;if(s.cool>0)s.cool-=dt;}
  const f=focusBall();if(f){const ft=tierOf(f.y);if(ft!==G.focusTier){G.focusTier=ft;G.dirty=true;}}}
function updateFx(dt){
  for(const p of G.parts){p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.h+=p.vh*dt;p.vh-=520*dt;if(p.h<1){p.h=1;p.vh*=-.35;}p.vx*=1-dt*2;p.vy*=1-dt*2;}
  if(G.parts.length)G.parts=G.parts.filter(p=>p.life<p.max);
  for(const f of G.floats)f.t+=dt;if(G.floats.length&&G.floats[0].t>1.3)G.floats=G.floats.filter(f=>f.t<1.3);
  for(const id in G.shotFx){G.shotFx[id]-=dt*1.6;if(G.shotFx[id]<=0)delete G.shotFx[id];}
  if(G.shake>0)G.shake=Math.max(0,G.shake-dt*45);if(G.nudgeT>0)G.nudgeT-=dt;}
function botStep(dt){const B=G.bot;let l=false,r=false;
  for(const f of T.flips)for(const b of G.balls){if(b.st!=='live')continue;const dx=(b.x-f.x)*f.dir,dy=b.y-f.y;
    if(dx>(f.side<0?B.tl:B.tr)&&dx<90&&dy>-34-b.vy*.02&&dy<30&&b.vy>-150){if(f.side<0)l=true;else r=true;}}
  if(l&&B.hl<=0){B.hl=.16;B.tl=rand(12,66);}if(r&&B.hr<=0){B.hr=.16;B.tr=rand(12,66);}
  if(B.hl>0)B.hl-=dt;if(B.hr>0)B.hr-=dt;setFlip(-1,B.hl>.03);
  if(G.plunge.ready){B.pl+=dt;G.in.n=B.pl<B.plT;if(B.pl>B.plT+.15){B.pl=0;B.plT=rand(.25,.95);}setFlip(1,false);}
  else{G.in.n=false;B.pl=0;setFlip(1,B.hr>.03);}}
function gameStep(dt){G.t+=dt;if(G.paused)return;
  if(G.queue.length){const due=[];G.queue=G.queue.filter(q=>{q.t-=dt;if(q.t<=0){due.push(q);return false;}return true;});for(const q of due)q.fn();}
  if(G.bot)botStep(dt);
  updatePlunger(dt);physics(dt);updateBalls(dt);updateRules(dt);updateFx(dt);}

function startAttract(){G.attract=true;G.demo=true;G.mode='title';resetTable();setFlip(-1,false);setFlip(1,false);G.in.n=false;
  G.bot={hl:0,hr:0,tl:rand(20,60),tr:rand(20,60),pl:0,plT:rand(.5,.9)};serve();}
function startPlay(){G.attract=false;G.demo=false;G.mode='play';G.bot=null;resetTable();setFlip(-1,false);setFlip(1,false);G.in.n=false;serve();
  popup('The Hollow Awaits','Hold Space, then let go to launch','main');}
