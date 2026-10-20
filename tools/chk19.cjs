const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 900, height: 600 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  await p.waitForTimeout(500);
  await p.evaluate(() => window.__app.ui.setEnv('day'));
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => {
    const pr = window.__app.preset;
    return { night: pr.night, sunI: pr.sunI, hemiI: pr.hemiI, exposure: pr.exposure, skyTop: pr.skyTop, floodI: pr.floodI };
  });
  console.log('preset after setEnv(day):', JSON.stringify(r));
  // 看渲染器曝光
  console.log('exposure', await p.evaluate(()=>window.__app.stage.renderer.toneMappingExposure));
  console.log('sun', await p.evaluate(()=>{const s=window.__app.sky; return {sunI:s.sun.intensity, hemiI:s.hemi.intensity, ambI:s.ambient.intensity};}));
  await b.close();
})();
