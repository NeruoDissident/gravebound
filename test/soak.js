// Headless soak: the bot plays the free-play rules for a while; we check nothing strands and every level is reached.
const S=require('./sim.gen.js');const {G,T,TY,H,HW,GY,tierOf}=S;
global.document=undefined;
const init=require('vm');
// initGame is not exported; rebuild through startAttract after building the table once
const src=require('fs').readFileSync(__dirname+'/sim.gen.js','utf8').replace(/module\.exports=.*$/,'initGame();module.exports={G,T,gameStep,startAttract,jumpTo,addTestBall,openGrave,tierOf,H,HW,GY,TY,serve};');
const m={exports:{}};new Function('module','exports','require',src)(m,m.exports,require);const X=m.exports;
X.startAttract();
const tierT=[0,0,0,0];let nan=0,maxBalls=0,emptyT=0,states={};
const mins=+process.argv[2]||10;
for(let i=0;i<mins*60*120;i++){X.gameStep(1/120);
  if(i%(120*45)===0&&i>0){const k=(i/(120*45))%5;if(k===1)X.jumpTo(0);else if(k===2)X.jumpTo(1);else if(k===3){X.openGrave(true);}else if(k===4)X.addTestBall();}
  for(const b of X.G.balls){if(!isFinite(b.x)||!isFinite(b.y))nan++;states[b.st]=(states[b.st]||0)+1;tierT[X.tierOf(b.y)]++;}
  maxBalls=Math.max(maxBalls,X.G.balls.length);if(!X.G.balls.length)emptyT++;}
console.log('minutes',mins,'score',X.G.run.score,'tier seconds',tierT.map(v=>Math.round(v/120)),'nan',nan,'maxBalls',maxBalls,'no-ball seconds',Math.round(emptyT/120));
console.log('states',states,'stuck events',X.G.stuck.length,X.G.stuck.slice(-8).join(' | '));
console.log('ramps',X.G.run.ramps,'served',X.G.run.balls,'inGrave',X.G.inGrave);
