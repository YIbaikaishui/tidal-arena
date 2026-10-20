const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 900, height: 600 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const fx = window.__app.fx;
    const u = fx.compose.uniforms;
    return { exposure: u.exposure.value, vignette: u.vignette.value, grain: u.grain.value, ca: u.ca.value,
             bloomStr: fx.bloom.strength, bloomThr: fx.bloom.threshold, bloomEnabled: fx.bloom.enabled,
             passes: fx.composer.passes.map(x=>x.constructor.name) };
  });
  console.log(JSON.stringify(r, null, 1));
  // 关掉所有 pass 直接看裸渲染
  await p.evaluate(() => { const fx = window.__app.fx; fx.composer.passes.forEach((x,i)=>{ if(i>0) x.enabled=false; }); });
  await p.waitForTimeout(400);
  await p.evaluate(() => { document.getElementById('hud').style.display='none'; });
  await p.screenshot({ path: 'shots/raw_render.png' });
  await b.close();
})();
