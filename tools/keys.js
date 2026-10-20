const { chromium } = require('playwright-core');
(async () => {
  const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
  const b = await chromium.launch({ executablePath: CHROME });
  const pg = await b.newPage();
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  const r = await pg.evaluate(() => {
    const S = window.__app.arena.S;
    return S.pts.map((p, i) => [i, p.k, +p.x.toFixed(1), +p.y.toFixed(2)]).filter(r => !r[1] || r[1] !== 'walk');
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
