const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const pg = await b.newPage();
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  const d = await pg.evaluate(() => {
    const P = window.__app.arena.pathForL;
    const rows = [];
    for (const L of [47.6, 73.8, 56.5, 66.2, 60]) {
      const pth = P(L);
      const smp = [];
      for (const u of [0, 0.125, 0.25, 0.5]) { const s = pth.sample(u); smp.push([+s.x.toFixed(1), +s.z.toFixed(1), +s.nx.toFixed(2), +s.nz.toFixed(2)]); }
      rows.push([L, smp, +pth.total.toFixed(1)]);
    }
    return rows;
  });
  console.log(JSON.stringify(d));
  await b.close();
})();
