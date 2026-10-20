const { chromium } = require('playwright-core');
(async () => {
  const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
  const b = await chromium.launch({ executablePath: CHROME });
  const pg = await b.newPage();
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  const r = await pg.evaluate(() => {
    const A = window.__app.arena;
    const pts = [];
    for (const x of [0, 40, 56, 90, 94]) {
      const g = A.sweepPF([{ x, y: 10 }, { x, y: 10.01 }, { x: x - 0.01, y: 10.01 }], { segs: 32 });
      const p = g.attributes.position;
      pts.push([x, [0, 8].map(s => +Math.hypot(p.getX(s * 3), p.getZ(s * 3)).toFixed(1))]);
    }
    return { pts, OUT: A.OUT, EAVE: A.EAVE };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
