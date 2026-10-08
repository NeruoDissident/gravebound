/* ================= ACTORS IN 3D =================
   Foes are jointed figures (foes3d.js) over a ring that marks their true hit radius. Bosses and pickups are the
   2D game's own painted sprites, stood up on the table as billboards. Spell effects are decals on the floor. */
function spriteTex(draw,units,px){const cv=mkCanvas(px,px),c=cv.getContext('2d');c.translate(px/2,px/2);c.scale(px/units,px/units);c.lineJoin='round';draw(c);return ctex(cv);}
function buildActors(){const sc=R3.scene,X=R3.act={tex:{},foes:[],picks:[],zones:[],booms:[]};
  for(const k in EDRAW)X.tex[k]=spriteTex(EDRAW[k],64,192);
  for(const k in BDRAW)X.tex['b_'+k]=spriteTex(BDRAW[k],160,480);
  const stroke=c=>{c.strokeStyle='#07070b';c.lineWidth=1.5;};
  X.tex.heart=spriteTex(c=>{stroke(c);c.fillStyle='#ff6a8a';c.beginPath();c.moveTo(0,7);c.bezierCurveTo(-12,-2,-5,-10,0,-3);c.bezierCurveTo(5,-10,12,-2,0,7);c.fill();c.stroke();},32,96);
  X.tex.gold=spriteTex(c=>{stroke(c);c.fillStyle='#ffd24a';c.beginPath();c.arc(0,0,6.5,0,TAU);c.fill();c.stroke();c.fillStyle='#fff2b0';c.beginPath();c.arc(-2,-2,2,0,TAU);c.fill();},32,96);
  X.tex.relic=spriteTex(c=>{stroke(c);c.fillStyle='#ffd24a';c.beginPath();c.moveTo(0,-11);c.lineTo(8,0);c.lineTo(0,11);c.lineTo(-8,0);c.closePath();c.fill();c.stroke();c.fillStyle='#fff2b0';c.beginPath();c.moveTo(0,-6);c.lineTo(4,0);c.lineTo(0,3);c.closePath();c.fill();},32,96);
  X.ringG=new THREE.RingGeometry(.84,1,44).rotateX(-PI/2);X.thinG=new THREE.RingGeometry(.955,1,64).rotateX(-PI/2);X.discG=new THREE.CircleGeometry(1,48).rotateX(-PI/2);
  X.foeC=hdr('#ff7a80',.8);
  const sprite=o=>{const s=new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({transparent:true,depthWrite:false},o)));s.visible=false;sc.add(s);return s;};
  const decal=(geo,col,op)=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:hdr(col,1.4),transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));m.renderOrder=2;m.visible=false;sc.add(m);return m;};
  const blob=()=>{const m=new THREE.Mesh(R3.blobGeo,new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.42,depthWrite:false,map:R3.glowTex,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));m.renderOrder=3;m.visible=false;sc.add(m);return m;};
  for(let i=0;i<24;i++)X.foes.push({halo:sprite({map:R3.glowTex,blending:THREE.AdditiveBlending,opacity:.4}),rg:decal(X.ringG,'#ff7a80',.3),blob:blob()});
  X.boss={glow:sprite({map:R3.glowTex,blending:THREE.AdditiveBlending,opacity:.5}),sp:sprite({map:X.tex.b_warden}),rg:decal(X.ringG,'#ffffff',.5),blob:blob(),key:'',
    shield:(()=>{const m=new THREE.Mesh(new THREE.TorusGeometry(1,.05,6,48).rotateX(PI/2),new THREE.MeshBasicMaterial({color:hdr('#9fe8ff',2)}));m.visible=false;sc.add(m);return m;})(),
    light:(()=>{const l=new THREE.PointLight(0xffffff,0,420,1.5);sc.add(l);return l;})()};
  for(let i=0;i<12;i++)X.picks.push({halo:sprite({map:R3.glowTex,blending:THREE.AdditiveBlending,opacity:.6}),sp:sprite({map:X.tex.gold}),kind:''});
  for(let i=0;i<4;i++)X.zones.push({disc:decal(X.discG,'#ffe0a0',.1),ring:decal(X.thinG,'#ffe0a0',.7)});
  for(let i=0;i<8;i++)X.booms.push(decal(X.ringG,'#ffffff',1));
  X.all=[];for(const o of X.foes)X.all.push(o.halo,o.rg,o.blob);for(const o of X.picks)X.all.push(o.sp,o.halo);for(const o of X.zones)X.all.push(o.disc,o.ring);for(const m of X.booms)X.all.push(m);}

function frameActors(dt,ex){const X=R3.act,t=G.t,tc=R3.tmpC;
  // foes
  frameFoes(dt);frameAllies(dt);
  for(let i=0;i<X.foes.length;i++){const o=X.foes[i],e=G.enemies[i];if(!e||e.dead){o.halo.visible=o.rg.visible=o.blob.visible=false;continue;}
    const k=e.spawn>0?Math.max(.05,1-e.spawn/.7):1,gy=elev(e.y),y=gy+e.r+13;
    const warn=e.wind>0&&e.tier===G.focusTier,qc=e.quest?(e.quest.main?'main':'side'):null;
    o.rg.visible=o.blob.visible=true;
    o.blob.position.set(e.x-320,gy+.5,e.y);o.blob.scale.setScalar((e.hr||e.r)*1.5*k);
    o.rg.position.set(e.x-320,gy+.7,e.y);o.rg.scale.setScalar((e.hr||e.r)*k);const rm=o.rg.material;
    if(warn){rm.color.copy(R3.litC.danger);rm.opacity=.6+.4*Math.sin(t*18);}else if(qc){rm.color.copy(R3.litC[qc]);rm.opacity=.5+.25*Math.sin(t*6);}else{rm.color.copy(X.foeC);rm.opacity=.32;}
    o.halo.visible=warn||!!qc;if(o.halo.visible){o.halo.position.set(e.x-320,y,e.y);o.halo.scale.setScalar(e.r*(warn?6:5));o.halo.material.color.copy(R3.litC[warn?'danger':qc]);o.halo.material.opacity=warn?.3+.25*Math.sin(t*18):.22+.1*Math.sin(t*6);}}
  // boss
  {const bo=G.boss,B=X.boss;
    if(!bo){B.sp.visible=B.glow.visible=B.rg.visible=B.blob.visible=B.shield.visible=false;B.light.intensity=0;}
    else{const d=bo.def,k=bo.alive?clamp(1-bo.rise/1.5,0,1):clamp(bo.dying/2.2,0,1),gy=elev(bo.y),y=gy+58+Math.sin(bo.t*2)*3,f=Math.max(0,bo.flash),m=B.sp.material;
      if(B.key!==bo.key){B.key=bo.key;m.map=X.tex['b_'+bo.key];}
      const pc=bo.phase==='cast'?'#ff4050':bo.phase==='shield'?'#62d8ff':d.color,on=k>.02;
      B.sp.visible=B.glow.visible=B.rg.visible=B.blob.visible=on;B.sp.position.set(bo.x-320,y,bo.y);B.sp.scale.set(152*k,152*k,1);m.opacity=k;const b=1+f*2.2;m.color.setRGB(b,b,b);
      B.glow.position.set(bo.x-320,y,bo.y-4);B.glow.scale.setScalar(bo.r*9*k);B.glow.material.color.copy(tc.set(pc).convertSRGBToLinear().multiplyScalar(1.3));B.glow.material.opacity=(.4+.2*Math.sin(t*4))*k;
      B.blob.position.set(bo.x-320,gy+.5,bo.y);B.blob.scale.setScalar(bo.r*1.6*k);
      B.rg.position.set(bo.x-320,gy+.7,bo.y);B.rg.scale.setScalar(bo.r*k);B.rg.material.color.copy(tc.set(pc).convertSRGBToLinear().multiplyScalar(1.5));B.rg.material.opacity=.45+.2*Math.sin(t*4);
      B.shield.visible=bo.alive&&bo.phase==='shield';if(B.shield.visible){B.shield.position.set(bo.x-320,gy+14,bo.y);B.shield.scale.setScalar((bo.r+10)*(1+.03*Math.sin(t*8)));B.shield.rotation.y=t*1.5;}
      B.light.color.set(pc);B.light.position.set(bo.x-320,gy+70,bo.y+30);B.light.intensity=(1.3+f*1.5)*k;}}
  // pickups
  for(let i=0;i<X.picks.length;i++){const o=X.picks[i],p=G.pickups[i];if(!p){o.sp.visible=o.halo.visible=false;continue;}
    const kind=p.kind==='heart'?'heart':p.kind==='gold'?'gold':'relic',y=elev(p.y)+16+Math.sin(p.t*4)*3;if(o.kind!==kind){o.kind=kind;o.sp.material.map=X.tex[kind];}
    o.sp.visible=o.halo.visible=true;o.sp.position.set(p.x-320,y,p.y);o.sp.scale.set(34,34,1);o.halo.position.set(p.x-320,y,p.y);o.halo.scale.setScalar(52);o.halo.material.color.copy(tc.set(kind==='heart'?'#ff6a8a':'#ffd24a').convertSRGBToLinear().multiplyScalar(1.3));}
  // hallowed ground, shockwaves
  for(let i=0;i<X.zones.length;i++){const o=X.zones[i],z=G.zones[i];if(!z){o.disc.visible=o.ring.visible=false;continue;}const a=Math.min(1,z.t/1.5),gy=elev(z.y)+.8;
    o.disc.visible=o.ring.visible=true;tc.set(z.fire?'#ff6a2a':'#ffe0a0').convertSRGBToLinear().multiplyScalar(1.4);o.disc.material.color.copy(tc);o.ring.material.color.copy(tc);o.disc.position.set(z.x-320,gy,z.y);o.disc.scale.setScalar(z.r);o.disc.material.opacity=(z.fire?.2+.08*Math.sin(t*9):.11)*a;o.ring.position.set(z.x-320,gy+.1,z.y);o.ring.scale.setScalar(z.r);o.ring.material.opacity=.75*a;}
  for(let i=0;i<X.booms.length;i++){const m=X.booms[i],b=G.booms[i];if(!b){m.visible=false;continue;}const k=b.t/.5;if(!b.f3){b.f3=1;flash3D(b.x,b.y,b.c,1.7);}
    m.visible=true;m.position.set(b.x-320,elev(b.y)+1,b.y);m.scale.setScalar(b.r*(.25+.75*k));m.material.color.copy(tc.set(b.c).convertSRGBToLinear().multiplyScalar(1.8));m.material.opacity=Math.max(0,1-k);}
  for(const o of X.all)if(o.visible)zshift(o);}
