const { chromium } = require('playwright-core');
(async () => {
  const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
  const b = await chromium.launch({ executablePath: CHROME });
  const pg = await b.newPage();
  pg.on('pageerror', e => console.log('PAGEERR', e.message));
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  const r = await pg.evaluate(() => {
    const A = window.__app.arena, P = A.S.pts;
    const i0 = P.findIndex(p => p.k === 'tierBase' && p.y > 15 && p.y < 17.5);
    return { i0, pts: P.slice(i0 - 1, i0 + 3).map(p => [p.k, +p.x.toFixed(1), +p.y.toFixed(2)]) };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
