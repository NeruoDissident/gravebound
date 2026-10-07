/* ================= CAMPAIGN WINGS IN 3D =================
   A wing is a small room with its own flippers. In table space each sits past the Grave, so the physics treats it
   as one more level; in the world each is a sunken court beside the main table (see WOXS, WOZS, zshift in
   render3d.js): the Crypt west of the Wilds, the Den east of the Wilds, the Hoard east of the Keep.
   Everything static is built in table space inside one group per wing, and the group carries the offset. */
const WING={x0:40,x1:600,top:-40,bot:760,wall:40}; // the court floor, relative to a wing's own origin

/* ---------- floor art, one painter per wing ---------- */
const WING_ART={
  crypt(c,y,p){ // the aisle to the sarcophagus, burial niches down both walls, a ward circle before the flippers
    let g=c.createLinearGradient(0,y+190,0,y+560);g.addColorStop(0,'rgba(120,130,60,.34)');g.addColorStop(1,'rgba(90,100,40,.08)');c.fillStyle=g;path(c,[[302,y+190],[338,y+190],[356,y+560],[284,y+560]],1);c.fill();
    c.strokeStyle='rgba(216,240,112,.3)';c.lineWidth=1.6;path(c,[[304,y+190],[288,y+560]]);c.stroke();path(c,[[336,y+190],[352,y+560]]);c.stroke();
    for(const sx of [-1,1])for(let k=0;k<3;k++){const nx=320+sx*150,ny=y+360+k*56-(k*k*4);c.fillStyle='rgba(0,0,0,.5)';c.beginPath();c.moveTo(nx-15,ny+20);c.lineTo(nx-15,ny-6);c.arc(nx,ny-6,15,PI,0);c.lineTo(nx+15,ny+20);c.closePath();c.fill();
      c.strokeStyle='rgba(200,224,96,.22)';c.lineWidth=1.2;c.stroke();c.fillStyle='rgba(230,224,196,.5)';c.beginPath();c.arc(nx,ny+2,6,0,TAU);c.fill();c.fillRect(nx-4,ny+6,8,5);c.fillStyle='#0a0b06';c.beginPath();c.arc(nx-2.4,ny+1.5,1.7,0,TAU);c.arc(nx+2.4,ny+1.5,1.7,0,TAU);c.fill();}
    sigil(c,320,y+430,78,p.acc,0);
    g=c.createRadialGradient(320,y+150,10,320,y+150,230);g.addColorStop(0,'rgba(216,240,112,.13)');g.addColorStop(1,'rgba(216,240,112,0)');c.fillStyle=g;c.fillRect(60,y,520,420);},
  den(c,y,p){ // trampled earth, a shaft of moonlight, old kills, claw marks, a trail of prints to the lair
    for(let k=0;k<70;k++){const x=120+hash(k*3.7)*400,yy=y+60+hash(k*8.1)*500,r=10+hash(k*1.9)*26;c.fillStyle='rgba('+(30+hash(k)*30|0)+','+(34+hash(k+1)*26|0)+','+(48+hash(k+2)*30|0)+','+(.10+hash(k+3)*.16)+')';c.beginPath();c.ellipse(x,yy,r*1.5,r,hash(k)*3,0,TAU);c.fill();}
    let g=c.createRadialGradient(320,y+340,10,320,y+340,200);g.addColorStop(0,'rgba(207,230,255,.13)');g.addColorStop(.6,'rgba(207,230,255,.04)');g.addColorStop(1,'rgba(207,230,255,0)');c.fillStyle=g;c.fillRect(100,y+120,440,440);
    c.strokeStyle='rgba(207,230,255,.22)';c.lineWidth=1.6;c.beginPath();c.arc(320,y+340,118,0,TAU);c.stroke();sigil(c,320,y+340,86,p.glow,1);
    c.fillStyle='rgba(96,10,18,.55)';for(const q of [[250,150,34],[400,170,26],[330,215,20]]){c.beginPath();c.ellipse(q[0],y+q[1],q[2]*1.4,q[2],hash(q[0])*3,0,TAU);c.fill();}
    c.lineCap='round';c.strokeStyle='rgba(226,222,200,.5)';c.fillStyle='rgba(226,222,200,.5)';
    for(let k=0;k<12;k++){const x=150+hash(k*5.3)*340,yy=y+110+hash(k*9.1)*400,a=hash(k*2.7)*PI,l=8+hash(k)*8;if(Math.hypot(x-320,yy-(y+340))<70)continue;c.lineWidth=3;c.beginPath();c.moveTo(x-Math.cos(a)*l,yy-Math.sin(a)*l);c.lineTo(x+Math.cos(a)*l,yy+Math.sin(a)*l);c.stroke();for(const sg of [-1,1]){c.beginPath();c.arc(x+sg*Math.cos(a)*l,yy+sg*Math.sin(a)*l,2.8,0,TAU);c.fill();}}
    c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=2.2;for(const q of [[170,400,.5],[468,410,-.5],[200,200,.9],[440,200,-.9]])for(let k=-1;k<2;k++){c.beginPath();c.moveTo(q[0]+k*8,y+q[1]-22);c.lineTo(q[0]+k*8+q[2]*18,y+q[1]+22);c.stroke();}
    c.fillStyle='rgba(207,230,255,.16)';for(let k=0;k<8;k++){const t=k/7,x=lerp(300,330,t)+(k%2?10:-10),yy=y+520-t*290;c.beginPath();c.ellipse(x,yy,5,6.5,0,0,TAU);c.fill();for(let j=-1;j<2;j++){c.beginPath();c.arc(x+j*4.6,yy-9,2,0,TAU);c.fill();}}},
  hoard(c,y,p){ // scorched flagstones split by fire, loose coin washed against the walls, a scale-ring before the flippers
    c.fillStyle='rgba(0,0,0,.34)';for(const q of [[220,320,90],[430,250,70],[320,470,80]]){c.beginPath();c.ellipse(q[0],y+q[1],q[2]*1.3,q[2],hash(q[0])*3,0,TAU);c.fill();}
    c.lineCap='round';c.lineJoin='round';
    for(const q of [[150,140,.5],[470,120,2.4],[130,470,-.3],[505,430,3.4],[320,60,1.57]]){let x=q[0],yy=y+q[1],a=q[2];const pts=[[x,yy]];for(let k=0;k<7;k++){a+=(hash(q[0]+k*3.3)-.5)*1.3;x+=Math.cos(a)*26;yy+=Math.sin(a)*26;pts.push([x,yy]);}
      path(c,pts);c.strokeStyle='rgba(255,90,20,.18)';c.lineWidth=13;c.stroke();c.strokeStyle='rgba(255,150,50,.55)';c.lineWidth=4;c.stroke();c.strokeStyle='rgba(255,232,150,.8)';c.lineWidth=1.3;c.stroke();}
    for(let k=0;k<170;k++){const a=hash(k*2.3)*TAU,rr=150+hash(k*5.9)*110,x=320+Math.cos(a)*rr*1.05,yy=y+300+Math.sin(a)*rr*1.25;c.fillStyle='rgba(255,'+(190+hash(k)*40|0)+',70,'+(.28+hash(k+4)*.4)+')';c.beginPath();c.arc(x,yy,2.2+hash(k+9)*2,0,TAU);c.fill();}
    sigil(c,320,y+445,74,p.acc2,2);
    const g=c.createRadialGradient(320,y+130,10,320,y+130,240);g.addColorStop(0,'rgba(255,176,80,.2)');g.addColorStop(1,'rgba(255,176,80,0)');c.fillStyle=g;c.fillRect(60,y,520,420);}
};
function paintWingFloor(key,ss){const tw=T.wings[key],tier=tw.tier,y=tw.y,p=PAL[tier],y0=y+WING.top-WING.wall,y1=y+WING.bot+WING.wall,cv=mkCanvas(Math.round(W*ss),Math.round((y1-y0)*ss)),c=cv.getContext('2d');
  c.setTransform(ss,0,0,ss,0,-y0*ss);c.fillStyle=p.b;c.fillRect(0,y0,W,y1-y0);
  // rough paving outside the room proper
  for(let r=0;r<(y1-y0)/24+1;r++){const yy=y0+r*24,off=(r%2)*26;for(let k=-1;k<13;k++){const h=hash(r*29.3+k*4.1+tier);c.fillStyle='rgba('+(70+h*30|0)+','+(70+h*30|0)+','+(70+h*30|0)+','+(.10+h*.14)+')';c.fillRect(k*52+off+1,yy+1,50,22);}}
  const room=tw.outline.concat([[420,y+583],[366,y+WLEN+60],[366,y1],[274,y1],[274,y+WLEN+60],[220,y+583]]);
  c.save();path(c,room,1);c.clip();
  const g=c.createLinearGradient(0,y,0,y+640);g.addColorStop(0,p.a);g.addColorStop(1,p.b);c.fillStyle=g;c.fillRect(0,y-10,W,900);
  flagstones(c,tier);WING_ART[key](c,y,p);
  const v=c.createLinearGradient(110,0,530,0);v.addColorStop(0,'rgba(0,0,0,.45)');v.addColorStop(.16,'rgba(0,0,0,0)');v.addColorStop(.84,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');c.fillStyle=v;c.fillRect(0,y-10,W,900);
  c.restore();
  // contact shadows
  c.save();c.lineCap='round';c.lineJoin='round';c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=11*ss;c.strokeStyle='rgba(0,0,0,.36)';path(c,tw.outline);c.lineWidth=12;c.stroke();
  for(const w of T.wallPaths)if(tierOf(w.pts[0][1])===tier){path(c,w.pts);c.lineWidth=(w.w||2)*2+5;c.stroke();}
  c.fillStyle='rgba(0,0,0,.4)';for(const b of T.bumps)if(b.tier===tier){c.beginPath();c.arc(b.x,b.y,b.r+3,0,TAU);c.fill();}c.restore();
  // light pools
  c.save();c.globalCompositeOperation='lighter';const pool=key==='den'?['24','0c','1c']:['55','22','40']; // moonlight is nearly white, so it gets less of it
  for(const tr of T.torches)if(tierOf(tr.y)===tier){const rr=tr.r*1.5,q=c.createRadialGradient(tr.x,tr.y,2,tr.x,tr.y,rr);q.addColorStop(0,tr.c+pool[0]);q.addColorStop(.4,tr.c+pool[1]);q.addColorStop(1,tr.c+'00');c.fillStyle=q;c.fillRect(tr.x-rr,tr.y-rr,rr*2,rr*2);}
  for(const b of T.bumps)if(b.tier===tier){const q=c.createRadialGradient(b.x,b.y,b.r,b.x,b.y,b.r+52);q.addColorStop(0,p.glow+pool[2]);q.addColorStop(1,p.glow+'00');c.fillStyle=q;c.fillRect(b.x-90,b.y-90,180,180);}
  c.restore();
  // inserts
  c.textAlign='center';c.textBaseline='middle';
  for(const id in T.shots){const s=T.shots[id];if(s.tier!==tier)continue;c.save();c.translate(s.x,s.y);
    if(s.kind==='dot'){c.fillStyle='rgba(0,0,0,.5)';c.beginPath();c.arc(0,0,9,0,TAU);c.fill();c.strokeStyle='rgba(230,222,200,.45)';c.lineWidth=1.3;c.stroke();c.font='700 8.5px '+R.fontL;c.fillStyle='rgba(235,225,200,.72)';c.fillText(s.name.toUpperCase(),0,18);}
    else{c.rotate(s.ang+PI/2);c.fillStyle='rgba(0,0,0,.55)';c.beginPath();c.moveTo(0,-13);c.lineTo(10,8);c.lineTo(-10,8);c.closePath();c.fill();c.strokeStyle='rgba(230,222,200,.45)';c.lineWidth=1.3;c.stroke();
      c.rotate(-s.ang-PI/2);c.font='700 8.5px '+R.fontL;c.fillStyle='rgba(235,225,200,.75)';c.fillText(s.name.toUpperCase(),0,s.ang===-PI/2?20:22);}
    c.restore();}
  for(const id in T.holes){const h=T.holes[id];if(h.tier!==tier)continue;c.fillStyle='#000';c.beginPath();c.arc(h.x,h.y,h.r+1,0,TAU);c.fill();}
  return {cv,y0,y1};}

/* ---------- what stands at the head of each room ---------- */
const WING_PROPS={
  crypt(Wg,g,mb,y,yE,p){ // a tomb front, and a stone chest whose lid slides when the seal breaks
    const fy=y+6;box(mb.stone,320,fy,0,150,250,34);for(const sx of [-1,1]){cyl(mb.stone,320+sx*96,fy+22,12,0,128,10);cyl(mb.stone,320+sx*96,fy+22,15,128,138,10);}
    box(mb.stone,320,fy+18,138,154,236,52);mb.roof.add(new THREE.CylinderGeometry(1,1,1,3).rotateX(-PI/2),at(320,fy+18,172,0,[150,36,52]));
    const win=new THREE.Mesh(new THREE.CircleGeometry(26,24),new THREE.MeshBasicMaterial({color:hdr(p.glow,1.3)}));win.position.set(0,yE+92,fy+17.6);g.add(win);
    const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr(p.glow,.9),transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false}));halo.position.set(0,yE+92,fy+30);halo.scale.set(220,220,1);g.add(halo);
    box(mb.stone,320,y+96,0,24,58,112);box(mb.dark,320,y+96,24,27,50,104);
    const lid=new THREE.Mesh(new THREE.BoxGeometry(62,9,116),M.bone);lid.position.set(0,yE+31,y+96);lid.castShadow=true;g.add(lid);
    const cr=new THREE.Mesh(new THREE.BoxGeometry(6,2,70),SM({color:'#3a3e2a',roughness:.8}));cr.position.y=5;const cr2=new THREE.Mesh(new THREE.BoxGeometry(34,2,6),cr.material);cr2.position.set(0,5,-16);lid.add(cr,cr2);
    Wg.anim=k=>{lid.position.x=k*30;lid.rotation.y=k*.22;};},
  den(Wg,g,mb,y,yE,p){ // a cave mouth of piled rock, and the ribs of something large arching over the way in
    const rock=new THREE.IcosahedronGeometry(1,0);
    for(const q of [[196,70,58,74],[258,34,50,88],[320,22,56,96],[382,34,50,88],[444,70,58,74],[150,120,40,52],[490,120,40,52]]){const m=at(q[0],y+q[1],q[3]*.38,hash(q[0])*6,[q[2],q[3]*.62,q[2]*.8]);mb.stone.add(rock,m);}
    const rib=new THREE.TorusGeometry(40,3.2,6,18,PI);
    for(let k=0;k<4;k++){const m=new THREE.Mesh(rib,M.bone);m.position.set(0,yE+2,y+92+k*17);m.scale.set(1-k*.06,1.25-k*.1,1);m.castShadow=true;g.add(m);}
    const sk=new THREE.Mesh(new THREE.SphereGeometry(15,12,10),M.bone);sk.position.set(0,yE+102,y+34);sk.scale.set(1,.8,1.5);sk.castShadow=true;g.add(sk);for(const sx of [-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(3.4,8,6),new THREE.MeshBasicMaterial({color:hdr(p.glow,1.6)}));e.position.set(sx*6.5,yE+104,y+53);g.add(e);}
    const shaft=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr(p.glow,.6),transparent:true,opacity:.07,blending:THREE.AdditiveBlending,depthWrite:false}));shaft.position.set(0,yE+150,y+330);shaft.scale.set(250,560,1);g.add(shaft);
    Wg.anim=()=>{};},
  hoard(Wg,g,mb,y,yE,p){ // a vault door in the rock that rolls aside, and coin heaped in every corner
    const fy=y+10;box(mb.stone,320,fy,0,140,280,40);box(mb.stone,320,fy+2,140,158,300,48);
    const dm=SM({color:'#c9983f',metalness:1,roughness:.34,envMapIntensity:1.5,emissive:hdr('#ffb050'),emissiveIntensity:.08}),door=new THREE.Group();
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(50,50,7,28).rotateX(PI/2),dm);disc.castShadow=true;door.add(disc);
    for(let k=0;k<4;k++){const b=new THREE.Mesh(new THREE.BoxGeometry(96,7,3),M.iron);b.rotation.z=k*PI/4;b.position.z=5;door.add(b);}const hub=new THREE.Mesh(new THREE.CylinderGeometry(11,11,10,12).rotateX(PI/2),M.iron);hub.position.z=5;door.add(hub);
    door.position.set(0,yE+78,fy+24);g.add(door);
    const hole=new THREE.Mesh(new THREE.CircleGeometry(44,28),new THREE.MeshBasicMaterial({color:hdr('#ff9a3c',.85)}));{const dk=new THREE.Mesh(new THREE.CircleGeometry(26,24),new THREE.MeshBasicMaterial({color:hdr('#ffd98a',1.25)}));dk.position.z=.3;hole.add(dk);}hole.position.set(0,yE+78,fy+20.4);g.add(hole);
    const gold=SM({color:'#d9a441',metalness:1,roughness:.42,envMapIntensity:1.6,emissive:hdr('#ffb050'),emissiveIntensity:.22,flatShading:true});
    const heap=new THREE.IcosahedronGeometry(1,1);
    for(const q of [[76,96,46,58],[564,96,46,58],[70,470,40,46],[570,470,40,46],[74,290,30,34],[566,290,30,34]]){const m=new THREE.Mesh(heap,gold);m.position.set(q[0]-320,yE-q[3]*.18,y+q[1]);m.scale.set(q[2]*1.15,q[3]*.8,q[2]*1.15);m.rotation.y=hash(q[0]+q[1])*6;m.castShadow=true;g.add(m);
      const top=new THREE.Mesh(heap,gold);top.position.set(q[0]-320+(hash(q[1])-.5)*q[2]*.7,yE+q[3]*.22,y+q[1]+(hash(q[0])-.5)*q[2]*.6);top.scale.set(q[2]*.62,q[3]*.6,q[2]*.62);top.rotation.y=hash(q[0]*3)*6;g.add(top);}
    Wg.anim=k=>{door.position.x=k*104;door.rotation.z=-k*2.1;};}
};

function buildWings(){R3.wings=WING_KEYS.map((key,i)=>buildWing(key,i));}
function buildWing(key,i){const sc=R3.scene,tw=T.wings[key],tier=tw.tier,y=tw.y,p=PAL[tier],g=new THREE.Group();g.position.set(WOXS[i],0,WOZS[i]);sc.add(g);
  const Wg={key,tier,g,k:0,tw},WM=R3.wingMB[i],yE=E[tier],yG=elev(WOZS[i]+y+300)-38,pit=PITS[i];
  const mb={stone:new MB(),dark:new MB(),roof:new MB()},add=(m,mat,o)=>{if(m.p.length)g.add(m.mesh(mat,o));};
  const X0=WING.x0,X1=WING.x1,Y0=y+WING.top,Y1=y+WING.bot,w=WING.wall;
  // floor
  {const fl=Wg.floor=paintWingFloor(key,2),tex=Wg.tex=ctex(fl.cv);tex.anisotropy=R3.rn.capabilities.getMaxAnisotropy();
    const mat=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:new THREE.Color(1,1,1),emissiveIntensity:.44,color:new THREE.Color(1.75,1.75,1.9),roughness:.6,metalness:0,envMapIntensity:.32});
    const m=new MB(),u0=X0/W,u1=X1/W,v=yy=>1-(yy-fl.y0)/(fl.y1-fl.y0);m.hint=[0,1,0];
    m.quad([X0-320,yE,Y0],[X1-320,yE,Y0],[X1-320,yE,Y1],[X0-320,yE,Y1],[u0,v(Y0)],[u1,v(Y0)],[u1,v(Y1)],[u0,v(Y1)]);g.add(m.mesh(mat,{cast:false}));}
  // the room's walls, the lanes under the flippers
  {const out=offsets(tw.outline,17,false),cx=320,cy=y+300,far=L=>L.reduce((a,q)=>a+Math.hypot(q[0]-cx,q[1]-cy),0),side=far(out[0])>far(out[1])?out[0]:out[1];
    strip(mb.stone,side,17,46,{us:80,caps:false});
    for(const sd of [-1,1]){strip(mb.stone,[[320+sd*100,y+583],[320+sd*46,y+WLEN+60]],3,26);cyl(mb.stone,320+sd*104,y+566,9,0,52,8);}
    for(const q of tw.outline.slice(1,-1)){const dx=q[0]-cx,dy=q[1]-cy,l=Math.hypot(dx,dy);cyl(mb.stone,q[0]+dx/l*17,q[1]+dy/l*17,11,0,58,8);cone(mb.stone,q[0]+dx/l*17,q[1]+dy/l*17,13,58,72,8);}}
  // the court the room sits in: retaining walls up to the ground beside the main table
  {const o={flat:yG,base:yE-4};
    prism(mb.dark,[[X0-w,Y0-w],[X0,Y0-w],[X0,Y1+w],[X0-w,Y1+w]],0,o);prism(mb.dark,[[X1,Y0-w],[X1+w,Y0-w],[X1+w,Y1+w],[X1,Y1+w]],0,o);
    prism(mb.dark,[[X0,Y0-w],[X1,Y0-w],[X1,Y0],[X0,Y0]],0,o);prism(mb.dark,[[X0,Y1],[X1,Y1],[X1,Y1+w],[X0,Y1+w]],0,o);}
  WING_PROPS[key](Wg,g,mb,y,yE,p);
  {const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr(p.glow,2),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));glow.position.set(0,yE+44,y+120);glow.scale.set(200,200,1);g.add(glow);Wg.glow=glow;}
  add(mb.stone,M.stone[tier]);add(mb.dark,M.dark);add(mb.roof,M.roof);add(WM.steel,M.steel);add(WM.bronze,M.bronze);add(WM.post,M.post);
  // the land around the court, flat where the court cuts it
  {const m=new MB();m.hint=[0,1,0];const PX0=pit.x0-320,PX1=pit.x1-320,Z0=pit.z0,Z1=pit.z1,a=X0-w-320+WOXS[i],b=X1+w-320+WOXS[i],c=Y0-w+WOZS[i],d=Y1+w+WOZS[i];
    const q=(x0,z0,x1,z1)=>{if(x1-x0<.5||z1-z0<.5)return;const P=(x,z)=>[x,groundY(x+320,z),z];for(let x=x0;x<x1-.01;x+=95)for(let z=z0;z<z1-.01;z+=90){const xb=Math.min(x1,x+95),zb=Math.min(z1,z+90);
        m.quad(P(x,z),P(xb,z),P(xb,zb),P(x,zb),[(x+320)/220,z/220],[(xb+320)/220,z/220],[(xb+320)/220,zb/220],[(x+320)/220,zb/220]);}};
    q(PX0,Z0,a,Z1);q(b,Z0,PX1,Z1);q(a,Z0,b,c);q(a,d,b,Z1);sc.add(m.mesh(M.ground,{cast:false}));}
  // a glow rising from the court while it stands open, so it reads from the main table before you ever go down
  {const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr(p.glow,1.1),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));sp.position.set(0,yG+40,y+330);sp.scale.set(900,900,1);g.add(sp);Wg.beacon=sp;}
  return Wg;}
function repaintWings(){if(!R3.wings)return;for(const Wg of R3.wings){const f=paintWingFloor(Wg.key,2),c=Wg.floor.cv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.drawImage(f.cv,0,0);Wg.tex.needsUpdate=true;}}
function frameWing(dt){const t=G.t,run=G.run,w=run&&run.wing,ft=G.focusTier;let here=null;
  for(const Wg of R3.wings){const open=!Wg.tw.seal[0].on,inside=ft===Wg.tier;if(inside)here=Wg;
    Wg.k+=((open?1:0)-Wg.k)*Math.min(1,dt*3);Wg.anim(Wg.k);Wg.glow.material.opacity=Wg.k*(.7+.2*Math.sin(t*5));
    Wg.beacon.material.opacity=!inside&&w&&w.key===Wg.key&&w.open&&!w.done?.16+.07*Math.sin(t*2.4):0;}
  // one light serves the buried places: it sits in a wing while you are down there, in the Grave otherwise
  const L=R3.tierL[3];if(here){const i=here.tier-4;L.position.set(WOXS[i],E[here.tier]+300,here.tw.y+300+WOZS[i]);L.color.set(PAL[here.tier].glow);L.intensity=[.62,.26,.5][i];}else{L.position.set(0,E[3]+330,GY+320);L.color.set('#9dffc8');L.intensity=1;}}
