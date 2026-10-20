const { chromium } = require('playwright-core');
(async () => {
  const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
  const b = await chromium.launch({ executablePath: CHROME });
  const pg = await b.newPage();
  pg.on('pageerror', e => console.log('PAGEERR', e.message));
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  const r = await pg.evaluate(() => {
    const A = window.__app.arena;
    const pts = [];
    for (const x of [0, 40, 90]) {
      // 用 sweepPF 造一条水平线，观察半径
      const g = A.sweepPF([{ x, y: 10 }, { x, y: 10.01 }], { segs: 32 });
      const p = g.attributes.position;
      pts.push([x, [0, 8, 16, 24].map(s => +Math.hypot(p.getX(s * 2), p.getZ(s * 2)).toFixed(1))]);
    }
    return pts;
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
