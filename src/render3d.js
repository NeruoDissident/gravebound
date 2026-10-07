/* ================= 3D RENDERER =================
   World units are table pixels. X = table x - 320, Z = table y (towards the player), Y is up.
   Physics stays on the table plane, as on a real machine; height comes from the terraces and the ramps. */
const E=[150,75,0,-260,-95,-95,-20],WOXS=[-800,800,800],WOZS=[TY[1]+98-WB[0],TY[1]+98-WB[1],90-WB[2]],WTOP=WY-90,WALL_H=26,BLOCK_H=38,RAMP_H=46,UP=new THREE.Vector3(0,1,0);
const SLOPES=[[FY[0]+18,FY[0]+138],[FY[1]+18,FY[1]+138],[H+36,H+96]];
const sstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const wingIdx=y=>y>WTOP?Math.min(2,Math.floor((y-WTOP)/WSTEP)):-1,inWing=y=>y>WTOP,ZX=y=>y>WTOP?WOXS[wingIdx(y)]:0,ZZ=y=>y>WTOP?WOZS[wingIdx(y)]:0;
function zshift(o){const i=wingIdx(o.position.z);if(i>=0){o.position.x+=WOXS[i];o.position.z+=WOZS[i];}return o;} // table space to world, for anything standing in a wing
function elev(y){ // each level is a terrace; the chutes between them are the slopes
  if(y>WTOP)return E[4+wingIdx(y)];
  if(y<FY[0]+150)return lerp(E[0],E[1],sstep(SLOPES[0][0],SLOPES[0][1],y));
  if(y<FY[1]+150)return lerp(E[1],E[2],sstep(SLOPES[1][0],SLOPES[1][1],y));
  return lerp(E[2],E[3],sstep(SLOPES[2][0],SLOPES[2][1],y));}
const inSlope=(a,b)=>{const lo=Math.min(a,b),hi=Math.max(a,b);return SLOPES.some(s=>hi>s[0]-2&&lo<s[1]+2);};

/* ---------- mesh builder: merges everything static into a few draw calls ---------- */
class MB{constructor(){this.p=[];this.n=[];this.u=[];this.hint=null;}
  tri(a,b,c,ua,ub,uc){const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz);if(l<1e-9)return;nx/=l;ny/=l;nz/=l;
    const h=this.hint;if(h&&nx*h[0]+ny*h[1]+nz*h[2]<0){const t=b;b=c;c=t;const tu=ub;ub=uc;uc=tu;nx=-nx;ny=-ny;nz=-nz;}
    this.p.push(a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2]);this.n.push(nx,ny,nz,nx,ny,nz,nx,ny,nz);this.u.push(ua[0],ua[1],ub[0],ub[1],uc[0],uc[1]);}
  quad(a,b,c,d,ua,ub,uc,ud){this.tri(a,b,c,ua,ub,uc);this.tri(a,c,d,ua,uc,ud);}
  add(g,m){const src=g.index?g.toNonIndexed():g,P=src.attributes.position,N=src.attributes.normal,U=src.attributes.uv,v=new THREE.Vector3(),nm=new THREE.Matrix3().getNormalMatrix(m);
    for(let i=0;i<P.count;i++){v.fromBufferAttribute(P,i).applyMatrix4(m);this.p.push(v.x,v.y,v.z);v.fromBufferAttribute(N,i).applyMatrix3(nm).normalize();this.n.push(v.x,v.y,v.z);this.u.push(U?U.getX(i):0,U?U.getY(i):0);}
    if(src!==g)src.dispose();return this;}
  geo(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.u,2));return g;}
  mesh(mat,o){o=o||{};const m=new THREE.Mesh(this.geo(),mat);m.castShadow=o.cast!==false;m.receiveShadow=o.receive!==false;m.matrixAutoUpdate=false;return m;}}
const GEO={};
function ugeo(k){if(GEO[k])return GEO[k];const n=+k.slice(1);
  return GEO[k]=k==='box'?new THREE.BoxGeometry(1,1,1):k[0]==='c'?new THREE.CylinderGeometry(1,1,1,n):k[0]==='k'?new THREE.ConeGeometry(1,1,n):new THREE.SphereGeometry(1,n,Math.max(6,n*.7|0));}
function at(x,y,h,ry,s){const q=new THREE.Quaternion();if(ry)q.setFromAxisAngle(UP,ry);const sc=s===undefined?[1,1,1]:typeof s==='number'?[s,s,s]:s;
  return new THREE.Matrix4().compose(new THREE.Vector3(x-320,elev(y)+(h||0),y),q,new THREE.Vector3(sc[0],sc[1],sc[2]));}
const cyl=(mb,x,y,r,h0,h1,n,r2)=>mb.add(r2===undefined?ugeo('c'+(n||10)):new THREE.CylinderGeometry(r2,r,1,n||10),at(x,y,(h0+h1)/2,0,r2===undefined?[r,h1-h0,r]:[1,h1-h0,1]));
const box=(mb,x,y,h0,h1,sx,sz,ry)=>mb.add(ugeo('box'),at(x,y,(h0+h1)/2,ry||0,[sx,h1-h0,sz]));
const cone=(mb,x,y,r,h0,h1,n)=>mb.add(ugeo('k'+(n||8)),at(x,y,(h0+h1)/2,0,[r,h1-h0,r]));

function subSlope(pts,closed){const o=[],n=pts.length;
  for(let i=0;i<n-(closed?0:1);i++){const a=pts[i],b=pts[(i+1)%n],d=Math.hypot(b[0]-a[0],b[1]-a[1]),k=inSlope(a[1],b[1])?Math.max(1,Math.ceil(d/14)):1;
    for(let j=0;j<k;j++)o.push([a[0]+(b[0]-a[0])*j/k,a[1]+(b[1]-a[1])*j/k]);}
  if(!closed)o.push(pts[n-1]);return o;}
function offsets(pts,hw,closed){const n=pts.length,L=[],Rr=[];
  for(let i=0;i<n;i++){const a=pts[closed?(i-1+n)%n:Math.max(0,i-1)],p=pts[i],b=pts[closed?(i+1)%n:Math.min(n-1,i+1)];
    let ax=p[0]-a[0],ay=p[1]-a[1],bx=b[0]-p[0],by=b[1]-p[1],al=Math.hypot(ax,ay),bl=Math.hypot(bx,by);
    if(al<1e-6){ax=bx;ay=by;al=bl;}if(bl<1e-6){bx=ax;by=ay;bl=al;}ax/=al;ay/=al;bx/=bl;by/=bl;
    let mx=-(ay+by),my=ax+bx;const ml=Math.hypot(mx,my);if(ml<1e-6){mx=-ay;my=ax;}else{mx/=ml;my/=ml;}
    const k=hw/Math.max(.45,mx*-ay+my*ax);L.push([p[0]+mx*k,p[1]+my*k]);Rr.push([p[0]-mx*k,p[1]-my*k]);}
  return [L,Rr];}
// a wall of constant width following a polyline and the terrain under it
function strip(mb,pts,hw,h,o){o=o||{};const depth=o.depth===undefined?12:o.depth,us=o.us||64,base=o.h0;
  pts=subSlope(pts);const n=pts.length;if(n<2)return;const LR=offsets(pts,hw,false),L=LR[0],Rr=LR[1];
  const top=q=>[q[0]-320,elev(q[1])+h,q[1]],bot=q=>[q[0]-320,elev(q[1])+(base===undefined?-depth:base),q[1]],vh=(h+depth)/us;let u=0;
  for(let i=0;i<n-1;i++){const d=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]),u1=u+d/us;
    mb.hint=[0,1,0];mb.quad(top(L[i]),top(Rr[i]),top(Rr[i+1]),top(L[i+1]),[L[i][0]/us,L[i][1]/us],[Rr[i][0]/us,Rr[i][1]/us],[Rr[i+1][0]/us,Rr[i+1][1]/us],[L[i+1][0]/us,L[i+1][1]/us]);
    mb.hint=[L[i][0]-Rr[i][0],0,L[i][1]-Rr[i][1]];mb.quad(bot(L[i]),top(L[i]),top(L[i+1]),bot(L[i+1]),[u,0],[u,vh],[u1,vh],[u1,0]);
    mb.hint=[Rr[i][0]-L[i][0],0,Rr[i][1]-L[i][1]];mb.quad(bot(Rr[i+1]),top(Rr[i+1]),top(Rr[i]),bot(Rr[i]),[u1,0],[u1,vh],[u,vh],[u,0]);u=u1;}
  mb.hint=[pts[0][0]-pts[1][0],0,pts[0][1]-pts[1][1]];mb.quad(bot(Rr[0]),top(Rr[0]),top(L[0]),bot(L[0]),[0,0],[0,vh],[.1,vh],[.1,0]);
  mb.hint=[pts[n-1][0]-pts[n-2][0],0,pts[n-1][1]-pts[n-2][1]];mb.quad(bot(L[n-1]),top(L[n-1]),top(Rr[n-1]),bot(Rr[n-1]),[0,0],[0,vh],[.1,vh],[.1,0]);
  mb.hint=null;
  if(o.caps!==false&&hw>=1.5)for(const q of [pts[0],pts[n-1]])cyl(mb,q[0],q[1],hw+(o.capGrow||0),base===undefined?-depth:base,h+(o.capRise||0),10);}
// keep the part of a polygon on one side of a horizontal line (sg=1: y>=yc, sg=-1: y<=yc)
function clipY(pts,yc,sg){const o=[],n=pts.length;for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n],ia=(a[1]-yc)*sg>=0,ib=(b[1]-yc)*sg>=0;
    if(ia)o.push(a);if(ia!==ib){const t=(yc-a[1])/(b[1]-a[1]);o.push([a[0]+(b[0]-a[0])*t,yc]);}}
  const r=[];for(const q of o){const l=r[r.length-1];if(!l||Math.abs(l[0]-q[0])>1e-4||Math.abs(l[1]-q[1])>1e-4)r.push(q);}
  if(r.length>1&&Math.abs(r[0][0]-r[r.length-1][0])<1e-4&&Math.abs(r[0][1]-r[r.length-1][1])<1e-4)r.pop();return r;}
// a solid block: polygon footprint, top following the terrain (or flat), sides down into the floor
function prism(mb,pts,h,o){o=o||{};const depth=o.depth===undefined?12:o.depth,us=o.us||64;
  pts=subSlope(pts,true);const n=pts.length;let area=0;for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n];area+=a[0]*b[1]-b[0]*a[1];}
  const top=q=>[q[0]-320,o.flat!==undefined?o.flat:elev(q[1])+h,q[1]],bot=q=>[q[0]-320,o.base!==undefined?o.base:elev(q[1])-depth,q[1]];
  let lo=1e9,hi=-1e9;for(const q of pts){lo=Math.min(lo,q[1]);hi=Math.max(hi,q[1]);}
  const cuts=[lo-1];if(o.flat===undefined)for(const z of SLOPES)if(hi>z[0]&&lo<z[1])for(let y=z[0];y<=z[1]+.01;y+=12)if(y>lo&&y<hi)cuts.push(y);cuts.push(hi+1);
  mb.hint=[0,1,0];
  for(let k=0;k<cuts.length-1;k++){const band=cuts.length===2?pts:clipY(clipY(pts,cuts[k],1),cuts[k+1],-1);if(band.length<3)continue;
    const tris=THREE.ShapeUtils.triangulateShape(band.map(p=>new THREE.Vector2(p[0],p[1])),[]);
    for(const t of tris){const a=band[t[0]],b=band[t[1]],c=band[t[2]];mb.tri(top(a),top(b),top(c),[a[0]/us,a[1]/us],[b[0]/us,b[1]/us],[c[0]/us,c[1]/us]);}}
  let u=0;const sg=area>0?1:-1;
  for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);if(d<1e-6)continue;const u1=u+d/us,ta=top(a),tb=top(b),ba=bot(a),bb=bot(b);
    mb.hint=[dy*sg,0,-dx*sg];mb.quad(ba,ta,tb,bb,[u,ba[1]/us],[u,ta[1]/us],[u1,tb[1]/us],[u1,bb[1]/us]);u=u1;}
  mb.hint=null;}

/* ---------- renderer state ---------- */
const R3={ready:false,q:null,qName:'high',auto:true,camMode:0,cam:{p:new THREE.Vector3(0,900,3700),t:new THREE.Vector3(0,0,2700),fov:38},
  dyn:{flips:[],bumps:[],segs:[],slings:[],sens:[],shots:{},holes:[],spins:[],torches:[],statues:[]},balls:[],fps:60,ft:[],w:1,h:1};
const QUALITY={high:{post:true,msaa:true,shadow:2048,dpr:2,label:'High'},medium:{post:true,msaa:false,shadow:1024,dpr:1.25,label:'Medium'},low:{post:false,msaa:false,shadow:0,dpr:1,label:'Low'}};
const CAMS=[{name:'Player',pitch:48,fov:32},{name:'Chase',pitch:31,fov:46},{name:'Overhead',pitch:83,fov:30}];
const M={};
const lin=c=>new THREE.Color(c).convertSRGBToLinear();
const fixc=o=>{for(const k of ['color','emissive'])if(typeof o[k]==='number'||typeof o[k]==='string')o[k]=lin(o[k]);return o;};
const SM=o=>new THREE.MeshStandardMaterial(fixc(o)),BM=o=>new THREE.MeshBasicMaterial(fixc(o));
const hdr=(hex,k)=>new THREE.Color(hex).convertSRGBToLinear().multiplyScalar(k===undefined?1:k);
function ctex(cv,o){const t=new THREE.CanvasTexture(cv);t.encoding=THREE.sRGBEncoding;if(o&&o.repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;}if(R3.rn)t.anisotropy=Math.min(8,R3.rn.capabilities.getMaxAnisotropy());return t;}

function init3D(canvas){
  let rn;try{rn=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});}catch(e){return false;}
  R3.rn=rn;rn.outputEncoding=THREE.sRGBEncoding;rn.shadowMap.type=THREE.PCFSoftShadowMap;rn.setClearColor(0x05050a,1);
  const scene=R3.scene=new THREE.Scene();scene.background=new THREE.Color(0x05050a);scene.fog=new THREE.FogExp2(0x06060c,.00040);
  R3.camera=new THREE.PerspectiveCamera(38,1,24,9000);
  // reflections
  const pm=new THREE.PMREMGenerator(rn),sky=new THREE.CanvasTexture(texSky());sky.mapping=THREE.EquirectangularReflectionMapping;sky.encoding=THREE.sRGBEncoding;
  R3.env=pm.fromEquirectangular(sky).texture;scene.environment=R3.env;sky.dispose();pm.dispose();
  buildMaterials();buildLights();buildFloor3D();buildStatic();buildDynamic();buildWings();
  for(const o of R3.scene.children)zshift(o);
  buildScenery();buildFx();buildActors();
  R3.ready=true;return true;}

function buildMaterials(){const S=SM,st=ctex(texStone(),{repeat:1}),wd=ctex(texWood(),{repeat:1}),gd=ctex(texGround(),{repeat:1});
  const stoneCol=['#6a4c80','#4c7466','#526a96','#6e6044','#72785a','#5e6a80','#8a5a3a'];
  M.stone=stoneCol.map(c=>S({map:st,bumpMap:st,bumpScale:1.6,color:c,roughness:.84,metalness:.02,envMapIntensity:.5}));
  M.frame=S({map:st,bumpMap:st,bumpScale:1.6,color:0x474760,roughness:.88,metalness:.02,envMapIntensity:.45});
  M.dark=S({map:st,bumpMap:st,bumpScale:1.4,color:0x3c3c50,roughness:.9,metalness:0,envMapIntensity:.3});
  M.steel=S({color:0xc2cadf,metalness:1,roughness:.32,envMapIntensity:1.25});
  M.bronze=S({color:0xd9a441,metalness:1,roughness:.36,envMapIntensity:1.5});
  M.iron=S({color:0x30323f,metalness:.85,roughness:.5,envMapIntensity:1});
  M.post=S({color:0x8d90a2,roughness:.55,metalness:.1,envMapIntensity:.8});
  M.wood=S({map:wd,color:0xa88a66,roughness:.78,metalness:0,envMapIntensity:.4});
  M.bone=S({color:0xb4ad98,roughness:.38,metalness:.05,envMapIntensity:.9});
  M.earth=S({map:gd,color:0x6a5540,roughness:1,metalness:0,envMapIntensity:.15});
  M.ground=S({map:gd,color:0x5c6670,roughness:1,metalness:0,envMapIntensity:.2});
  M.pine=S({color:0x12261f,roughness:.95,metalness:0,envMapIntensity:.25,flatShading:true});
  M.bark=S({color:0x2a2420,roughness:1,metalness:0,envMapIntensity:.2});
  M.roof=S({color:0x2a2238,roughness:.8,metalness:.1,envMapIntensity:.4,flatShading:true});
  M.ward=new THREE.MeshBasicMaterial({color:hdr('#62d8ff',.9),transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  M.black=new THREE.MeshBasicMaterial({color:0x000000});
  R3.glowTex=ctex(texGlow());R3.flameTex=ctex(texFlame());}

function buildLights(){const sc=R3.scene;
  sc.add(R3.hemi=new THREE.HemisphereLight(0x8fa6e0,0x1a1420,.36));sc.add(new THREE.AmbientLight(0x404058,.4));
  const moon=R3.moon=new THREE.DirectionalLight(0xcfdcff,1.7);moon.castShadow=true;const s=moon.shadow;s.mapSize.set(2048,2048);
  s.camera.left=-560;s.camera.right=560;s.camera.top=760;s.camera.bottom=-760;s.camera.near=200;s.camera.far=2600;s.bias=-.0006;s.normalBias=1.2;sc.add(moon,moon.target);
  // one warm pool of light over each level
  const cols=['#ff6a48','#7fe0c0','#ffb060','#9dffc8'],zs=[TY[0]+470,TY[1]+470,TY[2]+470,GY+320];
  R3.tierL=cols.map((c,i)=>{const l=new THREE.PointLight(new THREE.Color(c),i===3?1:1.15,1250,1.4);l.position.set(0,E[i]+330,zs[i]);sc.add(l);return l;});
  R3.ballL=new THREE.PointLight(0xffffff,1.1,210,1.6);sc.add(R3.ballL);
  R3.flashL=[0,1,2].map(()=>{const l=new THREE.PointLight(0xffffff,0,330,1.5);l.userData.t=0;sc.add(l);return l;});}

function buildFloor3D(){const chunks=R3.chunks=paintFloorChunks(2);R3.floorTex=[];
  for(const ch of chunks){const tex=ctex(ch.cv);tex.anisotropy=R3.rn.capabilities.getMaxAnisotropy();R3.floorTex.push(tex);
    const mat=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:new THREE.Color(1,1,1),emissiveIntensity:.44,color:new THREE.Color(1.75,1.75,1.9),roughness:.6,metalness:0,envMapIntensity:.32});
    const mb=new MB();mb.hint=[0,1,0];const yEnd=ch.grave?ch.y1:Math.min(ch.y1,H+36);let y=ch.y0;
    while(y<yEnd-.01){const y2=Math.min(yEnd,y+(ch.grave?200:inSlope(y,y+7)?7:Math.min(40,nextSlope(y)-y||40))),v0=1-(y-ch.y0)/(ch.y1-ch.y0),v1=1-(y2-ch.y0)/(ch.y1-ch.y0),e0=ch.grave?E[3]:elev(y),e1=ch.grave?E[3]:elev(y2);
      mb.quad([-320,e0,y],[320,e0,y],[320,e1,y2],[-320,e1,y2],[0,v0],[1,v0],[1,v1],[0,v1]);y=y2;}
    const m=mb.mesh(mat,{cast:false});R3.scene.add(m);}}
function nextSlope(y){let b=1e9;for(const s of SLOPES)if(s[0]-2>y)b=Math.min(b,s[0]-2);return b;}
function repaintFloor(){const fresh=paintFloorChunks(2);fresh.forEach((ch,i)=>{const c=R3.chunks[i].cv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.drawImage(ch.cv,0,0);R3.floorTex[i].needsUpdate=true;});}

/* ---------- everything that never moves ---------- */
function buildStatic(){const sc=R3.scene,stone=[0,1,2,3].map(()=>new MB()),frame=new MB(),steel=new MB(),bronze=new MB(),iron=new MB(),post=new MB(),ward=new MB(),wood=new MB(),dark=new MB();
  const WMS=R3.wingMB=WING_KEYS.map(()=>({steel:new MB(),bronze:new MB(),post:new MB()}));
  // outer walls and the Keep's back wall
  prism(frame,[[-70,340],[20,340],[20,H+34],[-70,H+34]],34);prism(frame,[[620,340],[710,340],[710,H+34],[620,H+34]],34);
  prism(stone[0],[[-70,-70],[710,-70],[710,340],[620,340]].concat(arcPts(320,TY[0]+300,300,TAU,PI,60).slice(1,-1),[[20,340],[-70,340]]),34);
  // islands between levels, aprons and the named landmarks
  const aF=Math.acos(258/300),aG=Math.asin(36/300);
  for(const b of T.blocks){
    if(b.dead&&!b.apron){const sd=b.pts[0][0]<320?-1:1,nA=TY[b.tier+1]+300,arc=sd<0?arcPts(320,nA,300,1.5*PI-aG,PI+aF,22):arcPts(320,nA,300,1.5*PI+aG,TAU-aF,22);
      prism(stone[b.tier],b.pts.slice(0,4).concat(arc.slice(1,-1),[b.pts[4]]),WALL_H,{depth:110});}
    else if(b.dead)prism(stone[2],b.pts,WALL_H,{depth:40});
    else prism(stone[b.tier],b.pts,BLOCK_H);}
  // guide walls, scoops, posts, flaps and the one-way wards
  for(const w of T.wallPaths){const k=w.w||2,wi=wingIdx(w.pts[0][1]),wg=wi>=0,WM=WMS[wi];
    if(w.style==='gate')strip(ward,w.pts,.5,19,{depth:0,caps:false});
    else if(w.style==='flap')strip(steel,w.pts,1.2,15,{caps:false});
    else if(w.style==='scoop')strip(wg?WM.bronze:bronze,w.pts,k,24);
    else if(w.style==='post')strip(wg?WM.post:post,w.pts,k,30,{capRise:3});
    else strip(wg?WM.steel:steel,w.pts,k,21);}
  // shooter lane back stop, hole rims
  box(iron,603,3118,0,16,30,8);
  for(const id in T.holes){const h=T.holes[id];(inWing(h.y)?WMS[wingIdx(h.y)].bronze:bronze).add(new THREE.TorusGeometry(h.r+1.6,1.5,6,24).rotateX(PI/2),at(h.x,h.y,1.2));}
  // ramps
  for(const id in T.rails)buildRail(T.rails[id],steel,iron);
  // the Grave: coffin walls, the pit around it
  {const out=offsets(T.coffin,16,false),c=[T.coffin.reduce((a,p)=>a+p[0],0)/T.coffin.length,T.coffin.reduce((a,p)=>a+p[1],0)/T.coffin.length];
    const far=(L)=>L.reduce((a,p)=>a+Math.hypot(p[0]-c[0],p[1]-c[1]),0),side=far(out[0])>far(out[1])?out[0]:out[1];
    strip(wood,side,16,44,{us:96,caps:false});
    for(const sd of [-1,1])strip(wood,[[320+sd*100,GY+663],[320+sd*46,HW+60]],3,26);
    for(const p of [T.coffin[1],T.coffin[2],T.coffin[5],T.coffin[6],T.coffin[3],T.coffin[4]]){const dx=p[0]-320,dy=p[1]-(GY+330),l=Math.hypot(dx,dy);cyl(bronze,p[0]+dx/l*16,p[1]+dy/l*16,5,40,48,8);}
    const yb=E[3]-4,yt=E[2]-36;
    prism(dark,[[-130,H+34],[2,H+34],[2,HW+260],[-130,HW+260]],0,{flat:yt,base:yb});prism(dark,[[638,H+34],[770,H+34],[770,HW+260],[638,HW+260]],0,{flat:yt,base:yb});
    prism(dark,[[2,H+34],[638,H+34],[638,H+84],[2,H+84]],0,{flat:E[2]-.5,base:yb});}
  const add=(mb,mat,o)=>{if(mb.p.length)sc.add(mb.mesh(mat,o));};
  stone.forEach((mb,i)=>add(mb,M.stone[i]));add(frame,M.frame);add(steel,M.steel);add(bronze,M.bronze);add(iron,M.iron);add(post,M.post);add(wood,M.wood);add(dark,M.earth);
  add(ward,M.ward,{cast:false,receive:false});
  // level names carved into the stone above each level
  const names=[[320,-36,'The Black Keep',230],[140,TY[1]-74,TIER_NAME[1],128],[500,TY[1]-74,TIER_NAME[1],128],[140,TY[2]-74,TIER_NAME[2],128],[500,TY[2]-74,TIER_NAME[2],128]];
  R3.nameDecals=names.map(q=>{const cv=mkCanvas(512,128),tex=ctex(cv),mb=new MB(),hw=q[3]/2,hh=q[3]/8,h=(q[1]<0?34:WALL_H)+.7,P=(x,y)=>[x-320,elev(y)+h,y];
    mb.hint=[0,1,0];mb.quad(P(q[0]-hw,q[1]-hh),P(q[0]+hw,q[1]-hh),P(q[0]+hw,q[1]+hh),P(q[0]-hw,q[1]+hh),[0,1],[1,1],[1,0],[0,0]);
    const m=mb.mesh(new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,color:hdr('#e6c890',.8)}),{cast:false,receive:false});sc.add(m);return {cv,tex,text:q[2]};});
  paintNames();}
function paintNames(){for(const d of R3.nameDecals){const c=d.cv.getContext('2d');c.clearRect(0,0,512,128);c.textAlign='center';c.textBaseline='middle';c.font='600 76px '+R.fontD;
    c.fillStyle='rgba(0,0,0,.9)';c.fillText(d.text,258,70);c.fillStyle='rgba(232,200,130,.95)';c.fillText(d.text,256,66);d.tex.needsUpdate=true;}}

// a ramp: the ball's path lifted off the table, drawn as a wire-form with a plated bed
function buildRail(r,steel,iron){const n=r.n,ef=elev(r.y[0]),et=elev(r.y[n-1]),X=[],Yh=[],Z=[];r.h3=new Float32Array(n);
  for(let i=0;i<n;i++){const s=i*r.ds,prof=sstep(0,1,Math.min(1,s/80,(r.len-s)/80)),base=Math.max(lerp(ef,et,sstep(40,r.len*.55,s)),elev(r.y[i]));
    r.h3[i]=base+RAMP_H*prof+(prof>0?1:0);X.push(r.x[i]-320);Yh.push(r.h3[i]);Z.push(r.y[i]);}
  const tan=i=>{const a=Math.max(0,i-1),b=Math.min(n-1,i+1);let tx=X[b]-X[a],tz=Z[b]-Z[a];const l=Math.hypot(tx,tz)||1;return [tx/l,tz/l];};
  // bed
  const mb=new MB();mb.hint=[0,1,0];let v=0;const hw=13;
  for(let i=0;i<n-1;i++){const t0=tan(i),t1=tan(i+1),v1=v+r.ds/48;
    mb.quad([X[i]-t0[1]*hw,Yh[i],Z[i]+t0[0]*hw],[X[i]+t0[1]*hw,Yh[i],Z[i]-t0[0]*hw],[X[i+1]+t1[1]*hw,Yh[i+1],Z[i+1]-t1[0]*hw],[X[i+1]-t1[1]*hw,Yh[i+1],Z[i+1]+t1[0]*hw],[0,v],[1,v],[1,v1],[0,v1]);v=v1;}
  const tier=r.from,col=[PAL[0].acc2,PAL[1].glow,PAL[2].acc][tier],bt=ctex(texRampBed(col),{repeat:1}),gt=ctex(texRampGlow(col),{repeat:1});
  const bed=mb.mesh(new THREE.MeshStandardMaterial({map:bt,emissiveMap:gt,emissive:new THREE.Color(1,1,1),emissiveIntensity:2.4,roughness:.4,metalness:.7,envMapIntensity:1.1,side:THREE.DoubleSide,transparent:true,opacity:.62,depthWrite:false}),{cast:true});
  bed.userData.rail=r;R3.scene.add(bed);(R3.railBeds=R3.railBeds||[]).push(bed);
  // side wires, ties and legs
  for(const sd of [-1,1]){const pts=[];for(let i=0;i<n;i+=2){const t=tan(i);pts.push(new THREE.Vector3(X[i]-sd*t[1]*15,Yh[i]+9,Z[i]+sd*t[0]*15));}
    const t=tan(n-1);pts.push(new THREE.Vector3(X[n-1]-sd*t[1]*15,Yh[n-1]+9,Z[n-1]+sd*t[0]*15));
    steel.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),pts.length*2,1.9,6,false),new THREE.Matrix4());}
  for(let i=4;i<n-2;i+=5){const t=tan(i);
    steel.add(ugeo('box'),new THREE.Matrix4().compose(new THREE.Vector3(X[i],Yh[i]-1.2,Z[i]),new THREE.Quaternion().setFromAxisAngle(UP,Math.atan2(-t[0],-t[1])),new THREE.Vector3(30,1.6,2.2)));
    for(const sd of [-1,1])steel.add(ugeo('c6'),new THREE.Matrix4().compose(new THREE.Vector3(X[i]-sd*t[1]*15,Yh[i]+4,Z[i]+sd*t[0]*15),new THREE.Quaternion(),new THREE.Vector3(1.1,10,1.1)));}
  for(let i=22;i<n-18;i+=26){const g=elev(r.y[i]),hgt=Yh[i]-g;if(hgt<RAMP_H*.8)continue;const t=tan(i),sd=(i/26|0)%2?1:-1;
    iron.add(ugeo('c6'),new THREE.Matrix4().compose(new THREE.Vector3(X[i]-sd*t[1]*15,g+hgt/2,Z[i]+sd*t[0]*15),new THREE.Quaternion(),new THREE.Vector3(1.5,hgt,1.5)));}}
function railY(r,s){const f=clamp(s/r.ds,0,r.n-1.001),i=f|0;return r.h3[i]+(r.h3[i+1]-r.h3[i])*(f-i);}

/* ---------- everything that moves or lights up ---------- */
function buildDynamic(){const sc=R3.scene,D=R3.dyn,S=SM;
  // flippers
  const fshape=(r1,r2,L)=>{const s=new THREE.Shape();s.absarc(0,0,r1,PI/2,PI*1.5,false);s.absarc(L,0,r2,-PI/2,PI/2,false);s.closePath();return s;};
  const fg=new THREE.ExtrudeGeometry(fshape(7.6,4.2,82),{depth:11,bevelEnabled:true,bevelSize:.9,bevelThickness:1.2,bevelSegments:2,curveSegments:12}).rotateX(-PI/2).translate(0,2,0);
  const rg=new THREE.ExtrudeGeometry(fshape(9,5.4,82),{depth:5,bevelEnabled:false,curveSegments:12}).rotateX(-PI/2).translate(0,5,0);
  const pg=new THREE.CylinderGeometry(3.6,3.6,17,12).translate(0,8.5,0);
  for(const f of T.flips){const g=new THREE.Group(),col=PAL[f.tier].glow;
    const rub=new THREE.MeshStandardMaterial({color:hdr(col,.5),emissive:hdr(col),emissiveIntensity:.35,roughness:.6,metalness:0});
    const a=new THREE.Mesh(fg,M.bone),b=new THREE.Mesh(rg,rub),p=new THREE.Mesh(pg,M.steel);a.castShadow=b.castShadow=true;a.receiveShadow=true;g.add(a,b,p);
    g.position.set(f.x-320,elev(f.y)+.5,f.y);sc.add(g);D.flips.push({f,g,rub});}
  // bumpers
  for(const b of T.bumps)D.bumps.push(mkBumper(b));
  // statues
  for(const s of G.statues)D.statues.push(mkStatue(s));
  // drop targets, standup targets, the sealed door, coffin nails
  const tgeo=ugeo('box');
  for(const id in T.banks)for(const s of T.banks[id].segs){const drop=s.kind==='drop',door=id==='door',nail=id==='nails',p=PAL[s.tier];
    const base=door?'#8f9bb0':nail?'#b9a070':drop?p.acc:'#b98c3a',lit=drop?p.glow:'#ffd24a';
    const mat=S({color:base,emissive:hdr(lit),emissiveIntensity:.12,roughness:.45,metalness:door||nail?.8:.25,envMapIntensity:1});
    const h=drop?24:19,m=new THREE.Mesh(tgeo,mat);m.scale.set(s.len,h,drop?6.4:5);m.rotation.y=-Math.atan2(s.dy,s.dx);
    const cx=(s.x1+s.x2)/2,cy=(s.y1+s.y2)/2,y0=elev(cy)+h/2;m.position.set(cx-320,y0,cy);m.castShadow=true;sc.add(m);D.segs.push({s,m,mat,drop,y0,h,k:1});}
  for(const wk in T.wings)for(const s of T.wings[wk].seal){const mat=S({color:{crypt:'#b8b49a',den:'#9aa6b8',hoard:'#c9983f'}[wk],emissive:hdr(PAL[T.wings[wk].tier].glow),emissiveIntensity:.14,roughness:.6,metalness:.1}),h=30,m=new THREE.Mesh(tgeo,mat);m.scale.set(s.len+2,h,8);m.rotation.y=-Math.atan2(s.dy,s.dx);
    const cx=(s.x1+s.x2)/2,cy=(s.y1+s.y2)/2,y0=elev(cy)+h/2;m.position.set(cx-320,y0,cy);m.castShadow=true;sc.add(m);D.segs.push({s,m,mat,drop:true,y0,h,k:1});}
  // slingshots
  for(const s of T.slings){const p=PAL[s.tier],mb=new MB();prism(mb,[s.A,s.B,s.C],17);sc.add(mb.mesh(M.stone[s.tier]));
    const sm=new MB();strip(sm,[s.A,s.B,s.C],2,20,{capGrow:1.4,capRise:4});sc.add(sm.mesh(M.steel));
    const mat=S({color:hdr(p.acc,.6),emissive:hdr(p.glow),emissiveIntensity:.3,roughness:.5});
    const bm=new MB();strip(bm,[s.A,s.C],2.3,13,{h0:5,caps:false});const band=bm.mesh(mat);sc.add(band);D.slings.push({s,mat});}
  // lane inserts
  const disc=new THREE.CircleGeometry(7,18).rotateX(-PI/2),dia=new THREE.CircleGeometry(8,4).rotateX(-PI/2);
  const arrowG=(tip,back,hw)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([tip,0,0,-back,0,-hw,-back,0,hw],3));g.setAttribute('normal',new THREE.Float32BufferAttribute([0,1,0,0,1,0,0,1,0],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([1,.5,0,0,0,1],2));return g;};
  const tri=arrowG(9,9,11),arrow=arrowG(13,8,10);
  for(const s of T.sens){if(s.kind==='spin'){D.spins.push(mkSpinner(s));continue;}if(s.kind==='orbit')continue;
    const kick=s.kind==='kick',lane=s.kind==='lane'||s.set,col=kick?'#62d8ff':s.set==='moon'?'#cfeef2':lane?'#ffc060':'#ffe6a0';
    const mat=new THREE.MeshBasicMaterial({color:0x08080c,transparent:true,opacity:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const m=new THREE.Mesh(kick?tri:lane?disc:dia,mat);m.position.set(s.x-320,elev(s.y)+.35,kick?s.y-49:s.y);if(kick)m.rotation.y=PI/2;m.renderOrder=2;sc.add(m);D.sens.push({s,mat,kick,lane,on:hdr(col,1.25),v:0});}
  // shot inserts: the painted arrows light from underneath
  const dot=new THREE.CircleGeometry(9,18).rotateX(-PI/2);
  for(const id in T.shots){const s=T.shots[id];if(id==='door'||id==='nails'||D.shots[s.x+','+s.y])continue;
    const col=s.tier===3?'#9dffc8':[PAL[0].acc2,PAL[1].glow,PAL[2].acc][s.tier];
    const mat=new THREE.MeshBasicMaterial({color:hdr(col,1.6),transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
    const m=new THREE.Mesh(s.kind==='dot'?dot:arrow,mat);m.position.set(s.x-320,elev(s.y)+.4,s.y);if(s.kind!=='dot')m.rotation.y=-s.ang;m.renderOrder=2;sc.add(m);
    D.shots[s.x+','+s.y]={ids:Object.keys(T.shots).filter(k=>T.shots[k]===s),mat,base:mat.color.clone(),ph:hash(s.x+s.y)*TAU};}
  // scoops glow
  for(const id in T.holes){const h=T.holes[id],sp=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr(h.tier===3?'#eaffd0':'#ffd9a0',1.4),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
    sp.position.set(h.x-320,elev(h.y)+8,h.y);sp.scale.set(74,74,1);sc.add(sp);
    const d=new THREE.Mesh(new THREE.CircleGeometry(h.r+1,20).rotateX(-PI/2),new THREE.MeshBasicMaterial({color:0x000000,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));d.position.set(h.x-320,elev(h.y)+.2,h.y);sc.add(d);
    D.holes.push({h,sp,base:sp.material.color.clone()});}
  // torches
  for(const tr of T.torches)D.torches.push(mkTorch(tr));
  // plunger
  {const g=new THREE.Group(),rod=new THREE.Mesh(new THREE.CylinderGeometry(2.6,2.6,70,10).rotateX(PI/2).translate(0,0,39),M.steel),tip=new THREE.Mesh(new THREE.CylinderGeometry(8,8,6,14).rotateX(PI/2),M.bone),
      knob=new THREE.Mesh(new THREE.SphereGeometry(7,12,10).translate(0,0,76),M.bronze);g.add(rod,tip,knob);g.position.set(T.shooter.x-320,elev(3120)+11,3116);sc.add(g);R3.plunger=g;}
  // the light at the head of the coffin
  {const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr('#eaffd0',2),transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false}));
    sp.position.set(0,E[3]+40,GY+194);sp.scale.set(120,120,1);sc.add(sp);R3.graveGlow=sp;
    const mk=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr('#7dffb0',1.6),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
    mk.position.set(303-320,E[2]+10,3150);mk.scale.set(150,150,1);sc.add(mk);R3.graveMark=mk;
    const sh=new THREE.Shape();sh.moveTo(-11,0);sh.lineTo(-11,14);sh.absarc(0,14,11,PI,0,true);sh.lineTo(11,0);sh.closePath();
    const gm=SM({color:'#3a4a44',emissive:hdr('#7dffb0'),emissiveIntensity:0,roughness:.7}),st=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:5,bevelEnabled:false,curveSegments:8}).translate(0,0,-2.5),gm);
    st.position.set(303-320,E[2],3146);st.rotation.x=-.5;st.castShadow=true;sc.add(st);R3.graveStone=gm;
    const sv=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr('#62d8ff',1.5),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));sv.position.set(303-320,E[2]+8,3166);sv.scale.set(110,110,1);sc.add(sv);R3.saveGlow=sv;
    const au=new THREE.Mesh(new THREE.RingGeometry(.965,1,64).rotateX(-PI/2),new THREE.MeshBasicMaterial({color:hdr('#ffe0a0',1.2),transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false}));au.visible=false;au.renderOrder=2;sc.add(au);R3.aura=au;}
}
function mkBumper(b){const g=new THREE.Group(),p=PAL[b.tier],col=b.bell?'#ffd070':p.glow,r=b.r,o={b,g,mats:[],bell:null,flame:null,t:0};
  const S=SM,lit=(base,k)=>{const m=S(Object.assign({emissive:hdr(col),emissiveIntensity:k===undefined?.12:k,roughness:.6,metalness:.1,envMapIntensity:.8},base));o.mats.push({m,k:k===undefined?.12:k});return m;};
  const mesh=(geo,mat,y)=>{const m=new THREE.Mesh(geo,mat);m.position.y=y||0;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
  const ringM=new THREE.MeshBasicMaterial({color:hdr(col,.5)});o.ring=ringM;mesh(new THREE.TorusGeometry(r-1.6,1.7,6,28).rotateX(PI/2),ringM,3).castShadow=false;
  const lathe=(pts,seg)=>new THREE.LatheGeometry(pts.map(q=>new THREE.Vector2(q[0],q[1])),seg||20);
  if(b.bell){mesh(new THREE.CylinderGeometry(r*.92,r*.98,6,20),M.iron,3);
    for(const sx of [-1,1])mesh(new THREE.CylinderGeometry(1.8,1.8,54,8),M.iron,27).position.x=sx*(r-4);
    mesh(new THREE.BoxGeometry(r*2-4,3.5,4),M.iron,54);
    const bell=new THREE.Group();bell.position.y=52;const bm=lit({color:'#d9a441',metalness:1,roughness:.3,envMapIntensity:1.6},.05);
    const bg=new THREE.Mesh(lathe([[0,0],[4,-1],[6.5,-6],[8,-16],[10.5,-26],[14,-32],[14.5,-34],[12.5,-34]],18),bm);bg.castShadow=true;bm.side=THREE.DoubleSide;bell.add(bg);
    const cl=new THREE.Mesh(new THREE.SphereGeometry(3,8,6),M.iron);cl.position.y=-33;bell.add(cl);g.add(bell);o.bell=bell;}
  else if(b.group==='braziers'||b.group==='urns'||b.group==='pyre'){const fc=b.group==='urns'?p.glow:'#ff8a3c',ec=b.group==='urns'?p.acc:'#ff7a30';mesh(lathe([[r*.95,0],[r*.95,4],[r*.5,8],[r*.36,20],[r*.5,26],[r*.96,35],[r*.9,37],[r*.72,33],[0,31]]),M.iron);
    const em=new THREE.MeshBasicMaterial({color:hdr(ec,1.6)});mesh(new THREE.CircleGeometry(r*.74,16).rotateX(-PI/2),em,34.5).castShadow=false;
    const fl=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.flameTex,color:hdr(fc,2.2),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));fl.position.y=52;fl.scale.set(30,46,1);g.add(fl);o.flame=fl;}
  else if(b.group==='stones'){mesh(new THREE.CylinderGeometry(r*.93,r*.97,7,20),M.stone[1],3.5);
    const sm=lit({map:M.stone[1].map,bumpMap:M.stone[1].map,bumpScale:1.5,color:'#8fb0a4',flatShading:true,roughness:.85},.1);
    const st=mesh(new THREE.CylinderGeometry(r*.42,r*.78,50,6),sm,31);st.rotation.y=hash(b.x)*3;st.rotation.z=(hash(b.y)-.5)*.14;
    const rune=new THREE.Mesh(new THREE.PlaneGeometry(13,26),new THREE.MeshBasicMaterial({map:runeTex(1),color:hdr(col,1.6),transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
    rune.position.set(0,30,r*.62);rune.rotation.x=-.12;g.add(rune);o.rune=rune.material;}
  else if(b.group==='graves'){mesh(new THREE.CylinderGeometry(r*.93,r*.97,8,20),M.stone[2],4);
    const sh=new THREE.Shape();sh.moveTo(-13,0);sh.lineTo(-13,22);sh.absarc(0,22,13,PI,0,true);sh.lineTo(13,0);sh.closePath();
    const sm=lit({map:M.stone[2].map,color:'#9aa8c8',roughness:.8},.1);
    mesh(new THREE.ExtrudeGeometry(sh,{depth:8,bevelEnabled:true,bevelSize:.8,bevelThickness:.8,bevelSegments:1,curveSegments:10}).translate(0,0,-4),sm,8).rotation.x=-.08;
    const rune=new THREE.Mesh(new THREE.PlaneGeometry(16,22),new THREE.MeshBasicMaterial({map:runeTex(2),color:hdr(col,1.5),transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
    rune.position.set(0,28,6.2);rune.rotation.x=-.08;g.add(rune);o.rune=rune.material;}
  else{ // bones
    mesh(new THREE.CylinderGeometry(r*.93,r*.97,5,20),b.tier>=4?M.stone[b.tier]:M.wood,2.5);const bm=lit({color:'#8f8a78',roughness:.6},.05);
    const sk=mesh(new THREE.SphereGeometry(r*.72,16,12),bm,19);sk.scale.set(1,.92,1.08);mesh(new THREE.BoxGeometry(r*.8,7,r*.6),bm,8).position.z=r*.3;
    const ec=b.tier>=4?p.glow:'#7dffb0',em=new THREE.MeshBasicMaterial({color:hdr(ec,.25)});o.ember=em;o.emberCol=hdr(ec,1);
    for(const sx of [-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(3.4,8,6),em);e.position.set(sx*5.6,20,r*.62);g.add(e);}}
  {const w=new THREE.Group(),tm=new THREE.MeshBasicMaterial({color:hdr('#9fe8ff',1.8)}),tr=new THREE.Mesh(new THREE.TorusGeometry(r+5,1.6,6,32).rotateX(PI/2),tm);tr.position.y=10;
    const ws=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr('#62d8ff',1.5),transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));ws.position.y=26;ws.scale.set(r*5,r*5,1);w.add(tr,ws);w.visible=false;g.add(w);o.ward=w;o.wardS=ws;o.wardT=tr;}
  g.position.set(b.x-320,elev(b.y),b.y);R3.scene.add(g);return o;}
function runeTex(kind){const key='rune'+kind;if(R3[key])return R3[key];const cv=mkCanvas(64,128),c=cv.getContext('2d');c.strokeStyle='#fff';c.lineWidth=7;c.lineCap='round';c.lineJoin='round';c.beginPath();
  if(kind===1){c.moveTo(14,112);c.lineTo(32,16);c.lineTo(50,112);c.moveTo(22,70);c.lineTo(52,50);}
  else if(kind===2){c.moveTo(32,14);c.lineTo(32,114);c.moveTo(10,46);c.lineTo(54,46);}
  else{c.moveTo(32,12);c.lineTo(52,40);c.lineTo(32,68);c.lineTo(12,40);c.closePath();c.moveTo(32,68);c.lineTo(32,116);}
  c.stroke();return R3[key]=ctex(cv);}
function mkStatue(s){const g=new THREE.Group(),col=PAL[s.tier].acc2,o={s,g,mats:[]};
  const lit=(base,k)=>{const m=SM(Object.assign({emissive:hdr(col),emissiveIntensity:k,roughness:.7,metalness:.15,envMapIntensity:.8},base));o.mats.push({m,k});return m;};
  const mesh=(geo,mat,y)=>{const m=new THREE.Mesh(geo,mat);m.position.y=y||0;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
  if(s.tier===0){const dk=lit({map:M.stone[0].map,color:'#5a3f6a'},.05),gold=lit({color:'#d9a441',metalness:1,roughness:.35,envMapIntensity:1.5},.1);
    mesh(new THREE.CylinderGeometry(s.r-1,s.r,7,24),dk,3.5);mesh(new THREE.BoxGeometry(24,13,18),dk,13.5).position.z=3;
    const sh=new THREE.Shape();sh.moveTo(-14,0);sh.lineTo(-14,40);sh.lineTo(-8,52);sh.lineTo(-4,44);sh.lineTo(0,62);sh.lineTo(4,44);sh.lineTo(8,52);sh.lineTo(14,40);sh.lineTo(14,0);sh.closePath();
    mesh(new THREE.ExtrudeGeometry(sh,{depth:6,bevelEnabled:false}).translate(0,0,-13),dk,7);
    for(const sx of [-1,1])mesh(new THREE.BoxGeometry(4,9,16),gold,22).position.set(sx*11,22,3);
    mesh(new THREE.SphereGeometry(3.2,10,8),gold,72).position.z=-10;}
  else{const st=lit({map:M.stone[1].map,bumpMap:M.stone[1].map,bumpScale:1.5,color:'#a8c4c0',flatShading:true,roughness:.85},.08);
    mesh(new THREE.CylinderGeometry(s.r-1,s.r,6,20),M.stone[1],3);mesh(new THREE.CylinderGeometry(8,14.5,60,5),st,36).rotation.y=.4;
    const rune=new THREE.Mesh(new THREE.PlaneGeometry(14,30),new THREE.MeshBasicMaterial({map:runeTex(3),color:hdr(col,1.7),transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));
    rune.position.set(0,36,12.4);rune.rotation.x=-.1;g.add(rune);o.rune=rune.material;}
  g.position.set(s.x-320,elev(s.y),s.y);R3.scene.add(g);return o;}
function mkSpinner(s){const g=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:'#d9a441',metalness:1,roughness:.3,emissive:hdr('#ffe6a0'),emissiveIntensity:.05,envMapIntensity:1.6,side:THREE.DoubleSide});
  const plate=new THREE.Mesh(new THREE.BoxGeometry(34,17,1.4),mat);plate.castShadow=true;const pv=new THREE.Group();pv.position.y=15;pv.add(plate);g.add(pv);
  for(const sx of [-1,1]){const p=new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.2,26,6),M.steel);p.position.set(sx*20,13,0);g.add(p);}
  const bar=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,40,6).rotateZ(PI/2),M.steel);bar.position.y=15;g.add(bar);
  g.position.set(s.x-320,elev(s.y),s.y);R3.scene.add(g);return {s,pv,mat};}
// torches never stand in the ball's way: each is moved to the nearest wall top, block or coffin rim
function torchSpot(tr){if(tr.fix)return tr.fix;const tier=tierOf(tr.y),ly=tr.y-TY[tier];
  if(tier===3)return ly<100?{x:320,y:GY+8,h:44}:{x:tr.x<320?46:594,y:tr.y,h:44};
  if(tr.x<70||tr.x>(tier===2?560:570))return {x:tr.x<320?4:636,y:tr.y,h:34};
  if(ly<300){const dx=tr.x-320,dy=ly-300,l=Math.hypot(dx,dy),top=Math.abs(dx)<10;
    if(top&&tier>0)return {x:320,y:TY[tier]-14,h:E[tier-1]-E[tier]+30,hang:true};
    return {x:320+dx/l*317,y:TY[tier]+300+dy/l*317,h:tier===0?34:WALL_H};}
  return {x:tr.x,y:tr.y+26,h:BLOCK_H};}
function mkTorch(tr){const sp=torchSpot(tr),g=new THREE.Group(),col=tr.c,big=tr.r>120;g.position.set(sp.x-320,elev(sp.y)+sp.h,sp.y);
  if(sp.hang){const ch=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,16,5),M.iron);ch.position.y=-8;const cage=new THREE.Mesh(new THREE.CylinderGeometry(4.5,3.2,9,6),M.iron);cage.position.y=-20;g.add(ch,cage);}
  else{const st=new THREE.Mesh(new THREE.CylinderGeometry(1.4,2,18,6),M.iron);st.position.y=9;const bw=new THREE.Mesh(new THREE.CylinderGeometry(5,2.4,6,8),M.iron);bw.position.y=20;st.castShadow=bw.castShadow=true;g.add(st,bw);}
  const fy=sp.hang?-19:30,fl=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.flameTex,color:hdr(col,2.3),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));fl.position.y=fy;const fs=big?22:17;fl.scale.set(fs,fs*1.5,1);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr(col,.9),transparent:true,opacity:.34,blending:THREE.AdditiveBlending,depthWrite:false}));halo.position.y=fy-2;halo.scale.set(big?130:96,big?130:96,1);
  g.add(halo,fl);R3.scene.add(g);return {tr,fl,halo,fs,hs:big?130:96};}

/* ---------- the world around the table ---------- */
const PITS=[{x0:-1180,x1:-70,z0:TY[1],z1:TY[1]+900,sd:-1},{x0:710,x1:1820,z0:TY[1],z1:TY[1]+900,sd:1},{x0:710,x1:1820,z0:0,z1:900,sd:1}]; // table-space footprints of the cuts in the ground around each wing (x is table x)
function pitDist(x,y){let d=1e9;for(const p of PITS)d=Math.min(d,Math.max(p.x0-x,x-p.x1,p.z0-y,y-p.z1));return d;}
function groundY(x,y){const d=Math.max(0,Math.abs(x-320)-430);return elev(clamp(y,TY[0],H))-38+sstep(0,700,d)*sstep(0,220,pitDist(x,y))*(60+90*Math.sin(x*.004+y*.0021)+50*Math.sin(y*.0057+x*.003));}
function buildScenery(){const sc=R3.scene,frame=new MB(),iron=new MB(),roof=new MB(),dark=new MB(),s0=new MB();
  // the land the table stands in
  {const gt=M.ground.map;const mb=new MB();mb.hint=[0,1,0];const xs=[-1500,-1100,-800,-560,-390];
    for(const sd of [-1,1])for(let i=0;i<xs.length-1;i++)for(let y=-900;y<HW+500;y+=90){const xa=320+sd*-xs[i+1]*1,xb=320+sd*-xs[i],x0=Math.min(xa,xb),x1=Math.max(xa,xb),y2=y+90;
      if(PITS.some(p=>p.sd===sd&&y>=p.z0-.5&&y2<=p.z1+.5))continue; // a wing's court is cut out of the land here; wing3d.js lays the ground around it
      const P=(x,yy)=>[x-320,groundY(x,yy),yy];mb.quad(P(x0,y),P(x1,y),P(x1,y2),P(x0,y2),[x0/220,y/220],[x1/220,y/220],[x1/220,y2/220],[x0/220,y2/220]);}
    // land behind the Keep and the skirt under the outer walls
    for(let x=-70;x<710;x+=130)for(let y=-900;y<-70;y+=90){const P=(xx,yy)=>[xx-320,groundY(xx,yy),yy];mb.quad(P(x,y),P(x+130,y),P(x+130,y+90),P(x,y+90),[x/220,y/220],[(x+130)/220,y/220],[(x+130)/220,(y+90)/220],[x/220,(y+90)/220]);}
    const g=mb.mesh(M.ground,{cast:false});sc.add(g);}
  // outer wall skirts so the table reads as a built thing
  prism(dark,[[-74,-74],[-70,-74],[-70,H+34],[-74,H+34]],30,{depth:60});prism(dark,[[710,-74],[714,-74],[714,H+34],[710,H+34]],30,{depth:60});
  // The Black Keep: curtain walls, towers, battlements, the rose window
  const y1=FY[0]+90;
  prism(s0,[[-70,-70],[-26,-70],[-26,y1],[-70,y1]],88);prism(s0,[[666,-70],[710,-70],[710,y1],[666,y1]],88);
  prism(s0,[[-150,-150],[790,-150],[790,-66],[-150,-66]],150);
  for(let x=-140;x<790;x+=44)box(s0,x+11,-80,150,170,24,26);
  for(const sx of [-48,688])for(let y=-50;y<y1;y+=44)box(s0,sx,y,88,104,42,24);
  for(const tx of [-112,752]){cyl(s0,tx,-112,62,-40,250,14);cyl(s0,tx,-112,70,250,268,14);cone(roof,tx,-112,76,268,390,14);
    for(let k=0;k<14;k+=2){const a=k*TAU/14;box(s0,tx+Math.cos(a)*64,-112+Math.sin(a)*64,268,286,18,18,-a);}}
  box(s0,320,-108,150,196,230,84);cone(roof,320,-108,150,196,300,4);
  {const rose=new THREE.Mesh(new THREE.CircleGeometry(74,40),new THREE.MeshBasicMaterial({map:ctex(texRose()),color:new THREE.Color(1.7,1.7,1.7)}));rose.position.set(0,E[0]+92,-65.5);sc.add(rose);
    const fr=new THREE.Mesh(new THREE.TorusGeometry(76,5,8,40),M.stone[0]);fr.position.copy(rose.position);sc.add(fr);
    const beam=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr('#ff6080',.8),transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false}));beam.position.set(0,E[0]+92,-50);beam.scale.set(420,420,1);sc.add(beam);}
  for(const sx of [-25,665])for(let k=0;k<5;k++){const b=new THREE.Mesh(new THREE.PlaneGeometry(30,62),SM({color:'#8a1428',emissive:hdr('#c0283c'),emissiveIntensity:.18,roughness:.9,side:THREE.DoubleSide}));
    b.position.set(sx-320,E[0]+52,120+k*190);b.rotation.y=sx<0?PI/2:-PI/2;sc.add(b);}
  // gateway arches over the chutes between levels
  for(let i=1;i<3;i++){const y=TY[i]-14,top=E[i-1]-E[i]+30;for(const x of [262,378])box(frame,x,y,WALL_H-4,top,14,14);box(frame,320,y,top,top+16,150,18);
    for(let k=-3;k<=3;k++)box(frame,320+k*22,y,top+16,top+(k%2?24:30),12,18);}
  // wrought iron along the Hollow, graves beyond it
  for(const x of [-8,648]){for(let y=TY[2]+60;y<H+30;y+=13){cyl(iron,x,y,.9,34,54,5);cone(iron,x,y,1.8,54,60,5);}
    for(const h of [39,50])box(iron,x,(TY[2]+60+H+30)/2,h,h+1.4,1.4,H-30-TY[2]);}
  const add=(mb,mat,o)=>{if(mb.p.length)sc.add(mb.mesh(mat,o));};add(frame,M.frame);add(iron,M.iron);add(roof,M.roof);add(dark,M.dark);add(s0,M.stone[0]);
  // instanced scenery: pines by the Wilds, graves and dead trees by the Hollow
  const dm=new THREE.Object3D(),inst=(geo,mat,list)=>{const im=new THREE.InstancedMesh(geo,mat,list.length);list.forEach((q,i)=>{dm.position.set(q[0]-320,q[2]===undefined?groundY(q[0],q[1]):q[2],q[1]);dm.rotation.set(q[5]||0,q[4]||0,0);dm.scale.setScalar(q[3]||1);dm.updateMatrix();im.setMatrixAt(i,dm.matrix);});im.castShadow=true;im.receiveShadow=true;sc.add(im);return im;},clear=l=>l.filter(q=>q[2]!==undefined||pitDist(q[0],q[1])>30);
  const pineG=(()=>{const mb=new MB(),I=new THREE.Matrix4();for(let k=0;k<4;k++)mb.add(new THREE.ConeGeometry(.42-k*.08,.42,7),I.clone().makeTranslation(0,.3+k*.2,0));return mb.geo();})();
  const trunkG=new THREE.CylinderGeometry(.035,.05,.3,5).translate(0,.1,0);
  const pines=[];for(let k=0;k<150;k++){const sd=hash(k*1.7)>.5?1:-1,far=hash(k*3.3),x=320+sd*(k<26?352+hash(k)*18:500+far*far*780),y=k<26?TY[1]+hash(k*5.1)*900:TY[1]-260+hash(k*5.1)*1300,sz=k<26?44+hash(k*2)*30:90+hash(k*7.7)*110;
    pines.push([x,y,k<26?elev(y)+34:undefined,sz,hash(k)*6]);}
  {const keep=clear(pines);inst(pineG,M.pine,keep);inst(trunkG,M.bark,keep);}
  const tombG=(()=>{const sh=new THREE.Shape();sh.moveTo(-.5,0);sh.lineTo(-.5,.7);sh.absarc(0,.7,.5,PI,0,true);sh.lineTo(.5,0);sh.closePath();return new THREE.ExtrudeGeometry(sh,{depth:.26,bevelEnabled:false,curveSegments:6}).translate(0,0,-.13);})();
  const crossG=(()=>{const mb=new MB(),I=new THREE.Matrix4();mb.add(new THREE.BoxGeometry(.24,1.5,.2),I.clone().makeTranslation(0,.75,0));mb.add(new THREE.BoxGeometry(.9,.22,.2),I.clone().makeTranslation(0,1.05,0));return mb.geo();})();
  const tombs=[],crosses=[];for(let k=0;k<120;k++){const sd=hash(k*2.9)>.5?1:-1,x=320+sd*(k<20?344+hash(k)*22:420+Math.pow(hash(k*4.1),1.5)*520),y=TY[2]-80+hash(k*6.3)*1320,q=[x,y,k<20?elev(y)+34:undefined,k<20?13+hash(k)*6:16+hash(k*1.3)*14,(hash(k*8.8)-.5)*.9,(hash(k*3.7)-.5)*.2];
    (hash(k*9.9)>.35?tombs:crosses).push(q);}
  const tm=SM({map:M.stone[2].map,color:0x5e6a86,roughness:.92,envMapIntensity:.25});inst(tombG,tm,clear(tombs));inst(crossG,tm,clear(crosses));
  const deadG=(()=>{const mb=new MB();const br=(m,l,w,d)=>{mb.add(new THREE.CylinderGeometry(w*.6,w,l,5).translate(0,l/2,0),m);if(d>0)for(const s of [-1,1]){const k=hash(l*7+d+s);
        br(m.clone().multiply(new THREE.Matrix4().makeTranslation(0,l*.92,0)).multiply(new THREE.Matrix4().makeRotationY(k*5)).multiply(new THREE.Matrix4().makeRotationZ(s*(.45+k*.4))),l*.66,w*.6,d-1);}};
      br(new THREE.Matrix4(),.34,.05,3);return mb.geo();})();
  const dead=[];for(let k=0;k<22;k++){const sd=k%2?1:-1,x=320+sd*(430+hash(k*3.1)*520),y=TY[2]-200+hash(k*7.7)*1500;dead.push([x,y,undefined,100+hash(k)*80,hash(k)*6]);}
  for(let k=0;k<8;k++){const sd=k%2?1:-1,x=320+sd*(440+hash(k*5.3)*300),y=TY[0]+hash(k*2.1)*900;dead.push([x,y,undefined,90+hash(k)*70,hash(k)*6]);}
  inst(deadG,M.bark,clear(dead));
  // the chapel by the Hollow
  {const cx=1090,cy=TY[2]+330,g0=groundY(cx,cy)-elev(cy)-6,mb=new MB();box(mb,cx,cy,g0,g0+120,130,220);box(mb,cx,cy-150,g0,g0+250,70,70);
    const rf=new MB();rf.add(new THREE.CylinderGeometry(1,1,1,3).rotateZ(PI/2).rotateY(PI/2),at(cx,cy,g0+152,0,[84,64,222]));cone(rf,cx,cy-150,54,g0+250,g0+370,4);sc.add(mb.mesh(tm));sc.add(rf.mesh(M.roof));
    const wm=new THREE.MeshBasicMaterial({color:hdr('#ffb050',1.15)});for(let k=0;k<4;k++){const w=new THREE.Mesh(new THREE.PlaneGeometry(16,46),wm);w.position.set(cx-320-65.6,elev(cy)+g0+62,cy-78+k*52);w.rotation.y=-PI/2;sc.add(w);}
    const w2=new THREE.Mesh(new THREE.CircleGeometry(15,16),wm);w2.position.set(cx-320-35.6,elev(cy)+g0+190,cy-150);w2.rotation.y=-PI/2;sc.add(w2);}
  // far lanterns
  for(let k=0;k<16;k++){const sd=k%2?1:-1,x=320+sd*(420+hash(k*4.7)*420),y=TY[0]+hash(k*9.3)*3000,t=tierOf(clamp(y,TY[0],H-10)),col=['#ff6a3c','#7fe0c0','#ffb050'][t];if(pitDist(x,y)<30)continue;
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr(col,1.2),transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));sp.position.set(x-320,groundY(x,y)+34,y);sp.scale.set(40,40,1);sc.add(sp);
    const p=new THREE.Mesh(new THREE.CylinderGeometry(1.4,1.8,32,5),M.iron);p.position.set(x-320,groundY(x,y)+16,y);sc.add(p);}
}

/* ---------- balls, particles, motes ---------- */
function buildFx(){const sc=R3.scene;
  R3.ballGeo=new THREE.SphereGeometry(1,40,28);R3.ballTex=ctex(texBall());
  R3.blobGeo=new THREE.CircleGeometry(1,20).rotateX(-PI/2);
  const N=320,pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));pg.setAttribute('color',new THREE.BufferAttribute(new Float32Array(N*3),3));
  R3.parts=new THREE.Points(pg,new THREE.PointsMaterial({size:9,map:R3.glowTex,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));R3.parts.frustumCulled=false;sc.add(R3.parts);
  const Mn=260,mg=new THREE.BufferGeometry();mg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(Mn*3),3));mg.setAttribute('color',new THREE.BufferAttribute(new Float32Array(Mn*3),3));
  R3.motes=new THREE.Points(mg,new THREE.PointsMaterial({size:7,map:R3.glowTex,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));R3.motes.frustumCulled=false;sc.add(R3.motes);
  R3.moteCols=['#ff7a3a','#b8ff8a','#9cc8ff','#9dffc8'].map(c=>hdr(c,1.4));
  R3.tunnelGlow=[0,1,2,3,4].map(()=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,color:hdr('#62d8ff',1.6),transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false}));sp.scale.set(70,70,1);sp.visible=false;sc.add(sp);return sp;});
  R3.tmpC=new THREE.Color();R3.litC={};for(const k in LITC)R3.litC[k]=hdr(LITC[k],1.9);R3.flashQ=[];}
function ballObj(i){let o=R3.balls[i];if(o)return o;
  const mat=new THREE.MeshStandardMaterial({color:0xffffff,map:R3.ballTex,metalness:1,roughness:.16,envMapIntensity:3.4,emissive:new THREE.Color(0xffffff),emissiveIntensity:.2});
  const m=new THREE.Mesh(R3.ballGeo,mat);m.castShadow=true;R3.scene.add(m);
  const blob=new THREE.Mesh(R3.blobGeo,new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.45,depthWrite:false,map:R3.glowTex,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));blob.renderOrder=3;R3.scene.add(blob);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,transparent:true,opacity:.3,blending:THREE.AdditiveBlending,depthWrite:false}));R3.scene.add(halo);
  const loc=new THREE.Sprite(new THREE.SpriteMaterial({map:R3.glowTex,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false}));loc.renderOrder=9;R3.scene.add(loc);
  o=R3.balls[i]={m,mat,blob,halo,loc,q:new THREE.Quaternion(),lx:0,ly:0};return o;}

/* ---------- quality, resize, post ---------- */
const GradeShader={uniforms:{tDiffuse:{value:null},exposure:{value:1.18},vig:{value:.85},time:{value:0}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:['uniform sampler2D tDiffuse;uniform float exposure;uniform float vig;uniform float time;varying vec2 vUv;',
    'vec3 rrt(vec3 v){vec3 a=v*(v+0.0245786)-0.000090537;vec3 b=v*(0.983729*v+0.4329510)+0.238081;return a/b;}',
    'vec3 aces(vec3 c){const mat3 mi=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777));',
    'const mat3 mo=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602));',
    'c*=exposure/0.6;c=mi*c;c=rrt(c);c=mo*c;return clamp(c,0.0,1.0);}',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233))+time)*43758.5453);}',
    'void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;c=aces(max(c,0.0));',
    'vec2 q=vUv-0.5;c*=1.0-vig*dot(q,q)*1.15;',
    'float l=dot(c,vec3(0.2126,0.7152,0.0722));c=mix(vec3(l),c,1.12);',
    'c=mix(c*12.92,1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-0.055,step(0.0031308,c));',
    'c+=(hash(gl_FragCoord.xy)-0.5)/255.0*1.6;gl_FragColor=vec4(c,1.0);}'].join('\n')};
function setQuality(name,manual){const rn=R3.rn,q=QUALITY[name];if(manual)R3.auto=false;R3.qName=name;R3.q=q;
  if(R3.composer){R3.composer.renderTarget1.dispose();R3.composer.renderTarget2.dispose();if(R3.bloom&&R3.bloom.dispose)R3.bloom.dispose();R3.composer=null;R3.bloom=null;R3.grade=null;}
  const pr=Math.min(window.devicePixelRatio||1,q.dpr);rn.setPixelRatio(pr);rn.setSize(R3.w,R3.h,false);
  const pw=Math.max(2,Math.floor(R3.w*pr)),ph=Math.max(2,Math.floor(R3.h*pr)),gl2=rn.capabilities.isWebGL2;
  const floatOK=gl2?rn.extensions.has('EXT_color_buffer_float'):rn.extensions.has('EXT_color_buffer_half_float')&&rn.extensions.has('OES_texture_half_float_linear');
  const wantShadow=q.shadow>0;if(rn.shadowMap.enabled!==wantShadow){rn.shadowMap.enabled=wantShadow;R3.dirtyMats=true;}
  if(wantShadow&&R3.moon.shadow.mapSize.x!==q.shadow){R3.moon.shadow.mapSize.set(q.shadow,q.shadow);if(R3.moon.shadow.map){R3.moon.shadow.map.dispose();R3.moon.shadow.map=null;}}
  let post=q.post&&floatOK&&!R3.noPost&&THREE.EffectComposer&&THREE.RenderPass&&THREE.ShaderPass&&THREE.UnrealBloomPass;
  if(post){try{const RT=q.msaa&&gl2&&!R3.noMsaa?THREE.WebGLMultisampleRenderTarget:THREE.WebGLRenderTarget;
      const rt=new RT(pw,ph,{type:THREE.HalfFloatType,format:THREE.RGBAFormat,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
      const c=new THREE.EffectComposer(rn,rt);c.addPass(new THREE.RenderPass(R3.scene,R3.camera));
      R3.bloom=new THREE.UnrealBloomPass(new THREE.Vector2(pw,ph),.62,.6,.92);c.addPass(R3.bloom);R3.grade=new THREE.ShaderPass(GradeShader);c.addPass(R3.grade);R3.composer=c;}
    catch(e){R3.composer=null;post=false;}}
  const tm=post?THREE.NoToneMapping:THREE.ACESFilmicToneMapping;if(rn.toneMapping!==tm){rn.toneMapping=tm;R3.dirtyMats=true;}rn.toneMappingExposure=1.18;
  if(R3.dirtyMats){R3.scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});R3.dirtyMats=false;}
  R3.postOn=!!post;R3.probe=post?3:0;R3.ft=[];G.dirty=true;}
function resize3D(w,h){R3.w=Math.max(2,w);R3.h=Math.max(2,h);R3.camera.aspect=R3.w/R3.h;R3.camera.updateProjectionMatrix();setQuality(R3.qName);}
// if the post chain comes out black on this GPU, fall back a step instead of showing nothing
function probeFrame(){const gl=R3.rn.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,px=new Uint8Array(4);let sum=0;
  for(let i=0;i<9;i++){gl.readPixels((w*(.2+.3*(i%3)))|0,(h*(.2+.3*(i/3|0)))|0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);sum+=px[0]+px[1]+px[2];}
  if(sum<60){if(!R3.noMsaa&&R3.q.msaa)R3.noMsaa=true;else R3.noPost=true;setQuality(R3.qName);}}

/* ---------- per-frame ---------- */
const _v=new THREE.Vector3(),_q=new THREE.Quaternion(),_ax=new THREE.Vector3();
const _bp={x:0,y:0,tx:0,ty:0},_bo={x:0,y:0,h:0};
function ballPos(b,ex){const o=_bo; // where to draw the ball: its physics position carried forward by the time since the last step
  if(b.st==='rail'&&b.rail&&b.rail.h3){const s=clamp(b.rs+b.rv*ex,0,b.rail.len);railPos(b.rail,s,_bp);o.x=_bp.x;o.y=_bp.y;o.h=railY(b.rail,s)+b.r;return o;}
  if(b.st==='live'){o.x=b.x+b.vx*ex;o.y=b.y+b.vy*ex;}else{o.x=b.x;o.y=b.y;}
  o.h=elev(o.y)+b.r-(b.st==='held'?9:0);return o;}
function ballY(b){return ballPos(b,0).h;}
function flash3D(x,y,color,power){R3.flashQ.push({x,y,color,power:power||1});}
function frame3D(dt){if(!R3.ready)return;const D=R3.dyn,t=G.t,sc=R3.scene,run=G.run,cls=run?run.cls:'knight',cl=CLASSES[cls];
  const ex=(G.paused||G.choice||G.mode==='over')?0:(R3.acc||0)*(G.slow>0?.4:1);
  // flippers
  for(const o of D.flips){const f=o.f,a=clamp(f.a+f.w*ex,f.up,f.rest);o.g.rotation.y=-Math.atan2(Math.sin(a),f.dir*Math.cos(a));o.rub.emissiveIntensity=G.tilt>0?.05:f.on?1.5:.35;}
  // balls
  let fb=focusBall(),tg=0;const cloak=G.phase>0;
  for(let i=0;i<Math.max(G.balls.length,R3.balls.length);i++){const b=G.balls[i];if(!b){const o=R3.balls[i];o.m.visible=o.blob.visible=o.halo.visible=o.loc.visible=false;continue;}
    const o=ballObj(i),hid=b.st==='tunnel',bp=ballPos(b,ex),bx=bp.x,bz=bp.y,y=bp.h;o.m.visible=!hid;o.blob.visible=!hid&&b.st!=='rail';o.halo.visible=o.loc.visible=!hid;o.sx=bx;o.sy=bz;o.sh=y;
    if(hid){const sp=R3.tunnelGlow[tg++];if(sp){sp.visible=true;const tn=b.tun;
        if(tn&&tn.zone){const n=tn.n-1,u=clamp(b.rs/tn.len,0,1),ax=tn.x[0]-320+ZX(tn.y[0]),az=tn.y[0]+ZZ(tn.y[0]),ay=elev(tn.y[0]),bx2=tn.x[n]-320+ZX(tn.y[n]),bz2=tn.y[n]+ZZ(tn.y[n]),by2=elev(tn.y[n]);sp.position.set(lerp(ax,bx2,u),lerp(ay,by2,u)+6-30*Math.sin(u*PI),lerp(az,bz2,u));}
        else sp.position.set(b.x-320,elev(b.y)+6,b.y);const k=.8+.2*Math.sin(t*30);sp.scale.set(70*k,70*k,1);}continue;}
    const dx=bx-o.lx,dz=bz-o.ly,d=Math.hypot(dx,dz);if(d>.001&&d<80){_ax.set(dz/d,0,-dx/d);_q.setFromAxisAngle(_ax,d/b.r);o.q.premultiply(_q);}o.lx=bx;o.ly=bz;
    const hot=!!b.pow||b.arm>0,gc=b.pow&&cls==='mage'?'#ff8a3a':cl.glow,ghost=cloak||(cls==='rogue'&&hot);
    zshift(o.m.position.set(bx-320,y,bz)&&o.m);o.m.scale.setScalar(b.r);o.m.quaternion.copy(o.q);o.mat.color.set(cl.color).convertSRGBToLinear();o.mat.emissive.set(gc).convertSRGBToLinear();
    o.mat.emissiveIntensity=b.pow?.9:b.arm>0?.5+.25*Math.sin(t*14):.2;if(o.mat.transparent!==ghost){o.mat.transparent=ghost;o.mat.needsUpdate=true;}o.mat.opacity=ghost?.45:1;
    zshift(o.blob.position.set(bx-320,elev(bz)+.5,bz)&&o.blob);o.blob.scale.setScalar(b.r*1.7);
    zshift(o.halo.position.set(bx-320,y,bz)&&o.halo);o.halo.material.color.set(gc);o.halo.material.opacity=hot?.55+.25*Math.sin(t*14):.3;o.halo.scale.setScalar(b.r*(hot?8.5:5.2));
    zshift(o.loc.position.set(bx-320,y,bz)&&o.loc);o.loc.material.color.set(gc);o.loc.scale.setScalar(b.r*3.4);
    if(b.pow&&b.st==='live'&&Math.random()<dt*40)G.parts.push({x:b.x+rand(-4,4),y:b.y+rand(-4,4),vx:-b.vx*.1,vy:-b.vy*.1,life:0,max:.35,color:gc,size:3});}
  for(;tg<R3.tunnelGlow.length;tg++)R3.tunnelGlow[tg].visible=false;
  if(fb&&fb.st!=='tunnel'){const fp=ballPos(fb,ex);R3.ballL.position.set(fp.x-320+ZX(fp.y),fp.h+26,fp.y+6+ZZ(fp.y));R3.ballL.color.set(fb.pow&&cls==='mage'?'#ff8a3a':cl.glow);R3.ballL.intensity=fb.pow?2:1.15;
    const au=R3.aura;au.visible=cls==='cleric'&&fb.st==='live';if(au.visible){au.position.set(fp.x-320+ZX(fp.y),elev(fp.y)+.8,fp.y+ZZ(fp.y));au.scale.setScalar(85);}}
  else{R3.ballL.intensity=0;R3.aura.visible=false;}
  // bumpers, their boss wards, statues
  for(const o of D.bumps){const b=o.b,f=Math.max(0,b.flash),s=1+f*.09;o.g.scale.set(s,1+f*.05,s);for(const q of o.mats)q.m.emissiveIntensity=q.k+f*1.6;
    if(f>.9){if(!o.lit){o.lit=true;flash3D(b.x,b.y,b.bell?'#ffd070':PAL[b.tier].glow,1);}}else if(f<.5)o.lit=false;
    o.ring.color.copy(R3.tmpC.set(b.bell?'#ffd070':PAL[b.tier].glow).convertSRGBToLinear().multiplyScalar(.45+f*2.6));
    if(o.rune)o.rune.opacity=.45+.12*Math.sin(t*2+b.x)+f;
    if(o.flame){const k=1+.12*Math.sin(t*17+b.x)+.08*Math.sin(t*31+b.y)+f*.6;o.flame.scale.set(30*k,46*k,1);o.flame.position.y=50+k*3;}
    if(o.ember&&o.emberCol)o.ember.color.copy(o.emberCol).multiplyScalar(.25+f*3);
    if(o.bell){if(f>.9)o.t=1;o.t=Math.max(0,o.t-dt*.9);o.bell.rotation.z=Math.sin(t*14)*.42*o.t*o.t;}
    o.ward.visible=!!b.ward;if(b.ward){const k=.55+.35*Math.sin(t*8);o.wardS.material.opacity=k;o.wardT.scale.setScalar(1+.04*Math.sin(t*8));}}
  for(const o of D.statues){const st=o.s,f=Math.max(0,st.flash);o.g.visible=st.on;for(const q of o.mats)q.m.emissiveIntensity=q.k+f*1.4;if(o.rune)o.rune.opacity=.5+.15*Math.sin(t*1.7)+f;}
  // targets
  for(const o of D.segs){const s=o.s,f=Math.max(0,s.flash);
    if(o.drop){const k=s.on?1:0;o.k+=(k-o.k)*Math.min(1,dt*16);o.m.position.y=o.y0-(1-o.k)*(o.h-1.2);o.mat.emissiveIntensity=.14+f*2.2;}
    else o.mat.emissiveIntensity=(s.lit?1.5:.1)+f*2.4;}
  for(const o of D.slings)o.mat.emissiveIntensity=.3+Math.max(0,o.s.s.flash)*3.2;
  // lane inserts; the skill-shot candle blinks while the ball waits on the plunger
  for(const o of D.sens){const s=o.s,sk=s.set==='candles'&&G.skill>=0&&T.sets.candles.lanes[G.skill]===s&&(t*6|0)%2;
    const lit=o.kick?(run&&run.kickback?.75+.25*Math.sin(t*5):0):o.lane?(s.lit||sk?1:0)+Math.max(0,s.flash)*.6:Math.max(0,s.flash);
    o.v+=(Math.min(1.3,lit)-o.v)*Math.min(1,dt*14);if(o.v>.02){o.mat.color.copy(o.on).multiplyScalar(o.v);o.mat.opacity=1;}else{o.mat.color.setRGB(.012,.012,.02);o.mat.opacity=.7;}}
  // shot inserts: gold for the main quest, blue for side quests, red when a boss spell can be broken
  for(const k in D.shots){const o=D.shots[k];let cols=null;for(const id of o.ids)if(G.lit[id]){cols=G.lit[id];break;}
    if(cols){const fast=cols.indexOf('danger')>=0||cols.indexOf('main')>=0,a=cols[0]==='soft'&&cols.length===1?.5:.55+.45*Math.sin(t*(fast?11:6));o.mat.color.copy(R3.litC[cols[(t*2|0)%cols.length]]);o.mat.opacity=a;}
    else{o.mat.color.copy(o.base);o.mat.opacity=.05+.03*Math.sin(t*1.6+o.ph);}}
  for(const o of D.holes){const h=o.h,L=G.lit[h.id],m=o.sp.material;if(L)m.color.copy(R3.litC[L[0]]);else m.color.copy(o.base);m.opacity=clamp(Math.max(h.glow,L?.4+.25*Math.sin(t*5):0),0,1)*.9;}
  for(const o of D.spins){o.pv.rotation.x=o.s.ang||0;o.mat.emissiveIntensity=o.s.rate>0?.9:.05;}
  for(const o of D.torches){const k=1+.14*Math.sin(t*13+o.tr.ph)+.09*Math.sin(t*29+o.tr.ph*2);o.fl.scale.set(o.fs*k,o.fs*1.5*k,1);const h=o.hs*(.92+.08*Math.sin(t*9+o.tr.ph));o.halo.scale.set(h,h,1);}
  // plunger, the Grave, ball save
  R3.plunger.position.z=3116+G.plunge.charge*30;
  {const open=!T.banks.nails.segs.some(x=>x.on),m=R3.graveGlow.material;m.opacity=open?.8+.15*Math.sin(t*6):.28;const s=open?230:110;R3.graveGlow.scale.set(s,s,1);
    const g=run&&run.grave,f=g?(g.open?1:g.hits/g.need):0;R3.graveMark.material.opacity=g&&g.open&&!G.inGrave?.45+.3*Math.sin(t*4):0;R3.graveStone.emissiveIntensity=f*(g&&g.open?1.6+.5*Math.sin(t*4):.9);
    const sv=run&&(G.save>0||run.shield)&&!G.inGrave,sm=R3.saveGlow.material;sm.opacity=sv?.45+.25*Math.sin(t*6):0;if(sv)sm.color.copy(R3.litC[G.save>0?'side':'main']);}
  frameActors(dt,ex);frameWing(dt);
  // flash lights
  while(R3.flashQ.length){const f=R3.flashQ.shift();let L=R3.flashL[0];for(const l of R3.flashL)if(l.userData.t<L.userData.t)L=l;L.userData.t=1;L.userData.p=f.power;L.color.set(f.color);L.position.set(f.x-320+ZX(f.y),elev(f.y)+34,f.y+ZZ(f.y));}
  for(const l of R3.flashL){l.userData.t=Math.max(0,l.userData.t-dt*5.5);l.intensity=l.userData.t*2.6*(l.userData.p||1);}
  // particles: the 2D game moves them on the table; here each also arcs up off it
  {const P=R3.parts.geometry.attributes.position,C=R3.parts.geometry.attributes.color,n=P.count,c=R3.tmpC,L=G.parts,m=L.length,o0=Math.max(0,m-n);
    for(let i=0;i<n;i++){const p=L[o0+i];if(!p){P.setXYZ(i,0,-9999,0);continue;}const u=p.life/p.max,k=Math.max(0,1-u);P.setXYZ(i,p.x-320+ZX(p.y),elev(p.y)+6+(p.size||3)*26*u*(1-u),p.y+ZZ(p.y));c.set(p.color).convertSRGBToLinear().multiplyScalar(k*1.8);C.setXYZ(i,c.r,c.g,c.b);}
    P.needsUpdate=true;C.needsUpdate=true;}
  // drifting motes
  {const P=R3.motes.geometry.attributes.position,C=R3.motes.geometry.attributes.color,n=P.count;
    for(let i=0;i<n;i++){const h1=hash(i*7.13),h2=hash(i*1.91),h3=hash(i*4.4),ti=i%4,ph=t*(.3+h1*.4)+h1*40;
      const y0=ti===3?GY+40:TY[ti]+20,span=ti===3?640:960,x=-380+h1*760+Math.sin(ph)*24,yy=y0+h2*span+Math.cos(ph*1.3)*16;
      const hh=ti===0?(t*22+h3*160)%160:20+h3*110+Math.sin(ph*1.7)*12,a=ti===1?Math.max(0,Math.sin(t*2.2+h1*30)):.45+.4*Math.sin(ph*2);
      P.setXYZ(i,x,(ti===3?E[3]:elev(yy))+hh,yy);const c=R3.moteCols[ti];C.setXYZ(i,c.r*a,c.g*a,c.b*a);}
    P.needsUpdate=true;C.needsUpdate=true;}
  updateCam3D(dt);
  {const m=R3.moon,c=R3.cam.t;m.target.position.set(0,c.y,c.z-120);m.position.set(-460,c.y+1200,c.z+520);}
  {const ft=G.focusTier,fc=['#0b0610','#050b0a','#06080f','#030604','#070803','#05070c','#0b0603'][ft];R3.tmpC.set(fc);sc.fog.color.lerp(R3.tmpC,Math.min(1,dt*2));sc.background.copy(sc.fog.color);}
  if(R3.grade)R3.grade.uniforms.time.value=(t*61)%17;
  if(R3.composer)R3.composer.render();else R3.rn.render(sc,R3.camera);
  if(R3.probe>0&&--R3.probe===0)probeFrame();}

// Player view: place the camera so the flippers sit near the bottom of the screen and the top of the level near the top
function frameLevel(tier,pitch,fov,asp){const p=pitch*PI/180,tv=Math.tan(fov*PI/360),sn=Math.sin(p),cs=Math.cos(p),zA=FY[tier]+(tier===3?62:74),zB=tier===3?GY+6:tier>=4?TY[tier]+10:TY[tier]-18,L=zA-zB,half=tier>=4?285:345;
  const bo=G.boss;let nA=-.92,nB=bo&&bo.tier===tier?.55:.68,h=0,kA=0; /* a boss fight needs headroom under its health bar */ const g=n=>(n*tv*sn+cs)/(n*tv*cs-sn);
  for(let it=0;it<4;it++){h=L/(g(nA)-g(nB));kA=h*g(nA);const depth=h*sn-kA*cs,m=half/(depth*tv*asp*.97);if(m<=1.001)break;nA/=m;nB/=m;}
  return {h,zc:zA-kA,sn,cs};}
function updateCam3D(dt){const cam=R3.cam,C=R3.camera,b=focusBall(),asp=C.aspect;let px,py,pz,tx,ty,tz,fov,rate=4;
  const tier=G.focusTier,f=FY[tier],e=E[tier],bx=b?b.x-320:0,by=b?b.y:f-300;
  if(R3.dbg){fov=R3.dbg.fov||40;px=R3.dbg.p[0];py=R3.dbg.p[1];pz=R3.dbg.p[2];tx=R3.dbg.t[0];ty=R3.dbg.t[1];tz=R3.dbg.t[2];rate=1e3;}
  else if(G.demo&&G.mode==='title'){const s=G.t*.1;fov=36;tx=30+Math.sin(s)*50;ty=E[2]+20;tz=TY[2]+330;px=-610+Math.sin(s*.8)*150;py=E[2]+560+Math.sin(s*.6)*50;pz=FY[2]+470;rate=1.2;
    if(asp<1){px*=.5;py+=700/asp-700;pz+=500/asp-500;}}
  else{const m=CAMS[R3.camMode],p=m.pitch*PI/180,tv=Math.tan(m.fov*PI/360);fov=m.fov;
    if(R3.camMode===1){tx=bx*.62;ty=b?elev(by)+8:e;tz=by-150;const D=Math.max(560,300/(tv*asp));px=tx*.92;py=ty+D*Math.sin(p);pz=tz+D*Math.cos(p);rate=6;}
    else if(R3.camMode===2){const D=Math.max(352/(tv*asp),430/tv);tx=0;ty=e;tz=clamp(by-40,f-900+D*tv*.9,f+150-D*tv*.9);if(tier===3)tz=GY+340;px=0;py=ty+D*Math.sin(p);pz=tz+D*Math.cos(p);rate=5;}
    else{const F=frameLevel(tier,m.pitch,m.fov,asp),c=f-420,dz=clamp((by-c)*.07,-34,24),dx=bx*.05;px=dx;py=e+F.h;pz=F.zc+dz;tx=dx*1.6;ty=e;tz=pz-F.h*F.cs/F.sn;}}
  if(!R3.dbg&&!(G.demo&&G.mode==='title')){const ox=ZX(by),oz=ZZ(by);px+=ox;tx+=ox;pz+=oz;tz+=oz;}
  const k=1-Math.exp(-dt*rate);cam.t.x+=(tx-cam.t.x)*k;cam.t.y+=(ty-cam.t.y)*k;cam.t.z+=(tz-cam.t.z)*k;cam.p.x+=(px-cam.p.x)*k;cam.p.y+=(py-cam.p.y)*k;cam.p.z+=(pz-cam.p.z)*k;cam.fov+=(fov-cam.fov)*k;
  const sh=G.opt&&G.opt.shake?Math.min(18,G.cam.shake)*.3:0;C.position.set(cam.p.x+(sh?rand(-sh,sh):0),cam.p.y+(sh?rand(-sh,sh):0),cam.p.z);C.lookAt(cam.t.x,cam.t.y,cam.t.z);
  if(Math.abs(C.fov-cam.fov)>.01){C.fov=cam.fov;C.updateProjectionMatrix();}}
function snapCam(){updateCam3D(100);}
function project3D(x,y,h,out){_v.set(x-320+ZX(y),elev(y)+(h||0),y+ZZ(y)).project(R3.camera);out.x=(_v.x*.5+.5)*R3.w;out.y=(-_v.y*.5+.5)*R3.h;out.ok=_v.z<1&&_v.z>-1;return out;}
// screen pixels per table unit at a point on the table, for sizing overlay rings
function pxPerUnit(x,y,h){const ox=ZX(y),oz=ZZ(y);_v.set(x-320+ox,elev(y)+(h||0),y+oz).project(R3.camera);const ax=_v.x;_v.set(x-320+10+ox,elev(y)+(h||0),y+oz).project(R3.camera);return Math.abs(_v.x-ax)*.5*R3.w/10;}
