const { chromium } = require('playwright');const path=require('path');
(async()=>{const br=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const pg=await br.newPage({viewport:{width:900,height:520}});const logs=[];pg.on('pageerror',e=>logs.push('PAGEERROR '+e.message));pg.on('console',m=>{if(m.type()==='error')logs.push(m.text());});
await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
await pg.goto('file://'+path.join(__dirname,'../dist/gravebound-3d-standalone.html'));
await pg.waitForFunction(()=>typeof R3!=='undefined'&&R3.ready,null,{timeout:150000,polling:500}).catch(e=>console.log('WAIT FAIL',logs.join(' | ')));
console.log(await pg.evaluate(()=>{__gb.hold(true);setQuality('low',true);UI.menu(null);startRun('rogue');__gb.advance(2,2);return JSON.stringify({three:THREE.REVISION,composer:!!THREE.EffectComposer,bloom:!!THREE.UnrealBloomPass,mode:G.mode,balls:G.balls.length,title:document.title});}));
await pg.screenshot({path:path.join(__dirname,'out/standalone.png'),timeout:120000});console.log(logs.filter(l=>!/ERR_FAILED/.test(l)).join('\n')||'no errors');await br.close();})();
