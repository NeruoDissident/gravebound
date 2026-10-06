/* ================= PLAYFIELD ART FOR 3D =================
   The playfield is the 2D game's own painted art, laid flat as a texture. Walls, blocks, slings, ramps and
   targets are real geometry now, so only what a real table would print is painted here: stone, scenery art,
   inserts and their names, plus soft contact shadows and light pools baked in. */
const FLOOR_CH=820,FLOOR_Y0=-60,GRAVE_Y0=3190,GRAVE_Y1=4100;
function drawFloor3D(c,ss){
  c.fillStyle='#08080c';c.fillRect(-10,-400,W+20,H+800);
  for(let r=-15;r<(H+300)/24;r++){const y=r*24,off=(r%2)*26;for(let k=-1;k<13;k++){const h=hash(r*31.7+k*3.3);c.fillStyle='rgba('+(52+h*34|0)+','+(50+h*30|0)+','+(70+h*36|0)+','+(.16+h*.16)+')';c.fillRect(k*52+off+1,y+1,50,22);}}
  for(let i=0;i<3;i++){const p=PAL[i],y=TY[i];c.save();fieldPath(c,i);c.clip();
    const g=c.createLinearGradient(0,y,0,y+920);g.addColorStop(0,p.a);g.addColorStop(1,p.b);c.fillStyle=g;c.fillRect(0,y-10,W,1200);
    flagstones(c,i);ART[i](c,y,p);
    if(i===1){c.fillStyle='rgba(8,34,38,.5)';c.beginPath();c.arc(320,y+178,80,0,TAU);c.fill();} // the painted moon would bloom out the stones standing on it
    const v=c.createLinearGradient(20,0,620,0);v.addColorStop(0,'rgba(0,0,0,.42)');v.addColorStop(.14,'rgba(0,0,0,0)');v.addColorStop(.86,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.42)');c.fillStyle=v;c.fillRect(0,y-10,W,1200);
    c.restore();}
  // chutes between levels and the shooter lane
  for(const ch of T.chans){path(c,ch,1);const g=c.createLinearGradient(0,ch[0][1],0,ch[2][1]);g.addColorStop(0,'#0c0c14');g.addColorStop(1,'#1a1a28');c.fillStyle=g;c.fill();
    c.strokeStyle='rgba(120,200,255,.16)';c.lineWidth=1.5;for(let k=1;k<7;k++){const t=k/7;c.beginPath();c.moveTo(lerp(ch[0][0],ch[3][0],t),lerp(ch[0][1],ch[3][1],t));c.lineTo(lerp(ch[1][0],ch[2][0],t),lerp(ch[1][1],ch[2][1],t));c.stroke();}}
  {const g=c.createLinearGradient(586,0,620,0);g.addColorStop(0,'#0a0a10');g.addColorStop(.5,'#1c1c2a');g.addColorStop(1,'#0a0a10');c.fillStyle=g;c.fillRect(587,TY[2]+336,33,H);
   c.strokeStyle='rgba(255,210,120,.25)';c.lineWidth=2;for(let y=TY[2]+420;y<3080;y+=46){c.beginPath();c.moveTo(594,y+9);c.lineTo(603,y);c.lineTo(612,y+9);c.stroke();}}
  // faint underground tunnels
  c.setLineDash([3,9]);c.lineWidth=2;c.strokeStyle='rgba(140,220,255,.10)';for(const id in T.tunnels){const t=T.tunnels[id];if(t.to==='crypt'&&id==='rise')continue;c.beginPath();for(let k=0;k<t.n;k+=2)c.lineTo(t.x[k],t.y[k]);c.stroke();}c.setLineDash([]);
  // baked contact shadows where geometry meets the floor
  c.save();c.lineCap='round';c.lineJoin='round';c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=11*ss;c.strokeStyle='rgba(0,0,0,.34)';
  for(const w of T.wallPaths){if(w.style==='gate')continue;path(c,w.pts);c.lineWidth=(w.w||2)*2+5;c.stroke();}
  for(const b of T.blocks){path(c,b.pts,1);c.lineWidth=7;c.stroke();}
  for(const s of T.slings){path(c,[s.A,s.B,s.C],1);c.lineWidth=7;c.stroke();}
  for(let i=0;i<3;i++){fieldPath(c,i);c.lineWidth=12;c.stroke();}
  c.fillStyle='rgba(0,0,0,.4)';for(const b of T.bumps){if(b.tier>2)continue;c.beginPath();c.arc(b.x,b.y,b.r+3,0,TAU);c.fill();}
  for(const s of G.statues){c.beginPath();c.arc(s.x,s.y,s.r+3,0,TAU);c.fill();}
  c.restore();
  // baked light pools
  c.save();c.globalCompositeOperation='lighter';
  for(const tr of T.torches){if(tr.y>H)continue;const rr=tr.r*1.5,g=c.createRadialGradient(tr.x,tr.y,2,tr.x,tr.y,rr);g.addColorStop(0,tr.c+'55');g.addColorStop(.4,tr.c+'22');g.addColorStop(1,tr.c+'00');c.fillStyle=g;c.fillRect(tr.x-rr,tr.y-rr,rr*2,rr*2);}
  for(const b of T.bumps){if(b.tier>2)continue;const col=b.bell?'#ffd070':PAL[b.tier].glow,g=c.createRadialGradient(b.x,b.y,b.r,b.x,b.y,b.r+52);g.addColorStop(0,col+'40');g.addColorStop(1,col+'00');c.fillStyle=g;c.fillRect(b.x-90,b.y-90,180,180);}
  c.restore();
  // inserts and their names
  c.textAlign='center';c.textBaseline='middle';
  for(const id in T.shots){const s=T.shots[id];if(s.tier>2||id==='door'||id==='nails')continue;c.save();c.translate(s.x,s.y);
    if(s.kind==='dot'){c.fillStyle='rgba(0,0,0,.5)';c.beginPath();c.arc(0,0,9,0,TAU);c.fill();c.strokeStyle='rgba(230,222,200,.45)';c.lineWidth=1.3;c.stroke();c.font='700 8.5px '+R.fontL;c.fillStyle='rgba(235,225,200,.72)';c.fillText(s.name.toUpperCase(),0,18);}
    else{c.rotate(s.ang+PI/2);c.fillStyle='rgba(0,0,0,.55)';c.beginPath();c.moveTo(0,-13);c.lineTo(10,8);c.lineTo(-10,8);c.closePath();c.fill();c.strokeStyle='rgba(230,222,200,.45)';c.lineWidth=1.3;c.stroke();
      c.rotate(-PI/2);c.font='700 8.5px '+R.fontL;c.fillStyle='rgba(235,225,200,.75)';if(Math.cos(s.ang)<-.05){c.rotate(PI);c.textAlign='left';c.fillText(s.name.toUpperCase(),15,0);}else{c.textAlign='right';c.fillText(s.name.toUpperCase(),-15,0);}}
    c.restore();}
  for(const id in T.holes){const h=T.holes[id];if(h.tier>2)continue;c.fillStyle='#000';c.beginPath();c.arc(h.x,h.y,h.r+1,0,TAU);c.fill();}
  // plunger gauge and the grave marker at the drain
  c.font='700 9px '+R.fontL;c.fillStyle='rgba(235,225,200,.6)';c.textAlign='center';c.fillText('LOST SOULS',303,3150);
}
function paintFloorChunks(ss){const out=[];
  for(let k=0;k<4;k++){const y0=FLOOR_Y0+k*FLOOR_CH,cv=mkCanvas(Math.round(W*ss),Math.round(FLOOR_CH*ss)),c=cv.getContext('2d');
    c.setTransform(ss,0,0,ss,0,-y0*ss);drawFloor3D(c,ss);out.push({cv,y0,y1:y0+FLOOR_CH});}
  {const cv=mkCanvas(Math.round(W*ss),Math.round((GRAVE_Y1-GRAVE_Y0)*ss)),c=cv.getContext('2d');c.setTransform(ss,0,0,ss,0,-GRAVE_Y0*ss);
    c.fillStyle='#0a0806';c.fillRect(0,GRAVE_Y0,W,GRAVE_Y1-GRAVE_Y0);drawGrave(c);out.push({cv,y0:GRAVE_Y0,y1:GRAVE_Y1,grave:true});}
  return out;}

/* ---------- procedural material textures ---------- */
function texStone(){const S=256,cv=mkCanvas(S,S),c=cv.getContext('2d');c.fillStyle='#8d8a98';c.fillRect(0,0,S,S);
  const rows=8,rh=S/rows;
  for(let r=0;r<rows;r++){const off=(r%2)*32+hash(r*3.3)*12;let x=-off;let k=0;
    while(x<S){const w=44+hash(r*17.1+k*5.7)*40,h=hash(r*9.7+k*2.3),v=118+h*56|0;c.fillStyle='rgb('+v+','+(v-2)+','+(v+10)+')';c.fillRect(x+1.5,r*rh+1.5,w-3,rh-3);
      c.fillStyle='rgba(255,255,255,.07)';c.fillRect(x+1.5,r*rh+1.5,w-3,2);c.fillStyle='rgba(0,0,0,.16)';c.fillRect(x+1.5,r*rh+rh-4,w-3,2.5);x+=w;k++;}}
  for(let i=0;i<2600;i++){const x=hash(i*1.31)*S,y=hash(i*2.77)*S,d=hash(i*5.1);c.fillStyle=d>.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.09)';c.fillRect(x,y,1+d*2,1+d*2);}
  for(let i=0;i<14;i++){c.strokeStyle='rgba(0,0,0,.2)';c.lineWidth=.8;c.beginPath();let x=hash(i*7.7)*S,y=hash(i*3.9)*S;c.moveTo(x,y);for(let k=0;k<5;k++){x+=(hash(i+k*1.7)-.5)*26;y+=hash(i*2+k)*12;c.lineTo(x,y);}c.stroke();}
  return cv;}
function texWood(){const S=256,cv=mkCanvas(S,S),c=cv.getContext('2d');c.fillStyle='#6b4a2c';c.fillRect(0,0,S,S);
  for(let p=0;p<4;p++){const y=p*64,v=hash(p*3.1);c.fillStyle='rgba('+(120+v*40|0)+','+(82+v*26|0)+','+(48+v*16|0)+',1)';c.fillRect(0,y+1,S,62);
    for(let k=0;k<26;k++){c.strokeStyle='rgba(40,22,8,'+(.12+hash(p*11+k)*.2)+')';c.lineWidth=.6+hash(k+p)*1.2;c.beginPath();const yy=y+3+hash(p*5+k*1.9)*58;c.moveTo(0,yy);c.bezierCurveTo(80,yy+(hash(k)-.5)*8,170,yy+(hash(k+3)-.5)*8,S,yy);c.stroke();}
    c.fillStyle='rgba(0,0,0,.5)';c.fillRect(0,y,S,2);}
  return cv;}
function texGround(){const S=256,cv=mkCanvas(S,S),c=cv.getContext('2d');c.fillStyle='#3c4038';c.fillRect(0,0,S,S);
  for(let i=0;i<5200;i++){const x=hash(i*1.13)*S,y=hash(i*3.71)*S,d=hash(i*7.3);c.fillStyle=d>.55?'rgba(120,140,110,.10)':'rgba(0,0,0,.14)';c.fillRect(x,y,1+d*3,1+d*3);}
  for(let i=0;i<60;i++){const x=hash(i*9.1)*S,y=hash(i*4.3)*S;c.fillStyle='rgba(0,0,0,.12)';c.beginPath();c.ellipse(x,y,8+hash(i)*16,5+hash(i+2)*10,hash(i)*3,0,TAU);c.fill();}
  return cv;}
function texRampBed(col){const cv=mkCanvas(64,128),c=cv.getContext('2d');c.fillStyle='#161824';c.fillRect(0,0,64,128);
  c.fillStyle='#232638';c.fillRect(3,0,58,128);c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=2;for(let y=0;y<128;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(64,y);c.stroke();}
  c.strokeStyle=col;c.lineWidth=5;c.lineJoin='miter';c.globalAlpha=.9;for(let y=20;y<160;y+=64){c.beginPath();c.moveTo(14,y+14);c.lineTo(32,y-6);c.lineTo(50,y+14);c.stroke();}
  return cv;}
function texRampGlow(col){const cv=mkCanvas(64,128),c=cv.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,64,128);
  c.strokeStyle=col;c.lineWidth=5;for(let y=20;y<160;y+=64){c.beginPath();c.moveTo(14,y+14);c.lineTo(32,y-6);c.lineTo(50,y+14);c.stroke();}return cv;}
function texGlow(){const cv=mkCanvas(64,64),c=cv.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.55)');g.addColorStop(.6,'rgba(255,255,255,.13)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,64,64);return cv;}
function texFlame(){const cv=mkCanvas(64,96),c=cv.getContext('2d');
  const g=c.createRadialGradient(32,66,2,32,60,30);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.7)');g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g;c.beginPath();c.moveTo(32,2);c.bezierCurveTo(46,30,60,48,54,70);c.bezierCurveTo(50,90,14,90,10,70);c.bezierCurveTo(4,48,22,32,32,2);c.fill();return cv;}
function texSky(){ // tiny equirect environment for reflections: night sky, a moon, warm torchlight low down
  const cv=mkCanvas(512,256),c=cv.getContext('2d');let g=c.createLinearGradient(0,0,0,256);
  g.addColorStop(0,'#27365e');g.addColorStop(.42,'#141a30');g.addColorStop(.5,'#0c0d16');g.addColorStop(1,'#050506');c.fillStyle=g;c.fillRect(0,0,512,256);
  const blob=(x,y,r,col)=>{const q=c.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,col);q.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=q;c.fillRect(x-r,y-r,r*2,r*2);};
  c.globalCompositeOperation='lighter';blob(150,48,58,'rgba(235,245,255,1)');blob(150,48,120,'rgba(120,150,220,.5)');
  blob(60,118,50,'rgba(255,150,60,.9)');blob(330,122,44,'rgba(255,120,50,.8)');blob(450,112,56,'rgba(255,170,80,.7)');blob(256,20,90,'rgba(80,110,190,.5)');blob(400,60,40,'rgba(150,255,210,.35)');
  return cv;}
function texBall(){ // faint engraved bands so the roll reads on a mirror ball
  const cv=mkCanvas(256,128),c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,256,128);
  c.fillStyle='#b9b9b9';c.fillRect(0,58,256,3);c.fillRect(0,67,256,3);
  c.fillStyle='#9a9a9a';for(let k=0;k<8;k++){c.save();c.translate(16+k*32,64);c.rotate(PI/4);c.fillRect(-2.6,-2.6,5.2,5.2);c.restore();}
  for(let k=0;k<6;k++){c.fillStyle='#c4c4c4';c.beginPath();c.arc(21+k*42.6,22,5,0,TAU);c.fill();c.beginPath();c.arc(42+k*42.6,106,5,0,TAU);c.fill();}
  return cv;}
function texRose(){const cv=mkCanvas(256,256),c=cv.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,256,256);rose(c,128,128,116,['#ff3b55','#ffc04a','#4f86ff','#b04ad0']);return cv;}
