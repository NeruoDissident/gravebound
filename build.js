// Builds dist/gravebound-3d.html: the 2D game's own script (table, physics, rules, quests, audio, menus) with its
// canvas renderer cut out and the 3D renderer put in its place. Every edit to the 2D script is a checked
// find-and-replace, so if the 2D source changes shape the build stops instead of quietly shipping a broken game.
const fs = require('fs'), path = require('path');
const root = __dirname, rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const src = rd('src/gravebound-dev-2d.html');
const cut = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + a.length); if (i < 0 || j < 0) throw new Error('marker not found: ' + (i < 0 ? a : b)); return [i, j]; };
const between = (a, b) => { const [i, j] = cut(src, a, b); return src.slice(i, j); };
function swap(s, a, b, n) { const c = s.split(a).length - 1; if (c !== (n || 1)) throw new Error('expected ' + (n || 1) + ' of: ' + a.slice(0, 70) + ' (found ' + c + ')'); return s.split(a).join(b); }
function drop(s, a, b) { const [i, j] = cut(s, a, b); return s.slice(0, i) + s.slice(j); }

/* ---------- script ---------- */
let js = src.slice(src.indexOf("'use strict';"), src.lastIndexOf('</script>'));
js = drop(js, 'function drawFloor(c){', '/* ---------- sprites ---------- */');       // floor compositor
js = drop(js, '/* ---------- frame ---------- */', '/* ================= AUDIO');          // 2D frame painter
js = js.slice(0, js.indexOf('function resize(){'));                                        // resize, loop, boot are ours
js = swap(js, "'gravebound.'+k", "'gravebound3d.'+k", 3);                                  // own save slot
js = swap(js, "VERSION='Dev build 1.1'", "VERSION='3D build 0.2'");
js = swap(js, "G.cam.top=Math.min(0,36-$('hud').offsetHeight*R.dpr/R.scale);", 'G.cam.top=0;');
// view, detail and full-screen keys; dev keys
js = swap(js, "Space:'n',ArrowDown:'n',ArrowUp:'u',KeyP:'p',Escape:'p'};", "Space:'n',ArrowDown:'n',ArrowUp:'u',KeyP:'p',Escape:'p',KeyC:'cam',KeyQ:'qual',KeyF:'full',Backquote:'dev',Digit1:'d1',Digit2:'d2',Digit3:'d3',Digit4:'d4',KeyG:'dg',KeyB:'db',KeyN:'dn'};");
js = swap(js, "else if(k==='n'||k==='u'){G.in.n=true;nudge();}else if(k==='p')togglePause();});", "else if(k==='n'||k==='u'){G.in.n=true;nudge();}else if(k==='p')togglePause();else gfxKey(k);});");
// options and controls menus learn about the 3D settings
js = swap(js, "<nav>'+btn('erase','Erase saved run and scores')", "<nav>'+btn('gfxCam','View: '+CAMS[R3.camMode].name)+btn('gfxQual','Detail: '+(R3.q?R3.q.label:''))+btn('erase','Erase saved run and scores')");
js = swap(js, "    case 'choose':choose(+el.dataset.i);break;", "    case 'choose':choose(+el.dataset.i);break;\n    case 'gfxCam':case 'gfxQual':{gfxKey(a==='gfxCam'?'cam':'qual');UI.menu('options');const b=$('menu').querySelector('[data-act='+a+']');if(b)b.focus({preventScroll:true});break;}");
js = swap(js, '<dt>Pause</dt><dd>P or Esc</dd>', '<dt>Pause</dt><dd>P or Esc</dd><dt>View, detail, full screen</dt><dd>C, Q and F</dd>');
js = swap(js, "sc.push({id:UI.lastId,name,score:r.score,", "sc.push({id:UI.lastId,name:name+(r.dev?' *':''),score:r.score,");
const guard = "if(typeof THREE==='undefined'){document.getElementById('menu').innerHTML='<div class=\"pane\"><p class=\"lead\">The 3D library did not load. Check the connection and reload the page.</p></div>';throw new Error('three.js did not load');}";
js = js.replace("'use strict';", () => "'use strict';\n" + guard) + '\n' + [rd('src/art3d.js'), rd('src/render3d.js'), rd('src/actors3d.js'), rd('src/game3d.js')].join('\n');

/* ---------- page ---------- */
const css2d = (() => { const k = src.indexOf('/* layout: one tall stone table'), i = src.lastIndexOf('<style>', k), j = src.indexOf('</style>', k); return src.slice(i + 7, j); })();
let body = between('<div id="app">', '<script>');
body = swap(body, '<canvas id="cv"></canvas>', '<canvas id="gl"></canvas><canvas id="fx"></canvas>');
body = swap(body, '<div id="menu"></div>', '<div id="gfx" hidden><span class="chip" id="gDev" hidden>Dev keys on</span><span class="chip" id="gInfo"></span></div>\n    <div id="menu"></div>');
const libs = ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'].concat(['shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js', 'postprocessing/ShaderPass.js', 'postprocessing/UnrealBloomPass.js'].map(f => 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/' + f));
const head = '<title>Gravebound Pinball 3D</title>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Grenze+Gotisch:wght@500;700&family=Spectral:ital,wght@0,400;0,600;1,400&display=swap">\n';
const page = lib => head + '<style>' + css2d + rd('src/page3d.css') + '</style>\n' + body + lib + '\n<script>\n' + js + '\n</script>\n';
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/gravebound-3d.html'), page(libs.map(u => '<script src="' + u + '"></script>').join('\n')));

// standalone copy: one file with the libraries inlined, opens straight from disk
const three = n => fs.readFileSync(path.join(root, 'node_modules/three', n), 'utf8').replace(/<\/script/gi, '<\\/script');
const inl = libs.map(u => '<script>' + three(u.includes('cdnjs') ? 'build/three.min.js' : u.split('three@0.128.0/')[1]) + '</script>').join('\n');
fs.writeFileSync(path.join(root, 'dist/gravebound-3d-standalone.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body>\n' + page(inl) + '\n</body></html>');
console.log('built', (page('').length / 1024).toFixed(1) + ' KB');
