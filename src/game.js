/* ================= UTIL ================= */
const PI=Math.PI,TAU=PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const rand=(a=1,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
const irand=(a,b)=>Math.floor(rand(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const fmt=n=>Math.floor(n).toLocaleString('en-US');
const hash=n=>{n=Math.sin(n*127.1+311.7)*43758.5453;return n-Math.floor(n);};
const store={
  get(k,d){try{const v=localStorage.getItem('gravebound3d.'+k);return v?JSON.parse(v):d;}catch(e){return d;}},
  set(k,v){try{localStorage.setItem('gravebound3d.'+k,JSON.stringify(v));}catch(e){}},
  del(k){try{localStorage.removeItem('gravebound3d.'+k);}catch(e){}}
};

/* ================= TABLE ================= */
const W=640,H=3180,GY=3270,HW=4010,WY=4200,WSTEP=900,WLEN=640,WB=[WY,WY+WSTEP,WY+2*WSTEP],BR=11,TY=[40,1080,2120,GY,WB[0],WB[1],WB[2]],FY=[940,1980,3020,GY+650,WB[0]+570,WB[1]+570,WB[2]+570],CELL=80,GRAV=1150,VMAX=2300;
const TIER_NAME=['The Black Keep','The Wilds','Grave Hollow','The Grave','The Crypt','The Den','The Hoard'];
const T={segs:[],grid:[],flips:[],bumps:[],sens:[],holes:{},rails:{},mouths:[],shots:{},banks:{},sets:{},
  slings:[],spawn:[[],[],[],[],[],[],[]],torches:[],wallPaths:[],blocks:[],chans:[],bossSpot:[],statueSpot:[],tunnels:{},posts:[]};
const tierOf=y=>y<TY[1]?0:y<TY[2]?1:y<GY-60?2:y<WY-100?3:4+Math.min(2,Math.floor((y-(WY-100))/WSTEP));

function seg(x1,y1,x2,y2,o){const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1;
  const s=Object.assign({x1,y1,x2,y2,dx,dy,len,l2:len*len,e:.45,w:0,kind:'wall',on:true,flash:0,cool:0},o||{});T.segs.push(s);return s;}
function poly(pts,o,style){for(let i=0;i<pts.length-1;i++)seg(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],o);
  if(style!=='none')T.wallPaths.push({pts,style:style||'rail',w:(o&&o.w)||0});}
function gseg(a,b,cx,cy){ // one-way: solid only for balls on the (cx,cy) side
  const s=seg(a[0],a[1],b[0],b[1],{kind:'gate',e:.3,ow:true});let nx=-s.dy/s.len,ny=s.dx/s.len;
  if((cx-a[0])*nx+(cy-a[1])*ny<0){nx=-nx;ny=-ny;}s.onx=nx;s.ony=ny;return s;}
function gpoly(pts,cx,cy){for(let i=0;i<pts.length-1;i++)gseg(pts[i],pts[i+1],cx,cy);T.wallPaths.push({pts,style:'gate'});}
function arcPts(cx,cy,r,a0,a1,n){const p=[];for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;p.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]);}return p;}
function block(pts,o){poly(pts.concat([pts[0]]),{},'none');T.blocks.push(Object.assign({pts},o||{}));}
function bumper(x,y,r,group,tier,o){const b=Object.assign({x,y,r,group,tier,kick:470,flash:0,cool:0,ward:false},o||{});T.bumps.push(b);return b;}
function sensor(x,y,r,o){const s=Object.assign({x,y,r,cool:0,lit:false,flash:0},o);T.sens.push(s);return s;}
function hole(id,x,y,r,tier,name){T.holes[id]={id,x,y,r,tier,name,glow:0,busy:0};}
function shotDef(id,name,tier,x,y,ang,kind){T.shots[id]={id,name,tier,x,y:y+TY[tier],ang:ang===undefined?-PI/2:ang,kind:kind||'arrow'};}
function bank(id,tier,p0,p1,n,kind,o){o=o||{};
  const B=T.banks[id]||(T.banks[id]={id,tier,kind,segs:[],reset:0,name:o.name||id});
  const dx=p1[0]-p0[0],dy=p1[1]-p0[1],len=Math.hypot(dx,dy);let nx=-dy/len,ny=dx/len;if(ny<0){nx=-nx;ny=-ny;}
  const pad=o.pad||0,off=kind==='target'?4.5:0,g=.05;
  for(let k=0;k<n;k++){const t0=pad+(1-2*pad)*(k+g)/n,t1=pad+(1-2*pad)*(k+1-g)/n;
    B.segs.push(seg(p0[0]+dx*t0+nx*off,p0[1]+dy*t0+ny*off,p0[0]+dx*t1+nx*off,p0[1]+dy*t1+ny*off,
      {kind,bank:id,tier,w:kind==='drop'?3:2.5,e:.3,lit:false,nx,ny}));}
  return B;}
function mouthGeo(px,py,sx){const dx=sx*.38,dy=sx?-.925:-1,qx=sx?.925:1,qy=sx*.38;
  const lb=[px-qx*28,py-qy*28],rb=[px+qx*28,py+qy*28]; // a funnel: 56 wide at the lip, 38 at the throat
  return {d:[dx,dy],lb,rb,lt:[px+dx*70-qx*19,py+dy*70-qy*19],rt:[px+dx*70+qx*19,py+dy*70+qy*19],c0:[px+dx*36,py+dy*36],c1:[px+dx*100,py+dy*100],p:[px,py]};}
function catmull(P,n){const o=[];for(let i=0;i<P.length-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(P.length-1,i+2)];
  for(let j=0;j<n;j++){const t=j/n,t2=t*t,t3=t2*t,q=[0,0];
    for(let k=0;k<2;k++)q[k]=.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3);o.push(q);}}
  o.push(P[P.length-1]);return o;}
function resample(pts,ds){const x=[pts[0][0]],y=[pts[0][1]];let acc=0;
  for(let i=1;i<pts.length;i++){let ax=pts[i-1][0],ay=pts[i-1][1];const bx=pts[i][0],by=pts[i][1];let d=Math.hypot(bx-ax,by-ay);
    while(acc+d>=ds){const t=(ds-acc)/d;ax+=(bx-ax)*t;ay+=(by-ay)*t;x.push(ax);y.push(ay);d=Math.hypot(bx-ax,by-ay);acc=0;}acc+=d;}
  return {x,y,n:x.length,len:(x.length-1)*ds,ds};}
function rail(id,name,mouth,pts,o){const r=Object.assign(resample(catmull([mouth.c0,mouth.c1].concat(pts),14),6),{id,name,k:.2,exitV:520},o||{});
  T.rails[id]=r;T.mouths.push({rail:id,x:mouth.c0[0],y:mouth.c0[1],dx:mouth.d[0],dy:mouth.d[1],r:21});return r;}
function railPos(r,s,out){const f=clamp(s/r.ds,0,r.n-1.001),i=f|0,t=f-i;out.x=r.x[i]+(r.x[i+1]-r.x[i])*t;out.y=r.y[i]+(r.y[i+1]-r.y[i])*t;
  out.tx=(r.x[i+1]-r.x[i])/r.ds;out.ty=(r.y[i+1]-r.y[i])/r.ds;return out;}

function buildFrame(i){const yA=TY[i]+300,aF=Math.acos(258/300),aG=Math.asin(36/300);
  const A=(a0,a1,n)=>arcPts(320,yA,300,a0,a1,n);
  if(i===0){poly(A(PI,TAU,60),{},'none');return;}
  gpoly(A(PI,PI+aF,7),320,yA);poly(A(PI+aF,1.5*PI-aG,24),{},'none');gpoly(A(1.5*PI-aG,1.5*PI+aG,4),320,yA);
  poly(A(1.5*PI+aG,TAU-aF,24),{},'none');gpoly(A(TAU-aF,TAU,7),320,yA);}

function buildFloor(i,xL,xR,cx){const yF=TY[i]+900,nextA=i<2?TY[i+1]+300:0;
  for(const sd of [-1,1]){const X=d=>sd<0?xL+d:xR-d;
    const G0=[X(42),yF-170],G1=[X(42),yF-70],G2=[cx+sd*103,yF-9];
    poly([G0,G1,G2],{w:3});
    const gl=Math.hypot(G2[0]-G1[0],G2[1]-G1[1]),ux=(G2[0]-G1[0])/gl,uy=(G2[1]-G1[1])/gl;let nx=-uy,ny=ux;if(ny>0){nx=-nx;ny=-ny;}
    const ox=G1[0]+nx*37,oy=G1[1]+ny*37,lineY=x=>oy+(x-ox)/ux*uy;
    const A=[X(80),yF-190],B=[X(80),lineY(X(80))],C=[cx+sd*140,lineY(cx+sd*140)];
    poly([A,B,C],{w:2},'none');
    const s=seg(A[0],A[1],C[0],C[1],{kind:'sling',e:.25,w:2,tier:i});let kx=-s.dy/s.len,ky=s.dx/s.len;if(kx*sd>0){kx=-kx;ky=-ky;}s.kx=kx;s.ky=ky;
    T.slings.push({A,B,C,s,tier:i,side:sd});
    const D0=[X(0),yF-262],D1=[X(30),yF-205];gseg(D0,D1,D0[0]-sd*100,D0[1]-100);T.wallPaths.push({pts:[D0,D1],style:'flap'});
    T.flips.push({x:cx+sd*100,y:yF,side:sd,dir:-sd,tier:i,L:82,rest:.5,up:-.44,a:.5,w:0,on:false});
    sensor(X(21),yF-118,14,{kind:'outlane',side:sd,tier:i});sensor(X(61),yF-118,14,{kind:'inlane',side:sd,tier:i});
    if(i<2){
      poly([G1,[X(42),nextA-153]],{w:2});
      poly([[cx+sd*100,yF+13],[320+sd*36,yF+141]],{},'none');
      T.blocks.push({pts:[G1,G2,[cx+sd*100,yF+13],[320+sd*36,yF+141],[X(42),nextA-153]],dead:true,tier:i});
    }else{
      poly([G1,[X(42),yF+150]],{w:2});poly([[cx+sd*100,yF+13],[cx+sd*40,yF+150]],{},'none');
      T.blocks.push({pts:[G1,G2,[cx+sd*100,yF+13],[cx+sd*40,yF+150],[X(42),yF+150]],dead:true,tier:i,apron:true});
    }
  }
  if(i<2){T.chans.push([[220,yF+13],[420,yF+13],[356,yF+143],[284,yF+143]]);
    T.chans.push([[20,yF-70],[62,yF-70],[62,nextA-153],[20,nextA]]);T.chans.push([[620,yF-70],[578,yF-70],[578,nextA-153],[620,nextA]]);}
}
function buildOrbits(i){const y=TY[i],yA=y+300,rr=i===2?220:254;
  poly([[66,y+500],[66,yA]].concat(arcPts(320,yA,254,PI,PI+.7,8).slice(1)),{w:3});
  poly([[320+rr,y+500],[320+rr,yA]].concat(arcPts(320,yA,rr,TAU,TAU-.7,8).slice(1)),{w:3});
  sensor(43,y+405,21,{kind:'orbit',side:-1,tier:i});sensor(i===2?563:597,y+405,21,{kind:'orbit',side:1,tier:i});}

function centerScoop(cx,y,w){w=w||20;poly([[cx-w,466],[cx-w-2,438],[cx-13,420],[cx,415],[cx+13,420],[cx+w+2,438],[cx+w,466]].map(p=>[p[0],p[1]+y]),{w:3},'scoop');}
function sideScoopBlock(m,sx,y,xg,topY,name,tier){ // block between ramp mouth guide and orbit guide, with a scoop notch facing down
  const c=sx<0?112:528,o=p=>[p[0],p[1]+y];
  const notch=[[c+20,508],[c+20,482],[c+10,470],[c-10,470],[c-20,482],[c-20,508]].map(o);
  if(sx<0)block([o([xg,topY]),m.lt,m.lb].concat(notch,[o([xg,505])]),{name,tier});
  else block([m.rt,o([xg,topY]),o([xg,505])].concat(notch,[m.rb]),{name,tier});
  return c;}

function buildTable(){
  poly([[20,340],[20,H+80]],{},'none');poly([[620,340],[620,H+80]],{},'none');
  for(let i=0;i<3;i++){buildFrame(i);buildOrbits(i);}
  buildFloor(0,20,620,320);buildFloor(1,20,620,320);buildFloor(2,20,586,303);
  let y,o;

  /* ---------- THE BLACK KEEP (upper) ----------
     The castle. The Throne Road is a centre ramp straight up the hall between the two walls of the Royal Guard; it rings
     the keep and comes down to the right inlane. The Sanctum is a pocket in the top-left corner, the Armory a bank of
     standups low on the left, the Bell a dead-end lane up the right, the Oubliette the pocket beside it. */
  y=TY[0];o=p=>[p[0],p[1]+y];
  bumper(236,y+300,24,'braziers',0);bumper(404,y+300,24,'braziers',0);
  const m5=mouthGeo(320,y+470,0),mb=mouthGeo(452,y+480,1);
  // the Sanctum: a pocket in the top-left corner, under the Throne Road's first bend
  {const c=112,notch=[[c+20,340],[c+20,314],[c+10,302],[c-10,302],[c-20,314],[c-20,340]].map(o);
   block([o([66,250]),o([150,262]),o([150,340])].concat(notch,[o([66,340])]),{name:'sanctum',tier:0});}
  hole('sanctum',112,y+322,14,0,'Sanctum');
  // the Armory: three standups low on the left
  bank('armory',0,o([78,546]),o([128,496]),3,'target',{pad:.08,name:'Armory'});
  block([o([78,546]),o([128,496]),o([112,470]),o([66,462]),o([66,540])],{name:'armory',tier:0});
  // the Royal Guard flank the Throne Road
  bank('guard',0,o([236,486]),o([286,464]),2,'drop',{name:'Royal Guard'});bank('guard',0,o([354,464]),o([404,486]),2,'drop');
  const blt=[mb.lb[0]+38,mb.lb[1]-92.5],brt=[mb.rb[0]+38,mb.rb[1]-92.5];
  poly([mb.lb,blt],{w:3});
  bumper(452+.38*116,y+480-.925*116,20,'bell',0,{kick:520,bell:true});
  {const c=528,notch=[[c+20,508],[c+20,482],[c+10,470],[c-10,470],[c-20,482],[c-20,508]].map(o);
   block([brt,o([574,372]),o([574,505])].concat(notch,[mb.rb]),{name:'oubliette',tier:0});}
  poly([o([574,280]),o([474,350])],{w:3}); // a lid over the pocket behind the bell, so nothing can lodge there
  hole('oubliette',528,y+488,13,0,'Oubliette');
  sensor(43,y+455,20,{kind:'spin',id:'chains',tier:0,rate:0,ang:0});
  T.statueSpot[0]={x:320,y:y+205};T.bossSpot[0]={x:320,y:y+650}; // the boss rises from the summoning circle in the middle of the field
  T.spawn[0]=[[150,585],[225,640],[320,600],[415,640],[490,585],[270,560],[370,560],[320,690]].map(o);

  /* ---------- THE WILDS (middle) ----------
     The forest. The Goblin Camp's palisade stands high in the middle under the stone ring, with the Secret Passage
     behind its door; the Mill is a spinner lane in the centre that feeds the camp's west wall; the corridor between
     the two ramp mouths is wide open, so the whole upper field is in play. The Catacombs and the Witch's Hut keep
     their corners. */
  y=TY[1];o=p=>[p[0],p[1]+y];
  bumper(236,y+232,24,'stones',1);bumper(404,y+232,24,'stones',1);bumper(320,y+262,24,'stones',1);
  const m4=mouthGeo(188,y+480,-1),m3=mouthGeo(452,y+480,1);
  sideScoopBlock(m4,-1,y,66,380,'catacombs',1);hole('catacombs',112,y+488,13,1,'Catacombs');
  poly([m4.rb,m4.rt],{w:3});
  // the camp: two walls of drops either side of the Sealed Door, the Secret Passage scoop behind it
  bank('camp',1,o([248,396]),o([300,372]),2,'drop',{name:'Goblin Camp'});bank('camp',1,o([340,372]),o([392,396]),2,'drop');
  bank('door',1,o([300,372]),o([320,366]),1,'drop',{name:'Sealed Door'});bank('door',1,o([320,366]),o([340,372]),1,'drop');
  poly([[300,372],[298,346],[308,332],[320,328],[332,332],[342,346],[340,372]].map(o),{w:3},'scoop');
  hole('secret',320,y+352,13,1,'Secret Passage');
  // the Mill: a spinner lane left of centre, straight up into the camp's west wall
  poly([o([252,548]),o([252,468])],{w:3});poly([o([296,548]),o([296,468])],{w:3});
  sensor(274,y+508,20,{kind:'spin',id:'windmill',tier:1,rate:0,ang:0});
  poly([m3.lb,m3.lt],{w:3});
  sideScoopBlock(m3,1,y,574,380,'hut',1);hole('hut',528,y+488,13,1,"Witch's Hut");
  {const yF=y+900,ls=T.sens.filter(s=>s.tier===1&&(s.kind==='inlane'||s.kind==='outlane'));ls.sort((a,b)=>a.x-b.x);ls.forEach(s=>s.set='moon');
   T.sets.moon={id:'moon',tier:1,lanes:ls,name:'Moon Phases'};}
  T.statueSpot[1]={x:320,y:y+178};T.bossSpot[1]={x:320,y:y+650};
  T.spawn[1]=[[150,585],[225,640],[320,600],[415,640],[490,585],[236,578],[370,560],[320,690]].map(o);

  /* ---------- GRAVE HOLLOW (lower) ----------
     The village. Shots fan out at every depth: the Smithy low on the left and the Crypt's mausoleum low on the right,
     the two ramps and the Tavern across the middle, the Town Gate and the Chapel high up, shot through the gaps beside
     the Gravestones. The Weathervane turns in front of the Forest Road, so every shot up the road spins it. */
  y=TY[2];o=p=>[p[0],p[1]+y];
  const cl=[];[266,302,338,374].forEach(x=>poly([o([x,92]),o([x,142])],{w:4},'post'));
  [284,320,356].forEach(x=>cl.push(sensor(x,y+118,13,{kind:'lane',set:'candles',tier:2})));
  T.sets.candles={id:'candles',tier:2,lanes:cl,name:'Vigil Candles'};
  bumper(258,y+234,24,'graves',2);bumper(382,y+234,24,'graves',2);bumper(320,y+304,24,'graves',2);
  const m1=mouthGeo(172,y+480,-1),m2=mouthGeo(434,y+480,1);
  // high banks: the Town Gate (drops) above the Forest Road mouth, open to both flippers; the Chapel (standups) up the right
  bank('townGate',2,o([192,336]),o([254,310]),3,'drop',{name:'Town Gate'});
  block([o([190,330]),o([252,304]),o([236,270]),o([190,282])],{name:'townGate',tier:2});
  bank('chapel',2,o([412,298]),o([482,323]),3,'target',{pad:.05,name:'Chapel'});
  block([o([412,298]),o([482,323]),o([540,300]),o([540,250]),o([446,262])],{name:'chapel',tier:2});
  // the left wedge between the orbit guide and the Forest Road mouth
  block([o([66,390]),m1.lt,m1.lb,o([72,520]),o([66,500])],{name:'roadWedge',tier:2});
  poly([m1.rb,m1.rt],{w:3});
  // the Smithy: two standups low on the left, a cradle shot from the right flipper with the kickback below it
  bank('smithy',2,o([70,640]),o([112,604]),2,'target',{pad:.1,name:'Smithy'});
  block([o([70,640]),o([112,604]),o([96,584]),o([66,576]),o([66,636])],{name:'smithy',tier:2});
  // the Tavern: the sure scoop, dead centre, with a wide mouth
  centerScoop(303,y,28);hole('tavern',303,y+444,14,2,'Tavern');
  // the Chapel Stair mouth and, hanging below the right orbit guide, the mausoleum with the Crypt Stair in its base
  poly([m2.lb,m2.lt],{w:3});
  {const c=505,notch=[[c+20,640],[c+20,614],[c+10,602],[c-10,602],[c-20,614],[c-20,640]].map(o);
   block([m2.rt,o([540,390]),o([540,640])].concat(notch,[o([470,640]),o([470,540]),m2.rb]),{name:'crypt',tier:2});}
  hole('crypt',505,y+622,13,2,'Crypt Stair');
  // the Weathervane spins in the Forest Road's approach
  sensor(195,y+540,20,{kind:'spin',id:'vane',tier:2,rate:0,ang:0,rot:Math.atan2(.925,.38)-PI/2});
  // shooter lane
  poly([[586,y+335],[586,H+80]],{w:2});
  {const g=gseg([586,y+335],[620,y+288],480,y+200);T.wallPaths.push({pts:[[586,y+335],[620,y+288]],style:'flap'});}
  seg(586,3112,620,3112,{e:.1});
  T.shooter={x:603,y:3100};
  sensor(41,y+935,17,{kind:'kick',tier:2});
  T.spawn[2]=[[160,585],[215,640],[303,600],[392,640],[445,600],[255,560],[350,560],[303,690]].map(o);

  /* ---------- THE GRAVE (a coffin under the Hollow; one way out) ---------- */
  y=GY;o=p=>[p[0],p[1]+y];
  T.coffin=[[217,641],[62,210],[62,150],[196,24],[444,24],[578,150],[578,210],[423,641]].map(o);
  poly(T.coffin,{},'none');
  for(const sd of [-1,1]){T.flips.push({x:320+sd*100,y:y+650,side:sd,dir:-sd,tier:3,L:82,rest:.5,up:-.44,a:.5,w:0,on:false});
    poly([o([320+sd*100,663]),o([320+sd*46,HW-GY+60])],{},'none');}
  centerScoop(320,y-250);hole('rise',320,y+194,14,3,'The Light');T.holes.rise.ev=[0,200];
  bank('nails',3,o([300,214]),o([320,208]),1,'drop',{name:'Coffin Nails'});bank('nails',3,o([320,208]),o([340,214]),1,'drop');
  bumper(150,y+300,22,'bones',3);bumper(490,y+300,22,'bones',3);
  T.graveIn={x:258,y:y+330};
  shotDef('rise','The Light',3,320,262);T.shots.nails=T.shots.rise;
  [[110,170],[530,170],[320,60]].forEach((q,k)=>T.torches.push({x:q[0],y:q[1]+y,c:k===2?'#eaffd0':'#7dffb0',r:k===2?170:120,ph:rand(9)}));

  /* ---------- CAMPAIGN WINGS: small rooms with their own flippers, each reached through a scoop once the Warden's key is won ---------- */
  T.wings={};
  const wingRoom=(key,tier,outline,goalId,goalName,inId,inName,inPos)=>{const y=TY[tier],o=p=>[p[0],p[1]+y],w=T.wings[key]={key,tier,y,outline:outline.map(o),goal:goalId,inHole:inId,seal:[]};
    poly(w.outline,{},'none');
    for(const sd of [-1,1]){T.flips.push({x:320+sd*100,y:y+570,side:sd,dir:-sd,tier,L:82,rest:.5,up:-.44,a:.5,w:0,on:false});poly([o([320+sd*100,583]),o([320+sd*46,WLEN+60])],{},'none');}
    centerScoop(320,y-280);hole(goalId,320,y+164,14,tier,goalName);T.holes[goalId].ev=[0,200];
    w.seal=[seg(300,y+184,320,y+178,{kind:'seal',w:3,e:.3,tier}),seg(320,y+178,340,y+184,{kind:'seal',w:3,e:.3,tier})];
    hole(inId,inPos[0],y+inPos[1],13,tier,inName);shotDef(goalId,goalName,tier,320,236);return w;};
  const wingTorches=(tier,col,spots)=>spots.forEach((q,k)=>T.torches.push({x:q[0],y:q[1]+TY[tier],c:col,r:k===2?170:120,ph:rand(9),fix:{x:q[0],y:q[1]+TY[tier],h:46}}));
  // the Crypt (necromancer): light four sigils on the walls to break the seal on the sarcophagus
  {const w=wingRoom('crypt',4,[[217,561],[120,400],[120,130],[205,40],[435,40],[520,130],[520,400],[423,561]],'sarc','Sarcophagus','cryptIn','Crypt Stair',[180,120]);y=w.y;o=p=>[p[0],p[1]+y];
    bank('sigils',4,o([124,330]),o([124,220]),2,'target',{pad:.08,name:'Sigils'});bank('sigils',4,o([516,220]),o([516,330]),2,'target',{pad:.08});
    bumper(255,y+300,22,'urns',4);bumper(385,y+300,22,'urns',4);
    T.spawn[4]=[[200,440],[440,440],[320,410],[320,255],[175,250],[465,250]].map(o);
    shotDef('sigils','Sigils',4,162,275,PI);shotDef('sigilsR','Sigils',4,478,275,0);shotDef('urns','Urns',4,320,300,0,'dot');
    wingTorches(4,'#c8e060',[[104,150],[536,150],[320,22]]);}
  // the Den (beast lord): a cave with the pack in it; slay three wolves to clear the way to the lair
  {const w=wingRoom('den',5,[[217,561],[128,430],[104,300],[136,170],[214,84],[320,52],[426,84],[504,170],[536,300],[512,430],[423,561]],'lair','The Lair','denIn','Hunting Door',[250,112]);y=w.y;o=p=>[p[0],p[1]+y];
    bumper(196,y+258,20,'bonepile',5);bumper(444,y+258,20,'bonepile',5);
    T.spawn[5]=[[320,305],[286,425],[354,425],[320,365]].map(o);
    shotDef('bonepile','Bone Piles',5,320,330,0,'dot');
    wingTorches(5,'#cfe6ff',[[88,300],[552,300],[320,34]]);}
  // the Hoard (dragon): six dragon coins lie about the vault floor; roll over them all to unbar the vault
  {const w=wingRoom('hoard',6,[[217,561],[140,440],[108,250],[150,110],[250,44],[390,44],[490,110],[532,250],[500,440],[423,561]],'vault','The Vault','hoardIn','Smuggler\'s Crawl',[246,106]);y=w.y;o=p=>[p[0],p[1]+y];
    bumper(398,y+268,24,'pyre',6); // off the centre line, so the straight shot at the vault stays open from both flippers
    w.coins=[[168,215],[472,215],[162,362],[478,362],[198,468],[442,468]].map(o);
    T.spawn[6]=[[230,300],[440,372],[320,420],[250,250],[318,318]].map(o);
    shotDef('pyre','The Pyre',6,398,306,0,'dot');
    wingTorches(6,'#ffb050',[[92,250],[548,250],[320,26]]);}

  /* ---------- RAILS (ramps) ---------- */
  rail('rampForest','Forest Road',m1,[[104,2420],[70,2300],[46,2180],[40,2040],[40,1900],[42,1800],[52,1756],[68,1742],[80,1756],[81,1792]],{from:2,to:1,up:true});
  rail('rampChapel','Chapel Stair',m2,[[510,2420],[528,2340],[500,2262],[420,2206],[320,2188],[220,2206],[140,2262],[106,2340],[92,2440],[84,2600],[81,2760],[81,2832]],{from:2,to:2});
  rail('rampRuin','Ruin Stair',m3,[[528,1380],[566,1270],[592,1150],[600,1010],[600,880],[598,770],[590,722],[574,706],[560,720],[559,756]],{from:1,to:0,up:true});
  rail('rampWolf','Wolf Run',m4,[[118,1390],[92,1300],[118,1222],[200,1166],[320,1146],[440,1166],[522,1222],[550,1300],[560,1500],[559,1760],[559,1796]],{from:1,to:1});
  rail('rampTower','Throne Road',m5,[[300,300],[250,220],[185,160],[130,138],[200,108],[320,92],[430,110],[500,170],[540,260],[558,360],[559,560],[559,754]],{from:0,to:0});
  T.mouthGeo={rampForest:m1,rampChapel:m2,rampRuin:m3,rampWolf:m4,rampTower:m5,bell:mb};

  /* ---------- TUNNELS (hole to hole) ---------- */
  const H_=T.holes,tun=(a,b,mid)=>{const r=resample(catmull([[H_[a].x,H_[a].y]].concat(mid,[[H_[b].x,H_[b].y]]),14),6);T.tunnels[a]=Object.assign(r,{to:b});};
  tun('crypt','catacombs',[[560,2500],[470,2250],[250,2000],[150,1750]]);
  tun('secret','sanctum',[[380,1380],[420,1100],[360,800],[320,600]]);
  tun('oubliette','crypt',[[590,640],[604,1000],[560,1500],[600,2000],[560,2420]]);
  tun('rise','crypt',[[400,GY+60],[470,3160],[540,2900]]);
  // short hops between the main table and a wing: a straight run the camera follows, about a second long
  const hop=(a,b,key)=>{const A_=typeof a==='string'?[H_[a].x,H_[a].y]:a,B_=[H_[b].x,H_[b].y],x=[],yy=[],n=26;for(let i=0;i<n;i++){x.push(lerp(A_[0],B_[0],i/(n-1)));yy.push(lerp(A_[1],B_[1],i/(n-1)));}
    T.tunnels[key]={x,y:yy,n,ds:40,len:(n-1)*40,to:b,zone:true};};
  for(const k in WINGS){const d=WINGS[k],w=T.wings[k];hop(d.gate,w.inHole,'in_'+k);hop(w.goal,d.out,w.goal);hop([320,w.y+WLEN+24],d.out,'out_'+k);}
  // where each hole spits the ball
  const fl=(t,sd)=>T.flips.find(f=>f.tier===t&&f.side===sd);
  const aim=(id,f)=>{const h=H_[id],tx=f.x+f.dir*46,ty=f.y-8,vy=260,dy=ty-h.y,t=(-vy+Math.sqrt(vy*vy+2*GRAV*dy))/GRAV;h.ev=[(tx-h.x)/t,vy];};
  aim('tavern',fl(2,-1));aim('crypt',fl(2,1));aim('catacombs',fl(1,-1));aim('hut',fl(1,1));aim('secret',fl(1,1));aim('sanctum',fl(0,-1));aim('oubliette',fl(0,1));aim('cryptIn',fl(4,-1));aim('denIn',fl(5,-1));aim('hoardIn',fl(6,-1));

  /* ---------- SHOT INSERTS ---------- */
  const aL=Math.atan2(-.925,-.38),aR=Math.atan2(-.925,.38);
  shotDef('orbitL0','Rampart Walk',0,43,545);shotDef('armory','Armory',0,136,556,Math.atan2(-.7,-.7));shotDef('rampTower','Throne Road',0,320,540);
  shotDef('guard','Royal Guard',0,262,528);shotDef('sanctum','Sanctum',0,112,380);shotDef('braziers','Braziers',0,320,272,0,'dot');
  shotDef('bell','The Bell',0,434,524,aR);shotDef('oubliette','Oubliette',0,528,545);shotDef('orbitR0','Rampart Walk',0,597,545);
  shotDef('chains','Winch',0,43,500,0,'dot');shotDef('throne','The Throne',0,320,238,0,'dot');
  shotDef('orbitL1','Moon Path',1,43,545);shotDef('catacombs','Catacombs',1,112,545);shotDef('rampWolf','Wolf Run',1,206,524,aL);
  shotDef('camp','Goblin Camp',1,368,436);shotDef('secret','Secret Passage',1,320,444);T.shots.door=T.shots.secret;shotDef('stones','Standing Stones',1,320,304,0,'dot');
  shotDef('rampRuin','Ruin Stair',1,434,524,aR);shotDef('hut',"Witch's Hut",1,528,545);shotDef('orbitR1','Moon Path',1,597,545);
  shotDef('windmill','Mill',1,274,532,0,'dot');shotDef('moon','Moon Phases',1,320,760,0,'dot');shotDef('keystone','Keystone',1,320,216,0,'dot');
  shotDef('orbitL2','Night Road',2,43,545);shotDef('smithy','Smithy',2,138,648,Math.atan2(-.77,-.64));shotDef('rampForest','Forest Road',2,198,574,aL);
  shotDef('townGate','Town Gate',2,236,372,Math.atan2(-.92,-.39));shotDef('tavern','Tavern',2,303,505);shotDef('graves','Gravestones',2,320,268,0,'dot');
  shotDef('chapel','Chapel',2,430,356,Math.atan2(-.942,.336));shotDef('rampChapel','Chapel Stair',2,416,524,aR);shotDef('crypt','Crypt Stair',2,505,668);
  shotDef('orbitR2','Night Road',2,563,545);shotDef('vane','Vane',2,168,566,0,'dot');shotDef('candles','Vigil Candles',2,320,172,0,'dot');

  /* ---------- TORCHES ---------- */
  for(let i=0;i<3;i++){const yy=TY[i];const c=['#ff5a3c','#7fe0c0','#ffb050'][i];
    [[30,640],[610-(i===2?34:0),640],[96,452],[i===2?512:544,452],[320,40],[150,150],[490,150]].forEach((p,k)=>T.torches.push({x:p[0],y:p[1]+yy,c:k===4?['#ff3040','#a0e8ff','#ffd070'][i]:c,r:k===4?150:110,ph:rand(9)}));}

  // grid
  const rows=Math.ceil((WB[2]+WLEN+200)/CELL);for(let r=0;r<rows;r++)T.grid.push([]);
  for(const s of T.segs){const a=Math.max(0,Math.floor((Math.min(s.y1,s.y2)-BR-8)/CELL)),b=Math.min(rows-1,Math.floor((Math.max(s.y1,s.y2)+BR+8)/CELL));for(let r=a;r<=b;r++)T.grid[r].push(s);}
}

/* ================= PHYSICS ================= */
const SUB=1/480;
function newBall(x,y,vx,vy){const c=G.run&&CLASSES[G.run.cls];return {x,y,vx:vx||0,vy:vy||0,r:c?c.r:BR,kx:c?c.kx:1,cr:0,arm:0,pow:null,tk:0,st:'live',rail:null,rs:0,rv:0,hgt:0,rot:0,trail:[],still:0,noMouth:0,noHole:0,onFlip:0,age:0,tier:tierOf(y),sx:x,sy:y,held:null};}

function hitSeg(b,s){
  let t=((b.x-s.x1)*s.dx+(b.y-s.y1)*s.dy)/s.l2;t=t<0?0:t>1?1:t;
  const qx=s.x1+s.dx*t,qy=s.y1+s.dy*t;let nx=b.x-qx,ny=b.y-qy;const R=b.r+s.w,d2=nx*nx+ny*ny;
  if(d2>=R*R)return;
  if(s.ow&&(b.x-s.x1)*s.onx+(b.y-s.y1)*s.ony<=0)return;
  let d=Math.sqrt(d2);if(d<1e-5){nx=-s.dy/s.len;ny=s.dx/s.len;d=1e-5;}else{nx/=d;ny/=d;}
  b.x+=nx*(R-d);b.y+=ny*(R-d);
  const vn=b.vx*nx+b.vy*ny;if(vn>=0)return;
  const imp=-vn,e=imp<70?0:s.e;
  b.vx-=(1+e)*vn*nx;b.vy-=(1+e)*vn*ny;
  const tx=-ny,ty=nx,vt=b.vx*tx+b.vy*ty,fr=imp<70?.0025:.03;b.vx-=tx*vt*fr;b.vy-=ty*vt*fr;
  if(imp<55)return;
  if(s.kind==='sling'){if(t>.1&&t<.9&&nx*s.kx+ny*s.ky>.5){const k=(G.slingRun>4?140:rand(420,580))*(.5+.5*b.kx);b.vx+=s.kx*k;b.vy+=s.ky*k+rand(-50,30);s.flash=1;ev('sling',s,b,imp);}}
  else if(s.kind==='target'){if(s.cool<=0){s.cool=.2;s.flash=1;ev('target',s,b,imp);}}
  else if(s.kind==='drop'){s.on=false;s.flash=1;ev('drop',s,b,imp);}
  else if(imp>160)ev('wall',s,b,imp);
}
function hitFlipper(b,f){
  const ca=Math.cos(f.a),sa=Math.sin(f.a),ex=f.dir*f.L*ca,ey=f.L*sa;
  let t=((b.x-f.x)*ex+(b.y-f.y)*ey)/(f.L*f.L);t=t<0?0:t>1?1:t;
  const qx=f.x+ex*t,qy=f.y+ey*t;let nx=b.x-qx,ny=b.y-qy;const R=b.r+8.5-3.5*t,d2=nx*nx+ny*ny;
  if(d2>=R*R)return;
  let d=Math.sqrt(d2);if(d<1e-5){nx=0;ny=-1;d=1e-5;}else{nx/=d;ny/=d;}
  b.x+=nx*(R-d);b.y+=ny*(R-d);
  const sx=-f.dir*sa*f.L*t*f.w,sy=ca*f.L*t*f.w;
  const rx=b.vx-sx,ry=b.vy-sy,vn=rx*nx+ry*ny;b.onFlip=.15;
  if(vn>=0)return;
  const moving=Math.abs(f.w)>1,e=moving?.1:(vn>-110?0:.3);
  b.vx-=(1+e)*vn*nx;b.vy-=(1+e)*vn*ny;
  const tx=-ny,ty=nx,vt=(b.vx-sx)*tx+(b.vy-sy)*ty,fr=(!moving&&vn>-110)?.0025:.03;b.vx-=tx*vt*fr;b.vy-=ty*vt*fr;
  if(moving&&-vn>200)ev('flipHit',f,b,-vn);
}
function hitCircle(b,c,R,e){ // returns impact speed (>0) when the ball struck the circle
  const dx=b.x-c.x,dy=b.y-c.y,RR=b.r+R,d2=dx*dx+dy*dy;if(d2>=RR*RR)return 0;
  const d=Math.sqrt(d2)||1e-5,nx=dx/d,ny=dy/d;b.x=c.x+nx*RR;b.y=c.y+ny*RR;
  const vn=b.vx*nx+b.vy*ny;if(vn>=0)return .001;
  b.vx-=(1+e)*vn*nx;b.vy-=(1+e)*vn*ny;b._nx=nx;b._ny=ny;return -vn;
}
function stepFlippers(h){
  for(const f of T.flips){const pw=G.flipPow||1,dead=G.tilt>0;
    const target=(f.on&&!dead)?f.up:f.rest,sp=(f.on&&!dead)?-21*pw:13;
    let na=f.a+sp*h;if(sp<0&&na<target)na=target;if(sp>0&&na>target)na=target;
    f.w=(na-f.a)/h;f.a=na;}
}
function stepBall(b,h){
  if(b.st==='rail'){const r=b.rail,p=railPos(r,b.rs,b);
    b.rv+=GRAV*r.k*p.ty*h;b.rv-=b.rv*.1*h;b.rs+=b.rv*h;b.hgt=Math.min(1,b.rs/80,(r.len-b.rs)/80);
    if(b.rs>=r.len){railPos(r,r.len,b);const v=clamp(b.rv,200,r.exitV);b.vx=b.tx*v;b.vy=b.ty*v;b.st='live';b.hgt=0;b.noMouth=.3;ev('ramp',r,b);}
    else if(b.rs<=0){railPos(r,0,b);const v=Math.min(b.rv,-140);b.vx=b.tx*v;b.vy=b.ty*v;b.st='live';b.hgt=0;b.noMouth=.5;ev('rampFail',r,b);}
    else railPos(r,b.rs,b);
    return;}
  if(b.st!=='live')return;
  b.vy+=GRAV*h;
  const s2=b.vx*b.vx+b.vy*b.vy;if(s2>VMAX*VMAX){const k=VMAX/Math.sqrt(s2);b.vx*=k;b.vy*=k;}
  b.x+=b.vx*h;b.y+=b.vy*h;
  for(const f of T.flips){if(b.y>f.y-110&&b.y<f.y+90&&Math.abs(b.x-f.x)<110)hitFlipper(b,f);}
  const row=T.grid[(b.y/CELL)|0];if(row)for(let i=0;i<row.length;i++){const s=row[i];if(s.on)hitSeg(b,s);}
  for(const c of T.bumps){if(Math.abs(b.y-c.y)<60){const imp=hitCircle(b,c,c.r,.3);
    if(imp>0&&c.cool<=0){c.cool=.06;c.flash=1;const k=c.kick*(imp>40?b.kx:.6);b.vx+=(b.x-c.x)/(b.r+c.r)*k;b.vy+=(b.y-c.y)/(b.r+c.r)*k;ev('bump',c,b,imp);}}}
  if(b.tier<3&&G.run&&G.run.party&&G.run.party.length)for(const g of liveGuards(b.tier)){const p=g.p,c=g.c;if(Math.abs(b.y-p.y)>60)continue;const imp=hitCircle(b,p,p.r,.3);
    if(imp>0&&c.cool<=0){const k=p.slot==='center'?440:360;b.vx+=(b.x-p.x)/(b.r+p.r)*k*.6;b.vy=-Math.abs(b.vy)*.5-k*.8;guardHit(c,p,b,imp);}}
  collideActors(b);
  if(b.x<20+b.r){b.x=20+b.r;if(b.vx<0)b.vx*=-.4;}if(b.x>620-b.r){b.x=620-b.r;if(b.vx>0)b.vx*=-.4;}
  if(b.y<TY[0]+b.r){b.y=TY[0]+b.r;if(b.vy<0)b.vy*=-.4;}
}
function stepSensors(dt){
  for(const s of T.sens){if(s.cool>0)s.cool-=dt;if(s.flash>0)s.flash-=dt*3;
    if(s.kind==='spin'&&s.rate>0){s.ang+=s.rate*dt*TAU;s.acc+=s.rate*dt;while(s.acc>=1){s.acc-=1;ev('spin',s);}s.rate*=Math.pow(.25,dt);if(s.rate<.6)s.rate=0;}}
  for(const b of G.balls){if(b.st!=='live')continue;
    if(b.noMouth>0)b.noMouth-=dt;else for(const m of T.mouths){const dx=b.x-m.x,dy=b.y-m.y;
      if(dx*dx+dy*dy<m.r*m.r){const v=b.vx*m.dx+b.vy*m.dy;if(v>90&&T.rails[m.rail].closed){b.vx=-b.vx*.55;b.vy=-b.vy*.55+90;A.s('clank');float(b.x,b.y-26,'BARRED','#cfd8e0',12);burst(b.x,b.y,6,'#cfd8e0',200,.5);break;}if(v>90){b.st='rail';b.rail=T.rails[m.rail];b.rs=0;b.rv=v;b.hgt=0;ev('rampIn',b.rail,b);break;}}}
    if(b.st!=='live')continue;
    if(b.noHole>0)b.noHole-=dt;else for(const id in T.holes){const h=T.holes[id],dx=b.x-h.x,dy=b.y-h.y;
      if(dx*dx+dy*dy<h.r*h.r){b.st='held';b.held={id,t:0};b.x=h.x;b.y=h.y;b.vx=b.vy=0;h.glow=1;ev('hole',h,b);break;}}
    if(b.st!=='live')continue;
    for(const s of T.sens){const dx=b.x-s.x,dy=b.y-s.y;if(dx*dx+dy*dy<(s.r+4)*(s.r+4)){
      if(s.kind==='spin'){if(s.cool<=0){s.cool=.25;s.acc=s.acc||0;s.rate=Math.min(26,Math.hypot(b.vx,b.vy)/60);s.dir=b.vy<0?1:-1;}}
      else if(s.cool<=0){s.cool=.6;s.flash=1;ev(s.kind,s,b);}else s.cool=Math.max(s.cool,.25);}}
  }
}
function collideBalls(){const B=G.balls;for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++){const a=B[i],b=B[j];if(a.st!=='live'||b.st!=='live')continue;
  const dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy,R=a.r+b.r;if(d2>=R*R||d2<1e-6)continue;const d=Math.sqrt(d2),nx=dx/d,ny=dy/d,p=(R-d)/2;
  a.x-=nx*p;a.y-=ny*p;b.x+=nx*p;b.y+=ny*p;const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv<0){const j2=-rv*.95;a.vx-=nx*j2;a.vy-=ny*j2;b.vx+=nx*j2;b.vy+=ny*j2;}}}
function physics(dt){
  // flippers in mid-swing get four times the resolution, which is what makes the shot fan smooth
  let fine=false;for(const f of T.flips){if(f.on&&G.tilt<=0?f.a>f.up:f.a<f.rest){fine=true;break;}}
  const n=Math.max(1,Math.round(dt/SUB*(fine?4:1))),h=dt/n;
  for(let k=0;k<n;k++){stepFlippers(h);for(const b of G.balls)stepBall(b,h);if(G.balls.length>1)collideBalls();}
  for(const s of T.segs){if(s.flash>0)s.flash-=dt*4;if(s.cool>0)s.cool-=dt;}
  for(const c of T.bumps){if(c.flash>0)c.flash-=dt*5;if(c.cool>0)c.cool-=dt;}
  for(const id in T.holes){const h=T.holes[id];if(h.glow>0)h.glow-=dt*1.5;}
  stepSensors(dt);
}

/* ================= RPG DATA ================= */
const CLASSES={
  knight:{name:'Knight',tag:'Oathbound steel',hp:150,pow:11,flip:1,dr:.3,save:5,crit:.05,color:'#c4d0dc',glow:'#8fb0d8',sig:'shield',r:12.5,kx:.6,
    pass:'Heavy ball. Bumpers barely move it. Takes 30% less damage.',
    nudge:'Shockwave',nudgeText:'Staggers foes near the ball and delays their strikes.',
    shot:'Charge',shotText:'Plows through foes, shatters armor and flattens whole drop banks.',
    abil:'Aegis',abilText:'A ward saves your next lost ball. Half damage for 12 seconds.',
    ch:{hit:.5,kill:2.8,shot:1.5,spin:.06,lane:1}},
  rogue:{name:'Rogue',tag:'A knife in the dark',hp:95,pow:10,flip:1.05,dr:0,save:0,crit:.18,color:'#9a86c8',glow:'#b08cff',sig:'dagger',r:10,kx:1.05,
    pass:'Small, fast ball. Combo shots always crit. Opens the Sealed Door in one hit.',
    nudge:'Shadowstep',nudgeText:'Cloaks the ball. It slips through foes and cuts each one.',
    shot:'Backstab',shotText:'No foe can strike while it is armed. The first hit is a triple crit for double gold.',
    abil:'Shadowstrike',abilText:'12 seconds of guaranteed crits and double gold.',
    ch:{hit:.16,kill:1.8,shot:2.8,spin:.08,lane:1}},
  mage:{name:'Mage',tag:'Scholar of ruin',hp:85,pow:10,flip:1,dr:0,save:0,crit:.08,color:'#6fbcff',glow:'#5fa8ff',sig:'star',r:11,kx:1,
    pass:'Lightning arcs to foes you pass. The Standing Stones strike for you.',
    nudge:'Spark',nudgeText:'Bolts the nearest foe and breaks its spell.',
    shot:'Fireball',shotText:'Explodes on impact and burns every foe nearby.',
    abil:'Arcane Storm',abilText:'Lightning strikes every foe on the level. A mirror ball splits off.',
    ch:{hit:.7,kill:1.8,shot:1.8,spin:.3,lane:2.5}},
  cleric:{name:'Cleric',tag:'Lantern of the faithful',hp:120,pow:10,flip:1,dr:.1,save:2,crit:.06,color:'#ffe0a0',glow:'#ffcf70',sig:'sun',r:11,kx:1,
    pass:'A holy aura burns nearby undead. The Grave opens twice as fast.',
    nudge:'Ward Pulse',nudgeText:'Heals a little, lifts one curse and scorches nearby undead.',
    shot:'Consecrate',shotText:'Hallows the ground it hits. Foes there burn, and you heal inside it.',
    abil:'Sanctify',abilText:'Heal 35, lift curses, smite the undead, relight the kickback.',
    ch:{hit:.16,kill:2.2,shot:1.8,spin:.06,lane:2}}
};
/* Boons: the cards offered on a level-up. Every pick shows one card of your class, one that changes what the table gives
   you, and one plain stat (or, rarely, a keystone that defines the run). kind: class | table | stat | key. */
const PERKS=[
  // the table
  {id:'laneKeeper',kind:'table',name:'Lane Keeper',desc:'Lighting all the lanes relights the kickback.',max:1,f:m=>m.laneKick=true},
  {id:'rampRunner',kind:'table',name:'Ramp Runner',desc:'Every ramp fills 10 power and pays 2,000 more. Rank 2 doubles both.',max:2,f:m=>{m.rampCharge+=10;m.rampScore+=2000;}},
  {id:'bellRinger',kind:'table',name:'Bell Ringer',desc:'The Keep bell heals 10 and wards you from the next strike.',max:1,f:m=>m.bellHeal=10},
  {id:'ironFlip',kind:'table',name:'Iron Flippers',desc:'Every flipper hit on the ball wounds foes near it.',max:2,f:m=>m.ironFlip+=.5},
  {id:'chance',kind:'table',name:'Second Chance',desc:'Once per ball, an outlane gives the ball back.',max:1,f:m=>m.outSave=true},
  {id:'bargain',kind:'table',name:'Grave Bargain',desc:'Every lost ball pays 25 gold on the way down.',max:1,f:m=>m.bargain=25},
  {id:'tollgate',kind:'table',name:'Tollgate',desc:'Foes that reach the slingshot line take a toll every second they stand there.',max:2,f:m=>m.toll+=.5},
  {id:'hallowed',kind:'table',name:'Hallowed Lanes',desc:'Rolling a top lane or an inlane wards you from strikes for 4 seconds.',max:1,f:m=>m.laneWard=4},
  {id:'momentum',kind:'table',name:'Momentum',desc:'Combos last 3 seconds longer and pay double.',max:2,f:m=>{m.combo+=3;m.comboPay+=1;}},
  {id:'tithe',kind:'table',name:'Grave Tithe',desc:'Bumpers and slingshots shake loose gold.',max:1,f:m=>m.bumpGold=1},
  {id:'ward',kind:'table',name:'Kickback Ward',desc:'The left kickback relights itself every 30 seconds.',max:1,f:m=>m.kickRelight=true},
  // plain stats
  {id:'edge',kind:'stat',name:'Keen Edge',desc:'+30% damage to foes and bosses.',max:3,f:m=>m.dmg+=.3},
  {id:'will',kind:'stat',name:'Iron Will',desc:'+40 max health, and heal 40 now.',max:3,f:m=>m.hp+=40,now:()=>heal(40)},
  {id:'fortune',kind:'stat',name:"Fortune's Favor",desc:'+60% gold from every source.',max:2,f:m=>m.gold+=.6},
  {id:'guardian',kind:'stat',name:'Guardian Spirit',desc:'Ball save lasts 8 seconds longer.',max:2,f:m=>m.save+=8},
  {id:'breaker',kind:'stat',name:'Bone Breaker',desc:'Armor shatters in a single blow.',max:1,f:m=>m.pierce=true},
  {id:'harvest',kind:'stat',name:'Soul Harvest',desc:'Every kill restores 5 health.',max:2,f:m=>m.healKill+=5},
  {id:'mark',kind:'stat',name:"Hunter's Mark",desc:'+20% critical hit chance.',max:2,f:m=>m.crit+=.2},
  {id:'zeal',kind:'stat',name:'Zeal',desc:'Your power meter fills 50% faster.',max:2,f:m=>m.charge+=.5},
  {id:'second',kind:'stat',name:'Second Wind',desc:'Gain an extra ball.',max:1,rare:true,f:m=>{},now:()=>{G.run.ballsLeft++;}},
  // keystones: one per run
  {id:'bloodPact',kind:'key',name:'Blood Pact',desc:'Double damage. Half your health.',max:1,f:m=>{m.dmgMul*=2;m.hpK=.5;}},
  {id:'twinSoul',kind:'key',name:'Twin Soul',desc:'The party answers the Rally for twice as long.',max:1,f:m=>m.twin=true},
  {id:'hourglass',kind:'key',name:'The Hourglass',desc:'Wing clocks run for twice as long. Ball save lasts twice as long.',max:1,f:m=>{m.hour=2;m.saveK=2;}},
  {id:'deathWish',kind:'key',name:'Death Wish',desc:'Every kill fills 10 power. Every wound drains 10.',max:1,f:m=>m.deathWish=10}
];
const RELICS=[
  {id:'moonstone',name:'Moonstone',desc:'Your multiplier never drops below 2x.',f:m=>m.multMin=2},
  {id:'finger',name:"Saint's Finger",desc:'Every lane heals 3 health.',f:m=>m.laneHeal+=3},
  {id:'spade',name:"Gravedigger's Spade",desc:'Killing blows drop double gold.',f:m=>m.killGold+=1},
  {id:'ember',name:'Ember Heart',desc:'+20% damage. Ramps heal 2 health.',f:m=>{m.dmg+=.2;m.rampHeal+=2;}},
  {id:'coin',name:"Hanged Man's Coin",desc:'+10% crit chance and +25% gold.',f:m=>{m.crit+=.1;m.gold+=.25;}},
  {id:'pelt',name:'Moonfang Pelt',desc:'Take 20% less damage.',f:m=>m.dr+=.2},
  {id:'handbell',name:'Cracked Hand-Bell',desc:'Bumper hits wound the nearest foe.',f:m=>m.bumpDmg=1},
  {id:'hymnal',name:'Hollow Hymnal',desc:'Jackpots are worth double.',f:m=>m.jackpot+=1},
  {id:'key',name:"Warden's Key",desc:'Ball save lasts 5 seconds longer. The lock stays lit.',f:m=>{m.save+=5;m.lockKeep=true;}},
  {id:'scale',name:'Grave Dragon Scale',desc:'+40 max health.',f:m=>m.hp+=40},
  {id:'whet',name:'Whetstone',desc:'+10% damage.',stack:true,f:m=>m.dmg+=.1}
];
/* ---------- the party: companions stand guard at the drains ----------
   A recruited companion stands on a post at one of the three drains (the centre gap and the two outlanes). A ball
   that would go out bounces off them instead, at a cost to their health; swarms go for the guards; a guard at zero
   is wounded, the drain opens, and they stand again when you complete a bank. Good pinball wins the run; the party
   makes it more forgiving and more fun. */
const ROLES={tank:{name:'Tank',col:'#8fb0d8',hp:130},healer:{name:'Healer',col:'#ffe0a0',hp:80},dps:{name:'Striker',col:'#ff8a6a',hp:70},support:{name:'Support',col:'#b08cff',hp:90}};
const COMPANIONS={ // roles, not people. One stands guard at the bottom drain on the Hollow
  tank:{name:'Tank',role:'tank',cost:0,perk:'intercept',desc:'The most health. Every 12 seconds, takes a strike that was meant for you.'},
  healer:{name:'Healer',role:'healer',cost:0,perk:'heal',desc:'A ball off the post heals you 10 and lifts a curse. Mends itself while it stands.'},
  dps:{name:'Striker',role:'dps',cost:0,perk:'mark',desc:'A ball off the post marks the nearest foe: everything crits it for 6 seconds.'}
};
const TAVERN_RECRUITS=true; // the Tavern hires recruits: a random class with a random one of its abilities (see spells.js)
const SLOTS=['center','left','right'];
function guardPosts(tier){const P=T.gposts||(T.gposts={});if(P[tier])return P[tier];if(tier!==2)return P[tier]=[];const yF=TY[tier]+900; // one post: the bottom drain, before the Grave
  return P[tier]=[{slot:'center',x:303,y:yF+36,r:24}];}
function partyAt(slot){const r=G.run;return r&&r.party?r.party.find(c=>c.slot===slot):null;}
function guardAt(tier,slot){const c=partyAt(slot);return c&&c.hp>0?c:null;}
function liveGuards(tier){return tier<3&&G.run?guardPosts(tier).map(p=>({p,c:guardAt(tier,p.slot)})).filter(g=>g.c):[];}
function recruit(id){const r=G.run,d=COMPANIONS[id],slot=SLOTS.find(sl=>!partyAt(sl));if(!d||!slot)return null;const c={id,slot,hp:ROLES[d.role].hp,maxHp:ROLES[d.role].hp,cool:0,ready:0,saves:0};r.party.push(c);r.tavern=r.tavern.filter(x=>x!==id);G.dirty=true;return c;}
function drawRecruits(n){const have=new Set((G.run&&G.run.party||[]).map(c=>c.id)),pool=shuffle(Object.keys(COMPANIONS).filter(k=>!have.has(k))),out=[],roles=new Set();
  for(const k of pool){if(out.length>=n)break;if(roles.has(COMPANIONS[k].role))continue;roles.add(COMPANIONS[k].role);out.push(k);}
  for(const k of pool){if(out.length>=n)break;if(!out.includes(k))out.push(k);}return out;}
function guardHit(c,p,b,imp){const r=G.run,d=COMPANIONS[c.id],tier=b.tier;c.cool=.35;if(!b.party)c.hp-=12;c.saves++;c.flash=1;A.s('kick');burst(p.x,p.y-10,10,ROLES[d.role].col,220,.6);
  const near=()=>{let best=null,bd=1e9;for(const e of G.enemies){if(e.dead||e.spawn>0||e.tier!==tier)continue;const dd=Math.hypot(e.x-p.x,e.y-p.y);if(dd<bd){bd=dd;best=e;}}return best;};
  float(p.x,p.y-44,d.name.toUpperCase()+' HOLDS','#ffe9b0',12);score(500);charge(1,'hit');
  switch(d.perk){
  case 'crack':{const e=near();if(e){if(e.armor>0){e.armor--;float(e.x,e.y-26,'ARMOR CRACKED','#cfd8e0',12);}e.wind=0;e.stun=Math.max(e.stun,1.5);}break;}
  case 'mend':heal(4);break;
  case 'heal':heal(10);for(const k in G.curse)if(G.curse[k]>0){G.curse[k]=0;break;}break;
  case 'mend':heal(4);break;
  case 'mark':{const e=near();if(e){e.marked=6;float(e.x,e.y-26,'MARKED','#ff8a6a',12);}break;}
  case 'bolt':{const e=near();if(e){bolt(p,e);damageEnemy(e,G.mods.pow*.6,false);}break;}
  case 'charge':r.charge=Math.min(100,r.charge+12);break;
  case 'hold':G.wave.t+=8;r.kickback=true;relight();break;}
  if(c.hp<=0){c.hp=0;popup(d.name+' Falls',d.role==='tank'?'The drain stands open. Complete a bank to raise them':'The drain stands open. Complete a bank to raise them','bad');A.s('hurt');G.cam.shake=Math.max(G.cam.shake,8);}G.dirty=true;}
function guardStruck(c,dmg,e){const d=COMPANIONS[c.id];c.hp-=dmg;c.flash=1;G.dirty=true;float(e.x,e.y-36,d.name.toUpperCase()+' IS STRUCK','#ff8a8a',12);
  if(c.hp<=0){c.hp=0;popup(d.name+' Falls','The drain stands open. Complete a bank to raise them','bad');A.s('hurt');}}
function raiseParty(x,y){const r=G.run;let n=0;for(const c of r.party)if(c.hp<=0){c.hp=Math.round(c.maxHp*.5);n++;float(x,y-50,COMPANIONS[c.id].name.toUpperCase()+' STANDS AGAIN','#ffe9b0',13);}if(n){A.s('ward');G.dirty=true;}}
function updateParty(dt){const r=G.run;if(!r||!r.party)return;
  for(const c of r.party){if(c.cool>0)c.cool-=dt;if(c.flash>0)c.flash-=dt*4;if(c.ready>0)c.ready-=dt;const d=COMPANIONS[c.id];if(d&&(d.perk==='heal'||d.perk==='mend')&&c.hp>0&&c.hp<c.maxHp){c.hp=Math.min(c.maxHp,c.hp+2*dt);G.dirty=true;}}}
function interceptor(){const r=G.run;return r&&r.party?r.party.find(c=>c.hp>0&&COMPANIONS[c.id].perk==='intercept'&&c.ready<=0):null;}
const ENEMY={ // job: what it does on the table. wind: seconds of visible wind-up before a strike; a hit in that window staggers it
  skeleton:{name:'Skeleton',job:'swarm',hp:18,r:14,xp:8,gold:3,undead:1,dmg:7,speed:26,wind:1.6,rate:[5,8]},
  goblin:{name:'Goblin',job:'thief',hp:14,r:13,xp:7,gold:6,hop:1,dmg:5,wind:1.2,rate:[6,9]},
  wolf:{name:'Dire Wolf',job:'hunter',hp:24,r:15,xp:10,gold:3,prowl:1,beast:1,dmg:6},
  spirit:{name:'Spirit',job:'possess',hp:12,r:15,xp:9,gold:2,ghost:1,undead:1,dmg:5,wind:2.2,rate:[8,11]},
  cultist:{name:'Cultist',job:'ritual',hp:20,r:14,xp:12,gold:6,cast:9},
  revenant:{name:'Armored Dead',job:'wall',hp:32,r:16,xp:16,gold:8,armor:2,undead:1,dmg:9,wind:2,rate:[8,12]},
  knight:{name:'Corrupted Knight',job:'duel',hp:58,r:17,xp:24,gold:12,armor:1,dmg:12,wind:1.8,rate:[9,13]},
  troll:{name:'Grave Troll',job:'gate',hp:105,r:26,xp:40,gold:25,kick:1,beast:1,dmg:14,wind:2.4,rate:[10,14]}
};
const BOSSES={
  warden:{name:'The Warden of the Ruined Gate',short:'The Warden',tier:1,hp:270,r:36,color:'#9fc0dc',seq:['shield','open','summon','open','cast','open'],
    summon:'revenant',nSum:2,cast:{name:'Portcullis Slam',time:11,dmg:22,curse:'weak',shots:['rampRuin','catacombs','hut'],closes:'rampWolf',note:'The Wolf Run is barred'},xp:120,gold:80,relic:'key'},
  necro:{name:'Vael the Hollow',short:'Vael',tier:0,hp:430,r:34,color:'#7dffb0',seq:['shield','open','summon','cast','open','frenzy'],
    summon:'skeleton',nSum:4,cast:{name:'Death Knell',time:10,dmg:26,curse:'dark',shots:['rampTower','sanctum','bell']},xp:300,gold:200,relic:'hymnal'},
  beast:{name:'Moonfang, Lord of Beasts',short:'Moonfang',tier:0,hp:470,r:34,color:'#cfe6ff',moving:true,seq:['open','summon','open','cast','frenzy','open'],
    summon:'wolf',nSum:3,cast:{name:'Blood Howl',time:9,dmg:24,curse:'weak',shots:['rampTower','bell','oubliette'],howl:true,note:'The pack goes wild'},xp:300,gold:200,relic:'pelt'},
  dragon:{name:'Ashmaw, the Grave Dragon',short:'Ashmaw',tier:0,hp:540,r:40,color:'#ff8a4a',seq:['shield','open','cast','summon','open','frenzy'],wardBy:'cultist',
    summon:'cultist',nSum:3,cast:{name:'Gravefire',time:10,dmg:30,curse:'burn',shots:['bell','sanctum','rampTower'],fire:true,note:'The floor burns'},xp:340,gold:260,relic:'scale'}
};
const CAMPAIGNS={
  necro:{name:'The Hollow Choir',threat:'a necromancer',boss:'necro',foes:['skeleton','spirit','cultist'],
    wing:{key:'crypt',name:'The Crypt',text:"The Warden's key fits the Catacombs. Go down, break the seal and open the Sarcophagus"},
    intro:'The dead will not stay buried. Something beneath the Keep is singing them awake.',
    omens:[{t:'shot',id:'graves',n:8,text:'The graves are stirring. Strike the Gravestones'},
      {t:'kill',e:'skeleton',tier:2,n:3,text:'Put down the risen dead in Grave Hollow'},
      {t:'done',id:'candles',n:1,text:'Light all three Vigil Candles'},
      {t:'done',id:'townGate',n:1,text:'Rouse the watch. Drop the Town Gate targets'}],
    trail:{t:'shot',id:'rampForest',n:1,text:'Follow the corpse-lights up the Forest Road'},
    wilds:[{t:'kill',e:'cultist',tier:1,n:2,text:'Break the ritual. Slay the cultists in the Wilds'},
      {t:'shot',id:'catacombs',n:1,text:'Search the Catacombs for the choir hymnal'},
      {t:'kill',e:'spirit',tier:1,n:4,text:'Lay the wandering spirits to rest'}],
    reveal:[{t:'shot',id:'bell',n:3,text:'Ring the Keep bell to crack the wards'},
      {t:'kill',e:'revenant',tier:0,n:2,text:'Cut down the Armored Dead in the Keep'}],
    win:'The choir falls silent. Vael is dust.'},
  beast:{name:'The Moonfang Hunt',threat:'a beast lord',boss:'beast',foes:['wolf','goblin','troll'],
    wing:{key:'den',name:'The Den',text:"The Warden's key opens the hunting door behind the Witch's Hut. Go down and break the pack"},
    intro:'Livestock torn apart, hunters gone missing, and a howl that carries from the Keep on moonless nights.',
    omens:[{t:'kill',e:'wolf',tier:2,n:2,text:'Wolves at the gate. Drive them from Grave Hollow'},
      {t:'shot',id:'smithy',n:3,text:'Arm the militia. Strike the Smithy targets'},
      {t:'shot',id:'orbitL2',n:2,text:'Track the pack along the Night Road'},
      {t:'shot',id:'vane',n:20,text:'Read the wind. Spin the Weathervane'}],
    trail:{t:'shot',id:'rampForest',n:1,text:'Follow the blood trail up the Forest Road'},
    wilds:[{t:'kill',e:'wolf',tier:1,n:4,text:'Thin the pack in the Wilds'},
      {t:'shot',id:'rampWolf',n:2,text:'Run the pack down on the Wolf Run'},
      {t:'done',id:'moon',n:1,text:'Light all four Moon Phases'}],
    reveal:[{t:'shot',id:'orbitL0',n:2,text:'Stalk the ramparts of the Keep'},
      {t:'kill',e:'troll',tier:0,n:1,text:'Bring down the Grave Troll in the Keep'}],
    win:'Moonfang lies still. The howling stops.'},
  dragon:{name:'Ashes of the Grave Dragon',threat:'a dragon',boss:'dragon',foes:['goblin','cultist','knight'],
    wing:{key:'hoard',name:'The Hoard',text:"The Warden's key turns the Sealed Door. Take the Secret Passage down to the Hoard and rob the wyrm"},
    intro:'Ash falls on the Hollow like snow. Cultists say the old wyrm under the Keep has opened one eye.',
    omens:[{t:'shot',id:'chapel',n:3,text:'Seek counsel. Strike the Chapel targets'},
      {t:'kill',e:'goblin',tier:2,n:3,text:'Goblin looters in Grave Hollow. Scatter them'},
      {t:'shot',id:'rampChapel',n:2,text:'Carry the warning up the Chapel Stair'},
      {t:'shot',id:'graves',n:8,text:'Ash on the tombs. Strike the Gravestones'}],
    trail:{t:'shot',id:'crypt',n:1,text:'Take the Crypt Stair beneath the hill'},
    wilds:[{t:'done',id:'camp',n:1,text:'Raze the Goblin Camp'},
      {t:'kill',e:'cultist',tier:1,n:2,text:'Silence the dragon cult in the Wilds'},
      {t:'shot',id:'stones',n:10,text:'Wake the Standing Stones'}],
    reveal:[{t:'done',id:'guard',n:1,text:'Break the Royal Guard'},
      {t:'kill',e:'knight',tier:0,n:1,text:'Defeat the Corrupted Knight'}],
    win:'Ashmaw crashes from its perch. The ash stops falling.'}
};
const SIDE=[
  {id:'rats',name:'Teeth in the Cellar',giver:'Innkeeper Morwen',text:'Something with too many teeth has moved into my cellar.',
    steps:[{t:'kill',e:'goblin',tier:2,n:3,text:'Clear the goblins out of Grave Hollow'},{t:'shot',id:'tavern',n:1,text:'Report back at the Tavern'}],rw:{gold:40,xp:30}},
  {id:'hammer',name:"The Smith's Lost Hammer",giver:'Odrin the Smith',text:'Goblins took my hammer into the Wilds. I cannot work without it.',
    steps:[{t:'collect',tier:1,n:1,item:'hammer',text:'Find the hammer somewhere in the Wilds'},{t:'shot',id:'smithy',n:2,text:'Return it. Strike the Smithy targets'}],rw:{gold:30,xp:40,relic:1}},
  {id:'vigil',name:'Vigil for the Fallen',giver:'Sister Aldith',text:'Light the candles and walk the stair. The dead should not be alone.',
    steps:[{t:'done',id:'candles',n:1,text:'Light all three Vigil Candles'},{t:'shot',id:'rampChapel',n:2,text:'Climb the Chapel Stair twice'}],rw:{xp:45,heal:40}},
  {id:'bandits',name:'Bandits on the Road',giver:'A bleeding courier',text:'They took the mail and my horse. Up the forest road, not far.',
    steps:[{t:'shot',id:'rampForest',n:1,text:'Chase the bandits up the Forest Road'},{t:'kill',e:'goblin',tier:1,n:3,text:'Rout the bandits in the Wilds'}],rw:{gold:70,xp:40}},
  {id:'bargain',name:"The Witch's Bargain",giver:'The Hut Witch',text:'Turn my mill thirty times and I will owe you. I do not like owing.',
    steps:[{t:'shot',id:'windmill',n:30,text:'Spin the Windmill'},{t:'shot',id:'hut',n:1,text:"Return to the Witch's Hut"}],rw:{xp:40,relic:1}},
  {id:'bounty',name:'Wolf Bounty',giver:'The Reeve',text:'A silver a pelt. Bring me four.',
    steps:[{t:'kill',e:'wolf',tier:1,n:4,text:'Hunt dire wolves in the Wilds'}],rw:{gold:90,xp:35}},
  {id:'maps',name:'The Catacomb Cartographer',giver:'Fenwick, mapmaker',text:'I need two entrances marked. I am not going down there myself.',
    steps:[{t:'shot',id:'catacombs',n:1,text:'Chart the Catacombs'},{t:'done',id:'door',n:1,text:'Break the Sealed Door in the Wilds'},{t:'shot',id:'secret',n:1,text:'Enter the Secret Passage'}],rw:{gold:60,xp:70}},
  {id:'silent',name:'The Silent Bell',giver:'An old ringer',text:'That bell has not rung since the King went dark. Ring it for me.',
    steps:[{t:'shot',id:'bell',n:3,text:'Ring the bell in the Black Keep'}],rw:{xp:60,gold:40}},
  {id:'squire',name:'Rescue the Squire',giver:'Dame Isolde',text:'My squire was dragged into the Keep. Get him out by the low road.',
    steps:[{t:'kill',e:'revenant',tier:0,n:2,text:'Slay his jailers in the Keep'},{t:'shot',id:'oubliette',n:1,text:'Escape down the Oubliette'},{t:'shot',id:'tavern',n:1,text:'Bring him to the Tavern'}],rw:{gold:80,xp:80,relic:1}},
  {id:'mill',name:'Spirits of the Hollow',giver:'A sleepless miller',text:'They drift through my walls at night. Four of them. I counted.',
    steps:[{t:'kill',e:'spirit',tier:2,n:4,text:'Banish the spirits of Grave Hollow'}],rw:{gold:35,xp:40}},
  {id:'tithe',name:'A Tithe from the Crown',giver:'A hooded stranger',text:'The King is dead and still hoards. Lighten his vault.',
    steps:[{t:'done',id:'guard',n:1,text:'Break the Royal Guard'},{t:'shot',id:'sanctum',n:1,text:'Loot the Sanctum'}],rw:{gold:160,xp:50}},
  {id:'runes',name:'Runestone Attunement',giver:'Hedge-druid Carrow',text:'The stones are out of tune. Strike them until they hum.',
    steps:[{t:'shot',id:'stones',n:12,text:'Strike the Standing Stones'},{t:'shot',id:'orbitR1',n:1,text:'Walk the Moon Path'}],rw:{xp:60,heal:30}},
  {id:'hold',name:'Hold the Gate',giver:'Captain Bryce',text:'They are coming over the wall. Hold for half a minute.',
    steps:[{t:'kill',e:'skeleton',tier:2,n:5,time:45,text:'Slay 5 skeletons before the gate falls'}],rw:{gold:60,xp:60}},
  {id:'patrol',name:'Night Patrol',giver:'The gatewatch',text:'Walk the road both ways. Shout if anything moves.',
    steps:[{t:'shot',id:'orbitL2',n:2,text:'Patrol the Night Road, west'},{t:'shot',id:'orbitR2',n:1,text:'Patrol the Night Road, east'}],rw:{gold:30,xp:35}},
  {id:'armory',name:'Steel for the Hollow',giver:'Quartermaster Pell',text:'The Keep armory is full and nobody alive is using it.',
    steps:[{t:'done',id:'armory',n:1,text:'Raid the Keep Armory'},{t:'shot',id:'tavern',n:1,text:'Deliver the steel to the Tavern'}],rw:{gold:50,xp:60,relic:1}},
  {id:'tower',name:'The Throne Road',giver:'A mad astronomer',text:'Three times round the keep and the stars line up. Trust me.',
    steps:[{t:'shot',id:'rampTower',n:3,text:'Ride the Throne Road three times'}],rw:{xp:90,gold:40}}
];
const STAGES=['Omens','Omens','The Trail','The Wilds','The Ruined Gate','The Climb','The Keep','The Reckoning'];

/* ================= GAME STATE & RULES ================= */
const G={mode:'title',sub:null,paused:false,demo:false,auto:false,bot:null,balls:[],enemies:[],pickups:[],parts:[],floats:[],bolts:[],queue:[],pending:[],
  run:null,mods:{},boss:null,lit:{},cam:{y:TY[2]-20,ty:TY[2]-20,shake:0,viewH:1000},t:0,tilt:0,nudges:[],nudgeT:0,flipPow:1,in:{l:false,r:false,n:false},
  plunge:{ready:false,charge:0,held:false,auto:0},save:0,mb:null,choice:null,curse:{},buffs:{},combo:0,comboT:0,statues:[],flash:0,flashC:'#fff',
  booms:[],zones:[],phase:0,nudgeCd:0,hidden:false,inGrave:false,graveT:0,graveLive:false,wingT:0,wave:{n:0,t:18,active:null,list:[]},casts:[],rallyT:0,wingUrns:0,spawnT:0,ambT:6,doorT:0,kickT:0,hutT:40,skill:-1,fallen:false,hurtT:0,dirty:true,orbitMem:{},focusTier:2,stuck:[],bonus:null};
const xpNeed=l=>Math.round(45*Math.pow(1.32,l-1));
function later(t,fn){G.queue.push({t,fn});}
function float(x,y,text,color,size){G.floats.push({x,y,text,color:color||'#ffe9b0',size:size||13,t:0});if(G.floats.length>40)G.floats.shift();}
function burst(x,y,n,color,sp,life){for(let i=0;i<n;i++){const a=rand(TAU),v=rand(.3,1)*(sp||220);G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:0,max:rand(.3,.8)*(life||1),color,size:rand(1.5,3.5)});}
  if(G.parts.length>450)G.parts.splice(0,G.parts.length-450);}
function bolt(a,b){if(!a||!b)return;const pts=[],n=7;for(let i=0;i<=n;i++){const t=i/n,j=i&&i<n?1:0;pts.push([lerp(a.x,b.x,t)+j*rand(-16,16),lerp(a.y,b.y,t)+j*rand(-16,16)]);}G.bolts.push({pts,t:0});}
function popup(title,sub,kind,note){if(G.demo)return;UI.popup(title,sub||'',kind||'info',note||'');}
function focusBall(){let f=null;const rallying=G.balls.some(b=>b.party);for(const b of G.balls){if(rallying&&b.party)continue;if(!f||b.y>f.y)f=b;}return f||G.balls[0]||null;}
function comboF(){return G.combo>1?1+.25*Math.min(8,G.combo-1)*(1+G.mods.comboPay):1;}

function initGame(){buildTable();
  G.statues=[{x:T.statueSpot[0].x,y:T.statueSpot[0].y,r:22,tier:0,id:'throne',on:true,flash:0,cool:0},{x:T.statueSpot[1].x,y:T.statueSpot[1].y,r:20,tier:1,id:'keystone',on:true,flash:0,cool:0}];}
function resetWorld(){G.gen=(G.gen||0)+1;Object.assign(G,{balls:[],enemies:[],pickups:[],queue:[],pending:[],boss:null,choice:null,sub:null,mb:null,tilt:0,fallen:false,curse:{},buffs:{},combo:0,comboT:0,save:0,paused:false,bonus:null,doorT:0,orbitMem:{},booms:[],zones:[],phase:0,nudgeCd:0,hidden:false,inGrave:false,graveLive:false,wave:{n:0,t:18,active:null,list:[]},casts:[],rallyT:0});for(const id in T.rails)T.rails[id].closed=false;
  G.plunge={ready:false,charge:0,held:false,auto:0};
  for(const s of T.segs){if(s.bank){s.on=true;s.lit=false;}}for(const id in T.banks)T.banks[id].reset=0;for(const k in T.wings)T.wings[k].seal.forEach(s=>s.on=true);
  for(const s of T.sens)s.lit=false;for(const c of T.bumps){c.ward=false;c.poss=null;}G.statues.forEach(s=>s.on=true);}

/* ---------- run ---------- */
function newRun(cls,comp){const c=CLASSES[cls],meta=store.get('meta',{}),leg=G.demo?0:Math.min(100,(meta.bosses||0)*10);
  const r={cls,score:0,ballNum:1,ballsLeft:3,level:1,xp:0,hp:c.hp,gold:leg,mult:1,charge:0,perks:[],relics:[],kills:0,questsDone:0,bossKills:0,threat:1,
    main:null,side:[],doneSide:[],arcs:[],locks:0,lockLit:false,hoardLit:false,hutLit:true,kickback:true,shield:false,shop:true,time:0,grave:{hits:0,need:8,used:0,open:false},wing:{key:null,open:false,done:false,prog:0},stat:{ramps:0,orbits:0,jackpots:0,bestCombo:0}};
  r.party=[];r.tavern=[];r.recruits=[];r.book={};r.goal={};G.run=r;recalc();r.hp=G.mods.maxHp;if(comp&&COMPANIONS[comp])recruit(comp);else if(G.demo)recruit(pick(Object.keys(COMPANIONS)));r.main=makeCampaign(r);return r;}
function recalc(){const r=G.run,c=CLASSES[r.cls];
  const m={dmg:1,gold:1,xp:1,crit:c.crit,save:8+c.save,flip:c.flip,dr:c.dr,hp:0,charge:1,combo:5,comboPay:0,healKill:0,pierce:false,kickRelight:false,bumpGold:0,bumpDmg:0,multMin:1,laneHeal:0,killGold:0,rampHeal:0,jackpot:1,lockKeep:false,
    dmgMul:1,rampScore:0,aegisT:12,aegisK:.5,nudgeCd:0,phaseT:.7,critCharge:0,zoneT:9,zoneHeal:1.5,rampCharge:0,ironFlip:0,toll:0,hpK:1,saveK:1,hour:1,laneWard:0,bellHeal:0,bargain:0,cutpurse:0,marked:0,poison:0,chain:0,scorch:0,deathWish:0};
  for(const id of r.perks){const p=PERKS.find(p=>p.id===id);if(p)p.f(m);}
  for(const id of r.relics){const p=RELICS.find(p=>p.id===id);if(p)p.f(m);}
  m.dmg*=m.dmgMul;m.maxHp=Math.round((c.hp+m.hp+(r.level-1)*8)*m.hpK);m.pow=(c.pow+2*(r.level-1))*m.dmg;m.dr=Math.min(.75,m.dr);m.save*=m.saveK;
  G.mods=m;if(r.hp>m.maxHp)r.hp=m.maxHp;if(r.mult<m.multMin)r.mult=m.multMin;G.dirty=true;}
function makeCampaign(r){const all=Object.keys(CAMPAIGNS),keys=all.filter(k=>!r.arcs.includes(k)),key=pick(keys.length?keys:all);r.arcs.push(key);r.tavern=TAVERN_RECRUITS?drawRecruits(3):[];r.wing={key:CAMPAIGNS[key].wing?CAMPAIGNS[key].wing.key:null,open:false,done:false,prog:0};
  const c=CAMPAIGNS[key],om=shuffle(c.omens),cp=o=>Object.assign({},o);
  const steps=[cp(om[0]),cp(om[1]),cp(c.trail),cp(pick(c.wilds)),{t:'boss',boss:'warden',n:1,text:'Defeat the Warden of the Ruined Gate'},
    {t:'shot',id:'rampRuin',n:1,text:'Climb the Ruin Stair into the Black Keep'},cp(pick(c.reveal)),{t:'boss',boss:c.boss,n:1,text:'Destroy '+BOSSES[c.boss].name}],stages=STAGES.slice();
  if(c.wing){steps.splice(5,0,{t:'done',id:'wing',n:1,text:c.wing.text});stages.splice(5,0,c.wing.name);}
  return {main:true,key,name:c.name,text:c.intro,steps,stages,si:0,prog:0,tl:0};}
function giveRelic(){const r=G.run,pool=RELICS.filter(x=>!x.stack&&!r.relics.includes(x.id));if(!pool.length){gold(60);return null;}const x=pick(pool);r.relics.push(x.id);recalc();return x;}
function saveRun(){if(G.demo||!G.run||G.mode!=='play')return;store.set('run',{v:2,run:G.run});}
function metaAdd(k,n){if(G.demo)return;const m=store.get('meta',{});m[k]=(m[k]||0)+(n||1);store.set('meta',m);}

/* ---------- quests ---------- */
function quests(){const r=G.run;return r?[r.main].concat(r.side).filter(Boolean):[];}
function qCur(q){return q.steps[q.si];}
function qResume(q){const o=qCur(q);if(!o)return;if(o.t==='done'&&o.id==='wing'){G.run.wing.open=true;if(G.run.wing.key==='hoard')openDoor(true);}if(o.t==='boss')wakeBoss(o.boss);if(o.t==='collect')spawnPickup(o.tier,o.item||'relic',q);}
function qBegin(q){const o=qCur(q);if(!o)return;q.prog=0;q.tl=o.time||0;qResume(q);relight();}
function qAdd(q,n){const o=qCur(q);if(!o)return;q.prog+=n||1;G.dirty=true;
  if(q.prog<o.n&&o.n>1&&G.qxy){const s=o.id&&T.shots[o.id];float(G.qxy.x,G.qxy.y-34,(s?s.name.toUpperCase()+' ':'')+q.prog+'/'+o.n,q.main?'#ffd24a':'#9fe8ff',13);}
  if(q.prog>=o.n){q.si++;
    if(q.si>=q.steps.length)qFinish(q);
    else{qBegin(q);popup(q.main?(q.stages||STAGES)[q.si]||'Main Quest':'Quest Updated',qCur(q).text,q.main?'main':'quest');A.s('quest');if(q.main){score(20000);xp(25);saveRun();}}}
  relight();}
function qEvent(kind,key,tier){for(const q of quests()){const o=qCur(q);if(!o||o.t!==kind)continue;
  if(kind==='kill'){if((o.e===key||o.e==='any')&&o.tier===tier)qAdd(q);}
  else if(kind==='collect'){if(key===q)qAdd(q);}
  else if((o.id||o.boss)===key)qAdd(q);}}
function qFinish(q){const r=G.run;
  if(q.main){const c=CAMPAIGNS[q.key];r.main=null;score(250000);xp(150);gold(100);popup('Main Quest Complete',c.win,'main');A.s('victory');metaAdd('wins');
    r.threat++;r.won=(r.won||0)+1;
    if(G.opt.endless)later(7,()=>{if(G.run!==r||r.main)return;r.main=makeCampaign(r);qBegin(r.main);popup('A New Shadow Rises',r.main.name,'boss',r.main.text);saveRun();});
    else later(5,()=>{if(G.run===r&&G.mode!=='over')gameOver(true);});}
  else{r.side=r.side.filter(x=>x!==q);r.doneSide.push(q.id);r.questsDone++;if(r.bb)r.bb.quests++;const w=q.rw;score(25000);xp(w.xp||0);gold(w.gold||0);if(w.heal)heal(w.heal);
    let note=[w.gold?'+'+w.gold+' gold':'',w.xp?'+'+w.xp+' xp':''].filter(Boolean).join('  ');if(w.relic){const x=giveRelic();if(x)note+='  Relic: '+x.name;}
    popup('Quest Complete',q.name,'good',note);A.s('questDone');}
  saveRun();}
function qFail(q){const r=G.run;r.side=r.side.filter(x=>x!==q);G.enemies.forEach(e=>{if(e.quest===q)e.quest=null;});G.pickups=G.pickups.filter(p=>p.quest!==q);popup('Quest Failed',q.name,'bad');relight();}
function newSide(){const r=G.run;let pool=SIDE.filter(s=>!r.doneSide.includes(s.id)&&!r.side.some(q=>q.id===s.id));
  if(!pool.length){r.doneSide=[];pool=SIDE.filter(s=>!r.side.some(q=>q.id===s.id));}
  const s=pick(pool),q={id:s.id,name:s.name,giver:s.giver,text:s.text,steps:s.steps.map(o=>Object.assign({},o)),rw:s.rw,si:0,prog:0,tl:0};
  r.side.push(q);qBegin(q);popup('Quest Accepted',s.name,'quest',s.giver+': “'+s.text+'”');A.s('quest');return q;}
/* Every insert has a state as well as a colour. flash: do this now (a quest step, a boss spell, a jackpot).
   lit: worth shooting, available (the way to the quest's level, a lit lock, a spell goal, a boon waiting).
   done: collected and still showing it (a running spell's goals, a used boon, lock 1 of 2). */
const LAMP_RANK={done:1,lit:2,flash:3};
function relight(){const L={},S={},add=(id,c,st)=>{(L[id]||(L[id]=[])).push(c);st=st||'flash';if(!S[id]||LAMP_RANK[st]>LAMP_RANK[S[id]])S[id]=st;},r=G.run;G.lit=L;G.lampS=S;if(!r)return;G.dirty=true;const ft0=G.focusTier;
  if(G.inGrave){add('rise',T.banks.nails.segs.some(x=>x.on)?'main':'gold');return;}
  if(G.focusTier>=4){const tw=wingOfTier(G.focusTier);if(!tw.seal[0].on)add(tw.goal,'gold');else if(tw.key==='crypt'){add('sigils','main');add('sigilsR','main');}return;}
  if(ft0<3&&r.book)for(const sl of SLOTS_ORDER){const d=spellOf(r.cls,sl);if(!d||spellRank(d.id)<0)continue;const g=(r.goal||{})[sl]||0,st=spellOn(d.id)?'done':'lit';
    if(sl==='breaker')for(const id in T.banks)if(T.banks[id].tier===ft0&&T.shots[id])add(id,'spell',st);
    if(sl==='striker')for(const id in T.rails)if(T.rails[id].from===ft0)add(id,'spell',st);
    if(sl==='pressure'){add('orbitL'+ft0,'spell',st);add('orbitR'+ft0,'spell',st);for(const id of ['chains','windmill','vane'])if(T.shots[id]&&T.shots[id].tier===ft0)add(id,'spell',st);}
    if(sl==='guard'&&(g>=3||st==='done'))for(const id in T.holes)if(T.holes[id].tier===ft0)add(id,'spell',st);}
  const ft=G.focusTier,way=(tier,c)=>{if(ft>tier){if(ft===2){add('rampForest',c,'lit');add('crypt',c,'lit');}else{add('rampRuin',c,'lit');add('secret',c,'lit');}}else if(ft<tier&&ft===0)add('oubliette',c,'lit');};
  for(const q of quests()){const o=qCur(q);if(!o)continue;const c=q.main?'main':'side';
    if(o.id==='wing'){if(ft===1)add(WINGS[r.wing.key].gate,c);else way(1,c);}
    else if(o.t==='shot'||o.t==='done'){add(o.id,c);const s=T.shots[o.id];if(s)way(s.tier,c);}
    else if(o.t==='boss')way(BOSSES[o.boss].tier,c);else way(o.tier,c);}
  if(r.lockLit)add('catacombs','lock',r.locks>0?'flash':'lit');else if(r.locks>0)add('catacombs','lock','done');if(r.hoardLit)add('sanctum','gold');if(r.hutLit)add('hut','soft','lit');else if(G.hutT>0)add('hut','soft','done');
  if(r.side.length<2||(TAVERN_RECRUITS&&tavernOpen()))add('tavern','soft','lit');
  if(G.doorT>0)add('secret','gold');else if(T.banks.door.segs.some(x=>!x.on))add('secret','soft','lit');
  if(G.pending.length)for(const id in T.holes)if(T.holes[id].tier===ft0&&ft0<3)add(id,'gold','lit');
  const bo=G.boss;if(bo&&bo.alive&&bo.phase==='cast')bo.def.cast.shots.forEach(id=>add(id,'danger'));
  if(G.mb)for(const id in T.rails)add(id,'gold');}

/* ---------- score / stats ---------- */
function score(n,x,y,label){const r=G.run;let v=n*r.mult;if(G.curse.hex>0)v*=.5;if(G.buffs.moon>0)v*=2;v=Math.round(v/10)*10;r.score+=v;G.dirty=true;
  if(x!==undefined&&v>=1000)float(x,y,(label?label+' ':'')+fmt(v),label?'#ffd24a':'#ffe9b0',v>=20000?17:12);return v;}
function gold(n,x,y){if(n<=0)return;const r=G.run,v=Math.ceil(n*G.mods.gold*(G.buffs.stealth>0?2:1));r.gold+=v;G.dirty=true;if(x!==undefined)float(x+10,y-16,'+'+v+'g','#ffd24a',12);}
function xp(n){const r=G.run;r.xp+=n*G.mods.xp;G.dirty=true;
  while(r.xp>=xpNeed(r.level)){r.xp-=xpNeed(r.level);r.level++;recalc();heal(20);r.shop=true;G.pending.push('book');popup('Level Up','You are now level '+r.level,'level');A.s('level');}}
function heal(n){const r=G.run;r.hp=Math.min(G.mods.maxHp,r.hp+n);G.dirty=true;}
// The ball is your life. Player health is switched off while we find whether it fits: a strike still lands (shake, sound,
// and a Death Wish still drains the meter) but nothing can make you fall.
const PLAYER_HP=()=>G.playerHp!==false,HURT_K=.3; // health is on and tuned way down: foes hit for 30% of their old damage
const CRADLE_ARM=.8,CRADLE_RALLY=1.5;
function hurt(n){const r=G.run;if(G.fallen||!G.balls.length)return;G.struck=(G.struck||0)+n;if(!PLAYER_HP()){if(G.mods.deathWish)r.charge=Math.max(0,r.charge-G.mods.deathWish);G.hurtT=.4;G.cam.shake=Math.max(G.cam.shake,6);A.s('hurt');G.dirty=true;return;}let v=n*(G.playerHp===true?1:HURT_K)*(1-G.mods.dr);if(G.buffs.aegis>0)v*=G.mods.aegisK;if(G.buffs.aegisK)v*=G.buffs.aegisK;v=Math.max(1,Math.ceil(v));r.hp-=v;if(G.mods.deathWish)r.charge=Math.max(0,r.charge-G.mods.deathWish);G.hurtT=.6;G.cam.shake=Math.max(G.cam.shake,8);A.s('hurt');
  const b=focusBall();if(b)float(b.x,b.y-22,'-'+v,'#ff5a5a',16);G.dirty=true;
  if(r.hp<=0&&G.mods.martyr&&!G.martyrUsed){G.martyrUsed=true;r.hp=40;G.curse={};popup("Martyr's Light",'You stand. 40 health','good');A.s('ward');G.flash=.5;G.flashC='#ffe0a0';return;}
  if(r.hp<=0){r.hp=0;G.fallen=true;G.tilt=1e9;G.save=0;r.shield=false;popup('Fallen','Your hero collapses. The flippers go dead','bad');A.s('tilt');}}
function charge(n,src){const r=G.run,k=CLASSES[r.cls].ch[src];if(!k||G.fallen)return;const was=r.charge;r.charge=Math.min(100,r.charge+k*n*G.mods.charge/Math.max(1,heroBalls().length));G.dirty=true;if(was<100&&r.charge>=100){A.s('ward');const b=focusBall();if(b)float(b.x,b.y-34,CLASSES[r.cls].abil.toUpperCase()+' READY',CLASSES[r.cls].glow,14);}}
function major(x,y){const r=G.run;if(G.comboT>0)G.combo++;else G.combo=1;G.comboT=G.mods.combo;if(G.combo>r.stat.bestCombo)r.stat.bestCombo=G.combo;
  if(G.combo>1)float(x,y-34,G.combo+'x COMBO','#c9a6ff',15);charge(G.combo>1?1.6:1,'shot');}
function shot(id,x,y){G.qxy=x===undefined?null:{x,y};qEvent('shot',id);G.qxy=null;const bo=G.boss;if(bo&&bo.alive&&bo.phase==='cast'&&bo.def.cast.shots.includes(id))interruptBoss(bo);}
function jackpot(x,y){const m=G.mb;if(!m)return;score(m.jackpot*G.mods.jackpot,x,y,'JACKPOT');m.jackpot=Math.min(200000,m.jackpot+8000);G.run.stat.jackpots++;A.s('jackpot');G.flash=.35;G.flashC='#ffd24a';}
function ability(){const r=G.run,c=CLASSES[r.cls],b=focusBall();G.flash=.4;G.flashC=c.glow;A.s('ability');
  switch(r.cls){
  case 'knight':if(r.shield)heal(15);r.shield=true;G.buffs.aegis=G.mods.aegisT;popup('Aegis','A ward will save your next lost ball','good');break;
  case 'rogue':G.buffs.stealth=12;popup('Shadowstrike','Every hit crits for 12 seconds','good');break;
  case 'mage':{popup('Arcane Storm','Lightning strikes every foe on this level','good');const tier=G.focusTier;
    const sk=G.mods.storm?5:3;if(G.mods.storm)r.charge=Math.min(100,r.charge+33);for(const e of G.enemies)if(e.tier===tier&&e.spawn<=0&&!e.dead){bolt(b,e);if(e.def.cast)e.castT=e.def.cast+1;e.armor=0;damageEnemy(e,G.mods.pow*sk,false);}
    const bo=G.boss;if(bo&&bo.alive&&bo.tier===tier){bolt(b,bo);if(bo.phase==='cast')interruptBoss(bo);else if(bo.phase!=='shield')hitBoss(bo,G.mods.pow*sk,false);}
    if(b&&b.st==='live'&&G.balls.length===1&&!G.plunge.ready)G.balls.push(newBall(b.x,b.y,-b.vx||140,b.vy*.9-80));break;}
  case 'cleric':heal(35);G.curse={};r.kickback=true;G.save=Math.max(G.save,8);popup('Sanctify','Healed and cleansed. Kickback lit','good');
    for(const e of G.enemies)if(e.def.undead&&e.spawn<=0&&!e.dead){bolt(b,e);damageEnemy(e,G.mods.pow*(G.mods.smite?5:2.5),false);}
    if(G.mods.smite){const bo=G.boss;if(bo&&bo.alive&&bo.rise<=0&&bo.phase!=='shield'){bolt(b,bo);hitBoss(bo,G.mods.pow*3,false);}}break;}
  if(G.mods.twin&&b&&b.st==='live'&&G.balls.length<3&&!G.plunge.ready){G.balls.push(newBall(b.x,b.y,-b.vx||140,b.vy*.9-80));float(b.x,b.y-50,'TWIN SOUL',c.glow,14);}
  relight();}

/* ---------- class powers: cradle to charge, class nudge, ball traits ---------- */
function endPower(b,expired){const c=G.run.cls;b.pow=null;if(expired){if(c==='mage')explode(b.x,b.y);else if(c==='cleric')consecrate(b.x,b.y);}}
function powerImpact(b,type){if(!b||!b.pow)return;const c=G.run.cls;if(c==='mage'){endPower(b);explode(b.x,b.y);}else if(c==='cleric'){endPower(b);consecrate(b.x,b.y);}}
function explode(x,y){const m=G.mods;G.booms.push({x,y,r:140,t:0,c:'#ff8a3a'});if(m.scorch)G.zones.push({x,y,r:110,t:m.scorch,tick:0,pyre:true});burst(x,y,40,'#ffb050',440,.9);A.s('slam');G.cam.shake=Math.max(G.cam.shake,12);G.flash=.3;G.flashC='#ff8a3a';
  for(const e of G.enemies){if(e.dead||e.spawn>0||Math.hypot(e.x-x,e.y-y)>130+e.r)continue;if(e.def.cast)e.castT=e.def.cast+1;e.armor=0;damageEnemy(e,m.pow*2.5,false);}
  const bo=G.boss;if(bo&&bo.alive&&bo.rise<=0&&bo.phase!=='shield'&&Math.hypot(bo.x-x,bo.y-y)<150+bo.r)hitBoss(bo,m.pow*2.5,false);}
function consecrate(x,y){G.zones.push({x,y,r:100,t:G.mods.zoneT,tick:0});heal(8);A.s('ward');burst(x,y,24,'#ffe0a0',260,.9);float(x,y-30,'CONSECRATED','#ffe0a0',13);}
function classNudge(){const r=G.run,m=G.mods,c=r.cls,live=G.balls.filter(b=>b.st==='live');if(G.nudgeCd>0||!live.length||G.fallen)return;G.nudgeCd=2.5+m.nudgeCd;
  const near=(e,d)=>!e.dead&&e.spawn<=0&&live.some(b=>Math.hypot(b.x-e.x,b.y-e.y)<d);
  if(c==='knight'){for(const b of live)G.booms.push({x:b.x,y:b.y,r:150,t:0,c:'#8fb0d8'});
    for(const e of G.enemies)if(near(e,150)){e.atk=Math.max(e.atk,6);e.wind=0;e.stun=Math.max(e.stun,1);if(e.def.cast)e.castT=Math.max(e.castT,e.def.cast*.8);damageEnemy(e,m.pow*.4,false);}
    if(m.shockHeal){heal(m.shockHeal);for(const k in G.curse)if(G.curse[k]>0){G.curse[k]=0;break;}}}
  else if(c==='rogue'){G.phase=m.phaseT;for(const b of live)burst(b.x,b.y,10,'#b08cff',180,.5);}
  else if(c==='mage'){const b=focusBall();let best=null,bd=280;for(const e of G.enemies){if(e.dead||e.spawn>0||e.tier!==tierOf(b.y))continue;const d=Math.hypot(e.x-b.x,e.y-b.y);if(d<bd){bd=d;best=e;}}
    if(best){bolt(b,best);if(best.def.cast)best.castT=best.def.cast+1;if(m.sparkStun){best.wind=0;best.stun=Math.max(best.stun,1.5);}damageEnemy(best,m.pow*.8,false);
      if(m.chain){const more=G.enemies.filter(e=>e!==best&&!e.dead&&e.spawn<=0&&e.tier===best.tier).sort((p,q)=>Math.hypot(p.x-best.x,p.y-best.y)-Math.hypot(q.x-best.x,q.y-best.y)).slice(0,m.chain);let from=best;for(const e of more){bolt(from,e);damageEnemy(e,m.pow*.6,false);from=e;}}}
    else{const bo=G.boss;if(bo&&bo.alive&&bo.rise<=0&&bo.phase!=='shield'&&Math.hypot(bo.x-b.x,bo.y-b.y)<320){bolt(b,bo);hitBoss(bo,m.pow*.5,false);if(m.sparkStun&&bo.phase==='cast')interruptBoss(bo);}}}
  else{heal(m.absolve?10:3);if(m.absolve)G.curse={};else for(const k in G.curse)if(G.curse[k]>0){G.curse[k]=0;break;}for(const b of live)G.booms.push({x:b.x,y:b.y,r:150,t:0,c:'#ffcf70'});
    for(const e of G.enemies)if(e.def.undead&&near(e,150))damageEnemy(e,m.pow*.5,false);}}
function updatePowers(dt){const r=G.run,c=r.cls,m=G.mods,cl=CLASSES[c];G.hidden=false;if(G.phase>0)G.phase-=dt;if(G.nudgeCd>0)G.nudgeCd-=dt;
  if(spellOn('cloak'))G.phase=Math.max(G.phase,.2);if(spellOn('cloak')||spellOn('smoke'))G.hidden=true;
  for(const b of G.balls){if(b.st!=='live'){b.cr=0;continue;}
    // one hold, two stages: at 0.8 s the class shot arms (one bar, spent when the flip fires it); hold on to 1.5 s with a
    // full meter and the party rallies instead. Let go between the two and you keep the armed shot.
    const full=r.charge>=100;let held=false;if(b.onFlip>0&&!b.pow&&!b.party&&G.tilt<=0&&r.charge>=33&&(!b.arm||full)&&Math.hypot(b.vx,b.vy)<95)for(const f of T.flips)if(f.on&&f.a<=f.up+.02&&Math.abs(b.x-f.x)<75&&Math.abs(b.y-f.y)<60){held=true;break;}
    if(held){b.cr+=dt;
      if(!b.arm&&b.cr>=CRADLE_ARM){b.arm=9;b.armCost=33;A.s('ward');float(b.x,b.y-30,cl.shot.toUpperCase()+' READY'+(full?'. HOLD TO RALLY':''),cl.glow,13);G.dirty=true;if(!full)b.cr=0;}
      if(full&&b.cr>=CRADLE_RALLY){b.cr=0;b.arm=0;b.armCost=0;G.dirty=true;rally();}}
    else if(b.cr>0)b.cr=Math.max(0,b.cr-dt*2);
    if(b.arm>0){b.arm=Math.max(0,b.arm-dt);if(b.arm<=0)b.armCost=0;if(c==='rogue')G.hidden=true;}
    if(b.pow){b.pow.t-=dt;if(c==='rogue')G.hidden=true;if(b.pow.t<=0)endPower(b,true);}
    if(c==='mage'||c==='cleric'){b.tk-=dt;if(b.tk<=0){b.tk=c==='mage'?.12:.5;
      for(const e of G.enemies){if(e.dead||e.spawn>0)continue;const d=Math.hypot(e.x-b.x,e.y-b.y);
        if(c==='mage'){if(d<b.r+e.r+24&&!(e.wakeT>G.t)){e.wakeT=G.t+1;bolt(b,e);damageEnemy(e,m.pow*.35,false);}}
        else{const rad=spellOn('radiance');if((e.def.undead||rad)&&d<(rad?170:m.lantern?140:85))damageEnemy(e,m.pow*(m.smite?.4:.2)*(rad&&e.def.undead?spellVal('radiance','undead'):1),false);}}}}}
  for(const z of G.zones){z.t-=dt;z.tick-=dt;if(z.tick<=0){z.tick=.5;
    if(!z.fire&&!z.pyre)for(const e of G.enemies){if(e.dead||e.spawn>0||Math.hypot(e.x-z.x,e.y-z.y)>z.r+e.r)continue;e.atk+=.3;damageEnemy(e,m.pow*.4*(e.def.undead?2:1),false);}
    const bo=G.boss;if(!z.fire&&!z.pyre&&bo&&bo.alive&&bo.rise<=0&&bo.phase!=='shield'&&Math.hypot(bo.x-z.x,bo.y-z.y)<z.r+bo.r)hitBoss(bo,m.pow*.4,false);
    if(z.fire){if(G.balls.some(b=>b.st==='live'&&b.tier===tierOf(z.y)&&Math.hypot(b.x-z.x,b.y-z.y)<z.r+b.r)){hurt(2);G.curse.burn=Math.max(G.curse.burn||0,2);}}else if(z.pyre){for(const e of G.enemies){if(e.dead||e.spawn>0||Math.hypot(e.x-z.x,e.y-z.y)>z.r+e.r)continue;damageEnemy(e,m.pow*.45,false);}}else if(G.balls.some(b=>b.st==='live'&&Math.hypot(b.x-z.x,b.y-z.y)<z.r))heal(z.trail?spellVal('consecration','heal'):m.zoneHeal);}}
  if(G.zones.length&&G.zones.some(z=>z.t<=0))G.zones=G.zones.filter(z=>z.t>0);}

/* ---------- the Grave ---------- */
function graveHit(o){const r=G.run,g=r.grave;if(g.open||G.inGrave)return;g.hits=Math.min(g.need,g.hits+(r.cls==='cleric'?2:1));G.dirty=true;
  if(g.hits>=g.need){g.open=true;popup('The Grave Opens','Your next lost ball falls into it. Fight your way back out','good');A.s('summon');G.flash=.4;G.flashC='#7dffb0';}
  else if(g.hits%3===0||g.need-g.hits<=2)float(o.x,o.y-34,'GRAVE '+g.hits+'/'+g.need,'#9dffc8',12);}
function graveCatch(b){const r=G.run,g=r.grave,ok=!G.fallen&&G.tilt<=0; // an open Grave always takes the ball, tilted or fallen or not
  if(!g.open||heroBalls().length>1||G.plunge.auto>0||(ok&&(G.save>0||r.shield)))return false;
  g.open=false;g.used++;g.hits=0;g.need=8+4*g.used;G.inGrave=true;G.graveLive=false;G.graveT=22;G.graveBones=0;G.tilt=0;G.mb=null;G.nudges=[];
  if(G.fallen){G.fallen=false;r.hp=Math.round(G.mods.maxHp*.25);}
  T.banks.nails.segs.forEach(s=>{s.on=true;});T.banks.nails.reset=0;b.arm=0;b.pow=null;b.cr=0;
  b.tun=Object.assign(resample(catmull([[b.x,b.y],[b.x,GY-40],[T.graveIn.x,GY+150],[T.graveIn.x,T.graveIn.y]],12),6),{grave:true});b.st='tunnel';b.rs=0;b.vx=b.vy=0;
  popup('The Grave','Drive both coffin nails, then shoot the light before the lid closes','boss');A.s('boss');G.flash=.6;G.flashC='#0a2a14';relight();G.dirty=true;return true;}

/* ---------- campaign wings ----------
   Three rooms, one rule each. The Crypt: hit wall targets. The Den: win a fight. The Hoard: steer the ball over
   coins. Meeting the rule breaks the seal on the room's scoop; shooting the scoop wins the wing. A clock runs
   while you are inside; draining or running out of time carries the ball back to the Wilds, not out of play. */
const WINGS={
  crypt:{tier:4,name:'The Crypt',gate:'catacombs',out:'catacombs',time:80,col:'#d8f070',label:'SARCOPHAGUS',
    enter:'Light the four sigils to break the seal, then shoot the Sarcophagus',note:'The dead give you eighty seconds. Every sigil buys a little more.',
    sealed:()=>'Light the four sigils on the walls to break the seal',open:'The seal is broken. Shoot the Sarcophagus',broke:['The Seal Breaks','Shoot the Sarcophagus'],
    clock:'The crypt seals in ',late:['The Crypt Seals','The flippers go dead. The dead carry you out'],back:'The Catacombs stay open',won:'The Sarcophagus Opens'},
  den:{tier:5,name:'The Den',gate:'hut',out:'hut',time:80,need:3,col:'#cfe6ff',label:'THE LAIR',
    enter:'Slay three of the pack, then shoot the Lair',note:'Eighty seconds before the pack closes in. Every kill buys more.',
    sealed:n=>'Slay three of the pack ('+n+'/3)',open:'The pack is broken. Shoot the Lair',broke:['The Pack Breaks','Shoot the Lair'],
    clock:'The pack closes in ',late:['The Pack Closes In','The flippers go dead. You are dragged out'],back:'The hunting door stays open',won:'The Lair Is Yours'},
  hoard:{tier:6,name:'The Hoard',gate:'secret',out:'catacombs',time:80,need:6,col:'#ffb050',label:'THE VAULT',
    enter:'Roll the ball over six dragon coins, then shoot the Vault',note:'Eighty seconds before the wyrm stirs. Every coin buys more.',
    sealed:n=>'Roll over the dragon coins ('+n+'/6)',open:'The vault is unbarred. Shoot it',broke:['The Vault Unbars','Shoot the Vault'],
    clock:'The wyrm stirs in ',late:['The Wyrm Stirs','The flippers go dead. Run'],back:'The Sealed Door stays open',won:'The Vault Is Yours'}};
const WING_KEYS=['crypt','den','hoard'];
function wingOfTier(t){return t>=4?T.wings[WING_KEYS[t-4]]:null;}
function wingReady(gate){const w=G.run.wing,d=w&&WINGS[w.key];return !!(d&&w.open&&!w.done&&d.gate===gate&&heroBalls().length===1&&!G.balls.some(b=>b.party)&&!G.fallen&&!G.mb);}
function wingHoldsDoor(){const w=G.run&&G.run.wing;return !!(w&&w.key==='hoard'&&w.open&&!w.done);}
function wingText(){const tw=wingOfTier(G.focusTier),d=WINGS[tw.key];return tw.seal[0].on?d.sealed(G.run.wing.key===tw.key?G.run.wing.prog||0:0):d.open;}
function wingCoins(){const w=G.run.wing,tw=T.wings.hoard;G.pickups=G.pickups.filter(p=>!p.hoard);for(let i=w.prog||0;i<WINGS.hoard.need;i++){const c=tw.coins[i];G.pickups.push({x:c[0],y:c[1],tier:6,kind:'gold',hoard:true,quest:null,t:.3});}}
function enterWing(hd){const w=G.run.wing,d=WINGS[w.key],tw=T.wings[w.key];hd.plan='tunnel';hd.tun=T.tunnels['in_'+w.key];hd.delay=.7;w.visits=(w.visits||0)+1;G.wingT=d.time*G.mods.hour;G.wingUrns=0;
  if(w.key==='crypt'){w.prog=0;T.banks.sigils.segs.forEach(s=>s.lit=false);}
  tw.seal.forEach(s=>s.on=!(d.need&&(w.prog||0)>=d.need));if(w.key==='hoard')wingCoins();
  popup(d.name,d.enter,'boss',d.note);A.s('boss');G.flash=.5;G.flashC='#101010';}
function breakSeal(){const w=G.run.wing,d=WINGS[w.key],tw=T.wings[w.key];if(!tw.seal[0].on)return;tw.seal.forEach(s=>{s.on=false;s.flash=1;});popup(d.broke[0],d.broke[1],'good');A.s('slam');G.cam.shake=Math.max(G.cam.shake,10);relight();}
function wingProg(sec,x,y){const w=G.run.wing,d=WINGS[w.key];w.prog=(w.prog||0)+1;G.wingT+=sec;float(x,y-30,'+'+sec+'s',d.col,12);G.dirty=true;if(w.prog>=d.need)breakSeal();}
function leaveWing(tier){G.enemies.forEach(e=>{if(e.tier===tier&&!e.quest)e.dead=true;});G.pickups=G.pickups.filter(p=>!p.hoard);if(!G.fallen)G.tilt=0;
  const w=G.run.wing,d=w&&WINGS[w.key];if(d&&!w.done)popup('Back to the Wilds',d.back,'info');}
function wingDone(h){const r=G.run,w=r.wing,d=WINGS[w.key];w.done=true;score(100000,h.x,h.y,d.label);xp(40);gold(60,h.x,h.y);heal(25);const x=giveRelic();
  popup(d.won,x?'Relic claimed: '+x.name:'Grave-gold spills out','main',x?x.desc:'');A.s('victory');G.flash=.7;G.flashC=d.col;G.save=Math.max(G.save,6);
  G.enemies.forEach(e=>{if(e.tier===d.tier)e.dead=true;});G.pickups=G.pickups.filter(p=>!p.hoard);if(w.key==='hoard')openDoor(false);qEvent('done','wing');saveRun();}

/* ---------- table events ---------- */
function ev(type,o,b,imp){const r=G.run;if(!r)return;if(type==='sling')G.slingRun=(G.slingRun||0)+1;else if(type!=='wall'&&type!=='inlane'&&type!=='outlane')G.slingRun=0;
  switch(type){
  case 'wall':A.s('knock',imp);break;
  case 'flipHit':if(G.mods.ironFlip){for(const e of G.enemies)if(!e.dead&&e.spawn<=0&&e.tier===b.tier&&Math.hypot(e.x-b.x,e.y-b.y)<90)damageEnemy(e,G.mods.pow*G.mods.ironFlip,false);}if(b.arm>0&&b.armCost&&r.charge<b.armCost){b.arm=0;b.armCost=0;}if(b.arm>0){if(b.armCost){r.charge-=b.armCost;b.armCost=0;G.dirty=true;}b.arm=0;b.pow={t:r.cls==='knight'?3.5:3,hits:0};A.s('ability');burst(b.x,b.y,18,CLASSES[r.cls].glow,300,.6);float(b.x,b.y-30,CLASSES[r.cls].shot.toUpperCase(),CLASSES[r.cls].glow,15);}break;
  case 'sling':score(110);A.s('sling');charge(1,'hit');if(spellOn('judgement'))holyFire(b.x,b.y,b.tier);if(G.mods.bumpGold&&Math.random()<.3)gold(1,b.x,b.y);burst(b.x,b.y,4,'#ffd9a0',160,.5);break;
  case 'bump':{if(o.poss&&!o.poss.dead){A.s('clank');burst(o.x,o.y,5,'#9be8e0',160,.5);powerImpact(b,type);break;}score(o.bell?800:250);A.s(o.bell?'bell':'bump',o.tier);charge(1,'hit');shot(o.group,o.x,o.y);burst(o.x,o.y,6,o.bell?'#ffd070':'#bfe6ff',200,.5);
    if(o.ward){o.ward=false;wardHit(o);}
    if(o.group==='graves'){graveHit(o);G.graveStir=(G.graveStir||0)+1;if(G.graveStir%4===0&&!G.inGrave){const e=spawnEnemy('skeleton',2);if(e){float(o.x,o.y-44,'THE GRAVE STIRS','#9dffc8',12);waveJoin(e,2);}}}
    if(o.bell&&G.focusTier===0&&!(G.boss&&G.boss.alive)&&!((G.calls||{}).bell>G.t)){(G.calls||(G.calls={})).bell=G.t+6;startWave(0,'bell');}
    if(o.bell&&G.mods.bellHeal){heal(G.mods.bellHeal);G.buffs.hallow=Math.max(G.buffs.hallow||0,8);float(o.x,o.y-50,'WARDED','#ffe0a0',13);}else if(o.group==='bones'&&G.graveBones<4){G.graveBones++;G.graveT+=1;float(o.x,o.y-30,'+1s','#9dffc8',12);}
    else if(o.tier>=4){gold(1,o.x,o.y);if(G.wingUrns<6){G.wingUrns++;G.wingT+=1;float(o.x,o.y-30,'+1s',PAL[o.tier].glow,12);}}
    if(G.mods.bumpGold&&Math.random()<.35)gold(1,o.x,o.y);
    if(spellOn('judgement')||b.spell==='judgement')holyFire(o.x,o.y,o.tier);if(b.party==='healer')heal(2);
    if(G.mods.bumpDmg||(r.cls==='mage'&&(o.group==='stones'||G.mods.conduit||spellOn('blink')))){const n=G.mods.conduit&&o.group==='stones'?2:1,near=G.enemies.filter(e=>e.tier===o.tier&&e.spawn<=0&&!e.dead).sort((p,q)=>Math.hypot(p.x-o.x,p.y-o.y)-Math.hypot(q.x-o.x,q.y-o.y)).slice(0,n);for(const best of near){bolt(o,best);damageEnemy(best,G.mods.pow*.5,false);}}
    powerImpact(b,type);break;}
  case 'target':{if(o.bank==='sigils'&&!o.lit&&T.wings.crypt.seal[0].on){G.wingT+=6;float(b.x,b.y-26,'+6s','#d8f070',12);}o.lit=true;score(500,b.x,b.y);A.s('target');charge(1,'hit');shot(o.bank,b.x,b.y);if(spellOn('judgement'))holyFire(b.x,b.y,b.tier);const B=T.banks[o.bank];
    if(B.segs.every(s=>s.lit)){B.segs.forEach(s=>s.lit=false);done(o.bank,b.x,b.y);}powerImpact(b,type);break;}
  case 'drop':{score(750,b.x,b.y);A.s('drop');charge(1,'hit');shot(o.bank,b.x,b.y);const B=T.banks[o.bank];if(o.bank==='nails'){G.graveT+=3;float(b.x,b.y-26,'+3s','#9dffc8',12);}
    if((b.pow&&r.cls==='knight')||(o.bank==='door'&&r.cls==='rogue'))B.segs.forEach(s=>{if(s.on){s.on=false;s.flash=1;score(750);}});
    if(b.pow&&r.cls==='knight'&&(G.mods.jugger||spellVal('charge','all'))&&!G.inGrave)for(const id in T.banks){const O=T.banks[id];if(O===B||O.kind!=='drop'||O.tier!==B.tier||id==='door'||!O.segs.some(s=>s.on))continue;O.segs.forEach(s=>{if(s.on){s.on=false;s.flash=1;score(750);}});O.reset=1.4;done(id,b.x,b.y);}
    if(B.segs.every(s=>!s.on)){B.reset=1.4;done(o.bank,b.x,b.y);}powerImpact(b,type);break;}
  case 'lane':case 'inlane':case 'outlane':{score(type==='lane'?400:300);A.s('lane');charge(1,'lane');if(type!=='outlane'&&!b.party)spellProg('guard',1,o.x,o.y);if(G.mods.laneHeal)heal(G.mods.laneHeal);
    if(o.set){const S=T.sets[o.set];
      if(o.set==='candles'&&G.skill>=0){if(S.lanes[G.skill]===o){score(15000,o.x,o.y,'SKILL SHOT');xp(15);A.s('bank');}G.skill=-1;}
      o.lit=true;shot(o.set,o.x,o.y);if(S.lanes.every(l=>l.lit)){S.lanes.forEach(l=>l.lit=false);done(o.set,o.x,o.y);G.wave.t+=12;float(o.x,o.y+30,'THE WATCH HOLDS +12s','#9fe8ff',12);if(G.mods.laneKick&&!r.kickback){r.kickback=true;float(o.x,o.y+46,'KICKBACK LIT','#9fe8ff',12);relight();}}}
    if(G.mods.laneWard&&type!=='outlane')G.buffs.hallow=G.mods.laneWard;
    if(type==='outlane'&&G.mods.outSave&&!G.chanceUsed&&G.save<=0&&!r.shield&&G.balls.length===1){G.chanceUsed=true;G.save=3;float(o.x,o.y-30,'SECOND CHANCE','#9fe8ff',14);A.s('ward');}
    break;}
  case 'orbit':{const id='orbit'+(o.side<0?'L':'R')+o.tier,m=G.orbitMem;
    if(b.vy<-150){major(o.x,o.y);score(3000*comboF(),o.x,o.y);A.s('orbit');shot(id,o.x,o.y);r.stat.orbits++;if(!b.party)spellProg('pressure',10,o.x,o.y);m[o.tier]={side:o.side,t:G.t};}
    else if(b.vy>80){const p=m[o.tier];if(p&&p.side===-o.side&&G.t-p.t<4){score(6000,o.x,o.y,'FULL ORBIT');xp(4);m[o.tier]=null;jackpot(o.x,o.y);}}
    break;}
  case 'spin':score(150);A.s('spin');charge(1,'spin');shot(o.id,o.x,o.y);G.spinN=(G.spinN||0)+1;if(G.spinN%18===0)callFoes(o.tier,o.tier===1?['wolf','wolf']:campFoes(2),o.tier===1?'THE MILL CALLS THE PACK':'THE WIND CARRIES SOMETHING',o.x,o.y);if(!(b&&b.party))spellProg('pressure',1);break;
  case 'kick':if(r.kickback&&!G.fallen&&G.tilt<=0){r.kickback=false;G.kickT=30;b.x=41;b.vx=0;b.vy=-2050;A.s('kick');float(b.x+40,b.y-40,'KICKBACK','#9fe8ff',15);burst(b.x,b.y,14,'#9fe8ff',300,.6);relight();}break;
  case 'rampIn':A.s('rampIn');for(const e of G.enemies)if(e.job==='ritual'&&e.post&&e.post.rail===o.id)ritualBroken(e);break;
  case 'ramp':if(o.to===o.from&&!b.party)callFoes(o.to,campFoes(2),'SOMETHING FOLLOWED YOU ROUND',b.x,b.y);r.stat.ramps++;if(r.bb)r.bb.ramps++;if(!b.party)spellProg('striker',1,b.x,b.y);major(b.x,b.y);score(4000*comboF(),b.x,b.y);A.s('ramp');shot(o.id,b.x,b.y);if(G.mods.rampHeal)heal(G.mods.rampHeal);if(G.mods.rampCharge){r.charge=Math.min(100,r.charge+G.mods.rampCharge);score(G.mods.rampScore);}xp(2);jackpot(b.x,b.y);break;
  case 'rampFail':A.s('knock',260);break;
  case 'hole':handleHole(o,b);break;
  }}
function done(id,x,y){const r=G.run;major(x,y);score(8000*comboF(),x,y);A.s('bank');qEvent('done',id);xp(5);raiseParty(x,y);if(T.banks[id])spellProg('breaker',1,x,y);
  switch(id){
  case 'candles':r.mult=Math.min(6,r.mult+1);heal(r.cls==='cleric'?14:6);popup('Candles Lit','Multiplier '+r.mult+'x','good');break;
  case 'moon':G.buffs.moon=20;r.hutLit=true;popup('Moonlight','Double scoring for 20 seconds','good');break;
  case 'townGate':r.kickback=true;callFoes(2,campFoes(2),'THE GATE OPENS BOTH WAYS',x,y);heal(5);popup('Gate Watch Roused','Kickback lit','good');break;
  case 'smithy':G.buffs.sharp=30;r.kickback=true;popup('Sharpened','+25% damage for 30 seconds','good');break;
  case 'chapel':heal(r.cls==='cleric'?30:18);G.curse={};callFoes(2,['spirit','spirit'],'THE BELLS WAKE THE RESTLESS',x,y);popup('Blessed','Healed and cleansed','good');break;
  case 'camp':r.lockLit=true;callFoes(1,['goblin','goblin','goblin'],'THE CAMP EMPTIES',x,y);popup('Camp Razed','The Catacomb lock is lit','good');break;
  case 'door':G.doorT=22;popup('Door Broken','The Secret Passage is open','good');break;
  case 'nails':popup('The Lid Splits','Shoot the light','good');break;
  case 'sigils':if(G.run.wing.key==='crypt')breakSeal();break;
  case 'guard':r.guard=(r.guard||0)+1;callFoes(0,['knight'],'THE KING SENDS HIS CHAMPION',x,y);if(G.hoardDone){heal(6);gold(10,x,y);}else if(r.guard>=2){r.guard=0;r.hoardLit=true;popup('Guard Broken',"The King's hoard lies open in the Sanctum",'good');}else popup('Guard Reeling','Break the Royal Guard once more','good');break;
  case 'armory':G.buffs.aegis=30;callFoes(0,['revenant'],'THE ARMORY STIRS',x,y);popup('Armored','Half damage for 30 seconds','good');break;}
  relight();}
function openDoor(open){T.banks.door.segs.forEach(s=>s.on=!open);if(!open)G.doorT=0;relight();}
function handleHole(h,b){const r=G.run,hd=b.held;hd.plan='eject';hd.delay=1;A.s('hole');major(h.x,h.y);spellProg('guard',4,h.x,h.y);score(2500*comboF(),h.x,h.y);shot(h.id,h.x,h.y);
  switch(h.id){
  case 'tavern':{let got=false;if(r.side.length<2){newSide();got=true;}
    if(TAVERN_RECRUITS&&!G.demo&&tavernOpen()&&!G.pending.includes('tavern')){r.tavern=drawTavern(3);hd.plan='wait';G.pending.push('tavern');}else if(!got){float(h.x,h.y-36,r.recruits.length>=RECRUIT_MAX?'The Lantern: your band is full':'The Lantern: '+recruitCost()+' gold to hire','#ffd9a0',12);gold(5,h.x,h.y);}hd.delay=1.2;break;}
  case 'crypt':hd.plan='tunnel';hd.delay=.6;float(h.x,h.y-32,'CRYPT STAIR','#9dffc8',13);break;
  case 'oubliette':hd.plan='tunnel';hd.delay=.6;float(h.x,h.y-32,'DOWN THE OUBLIETTE','#ff9a7a',13);break;
  case 'rise':hd.plan='tunnel';hd.delay=.5;G.inGrave=false;G.graveLive=false;G.tilt=0;G.save=Math.max(G.save,6);score(50000,h.x,h.y,'RISEN');xp(20);popup('Risen','The grave gives you back','main');A.s('victory');G.flash=.8;G.flashC='#eaffd0';break;
  case 'secret':if(wingReady('secret')){enterWing(hd);break;}hd.plan='tunnel';hd.delay=.6;score(10000);if(!r.secret){r.secret=1;xp(12);popup('Secret Found','A hidden stair climbs into the Keep','good');}else float(h.x,h.y-32,'SECRET STAIR','#ffd24a',13);break;
  case 'catacombs':if(wingReady('catacombs'))enterWing(hd);else if(r.lockLit&&!G.mb&&!G.fallen)lockBall(b);else{gold(5,h.x,h.y);if(!G.enemies.some(e=>e.type==='revenant'&&e.tier===1))later(.9,()=>{const e=spawnEnemy('revenant',1);if(e){float(e.x,e.y-40,'SOMETHING FOLLOWED YOU OUT','#cfd8e0',12);waveJoin(e,1);}});}break;
  case 'sarc':case 'lair':case 'vault':hd.plan='tunnel';hd.delay=1.1;wingDone(h);break;
  case 'cryptIn':case 'denIn':case 'hoardIn':hd.delay=.5;break;
  case 'hut':{if(wingReady('hut')){enterWing(hd);break;}if(r.side.length<2&&Math.random()<.7)newSide();
    if(r.hutLit){r.hutLit=false;G.hutT=40;const f=pick([()=>{gold(30,h.x,h.y);return 'A purse of grave-silver';},()=>{heal(40);return 'A bitter draught. +40 health';},
      ()=>{r.charge=100;return 'Your power surges. Cradle the ball to release it';},()=>{r.lockLit=true;return 'The Catacomb lock is lit';},
      ()=>{r.mult=Math.min(6,r.mult+1);return 'Multiplier '+r.mult+'x';},()=>{G.buffs.moon=20;return 'Moonlight. Double scoring';}]);popup("Witch's Boon",f(),'good');}
    hd.delay=1.2;break;}
  case 'sanctum':if(r.hoardLit){r.hoardLit=false;G.hoardDone=true;hd.delay=1.5;startMultiball("King's Hoard",1,'sanctum');for(let i=0;i<8;i++)later(.3+i*.25,()=>spawnPickup(0,'gold'));gold(40,h.x,h.y);}else gold(8,h.x,h.y);break;}
  relight();}
function lockBall(b){const r=G.run;r.locks++;
  if(r.locks>=2){r.locks=0;if(!G.mods.lockKeep)r.lockLit=false;b.held.delay=2.4;startMultiball('Restless Dead',2,'catacombs');}
  else{popup('Ball Locked','One more for multiball','mb');A.s('lock');G.balls=G.balls.filter(x=>x!==b);if(!G.balls.length)later(1,()=>{if(G.run===r&&!G.balls.length&&!G.sub)serve();});}}
function startMultiball(name,add,from){if(!G.mb)G.mb={name,jackpot:40000};popup(name+' Multiball','Ramps and orbits score jackpots','mb');A.s('multiball');G.save=Math.max(G.save,8);G.flash=.5;G.flashC='#ffd24a';
  for(let i=0;i<add;i++)later(.7+i*.8,()=>addBall(from));relight();}
function addBall(from){if(G.balls.length>=5||G.sub||!G.run)return;
  if(from==='shooter'){G.balls.push(newBall(T.shooter.x,T.shooter.y-6,0,-2280));A.s('launch');return;}
  const h=T.holes[from],b=newBall(h.x,h.y+h.r+2,h.ev[0]*rand(.85,1.15),h.ev[1]);b.noHole=.8;G.balls.push(b);h.glow=1;A.s('eject');}

/* ---------- enemies ---------- */
/* ---------- foes: every one has a job on the table ----------
   swarm: rises at the top and shambles down to the slingshot line, then strikes. thief: hops after loose loot or your purse and runs for an outlane with it.
   hunter: prowls a lane and lunges at the ball, batting it toward the outlanes. possess: sits on a bumper and deadens it until you shoot it through.
   ritual: chants at a ramp mouth; the ramp breaks the ritual. wall: holds an orbit entrance; weak hits bounce off. duel: guards the statue; weak hits are parried
   and answered. gate: holds a scoop and punts the ball; a hard hit staggers it. */
function foePosts(tier){const P=T.posts||(T.posts={});if(P[tier])return P[tier];const y=TY[tier],main=tier<3,cx=tier===2?303:320,near=(l,x,yy)=>l.reduce((a,q)=>!a||Math.hypot(q.x-x,q.y-yy)<Math.hypot(a.x-x,a.y-yy)?q:a,null);
  const o={cx,line:main?y+690:y+430,
    rise:main?[[cx-120,y+400],[cx,y+392],[cx+120,y+400],[cx-60,y+372],[cx+60,y+372]]:T.spawn[tier].map(q=>q.slice()),
    mouths:T.mouths.filter(m=>tierOf(m.y)===tier).map(m=>({x:m.x-m.dx*30,y:m.y-m.dy*30,rail:m.rail})),
    orbits:T.sens.filter(q=>q.kind==='orbit'&&q.tier===tier).map(q=>({x:q.x+(q.x<cx?36:-36),y:q.y+170})), // in front of the lane, never inside it: a ball coming down the orbit must be able to get past
    outs:T.sens.filter(q=>q.kind==='outlane'&&q.tier===tier).map(q=>({x:q.x,y:q.y-34})),
    holes:Object.values(T.holes).filter(h=>h.tier===tier&&h.id!=='rise').map(h=>({x:h.x,y:h.y+36,id:h.id})),
    bumps:T.bumps.filter(b=>b.tier===tier&&!b.bell),near};
  return P[tier]=o;}
function stepTo(e,x,y,max){const dx=x-e.x,dy=y-e.y,l=Math.hypot(dx,dy);return l<=max?[x,y]:[e.x+dx/l*max,e.y+dy/l*max];}
function spawnEnemy(type,tier,quest,minion){const def=ENEMY[type],r=G.run,P=foePosts(tier),taken=(x,y,d)=>G.enemies.some(e=>!e.dead&&Math.hypot(e.ax-x,e.ay-y)<(d||50)),free=l=>shuffle(l).find(q=>!taken(q.x,q.y,40));
  let p=null,post=null;
  if(def.job==='swarm'){const c=shuffle(P.rise).find(q=>!taken(q[0],q[1],34));if(c)p=c;}
  else if(def.job==='possess'){const b=shuffle(P.bumps).find(b=>!b.poss||b.poss.dead);if(b)post={kind:'bump',b};}
  else if(def.job==='ritual'){const m=free(P.mouths);if(m)post={kind:'mouth',x:m.x,y:m.y,rail:m.rail};}
  else if(def.job==='wall'){const m=free(P.orbits);if(m)post={kind:'orbit',x:m.x,y:m.y};}
  else if(def.job==='duel'){const st=G.statues.find(q=>q.tier===tier),bo=G.boss&&G.boss.alive&&G.boss.tier===tier?G.boss:null,q=bo?{x:bo.x,y:bo.y+bo.r+34}:st?{x:st.x,y:st.y+st.r+30}:null;if(q&&!taken(q.x,q.y,30))post={kind:'guard',x:q.x,y:q.y};}
  else if(def.job==='gate'){const h=free(P.holes);if(h)post={kind:'hole',x:h.x,y:h.y,id:h.id};}
  if(!p&&post&&post.kind!=='bump')p=[post.x,post.y];
  const bz=G.boss&&G.boss.alive&&G.boss.tier===tier?G.boss:null;if(p&&bz&&Math.hypot(p[0]-bz.x,p[1]-bz.y)<bz.r+34)p=null;
  if(!p)for(const c of shuffle(T.spawn[tier])){if(taken(c[0],c[1],50))continue;if(bz&&Math.hypot(c[0]-bz.x,c[1]-bz.y)<bz.r+40)continue;if(G.pickups.some(q=>Math.hypot(q.x-c[0],q.y-c[1])<40))continue;if(G.balls.some(b=>b.st==='live'&&Math.hypot(b.x-c[0],b.y-c[1])<70))continue;p=c;break;}
  if(!p)return null;const th=1+.4*(r.threat-1);
  const e={type,def,job:def.job,tier,x:p[0],y:p[1],ax:p[0],ay:p[1],r:def.r,hr:def.r,hp:def.hp*th,maxHp:def.hp*th,armor:def.armor||0,spawn:.7,hitCd:0,wind:0,stun:0,ripCd:0,
    castT:def.cast?def.cast+rand(2):0,atk:rand(def.rate?def.rate[0]:9,def.rate?def.rate[1]:14),t:rand(9),flash:0,quest:quest||null,minion:!!minion,hopT:rand(2,3.5),hop:1,post,state:post&&post.kind==='bump'?'drift':'idle',goal:null,want:null,loot:null,lunge:0,lungeCd:rand(2,4),dead:false};
  if(def.prowl)e.ax=clamp(p[0],P.cx-110,P.cx+110);
  G.enemies.push(e);burst(e.x,e.y,8,'#7dffb0',120,.8);return e;}
function foeEscape(e){e.dead=true;float(e.x,e.y-30,'GOT AWAY'+(e.loot&&e.loot.gold?' WITH '+e.loot.gold+' GOLD':''),'#ffd24a',13);A.s('deny');burst(e.x,e.y,8,'#6f9a4a',120,.6);if(G.boss&&e.minion)G.boss.minions--;}
function foeStrike(e,fb){const d=e.def,r=G.run,th=1+.4*(r.threat-1);
  if(e.tgt&&e.tgt.hp>0){guardStruck(e.tgt,d.dmg*th,e);burst(e.x,e.y+20,8,'#ff5a5a',200,.5);return;}if(!fb)return;
  if(spellOn('smoke')||spellOn('cloak')){float(fb.x,fb.y-26,'LOST IN THE SMOKE','#b08cff',12);return;}
  if(spellOn('shieldWall')){const k=spellVal('shieldWall','ref'),st=spellVal('shieldWall','stun');bolt(fb,e);float(fb.x,fb.y-26,'BLOCKED','#8fb0d8',13);A.s('clank');if(st){e.wind=0;e.stun=Math.max(e.stun,st);}damageEnemy(e,d.dmg*th*k,false);return;}
  {const cb=spellCast('barrier');if(cb&&e.job!=='thief'){cb.hits--;float(fb.x,fb.y-26,cb.hits>0?'ABSORBED ('+cb.hits+')':'BARRIER BREAKS','#9fe8ff',13);A.s('ward');if(cb.hits<=0){cb.broke=true;const k=spellVal('barrier','boom');for(const q of G.enemies){if(q.dead||q.spawn>0||q.tier!==fb.tier||Math.hypot(q.x-fb.x,q.y-fb.y)>150+q.r)continue;q.wind=0;q.stun=Math.max(q.stun,1);damageEnemy(q,G.mods.pow*2*k,false);}G.booms.push({x:fb.x,y:fb.y,r:150,t:0,c:'#9fe8ff'});endCast(cb);}return;}}
  {const t=interceptor();if(t&&e.job!=='thief'){t.ready=12;guardStruck(t,d.dmg*th*.7,e);float(fb.x,fb.y-26,'INTERCEPTED','#8fb0d8',13);A.s('clank');return;}}
  if(G.zones.some(z=>!z.fire&&!z.pyre&&Math.hypot(fb.x-z.x,fb.y-z.y)<z.r+fb.r)||G.buffs.hallow>0||(G.mods.phaseWard&&G.phase>0)){float(fb.x,fb.y-26,'WARDED','#ffe0a0',13);A.s('ward');return;}
  bolt(e,fb);burst(fb.x,fb.y,8,'#ff5a5a',200,.5);
  if(e.job==='thief'){const n=Math.min(r.gold,4+r.level*2);if(n>0){r.gold-=n;e.loot={kind:'gold',gold:n};e.hopT=0;float(e.x,e.y-36,'-'+n+' GOLD STOLEN','#ffd24a',13);A.s('deny');G.dirty=true;return;}}
  hurt(d.dmg*th);float(e.x,e.y-36,d.name.toUpperCase()+' STRIKES','#ff8a8a',12);}
function ritualBroken(e){if(e.dead||e.spawn>0)return;e.castT=e.def.cast+1;e.stun=Math.max(e.stun,3);float(e.x,e.y-40,'RITUAL BROKEN','#9fe8ff',14);A.s('interrupt');score(3000,e.x,e.y);charge(2,'hit');damageEnemy(e,G.mods.pow*1.5,false);}
function updateEnemies(dt){const fb=focusBall(),live=G.balls.filter(b=>b.st==='live'),act=G.balls.length&&!G.fallen&&!G.hidden&&!G.inGrave,r=G.run,th=1+.4*(r.threat-1);
  for(const e of G.enemies){if(e.dead)continue;e.t+=dt;if(e.spawn>0){e.spawn-=dt;continue;}if(e.hitCd>0)e.hitCd-=dt;if(e.ripCd>0)e.ripCd-=dt;if(e.flash>0)e.flash-=dt*4;if(e.stun>0){e.stun-=dt;e.wind=0;}
    const d=e.def,P=foePosts(e.tier),onT=act&&e.tier===G.focusTier;e.moving=false;
    if(e.marked>0)e.marked-=dt;if(e.poison>0){e.poison-=dt;e.dot=(e.dot||0)+dt;if(e.dot>=1){e.dot=0;damageEnemy(e,G.mods.pow*.35,false);if(e.dead)continue;}}
    if(G.mods.toll&&e.job==='swarm'&&e.state==='hold'&&onT){e.tollT=(e.tollT||0)+dt;if(e.tollT>=1){e.tollT=0;damageEnemy(e,G.mods.pow*G.mods.toll,false);if(e.dead)continue;}}
    if(e.stun<=0)switch(e.job){
    case 'swarm':{if(spellOn('smoke')&&spellVal('smoke','lost')){e.state='hold';break;}const gs=liveGuards(e.tier);let g=null,gd=1e9;for(const q of gs){const dd=Math.hypot(q.p.x-e.x,q.p.y-e.y);if(dd<gd){gd=dd;g=q;}}e.tgt=g?g.c:null;
      const tx=g?g.p.x:e.ax,ty=g?g.p.y-g.p.r-e.r-4:P.line,sp=d.speed*(1+.15*(r.threat-1));
      if(e.y<ty-2||(g&&Math.abs(e.x-tx)>3)){e.y=Math.min(ty,e.y+sp*dt);e.x+=clamp(tx-e.x,-sp*dt,sp*dt);e.moving=true;e.state='walk';}else e.state='hold';break;}
    case 'hunter':{if(e.lunge>0){e.lunge-=dt;const k=1-Math.max(0,e.lunge)/.4,hb=live.find(b=>b.tier===e.tier&&Math.hypot(b.x-e.tx,b.y-e.ty)<160);if(hb){e.tx=clamp(hb.x,40,600);e.ty=clamp(hb.y,TY[e.tier]+300,P.line+60);}e.x=lerp(e.lx,e.tx,k);e.y=lerp(e.ly,e.ty,k);e.moving=true;e.state='lunge';
        const bite=live.find(b=>b.tier===e.tier&&Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r+(e.lunge<=0?30:6));
        if(e.lunge<=0||bite){e.lunge=0;e.lungeCd=e.frenzy?rand(1.5,2.5):rand(5,7);e.state='prowl';e.ax=clamp(e.x-Math.sin(e.t*.9)*88,P.cx-110,P.cx+110);e.ay=clamp(e.y-Math.sin(e.t*1.9)*12,TY[e.tier]+330,P.line);
          for(const b of live){if(b!==bite)continue;const o=P.near(P.outs,b.x,b.y),sx=o?(Math.sign(o.x-b.x)||1):(b.x<P.cx?-1:1);
            b.vx=sx*rand(230,310);b.vy=Math.max(b.vy,0)+rand(170,250);burst(b.x,b.y,10,'#ff5a5a',220,.5);hurt(d.dmg*th);float(e.x,e.y-36,'BATTED','#ff8a8a',13);break;}}}
      else{e.lungeCd-=dt;e.x=e.ax+Math.sin(e.t*.9)*88;e.y=e.ay+Math.sin(e.t*1.9)*12;e.state='prowl';e.moving=true;
        if(onT&&e.lungeCd<=0){const b=live.find(b=>b.tier===e.tier&&Math.hypot(b.x-e.x,b.y-e.y)<(e.frenzy?270:150));if(b){e.lunge=.4;e.lx=e.x;e.ly=e.y;e.tx=clamp(b.x+b.vx*.22,40,600);e.ty=clamp(b.y+b.vy*.22,TY[e.tier]+300,P.line+40);float(e.x,e.y-34,'LUNGE','#ff8a8a',12);A.s('kick');}}}break;}
    case 'thief':{if(e.hop<1){e.hop=Math.min(1,e.hop+dt*3.5);e.x=lerp(e.fx,e.ax,e.hop);e.y=lerp(e.fy,e.ay,e.hop)-Math.sin(e.hop*PI)*18;e.moving=true;e.state='hop';
        if(e.hop>=1){if(e.goal==='loot'){const q=e.want;if(q&&G.pickups.includes(q)&&Math.hypot(q.x-e.x,q.y-e.y)<30){G.pickups=G.pickups.filter(x=>x!==q);e.loot={kind:q.kind,gold:0};float(e.x,e.y-34,'SNATCHED','#ffd24a',13);A.s('pickup');}e.goal=null;}
          else if(e.goal==='flee'){const o=e.want;if(o&&Math.hypot(o.x-e.x,o.y-e.y)<30)foeEscape(e);}}}
      else{e.hopT-=dt;e.state='idle';if(e.hopT<=0){let c=null;
          if(e.loot){e.goal='flee';e.hopT=rand(.6,1);const o=P.near(P.outs,e.x,e.y);if(o){e.want=o;c=stepTo(e,o.x,o.y,110);}}
          else{const q=G.pickups.filter(q=>q.tier===e.tier&&!q.quest&&!q.hoard&&q.t>.5).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
            if(q){e.goal='loot';e.want=q;e.hopT=rand(.6,1);c=stepTo(e,q.x,q.y,110);}else{e.goal=null;e.hopT=rand(2.4,3.6);const q2=pick(T.spawn[e.tier]);if(!G.enemies.some(o=>o!==e&&!o.dead&&Math.hypot(o.ax-q2[0],o.ay-q2[1])<50))c=q2;}}
          if(c){e.fx=e.x;e.fy=e.y;e.ax=c[0];e.ay=c[1];e.hop=0;}}}break;}
    case 'possess':{const b=e.post&&e.post.b;if(b&&(!b.poss||b.poss===e)){if(e.state!=='sit'){const dx=b.x-e.x,dy=b.y-e.y,l=Math.hypot(dx,dy);if(l<3){e.state='sit';b.poss=e;e.ax=b.x;e.ay=b.y;e.hr=b.r+13;float(b.x,b.y-30,'POSSESSED','#9be8e0',12);}else{const sp=Math.min(l,70*dt);e.x+=dx/l*sp;e.y+=dy/l*sp;e.moving=true;e.state='drift';}}
        else{e.x=b.x+Math.sin(e.t*2)*3;e.y=b.y+Math.cos(e.t*1.6)*3;}}
      else{e.x=e.ax+Math.sin(e.t*.7)*44;e.y=e.ay+Math.cos(e.t*.5)*28;e.state='float';}break;}
    case 'gate':e.x=e.ax+Math.sin(e.t*.5)*(e.post?8:30);e.state='hold';break;
    case 'ritual':e.state=e.castT<d.cast*.85?'chant':'hold';break;
    default:e.state='hold';}
    // the wind-up: a strike you can see coming, and stop
    const busy=e.state==='walk'||e.state==='hop'||e.state==='drift'||e.state==='lunge'||(e.job==='thief'&&e.loot);
    if(d.wind&&onT&&e.stun<=0&&!busy){if(e.wind>0){e.wind-=dt*((G.mods.lantern&&r.cls==='cleric'||spellOn('warcry'))&&fb&&Math.hypot(fb.x-e.x,fb.y-e.y)<170?.55:1);if(e.wind<=0)foeStrike(e,fb);}else{e.atk-=dt;if(e.atk<=0){e.atk=rand(d.rate[0],d.rate[1]);e.wind=d.wind;A.s('clank');}}}
    else if(e.wind>0)e.wind=0;
    if(d.cast&&onT&&e.stun<=0){e.castT-=dt;if(e.castT<=0){e.castT=d.cast;bolt(e,fb);hurt(10*th);G.curse[pick(['dark','weak','hex'])]=10;float(e.x,e.y-34,'CURSED','#c08cff',13);A.s('curse');}}}
  if(G.enemies.some(e=>e.dead)){for(const e of G.enemies)if(e.dead){if(e.post&&e.post.b&&e.post.b.poss===e)e.post.b.poss=null;if(e.wave&&!e.wc){e.wc=1;e.wave.left--;}}G.enemies=G.enemies.filter(e=>!e.dead);}
  for(const q of G.statues){if(q.flash>0)q.flash-=dt*4;if(q.cool>0)q.cool-=dt;}}
function damageEnemy(e,dmg,crit){if(e.dead||e.spawn>0)return false;e.hp-=dmg;e.flash=1;float(e.x,e.y-e.r-6,(crit?'CRIT ':'')+Math.round(dmg),crit?'#ffb040':'#ffffff',crit?15:12);
  if(e.hp<=0){killEnemy(e);return true;}return false;}
function strikeEnemy(e,b,imp,sure){const r=G.run,m=G.mods,pw=b&&b.pow?r.cls:null,th=1+.4*(r.threat-1);
  if(e.job==='duel'&&!pw&&e.stun<=0&&imp<430&&!sure){A.s('clank');float(e.x,e.y-26,'PARRIED','#cfd8e0',12);if(b){b.vx*=1.35;b.vy*=1.35;}if(e.ripCd<=0&&e.tier===G.focusTier){e.ripCd=1.5;hurt(6*th);float(e.x,e.y-42,'RIPOSTE','#ff8a8a',13);}return false;}
  if(e.wind>0){e.wind=0;e.stun=Math.max(e.stun,1.2);float(e.x,e.y-40,'STAGGERED','#9fe8ff',13);score(500);charge(1,'hit');}
  else if(e.job==='gate'&&imp>700&&e.stun<=0){e.stun=4;float(e.x,e.y-40,'STAGGERED','#9fe8ff',14);A.s('slam');}
  if(pw){e.armor=0;if(pw==='mage'){endPower(b);explode(e.x,e.y);if(e.dead)return true;}else if(pw==='cleric'){endPower(b);consecrate(e.x,e.y);}}
  if(e.armor>0){if(m.pierce){e.armor=0;float(e.x,e.y-26,'ARMOR SHATTERED','#cfd8e0',12);}
    else if(imp>500){e.armor--;e.flash=1;A.s('clank');float(e.x,e.y-26,e.armor?'ARMOR CRACKED':'ARMOR BROKEN','#cfd8e0',12);burst(e.x,e.y,6,'#cfd8e0',200,.5);charge(1,'hit');return false;}
    else{A.s('clank');float(e.x,e.y-26,'CLANG','#8a96a3',11);return false;}}
  const crit=sure||pw==='rogue'||G.buffs.stealth>0||e.marked>0||b&&(b.party==='dps'||b.spell==='markedPrey')||spellOn('markedPrey')||(sure&&spellVal('cloak','crit')>0)||Math.random()<m.crit+spellVal('smoke','crit')||(r.cls==='rogue'&&G.combo>1&&G.comboT>0);
  if(sure&&spellOn('cloak')&&spellVal('cloak','gold'))gold(spellVal('cloak','gold'),e.x,e.y);
  if(b&&(b.spell==='warcry'||b.spell==='shieldWall')){e.wind=0;e.stun=Math.max(e.stun,.8);}
  if(spellOn('warcry')){e.wind=0;e.stun=Math.max(e.stun,spellVal('warcry','stun'));const ck=spellVal('warcry','crack');if(ck&&e.armor>0){e.armor=Math.max(0,e.armor-ck);float(e.x,e.y-26,'ARMOR CRACKED','#cfd8e0',12);}}
  if(spellOn('markedPrey'))e.marked=Math.max(e.marked||0,spellVal('markedPrey','mark'));
  if(spellOn('radiance')){heal(3);if(spellVal('radiance','cleanse'))for(const k in G.curse)if(G.curse[k]>0){G.curse[k]=0;break;}}
  let dmg=m.pow*clamp(imp/800,.55,1.6);if(e.def.undead&&r.cls==='cleric')dmg*=m.smite?2:1.5;if(sure&&m.cutpurse){gold(m.cutpurse,e.x,e.y);}if(m.stagger&&r.cls==='knight'){e.wind=0;e.stun=Math.max(e.stun,.8);}
  if(pw==='knight'){dmg*=2.5;if(++b.pow.hits>=4)endPower(b);const tr=spellVal('charge','stun');if(tr){e.wind=0;e.stun=Math.max(e.stun,tr);}}else if(pw==='rogue'){dmg*=1.5;G.buffs.stealth=Math.max(G.buffs.stealth||0,.1);endPower(b);float(e.x,e.y-44,'BACKSTAB','#c9a6ff',14);if(m.marked)e.marked=m.marked;}if(G.buffs.sharp>0)dmg*=1.25;
  if(e.def.cast&&e.castT<e.def.cast*.6){e.castT=e.def.cast+1;float(e.x,e.y-40,'SPELL INTERRUPTED','#9fe8ff',13);A.s('interrupt');if(r.cls==='mage')dmg*=3;score(2000);}
  if(crit)dmg*=2;if(e.stun>0)dmg*=1.5;A.s('hit');charge(1,'hit');score(300);if(e.atk<3.5)e.atk=3.5;if(crit){if(m.critCharge)r.charge=Math.min(100,r.charge+m.critCharge);if(m.poison)e.poison=m.poison;}return damageEnemy(e,dmg,crit);}
function killEnemy(e){const r=G.run;e.dead=true;r.kills++;if(r.bb)r.bb.kills++;if(e.marked>0&&spellOn('markedPrey')&&spellVal('markedPrey','refund'))r.charge=Math.min(100,r.charge+spellVal('markedPrey','refund'));if(G.mods.deathWish)r.charge=Math.min(100,r.charge+G.mods.deathWish);if(e.loot){if(e.loot.gold){r.gold+=e.loot.gold;float(e.x,e.y-48,'+'+e.loot.gold+' GOLD RECOVERED','#ffd24a',13);}else G.pickups.push({x:e.x,y:e.y,tier:e.tier,kind:e.loot.kind,t:0,quest:null});}if(e.post&&e.post.b&&e.post.b.poss===e)e.post.b.poss=null;score(1000*r.level,e.x,e.y);xp(e.def.xp);gold(e.def.gold*(1+G.mods.killGold),e.x,e.y);if(G.mods.healKill)heal(G.mods.healKill);
  charge(1,'kill');A.s('kill');burst(e.x,e.y,16,e.def.undead?'#9dffc8':'#ff8a6a',260,.9);if(G.boss&&e.minion)G.boss.minions--;
  if(Math.random()<.12)later(.05,()=>{G.pickups.push({x:e.x,y:e.y,tier:e.tier,kind:'heart',t:0,quest:null});});
  if(e.pack&&r.wing.key==='den'&&!r.wing.done&&T.wings.den.seal[0].on)wingProg(8,e.x,e.y);
  G.qxy={x:e.x,y:e.y};qEvent('kill',e.type,e.tier);G.qxy=null;}
/* ---------- waves: foes come together, and the night goes quiet after ----------
   A wave is drawn from the campaign's foes on a budget that grows with level and threat. Shots call waves early
   (the bell), add to them (the gravestones) or hold them off (lighting the lanes). Clearing one pays a bounty. */
const WAVE_COST={skeleton:1,goblin:1,spirit:1,wolf:1.5,cultist:2,revenant:2.5,knight:3.5,troll:5};
const WAVE_NAME={necro:['The Choir Stirs','The dead claw up through the floor'],beast:['The Pack Hunts','Howls from every shadow'],dragon:['Cultists Gather','Ash on the wind. They come for the ball']};
const waveGap=()=>Math.max(14,30-G.run.level*1.5-(G.run.threat-1)*4);
const FOE_CAP=22,TIER_CAP=10,foesOn=t=>G.enemies.filter(e=>!e.dead&&e.tier===t).length;
function startWave(tier,why){const r=G.run,W=G.wave,camp=CAMPAIGNS[r.arcs[r.arcs.length-1]];if(tier>=3||G.enemies.length>=FOE_CAP||foesOn(tier)>=TIER_CAP)return false;
  let budget=3+r.level*.6+(r.threat-1)*2+(why==='bell'?2:0);const foes=camp.foes,list=[],cheapest=foes.reduce((a,b)=>WAVE_COST[b]<WAVE_COST[a]?b:a);
  while(budget>0&&list.length<7){let ty=pick(foes);if(WAVE_COST[ty]>budget)ty=cheapest;if(WAVE_COST[ty]>budget)break;budget-=WAVE_COST[ty];list.push(ty);
    if(ENEMY[ty].job==='swarm')for(let k=0;k<2&&list.length<7;k++){list.push(ty);budget-=WAVE_COST[ty]*.5;}}
  if(!list.length)return false;return launchWave(tier,list,why,camp);}
// put a list of foes on a level as one wave; waves overlap freely, each pays its own bounty when cleared
function launchWave(tier,list,why,camp,quiet){const W=G.wave;W.n++;const wv={tier,n:W.n,left:list.length,total:list.length};(W.list||(W.list=[])).push(wv);W.active=wv;
  list.forEach((ty,i)=>later(.3+i*.45,()=>{if(!W.list.includes(wv))return;const e=G.enemies.length<FOE_CAP?spawnEnemy(ty,tier):null;if(e)e.wave=wv;else wv.left--;}));
  if(quiet)return true;
  const nm=why==='bell'?['The Bell Tolls','Every ear in the dark heard that']:WAVE_NAME[camp.key]||['They Come',''];
  popup(nm[0],nm[1],'bad',list.length+' foes');A.s('summon');G.cam.shake=Math.max(G.cam.shake,6);G.dirty=true;return true;}
function waveJoin(e,tier){const L=G.wave.list||[];let wv=null;for(let i=L.length-1;i>=0;i--)if(L[i].tier===tier){wv=L[i];break;}if(e&&wv){e.wave=wv;wv.left++;wv.total++;}}
// a shot on the table calls foes onto its level: a small wave of its own
function callFoes(tier,types,text,x,y){if(G.demo||tier>=3||G.inGrave||G.enemies.length>=FOE_CAP||foesOn(tier)>=TIER_CAP)return false;const k='call'+tier+text;if((G.calls||(G.calls={}))[k]>G.t)return false;G.calls[k]=G.t+8;
  launchWave(tier,types.slice(),'call',null,true);if(x!==undefined)float(x,y-44,text,'#ff9a7a',13);A.s('summon');G.dirty=true;return true;}
function campFoes(n){const r=G.run,c=CAMPAIGNS[r.arcs[r.arcs.length-1]],o=[];for(let i=0;i<n;i++)o.push(pick(c.foes));return o;}
function waveTick(){const r=G.run,W=G.wave,tier=G.focusTier,L=W.list||(W.list=[]);
  for(const wv of L.slice())if(wv.left<=0){W.list=L.filter(x=>x!==wv);const g=8+3*wv.total;popup('Wave Cleared','+'+g+' gold','good');gold(g);score(4000*wv.total*r.level);charge(3,'kill');A.s('questDone');G.dirty=true;L.splice(L.indexOf(wv),1);}
  W.active=L.length?L[L.length-1]:null;
  // the next wave comes on a clock that runs on the ball's level, three times as fast while the level is empty
  if(tier>=3||(G.boss&&G.boss.alive&&G.boss.tier===tier))return;W.t-=.6*(foesOn(tier)?1:3);if(W.t<=0){W.t=waveGap();startWave(tier,'time');}}
function manageSpawns(){const r=G.run;if(!G.balls.length||G.sub||G.fallen||G.inGrave)return;
  if(G.focusTier===5){const need=WINGS.den.need-(r.wing.key==='den'?r.wing.prog||0:0);if(T.wings.den.seal[0].on&&G.enemies.filter(e=>e.pack&&!e.dead).length<Math.min(2,need)){const e=spawnEnemy('wolf',5);if(e)e.pack=true;}return;}
  for(const q of quests()){const o=qCur(q);if(!o||o.t!=='kill')continue;const alive=G.enemies.filter(e=>e.type===o.e&&e.tier===o.tier).length,want=Math.min(3,o.n-q.prog);
    if(alive<want){spawnEnemy(o.e,o.tier,q);break;}}
  waveTick();}
function spawnPickup(tier,kind,quest){let p=null;for(const c of shuffle(T.spawn[tier])){if(G.enemies.some(e=>Math.hypot(e.ax-c[0],e.ay-c[1])<40))continue;if(G.pickups.some(e=>Math.hypot(e.x-c[0],e.y-c[1])<30))continue;p=c;break;}
  if(!p)p=pick(T.spawn[tier]);G.pickups.push({x:p[0]+rand(-8,8),y:p[1]+rand(-8,8),tier,kind,quest:quest||null,t:0});}
function updatePickups(dt){let hit=false;for(const p of G.pickups){p.t+=dt;if(p.t<.3)continue;if(!p.quest&&!p.hoard&&p.t>20){p.gone=true;hit=true;continue;}
  for(const b of G.balls){if(b.st!=='live')continue;const dx=b.x-p.x,dy=b.y-p.y;if(dx*dx+dy*dy<28*28){p.gone=true;hit=true;A.s('pickup');burst(p.x,p.y,10,'#ffd24a',180,.6);
    if(p.hoard){gold(12,p.x,p.y);score(3000,p.x,p.y);wingProg(5,p.x,p.y);}else if(p.quest){score(5000,p.x,p.y);qEvent('collect',p.quest);}else if(p.kind==='gold'){gold(8,p.x,p.y);score(1000);}else{heal(8);float(p.x,p.y-16,'+8 health','#ff8aa0',12);}break;}}}
  if(hit)G.pickups=G.pickups.filter(p=>!p.gone);}

/* ---------- bosses ---------- */
/* The circle: every level's resident is there from ball 1. Its runes fill as the main quest closes in on its step;
   when that step comes up the boss rises. Returns {key, fill 0-1, state: 'dormant'|'awake'|'dead'} or null. */
function wakeInfo(tier){const r=G.run,q=r&&r.main;if(!q)return null;const st=q.steps;let pb=-1,bi=-1;
  for(let i=0;i<st.length;i++)if(st[i].t==='boss'){if(BOSSES[st[i].boss].tier===tier){bi=i;break;}pb=i;}
  if(bi<0)return null;const key=st[bi].boss;if(q.si>bi)return {key,fill:1,state:'dead'};const bo=G.boss;
  if(q.si===bi)return {key,fill:1,state:bo&&bo.alive&&bo.key===key?'awake':'dead'};
  const span=bi-pb-1,o=qCur(q),done=q.si-pb-1+(o&&o.n?Math.min(q.prog,o.n)/o.n:0);return {key,fill:span>0?clamp(done/span,0,1):0,state:'dormant'};}
function wakeBoss(key){const d=BOSSES[key],r=G.run,sp=T.bossSpot[d.tier],th=1+.4*(r.threat-1);
  const bo={key,def:d,tier:d.tier,x:sp.x,y:sp.y,ax:sp.x,ay:sp.y,r:d.r,hp:d.hp*th,maxHp:d.hp*th,alive:true,pi:-1,phase:'',pt:0,pdmg:0,hitCd:0,flash:0,t:0,minions:0,stun:0,castT:0,rise:3,th,dying:0};
  G.enemies.forEach(e=>{if(e.tier===d.tier&&Math.hypot(e.x-sp.x,e.y-sp.y)<d.r+40)e.dead=true;});float(sp.x,sp.y-60,'SOMETHING IS COMING','#ff6070',16);
  G.boss=bo;G.statues[d.tier].on=false;bossNext(bo);popup('Boss Awakened',d.name,'boss');A.s('boss');G.cam.shake=14;G.flash=.6;G.flashC='#ff3040';relight();}
function bossPhaseEnd(bo){for(const id in T.rails)T.rails[id].closed=false;G.enemies.forEach(e=>{e.frenzy=false;});T.bumps.forEach(c=>{if(c.tier===bo.tier)c.ward=false;});}
function bossNext(bo){const d=bo.def;bo.pi=(bo.pi+1)%d.seq.length;bo.phase=d.seq[bo.pi];bo.pt=0;bo.pdmg=0;bossPhaseEnd(bo);
  switch(bo.phase){
  case 'shield':if(d.wardBy){for(let i=0;i<d.nSum;i++){const e=spawnEnemy(d.wardBy,bo.tier,null,true);if(e)e.warder=true;}float(bo.x,bo.y+62,'WARDED. Slay the '+ENEMY[d.wardBy].name.toLowerCase()+'s','#9fe8ff',13);}
    else{T.bumps.forEach(c=>{if(c.tier===bo.tier)c.ward=true;});float(bo.x,bo.y+62,'WARDED. Strike the lit bumpers','#9fe8ff',13);}A.s('ward');break;
  case 'summon':bo.minions=0;for(let i=0;i<d.nSum;i++)if(spawnEnemy(d.summon,bo.tier,null,true))bo.minions++;float(bo.x,bo.y+62,'RISE AND SERVE','#9dffc8',13);A.s('summon');break;
  case 'cast':bo.castT=d.cast.time;popup(d.cast.name,'Hit a flashing red shot to break the spell','boss',d.cast.note||'');A.s('cast');
    if(d.cast.closes)T.rails[d.cast.closes].closed=true;
    if(d.cast.howl){let n=G.enemies.filter(e=>e.type==='wolf'&&e.tier===bo.tier&&!e.dead).length;while(n<2){const e=spawnEnemy('wolf',bo.tier,null,true);if(!e)break;n++;}G.enemies.forEach(e=>{if(e.type==='wolf'&&e.tier===bo.tier){e.frenzy=true;e.lungeCd=Math.min(e.lungeCd,1);}});}
    if(d.cast.fire)G.zones.push({x:320,y:TY[bo.tier]+505,r:125,t:d.cast.time+6,tick:0,fire:true});break;
  case 'frenzy':if(G.balls.length<3&&G.balls.length>0)startMultiball('Frenzy',2,bo.tier===0?'sanctum':'hut');break;}
  relight();}
function updateBoss(dt){const bo=G.boss;if(!bo)return;bo.t+=dt;if(bo.flash>0)bo.flash-=dt*4;if(bo.hitCd>0)bo.hitCd-=dt;
  if(!bo.alive){bo.dying-=dt;if(Math.random()<.5)burst(bo.x+rand(-30,30),bo.y+rand(-30,30),3,bo.def.color,200,1);return;}
  if(G.focusTier!==bo.tier){if(bo.rise>0)bo.rise=Math.max(bo.rise,.01);return;}bo.pt+=dt;if(bo.rise>0)bo.rise-=dt;if(bo.stun>0)bo.stun-=dt;if(bo.marked>0)bo.marked-=dt;if(bo.poison>0){bo.poison-=dt;bo.dot=(bo.dot||0)+dt;if(bo.dot>=1){bo.dot=0;if(bo.phase!=='shield')hitBoss(bo,G.mods.pow*.35,false);}}
  if(bo.def.moving){bo.x=bo.ax+Math.sin(bo.t*.8)*118;bo.y=bo.ay+18+Math.sin(bo.t*1.6)*22;}
  if(!G.balls.length||G.fallen||G.inGrave||G.focusTier!==bo.tier)return;
  switch(bo.phase){
  case 'shield':if(bo.def.wardBy){if(bo.pt>1&&!G.enemies.some(e=>e.warder&&!e.dead)){bo.stun=3;bossNext(bo);popup('Wards Broken','Strike '+bo.def.short+' now','good');}}else if(bo.pt>45)bossNext(bo);break;
  case 'open':case 'frenzy':if(bo.pdmg>=bo.maxHp*.3||bo.pt>24)bossNext(bo);break;
  case 'summon':if((bo.minions<=0&&bo.pt>1)||bo.pt>28)bossNext(bo);break;
  case 'cast':bo.castT-=dt;if(bo.castT<=0){hurt(bo.def.cast.dmg*bo.th);G.curse[bo.def.cast.curse]=12;G.flash=.5;G.flashC=bo.def.color;G.cam.shake=18;A.s('slam');
    float(bo.x,bo.y+62,bo.def.cast.name.toUpperCase(),'#ff6060',16);bossNext(bo);}break;}}
function wardHit(c){const bo=G.boss;if(!bo||bo.phase!=='shield')return;const left=T.bumps.filter(x=>x.tier===bo.tier&&x.ward).length;A.s('ward');
  float(c.x,c.y-34,left?left+(left>1?' WARDS LEFT':' WARD LEFT'):'WARDS BROKEN','#9fe8ff',14);if(!left){bo.stun=3;bossNext(bo);popup('Wards Broken','Strike '+bo.def.short+' now','good');}}
function interruptBoss(bo){bo.stun=9;bo.phase='open';bo.pt=0;bo.pdmg=0;bossPhaseEnd(bo);popup('Spell Interrupted',bo.def.short+' staggers. Double damage','good');A.s('interrupt');score(30000);xp(15);
  if(G.run.cls==='mage')hitBoss(bo,G.mods.pow*4,true);relight();}
function strikeBoss(bo,b,imp){const m=G.mods,r=G.run;if(bo.rise>0)return;const pw=b.pow?r.cls:null;
  if(pw==='mage'){endPower(b);explode(b.x,b.y);if(!bo.alive)return;}else if(pw==='cleric'){endPower(b);consecrate(bo.x,bo.y+bo.r*.6);}
  if(bo.phase==='shield'){A.s('clank');float(bo.x,bo.y-bo.r-10,'WARDED','#9fe8ff',13);return;}
  let dmg=m.pow*clamp(imp/800,.55,1.6);const crit=pw==='rogue'||G.buffs.stealth>0||bo.marked>0||Math.random()<m.crit||(r.cls==='rogue'&&G.combo>1&&G.comboT>0);
  if(pw==='knight'){dmg*=2.5;endPower(b);}else if(pw==='rogue'){dmg*=3;endPower(b);float(bo.x,bo.y-bo.r-26,'BACKSTAB','#c9a6ff',15);if(m.marked)bo.marked=m.marked;}
  if(crit){if(m.critCharge)r.charge=Math.min(100,r.charge+m.critCharge);if(m.poison)bo.poison=m.poison;}
  if(spellOn('judgement'))dmg+=m.pow*spellVal('judgement','boss');if(crit)dmg*=2;if(G.buffs.sharp>0)dmg*=1.25;if(bo.key==='necro'&&r.cls==='cleric')dmg*=1.5;if(bo.phase==='summon')dmg*=.5;if(bo.stun>0)dmg*=2;
  score(1500);charge(1,'hit');A.s('bossHit');hitBoss(bo,dmg,crit);}
function hitBoss(bo,dmg,crit){if(!bo.alive)return;bo.hp-=dmg;bo.pdmg+=dmg;bo.flash=1;float(bo.x+rand(-20,20),bo.y-bo.r-8,(crit?'CRIT ':'')+Math.round(dmg),crit?'#ffb040':'#ffffff',crit?17:13);
  burst(bo.x,bo.y,8,bo.def.color,260,.6);G.dirty=true;if(bo.hp<=0)killBoss(bo);}
function killBoss(bo){const r=G.run,d=bo.def;bo.alive=false;bo.dying=2.2;bo.hp=0;r.bossKills++;bossPhaseEnd(bo);G.zones=G.zones.filter(z=>!z.fire);G.enemies.forEach(e=>{if(e.minion)e.dead=true;});
  score(150000,bo.x,bo.y);xp(d.xp);gold(d.gold,bo.x,bo.y);G.cam.shake=24;G.flash=1;G.flashC='#ffffff';A.s('bossDie');burst(bo.x,bo.y,60,d.color,420,1.6);
  let note='';if(d.relic&&!r.relics.includes(d.relic)){r.relics.push(d.relic);recalc();note='Relic claimed: '+RELICS.find(x=>x.id===d.relic).name;}
  popup('Boss Slain',d.name,'main',note);r.shop=true;if(!G.demo)G.pending.push('perk');later(2.2,()=>{if(G.boss===bo){G.boss=null;G.statues[bo.tier].on=true;}});
  metaAdd('bosses');qEvent('boss',bo.key);relight();}
function collideActors(b){
  for(const e of G.enemies){if(e.spawn>0||e.dead||Math.abs(e.y-b.y)>60)continue;if(e.job==='gate'&&b.noHole>0)continue; // a ball leaving a scoop slips past the troll that holds it
    if(e.def.ghost||G.phase>0||b.phased){const dx=b.x-e.x,dy=b.y-e.y,rr=b.r+(e.hr||e.r);if(dx*dx+dy*dy<rr*rr&&e.hitCd<=0){e.hitCd=.45;strikeEnemy(e,b,Math.hypot(b.vx,b.vy),G.phase>0);}continue;}
    const pvx=b.vx,pvy=b.vy,imp=hitCircle(b,e,e.r,.35);
    if(imp>30&&e.hitCd<=0){e.hitCd=.12;const plow=b.pow&&G.run.cls==='knight';if(strikeEnemy(e,b,imp)||plow){b.vx=pvx*(plow?.94:.82);b.vy=pvy*(plow?.94:.82);}else{const k=e.def.kick&&e.stun<=0?420:e.job==='wall'?220:90;b.vx+=b._nx*k;b.vy+=b._ny*k;if(e.def.kick&&e.stun<=0)A.s('kick');}}}
  const bo=G.boss;if(bo&&bo.alive&&Math.abs(bo.y-b.y)<90){const imp=hitCircle(b,bo,bo.r,b.y>bo.y?.14:.3);if(imp>30&&bo.hitCd<=0){bo.hitCd=.15;strikeBoss(bo,b,imp);}}
  for(const s of G.statues){if(!s.on||Math.abs(s.y-b.y)>50)continue;const imp=hitCircle(b,s,s.r,.5);if(imp>60&&s.cool<=0){s.cool=.2;s.flash=1;score(600);A.s('target');charge(1,'hit');shot(s.id,s.x,s.y);}}}

/* ---------- ball lifecycle ---------- */
function serve(){const hb=newBall(T.shooter.x,T.shooter.y,0,0);hb.hero=true;G.balls.push(hb);G.skill=irand(0,2);G.dirty=true;}
function startBall(){const r=G.run;r.bb={kills:0,quests:0,ramps:0};G.chanceUsed=false;G.martyrUsed=false;Object.assign(G,{balls:[],tilt:0,fallen:false,hoardDone:false,slingRun:0,booms:[],zones:[],phase:0,nudgeCd:0,hidden:false,inGrave:false,graveLive:false,nudges:[],curse:{},buffs:{},combo:0,comboT:0,mb:null,save:0,sub:null});
  if(r.hp<G.mods.maxHp*.6)r.hp=Math.round(G.mods.maxHp*.6);r.mult=G.mods.multMin;r.kickback=true;r.shop=true;
  T.sets.candles.lanes.forEach(l=>l.lit=false);G.lampShow=1.6;saveRun();serve();popup('Ball '+r.ballNum,r.ballsLeft>1?(r.ballsLeft-1)+' in reserve':'Last ball','info',r.ballNum===1&&r.time<1?(UI.touch?'Tap the left and right sides to flip. Hold Nudge and release to launch.':'Z and / flip. Hold Space and release to launch. Space also nudges.'):r.ballNum===1?'':'');relight();}
function updatePlunger(dt){const p=G.plunge;
  if(p.auto>0){p.auto-=dt;if(p.auto<=0)addBall('shooter');}
  const b=G.balls.find(b=>b.st==='live'&&b.x>586&&b.y>3040&&Math.abs(b.vy)<60);p.ready=!!b;
  if(!b){p.charge=0;p.held=false;return;}
  if(G.in.n||G.in.r){p.charge=Math.min(1,p.charge+dt/.85);p.held=true;}
  else if(p.held){p.held=false;b.vy=-(1330+620*p.charge);b.y-=3;p.charge=0;A.s('launch');G.save=Math.max(G.save,G.mods.save+2);}}
function nudge(){if(G.plunge.ready||G.tilt>0||G.choice||G.paused||!G.run||G.sub)return;const now=G.t;G.nudges=G.nudges.filter(t=>now-t<4);G.nudges.push(now);
  if(G.nudges.length>4){G.tilt=1e9;G.save=0;popup('Tilt','The table goes dead','bad');A.s('tilt');return;}
  if(G.nudges.length===4)popup('Warning','Ease off the table','bad');
  for(const b of G.balls)if(b.st==='live'){const cx=b.tier===2?303:320;b.vy-=230;b.vx+=(b.x<cx?1:-1)*90+rand(-40,40);}
  G.cam.shake=Math.max(G.cam.shake,10);G.nudgeT=.25;A.s('nudge');classNudge();}
function setFlip(side,on){const k=side<0?'l':'r';if(G.in[k]===on)return;G.in[k]=on;for(const f of T.flips)if(f.side===side)f.on=on;
  if(on){if(!G.bot)A.s('flip');for(const id in T.sets){const L=T.sets[id].lanes,v=L.map(l=>l.lit);L.forEach((l,i)=>l.lit=v[(i-side+L.length)%L.length]);}
    if(G.skill>=0)G.skill=(G.skill+side+3)%3;}
  else if(!G.bot)A.s('flipDown');}
function updateBalls(dt){let gone=false;
  for(const b of G.balls){b.age+=dt;if(b.onFlip>0)b.onFlip-=dt;b.tier=tierOf(b.y);
    if(b.st==='live'){b.rot+=b.vx*dt/b.r;
      const sp=Math.hypot(b.vx,b.vy),inLane=b.x>586&&b.y>3000&&b.y<3200;
      if(sp<28&&b.onFlip<=0&&!inLane)b.slow=(b.slow||0)+dt;else b.slow=0;
      if(Math.hypot(b.x-b.sx,b.y-b.sy)>46||b.onFlip>0||inLane){b.sx=b.x;b.sy=b.y;b.still=0;}else b.still+=dt;
      if(b.slow>2||b.still>6){G.stuck.push([Math.round(b.x),Math.round(b.y),b.slow>2?'rest':'trap']);if(G.stuck.length>200)G.stuck.shift();b.vx=rand(-320,320);b.vy=-rand(300,520);b.slow=0;b.still=0;b.sx=b.x;b.sy=b.y;}
      if(b.tier>=4){if(b.y>TY[b.tier]+WLEN+24){b.st='tunnel';b.tun=T.tunnels['out_'+WING_KEYS[b.tier-4]];b.rs=0;b.vx=b.vy=0;A.s('chute');leaveWing(b.tier);}}
      else if(G.inGrave?b.y>HW+28:b.y>H+28){if(!G.inGrave&&!b.party&&graveCatch(b)){}else{b.gone=true;gone=true;}}}
    else if(b.st==='held'){const hd=b.held,h=T.holes[hd.id];hd.t+=dt;h.glow=Math.max(h.glow,.6);
      if(hd.plan!=='wait'&&hd.t>=hd.delay){
        if(hd.plan==='tunnel'){b.st='tunnel';b.tun=hd.tun||T.tunnels[hd.id];b.rs=0;A.s('chute');}
        else{b.st='live';b.x=h.x;b.y=h.y+h.r+2;b.vx=h.ev[0];b.vy=h.ev[1];b.noHole=.8;b.held=null;b.sx=b.x;b.sy=b.y;A.s('eject');burst(h.x,h.y+12,6,'#ffd9a0',140,.4);}}}
    else if(b.st==='tunnel'){const tn=b.tun;b.rs+=1150*dt;railPos(tn,Math.min(b.rs,tn.len),b);
      if(b.rs>=tn.len&&tn.grave){b.st='live';b.vx=b.vy=0;b.tun=null;b.sx=b.x;b.sy=b.y;b.trail=[];G.graveLive=true;A.s('slam');G.cam.shake=14;burst(b.x,b.y,20,'#9dffc8',260,.8);}
      else if(b.rs>=tn.len){const h=T.holes[tn.to];b.st='held';b.held={id:tn.to,t:0,plan:'eject',delay:.45};b.x=h.x;b.y=h.y;b.tun=null;h.glow=1;}}
    const tr=b.trail;tr.push(b.x,b.y);if(tr.length>16)tr.splice(0,2);}
  if(gone){const g=G.balls.filter(b=>b.gone);G.balls=G.balls.filter(b=>!b.gone);for(const b of g)onDrain(b);}}
function onDrain(b){const r=G.run;if(b.party)return;A.s('drain');if(G.balls.some(x=>x.party))endRally('Your ball is lost');
  if(!G.fallen&&G.tilt<=0&&!G.inGrave&&!G.balls.length){const cA=spellCast('aegis'),cS=spellCast('sanctuary');if(cA){saveBall('Aegis','The ward returns your ball');if(spellVal('aegis','wave')){G.booms.push({x:b.x,y:b.y,r:400,t:0,c:'#8fb0d8'});for(const e of G.enemies)if(e.tier===G.focusTier&&!e.dead){e.wind=0;e.stun=Math.max(e.stun,2);}r.charge=Math.min(100,r.charge+40);}return;}if(cS&&cS.ret>0){cS.ret--;saveBall('Sanctuary','The light returns your ball');return;}}
  if(G.inGrave){G.inGrave=false;G.graveLive=false;popup('Gravebound','The earth keeps what it is given','bad');endBall();return;}
  if(!G.fallen&&G.tilt<=0){if(G.save>0){saveBall('Ball Saved','The ball returns');return;}if(r.shield){r.shield=false;saveBall('Aegis','The ward returns your ball');if(G.mods.bulwark){G.booms.push({x:b.x,y:b.y,r:400,t:0,c:'#8fb0d8'});for(const e of G.enemies)if(e.tier===G.focusTier&&!e.dead){e.wind=0;e.stun=Math.max(e.stun,2);}float(b.x,b.y-60,'BULWARK','#8fb0d8',15);}return;}}
  if(G.balls.length+(G.plunge.auto>0?1:0)>=1){if(G.balls.length<=1&&G.mb){G.mb=null;relight();}return;}
  if(G.mods.bargain&&G.tilt<=0)gold(G.mods.bargain,b.x,b.y-40);endBall();}
function saveBall(t,s){popup(t,s,'good');A.s('save');G.plunge.auto=Math.max(G.plunge.auto,.9);G.dirty=true;}
function endBall(){const r=G.run;G.sub='bonus';G.mb=null;
  for(const q of r.side.slice()){const o=qCur(q);if(o&&o.time)qFail(q);}
  const bb=r.bb||{kills:0,quests:0,ramps:0},tilt=G.tilt>0,lines=[['Foes slain',bb.kills,bb.kills*400],['Side quests done',bb.quests,bb.quests*8000],['Ramps',bb.ramps,bb.ramps*300],['Level',r.level,r.level*2500]];
  const base=lines.reduce((a,l)=>a+l[2],0),total=tilt?0:base*r.mult;r.score+=total;
  G.bonus={lines,mult:r.mult,total,tilt,fallen:G.fallen};A.s('ballEnd');r.ballsLeft--;G.dirty=true;
  if(G.demo){later(1.5,startDemo);return;}
  UI.bonus(G.bonus,r.ballsLeft>0);
  later(3.4,()=>{if(G.run!==r)return;G.sub=null;UI.bonus(null);if(r.ballsLeft>0){r.ballNum++;startBall();}else gameOver();});}
function gameOver(won){if(G.demo){later(1.5,startDemo);return;} // the attract mode never ends a run of yours, never touches your save
  const r=G.run;r.ended=won?'won':'fell';G.mode='over';G.sub=null;store.del('run');A.s(won?'victory':'over');metaAdd('runs');const m=store.get('meta',{});if(r.level>(m.bestLevel||0)){m.bestLevel=r.level;store.set('meta',m);}UI.gameOver(r);}
function startRun(cls,comp){G.demo=false;G.bot=null;resetWorld();G.mode='play';newRun(cls,comp);G.cam.y=TY[2]-20;qBegin(G.run.main);startBall();
  popup(G.run.main.name,G.run.main.text,'main');newSideQuiet();UI.sync(true);}
function newSideQuiet(){const r=G.run,pool=SIDE.filter(s=>s.steps[0].tier===2||(s.steps[0].id&&T.shots[s.steps[0].id]&&T.shots[s.steps[0].id].tier===2));const s=pick(pool);
  const q={id:s.id,name:s.name,giver:s.giver,text:s.text,steps:s.steps.map(o=>Object.assign({},o)),rw:s.rw,si:0,prog:0,tl:0};r.side.push(q);qBegin(q);}
function continueRun(){const d=store.get('run',null);if(!d||!d.run)return false;G.demo=false;G.bot=null;resetWorld();G.mode='play';G.run=d.run;if(!G.run.grave)G.run.grave={hits:0,need:8,used:0,open:false};if(!G.run.party){G.run.party=[];G.run.tavern=[];}if(!G.run.book){G.run.book={};G.run.goal={};}if(!G.run.recruits)G.run.recruits=[];G.run.party=G.run.party.filter(c=>COMPANIONS[c.id]).slice(0,1);if(G.run.party[0])G.run.party[0].slot='center';if(TAVERN_RECRUITS&&!G.run.tavern.length&&G.run.party.length<3)G.run.tavern=drawRecruits(3);if(!G.run.wing||G.run.wing.key===undefined){const m=G.run.main,cw=m&&CAMPAIGNS[m.key].wing;G.run.wing={key:cw&&m.steps.some(x=>x.id==='wing')?cw.key:null,open:false,done:false,prog:0};}recalc();G.cam.y=TY[2]-20;
  if(!G.run.main){G.run.main=makeCampaign(G.run);qBegin(G.run.main);}else quests().forEach(qResume);startBall();UI.sync(true);return true;}
function startDemo(){G.demo=true;G.demoT=180;resetWorld();G.mode='title';newRun(pick(Object.keys(CLASSES)));qBegin(G.run.main);newSideQuiet();G.bot={hl:0,hr:0,tl:rand(20,60),tr:rand(20,60),pl:0,plT:rand(.3,.9)};startBall();}

/* ---------- choices (perks, shop) ---------- */
function openChoice(kind){const r=G.run;let c;
  if(kind==='perk'){const cnt=id=>r.perks.filter(x=>x===id).length,can=p=>cnt(p.id)<p.max&&(!p.cls||p.cls===r.cls)&&(!p.rare||Math.random()<.35),picks=[];
    const take=k=>{const l=shuffle(PERKS.filter(p=>p.kind===k&&can(p)&&!picks.includes(p)));if(l.length)picks.push(l[0]);};
    const hasKey=r.perks.some(id=>{const p=PERKS.find(q=>q.id===id);return p&&p.kind==='key';});
    take('table');take('stat');take(!hasKey&&r.level>=3&&Math.random()<.35?'key':'table');
    while(picks.length<3){const l=shuffle(PERKS.filter(p=>p.kind!=='key'&&can(p)&&!picks.includes(p)));if(!l.length)break;picks.push(l[0]);}
    const tag=p=>cnt(p.id)?'Rank '+(cnt(p.id)+1):p.kind==='class'?CLASSES[r.cls].name:p.kind==='table'?'The table':p.kind==='key'?'Keystone':'Boon';
    c={kind,title:'A Boon',sub:'The spoils of the fight. Choose one',opts:picks.map(p=>({name:p.name,desc:p.desc,tag:tag(p),key:p.kind==='key',act:()=>{r.perks.push(p.id);recalc();if(p.now)p.now();}}))};}
  else if(kind==='book'){c=bookChoice();}
  else if(kind==='bookUp'){c=bookUpChoice(G.bookUp);}
  else if(kind==='tavern'&&TAVERN_RECRUITS){c=tavernChoice();}
  else{const opts=r.tavern.map(id=>{const d=COMPANIONS[id],R=ROLES[d.role];return {name:d.name,desc:R.name+'. '+d.desc,cost:d.cost,tag:d.cost+' gold',role:d.role,act:()=>{const c=recruit(id);if(c)popup(d.name+' Joins','They take the '+c.slot+' post','good',d.desc);}};});
    c={kind,title:'The Drowned Lantern',sub:'Recruits for hire. You have '+r.gold+' gold'+(r.party.length?'; '+(3-r.party.length)+' post'+(3-r.party.length===1?'':'s')+' free':''),opts:opts.concat([{name:'Leave',desc:'Keep your coin and get back to it.',tag:'',act:()=>{}}])};}
  if(G.demo||G.auto){const o=pick(c.opts.filter(o=>!o.cost||o.cost<=r.gold));if(o.cost)r.gold-=o.cost;o.act();resumeHeld();return;}
  c.sel=0;G.choice=c;UI.choice(c);A.s('choice');}
function choose(i){const c=G.choice;if(!c)return;const o=c.opts[i];if(!o)return;if(o.cost&&G.run.gold<o.cost){A.s('deny');return;}if(o.cost)G.run.gold-=o.cost;if(o.act()==='stay'){A.s('ui');return;}
  G.choice=null;UI.choice(null);G.slow=.7;resumeHeld();A.s('pick');G.dirty=true;saveRun();}
function resumeHeld(){for(const b of G.balls)if(b.st==='held'&&b.held.plan==='wait'){b.held.plan='eject';b.held.t=0;b.held.delay=.5;}}

/* ---------- per-frame ---------- */
function updateRules(dt){const r=G.run;r.time+=dt;
  if(G.save>0&&!G.plunge.ready){G.save-=dt;if(G.save<=0)G.dirty=true;}
  for(const k in G.buffs)if(G.buffs[k]>0){G.buffs[k]-=dt;if(G.buffs[k]<=0)G.dirty=true;}
  for(const k in G.curse)if(G.curse[k]>0){G.curse[k]-=dt;if(G.curse[k]<=0)G.dirty=true;}
  if(G.curse.burn>0){G.burnAcc=(G.burnAcc||0)+dt;if(G.burnAcc>=1){G.burnAcc=0;hurt(3);}}
  G.flipPow=G.mods.flip*(G.curse.weak>0?.84:1);
  if(G.comboT>0){G.comboT-=dt;if(G.comboT<=0)G.combo=0;}if(G.lampShow>0)G.lampShow-=dt;if(G.demo&&G.mode==='title'&&(G.demoT-=dt)<=0)startDemo();
  if(G.mods.kickRelight&&!r.kickback){G.kickT-=dt;if(G.kickT<=0){r.kickback=true;relight();}}
  if(G.doorT>0){G.doorT-=dt;if(G.doorT<=0){if(wingHoldsDoor())G.doorT=0;else openDoor(false);}}
  if(!r.hutLit){G.hutT-=dt;if(G.hutT<=0){r.hutLit=true;G.hutT=40;relight();}}
  for(const id in T.banks){const B=T.banks[id];if(B.reset>0){B.reset-=dt;if(B.reset<=0&&id!=='door'&&id!=='nails')B.segs.forEach(s=>s.on=true);}}
  if(G.inGrave&&G.graveLive&&G.tilt<=0){G.graveT-=dt;G.dirty=true;if(G.graveT<=0){G.graveT=0;G.tilt=1e9;popup('The Lid Closes','The flippers go dead','bad');A.s('tilt');}}
  if(G.focusTier>=4&&G.tilt<=0&&G.balls.some(b=>b.st==='live'&&b.tier===G.focusTier)){G.wingT-=dt;G.dirty=true;if(G.wingT<=0){const d=WINGS[WING_KEYS[G.focusTier-4]];G.wingT=0;G.tilt=1e9;popup(d.late[0],d.late[1],'bad');A.s('tilt');}}
  for(const q of r.side.slice())if(q.tl>0&&!G.inGrave&&G.focusTier<4){q.tl-=dt;G.dirty=true;if(q.tl<=0)qFail(q);}
  G.spawnT-=dt;if(G.spawnT<=0){G.spawnT=.6;manageSpawns();}updateParty(dt);updateSpells(dt);updateRally(dt);
  const f=focusBall();if(f){const ft=tierOf(f.y);if(ft!==G.focusTier){G.focusTier=ft;relight();}}
  if(G.pending.length&&!G.choice&&!G.sub&&G.mode!=='over'&&!(G.run.main===null&&!G.opt.endless)&&(G.plunge.ready||G.balls.some(b=>b.st==='held'||b.st==='tunnel')||!G.balls.some(b=>b.st==='live')))openChoice(G.pending.shift());}
function updateFx(dt){
  for(const p of G.parts){p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;p.vx*=1-dt*2;}
  if(G.parts.length)G.parts=G.parts.filter(p=>p.life<p.max);
  for(const f of G.floats){f.t+=dt;f.y-=28*dt;}if(G.floats.length&&G.floats[0].t>1.3)G.floats=G.floats.filter(f=>f.t<1.3);
  for(const b of G.bolts)b.t+=dt;if(G.bolts.length)G.bolts=G.bolts.filter(b=>b.t<.35);
  for(const b of G.booms)b.t+=dt;if(G.booms.length)G.booms=G.booms.filter(b=>b.t<.5);
  if(G.hurtT>0)G.hurtT-=dt;if(G.flash>0)G.flash-=dt*1.6;if(G.nudgeT>0)G.nudgeT-=dt;}
function updateCam(dt){const c=G.cam,vh=c.viewH,b=focusBall();
  if(b){let ty=b.y-vh*.52+clamp(b.st==='live'?b.vy*.08:0,-90,110);const tier=tierOf(b.y),yF=FY[tier];
    if((b.st==='live'||b.st==='held')&&b.y<yF+60){const w=clamp((b.y-(yF-640))/260,0,1);ty=lerp(ty,Math.min(yF+125-vh,b.y-vh*.12),w*w*(3-2*w));}
    c.ty=ty;}
  const ty=clamp(c.ty,c.top||0,Math.max(c.top||0,(G.inGrave?HW:H)+12-vh));c.y+=(ty-c.y)*(1-Math.exp(-dt*6.5));if(c.shake>0)c.shake=Math.max(0,c.shake-dt*45);}
function botStep(dt){const B=G.bot;let l=false,r=false;
  for(const f of T.flips)for(const b of G.balls){if(b.st!=='live')continue;const dx=(b.x-f.x)*f.dir,dy=b.y-f.y;
    if(dx>(f.side<0?B.tl:B.tr)&&dx<90&&dy>-34-b.vy*.02&&dy<30&&b.vy>-150){if(f.side<0)l=true;else r=true;}}
  if(!(B.crT>0)&&G.run.charge>=33&&G.tilt<=0)for(const f of T.flips)for(const b of G.balls){if(b.st!=='live'||b.arm||b.pow)continue;const dx=(b.x-f.x)*f.dir,dy=b.y-f.y;
    if(dx>-14&&dx<34&&dy>-46&&dy<6&&b.vy>0&&Math.hypot(b.vx,b.vy)<430&&Math.random()<.04){B.crT=2.1;B.crS=f.side;}}
  if(l&&B.hl<=0){B.hl=.16;B.tl=rand(12,66);}if(r&&B.hr<=0){B.hr=.16;B.tr=rand(12,66);}
  if(B.crT>0){B.crT-=dt;const up=B.crT>.5||B.crT<.14;if(B.crS<0){B.hl=up?.2:0;}else{B.hr=up?.2:0;}}
  if(B.hl>0)B.hl-=dt;if(B.hr>0)B.hr-=dt;setFlip(-1,B.hl>.03);
  if(G.plunge.ready){B.pl+=dt;G.in.n=B.pl<B.plT;if(B.pl>B.plT+.15){B.pl=0;B.plT=rand(.25,.95);}setFlip(1,false);}
  else{G.in.n=false;B.pl=0;setFlip(1,B.hr>.03);}}
function gameStep(dt){G.t+=dt;
  if(G.paused||G.choice){updateCam(dt);return;}
  let s=dt;if(G.slow>0){G.slow-=dt;s=dt*.4;}
  if(G.queue.length){const due=[],gen=G.gen;G.queue=G.queue.filter(q=>{q.t-=s;if(q.t<=0){due.push(q);return false;}return true;});for(const q of due)if(G.gen===gen)q.fn();}
  if(G.run&&G.mode!=='over'){
    if(G.bot)botStep(s);
    updatePlunger(s);physics(s);updateBalls(s);updatePowers(s);updateEnemies(s);updateBoss(s);updatePickups(s);updateRules(s);}
  updateFx(s);updateCam(dt);}

/* ================= RENDER ================= */
const R={cv:null,c:null,scale:1,ss:1,floor:[],over:[],CH:530,spr:{},glows:{},ready:false,fontD:'"Grenze Gotisch","Old English Text MT",Georgia,serif',fontL:'Cinzel,"Trajan Pro",Georgia,serif'};
const PAL=[
  {a:'#1d1124',b:'#110a17',acc:'#c0283c',acc2:'#d9a441',glow:'#ff4a5a',stone:'#3a2c44'},
  {a:'#10201b',b:'#0a1411',acc:'#58b89a',acc2:'#cfeef2',glow:'#8fe8d0',stone:'#2c4038'},
  {a:'#16203a',b:'#0c121f',acc:'#e0a040',acc2:'#9cc0ea',glow:'#ffc060',stone:'#2f3a52'},
  {a:'#1b1710',b:'#080705',acc:'#7dffb0',acc2:'#cfe8c0',glow:'#7dffb0',stone:'#3a3222'},
  {a:'#1c1e12',b:'#090a06',acc:'#c8e060',acc2:'#e6e0c4',glow:'#d8f070',stone:'#3a3e2a'},
  {a:'#141a26',b:'#070a12',acc:'#8fb0d8',acc2:'#dfe8f2',glow:'#cfe6ff',stone:'#3a4252'},
  {a:'#24140a',b:'#0d0704',acc:'#ff8a4a',acc2:'#ffd24a',glow:'#ffb050',stone:'#4a3222'}];
const LITC={main:'#ffd24a',side:'#62d8ff',lock:'#7dffb0',gold:'#ffb020',soft:'#b79cff',danger:'#ff4050',spell:'#e8a8ff'};
function mkCanvas(w,h){const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv;}
function glow(col){let g=R.glows[col];if(g)return g;g=mkCanvas(64,64);const c=g.getContext('2d'),gr=c.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,col);gr.addColorStop(.35,col+'88');gr.addColorStop(1,col+'00');c.fillStyle=gr;c.fillRect(0,0,64,64);R.glows[col]=g;return g;}
function drawGlow(c,x,y,r,col,a){c.globalAlpha=a;c.drawImage(glow(col),x-r,y-r,r*2,r*2);c.globalAlpha=1;}
function path(c,pts,close){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);if(close)c.closePath();}
function fieldPath(c,i){const yA=TY[i]+300,yB=i<2?TY[i]+913:H+60;c.beginPath();c.moveTo(20,yB);c.lineTo(20,yA);c.arc(320,yA,300,PI,TAU);c.lineTo(620,yB);c.closePath();}
function starPath(c,x,y,r1,r2,n,rot){c.beginPath();for(let i=0;i<n*2;i++){const a=rot+i*PI/n,r=i%2?r2:r1;c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}c.closePath();}
function polyStar(c,x,y,r,n,skip,rot){c.beginPath();for(let i=0;i<=n;i++){const a=rot+i*skip*TAU/n;c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}}

/* ---------- static art ---------- */
function tree(c,x,y,h,seed,col){c.strokeStyle=col;c.lineCap='round';
  const br=(x,y,a,l,w,d)=>{const x2=x+Math.cos(a)*l,y2=y+Math.sin(a)*l;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();
    if(d>0){const k=hash(seed+d*7.3+l);br(x2,y2,a-.35-k*.4,l*.68,w*.62,d-1);br(x2,y2,a+.3+k*.45,l*.7,w*.62,d-1);}};
  br(x,y,-PI/2+(hash(seed)-.5)*.3,h*.42,h*.07,4);}
function pine(c,x,y,h,col){c.fillStyle=col;for(let k=0;k<4;k++){const w=h*(.42-k*.08),yy=y-h*(.12+k*.2);c.beginPath();c.moveTo(x,yy-h*.3);c.lineTo(x+w,yy);c.lineTo(x-w,yy);c.closePath();c.fill();}c.fillRect(x-h*.035,y-h*.14,h*.07,h*.14);}
function tomb(c,x,y,s,kind,col){c.fillStyle='rgba(0,0,0,.4)';c.beginPath();c.ellipse(x+2,y+2,s*.75,s*.2,0,0,TAU);c.fill();c.fillStyle=col;c.beginPath();
  if(kind===0){c.moveTo(x-s*.5,y);c.lineTo(x-s*.5,y-s*.7);c.arc(x,y-s*.7,s*.5,PI,0);c.lineTo(x+s*.5,y);}
  else if(kind===1){c.rect(x-s*.14,y-s*1.3,s*.28,s*1.3);c.rect(x-s*.45,y-s*.95,s*.9,s*.24);}
  else{c.moveTo(x-s*.45,y);c.lineTo(x-s*.45,y-s*.8);c.lineTo(x,y-s*1.15);c.lineTo(x+s*.45,y-s*.8);c.lineTo(x+s*.45,y);}
  c.closePath();c.fill();c.strokeStyle='rgba(200,215,250,.3)';c.lineWidth=1;c.stroke();}
function rose(c,x,y,r,cols){c.save();c.translate(x,y);c.fillStyle='#07070b';c.beginPath();c.arc(0,0,r+5,0,TAU);c.fill();
  for(let k=0;k<12;k++){const a=k*TAU/12;c.fillStyle=cols[k%cols.length];c.globalAlpha=.55;c.beginPath();c.moveTo(Math.cos(a)*r*.34,Math.sin(a)*r*.34);
    c.arc(0,0,r,a-.2,a+.2);c.closePath();c.fill();c.beginPath();c.arc(Math.cos(a+PI/12)*r*.78,Math.sin(a+PI/12)*r*.78,r*.1,0,TAU);c.globalAlpha=.7;c.fill();}
  c.globalAlpha=.8;c.fillStyle=cols[0];c.beginPath();c.arc(0,0,r*.26,0,TAU);c.fill();c.globalAlpha=1;c.strokeStyle='#07070b';c.lineWidth=2.4;
  for(let k=0;k<12;k++){const a=k*TAU/12+PI/12;c.beginPath();c.moveTo(Math.cos(a)*r*.26,Math.sin(a)*r*.26);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);c.stroke();}
  c.beginPath();c.arc(0,0,r*.62,0,TAU);c.stroke();c.lineWidth=4;c.strokeStyle='#2a2a36';c.beginPath();c.arc(0,0,r+2,0,TAU);c.stroke();c.restore();}
function lancet(c,x,y,w,h,rot,cols){c.save();c.translate(x,y);c.rotate(rot);const p=()=>{c.beginPath();c.moveTo(-w/2,h/2);c.lineTo(-w/2,-h*.2);c.quadraticCurveTo(-w/2,-h*.45,0,-h/2);c.quadraticCurveTo(w/2,-h*.45,w/2,-h*.2);c.lineTo(w/2,h/2);c.closePath();};
  p();c.fillStyle='#07070b';c.fill();c.save();p();c.clip();for(let k=0;k<7;k++){c.fillStyle=cols[k%cols.length];c.globalAlpha=.5+.2*hash(k+x);c.fillRect(-w/2,-h/2+k*h/7,w,h/7-1.5);}
  c.globalAlpha=1;c.strokeStyle='#07070b';c.lineWidth=1.6;c.beginPath();c.moveTo(0,-h/2);c.lineTo(0,h/2);c.stroke();c.restore();p();c.strokeStyle='#3a3344';c.lineWidth=3;c.stroke();c.restore();}
function runeBed(c,x,y){c.save();c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=22;c.beginPath();c.arc(x,y,96,0,TAU);c.stroke();
  c.strokeStyle='rgba(255,240,210,.14)';c.lineWidth=1.4;for(const rr of [84.5,107.5]){c.beginPath();c.arc(x,y,rr,0,TAU);c.stroke();}
  for(let k=0;k<12;k++){const a=-PI/2+k*TAU/12,px=x+Math.cos(a)*96,py=y+Math.sin(a)*96;c.fillStyle='rgba(0,0,0,.7)';c.beginPath();c.arc(px,py,10.5,0,TAU);c.fill();
    c.strokeStyle='rgba(255,236,200,.22)';c.lineWidth=1.2;c.beginPath();c.arc(px,py,10.5,0,TAU);c.stroke();}c.restore();}
function sigil(c,x,y,r,col,kind){c.save();c.strokeStyle=col;c.globalAlpha=.22;c.lineWidth=2;c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();c.beginPath();c.arc(x,y,r*.86,0,TAU);c.stroke();
  for(let k=0;k<24;k++){const a=k*TAU/24;c.beginPath();c.moveTo(x+Math.cos(a)*r*.86,y+Math.sin(a)*r*.86);c.lineTo(x+Math.cos(a)*r*(k%3?.92:1),y+Math.sin(a)*r*(k%3?.92:1));c.stroke();}
  if(kind===0){polyStar(c,x,y,r*.84,7,3,-PI/2);c.stroke();c.beginPath();c.arc(x,y,r*.3,0,TAU);c.stroke();}
  else if(kind===1){for(let k=0;k<3;k++){c.beginPath();for(let t=0;t<=1.001;t+=.05){const a=k*TAU/3+t*3.4,rr=r*.08+t*r*.7;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.stroke();}}
  else{starPath(c,x,y,r*.82,r*.26,4,-PI/2);c.stroke();starPath(c,x,y,r*.56,r*.2,4,-PI/4);c.stroke();c.beginPath();c.arc(x,y,r*.14,0,TAU);c.stroke();}
  c.restore();}
function voussoirs(c,i){const yA=TY[i]+300;c.save();c.beginPath();c.arc(320,yA,334,PI,TAU);c.arc(320,yA,301,TAU,PI,true);c.closePath();
  const g=c.createLinearGradient(0,yA-334,0,yA);g.addColorStop(0,'#2b2a3c');g.addColorStop(1,'#15141f');c.fillStyle=g;c.fill();c.clip();
  c.strokeStyle='#05050a';c.lineWidth=2;for(let k=0;k<=30;k++){const a=PI+k*PI/30;c.beginPath();c.moveTo(320+Math.cos(a)*300,yA+Math.sin(a)*300);c.lineTo(320+Math.cos(a)*336,yA+Math.sin(a)*336);c.stroke();}
  c.strokeStyle='rgba(200,210,245,.14)';c.lineWidth=1;for(let k=0;k<30;k++){const a=PI+(k+.08)*PI/30;c.beginPath();c.moveTo(320+Math.cos(a)*302,yA+Math.sin(a)*302);c.lineTo(320+Math.cos(a)*333,yA+Math.sin(a)*333);c.stroke();}
  c.restore();c.strokeStyle='#05050a';c.lineWidth=3;c.beginPath();c.arc(320,yA,334,PI,TAU);c.stroke();
  // keystone
  const p=PAL[i];c.fillStyle='#34334a';path(c,[[304,yA-338],[336,yA-338],[331,yA-300],[309,yA-300]],1);c.fill();c.strokeStyle='#05050a';c.lineWidth=2;c.stroke();c.fillStyle=p.acc;c.globalAlpha=.8;starPath(c,320,yA-319,8,3.2,4,-PI/2);c.fill();c.globalAlpha=1;}
function chapel(c,x,y){c.fillStyle='#0c1424';path(c,[[x-46,y+70],[x-46,y-10],[x-30,y-30],[x-30,y-64],[x-22,y-92],[x-14,y-64],[x-14,y-34],[x,y-58],[x+14,y-34],[x+14,y-64],[x+22,y-92],[x+30,y-64],[x+30,y-30],[x+46,y-10],[x+46,y+70]],1);c.fill();
  c.strokeStyle='rgba(150,180,230,.25)';c.lineWidth=1.2;c.stroke();}
function lantern(c,x,y,col){const g=c.createRadialGradient(x,y,1,x,y,26);g.addColorStop(0,col+'cc');g.addColorStop(.3,col+'44');g.addColorStop(1,col+'00');c.fillStyle=g;c.fillRect(x-26,y-26,52,52);c.fillStyle='#fff3d0';c.beginPath();c.arc(x,y,2.2,0,TAU);c.fill();c.strokeStyle='#05050a';c.lineWidth=1.4;c.strokeRect(x-3.5,y-4.5,7,9);}
function fence(c,x0,y0,x1,y1,col){const n=Math.round(Math.hypot(x1-x0,y1-y0)/9);c.strokeStyle=col;c.lineWidth=1.3;c.beginPath();c.moveTo(x0,y0-4);c.lineTo(x1,y1-4);c.moveTo(x0,y0-11);c.lineTo(x1,y1-11);c.stroke();
  for(let k=0;k<=n;k++){const x=lerp(x0,x1,k/n),y=lerp(y0,y1,k/n);c.beginPath();c.moveTo(x,y);c.lineTo(x,y-16);c.lineTo(x-1.6,y-13);c.moveTo(x,y-16);c.lineTo(x+1.6,y-13);c.stroke();}}
function rays(c,x,y,ang,len,w,col){c.save();c.translate(x,y);c.rotate(ang);const g=c.createLinearGradient(0,0,0,len);g.addColorStop(0,col+'40');g.addColorStop(1,col+'00');c.fillStyle=g;c.beginPath();c.moveTo(-w/2,0);c.lineTo(w/2,0);c.lineTo(w*1.6,len);c.lineTo(-w*1.6,len);c.closePath();c.fill();c.restore();}
function flagstones(c,i){const y0=TY[i];c.lineWidth=1.2;
  for(let r=0;r<17;r++){const y=y0+r*58+hash(i*9+r)*10;c.strokeStyle='rgba(0,0,0,.34)';c.beginPath();c.moveTo(20,y);c.lineTo(620,y);c.stroke();c.strokeStyle='rgba(255,255,255,.035)';c.beginPath();c.moveTo(20,y+1.4);c.lineTo(620,y+1.4);c.stroke();
    let x=20+hash(r*3.1+i)*60;while(x<620){c.strokeStyle='rgba(0,0,0,.3)';c.beginPath();c.moveTo(x,y);c.lineTo(x+(hash(x)-.5)*6,y+58);c.stroke();
      if(hash(x*1.7+r)>.72){c.fillStyle='rgba(255,255,255,.022)';c.fillRect(x+2,y+2,60,54);}x+=64+hash(x+r)*52;}}}
const ART=[
  function keep(c,y,p){ // checkered hall, carpet, dais, windows
    c.save();c.beginPath();c.rect(110,y+330,420,600);c.clip();for(let r=-2;r<22;r++)for(let k=-1;k<16;k++){if((r+k)%2)continue;const x=110+k*38+(r%2)*0,yy=y+330+r*38;c.fillStyle='rgba(150,30,50,.075)';c.beginPath();c.moveTo(x,yy-19);c.lineTo(x+19,yy);c.lineTo(x,yy+19);c.lineTo(x-19,yy);c.closePath();c.fill();}c.restore();
    let g=c.createLinearGradient(0,y+230,0,y+910);g.addColorStop(0,'rgba(150,24,44,.5)');g.addColorStop(1,'rgba(110,16,34,.16)');c.fillStyle=g;path(c,[[300,y+240],[340,y+240],[366,y+910],[274,y+910]],1);c.fill();
    c.strokeStyle='rgba(217,164,65,.35)';c.lineWidth=2;path(c,[[304,y+240],[280,y+910]]);c.stroke();path(c,[[336,y+240],[360,y+910]]);c.stroke();
    for(let k=0;k<3;k++){c.fillStyle=['#2a1c30','#33223a','#3d2a46'][k];c.beginPath();c.arc(320,y+212,84-k*16,0,TAU);c.fill();c.strokeStyle='rgba(217,164,65,.3)';c.lineWidth=1.5;c.stroke();}
    const cols=['#c0283c','#d9a441','#3a5fb0','#7a2a8a'];
    lancet(c,112,y+212,30,84,-.5,cols);lancet(c,164,y+128,30,84,-.9,cols);lancet(c,528,y+212,30,84,.5,cols);lancet(c,476,y+128,30,84,.9,cols);
    rays(c,112,y+212,-.5,330,30,'#c0283c');rays(c,164,y+128,-.9,300,30,'#d9a441');rays(c,528,y+212,.5,330,30,'#3a5fb0');rays(c,476,y+128,.9,300,30,'#d9a441');
    // throne
    c.fillStyle='#120b18';path(c,[[296,y+236],[296,y+176],[304,y+150],[312,y+170],[320,y+140],[328,y+170],[336,y+150],[344,y+176],[344,y+236]],1);c.fill();c.strokeStyle='rgba(217,164,65,.55)';c.lineWidth=1.5;c.stroke();
    // colonnade
    for(const x of [92,548])for(let k=0;k<4;k++){const yy=y+330+k*58;const g2=c.createLinearGradient(x-9,0,x+9,0);g2.addColorStop(0,'#1a1220');g2.addColorStop(.5,'#4a3a58');g2.addColorStop(1,'#1a1220');c.fillStyle=g2;c.beginPath();c.arc(x,yy,9,0,TAU);c.fill();c.strokeStyle='rgba(217,164,65,.35)';c.lineWidth=1;c.stroke();}
    for(const q of [[236,372],[404,372],[150,470],[490,470],[214,742],[426,742]])lantern(c,q[0],y+q[1],'#ff5a3c');
    c.strokeStyle='rgba(217,164,65,.22)';c.lineWidth=1.2;for(let k=0;k<2;k++){c.beginPath();c.arc(320,y+650,104+k*8,0,TAU);c.stroke();}
    sigil(c,320,y+650,82,p.acc,0);runeBed(c,320,y+650);
    c.fillStyle='rgba(0,0,0,.4)';for(const x of [150,490])for(let k=0;k<3;k++){c.fillRect(x-7,y+560+k*70,14,40);}
    for(const x of [150,490])for(let k=0;k<3;k++){c.fillStyle='rgba(192,40,60,.22)';path(c,[[x-9,y+556+k*70],[x+9,y+556+k*70],[x+9,y+598+k*70],[x,y+590+k*70],[x-9,y+598+k*70]],1);c.fill();}
  },
  function wilds(c,y,p){ // moon, ruined gate, forest
    let g=c.createRadialGradient(320,y+178,10,320,y+178,230);g.addColorStop(0,'rgba(190,235,240,.28)');g.addColorStop(1,'rgba(190,235,240,0)');c.fillStyle=g;c.fillRect(20,y,600,460);
    g=c.createRadialGradient(300,y+160,6,320,y+178,80);g.addColorStop(0,'#f2fbfb');g.addColorStop(1,'#93b9bf');c.fillStyle=g;c.beginPath();c.arc(320,y+178,78,0,TAU);c.fill();
    c.fillStyle='rgba(60,95,105,.3)';[[296,150,15],[346,206,20],[330,138,8],[286,208,10],[362,160,7]].forEach(q=>{c.beginPath();c.arc(q[0],y+q[1],q[2],0,TAU);c.fill();});
    c.fillStyle='#0b1512';c.strokeStyle='#0b1512';[[226,96,150],[414,96,150]].forEach(q=>{c.fillRect(q[0]-13,y+q[1],26,q[2]);c.fillRect(q[0]-18,y+q[1]+q[2]-10,36,12);c.fillRect(q[0]-17,y+q[1]-8,34,10);});
    c.lineWidth=16;c.beginPath();c.arc(320,y+100,94,PI,PI+1.15);c.stroke();c.beginPath();c.arc(320,y+100,94,TAU-.8,TAU);c.stroke();
    const dk='#07100d',md='#0c1a15';
    [[92,150,70],[132,100,56],[548,150,70],[508,100,56],[92,640,80],[128,585,60],[548,640,80],[512,585,60],[96,800,64],[544,800,64],[180,208,50],[460,208,50]].forEach((q,k)=>pine(c,q[0],y+q[1],q[2],k%2?dk:md));
    tree(c,170,y+560,70,3,'#0a1512');tree(c,470,y+560,70,8,'#0a1512');
    // moonlit stream
    c.lineCap='round';c.strokeStyle='rgba(90,200,200,.10)';c.lineWidth=30;c.beginPath();c.moveTo(20,y+520);c.bezierCurveTo(160,y+600,220,y+740,330,y+760);c.bezierCurveTo(440,y+780,520,y+700,620,y+730);c.stroke();
    c.strokeStyle='rgba(190,245,245,.16)';c.lineWidth=1.4;c.setLineDash([14,22]);for(let k=-1;k<2;k++){c.beginPath();c.moveTo(20,y+520+k*8);c.bezierCurveTo(160,y+600+k*8,220,y+740+k*8,330,y+760+k*8);c.bezierCurveTo(440,y+780+k*8,520,y+700+k*8,620,y+730+k*8);c.stroke();}c.setLineDash([]);
    // mushroom ring and standing stones
    for(let k=0;k<14;k++){const a=k*TAU/14,x=320+Math.cos(a)*124,yy=y+650+Math.sin(a)*124;c.fillStyle='rgba(230,90,90,.45)';c.beginPath();c.arc(x,yy,4.2,PI,TAU);c.fill();c.fillStyle='rgba(240,230,210,.4)';c.fillRect(x-1.2,yy,2.4,4);}
    for(const q of [[206,236,26],[434,236,26],[262,330,18],[378,330,18],[320,396,16]]){c.fillStyle='#1b2e28';path(c,[[q[0]-q[2]*.4,y+q[1]],[q[0]-q[2]*.3,y+q[1]-q[2]],[q[0]+q[2]*.2,y+q[1]-q[2]*1.15],[q[0]+q[2]*.42,y+q[1]]],1);c.fill();c.strokeStyle='rgba(140,232,208,.5)';c.lineWidth=1.1;c.beginPath();c.moveTo(q[0]-3,y+q[1]-q[2]*.3);c.lineTo(q[0]+1,y+q[1]-q[2]*.8);c.lineTo(q[0]+4,y+q[1]-q[2]*.45);c.stroke();}
    for(const q of [[170,470],[470,470],[110,720],[530,720],[228,570],[406,560]])lantern(c,q[0],y+q[1],'#7fe0c0');
    sigil(c,320,y+650,82,p.acc,1);runeBed(c,320,y+650);
    c.fillStyle='rgba(200,235,240,.08)';for(let k=0;k<9;k++){const t=k/8,x=lerp(210,430,t),yy=y+560+Math.sin(t*PI)*-30;c.beginPath();c.ellipse(x,yy,5,7,0,0,TAU);c.fill();for(let j=-1;j<2;j++){c.beginPath();c.arc(x+j*5,yy-10,2.2,0,TAU);c.fill();}}
    c.fillStyle='#0b1512';[[206,300,20,2],[434,300,20,2],[282,390,14,0],[358,390,14,0]].forEach(q=>tomb(c,q[0],y+q[1],q[2],q[3],'#132420'));
  },
  function hollow(c,y,p){ // graveyard, road, chapel window
    c.strokeStyle='rgba(180,160,120,.07)';c.lineWidth=74;c.lineCap='round';c.beginPath();c.moveTo(303,y+920);c.bezierCurveTo(250,y+760,360,y+640,303,y+520);c.stroke();
    c.strokeStyle='rgba(0,0,0,.2)';c.lineWidth=1.5;c.setLineDash([9,7]);c.beginPath();c.moveTo(303,y+920);c.bezierCurveTo(250,y+760,360,y+640,303,y+520);c.stroke();c.setLineDash([]);
    let g=c.createRadialGradient(320,y+250,10,320,y+250,200);g.addColorStop(0,'rgba(150,190,240,.14)');g.addColorStop(1,'rgba(150,190,240,0)');c.fillStyle=g;c.fillRect(20,y,600,500);
    chapel(c,478,y+286);
    // tavern roof and windows
    c.fillStyle='#161019';path(c,[[258,y+410],[303,y+372],[348,y+410],[340,y+410],[340,y+400],[266,y+400],[266,y+410]],1);c.fill();c.strokeStyle='rgba(255,190,110,.4)';c.lineWidth=1.2;c.stroke();
    fence(c,150,y+212,238,y+196,'rgba(150,175,220,.32)');fence(c,402,y+196,490,y+212,'rgba(150,175,220,.32)');fence(c,176,y+404,236,y+418,'rgba(150,175,220,.28)');
    for(const q of [[186,772],[420,772],[214,470],[392,470],[120,560],[486,560]])lantern(c,q[0],y+q[1],'#ffb050');
    const tc='#3a4a6c';[[188,262,22,0],[214,344,18,1],[452,262,22,2],[428,344,18,1],[250,392,16,0],[392,392,16,2],[150,318,18,2],[492,318,18,0],[320,372,14,1],[122,236,16,1],[520,236,16,0]].forEach(q=>tomb(c,q[0],y+q[1],q[2],q[3],tc));
    tree(c,118,y+640,84,5,'#0b1220');tree(c,488,y+640,84,11,'#0b1220');tree(c,150,y+190,60,2,'#0b1220');tree(c,492,y+190,60,6,'#0b1220');
    rose(c,474,y+352,34,['#e0a040','#c0283c','#3a6fc0','#7a3a9a']);
    [[104,340,46],[138,372,38],[86,372,34]].forEach((q,k)=>pine(c,q[0],y+q[1],q[2],k%2?'#0a1220':'#0e182a'));
    sigil(c,303,y+650,82,p.acc2,2);runeBed(c,303,y+650);
    g=c.createRadialGradient(303,y+450,4,303,y+450,90);g.addColorStop(0,'rgba(255,170,70,.22)');g.addColorStop(1,'rgba(255,170,70,0)');c.fillStyle=g;c.fillRect(203,y+360,200,190);
  }];
function drawGrave(c){const y=GY,p=PAL[3],shape=T.coffin.concat([[420,y+663],[366,HW+70],[274,HW+70],[220,y+663]]);
  // the earth between the Hollow and the coffin
  c.save();c.beginPath();c.rect(0,H+6,W,HW-H+200);c.clip();
  let g=c.createLinearGradient(0,H,0,HW);g.addColorStop(0,'#17110b');g.addColorStop(.25,'#0d0a07');g.addColorStop(1,'#040404');c.fillStyle=g;c.fillRect(0,H,W,HW-H+200);
  for(let k=0;k<220;k++){const x=hash(k*3.1)*W,yy=H+14+hash(k*7.7)*(HW-H+40),r=2+hash(k*1.3)*8;c.fillStyle='rgba('+(70+hash(k)*40|0)+','+(58+hash(k+1)*30|0)+','+(44+hash(k+2)*20|0)+','+(.18+hash(k+3)*.3)+')';c.beginPath();c.ellipse(x,yy,r*1.4,r,hash(k)*3,0,TAU);c.fill();}
  c.lineCap='round';for(let k=0;k<11;k++){let x=30+k*58+hash(k)*30,yy=H+6;const len=90+hash(k*2.2)*230;c.strokeStyle='rgba(96,72,44,.55)';for(let q=0;q<len;q+=12){const nx=x+Math.sin(q*.07+k)*9+(hash(k+q)-.5)*8;c.lineWidth=Math.max(.8,5*(1-q/len));c.beginPath();c.moveTo(x,yy+q);c.lineTo(nx,yy+q+12);c.stroke();x=nx;}}
  c.strokeStyle='rgba(214,206,180,.4)';c.fillStyle='rgba(214,206,180,.4)';for(let k=0;k<16;k++){const x=30+hash(k*5.3)*580,yy=H+40+hash(k*9.1)*(HW-H-60),a=hash(k*2.7)*PI,l=9+hash(k)*8;if(x>70&&x<570&&yy>y+10&&yy<y+690)continue;
    c.lineWidth=3;c.beginPath();c.moveTo(x-Math.cos(a)*l,yy-Math.sin(a)*l);c.lineTo(x+Math.cos(a)*l,yy+Math.sin(a)*l);c.stroke();for(const sg of [-1,1]){c.beginPath();c.arc(x+sg*Math.cos(a)*l,yy+sg*Math.sin(a)*l,3,0,TAU);c.fill();}}
  c.restore();
  // the coffin
  c.lineJoin='round';path(c,shape,1);c.strokeStyle='#120b06';c.lineWidth=40;c.stroke();c.strokeStyle='#3a2616';c.lineWidth=30;c.stroke();c.strokeStyle='#553920';c.lineWidth=24;c.stroke();
  c.save();path(c,shape,1);c.clip();g=c.createLinearGradient(0,y,0,y+700);g.addColorStop(0,p.a);g.addColorStop(1,p.b);c.fillStyle=g;c.fillRect(0,y-10,W,900);
  for(let x=40;x<620;x+=44){c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x+(hash(x)-.5)*6,y+800);c.stroke();c.strokeStyle='rgba(255,220,160,.035)';c.lineWidth=1;for(let q=1;q<4;q++){c.beginPath();c.moveTo(x+q*11,y);c.lineTo(x+q*11+(hash(x+q)-.5)*10,y+800);c.stroke();}
    c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(x+22,y+80+hash(x*1.7)*560,5,9,0,0,TAU);c.fill();}
  g=c.createRadialGradient(320,y+150,10,320,y+150,340);g.addColorStop(0,'rgba(234,255,208,.26)');g.addColorStop(1,'rgba(234,255,208,0)');c.fillStyle=g;c.fillRect(0,y,W,560);
  c.fillStyle='rgba(125,255,176,.06)';c.strokeStyle='rgba(125,255,176,.2)';c.lineWidth=1.5;path(c,[[312,y+300],[328,y+300],[328,y+356],[372,y+356],[372,y+372],[328,y+372],[328,y+560],[312,y+560],[312,y+372],[268,y+372],[268,y+356],[312,y+356]],1);c.fill();c.stroke();
  c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=2;for(const sx of [-1,1])for(let k=0;k<4;k++){c.beginPath();c.moveTo(320+sx*(150+k*9),y+380);c.lineTo(320+sx*(128+k*9),y+470);c.stroke();}
  c.restore();
  path(c,T.coffin);c.strokeStyle='#030307';c.lineWidth=7;c.stroke();c.strokeStyle='rgba(160,230,180,.38)';c.lineWidth=1.6;c.stroke();
  for(const sd of [-1,1]){path(c,[[320+sd*100,y+663],[320+sd*46,HW+70]]);c.strokeStyle='#030307';c.lineWidth=6;c.stroke();c.strokeStyle='rgba(160,230,180,.25)';c.lineWidth=1.4;c.stroke();}
  c.textAlign='center';c.textBaseline='middle';c.font='600 30px '+R.fontD;for(const x of [96,544]){c.fillStyle='#000';c.fillText('The Grave',x+1,y+62);c.fillStyle='rgba(157,255,200,.45)';c.fillText('The Grave',x,y+60);}
}
/* ---------- sprites ---------- */
function eyes(c,x,y,dx,r,col){c.fillStyle=col;c.beginPath();c.arc(x-dx,y,r,0,TAU);c.arc(x+dx,y,r,0,TAU);c.fill();c.fillStyle='#fff';c.globalAlpha=.7;c.beginPath();c.arc(x-dx,y,r*.4,0,TAU);c.arc(x+dx,y,r*.4,0,TAU);c.fill();c.globalAlpha=1;}
const EDRAW={
  skeleton(c){c.fillStyle='#d9d2bd';c.beginPath();c.arc(0,-2,13,0,TAU);c.fill();c.fillRect(-8,6,16,9);c.fillStyle='#0a0a0e';c.beginPath();c.arc(-5,-2,4,0,TAU);c.arc(5,-2,4,0,TAU);c.fill();c.beginPath();c.moveTo(0,3);c.lineTo(-2,7);c.lineTo(2,7);c.fill();
    c.strokeStyle='#0a0a0e';c.lineWidth=1.2;for(let k=-2;k<3;k++){c.beginPath();c.moveTo(k*3,9);c.lineTo(k*3,15);c.stroke();}eyes(c,0,-2,5,1.8,'#7dffb0');},
  goblin(c){c.fillStyle='#6f9a4a';c.beginPath();c.moveTo(-9,-4);c.lineTo(-20,-12);c.lineTo(-11,4);c.fill();c.beginPath();c.moveTo(9,-4);c.lineTo(20,-12);c.lineTo(11,4);c.fill();c.beginPath();c.arc(0,0,12,0,TAU);c.fill();
    c.fillStyle='#34521f';c.beginPath();c.arc(0,-6,12,PI,TAU);c.fill();eyes(c,0,-1,4.5,2.6,'#ffe14a');c.strokeStyle='#1a2a10';c.lineWidth=1.6;c.beginPath();c.arc(0,3,6,.2,PI-.2);c.stroke();c.fillStyle='#eee';c.fillRect(-4,6,2,3);c.fillRect(2,6,2,3);},
  wolf(c){c.fillStyle='#6c7786';c.beginPath();c.moveTo(-11,-6);c.lineTo(-13,-18);c.lineTo(-3,-10);c.fill();c.beginPath();c.moveTo(11,-6);c.lineTo(13,-18);c.lineTo(3,-10);c.fill();
    c.beginPath();c.moveTo(-13,-6);c.lineTo(13,-6);c.lineTo(6,12);c.lineTo(0,16);c.lineTo(-6,12);c.closePath();c.fill();c.fillStyle='#3d4653';c.beginPath();c.moveTo(-4,4);c.lineTo(4,4);c.lineTo(0,16);c.fill();
    c.fillStyle='#0a0a0e';c.beginPath();c.arc(0,13,2.4,0,TAU);c.fill();eyes(c,0,-1,5.5,2.2,'#ffb030');},
  spirit(c){c.globalAlpha=.75;c.fillStyle='#9be8e0';c.beginPath();c.arc(0,-3,13,PI,TAU);c.lineTo(13,12);c.lineTo(8,8);c.lineTo(4,13);c.lineTo(0,8);c.lineTo(-4,13);c.lineTo(-8,8);c.lineTo(-13,12);c.closePath();c.fill();c.globalAlpha=1;
    c.fillStyle='#06242a';c.beginPath();c.ellipse(-5,-3,3,4.5,0,0,TAU);c.ellipse(5,-3,3,4.5,0,0,TAU);c.fill();c.beginPath();c.ellipse(0,5,2.5,3.5,0,0,TAU);c.fill();},
  cultist(c){c.fillStyle='#4a2e66';c.beginPath();c.moveTo(0,-17);c.quadraticCurveTo(15,-8,13,12);c.lineTo(-13,12);c.quadraticCurveTo(-15,-8,0,-17);c.fill();c.fillStyle='#0a0610';c.beginPath();c.ellipse(0,-1,7.5,9,0,0,TAU);c.fill();
    eyes(c,0,-2,3.5,1.8,'#ff4060');c.strokeStyle='#d9a441';c.lineWidth=1.3;c.beginPath();c.moveTo(-13,12);c.lineTo(13,12);c.stroke();},
  revenant(c){c.fillStyle='#8a96a3';c.beginPath();c.arc(0,-2,14,PI,TAU);c.lineTo(14,12);c.lineTo(-14,12);c.closePath();c.fill();c.fillStyle='#5a6672';c.fillRect(-2,-16,4,28);c.fillStyle='#0a0a0e';c.fillRect(-10,-3,20,5);
    eyes(c,0,-.5,5,1.7,'#7dffb0');c.fillStyle='#0a0a0e';for(let k=-2;k<3;k++)c.fillRect(k*4-.6,5,1.2,6);},
  knight(c){c.fillStyle='#d9d2bd';c.beginPath();c.moveTo(-12,-8);c.quadraticCurveTo(-22,-14,-18,-22);c.quadraticCurveTo(-14,-14,-8,-13);c.fill();c.beginPath();c.moveTo(12,-8);c.quadraticCurveTo(22,-14,18,-22);c.quadraticCurveTo(14,-14,8,-13);c.fill();
    c.fillStyle='#5a2030';c.beginPath();c.arc(0,-3,15,PI,TAU);c.lineTo(13,14);c.lineTo(0,17);c.lineTo(-13,14);c.closePath();c.fill();c.fillStyle='#0a0a0e';c.beginPath();c.moveTo(-11,-3);c.lineTo(11,-3);c.lineTo(3,3);c.lineTo(3,11);c.lineTo(-3,11);c.lineTo(-3,3);c.closePath();c.fill();eyes(c,0,-1,5,1.8,'#ff4040');},
  troll(c){c.fillStyle='#4d6b52';c.beginPath();c.ellipse(0,0,23,21,0,0,TAU);c.fill();c.fillStyle='#34493a';c.beginPath();c.ellipse(0,-10,23,12,0,PI,TAU);c.fill();c.fillStyle='#e6dfc4';c.beginPath();c.moveTo(-10,8);c.lineTo(-8,-3);c.lineTo(-5,8);c.fill();c.beginPath();c.moveTo(10,8);c.lineTo(8,-3);c.lineTo(5,8);c.fill();
    c.fillStyle='#1a2a1c';c.beginPath();c.ellipse(0,11,10,5,0,0,TAU);c.fill();eyes(c,0,-5,8,3,'#ffcf40');c.fillStyle='#34493a';c.beginPath();c.arc(-17,-14,5,0,TAU);c.arc(17,-14,5,0,TAU);c.fill();}
};
const BDRAW={
  warden(c){c.fillStyle='#d9d2bd';c.beginPath();c.moveTo(-26,-14);c.quadraticCurveTo(-50,-22,-44,-48);c.quadraticCurveTo(-34,-28,-18,-28);c.fill();c.beginPath();c.moveTo(26,-14);c.quadraticCurveTo(50,-22,44,-48);c.quadraticCurveTo(34,-28,18,-28);c.fill();
    const g=c.createLinearGradient(0,-36,0,36);g.addColorStop(0,'#8795a8');g.addColorStop(1,'#3c4656');c.fillStyle=g;c.beginPath();c.arc(0,-6,32,PI,TAU);c.lineTo(30,26);c.lineTo(0,36);c.lineTo(-30,26);c.closePath();c.fill();
    c.fillStyle='#07070b';c.fillRect(-22,-8,44,30);c.strokeStyle='#8795a8';c.lineWidth=3;for(let k=-2;k<3;k++){c.beginPath();c.moveTo(k*9,-8);c.lineTo(k*9,22);c.stroke();}c.beginPath();c.moveTo(-22,6);c.lineTo(22,6);c.stroke();eyes(c,0,-1,9,3.4,'#9fd8ff');
    c.strokeStyle='#c9cfe6';c.lineWidth=2;c.beginPath();c.arc(0,-6,32,PI,TAU);c.stroke();},
  necro(c){c.fillStyle='#1c1230';c.beginPath();c.moveTo(0,-46);c.quadraticCurveTo(40,-24,34,34);c.lineTo(-34,34);c.quadraticCurveTo(-40,-24,0,-46);c.fill();c.strokeStyle='#7dffb0';c.lineWidth=1.6;c.stroke();
    c.fillStyle='#e6dfc4';c.beginPath();c.arc(0,-6,17,0,TAU);c.fill();c.fillRect(-10,6,20,12);c.fillStyle='#07070b';c.beginPath();c.arc(-7,-7,5.5,0,TAU);c.arc(7,-7,5.5,0,TAU);c.fill();c.beginPath();c.moveTo(0,0);c.lineTo(-3,6);c.lineTo(3,6);c.fill();
    c.strokeStyle='#07070b';c.lineWidth=1.4;for(let k=-2;k<3;k++){c.beginPath();c.moveTo(k*4,10);c.lineTo(k*4,18);c.stroke();}eyes(c,0,-7,7,2.6,'#7dffb0');
    c.fillStyle='#e6dfc4';for(let k=-2;k<3;k++){c.beginPath();c.moveTo(k*8-3,-22);c.lineTo(k*8,-34-(2-Math.abs(k))*4);c.lineTo(k*8+3,-22);c.fill();}},
  beast(c){c.fillStyle='#dfe8f2';c.beginPath();c.moveTo(-26,-14);c.lineTo(-32,-46);c.lineTo(-8,-26);c.fill();c.beginPath();c.moveTo(26,-14);c.lineTo(32,-46);c.lineTo(8,-26);c.fill();
    const g=c.createLinearGradient(0,-30,0,40);g.addColorStop(0,'#eef4fa');g.addColorStop(1,'#8fa0b4');c.fillStyle=g;c.beginPath();c.moveTo(-34,-16);c.lineTo(34,-16);c.lineTo(30,6);c.lineTo(14,30);c.lineTo(0,40);c.lineTo(-14,30);c.lineTo(-30,6);c.closePath();c.fill();
    c.fillStyle='#5d6c80';c.beginPath();c.moveTo(-10,8);c.lineTo(10,8);c.lineTo(0,40);c.fill();c.fillStyle='#07070b';c.beginPath();c.arc(0,33,5,0,TAU);c.fill();eyes(c,0,-4,13,4.4,'#6fc6ff');
    c.fillStyle='#fff';c.beginPath();c.moveTo(-12,22);c.lineTo(-9,34);c.lineTo(-6,24);c.fill();c.beginPath();c.moveTo(12,22);c.lineTo(9,34);c.lineTo(6,24);c.fill();
    c.strokeStyle='#6fc6ff';c.lineWidth=2.4;c.beginPath();c.arc(3,-22,7,.6,TAU-.9);c.stroke();},
  dragon(c){c.fillStyle='#2a1a16';c.beginPath();c.moveTo(-20,-8);c.lineTo(-64,-30);c.lineTo(-56,-6);c.lineTo(-66,8);c.lineTo(-44,8);c.lineTo(-48,24);c.lineTo(-22,12);c.fill();c.beginPath();c.moveTo(20,-8);c.lineTo(64,-30);c.lineTo(56,-6);c.lineTo(66,8);c.lineTo(44,8);c.lineTo(48,24);c.lineTo(22,12);c.fill();
    c.fillStyle='#e6dfc4';c.beginPath();c.moveTo(-18,-20);c.quadraticCurveTo(-34,-34,-26,-56);c.quadraticCurveTo(-20,-36,-8,-30);c.fill();c.beginPath();c.moveTo(18,-20);c.quadraticCurveTo(34,-34,26,-56);c.quadraticCurveTo(20,-36,8,-30);c.fill();
    const g=c.createLinearGradient(0,-30,0,44);g.addColorStop(0,'#e9e2c8');g.addColorStop(1,'#9a8f72');c.fillStyle=g;c.beginPath();c.moveTo(-26,-22);c.lineTo(26,-22);c.lineTo(30,-2);c.lineTo(16,22);c.lineTo(12,44);c.lineTo(-12,44);c.lineTo(-16,22);c.lineTo(-30,-2);c.closePath();c.fill();
    c.fillStyle='#07070b';c.beginPath();c.moveTo(-22,-10);c.lineTo(-6,-4);c.lineTo(-10,6);c.lineTo(-22,2);c.fill();c.beginPath();c.moveTo(22,-10);c.lineTo(6,-4);c.lineTo(10,6);c.lineTo(22,2);c.fill();c.beginPath();c.ellipse(-5,36,2.5,4,0,0,TAU);c.ellipse(5,36,2.5,4,0,0,TAU);c.fill();
    eyes(c,0,-2,14,3.6,'#ff7a30');c.fillStyle='#fff';for(let k=-2;k<3;k++){if(!k)continue;c.beginPath();c.moveTo(k*5-2,44);c.lineTo(k*5,52);c.lineTo(k*5+2,44);c.fill();}}
};
function buildSprites(){
  for(const k in EDRAW){const cv=mkCanvas(128,128),c=cv.getContext('2d');c.translate(64,64);c.scale(2,2);c.lineJoin='round';
    c.fillStyle='rgba(0,0,0,.45)';c.beginPath();c.ellipse(0,ENEMY[k].r+3,ENEMY[k].r*.9,5,0,0,TAU);c.fill();EDRAW[k](c);R.spr[k]=cv;}
  for(const k in BDRAW){const cv=mkCanvas(320,320),c=cv.getContext('2d');c.translate(160,160);c.scale(2,2);c.lineJoin='round';BDRAW[k](c);R.spr['b_'+k]=cv;}
  for(const k in CLASSES){const cl=CLASSES[k],cv=mkCanvas(64,64),c=cv.getContext('2d');c.translate(32,32);
    const g=c.createRadialGradient(-8,-9,2,0,0,28);g.addColorStop(0,'#ffffff');g.addColorStop(.25,cl.color);g.addColorStop(1,'#11121c');c.fillStyle=g;c.beginPath();c.arc(0,0,28,0,TAU);c.fill();
    c.strokeStyle='rgba(0,0,0,.55)';c.lineWidth=2.5;c.beginPath();
    if(cl.sig==='shield'){c.moveTo(-10,-12);c.lineTo(10,-12);c.lineTo(10,2);c.lineTo(0,14);c.lineTo(-10,2);c.closePath();}
    else if(cl.sig==='dagger'){c.moveTo(0,-16);c.lineTo(4,4);c.lineTo(-4,4);c.closePath();c.moveTo(-9,5);c.lineTo(9,5);c.moveTo(0,5);c.lineTo(0,15);}
    else if(cl.sig==='star'){for(let i=0;i<=5;i++){const a=-PI/2+i*2*TAU/5;c.lineTo(Math.cos(a)*15,Math.sin(a)*15);}}
    else{c.arc(0,0,7,0,TAU);for(let i=0;i<8;i++){const a=i*TAU/8;c.moveTo(Math.cos(a)*10,Math.sin(a)*10);c.lineTo(Math.cos(a)*16,Math.sin(a)*16);}}
    c.stroke();c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1.5;c.beginPath();c.arc(0,0,27,0,TAU);c.stroke();R.spr['ball_'+k]=cv;}
}

/* ================= AUDIO (all synthesized) ================= */
const A={ctx:null,sfx:null,mus:null,last:{},vol:store.get('vol',{m:.55,s:.8}),step:0,next:0,timer:null,
  init(){if(A.ctx){if(A.ctx.state==='suspended')A.ctx.resume();return;}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    try{const x=A.ctx=new AC();const comp=x.createDynamicsCompressor();comp.connect(x.destination);
      A.sfx=x.createGain();A.sfx.gain.value=A.vol.s;A.sfx.connect(comp);
      A.mus=x.createGain();A.mus.gain.value=A.vol.m*.7;A.mus.connect(comp);
      const d=x.createDelay(1);d.delayTime.value=.34;const fb=x.createGain();fb.gain.value=.38;const lp=x.createBiquadFilter();lp.frequency.value=1800;
      A.wet=x.createGain();A.wet.gain.value=.6;A.wet.connect(d);A.wet.connect(A.mus);d.connect(lp);lp.connect(fb);fb.connect(d);lp.connect(A.mus);
      const nb=x.createBuffer(1,x.sampleRate,x.sampleRate),ch=nb.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1;A.nb=nb;
      // drone
      const dg=x.createGain();dg.gain.value=.05;const dl=x.createBiquadFilter();dl.frequency.value=240;dl.connect(dg);dg.connect(A.mus);
      for(const f of [73.42,73.9,36.71]){const o=x.createOscillator();o.type='sawtooth';o.frequency.value=f;o.connect(dl);o.start();}
      A.next=x.currentTime+.2;A.timer=setInterval(A.sched,120);}catch(e){A.ctx=null;}},
  setVol(){store.set('vol',A.vol);if(A.ctx){A.sfx.gain.value=A.vol.s;A.mus.gain.value=A.vol.m*.7;}},
  tone(f,dur,type,vol,to,delay,bus){const x=A.ctx,t=x.currentTime+(delay||0),o=x.createOscillator(),g=x.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);
    if(to)o.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+dur);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.006);g.gain.exponentialRampToValueAtTime(.0005,t+dur);
    o.connect(g);g.connect(bus||A.sfx);o.start(t);o.stop(t+dur+.02);return g;},
  noise(dur,vol,freq,to,type,delay,q){const x=A.ctx,t=x.currentTime+(delay||0),s=x.createBufferSource(),f=x.createBiquadFilter(),g=x.createGain();s.buffer=A.nb;s.loop=true;
    f.type=type||'lowpass';f.frequency.setValueAtTime(freq,t);if(to)f.frequency.exponentialRampToValueAtTime(to,t+dur);f.Q.value=q||.8;
    g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0005,t+dur);s.connect(f);f.connect(g);g.connect(A.sfx);s.start(t,Math.random()*.5);s.stop(t+dur+.02);},
  arp(notes,step,type,vol,dur){notes.forEach((n,i)=>A.tone(n,dur||.22,type||'triangle',vol||.12,0,i*step));},
  s(name,arg){if(!A.ctx||G.demo||A.ctx.state!=='running')return;const now=A.ctx.currentTime;if(now-(A.last[name]||0)<.035)return;A.last[name]=now;const T_=A.tone,N=A.noise;
    switch(name){
    case 'flip':N(.05,.35,1400,300);T_(120,.06,'square',.12,60);break;
    case 'flipDown':N(.03,.1,700,300);break;
    case 'knock':N(.04,Math.min(.22,(arg||200)/2600),1800,500);break;
    case 'sling':T_(340,.09,'square',.12,110);N(.06,.25,2400,800);break;
    case 'bump':{const f=[196,262,330,147,220,165,247][arg||0]*pick([1,1.19,1.5]);T_(f,.2,'triangle',.22,f*.7);T_(f*2,.08,'square',.05);N(.04,.25,3000,900);break;}
    case 'bell':T_(392,1.4,'sine',.2);T_(392*2.76,1,'sine',.08);T_(392*5.4,.6,'sine',.04);T_(196,1.6,'sine',.1);N(.03,.2,4000,2000);break;
    case 'target':T_(880,.1,'square',.08);T_(1320,.14,'triangle',.1,0,.03);break;
    case 'drop':T_(240,.12,'sawtooth',.12,90);N(.08,.3,900,200);break;
    case 'lane':T_(660,.09,'sine',.12);T_(990,.14,'sine',.1,0,.06);break;
    case 'spin':T_(1100+rand(200),.03,'square',.04);break;
    case 'orbit':N(.35,.2,500,4000,'bandpass',0,3);break;
    case 'rampIn':N(.5,.22,400,3200,'bandpass',0,4);break;
    case 'ramp':A.arp([523,659,784],.06,'triangle',.11);break;
    case 'hole':T_(220,.35,'sine',.2,70);N(.2,.15,500,120);break;
    case 'eject':N(.1,.3,700,2500);T_(110,.14,'square',.1,330);break;
    case 'chute':N(.9,.25,220,90);T_(90,.9,'sine',.12,50);break;
    case 'launch':N(.28,.3,600,3500,'bandpass',0,2);T_(80,.25,'sawtooth',.12,420);break;
    case 'hit':N(.06,.3,1800,400);T_(170,.07,'square',.1,90);break;
    case 'kill':T_(320,.28,'sawtooth',.12,50);N(.22,.25,2600,300);break;
    case 'clank':T_(1450,.07,'square',.07);T_(2130,.1,'square',.05);break;
    case 'hurt':T_(150,.32,'sawtooth',.2,60);N(.15,.2,500,150);break;
    case 'curse':T_(520,.5,'sine',.12,180);T_(533,.5,'sine',.1,190);break;
    case 'interrupt':A.arp([1568,2093,2637],.04,'sine',.1,.25);N(.15,.15,5000,2000,'highpass');break;
    case 'quest':A.arp([587,880],.12,'sine',.14,.5);break;
    case 'questDone':A.arp([587,740,880,1175],.09,'triangle',.13,.45);break;
    case 'level':A.arp([392,494,587,784,988],.08,'triangle',.14,.5);break;
    case 'bank':A.arp([659,784,988],.05,'square',.07,.2);break;
    case 'jackpot':A.arp([784,988,1175,1568,1175,1568],.055,'square',.08,.22);break;
    case 'multiball':A.arp([294,370,440,587,740,880,1175],.07,'sawtooth',.08,.4);N(.9,.2,300,5000,'bandpass',0,2);break;
    case 'boss':T_(55,1.6,'sawtooth',.25,41);T_(58,1.6,'sawtooth',.2,43);N(1.2,.25,300,80);break;
    case 'bossHit':T_(95,.16,'square',.16,55);N(.1,.3,1200,300);break;
    case 'bossDie':T_(220,2,'sawtooth',.22,30);N(1.8,.4,3000,80);A.arp([587,740,880,1175,1480],.12,'triangle',.12,.8);break;
    case 'slam':T_(70,.6,'sawtooth',.28,30);N(.5,.4,900,80);break;
    case 'cast':T_(196,1,'sawtooth',.1,392);T_(199,1,'sawtooth',.08,398);break;
    case 'ward':T_(1175,.3,'sine',.12);T_(1760,.4,'sine',.08,0,.05);break;
    case 'summon':T_(98,.8,'triangle',.18,147);N(.6,.15,400,1500,'bandpass');break;
    case 'drain':T_(330,.8,'triangle',.18,45);N(.5,.15,800,100);break;
    case 'save':A.arp([440,660,880],.07,'sine',.13);break;
    case 'kick':T_(180,.2,'sawtooth',.15,1400);N(.12,.3,3000,800);break;
    case 'tilt':T_(62,1.1,'sawtooth',.25);T_(65,1.1,'square',.1);break;
    case 'nudge':T_(70,.14,'sine',.3,40);N(.07,.2,400,120);break;
    case 'ability':A.arp([440,554,659,880,1109],.045,'sine',.12,.6);N(.5,.12,6000,1500,'highpass');break;
    case 'pickup':T_(1245,.07,'sine',.12);T_(1865,.16,'sine',.1,0,.06);break;
    case 'lock':T_(196,.3,'square',.12);T_(147,.4,'square',.12,0,.15);break;
    case 'choice':A.arp([392,587],.1,'triangle',.1,.3);break;
    case 'pick':A.arp([587,880,1175],.06,'triangle',.12,.25);break;
    case 'deny':T_(140,.15,'square',.1);break;
    case 'ui':T_(700,.04,'triangle',.06);break;
    case 'ballEnd':A.arp([440,415,370,294],.16,'triangle',.13,.5);break;
    case 'over':A.arp([294,277,233,220,147],.3,'triangle',.15,1.2);break;
    case 'victory':A.arp([294,370,440,587,740,880,1175,1480],.11,'triangle',.14,.7);break;}},
  // generative music: D minor, slow harp over pads, a low bell every fourth bar; bosses add a pulse
  sched(){const x=A.ctx;if(!x||x.state!=='running')return;const boss=(!!(G.boss&&G.boss.alive)||G.inGrave)&&!G.demo,quiet=G.mode==='title';
    const rly=G.rallyT>0&&!G.demo,beat=rly?.2:boss?.3:.4;while(A.next<x.currentTime+.3){const st=A.step++,bar=(st/8|0)%4,k=st%8,t=A.next-x.currentTime;
      const ch=[[146.8,174.6,220],[116.5,146.8,174.6],[98,116.5,146.8],[110,138.6,164.8]][bar];
      if(k===0){for(const f of ch)A.tone(f,beat*8.5,'triangle',.035,0,t,A.mus);A.tone(ch[0]/2,beat*8,'sine',.07,0,t,A.mus);
        if(bar===0&&((st/32|0)%2===0)){A.tone(146.8,3,'sine',.07,0,t,A.wet);A.tone(146.8*2.76,2,'sine',.02,0,t,A.wet);}}
      const pat=[0,1,2,1,0,2,1,2][k],oct=[2,2,2,4,2,2,4,2][(k+bar)%8],tier=G.focusTier;
      if(!quiet||k%2===0){if(Math.random()>.18)A.tone(ch[pat]*oct*(tier===0&&k===3?.5:1),beat*2.2,tier===1?'sine':'triangle',.045,0,t,A.wet);}
      if(boss&&!rly){A.tone(ch[0]/2,beat*.8,'sawtooth',.05,0,t,A.mus);if(k%2===0)A.tone(70,.12,'sine',.16,35,t,A.mus);}
      if(rly){A.tone(k%2?62:52,.16,'sine',.22,30,t,A.mus);if(k%2)A.tone(ch[0]/2,beat*.9,'sawtooth',.06,0,t,A.mus);A.tone(ch[(k+bar)%3]*4,beat*.7,'square',.022,0,t,A.wet);if(k===4)A.tone(196,.08,'triangle',.08,0,t,A.mus);}
      A.next+=beat;}}
};

/* ================= UI, INPUT, LOOP ================= */
const $=id=>document.getElementById(id),VERSION='3D build 0.20';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
G.opt=store.get('opt',{shake:!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)});
const UI={cur:null,q:[],busy:false,eraseArmed:false,
  popup(title,sub,kind,note){if(kind==='good')UI.q=UI.q.filter(p=>p.kind!=='good');UI.q.push({title,sub,kind,note});if(UI.q.length>4)UI.q.splice(0,UI.q.length-4);if(!UI.busy)UI.next();},
  next(){const p=UI.q.shift(),el=$('banner');if(!p){UI.busy=false;el.textContent='';return;}UI.busy=true;el.textContent='';
    const d=document.createElement('div');d.className='bn k-'+p.kind;for(const [tag,txt] of [['h2',p.title],['p',p.sub],['small',p.note]]){if(!txt)continue;const n=document.createElement(tag);n.textContent=txt;d.appendChild(n);}
    const dur=(p.note?3.8:p.kind==='good'||p.kind==='info'?1.7:p.sub?2.3:1.5)*(UI.q.length>1?.65:1);d.style.animationDuration=dur+'s';el.appendChild(d);setTimeout(UI.next,dur*1000+40);},
  objText(q){const o=qCur(q);if(!o)return '';return o.text+(o.n>1?' ('+Math.min(q.prog,o.n)+'/'+o.n+')':'')+(q.tl>0?' — '+Math.ceil(q.tl)+'s':'');},
  sync(force){const r=G.run,play=G.mode==='play'&&r&&!G.demo;$('hud').hidden=!play;$('pauseBtn').hidden=!play;$('app').classList.toggle('playing',!!play);
    if(!play){$('bossbar').hidden=true;G.cam.top=0;return;}if(!G.dirty&&!force)return;G.dirty=false;G.cam.top=0;const m=G.mods,c=CLASSES[r.cls];
    $('hScore').textContent=fmt(r.score);$('hLv').textContent='Lv '+r.level;$('hCls').textContent=c.name;$('hGold').textContent=r.gold;
    $('bHp').parentNode.hidden=!PLAYER_HP();$('bHp').style.width=clamp(r.hp/m.maxHp*100,0,100)+'%';$('tHp').textContent=Math.ceil(r.hp)+' / '+m.maxHp;$('bHp').parentNode.classList.toggle('low',r.hp<m.maxHp*.3);
    $('bXp').style.width=clamp(r.xp/xpNeed(r.level)*100,0,100)+'%';const armed=G.balls.some(b=>b.arm>0||b.pow),g=r.grave;$('bCh').style.width=clamp(r.charge,0,100)+'%';$('tCh').textContent=armed?c.shot+' armed':r.charge>=100?c.abil+' ready':c.shot;$('bCh').parentNode.classList.toggle('full',r.charge>=100);
    let b='';for(let i=1;i<r.ballsLeft;i++)b+='<i></i>';$('hBalls').innerHTML=b;$('hBallN').textContent='Ball '+r.ballNum;
    $('hObj').textContent=G.inGrave?(T.banks.nails.segs.some(x=>x.on)?'Drive both coffin nails at the head of the coffin':'The lid is split. Shoot the light'):G.focusTier>=4?wingText():r.main?UI.objText(r.main):'The Hollow is quiet. For now.';
    const chips=[];const ch=(t,k)=>chips.push('<span class="chip '+(k||'')+'">'+esc(t)+'</span>');
    if(G.pending.length)ch(G.pending[0]==='book'?'Level up waiting: shoot a scoop':G.pending[0]==='perk'?'A boon waits: shoot a scoop':'The Lantern waits','gold');if(r.mult>1)ch(r.mult+'x','gold');if(G.plunge.ready)ch(UI.touch?'Hold Nudge, release to launch':'Hold Space, release to launch','frost');if(G.save>0&&!G.plunge.ready)ch('Ball save '+Math.ceil(G.save)+'s','frost');if(r.shield)ch('Ward','gold');
    if(G.inGrave)ch('The lid closes in '+Math.ceil(G.graveT)+'s',G.graveT<8?'bad':'moss');else if(G.focusTier>=4)ch(WINGS[WING_KEYS[G.focusTier-4]].clock+Math.ceil(G.wingT||0)+'s',G.wingT<12?'bad':'moss');else if(G.wave.active)ch('Wave '+G.wave.active.n+' · '+G.wave.active.left+' left','bad');else if(g.open)ch('Grave open','moss');else if(g.hits>0)ch('Grave '+g.hits+'/'+g.need,'');
    if(armed)ch((G.balls.some(b=>b.pow)?c.shot:c.shot+' armed. Flip to release'),'violet');else if(r.charge>=33&&!G.plunge.ready)ch(r.charge>=100?'Cradle 1.5 s to Rally the party':'Cradle the ball: '+c.shot,'frost');
    if(G.rallyT>0)ch('Rally '+Math.ceil(G.rallyT)+'s','gold');for(const cs of G.casts)ch(spellDef(cs.id).name+' '+Math.ceil(cs.t)+'s','violet');
    for(const sl of SLOTS_ORDER){const d=spellOf(r.cls,sl);if(d&&spellRank(d.id)>=0&&!spellOn(d.id)&&G.focusTier<3)ch(d.name+': '+goalText(sl),'soft');}
    if(G.mb)ch(G.mb.name+' multiball','gold');if(r.lockLit)ch('Lock lit'+(r.locks?' '+r.locks+'/2':''),'moss');if(G.combo>1&&G.comboT>0)ch('Combo '+G.combo+'x','violet');
    if(G.buffs.sharp>0)ch('Sharpened','gold');if(G.buffs.stealth>0)ch('Shadowstrike','violet');if(G.buffs.aegis>0)ch('Aegis','frost');if(G.buffs.moon>0)ch('Moonlight 2x','frost');
    if(G.curse.dark>0)ch('Darkness','bad');if(G.curse.weak>0)ch('Weakened','bad');if(G.curse.hex>0)ch('Hexed','bad');if(G.curse.burn>0)ch('Burning','bad');
    if(G.tilt>0)ch(G.fallen?'Fallen':'Tilt','bad');$('hFx').innerHTML=chips.join('');
    const bo=G.boss,wk=G.focusTier<3?wakeInfo(G.focusTier):null,here=bo&&bo.alive&&bo.tier===G.focusTier;
    $('bossbar').hidden=!(here||(wk&&wk.state==='dormant')||(bo&&bo.alive));$('bossbar').classList.toggle('dormant',!here&&!!(wk&&wk.state==='dormant'));
    if(!here&&wk&&wk.state==='dormant'){$('bossName').textContent=BOSSES[wk.key].name;$('bossHp').style.width=Math.round(wk.fill*100)+'%';const nq=r.main&&qCur(r.main),nt=nq&&nq.t!=='boss'?UI.objText(r.main):'';$('bossPhase').textContent=(wk.fill<1?'Wakes with the main quest. Next: ':'Rising. ')+nt;}
    else if(bo&&bo.alive&&!here){$('bossName').textContent=bo.def.name;$('bossHp').style.width=clamp(bo.hp/bo.maxHp*100,0,100)+'%';$('bossPhase').textContent='Waiting on '+LEVEL_NAMES[bo.tier];}
    else if(bo&&bo.alive){$('bossName').textContent=bo.def.name;$('bossHp').style.width=clamp(bo.hp/bo.maxHp*100,0,100)+'%';
      $('bossPhase').textContent={shield:'Warded. Strike the lit bumpers',open:bo.stun>0?'Staggered. Double damage':'Exposed. Strike the boss',summon:'Summoning. Slay the minions',cast:'Casting '+bo.def.cast.name+'. Hit a red shot',frenzy:'Frenzy'}[bo.phase]||'';}
    // side panels
    let h='';if(r.main){const q=r.main;h+='<h4>'+esc(q.name)+'</h4><p class="flav">'+esc(q.text)+'</p><ol class="steps">';
      q.steps.forEach((o,i)=>{h+='<li class="'+(i<q.si?'done':i===q.si?'cur':'')+'"><b>'+(q.stages||STAGES)[i]+'</b>'+(i<q.si?'<span>'+esc(o.text)+'</span>':i===q.si?'<span>'+esc(UI.objText(q))+'</span>':'')+'</li>';});h+='</ol>';}
    else h='<p class="flav">The kingdom breathes. Something else is already stirring.</p>';$('jMain').innerHTML=h;
    h='';for(const q of r.side)h+='<div class="sq"><h4>'+esc(q.name)+'</h4><em>'+esc(q.giver)+'</em><span>'+esc(UI.objText(q))+'</span></div>';
    $('jSide').innerHTML=h||'<p class="flav">No errands. The Tavern always has work.</p>';
    const cnt={};r.perks.forEach(p=>cnt[p]=(cnt[p]||0)+1);const rc={};r.relics.forEach(p=>rc[p]=(rc[p]||0)+1);
    h='<h4 style="color:'+c.color+'">'+c.name+'</h4><p class="flav">'+esc(c.tag)+'</p><dl><dt>Level</dt><dd>'+r.level+'</dd><dt>Power</dt><dd>'+Math.round(m.pow)+'</dd><dt>Crit</dt><dd>'+Math.round(m.crit*100)+'%</dd><dt>Gold</dt><dd>'+r.gold+'</dd><dt>Slain</dt><dd>'+r.kills+'</dd><dt>Threat</dt><dd>'+r.threat+'</dd></dl>'+
      '<h3>Powers</h3><p class="pw"><b>Nudge: '+esc(c.nudge)+'.</b> '+esc(c.nudgeText)+'</p><p class="pw"><b>Cradle: '+esc(c.shot)+'.</b> '+esc(c.shotText)+'</p><p class="pw"><b>Full meter: Rally.</b> Cradle 1.5 s and the party comes out.</p><h3>Spellbook</h3>'+SLOTS_ORDER.map(sl=>{const d=spellOf(r.cls,sl),rk=spellRank(d.id);return '<p class="pw"'+(rk<0?' style="opacity:.5"':'')+'><b>'+esc(d.name)+(rk>=0?' '+(rk+1):'')+'.</b> '+(rk<0?'Locked. ':'')+esc(SLOT_GOAL[sl].text)+(rk>=0?' <small>'+esc(goalText(sl))+'</small>':'')+'</p>';}).join('')+'<h3>Boons</h3><ul class="tags">'+(Object.keys(cnt).map(id=>{const p=PERKS.find(x=>x.id===id);if(!p)return '';return '<li class="'+p.kind+'" title="'+esc(p.desc)+'">'+esc(p.name)+(cnt[id]>1?' '+cnt[id]:'')+'</li>';}).join('')||'<li class="none">None yet</li>')+'</ul>'+
      '<h3>Relics</h3><ul class="tags">'+(Object.keys(rc).map(id=>{const p=RELICS.find(x=>x.id===id);return '<li title="'+esc(p.desc)+'">'+esc(p.name)+(rc[id]>1?' '+rc[id]:'')+'</li>';}).join('')||'<li class="none">None yet</li>')+'</ul>'+
      '<h3>Party</h3>'+((r.recruits||[]).map(q=>{const cc=CLASSES[q.cls],sp=spellDef(q.spell);return '<p class="pw mate"><i class="orb" style="--c:'+cc.color+';--g:'+cc.glow+'"></i><b style="color:'+cc.glow+'">'+cc.name+'</b> <small>'+esc(sp.name)+'</small></p>';}).join(''))+((r.party||[]).map(q=>{const d=COMPANIONS[q.id],R=ROLES[d.role];return '<p class="pw mate" title="'+esc(d.desc)+'"><b style="color:'+R.col+'">'+esc(d.name)+'</b> <small>'+R.name+', '+q.slot+' post</small><i class="bar"><i style="width:'+Math.round(100*q.hp/q.maxHp)+'%;background:'+(q.hp>0?R.col:'#553')+'"></i></i>'+(q.hp<=0?' <small>wounded</small>':'')+'</p>';}).join('')||'<p class="flav">You ride alone. The Tavern has company.</p>');
    $('sheetBody').innerHTML=h;},
  bonus(b,more){const el=$('bonus');if(!b){el.hidden=true;return;}el.hidden=false;
    el.innerHTML='<h2>'+(b.fallen?'Fallen':b.tilt?'Tilt':'Ball lost')+'</h2><dl>'+b.lines.map(l=>'<dt>'+l[0]+'</dt><dd>'+l[1]+' <small>'+fmt(l[2])+'</small></dd>').join('')+'<dt>Multiplier</dt><dd>'+b.mult+'x</dd></dl><p class="big">'+(b.tilt?'No bonus':'+'+fmt(b.total))+'</p><p>'+(more?'The next ball is on its way.':'That was your last ball.')+'</p>';},
  choice(c){if(!c){UI.menu(null);return;}let h='<div class="pane wide"><h2>'+esc(c.title)+'</h2><p class="lead">'+esc(c.sub)+'</p><div class="cards">';
    c.opts.forEach((o,i)=>{const no=o.cost&&G.run.gold<o.cost;h+='<button class="card'+(o.key?' key':'')+(o.orb?' hire':'')+'" data-act="choose" data-i="'+i+'"'+(no?' disabled':'')+'>'+(o.orb?(o.face?'<img class="face" src="'+portrait(o.face[0],o.face[1])+'" alt="">':'<i class="orb big" style="--c:'+o.orb[0]+';--g:'+o.orb[1]+'"></i>'):'')+'<small>'+esc(o.tag||'')+'</small><b>'+esc(o.name)+'</b><span>'+esc(o.desc)+'</span></button>';});
    h+='</div><p class="hint">'+(UI.touch?'Tap one to take it.':'Flippers move, Space or Enter picks.')+'</p></div>';UI.show(h,'choice');},
  gameOver(r){UI.overRun=r;UI.menu('over');},
  show(html,name){const m=$('menu');m.innerHTML=html;m.hidden=false;m.className=name==='title'?'attract':'';UI.cur=name;const b=m.querySelector('button:not([disabled]),input');if(b)b.focus({preventScroll:true});},
  menu(name){const m=$('menu');UI.eraseArmed=false;if(!name){m.hidden=true;m.innerHTML='';UI.cur=null;return;}let h='';
    const btn=(act,label,extra)=>'<button data-act="'+act+'"'+(extra||'')+'>'+label+'</button>';
    if(name==='title'){const sv=store.get('run',null),meta=store.get('meta',{});
      h='<div class="pane title"><p class="eyebrow">A cursed kingdom on one table</p><h1>Gravebound<span>Pinball</span></h1><nav>'+btn('new','New run')+(sv&&sv.run?btn('continue','Continue <small>'+esc(CLASSES[sv.run.cls].name)+', level '+sv.run.level+', ball '+sv.run.ballNum+'</small>'):'')+btn('help','How to play')+btn('scores','High scores')+btn('options','Options')+btn('controls','Controls')+'</nav>'+
        (meta.bosses?'<p class="hint">Legacy: '+meta.bosses+' bosses slain. New heroes start with '+Math.min(100,meta.bosses*10)+' gold.</p>':'<p class="hint">Three levels, a grave and one campaign. Flippers and a nudge are all you get.</p>')+(G.opt.endless?'<p class="hint">Endless mode is on.</p>':'')+'<p class="ver">'+VERSION+'</p></div>';}
    else if(name==='class'){h='<div class="pane wide"><h2>Choose your hero</h2><p class="lead">The ball is the hero. Hits fill your power meter. Hold the ball still on a raised flipper to spend a third of it on your class shot, or all of it at full.</p><div class="cards four">';
      for(const k in CLASSES){const c=CLASSES[k];h+='<button class="card cls" data-act="class" data-k="'+k+'"><i class="orb" style="--c:'+c.color+';--g:'+c.glow+'"></i><b>'+c.name+'</b><small>'+esc(c.tag)+'</small><span class="stat">Health '+c.hp+' &middot; Power '+c.pow+'</span><span>'+esc(c.pass)+'</span><span><em>Nudge: '+esc(c.nudge)+'.</em> '+esc(c.nudgeText)+'</span><span><em>Cradle: '+esc(c.shot)+'.</em> '+esc(c.shotText)+'</span><span><em>Full meter: '+esc(c.abil)+'.</em> '+esc(c.abilText)+'</span></button>';}
      h+='</div><nav class="row">'+btn('title','Back')+'</nav></div>';}
    else if(name==='scores'){const sc=store.get('scores',[]);h='<div class="pane"><h2>High scores</h2>'+(sc.length?'<table><thead><tr><th></th><th>Name</th><th>Score</th><th>Hero</th></tr></thead><tbody>'+sc.map((s,i)=>'<tr'+(s.id===UI.lastId?' class="me"':'')+'><td>'+(i+1)+'</td><td>'+esc(s.name)+'</td><td>'+fmt(s.score)+'</td><td>'+esc(s.cls)+' '+s.level+'</td></tr>').join('')+'</tbody></table>':'<p class="lead">No scores yet. The first name on the stone is yours to carve.</p>')+'<nav class="row">'+btn('title','Back')+'</nav></div>';}
    else if(name==='party'){h='<div class="pane wide"><h2>Who stands the drain?</h2><p class="lead">A companion guards the bottom drain. A ball that would go out bounces off them, at a cost to their health. Swarms go for them.</p><div class="cards">';
      for(const k of UI.firstPick||[]){const d=COMPANIONS[k],R=ROLES[d.role];h+='<button class="card" data-act="recruit" data-k="'+k+'"><small style="color:'+R.col+'">'+R.name+'</small><b>'+esc(d.name)+'</b><span>'+esc(d.desc)+'</span></button>';}
      h+='</div><nav class="row">'+btn('alone','Ride alone')+btn('new','Back')+'</nav></div>';}
    else if(name==='options'){h='<div class="pane"><h2>Options</h2><label for="optMusic">Music<input id="optMusic" type="range" min="0" max="100" value="'+Math.round(A.vol.m*100)+'"></label><label for="optSfx">Sound effects<input id="optSfx" type="range" min="0" max="100" value="'+Math.round(A.vol.s*100)+'"></label>'+
      '<label for="optShake" class="check"><input id="optShake" type="checkbox"'+(G.opt.shake?' checked':'')+'>Screen shake</label><label for="optEndless" class="check"><input id="optEndless" type="checkbox"'+(G.opt.endless?' checked':'')+'>Endless: a new shadow rises after every campaign, instead of the run ending</label><nav>'+btn('gfxCam','View: '+CAMS[R3.camMode].name)+btn('gfxQual','Detail: '+(R3.q?R3.q.label:''))+btn('erase','Erase saved run and scores')+btn(UI.back||'title','Back')+'</nav></div>';}
    else if(name==='controls'){h='<div class="pane"><h2>Controls</h2><dl class="keys"><dt>Left flippers</dt><dd>Z, Left Arrow or Left Shift</dd><dt>Right flippers</dt><dd>/, Right Arrow or Right Shift</dd><dt>Nudge</dt><dd>Space</dd><dt>Launch</dt><dd>Hold Space or the right flipper, then release</dd><dt>Class power</dt><dd>Hold the ball still on a raised flipper until the ring fills, then let it roll and flip</dd><dt>Pause</dt><dd>P or Esc</dd><dt>View, detail, full screen</dt><dd>C, Q and F</dd><dt>Touch</dt><dd>Left and right halves of the screen flip. The centre button nudges and launches.</dd></dl>'+
      '<p class="lead">Every left flipper on the table moves together, and so does every right one. Flashing gold arrows are your main quest. Blue ones are side quests. Ramps climb to the level above; the gap between the upper flippers drops you to the level below.</p><nav class="row">'+btn(UI.back||'title','Back')+'</nav></div>';}
    else if(name==='pause'){const r=G.run,ex=q=>{const t=explainStep(qCur(q));return t?'<small class="what">'+esc(t)+'</small>':'';};h='<div class="pane doc"><h2>Paused</h2>'+(r.main?'<p class="lead">'+esc(UI.objText(r.main))+'</p>'+ex(r.main):'')+r.side.map(q=>'<p class="sqline"><b>'+esc(q.name)+'.</b> '+esc(UI.objText(q))+'</p>'+ex(q)).join('')+'<nav>'+btn('resume','Resume')+btn('help','How to play')+btn('options','Options')+btn('controls','Controls')+btn('abandon','Abandon run')+'</nav></div>';}
    else if(name==='help'){h='<div class="pane doc wide"><h2>How to play</h2>'+HELP.map(sec=>'<h3>'+esc(sec[0])+'</h3><p class="lead">'+esc(sec[1])+'</p>').join('')+'<h3>Every named shot</h3>'+glossary().map(g=>'<h4>'+esc(g[0].replace(/^the /,'The '))+'</h4><dl class="gloss">'+g[1].map(r=>'<dt>'+esc(r[0])+'</dt><dd>'+esc(r[1].replace(r[0]+' is ','').replace(/^\w/,c=>c.toUpperCase()))+'</dd>').join('')+'</dl>').join('')+'<nav class="row">'+btn(UI.back||'title','Back')+'</nav></div>';}
    else if(name==='over'){const r=UI.overRun,t=Math.round(r.time),won=r.ended==='won',camp=r.arcs.map(k=>CAMPAIGNS[k].name).join(', ');h='<div class="pane"><p class="eyebrow">'+(won?'The expedition is over':'The hero falls')+'</p><h2 class="score">'+fmt(r.score)+'</h2><p class="lead">'+esc(won?(G.opt.endless?'':'')+CAMPAIGNS[r.arcs[r.arcs.length-1]].win:'The Hollow keeps its dead.')+'</p><dl><dt>Hero</dt><dd>'+CLASSES[r.cls].name+', level '+r.level+'</dd><dt>Campaign'+(r.arcs.length>1?'s':'')+'</dt><dd>'+esc(camp)+(won?' <small>complete</small>':'')+'</dd><dt>Bosses slain</dt><dd>'+r.bossKills+'</dd><dt>Foes slain</dt><dd>'+r.kills+'</dd><dt>Side quests done</dt><dd>'+r.questsDone+'</dd><dt>Wing</dt><dd>'+(r.wing&&r.wing.done?esc(WINGS[r.wing.key].name)+' cleared':r.wing&&r.wing.key?esc(WINGS[r.wing.key].name)+' left standing':'none')+'</dd><dt>Relics</dt><dd>'+(r.relics.length?r.relics.map(id=>{const x=RELICS.find(q=>q.id===id);return x?esc(x.name):'';}).filter(Boolean).join(', '):'none')+'</dd><dt>Best combo</dt><dd>'+r.stat.bestCombo+'x</dd><dt>Balls lost</dt><dd>'+(won?r.ballNum-1:r.ballNum)+'</dd><dt>Time</dt><dd>'+(t/60|0)+':'+('0'+t%60).slice(-2)+'</dd></dl>'+
      '<label for="hsName">Carve your name<input id="hsName" type="text" maxlength="12" autocomplete="off" value="'+esc(store.get('name',''))+'" placeholder="Name"></label><nav>'+btn('saveScore','Save score')+btn('new','New run')+btn('title','Title')+'</nav></div>';}
    UI.show(h,name);},
  act(el){const a=el.dataset.act;A.init();A.s('ui');
    switch(a){
    case 'new':UI.menu('class');break;
    case 'class':UI.cls=el.dataset.k;UI.firstPick=Object.keys(COMPANIONS);UI.menu('party');break;
    case 'recruit':UI.menu(null);startRun(UI.cls,el.dataset.k);break;
    case 'alone':UI.menu(null);startRun(UI.cls,null);break;
    case 'continue':UI.menu(null);if(!continueRun())UI.menu('title');break;
    case 'scores':UI.menu('scores');break;
    case 'options':UI.back=UI.cur==='pause'?'pause':'title';UI.menu('options');break;
    case 'controls':UI.back=UI.cur==='pause'?'pause':'title';UI.menu('controls');break;
    case 'help':UI.back=UI.cur==='pause'?'pause':'title';UI.menu('help');break;
    case 'pause':UI.menu('pause');break;
    case 'title':if(G.mode!=='title'||!G.demo)startDemo();UI.menu('title');break;
    case 'resume':G.paused=false;UI.menu(null);break;
    case 'abandon':if(el.dataset.sure){G.paused=false;store.del('run');startDemo();UI.menu('title');}else{el.dataset.sure=1;el.textContent='Press again to abandon';}break;
    case 'erase':if(UI.eraseArmed){store.del('run');store.del('scores');store.del('meta');el.textContent='Erased';el.disabled=true;}else{UI.eraseArmed=true;el.textContent='Press again to erase';}break;
    case 'choose':choose(+el.dataset.i);break;
    case 'gfxCam':case 'gfxQual':{gfxKey(a==='gfxCam'?'cam':'qual');UI.menu('options');const b=$('menu').querySelector('[data-act='+a+']');if(b)b.focus({preventScroll:true});break;}
    case 'saveScore':{const r=UI.overRun,name=($('hsName').value||'Nameless').trim().slice(0,12)||'Nameless';store.set('name',name);const sc=store.get('scores',[]);UI.lastId=Date.now();
      sc.push({id:UI.lastId,name:name+(r.ended==='won'?' \u2655':'')+(r.dev?' *':''),score:r.score,cls:CLASSES[r.cls].name,level:r.level});sc.sort((a,b)=>b.score-a.score);store.set('scores',sc.slice(0,10));startDemo();UI.menu('scores');break;}
    }}
};
function togglePause(){if(G.mode!=='play'||G.choice)return;if(UI.cur&&UI.cur!=='pause'){UI.menu('pause');return;}G.paused=!G.paused;UI.menu(G.paused?'pause':null);if(G.paused){setFlip(-1,false);setFlip(1,false);G.in.n=false;}}
const KEYS={ArrowLeft:'l',KeyZ:'l',ShiftLeft:'l',KeyA:'l',ArrowRight:'r',Slash:'r',ShiftRight:'r',KeyL:'r',KeyM:'r',Space:'n',ArrowDown:'n',ArrowUp:'u',KeyP:'p',Escape:'p',KeyC:'cam',KeyQ:'qual',KeyF:'full',Backquote:'dev',Digit1:'d1',Digit2:'d2',Digit3:'d3',Digit4:'d4',Digit5:'d5',Digit6:'d6',Digit7:'d7',KeyG:'dg',KeyB:'db',KeyN:'dn'};
function moveFocus(d){const bs=[...$('menu').querySelectorAll('button:not([disabled]),input')];if(!bs.length)return;let i=bs.indexOf(document.activeElement);i=(i+d+bs.length)%bs.length;if(i<0)i=0;bs[i].focus({preventScroll:true});A.s('ui');}
function bindInput(){
  addEventListener('keydown',e=>{const k=KEYS[e.code],typing=e.target&&e.target.tagName==='INPUT'&&e.target.type==='text';if(typing){if(e.code==='Enter'){const b=$('menu').querySelector('[data-act=saveScore]');if(b)UI.act(b);}return;}
    if(!k)return;A.init();
    if(UI.cur){if(e.target&&e.target.type==='range'&&(k==='l'||k==='r')&&e.code.startsWith('Arrow'))return;
      if(k==='l'||k==='u'){moveFocus(-1);e.preventDefault();}else if(k==='r'||(k==='n'&&e.code==='ArrowDown')){moveFocus(1);e.preventDefault();}
      else if(k==='p'){e.preventDefault();if(UI.cur==='pause')togglePause();else if(UI.cur==='options'||UI.cur==='controls'||UI.cur==='help'||UI.cur==='scores'||UI.cur==='class')UI.act({dataset:{act:UI.cur==='scores'||UI.cur==='class'?'title':(UI.back||'title')}});}
      return;}
    e.preventDefault();if(e.repeat)return;
    if(k==='l')setFlip(-1,true);else if(k==='r')setFlip(1,true);else if(k==='n'||k==='u'){G.in.n=true;nudge();}else if(k==='p')togglePause();else gfxKey(k);});
  addEventListener('keyup',e=>{const k=KEYS[e.code];if(!k)return;if(k==='l')setFlip(-1,false);else if(k==='r')setFlip(1,false);else if(k==='n'||k==='u')G.in.n=false;});
  $('menu').addEventListener('click',e=>{const b=e.target.closest('button[data-act]');if(b&&!b.disabled)UI.act(b);});
  $('menu').addEventListener('input',e=>{const t=e.target;if(t.id==='optMusic'){A.vol.m=t.value/100;A.setVol();}else if(t.id==='optSfx'){A.vol.s=t.value/100;A.setVol();A.s('target');}else if(t.id==='optShake'){G.opt.shake=t.checked;store.set('opt',G.opt);}else if(t.id==='optEndless'){G.opt.endless=t.checked;store.set('opt',G.opt);}});
  $('pauseBtn').addEventListener('click',()=>{A.init();togglePause();});
  // a flip zone keeps the finger that pressed it until that finger lifts, even if the thumb drifts off the zone
  const zone=(el,side)=>{const ids=new Set();const up=e=>{if(!ids.delete(e.pointerId))return;if(!ids.size)setFlip(side,false);};
    el.addEventListener('pointerdown',e=>{A.init();ids.add(e.pointerId);try{el.setPointerCapture(e.pointerId);}catch(_){}setFlip(side,true);e.preventDefault();});el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);};
  zone($('tL'),-1);zone($('tR'),1);
  const tn=$('tN'),nup=()=>{G.in.n=false;};tn.addEventListener('pointerdown',e=>{A.init();try{tn.setPointerCapture(e.pointerId);}catch(_){}G.in.n=true;nudge();e.preventDefault();});tn.addEventListener('pointerup',nup);tn.addEventListener('pointercancel',nup);tn.addEventListener('lostpointercapture',nup);
  const showTouch=()=>{$('touch').hidden=false;UI.touch=true;};if(window.matchMedia&&matchMedia('(pointer: coarse)').matches)showTouch();
  addEventListener('pointerdown',e=>{if(e.pointerType==='touch')showTouch();A.init();},{passive:true});
  addEventListener('contextmenu',e=>e.preventDefault());
  // iOS ignores user-scalable=no: stop pinch and double-tap zoom by hand, and long-press selection
  for(const t of ['gesturestart','gesturechange','gestureend'])document.addEventListener(t,e=>e.preventDefault(),{passive:false});
  {let lastT=0;document.addEventListener('touchend',e=>{const now=Date.now();if(now-lastT<350&&!(e.target&&e.target.closest&&e.target.closest('input,select,textarea,button,label')))e.preventDefault();lastT=now;},{passive:false});}
  document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});
  document.addEventListener('dblclick',e=>e.preventDefault());document.addEventListener('selectstart',e=>{if(!(e.target&&e.target.closest&&e.target.closest('input')))e.preventDefault();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.mode==='play'&&!G.paused&&!G.choice)togglePause();});
  addEventListener('blur',()=>{setFlip(-1,false);setFlip(1,false);G.in.n=false;});
  addEventListener('resize',resize);
}
