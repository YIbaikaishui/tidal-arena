const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 45000 }).catch(()=>{});
  await p.waitForTimeout(1000);
  await p.evaluate(() => { window.__app.ui.goShot('hero'); window.__app.ui.setEnv('day'); });
  for (const t of [1000, 3000, 6000]) {
    await p.waitForTimeout(t);
    const st = await p.evaluate(() => {
      const pr = window.__app.corePreset || null;
      return { night: pr ? +pr.night.toFixed(3) : null, sunI: pr ? +pr.sunI.toFixed(2) : null,
               exposure: pr ? +pr.exposure.toFixed(2) : null, envTarget: window.__app.ui.S.env };
    });
    console.log(t, JSON.stringify(st));
  }
  await p.screenshot({ path: 'shots/w_day_long.png' });
  await b.close();
})();
