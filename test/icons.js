// Renders assets/logo.svg into the PNG icons the PWA ships (run after changing the logo; the PNGs are committed).
const { chromium } = require('playwright');const fs=require('fs'),path=require('path');const root=path.join(__dirname,'..');
(async()=>{const br=await chromium.launch();const pg=await br.newPage();const svg=fs.readFileSync(path.join(root,'assets/logo.svg'),'utf8');
  const out=[['icon-192.png',192,1],['icon-512.png',512,1],['apple-touch-icon.png',180,1],['maskable-512.png',512,.8],['favicon-32.png',32,1]];
  for(const [name,px,scale] of out){await pg.setViewportSize({width:px,height:px});
    await pg.setContent('<html><body style="margin:0;background:#06050a;display:grid;place-items:center;width:'+px+'px;height:'+px+'px;overflow:hidden"><div style="width:'+Math.round(px*scale)+'px;height:'+Math.round(px*scale)+'px">'+svg.replace('<svg ','<svg width="100%" height="100%" ')+'</div></body></html>');
    await pg.screenshot({path:path.join(root,'assets/icons',name),omitBackground:false});console.log(name);}
  await br.close();})();
