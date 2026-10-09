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
// the hosted site (dist/, see vercel.json) is an installable PWA: the standalone page plus a manifest, icons and a
// service worker that keeps the whole game playable offline once it has loaded
const pwaHead = '<meta name="theme-color" content="#07070b"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Gravebound"><meta name="application-name" content="Gravebound"><meta name="description" content="A dark-fantasy RPG pinball table. Flippers, nudge, and a hero ball."><link rel="manifest" href="manifest.webmanifest"><link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png">';
const swReg = "<script>if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));</script>";
const site = standalone.replace('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">', '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">' + pwaHead).replace('</body></html>', swReg + '</body></html>');
fs.writeFileSync(path.join(root, 'dist/index.html'), site);
fs.mkdirSync(path.join(root, 'dist/icons'), { recursive: true });
for (const f of fs.readdirSync(path.join(root, 'assets/icons'))) fs.copyFileSync(path.join(root, 'assets/icons', f), path.join(root, 'dist/icons', f));
fs.writeFileSync(path.join(root, 'dist/manifest.webmanifest'), JSON.stringify({
  name: 'Gravebound Pinball', short_name: 'Gravebound', description: 'A dark-fantasy RPG pinball table.', id: './', start_url: './', scope: './',
  display: 'fullscreen', display_override: ['fullscreen', 'standalone'], orientation: 'any', background_color: '#07070b', theme_color: '#07070b', categories: ['games'],
  icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }]
}, null, 2));
const ver = require('crypto').createHash('sha1').update(site).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(root, 'dist/sw.js'), `// Gravebound service worker, build ${ver}. The game is one file, so it caches that, the icons and the fonts.
const CACHE='gravebound-${ver}',CORE=['./','index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png','icons/favicon-32.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('gravebound-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  // the page itself: network first so a new build shows up, the cache when offline
  if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put('index.html',cp));return res;}).catch(()=>caches.match('index.html')));return;}
  // everything else (icons, Google Fonts): cache first, filled as it is fetched
  if(u.origin===location.origin||/fonts\\.(googleapis|gstatic)\\.com$/.test(u.hostname))e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok||res.type==='opaque'){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}return res;})));});
`);
console.log('built', (page('').length / 1024).toFixed(1) + ' KB');
