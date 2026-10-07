/* ================= FOES AS FIGURES =================
   Each enemy type is a small jointed figure built from primitives, posed every frame from the game's own state:
   it walks when the rules move it, draws its arm back through the wind-up, swings on the strike, reels when
   staggered, and falls when it dies. Units are table pixels; a figure stands on the floor at its enemy's spot
   and faces the ball. Bosses are still the painted billboards (see actors3d.js). */
const FOE3={};
function foeMats(){if(FOE3.m)return FOE3.m;const S=SM,glow=c=>new THREE.MeshBasicMaterial({color:hdr(c,2.2)});
  return FOE3.m={bone:S({color:'#d9d2bd',roughness:.65,envMapIntensity:.4}),dark:S({color:'#2a2a3a',roughness:.95}),gob:S({color:'#7fae52',roughness:.8}),gobD:S({color:'#4f6e34',roughness:.9}),sack:S({color:'#7a5a3a',roughness:.95}),
    robe:S({color:'#4a2e66',roughness:.9}),trim:S({color:'#8a6aa8',roughness:.8}),fur:S({color:'#6f7a8a',roughness:.95}),belly:S({color:'#aab2bd',roughness:.95}),mane:S({color:'#4a525e',roughness:1}),
    rust:S({color:'#6c7786',metalness:.75,roughness:.5,envMapIntensity:.9}),plate:S({color:'#8a94a8',metalness:.8,roughness:.4,envMapIntensity:1.2}),cape:S({color:'#8a2038',roughness:.9,side:THREE.DoubleSide}),
    troll:S({color:'#5f7f62',roughness:.9}),tbelly:S({color:'#8aa882',roughness:.9}),wood:M.wood,iron:M.iron,
    ghost:new THREE.MeshBasicMaterial({color:hdr('#9be8e0',.75),transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}),
    eyeG:glow('#7dffb0'),eyeY:glow('#ffd24a'),eyeR:glow('#ff3040'),eyeV:glow('#c08cff'),eyeC:glow('#9be8e0'),eyeO:glow('#ffb050'),staff:glow('#c08cff')};}
// geometry helpers: a limb hangs from its pivot, so rotating the pivot swings it
const limbG=(r0,r1,len,seg)=>new THREE.CylinderGeometry(r0,r1,len,seg||6).translate(0,-len/2,0);
function foePart(parent,geo,mat,x,y,z){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
function foePivot(parent,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
function foeEyes(head,mat,dx,y,z,r){for(const sx of [-1,1])foePart(head,new THREE.SphereGeometry(r||2,6,5),mat,sx*dx,y,z);}

// a two-legged frame with a hip, a torso, shoulders and a head; every biped builder dresses one of these
function biped(g,o){const P={};P.hip=foePivot(g,0,o.hip,0);
  P.legL=foePivot(g,-o.stance,o.hip,0);P.legR=foePivot(g,o.stance,o.hip,0);foePart(P.legL,limbG(o.leg,o.leg*.8,o.hip),o.legM);foePart(P.legR,limbG(o.leg,o.leg*.8,o.hip),o.legM);
  P.body=foePivot(P.hip,0,0,0);foePart(P.body,o.torsoG,o.torsoM,0,o.torso/2,0);
  P.armL=foePivot(P.body,-o.shoulder,o.torso-2,0);P.armR=foePivot(P.body,o.shoulder,o.torso-2,0);foePart(P.armL,limbG(o.arm,o.arm*.8,o.armLen),o.armM);foePart(P.armR,limbG(o.arm,o.arm*.8,o.armLen),o.armM);
  P.head=foePivot(P.body,0,o.torso+o.headR*.9,0);return P;}
const FOE_BUILD={
  skeleton(g,m){const P=biped(g,{hip:17,stance:4,leg:1.7,legM:m.bone,torso:13,torsoG:new THREE.BoxGeometry(2.2,13,2.2),torsoM:m.bone,shoulder:8,arm:1.5,armLen:14,armM:m.bone,headR:6});
    foePart(P.head,new THREE.SphereGeometry(6,10,8),m.bone,0,0,0);foePart(P.head,new THREE.BoxGeometry(6,3,4),m.bone,0,-5,1.5);foeEyes(P.head,m.eyeG,2.4,.5,5.2,1.6);
    for(let k=0;k<4;k++)foePart(P.body,new THREE.TorusGeometry(5.2-k*.7,.8,5,10).rotateX(PI/2),m.bone,0,11-k*2.6,0);foePart(P.body,new THREE.BoxGeometry(14,2,2.4),m.bone,0,12.5,0);foePart(P.hip,new THREE.BoxGeometry(9,2.4,4),m.bone,0,-.6,0);
    P.weapon=foePart(P.armR,new THREE.BoxGeometry(1.8,22,.8),m.rust,0,-13,8);P.weapon.rotation.x=-PI/2;foePart(P.armR,new THREE.BoxGeometry(6,1.5,1.5),m.wood,0,-13,-1);
    return {P,h:41,eyes:m.eyeG};},
  goblin(g,m){const P=biped(g,{hip:12,stance:4,leg:2,legM:m.gob,torso:11,torsoG:new THREE.SphereGeometry(6,10,8).scale(1,1,.8),torsoM:m.gobD,shoulder:7,arm:1.7,armLen:11,armM:m.gob,headR:6.5});
    foePart(P.head,new THREE.SphereGeometry(6.5,10,8),m.gob,0,0,0);for(const sx of [-1,1]){const ear=foePart(P.head,new THREE.ConeGeometry(2.2,10,5).rotateZ(-sx*PI/2),m.gob,sx*8.5,2.5,-1);ear.rotation.y=sx*.4;}
    foeEyes(P.head,m.eyeY,3,.5,6,1.7);foePart(P.head,new THREE.ConeGeometry(1.5,4,5).rotateX(PI/2),m.gob,0,-2,7);
    P.weapon=foePart(P.armR,new THREE.ConeGeometry(1.4,10,4).rotateX(PI/2),m.rust,0,-11,6);
    P.loot=foePart(P.body,new THREE.SphereGeometry(5.5,8,7),m.sack,0,7,-7.5);P.loot.visible=false;return {P,h:31,eyes:m.eyeY};},
  cultist(g,m){const P={};P.hip=foePivot(g,0,8,0);P.body=foePivot(P.hip,0,0,0);foePart(P.body,new THREE.ConeGeometry(9,30,8).translate(0,15-8,0),m.robe,0,0,0);foePart(P.body,new THREE.TorusGeometry(6,1,5,12).rotateX(PI/2),m.trim,0,14,0);
    P.armL=foePivot(P.body,-7,19,0);P.armR=foePivot(P.body,7,19,0);foePart(P.armL,limbG(2,1.5,12),m.robe);foePart(P.armR,limbG(2,1.5,12),m.robe);
    P.head=foePivot(P.body,0,26,0);foePart(P.head,new THREE.SphereGeometry(5.5,9,8),m.robe,0,0,0);foePart(P.head,new THREE.ConeGeometry(6,9,8),m.robe,0,5,-1);foeEyes(P.head,m.eyeV,2.2,0,4.6,1.4);
    const staff=foePart(P.armR,new THREE.CylinderGeometry(.9,.9,36,5),m.wood,0,-12,4);P.tip=foePart(staff,new THREE.OctahedronGeometry(3.2,0),m.staff,0,19,0);P.weapon=staff;P.robed=true;return {P,h:38,eyes:m.eyeV};},
  revenant(g,m){const P=biped(g,{hip:16,stance:4.5,leg:2,legM:m.bone,torso:14,torsoG:new THREE.BoxGeometry(13,14,8),torsoM:m.plate,shoulder:8.5,arm:1.8,armLen:13,armM:m.bone,headR:6});
    foePart(P.head,new THREE.SphereGeometry(6,10,8),m.bone,0,0,0);foePart(P.head,new THREE.CylinderGeometry(6.6,7,7,10),m.rust,0,2,0);foeEyes(P.head,m.eyeG,2.4,-.5,5.4,1.6);
    for(const sx of [-1,1])foePart(P.body,new THREE.SphereGeometry(4.2,7,6),m.rust,sx*8.5,13,0);
    P.shield=foePart(P.armL,new THREE.CylinderGeometry(10,10,1.6,14).rotateX(PI/2),m.rust,-2,-9,3);foePart(P.shield,new THREE.SphereGeometry(2.5,6,5),m.iron,0,0,1.2);
    P.weapon=foePart(P.armR,new THREE.CylinderGeometry(1,1,18,5),m.wood,0,-13,6);P.weapon.rotation.x=-PI/2;foePart(P.weapon,new THREE.DodecahedronGeometry(3.6,0),m.iron,0,9,0);return {P,h:44,eyes:m.eyeG};},
  knight(g,m){const P=biped(g,{hip:19,stance:5,leg:2.4,legM:m.plate,torso:16,torsoG:new THREE.BoxGeometry(14,16,8),torsoM:m.plate,shoulder:10.5,arm:2.2,armLen:15,armM:m.plate,headR:6.5});
    foePart(P.head,new THREE.CylinderGeometry(6,6.4,10,10),m.plate,0,0,0);foePart(P.head,new THREE.BoxGeometry(8,1.6,2),m.eyeR,0,.5,5.6);foePart(P.head,new THREE.ConeGeometry(2.4,10,6).rotateX(-.5),m.cape,0,7,-3);
    for(const sx of [-1,1])foePart(P.body,new THREE.SphereGeometry(5,7,6),m.plate,sx*10,15,0);
    P.cape=foePart(P.body,new THREE.PlaneGeometry(14,22).translate(0,-11,0),m.cape,0,15,-5);
    P.weapon=foePart(P.armR,new THREE.BoxGeometry(2.4,30,1.2),m.rust,0,-15,9);P.weapon.rotation.x=-PI/2;foePart(P.armR,new THREE.BoxGeometry(9,1.8,1.8),m.iron,0,-15,-1);return {P,h:50,eyes:m.eyeR};},
  troll(g,m){const P=biped(g,{hip:17,stance:8,leg:4.5,legM:m.troll,torso:22,torsoG:new THREE.SphereGeometry(14,12,10).scale(1,.85,.75),torsoM:m.troll,shoulder:17,arm:4,armLen:26,armM:m.troll,headR:8});
    foePart(P.body,new THREE.SphereGeometry(10,10,8).scale(1,.8,.6),m.tbelly,0,8,8);foePart(P.head,new THREE.SphereGeometry(8,10,8).scale(1,.85,1),m.troll,0,0,6);foePart(P.head,new THREE.SphereGeometry(3.5,7,6),m.tbelly,0,-2,10);
    foeEyes(P.head,m.eyeO,3.4,2,12.5,1.8);for(const sx of [-1,1])foePart(P.head,new THREE.ConeGeometry(1.4,5,5),m.bone,sx*3.5,-4,13);
    P.weapon=foePart(P.armR,new THREE.CylinderGeometry(2,4,30,6),m.wood,0,-26,8);P.weapon.rotation.x=-PI/2;P.hunch=.5;return {P,h:52,eyes:m.eyeO};},
  wolf(g,m){const P={};P.hip=foePivot(g,0,18,0);P.body=foePivot(P.hip,0,0,0);foePart(P.body,new THREE.SphereGeometry(5,10,8).scale(1,.95,2.7),m.fur,0,0,0);foePart(P.body,new THREE.SphereGeometry(6.2,10,8).scale(1,.95,1.1),m.mane,0,1,7);foePart(P.body,new THREE.SphereGeometry(4,8,6).scale(1,.7,2.3),m.belly,0,-3.5,-2);
    P.head=foePivot(P.body,0,5,15);foePart(P.head,new THREE.SphereGeometry(4.6,10,8).scale(1,.9,1.3),m.fur,0,0,3);foePart(P.head,new THREE.SphereGeometry(2.6,8,6).scale(1,.8,2.2),m.belly,0,-1.5,8);for(const sx of [-1,1])foePart(P.head,new THREE.ConeGeometry(2,6,4),m.fur,sx*3.2,6,-1);
    foeEyes(P.head,m.eyeY,2.6,1.5,6.2,1.3);P.tail=foePart(P.body,new THREE.ConeGeometry(1.8,14,5).rotateX(-PI*.65),m.fur,0,3,-19);
    P.legs=[];for(const q of [[-4,9],[4,9],[-4,-10],[4,-10]]){const L=foePivot(P.body,q[0],-3,q[1]);foePart(L,limbG(1.9,1.4,15),m.fur);P.legs.push(L);}P.quad=true;return {P,h:30,eyes:m.eyeY};},
  spirit(g,m){const P={};P.hip=foePivot(g,0,16,0);P.body=foePivot(P.hip,0,0,0);const sheet=foePart(P.body,new THREE.ConeGeometry(9,30,9,1,true).translate(0,15-6,0),m.ghost,0,0,0);sheet.castShadow=false;
    P.head=foePivot(P.body,0,22,0);const hd=foePart(P.head,new THREE.SphereGeometry(6.5,10,8),m.ghost,0,0,0);hd.castShadow=false;foeEyes(P.head,m.eyeC,2.6,0,5.4,1.6);
    P.armL=foePivot(P.body,-7,14,2);P.armR=foePivot(P.body,7,14,2);for(const a of [P.armL,P.armR]){const x=foePart(a,limbG(2,1,12),m.ghost);x.castShadow=false;a.rotation.x=-.9;}P.ghost=true;return {P,h:38,eyes:m.eyeC};}
};
function foeRig(type){const m=Object.assign({},foeMats());for(const k in m)if(k.startsWith('eye'))m[k]=m[k].clone();const pool=FOE3.pool||(FOE3.pool={}),free=pool[type]||(pool[type]=[]);if(free.length){const r=free.pop();r.g.visible=true;return r;}
  const g=new THREE.Group(),b=FOE_BUILD[type](g,m),rig=Object.assign({type,g,walk:0,strikeT:0,prevWind:0,dieT:0,yaw:0,px:0,pz:0,e:null},b);R3.scene.add(g);(FOE3.rigs||(FOE3.rigs=[])).push(rig);return rig;}
function foeRelease(rig){rig.g.visible=false;rig.e=null;rig.dieT=0;FOE3.pool[rig.type].push(rig);FOE3.rigs.splice(FOE3.rigs.indexOf(rig),1);}
function poseFoe(rig,e,dt){const P=rig.P,g=rig.g,t=e.t,d=e.def,spawnK=e.spawn>0?clamp(1-e.spawn/.7,0,1):1;
  // where it stands and which way it faces
  const wx=e.x-320,wz=e.y,gy=elev(e.y);let yaw=rig.yaw;
  const fb=focusBall(),dx=fb&&fb.tier===e.tier?fb.x-e.x:0,dz=fb&&fb.tier===e.tier?fb.y-e.y:0,watch=fb&&fb.tier===e.tier&&Math.hypot(dx,dz)<420&&e.state!=='walk'&&e.state!=='hop';
  const mvx=wx-rig.px,mvz=wz-rig.pz,mov=Math.hypot(mvx,mvz);
  if(watch)yaw=Math.atan2(dx,dz);else if(mov>.05)yaw=Math.atan2(mvx,mvz);
  let da=yaw-rig.yaw;da=Math.atan2(Math.sin(da),Math.cos(da));rig.yaw+=da*Math.min(1,dt*8);rig.px=wx;rig.pz=wz;
  g.position.set(wx,gy-rig.h*1.25*(1-spawnK)*(rig.ghost?0:1),wz);g.rotation.set(0,rig.yaw,0);g.scale.setScalar(1.25*(rig.ghost?spawnK:1)*(1+Math.max(0,e.flash)*.12));
  // limbs
  const moving=e.moving&&e.stun<=0,gait=moving?Math.min(1,mov/(dt*20+1e-6)):0;rig.walk+=dt*(moving?9:0);
  const sw=Math.sin(rig.walk)*.6*(moving?1:0),bob=moving?Math.abs(Math.cos(rig.walk))*1.6:Math.sin(t*3)*.7;
  P.hip.position.y=(P.hip.userData.y0===undefined?(P.hip.userData.y0=P.hip.position.y):P.hip.userData.y0)+bob;
  if(P.legL){P.legL.rotation.x=sw;P.legR.rotation.x=-sw;}
  if(P.legs)for(let i=0;i<4;i++)P.legs[i].rotation.x=Math.sin(rig.walk+(i%2?PI:0)+(i<2?0:.6))*.7*(moving?1:0);
  if(P.armL&&!rig.ghost)P.armL.rotation.x=-sw*.6;if(P.armR)P.armR.rotation.x=sw*.6;
  P.body.rotation.set(rig.hunch||0,0,0);P.head.rotation.set(0,0,0);g.rotation.z=0;g.rotation.x=0;
  // the wind-up and the swing
  if(e.wind>0){const f=1-e.wind/d.wind;if(P.armR)P.armR.rotation.x=-.5-2*f;P.body.rotation.x=(rig.hunch||0)-.3*f;if(rig.eyes)rig.eyes.color.set(hdr('#ff3040',2.2));}
  else if(rig.eyes&&rig.prevWind>0)rig.eyes.color.set(FOE3.m[{skeleton:'eyeG',revenant:'eyeG',goblin:'eyeY',wolf:'eyeY',knight:'eyeR',cultist:'eyeV',spirit:'eyeC',troll:'eyeO'}[e.type]].color);
  if(rig.prevWind>0&&e.wind<=0&&e.stun<=0)rig.strikeT=.35;rig.prevWind=e.wind;
  if(rig.strikeT>0){rig.strikeT-=dt;const k=1-rig.strikeT/.35;if(P.armR)P.armR.rotation.x=1.4*Math.sin(k*PI)-.2;P.body.rotation.x=(rig.hunch||0)+.35*Math.sin(k*PI);g.position.z+=Math.cos(rig.yaw)*12*Math.sin(k*PI);g.position.x+=Math.sin(rig.yaw)*12*Math.sin(k*PI);}
  if(e.stun>0){g.rotation.z=Math.sin(t*25)*.12;P.body.rotation.x=(rig.hunch||0)+.4;P.head.rotation.x=.5;}
  // jobs with a look of their own
  if(e.type==='cultist'){const f=1-e.castT/d.cast,up=clamp((f-.3)/.5,0,1);if(e.stun<=0){P.armL.rotation.x=-.4-2.2*up;P.armR.rotation.x=-.4-2.2*up;}P.tip.material.color.set(hdr('#c08cff',.8+2.4*up));P.tip.rotation.y=t*3;P.tip.scale.setScalar(1+.4*up+(up>.9?.3*Math.sin(t*30):0));}
  if(e.type==='revenant'&&e.stun<=0&&e.wind<=0&&rig.strikeT<=0){P.armL.rotation.x=-1.3;P.armL.rotation.y=.4;}
  if(e.type==='goblin')P.loot.visible=!!e.loot;
  if(e.type==='wolf'){const l=e.state==='lunge';P.body.scale.set(1,l?.85:1,l?1.35:1);P.body.rotation.x=l?.35:0;P.tail.rotation.z=Math.sin(t*6)*.3;P.head.rotation.x=l?-.3:0;}
  if(e.type==='troll'&&e.stun<=0&&e.wind<=0&&rig.strikeT<=0){P.armL.rotation.x=.4+Math.sin(t*1.5)*.1;P.armR.rotation.x=.4-Math.sin(t*1.5)*.1;}
  if(rig.ghost){g.position.y+=8+Math.sin(t*2.2)*4;P.body.rotation.y=Math.sin(t*1.3)*.2;P.armL.rotation.x=-.9+Math.sin(t*2)*.25;P.armR.rotation.x=-.9-Math.sin(t*2)*.25;}
  zshift(g);}
function frameFoes(dt){const rigs=FOE3.rigs||[];
  for(const e of G.enemies){if(e.dead)continue;let rig=e._rig;if(!rig||rig.e!==e||rig.type!==e.type){if(rig&&rig.e===e)foeRelease(rig);rig=e._rig=foeRig(e.type);rig.e=e;rig.px=e.x-320;rig.pz=e.y;rig.yaw=0;rig.prevWind=0;rig.strikeT=0;}rig.seen=true;poseFoe(rig,e,dt);}
  for(let i=rigs.length-1;i>=0;i--){const rig=rigs[i];if(rig.seen){rig.seen=false;continue;}
    if(!rig.dieT){rig.dieT=1e-6;rig.e=null;}rig.dieT+=dt;const k=Math.min(1,rig.dieT/.7);const g=rig.g;g.rotation.x=-1.5*Math.min(1,k*1.6);g.position.y-=dt*(k>.5?60:0);
    if(k>=1)foeRelease(rig);}}
