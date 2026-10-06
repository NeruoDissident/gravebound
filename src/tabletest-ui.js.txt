/* ================= UI, INPUT, LOOP ================= */
const $=id=>document.getElementById(id),VERSION='3D table test 0.1';
const UI={cur:null,touch:false,toastId:0,keysHidden:false,
  menu(name){UI.cur=name;const m=$('menu');m.hidden=!name;
    if(name==='title')m.innerHTML='<div class="pane"><p class="eyebrow">'+VERSION+'</p><h1>Gravebound<span>Pinball</span></h1>'+
      '<p class="lead">The whole table in 3D: the Black Keep, the Wilds, Grave Hollow and the Grave beneath it. This build is the table on its own, in free play. Classes, foes and quests come back once the table feels right.</p>'+
      '<nav><button class="go" type="button" data-act="play">Play the table</button></nav><p class="hint">'+(UI.touch?'Tap the left and right sides to flip.':'Z and / flip. Hold Space, then let go to launch.')+'</p></div>';
    else if(name==='pause')m.innerHTML='<div class="pane"><h2>Paused</h2><nav><button class="go" type="button" data-act="resume">Resume</button><button type="button" data-act="title">Back to the title</button></nav></div>';
    else m.innerHTML='';
    const b=m.querySelector('button');if(b)b.focus({preventScroll:true});
    const play=G.mode==='play';$('hud').hidden=!play;$('keys').hidden=!play||UI.keysHidden;$('keyTip').hidden=!play||!UI.keysHidden||UI.touch;$('touch').hidden=!(play&&UI.touch);},
  fatal(msg){const m=$('menu');m.hidden=false;m.innerHTML='<div class="pane"><p class="err">'+msg+'</p></div>';},
  sync(){
    if(G.toast&&G.toast.id!==UI.toastId){UI.toastId=G.toast.id;const t=G.toast,el=document.createElement('div');el.className='bn k-'+t.kind;
      const h=document.createElement('h2');h.textContent=t.title;el.appendChild(h);if(t.sub){const p=document.createElement('p');p.textContent=t.sub;el.appendChild(p);}
      const bn=$('banner');bn.innerHTML='';bn.appendChild(el);setTimeout(()=>{if(el.parentNode)el.remove();},2100);}
    if(G.mode==='play'&&!UI.folded&&G.run.score>0){UI.folded=true;UI.keysHidden=true;$('keys').hidden=true;$('keyTip').hidden=UI.touch;}
    $('launch').hidden=!(G.mode==='play'&&G.plunge.ready&&!UI.touch);if(G.plunge.ready)$('launchBar').style.setProperty('--c',Math.round(G.plunge.charge*100)+'%');
    if(!G.dirty)return;G.dirty=false;
    $('hScore').textContent=fmt(G.run.score);$('hTier').textContent=TIER_NAME[G.focusTier];
    const g=G.run.grave,hg=$('hGrave');hg.hidden=G.inGrave||(!g.open&&!g.hits);hg.textContent=g.open?'The Grave is open':'Grave '+g.hits+' / '+g.need;
    $('hBall').textContent=CLASSES[G.run.cls].name;$('hCam').textContent=CAMS[R3.camMode].name;$('hQ').textContent=R3.q?R3.q.label+(R3.q.post&&!R3.postOn?' (no glow)':''):'';
    $('hFps').textContent=Math.round(R3.fps)+' fps';}
};
function togglePause(){if(G.mode!=='play')return;G.paused=!G.paused;UI.menu(G.paused?'pause':null);if(G.paused){setFlip(-1,false);setFlip(1,false);G.in.n=false;}}
function act(k){A.init();
  switch(k){
  case 'play':startPlay();UI.menu(null);G.dirty=true;break;
  case 'resume':if(G.paused)togglePause();break;
  case 'title':G.paused=false;startAttract();UI.menu('title');break;
  case 'cam':R3.camMode=(R3.camMode+1)%CAMS.length;G.dirty=true;popup(CAMS[R3.camMode].name+' view','','info');break;
  case 'quality':{const o=['high','medium','low'],n=o[(o.indexOf(R3.qName)+1)%3];setQuality(n,true);popup(QUALITY[n].label+' detail','','info');break;}
  case 'ball':{const r=G.run;r.cls=CLS_ORDER[(CLS_ORDER.indexOf(r.cls)+1)%4];const c=CLASSES[r.cls];for(const b of G.balls){b.r=c.r;b.kx=c.kx;}G.dirty=true;popup(c.name+' ball',r.cls==='knight'?'Bigger and heavier':r.cls==='rogue'?'Smaller and livelier':'Standard weight','info');break;}
  case 'add':addTestBall();break;
  case 'grave':if(!G.inGrave){openGrave(!G.run.grave.open);if(!G.run.grave.open)popup('The Grave Closes','','info');}break;
  case 'reset':G.inGrave=false;G.graveLive=false;G.balls=[];G.plunge.auto=0;serve();break;
  case 'level':jumpTo((G.focusTier+3)%4);break;
  case 'sound':A.vol.s=A.vol.s>0?0:.8;A.vol.m=A.vol.s>0?.55:0;A.setVol();popup(A.vol.s>0?'Sound on':'Sound off','','info');break;
  case 'keys':UI.folded=true;UI.keysHidden=!UI.keysHidden;$('keys').hidden=UI.keysHidden||G.mode!=='play';$('keyTip').hidden=!UI.keysHidden||UI.touch||G.mode!=='play';break;
  case 'full':{const d=document,el=d.documentElement;try{const r=d.fullscreenElement?d.exitFullscreen():el.requestFullscreen();if(r&&r.catch)r.catch(()=>{});}catch(e){}break;}
  case 'pause':togglePause();break;}}
const KEYS={ArrowLeft:'l',KeyZ:'l',ShiftLeft:'l',KeyA:'l',ArrowRight:'r',Slash:'r',ShiftRight:'r',KeyL:'r',KeyM:'r',Space:'n',ArrowDown:'n',ArrowUp:'n',KeyP:'pause',Escape:'pause',
  KeyC:'cam',KeyF:'full',KeyQ:'quality',KeyV:'ball',KeyB:'add',KeyG:'grave',KeyR:'reset',KeyS:'sound',KeyH:'keys',Digit1:'t0',Digit2:'t1',Digit3:'t2',Digit4:'t3'};
function bindInput(){
  addEventListener('keydown',e=>{const k=KEYS[e.code];if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(UI.cur==='title'){if(e.code==='Enter'||e.code==='Space'){e.preventDefault();act('play');}return;}
    if(!k)return;e.preventDefault();if(e.repeat)return;A.init();
    if(UI.cur==='pause'){if(k==='pause')togglePause();return;}
    if(k==='l')setFlip(-1,true);else if(k==='r')setFlip(1,true);else if(k==='n'){G.in.n=true;nudge();}
    else if(k[0]==='t'&&k.length===2){G.plunge.auto=0;jumpTo(+k[1]);}else act(k);});
  addEventListener('keyup',e=>{const k=KEYS[e.code];if(k==='l')setFlip(-1,false);else if(k==='r')setFlip(1,false);else if(k==='n')G.in.n=false;});
  $('menu').addEventListener('click',e=>{const b=e.target.closest('button[data-act]');if(b)act(b.dataset.act);});
  $('tools').addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(b)act(b.dataset.k);});
  const zone=(el,side)=>{const ids=new Set(),up=e=>{ids.delete(e.pointerId);if(!ids.size)setFlip(side,false);};
    el.addEventListener('pointerdown',e=>{A.init();ids.add(e.pointerId);setFlip(side,true);e.preventDefault();});el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('pointerleave',up);};
  zone($('tL'),-1);zone($('tR'),1);
  const tn=$('tN'),nup=()=>{G.in.n=false;};tn.addEventListener('pointerdown',e=>{A.init();G.in.n=true;nudge();e.preventDefault();});tn.addEventListener('pointerup',nup);tn.addEventListener('pointercancel',nup);tn.addEventListener('pointerleave',nup);
  const showTouch=()=>{if(UI.touch)return;UI.touch=true;$('touch').hidden=G.mode!=='play';};if(window.matchMedia&&matchMedia('(pointer: coarse)').matches)UI.touch=true;
  addEventListener('pointerdown',e=>{if(e.pointerType==='touch')showTouch();},{passive:true});
  addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&G.mode==='play'&&!G.paused)togglePause();});
  addEventListener('blur',()=>{setFlip(-1,false);setFlip(1,false);G.in.n=false;});
  addEventListener('resize',resize);}
function resize(){const st=$('stage'),w=st.clientWidth||innerWidth,h=st.clientHeight||innerHeight||600,fx=$('fx'),d=Math.min(devicePixelRatio||1,2);
  resize3D(w,h);fx.width=Math.round(w*d);fx.height=Math.round(h*d);UI.fxS=d;}
// floating score text: positioned in the 3D scene, drawn flat on top
const _p={x:0,y:0,ok:false};
function drawFloats(){const cv=$('fx'),c=cv.getContext('2d'),s=UI.fxS||1;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv.width,cv.height);if(!G.floats.length)return;c.setTransform(s,0,0,s,0,0);
  c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
  for(const f of G.floats){project3D(f.x,f.y,30+f.t*46,_p);if(!_p.ok)continue;c.globalAlpha=clamp(1.4-f.t,0,1);c.font='700 '+Math.round(f.size*1.25)+'px '+R.fontL;c.lineWidth=4;c.strokeStyle='rgba(0,0,0,.85)';c.strokeText(f.text,_p.x,_p.y);c.fillStyle=f.color;c.fillText(f.text,_p.x,_p.y);}
  c.globalAlpha=1;}
let lastT=0,acc=0,hudT=0,slowT=0;
function loop(ts){requestAnimationFrame(loop);if(R3.hold){lastT=ts;return;}const raw=(ts-lastT)/1000||0,dt=Math.min(.05,raw);lastT=ts;acc+=dt;let n=0;
  while(acc>=1/120&&n<8){gameStep(1/120);acc-=1/120;n++;}if(n===8)acc=0;
  R3.acc=n===8?0:acc;frame3D(dt);drawFloats();
  if(raw>0&&raw<.5){R3.fps+=(1/raw-R3.fps)*.05;
    // step the detail down by itself if this machine cannot hold a playable frame rate
    if(R3.auto&&!document.hidden&&G.t>4){slowT=R3.fps<38?slowT+raw:Math.max(0,slowT-raw);if(slowT>2.5&&R3.qName!=='low'){slowT=0;R3.fps=60;setQuality(R3.qName==='high'?'medium':'low');popup('Detail lowered','Press Q to change it back','info');}}}
  hudT+=dt;if(hudT>.25){hudT=0;G.dirty=true;}UI.sync();}
// test hook: freeze the loop and advance by hand (used by the headless screenshot and soak scripts)
window.__gb={hold(v){R3.hold=v;},draw(n,dt){R3.acc=0;for(let i=0;i<(n||1);i++)frame3D(dt===undefined?.5:dt);drawFloats();G.dirty=true;UI.sync();},advance(sec,frames){const n=Math.round(sec*120),per=Math.max(1,Math.round(n/(frames||1)));R3.acc=0;for(let i=0;i<n;i++){gameStep(1/120);if(i%per===per-1)frame3D(per/120);}drawFloats();G.dirty=true;UI.sync();}};
function boot(){
  initGame();
  if(!init3D($('gl'))){UI.fatal('This needs WebGL, and the browser would not start it. Try a current Chrome, Edge or Firefox with hardware acceleration turned on.');return;}
  bindInput();resize();startAttract();snapCam();UI.menu('title');requestAnimationFrame(loop);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{try{repaintFloor();paintNames();}catch(e){}});
}
boot();
