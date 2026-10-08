/* ================= THE SPELLBOOK =================
   Four abilities per class, one per purpose. Unlocking is the level-up; casting is earned on the table: each purpose
   has a goal on every terrace, and completing it casts the ability for a duration that rides the ball. Unlocked
   abilities all have their goals live at once, so they stack. Recasting a running one extends it to twice its base.
   See DESIGN.md. */
const SLOT_GOAL={breaker:{name:'Breaker',need:1,text:'Complete a bank'},guard:{name:'Guard',need:4,text:'Roll three lanes, then shoot a scoop'},striker:{name:'Striker',need:2,text:'Make two ramps'},pressure:{name:'Pressure',need:20,text:'Two orbits, or twenty spins'}};
const SLOTS_ORDER=['breaker','guard','striker','pressure'];
// up: three upgrade rows. Each has a name, a value per rank (0..3) and how to print it. Row 0 is always Duration.
const dur=(b,step)=>({k:'dur',name:'Duration',v:r=>b+step*r,fmt:v=>v+' s',text:'The spell lasts longer'});
const SPELLS={
  knight:{
    charge:{slot:'breaker',name:'Charge',text:'Every flipper hit sends the ball off as a battering ram: it plows through foes, shatters armor and flattens the drop banks it touches.',
      up:[dur(10,3),{k:'all',name:'Juggernaut',v:r=>r,fmt:v=>v?'Every bank on the level':'The bank it touches',text:'A ram flattens every drop bank on the level'},{k:'stun',name:'Trample',v:r=>r*.6,fmt:v=>v?v.toFixed(1)+' s stagger':'No stagger',text:'Foes the ram plows through are staggered'}]},
    aegis:{slot:'guard',name:'Aegis',text:'A ward returns any lost ball and halves the damage you take.',
      up:[dur(10,3),{k:'dr',name:'Bastion',v:r=>[.5,.4,.3,.2][r],fmt:v=>'Damage x'+v,text:'You take less damage under the ward'},{k:'wave',name:'Rampart',v:r=>r,fmt:v=>v?'Shockwave on return, '+(v*40)+' power':'No shockwave',text:'A returned ball lands with a Shockwave and refills the meter'}]},
    warcry:{slot:'striker',name:'Warcry',text:'Every hit staggers its target, and foes near the ball wind up slower.',
      up:[dur(9,3),{k:'stun',name:'Dread',v:r=>.8+.5*r,fmt:v=>v.toFixed(1)+' s stagger',text:'Staggers last longer'},{k:'crack',name:'Sunder',v:r=>r,fmt:v=>v?'Hits crack '+v+' armor':'No armor cracked',text:'Each hit cracks armor'}]},
    shieldWall:{slot:'pressure',name:'Shield Wall',text:'Strikes against you are blocked and thrown back at the striker. Bumpers barely move the ball.',
      up:[dur(10,3),{k:'ref',name:'Riposte',v:r=>.6+.5*r,fmt:v=>'Reflect x'+v.toFixed(1),text:'Blocked strikes hit back harder'},{k:'stun',name:'Rebuke',v:r=>r*.8,fmt:v=>v?v.toFixed(1)+' s stagger':'No stagger',text:'A blocked striker is staggered'}]}},
  rogue:{
    cloak:{slot:'breaker',name:'Cloak',text:'The ball passes through foes and cuts each one. Nothing can strike it while cloaked.',
      up:[dur(8,3),{k:'gold',name:'Cutpurse',v:r=>r*3,fmt:v=>v?'+'+v+' gold a cut':'No gold',text:'Every cut steals gold'},{k:'crit',name:'Assassin',v:r=>r,fmt:v=>v?'Cuts are crits':'Plain cuts',text:'Every cut is a critical'}]},
    smoke:{slot:'guard',name:'Smoke',text:'Foes lose the ball: no strikes land, wolves do not lunge, wind-ups freeze.',
      up:[dur(8,3),{k:'lost',name:'Vanish',v:r=>r,fmt:v=>v?'Swarms stop in their tracks':'Swarms keep coming',text:'Swarms lose their way too'},{k:'crit',name:'Ambush',v:r=>r*.15,fmt:v=>'+'+Math.round(v*100)+'% crit',text:'More crits from the smoke'}]},
    markedPrey:{slot:'striker',name:'Marked Prey',text:'Every hit is a critical, and the victim stays marked: everything crits it for a while after.',
      up:[dur(9,3),{k:'mark',name:'Hunted',v:r=>8+4*r,fmt:v=>v+' s mark',text:'Marks last longer'},{k:'refund',name:'Bounty',v:r=>r*10,fmt:v=>v?'+'+v+' power a marked kill':'No refund',text:'Killing a marked foe refills the meter'}]},
    knives:{slot:'pressure',name:'Fan of Knives',text:'Blades fan out from the ball every second, wounding the foes they reach.',
      up:[dur(9,3),{k:'n',name:'Volley',v:r=>2+r,fmt:v=>v+' blades',text:'More blades a volley'},{k:'poison',name:'Venom',v:r=>r*2,fmt:v=>v?v+' s poison':'No poison',text:'Blades poison'}]}},
  mage:{
    frostNova:{slot:'breaker',name:'Frost Nova',text:'Freezing pulses from the ball: foes near it freeze mid wind-up and casters fall silent.',
      up:[dur(9,3),{k:'r',name:'Reach',v:r=>140+40*r,fmt:v=>v+' reach',text:'Wider pulses'},{k:'boss',name:'Deep Frost',v:r=>r,fmt:v=>v?'Breaks boss spells':'Foes only',text:'A pulse breaks a boss spell'}]},
    barrier:{slot:'guard',name:'Arcane Barrier',text:'A shield that absorbs strikes, then detonates when it breaks.',
      up:[dur(12,3),{k:'n',name:'Layers',v:r=>3+r,fmt:v=>v+' strikes',text:'The barrier takes more strikes'},{k:'boom',name:'Backlash',v:r=>1+r*.6,fmt:v=>'Blast x'+v.toFixed(1),text:'A bigger blast when it breaks'}]},
    meteor:{slot:'striker',name:'Meteor Shower',text:'Meteors fall around the ball wherever it goes.',
      up:[dur(8,3),{k:'dmg',name:'Impact',v:r=>.9+.4*r,fmt:v=>'Damage x'+v.toFixed(1),text:'Heavier meteors'},{k:'r',name:'Scatter',v:r=>70+20*r,fmt:v=>v+' blast radius',text:'Wider blasts'}]},
    blink:{slot:'pressure',name:'Blink Strike',text:'Lightning arcs from the ball to every foe it passes and chains between them. Bumpers bolt foes.',
      up:[dur(9,3),{k:'chain',name:'Fork',v:r=>1+r,fmt:v=>'Chains to '+v,text:'Lightning forks to more foes'},{k:'boss',name:'Thunderclap',v:r=>r,fmt:v=>v?'Bolts break boss spells':'Foes only',text:'A bolt breaks a boss spell'}]}},
  cleric:{
    consecration:{slot:'breaker',name:'Consecration',text:'The ball lays hallowed ground along its path: foes on it burn, you heal on it, strikes cannot land on it.',
      up:[dur(9,3),{k:'last',name:'Enduring',v:r=>4+2*r,fmt:v=>v+' s ground',text:'The ground lasts longer'},{k:'heal',name:'Grace',v:r=>1.5+r,fmt:v=>v.toFixed(1)+' a tick',text:'Heals faster'}]},
    sanctuary:{slot:'guard',name:'Sanctuary',text:'Curses cannot touch you, the kickback stays lit, and a lost ball returns once.',
      up:[dur(12,3),{k:'heal',name:'Benediction',v:r=>r*15,fmt:v=>v?'Heal '+v+' on cast':'No heal',text:'Heals when cast'},{k:'ret',name:'Vigil',v:r=>1+r,fmt:v=>v+' returns',text:'More lost balls returned'}]},
    judgement:{slot:'striker',name:'Judgement',text:'Every bumper, target and sling calls holy fire on the nearest foe. The boss takes holy damage on every hit.',
      up:[dur(9,3),{k:'chain',name:'Wrath',v:r=>1+r,fmt:v=>v+' foes a hit',text:'Holy fire reaches more foes'},{k:'boss',name:'Verdict',v:r=>.5+.5*r,fmt:v=>'Boss x'+v.toFixed(1),text:'More holy damage to the boss'}]},
    radiance:{slot:'pressure',name:'Radiance',text:'The aura widens: every foe it touches burns, and every hit heals you.',
      up:[dur(9,3),{k:'undead',name:'Purge',v:r=>1+r,fmt:v=>'Undead x'+v,text:'The undead burn harder'},{k:'cleanse',name:'Absolve',v:r=>r,fmt:v=>v?'Heals lift curses':'Heals only',text:'Every heal lifts a curse'}]}}
};
for(const cls in SPELLS)for(const id in SPELLS[cls]){SPELLS[cls][id].id=id;SPELLS[cls][id].cls=cls;}
const spellOf=(cls,slot)=>{const S=SPELLS[cls];for(const id in S)if(S[id].slot===slot)return S[id];return null;};
const spellDef=id=>{for(const cls in SPELLS)if(SPELLS[cls][id])return SPELLS[cls][id];return null;};
function bookOf(r){return r.book||(r.book={});}
function spellRank(id){const b=bookOf(G.run)[id];return b?b.dur+b.a+b.b:-1;} // -1 locked, 0 unlocked
function spellVal(id,k){const d=spellDef(id),b=bookOf(G.run)[id]||{dur:0,a:0,b:0};if(!d)return 0;const row=d.up.find(u=>u.k===k)||d.up[0],rank=k==='dur'?b.dur:(d.up[1].k===k?b.a:b.b);return row.v(rank);}
function spellOn(id){return G.casts.some(c=>c.id===id&&c.t>0);}
function spellCast(id){return G.casts.find(c=>c.id===id);}
function unlockSpell(id){const b=bookOf(G.run);if(!b[id])b[id]={dur:0,a:0,b:0};G.run.goal=G.run.goal||{};relight();G.dirty=true;}
function levelSpell(id,k){const d=spellDef(id),b=bookOf(G.run)[id];if(!b)return;if(k==='dur')b.dur++;else if(d.up[1].k===k)b.a++;else b.b++;G.dirty=true;}
// goals: progress per purpose; the class's ability for that purpose casts when the goal is met
function spellProg(slot,n,x,y){const r=G.run;if(!r||G.inGrave)return;const d=spellOf(r.cls,slot);if(!d||spellRank(d.id)<0)return;const goal=r.goal||(r.goal={}),need=SLOT_GOAL[slot].need;
  if(slot==='guard'&&n>=4){if((goal[slot]||0)<3)return;}else if(slot==='guard'&&(goal[slot]||0)>=3)return;
  goal[slot]=Math.min(need,(goal[slot]||0)+n);G.dirty=true;
  if(goal[slot]>=need){goal[slot]=0;castSpell(d.id,focusBall());}else if(x!==undefined)float(x,y-40,d.name.toUpperCase()+' '+goalText(slot),CLASSES[r.cls].glow,11);relight();}
function goalText(slot){const g=G.run.goal||{},v=g[slot]||0,need=SLOT_GOAL[slot].need;if(slot==='guard')return v>=3?'shoot a scoop':v+'/3 lanes';if(slot==='pressure')return Math.floor(v/10)+'/2 orbits';return v+'/'+need;}
function castSpell(id,b){const r=G.run,d=spellDef(id),base=spellVal(id,'dur'),c=spellCast(id);
  if(c){c.t=Math.min(base*2,c.t+base);c.max=Math.max(c.max,c.t);float(b?b.x:320,b?b.y-50:TY[2]+500,d.name.toUpperCase()+' EXTENDED',CLASSES[r.cls].glow,14);A.s('ward');return;}
  // a spell is a flare in the dark: if the level is quiet, it draws them out
  {const t=b?b.tier:G.focusTier;if(t<3&&foesOn(t)<3)callFoes(t,campFoes(3),'THEY FEEL IT',b?b.x:320,b?b.y:TY[2]+500);}
  const cast={id,t:base,max:base,tick:0,hits:0};G.casts.push(cast);const F=SPELL_FX[id];if(F&&F.start)F.start(cast,b);
  popup(d.name,d.text,'good');A.s('ability');G.flash=.35;G.flashC=CLASSES[r.cls].glow;G.cam.shake=Math.max(G.cam.shake,5);relight();G.dirty=true;}
function endCast(c){const F=SPELL_FX[c.id];if(F&&F.end)F.end(c);G.casts=G.casts.filter(x=>x!==c);relight();G.dirty=true;}
function updateSpells(dt){if(!G.run)return;const hero=heroBall();for(const c of G.casts.slice()){c.t-=dt;c.tick-=dt;const F=SPELL_FX[c.id];if(F&&F.tick)F.tick(c,dt,hero);if(c.t<=0)endCast(c);}}
// helpers the effects share
const nearFoes=(x,y,r,tier,n)=>G.enemies.filter(e=>!e.dead&&e.spawn<=0&&e.tier===tier&&Math.hypot(e.x-x,e.y-y)<r+e.r).sort((p,q)=>Math.hypot(p.x-x,p.y-y)-Math.hypot(q.x-x,q.y-y)).slice(0,n||99);
const bossNear=(x,y,r,tier)=>{const bo=G.boss;return bo&&bo.alive&&bo.rise<=0&&bo.tier===tier&&bo.phase!=='shield'&&Math.hypot(bo.x-x,bo.y-y)<r+bo.r?bo:null;};
const SPELL_FX={
  meteor:{tick(c,dt,b){if(c.tick>0||!b)return;c.tick=.9;const m=G.mods,rr=spellVal('meteor','r'),k=spellVal('meteor','dmg'),a=rand(TAU),d=rand(20,90),x=clamp(b.x+Math.cos(a)*d,30,610),y=clamp(b.y+Math.sin(a)*d,TY[b.tier]+40,TY[b.tier]+880);
    G.booms.push({x,y,r:rr,t:0,c:'#ff8a3a'});burst(x,y,14,'#ffb050',300,.7);A.s('slam');G.cam.shake=Math.max(G.cam.shake,3);
    for(const e of nearFoes(x,y,rr,b.tier)){e.armor=0;damageEnemy(e,m.pow*1.2*k,false);}const bo=bossNear(x,y,rr,b.tier);if(bo)hitBoss(bo,m.pow*1.2*k,false);}},
  knives:{tick(c,dt,b){if(c.tick>0||!b)return;c.tick=1;const m=G.mods,n=spellVal('knives','n'),ps=spellVal('knives','poison');
    for(const e of nearFoes(b.x,b.y,230,b.tier,n)){bolt(b,e);if(ps)e.poison=ps;damageEnemy(e,m.pow*.6,false);}const bo=bossNear(b.x,b.y,230,b.tier);if(bo){bolt(b,bo);hitBoss(bo,m.pow*.6,false);}}},
  frostNova:{tick(c,dt,b){if(c.tick>0||!b)return;c.tick=1.2;const rr=spellVal('frostNova','r');G.booms.push({x:b.x,y:b.y,r:rr,t:0,c:'#9fe8ff'});A.s('ward');
    for(const e of nearFoes(b.x,b.y,rr,b.tier)){e.wind=0;e.stun=Math.max(e.stun,1);e.lungeCd=Math.max(e.lungeCd||0,1.2);if(e.def.cast)e.castT=Math.max(e.castT,e.def.cast*.5);damageEnemy(e,G.mods.pow*.25,false);}
    const bo=G.boss;if(bo&&bo.alive&&bo.tier===b.tier&&spellVal('frostNova','boss')&&bo.phase==='cast'&&Math.hypot(bo.x-b.x,bo.y-b.y)<rr+bo.r)interruptBoss(bo);}},
  blink:{tick(c,dt,b){if(c.tick>0||!b)return;c.tick=.5;const m=G.mods,chain=spellVal('blink','chain');const first=nearFoes(b.x,b.y,120,b.tier,1)[0];if(!first)return;
    let from=b,e=first,done=[];for(let k=0;k<=chain&&e;k++){bolt(from,e);damageEnemy(e,m.pow*.5,false);done.push(e);from=e;e=nearFoes(e.x,e.y,180,b.tier).find(q=>!done.includes(q));}}},
  consecration:{tick(c,dt,b){if(c.tick>0||!b)return;c.tick=.7;if(G.zones.some(z=>!z.fire&&!z.pyre&&Math.hypot(z.x-b.x,z.y-b.y)<40))return;G.zones.push({x:b.x,y:b.y,r:60,t:spellVal('consecration','last'),tick:0,trail:true});}},
  barrier:{start(c){c.hits=spellVal('barrier','n');},end(c){if(c.broke)return;}},
  charge:{tick(c,dt,b){if(b&&b.st==='live'&&!b.pow&&!b.arm)b.arm=9;}},
  sanctuary:{start(c){c.ret=spellVal('sanctuary','ret');const h=spellVal('sanctuary','heal');if(h)heal(h);G.run.kickback=true;G.curse={};relight();},tick(c){G.curse={};G.run.kickback=true;}},
  aegis:{start(c){G.buffs.aegisK=spellVal('aegis','dr');},tick(c){G.buffs.aegisK=spellVal('aegis','dr');},end(c){delete G.buffs.aegisK;}}
};
function heroBall(){let f=null;for(const b of G.balls)if(b.hero&&b.st==='live'){if(!f||b.y>f.y)f=b;}return f;}
function heroBalls(){return G.balls.filter(b=>!b.party);}

/* ---------- Rally: three bars cradled, the party comes out ---------- */
const RALLY_T=20;
function rally(){const r=G.run,h=heroBall()||focusBall();if(!h)return;r.charge=0;const party=(r.party||[]).filter(c=>c.hp>0);
  if(!party.length&&!(r.recruits&&r.recruits.length)){popup('No One Answers','You ride alone. Nothing comes to the call','info');A.s('deny');return;}
  const T0=RALLY_T*(G.mods.twin?2:1);let n=0;const spawn=()=>{const a=rand(TAU),b=newBall(h.x+Math.cos(a)*30,h.y-20,h.vx*.5+rand(-200,200),Math.min(h.vy,0)-rand(200,400));b.life=T0;b.noHole=1e9;b.noMouth=0;G.balls.push(b);n++;return b;};
  for(const c of party){const d=COMPANIONS[c.id],b=spawn();b.party=d.role;b.pc=ROLES[d.role].col;if(d.role==='tank'){b.r=12.5;b.kx=.6;}else if(d.role==='dps'){b.r=10;b.kx=1.05;}burst(b.x,b.y,16,b.pc,320,.8);}
  for(const q of r.recruits||[]){const cc=CLASSES[q.cls],b=spawn();b.party='recruit';b.cls=q.cls;b.pc=cc.color;b.pg=cc.glow;b.r=cc.r;b.kx=cc.kx;armRecruit(b,q.spell,T0);burst(b.x,b.y,16,cc.glow,320,.8);}
  G.save=Math.max(G.save,3);G.rallyT=T0;popup('Rally','The party comes out for '+T0+' seconds. Keep your own ball alive','good');A.s('multiball');G.flash=.5;G.flashC='#ffe9b0';G.cam.shake=Math.max(G.cam.shake,10);G.dirty=true;}
function endRally(why){const had=G.balls.some(b=>b.party);G.balls=G.balls.filter(b=>{if(b.party){burst(b.x,b.y,10,'#ffe9b0',200,.6);return false;}return true;});G.rallyT=0;if(had)popup('The Party Withdraws',why||'The rally is over','info');G.dirty=true;}
function updateRally(dt){if(!G.balls.some(b=>b.party)){G.rallyT=0;return;}G.rallyT=Math.max(0,(G.rallyT||0)-dt);let gone=false;
  const hero=heroBall();
  for(const b of G.balls)if(b.party){b.life-=dt;if(b.life<=0||b.st!=='live'&&b.st!=='rail'){b.gone=true;gone=true;}
    else if(b.cast){b.cast.t-=dt;b.cast.tick-=dt;const F=SPELL_FX[b.spell];if(F&&F.tick)F.tick(b.cast,dt,b);
      if(b.spell==='radiance'){b.tk=(b.tk||0)-dt;if(b.tk<=0){b.tk=.5;for(const e of nearFoes(b.x,b.y,170,b.tier))damageEnemy(e,G.mods.pow*.2,false);}}}}
  if(gone)G.balls=G.balls.filter(b=>{if(b.gone&&b.party){burst(b.x,b.y,10,'#ffe9b0',200,.6);
      if(b.party==='recruit'&&b.st==='live'&&hero&&RECRUIT_RETURNS.includes(b.spell)&&!b.returned&&b.life>0){const nb=newBall(hero.x+rand(-30,30),hero.y-20,rand(-200,200),-rand(200,400));Object.assign(nb,{party:'recruit',cls:b.cls,pc:b.pc,pg:b.pg,r:b.r,kx:b.kx,life:b.life,noHole:1e9,returned:true});armRecruit(nb,b.spell,b.life);later(.05,()=>G.balls.push(nb));float(hero.x,hero.y-40,CLASSES[b.cls].name.toUpperCase()+' RETURNS',b.pg,13);}
      return false;}return true;});
  if(!G.balls.some(b=>b.party))endRally('Their time is up');}

/* ---------- the level-up: four cards, Unlock or Level Up ---------- */
function bookChoice(){const r=G.run,cls=CLASSES[r.cls];
  const opts=SLOTS_ORDER.map(sl=>{const d=spellOf(r.cls,sl),rk=spellRank(d.id),full=rk>=0&&['dur','a','b'].every(k=>bookOf(r)[d.id][k]>=3);
    return {name:d.name,desc:d.text+' '+SLOT_GOAL[sl].name+': '+SLOT_GOAL[sl].text.toLowerCase()+'.',tag:rk<0?'Unlock':full?'Rank '+(rk+1)+' · full':'Rank '+(rk+1)+' · Level up',key:rk<0,
      act:()=>{if(rk<0){unlockSpell(d.id);popup(d.name+' Unlocked',SLOT_GOAL[sl].text+' to cast it','good');return;}if(full){A.s('deny');return 'stay';}G.bookUp=d.id;openChoice('bookUp');return 'stay';}};});
  if(opts.every(o=>/full/.test(o.tag))){G.pending.unshift('perk');return bookDone();} // nothing left to learn: a boon instead
  return {kind:'book',title:'Level '+r.level,sub:'Your spellbook. Unlock an ability, or level one up',opts};}
function bookDone(){return {kind:'book',title:'The Spellbook Is Full',sub:'Nothing left to learn. A boon instead',opts:[{name:'Onward',desc:'Take a boon in its place.',tag:'',act:()=>{}}]};}
function bookUpChoice(id){const r=G.run,d=spellDef(id),b=bookOf(r)[id];
  const opts=d.up.map((u,i)=>{const key=i===0?'dur':i===1?'a':'b',rk=b[key],cur=u.v(rk),nxt=u.v(Math.min(3,rk+1)),full=rk>=3;
    return {name:u.name,desc:u.text+'. '+(full?u.fmt(cur)+', the most it can be':u.fmt(cur)+' \u2192 '+u.fmt(nxt)),tag:full?'Full':'Rank '+rk+' \u2192 '+(rk+1),
      act:()=>{if(full){A.s('deny');return 'stay';}levelSpell(id,u.k);popup(d.name+' '+(spellRank(id)+1),u.name+': '+u.fmt(nxt),'good');}};});
  opts.push({name:'Back',desc:'Choose a different ability.',tag:'',act:()=>{openChoice('book');return 'stay';}});
  return {kind:'bookUp',title:d.name,sub:'Level it up',opts};}
function holyFire(x,y,tier){const m=G.mods,n=spellVal('judgement','chain');for(const e of nearFoes(x,y,260,tier,n)){bolt({x,y},e);damageEnemy(e,m.pow*.6,false);}}

/* ---------- the Tavern: balls for hire ----------
   Three random recruits a visit: a class and one of its four abilities, with a price. A recruit rides with you for
   the run and comes out in every Rally as a ball of its class with that ability running. */
const RECRUIT_MAX=6,RECRUIT_RETURNS=['aegis','sanctuary','barrier','smoke']; // the guard abilities bring a drained recruit back once
function recruitCost(){return 40+15*((G.run.recruits||[]).length);}
function tavernOpen(){const r=G.run;return !!(r&&r.recruits&&r.recruits.length<RECRUIT_MAX&&r.gold>=recruitCost());}
function drawTavern(n){const out=[],seen=new Set();let guard=0;while(out.length<n&&guard++<60){const cls=pick(Object.keys(CLASSES)),ids=Object.keys(SPELLS[cls]),spell=pick(ids),k=cls+':'+spell;if(seen.has(k))continue;seen.add(k);out.push({cls,spell});}return out;}
function tavernChoice(){const r=G.run,cost=recruitCost();
  const opts=r.tavern.map(q=>{const cc=CLASSES[q.cls],sp=spellDef(q.spell);return {name:sp.name,desc:sp.text,tag:cc.name+' \u00b7 '+cost+' gold',cost,orb:[cc.color,cc.glow],face:[q.cls,q.spell],
    act:()=>{r.recruits.push({cls:q.cls,spell:q.spell});r.tavern=r.tavern.filter(x=>x!==q);popup('A '+cc.name+' Joins You',sp.name+' rides out with the next Rally','good');A.s('questDone');G.dirty=true;}};});
  return {kind:'tavern',title:'The Drowned Lantern',sub:'Balls for hire. '+r.gold+' gold in your purse, '+(RECRUIT_MAX-r.recruits.length)+' seats in the band',opts:opts.concat([{name:'Leave',desc:'Keep your coin and get back to it.',tag:'',act:()=>{}}])};}
function armRecruit(b,spell,T0){b.spell=spell;b.cast={id:spell,t:T0,max:T0,tick:0,hits:0};if(spell==='cloak')b.phased=true;if(spell==='shieldWall'||spell==='charge'){b.kx=.6;}if(spell==='charge')b.arm=9;}

// a portrait for the hiring board: the ball as the person, a hooded figure in the class colour, the ability's colour on the hood
function portrait(cls,spell){const key=cls+':'+spell;portrait.cache=portrait.cache||{};if(portrait.cache[key])return portrait.cache[key];
  const cl=CLASSES[cls],d=spellDef(spell),col=d?{breaker:'#ffb050',guard:'#9fe8ff',striker:'#ff6a6a',pressure:'#c9a6ff'}[d.slot]:cl.glow,cv=mkCanvas(96,112),c=cv.getContext('2d');
  let g=c.createRadialGradient(48,56,8,48,56,64);g.addColorStop(0,'#2a2838');g.addColorStop(1,'#0a0a12');c.fillStyle=g;c.fillRect(0,0,96,112);
  c.fillStyle=col;c.globalAlpha=.16;c.beginPath();c.arc(48,54,40,0,TAU);c.fill();c.globalAlpha=1;
  g=c.createLinearGradient(0,40,0,112);g.addColorStop(0,'#3a3850');g.addColorStop(1,'#1a1926');c.fillStyle=g;c.beginPath();c.moveTo(10,112);c.quadraticCurveTo(14,66,48,62);c.quadraticCurveTo(82,66,86,112);c.closePath();c.fill();
  c.fillStyle='#2c2a40';c.beginPath();c.moveTo(22,70);c.quadraticCurveTo(26,18,48,16);c.quadraticCurveTo(70,18,74,70);c.quadraticCurveTo(48,58,22,70);c.closePath();c.fill();
  c.strokeStyle=col;c.lineWidth=1.5;c.globalAlpha=.75;c.beginPath();c.moveTo(24,70);c.quadraticCurveTo(28,22,48,20);c.quadraticCurveTo(68,22,72,70);c.stroke();c.globalAlpha=1;
  g=c.createRadialGradient(48,46,4,48,46,34);g.addColorStop(0,cl.glow);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.globalAlpha=.6;c.fillRect(8,8,80,80);c.globalAlpha=1;
  const sp=R.spr['ball_'+cls];if(sp){c.drawImage(sp,16,14,64,64);c.globalCompositeOperation='lighter';c.globalAlpha=.35;c.drawImage(sp,16,14,64,64);c.globalCompositeOperation='source-over';c.globalAlpha=1;}
  c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=2;c.strokeRect(1,1,94,110);return portrait.cache[key]=cv.toDataURL();}
