const { chromium } = require('playwright-core');
(async () => {
  const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
  const b = await chromium.launch({ executablePath: CHROME });
  const pg = await b.newPage();
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  const r = await pg.evaluate(() => {
    const A = window.__app.arena;
    // 直接用 sweepPF 复现一个 mini 剖面（两个 x 值），看半径
    const g = A.sweepPF([{ x: 90, y: 20 }, { x: 90, y: 19 }, { x: 40, y: 19 }, { x: 40, y: 20 }], { segs: 16 });
    const p = g.attributes.position;
    const rows = [];
    for (let s = 0; s <= 16; s += 4) rows.push([s, +p.getX(s * 4).toFixed(1), +p.getZ(s * 4).toFixed(1)]);
    return rows;
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
