// Builds dist/gravebound-3d.html (the published page body, Three.js from a CDN) and
// dist/gravebound-3d-standalone.html (one file with the library inlined), plus dist/index.html, a copy of the
// standalone file for web hosting.
const fs = require('fs'), path = require('path');
const root = __dirname, rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const SOURCES = ['src/game.js', 'src/spells.js', 'src/help.js', 'src/art3d.js', 'src/render3d.js', 'src/wing3d.js', 'src/foes3d.js', 'src/actors3d.js', 'src/game3d.js'];
const guard = "if(typeof THREE==='undefined'){document.getElementById('menu').innerHTML='<div class=\"pane\"><p class=\"lead\">The 3D library did not load. Check the connection and reload the page.</p></div>';throw new Error('three.js did not load');}";
const js = ["'use strict';", guard].concat(SOURCES.map(rd)).join('\n');
try { new Function(js); } catch (e) { throw new Error('script does not parse: ' + e.message); }
const libs = ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'].concat(['shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'postprocessing/EffectComposer.js', 'postprocessing/RenderPass.js', 'postprocessing/ShaderPass.js', 'postprocessing/UnrealBloomPass.js'].map(f => 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/' + f));
const head = '<title>Gravebound Pinball 3D</title>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Grenze+Gotisch:wght@500;700&family=Spectral:ital,wght@0,400;0,600;1,400&display=swap">\n';
const page = lib => head + '<style>\n' + rd('src/page.css') + '</style>\n' + rd('src/page-body.html') + lib + '\n<script>\n' + js + '\n</script>\n';
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/gravebound-3d.html'), page(libs.map(u => '<script src="' + u + '"></script>').join('\n')));
const three = n => fs.readFileSync(path.join(root, 'node_modules/three', n), 'utf8').replace(/<\/script/gi, '<\\/script');
const inl = libs.map(u => '<script>' + three(u.includes('cdnjs') ? 'build/three.min.js' : u.split('three@0.128.0/')[1]) + '</script>').join('\n');
const standalone = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body>\n' + page(inl) + '\n</body></html>';
fs.writeFileSync(path.join(root, 'dist/gravebound-3d-standalone.html'), standalone);
fs.writeFileSync(path.join(root, 'dist/index.html'), standalone); // what a web host serves at the site root (see vercel.json)
console.log('built', (page('').length / 1024).toFixed(1) + ' KB');
