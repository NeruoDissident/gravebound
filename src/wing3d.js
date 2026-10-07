/* ================= CAMPAIGN WINGS IN 3D =================
   A wing is a small room with its own flippers. In table space it sits past the Grave, so the physics never has
   to know about it; in the world it is a sunken court beside the Wilds (see WOX, WOZ, zshift in render3d.js).
   Everything static here is built in table space inside one group, and the group carries the offset. */
const WING={x0:40,x1:600,y0:WY-40,y1:WY+760,wall:40};
function paintWingFloor(ss){const y0=WING.y0-WING.wall,y1=WING.y1+WING.wall,cv=mkCanvas(Math.round(W*ss),Math.round((y1-y0)*ss)),c=cv.getContext('2d'),p=PAL[4],y=WY;
  c.setTransform(ss,0,0,ss,0,-y0*ss);c.fillStyle='#0b0c08';c.fillRect(0,y0,W,y1-y0);
  // rough paving outside the room proper
  for(let r=0;r<(y1-y0)/24+1;r++){const yy=y0+r*24,off=(r%2)*26;for(let k=-1;k<13;k++){const h=hash(r*29.3+k*4.1);c.fillStyle='rgba('+(66+h*30|0)+','+(70+h*30|0)+','+(48+h*24|0)+','+(.14+h*.16)+')';c.fillRect(k*52+off+1,yy+1,50,22);}}
  const room=T.wing.outline.concat([[420,y+583],[366,WH+60],[366,y1],[274,y1],[274,WH+60],[220,y+583]]);
  c.save();path(c,room,1);c.clip();
  let g=c.createLinearGradient(0,y,0,y+640);g.addColorStop(0,p.a);g.addColorStop(1,p.b);c.fillStyle=g;c.fillRect(0,y-10,W,900);
  flagstones(c,4);
  // the aisle to the sarcophagus, burial niches down both walls, a ward circle before the flippers
  g=c.createLinearGradient(0,y+190,0,y+560);g.addColorStop(0,'rgba(120,130,60,.34)');g.addColorStop(1,'rgba(90,100,40,.08)');c.fillStyle=g;path(c,[[302,y+190],[338,y+190],[356,y+560],[284,y+560]],1);c.fill();
  c.strokeStyle='rgba(216,240,112,.3)';c.lineWidth=1.6;path(c,[[304,y+190],[288,y+560]]);c.stroke();path(c,[[336,y+190],[352,y+560]]);c.stroke();
  for(const sx of [-1,1])for(let k=0;k<3;k++){const nx=320+sx*150,ny=y+360+k*56-(k*k*4);c.fillStyle='rgba(0,0,0,.5)';c.beginPath();c.moveTo(nx-15,ny+20);c.lineTo(nx-15,ny-6);c.arc(nx,ny-6,15,PI,0);c.lineTo(nx+15,ny+20);c.closePath();c.fill();
    c.strokeStyle='rgba(200,224,96,.22)';c.lineWidth=1.2;c.stroke();c.fillStyle='rgba(230,224,196,.5)';c.beginPath();c.arc(nx,ny+2,6,0,TAU);c.fill();c.fillRect(nx-4,ny+6,8,5);c.fillStyle='#0a0b06';c.beginPath();c.arc(nx-2.4,ny+1.5,1.7,0,TAU);c.arc(nx+2.4,ny+1.5,1.7,0,TAU);c.fill();}
  sigil(c,320,y+430,78,p.acc,0);
  g=c.createRadialGradient(320,y+150,10,320,y+150,230);g.addColorStop(0,'rgba(216,240,112,.13)');g.addColorStop(1,'rgba(216,240,112,0)');c.fillStyle=g;c.fillRect(60,y,520,420);
  const v=c.createLinearGradient(120,0,520,0);v.addColorStop(0,'rgba(0,0,0,.45)');v.addColorStop(.16,'rgba(0,0,0,0)');v.addColorStop(.84,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.45)');c.fillStyle=v;c.fillRect(0,y-10,W,900);
  c.restore();
  // contact shadows
  c.save();c.lineCap='round';c.lineJoin='round';c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=11*ss;c.strokeStyle='rgba(0,0,0,.36)';path(c,T.wing.outline);c.lineWidth=12;c.stroke();
  for(const w of T.wallPaths)if(inWing(w.pts[0][1])){path(c,w.pts);c.lineWidth=(w.w||2)*2+5;c.stroke();}
  c.fillStyle='rgba(0,0,0,.4)';for(const b of T.bumps)if(b.tier===4){c.beginPath();c.arc(b.x,b.y,b.r+3,0,TAU);c.fill();}c.restore();
  // light pools
  c.save();c.globalCompositeOperation='lighter';
  for(const tr of T.torches)if(inWing(tr.y)){const rr=tr.r*1.5,q=c.createRadialGradient(tr.x,tr.y,2,tr.x,tr.y,rr);q.addColorStop(0,tr.c+'55');q.addColorStop(.4,tr.c+'22');q.addColorStop(1,tr.c+'00');c.fillStyle=q;c.fillRect(tr.x-rr,tr.y-rr,rr*2,rr*2);}
  for(const b of T.bumps)if(b.tier===4){const q=c.createRadialGradient(b.x,b.y,b.r,b.x,b.y,b.r+52);q.addColorStop(0,p.glow+'40');q.addColorStop(1,p.glow+'00');c.fillStyle=q;c.fillRect(b.x-90,b.y-90,180,180);}
  c.restore();
  // inserts
  c.textAlign='center';c.textBaseline='middle';
  for(const id in T.shots){const s=T.shots[id];if(s.tier!==4)continue;c.save();c.translate(s.x,s.y);
    if(s.kind==='dot'){c.fillStyle='rgba(0,0,0,.5)';c.beginPath();c.arc(0,0,9,0,TAU);c.fill();c.strokeStyle='rgba(230,222,200,.45)';c.lineWidth=1.3;c.stroke();c.font='700 8.5px '+R.fontL;c.fillStyle='rgba(235,225,200,.72)';c.fillText(s.name.toUpperCase(),0,18);}
    else{c.rotate(s.ang+PI/2);c.fillStyle='rgba(0,0,0,.55)';c.beginPath();c.moveTo(0,-13);c.lineTo(10,8);c.lineTo(-10,8);c.closePath();c.fill();c.strokeStyle='rgba(230,222,200,.45)';c.lineWidth=1.3;c.stroke();
      c.rotate(-s.ang-PI/2);c.font='700 8.5px '+R.fontL;c.fillStyle='rgba(235,225,200,.75)';c.fillText(s.name.toUpperCase(),0,s.ang===-PI/2?20:22);}
    c.restore();}
  for(const id in T.holes){const h=T.holes[id];if(h.tier!==4)continue;c.fillStyle='#000';c.beginPath();c.arc(h.x,h.y,h.r+1,0,TAU);c.fill();}
  return {cv,y0,y1};}

function buildWing(){const sc=R3.scene,g=new THREE.Group();g.position.set(WOX,0,WOZ);sc.add(g);const Wg=R3.wing={g},WM=R3.wingMB,yE=E[4],yG=E[1]-38,y=WY;
  const stone=new MB(),dark=new MB(),bone=new MB(),roof=new MB(),add=(mb,mat,o)=>{if(mb.p.length)g.add(mb.mesh(mat,o));};
  // floor
  {const fl=Wg.floor=paintWingFloor(2),tex=Wg.tex=ctex(fl.cv);tex.anisotropy=R3.rn.capabilities.getMaxAnisotropy();
    const mat=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:new THREE.Color(1,1,1),emissiveIntensity:.44,color:new THREE.Color(1.75,1.75,1.9),roughness:.6,metalness:0,envMapIntensity:.32});
    const mb=new MB(),u0=WING.x0/W,u1=WING.x1/W,v=yy=>1-(yy-fl.y0)/(fl.y1-fl.y0);mb.hint=[0,1,0];
    mb.quad([WING.x0-320,yE,WING.y0],[WING.x1-320,yE,WING.y0],[WING.x1-320,yE,WING.y1],[WING.x0-320,yE,WING.y1],[u0,v(WING.y0)],[u1,v(WING.y0)],[u1,v(WING.y1)],[u0,v(WING.y1)]);g.add(mb.mesh(mat,{cast:false}));}
  // the room's walls, the lanes under the flippers
  {const out=offsets(T.wing.outline,17,false),cx=320,cy=y+300,far=L=>L.reduce((a,p)=>a+Math.hypot(p[0]-cx,p[1]-cy),0),side=far(out[0])>far(out[1])?out[0]:out[1];
    strip(stone,side,17,46,{us:80,caps:false});
    for(const sd of [-1,1]){strip(stone,[[320+sd*100,y+583],[320+sd*46,WH+60]],3,26);cyl(stone,320+sd*104,y+566,9,0,52,8);}
    for(const p of T.wing.outline.slice(1,7)){const dx=p[0]-cx,dy=p[1]-cy,l=Math.hypot(dx,dy);cyl(stone,p[0]+dx/l*17,p[1]+dy/l*17,11,0,58,8);cone(stone,p[0]+dx/l*17,p[1]+dy/l*17,13,58,72,8);}}
  // the court the room sits in: retaining walls up to the ground the Wilds stands on
  {const w=WING.wall,o={flat:yG,base:yE-4};
    prism(dark,[[WING.x0-w,WING.y0-w],[WING.x0,WING.y0-w],[WING.x0,WING.y1+w],[WING.x0-w,WING.y1+w]],0,o);prism(dark,[[WING.x1,WING.y0-w],[WING.x1+w,WING.y0-w],[WING.x1+w,WING.y1+w],[WING.x1,WING.y1+w]],0,o);
    prism(dark,[[WING.x0,WING.y0-w],[WING.x1,WING.y0-w],[WING.x1,WING.y0],[WING.x0,WING.y0]],0,o);prism(dark,[[WING.x0,WING.y1],[WING.x1,WING.y1],[WING.x1,WING.y1+w],[WING.x0,WING.y1+w]],0,o);}
  // the tomb front behind the sarcophagus
  {const fy=y+6;box(stone,320,fy,0,150,250,34);for(const sx of [-1,1]){cyl(stone,320+sx*96,fy+22,12,0,128,10);cyl(stone,320+sx*96,fy+22,15,128,138,10);}
    box(stone,320,fy+18,138,154,236,52);roof.add(new THREE.CylinderGeometry(1,1,1,3).rotateX(-PI/2),at(320,fy+18,172,0,[150,36,52]));
    const win=new THREE.Mesh(new THREE.CircleGeometry(26,24),new THREE.MeshBasicMaterial({color:hdr(PAL[4].glow,1.3)}));win.position.set(0,yE+92,fy+17.6);g.add(win);
    const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr(PAL[4].glow,.9),transparent:true,opacity:.4,blending:THREE.AdditiveBlending,depthWrite:false}));halo.position.set(0,yE+92,fy+30);halo.scale.set(220,220,1);g.add(halo);}
  // the sarcophagus: a stone chest with a lid that slides when the seal breaks
  {box(stone,320,y+96,0,24,58,112);box(dark,320,y+96,24,27,50,104);
    const lid=new THREE.Mesh(new THREE.BoxGeometry(62,9,116),M.bone);lid.position.set(0,yE+31,y+96);lid.castShadow=true;g.add(lid);Wg.lid=lid;
    const cr=new THREE.Mesh(new THREE.BoxGeometry(6,2,70),SM({color:'#3a3e2a',roughness:.8}));cr.position.y=5;const cr2=new THREE.Mesh(new THREE.BoxGeometry(34,2,6),cr.material);cr2.position.set(0,5,-16);lid.add(cr,cr2);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr(PAL[4].glow,2),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));glow.position.set(0,yE+44,y+110);glow.scale.set(200,200,1);g.add(glow);Wg.glow=glow;}
  add(stone,M.stone[4]);add(dark,M.dark);add(bone,M.bone);add(roof,M.roof);add(WM.steel,M.steel);add(WM.bronze,M.bronze);add(WM.post,M.post);
  // the land around the court, flat where the court cuts it
  {const mb=new MB();mb.hint=[0,1,0];const X0=PIT.x0-320,X1=PIT.x1-320,Z0=PIT.z0,Z1=PIT.z1,a=WING.x0-WING.wall-320+WOX,b=WING.x1+WING.wall-320+WOX,c=WING.y0-WING.wall+WOZ,d=WING.y1+WING.wall+WOZ;
    const q=(x0,z0,x1,z1)=>{if(x1-x0<.5||z1-z0<.5)return;const P=(x,z)=>[x,groundY(x+320,z),z];for(let x=x0;x<x1-.01;x+=95)for(let z=z0;z<z1-.01;z+=90){const xb=Math.min(x1,x+95),zb=Math.min(z1,z+90);
        mb.quad(P(x,z),P(xb,z),P(xb,zb),P(x,zb),[(x+320)/220,z/220],[(xb+320)/220,z/220],[(xb+320)/220,zb/220],[(x+320)/220,zb/220]);}};
    q(X0,Z0,a,Z1);q(b,Z0,X1,Z1);q(a,Z0,b,c);q(a,d,b,Z1);sc.add(mb.mesh(M.ground,{cast:false}));}
  // corpse-light rising from the court, so it reads from the Wilds before you ever go down
  {const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr(PAL[4].glow,1.1),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));sp.position.set(0,yG+40,y+330);sp.scale.set(900,900,1);g.add(sp);Wg.beacon=sp;}
  Wg.k=0;}
function repaintWing(){const Wg=R3.wing;if(!Wg)return;const f=paintWingFloor(2),c=Wg.floor.cv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.drawImage(f.cv,0,0);Wg.tex.needsUpdate=true;}
function frameWing(dt){const Wg=R3.wing,t=G.t,run=G.run,open=!T.wing.seal[0].on,inside=G.focusTier===4,w=run&&run.wing;
  Wg.k+=((open?1:0)-Wg.k)*Math.min(1,dt*3);Wg.lid.position.x=Wg.k*30;Wg.lid.rotation.y=Wg.k*.22;Wg.glow.material.opacity=Wg.k*(.7+.2*Math.sin(t*5));
  Wg.beacon.material.opacity=!inside&&w&&w.open&&!w.done?.16+.07*Math.sin(t*2.4):0;
  // one light serves the buried places: it sits in the wing while you are down there, in the Grave otherwise
  const L=R3.tierL[3];if(inside){L.position.set(WOX,E[4]+300,WY+300+WOZ);L.color.set(PAL[4].glow);L.intensity=.62;}else{L.position.set(0,E[3]+330,GY+320);L.color.set('#9dffc8');L.intensity=1;}}
