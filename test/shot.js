// Renders the built page in headless Chromium (CDN scripts served from node_modules) and takes screenshots.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const skeleton = b => '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box}body{margin:0;padding:0;font:14px sans-serif;background:#faf9f5;color:#141413}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>' + b + '</body></html>';
(async () => {
  const args = process.argv.slice(2), W = +(args[0] || 1600), Hh = +(args[1] || 900), script = args[2] || 'basic', tag = args[3] || '';
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: W, height: Hh }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' | ')));
  await page.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')) return route.fulfill({ path: path.join(root, 'node_modules/three/build/three.min.js'), contentType: 'application/javascript' });
    const m = u.match(/^https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.128\.0\/(examples\/js\/.+)$/);
    if (m) return route.fulfill({ path: path.join(root, 'node_modules/three', m[1]), contentType: 'application/javascript' });
    if (u.startsWith('http://local.test/')) return route.fulfill({ body: skeleton(fs.readFileSync(path.join(root, 'dist/gravebound-3d.html'), 'utf8')), contentType: 'text/html' });
    return route.abort();
  });
  await page.goto('http://local.test/');
  await page.waitForFunction(() => (typeof R3 !== 'undefined' && R3.ready) || document.querySelector('.err'), null, { timeout: 150000, polling: 400 }).catch(() => {});
  await page.waitForTimeout(400);
  fs.mkdirSync(path.join(root, 'test/out'), { recursive: true });
  const ok = await page.evaluate(() => { try { if (!R3.ready) return 'not ready: ' + document.getElementById('menu').innerText; __gb.hold(true); return 'ok'; } catch (e) { return 'ERR ' + e.message; } });
  console.log('boot:', ok, '|', logs.slice(0, 12).join(' || '));
  const shot = async n => { await page.screenshot({ path: path.join(root, 'test', 'out', (tag ? tag + '-' : '') + n + '.png'), timeout: 120000 }); };
  const adv = async (sec, frames) => page.evaluate(([s, f]) => { const t0 = performance.now(); __gb.advance(s, f); return Math.round(performance.now() - t0); }, [sec, frames || 2]);
  const info = async () => page.evaluate(() => ({ q: R3.qName, post: R3.postOn, noMsaa: !!R3.noMsaa, noPost: !!R3.noPost, tris: R3.rn.info.render.triangles, calls: R3.rn.info.render.calls, tier: G.focusTier, mode: G.mode, balls: G.balls.length })).catch(e => ({ err: e.message }));
  const q = process.env.Q; if (q) await page.evaluate(q => setQuality(q, true), q);
  if (script === 'basic') {
    console.log('frame ms', await adv(.5, 3)); await shot('01-title'); console.log(JSON.stringify(await info()));
    await page.evaluate(() => act('play')); await adv(3, 6); await shot('02-hollow');
    await page.evaluate(() => { jumpTo(1); }); await adv(3, 8); await shot('03-wilds');
    await page.evaluate(() => { jumpTo(0); }); await adv(3, 8); await shot('04-keep');
    await page.evaluate(() => { jumpTo(3); }); await adv(3.5, 8); await shot('05-grave');
    await page.evaluate(() => { jumpTo(2); R3.camMode = 1; }); await adv(2.5, 8); await shot('06-chase');
    await page.evaluate(() => { R3.camMode = 2; }); await adv(2.5, 8); await shot('07-overhead');
    console.log(JSON.stringify(await info()));
  } else {
    await page.evaluate(() => act('play')); await adv(.3, 1);
    const steps = JSON.parse(fs.readFileSync(script, 'utf8'));
    for (const st of steps) { if (st.eval) console.log('eval:', JSON.stringify(await page.evaluate(st.eval).catch(e => 'ERR ' + e.message))); if (st.adv) await adv(st.adv, st.frames || 6); if (st.shot) await shot(st.shot); }
    console.log(JSON.stringify(await info()));
  }
  console.log(logs.slice(0, 25).join('\n') || 'no console errors');
  await browser.close();
})();
