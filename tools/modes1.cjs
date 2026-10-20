const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message));
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 45000 }).catch(()=>{});
  await p.waitForTimeout(1200);
  const set = async (mode) => {
    await p.evaluate((m) => {
      const app = window.__app;
      app.ui.setView('persp'); app.ui.goShot('hero'); app.modes.setSection(false);
      app.modes.setMode(m); app.modes.setExplode(0);
    }, mode);
    await p.waitForTimeout(700);
  };
  for (const m of ['white', 'xray', 'material']) {
    await set(m);
    await p.screenshot({ path: 'shots/w_' + m + '.png' });
  }
  // explode
  await p.evaluate(() => { window.__app.modes.setExplode(1); });
  await p.waitForTimeout(900);
  await p.screenshot({ path: 'shots/w_explode.png' });
  // day + dusk at hero
  await p.evaluate(() => { window.__app.modes.setExplode(0); window.__app.ui.setEnv('day'); });
  await p.waitForTimeout(2200);
  await p.screenshot({ path: 'shots/w_day.png' });
  await p.evaluate(() => window.__app.ui.setEnv('dusk'));
  await p.waitForTimeout(2200);
  await p.screenshot({ path: 'shots/w_dusk.png' });
  console.log('errors', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
