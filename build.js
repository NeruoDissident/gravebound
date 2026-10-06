// Assembles dist/gravebound-3d.html from the 2D game's engine (table + physics + art + audio, taken verbatim)
// plus the 3D renderer, the free-play test rules and the page shell.
const fs = require('fs'), path = require('path');
const root = __dirname, rd = f => fs.readFileSync(path.join(root, f), 'utf8');

const src2d = rd('src/gravebound-dev-2d.html');
function between(a, b) {
  const i = src2d.indexOf(a), j = src2d.indexOf(b, i + 1);
  if (i < 0 || j < 0) throw new Error('marker not found: ' + (i < 0 ? a : b));
  return src2d.slice(i, j);
}
const engine = [
  between('/* ================= UTIL', '/* ================= RPG DATA'),       // util, table, physics
  "const R={glows:{},fontD:'\"Grenze Gotisch\",\"Old English Text MT\",Georgia,serif',fontL:'Cinzel,\"Trajan Pro\",Georgia,serif'};\n",
  between('const PAL=[', 'function drawFloor(c){'),                             // palettes + playfield art painters
  between('/* ================= AUDIO', '/* ================= UI, INPUT, LOOP') // synthesized audio
].join('\n');
fs.writeFileSync(path.join(root, 'src/engine.gen.js'), engine);

const guard = "if(typeof THREE==='undefined'){document.getElementById('menu').innerHTML='<div class=\"pane\"><p class=\"err\">The 3D library did not load. Check the connection and reload the page.</p></div>';throw new Error('three.js did not load');}";
const js = ["'use strict';", guard, engine, rd('src/rules.js'), rd('src/art3d.js'), rd('src/render3d.js'), rd('src/ui.js')].join('\n');
const page = rd('src/page.html').replace('/*__JS__*/', () => js);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/gravebound-3d.html'), page);

// standalone copy: one file with the libraries inlined, opens straight from disk
const three = n => fs.readFileSync(path.join(root, 'node_modules/three', n), 'utf8').replace(/<\/script/gi, '<\\/script');
const alone = page
  .replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', () => '<script>' + three('build/three.min.js') + '</script>')
  .replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.128\.0\/(examples\/js\/[^"]+)"><\/script>/g, (m, f) => '<script>' + three(f) + '</script>');
if (/<script src=/.test(alone)) throw new Error('standalone still has external scripts');
fs.writeFileSync(path.join(root, 'dist/gravebound-3d-standalone.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body>\n' + alone + '\n</body></html>');

// headless bundle for the node soak test: engine + rules only
fs.writeFileSync(path.join(root, 'test/sim.gen.js'), ["'use strict';", engine, rd('src/rules.js'), 'module.exports={G,T,A,TY,FY,H,HW,GY,tierOf,gameStep,startPlay,startAttract,setFlip,nudge,jumpTo,addTestBall,CLASSES};'].join('\n'));
console.log('built', (page.length / 1024).toFixed(1) + ' KB');
