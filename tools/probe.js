const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const pg = await b.newPage();
  pg.on('console', m => { const t = m.text(); if (t.startsWith('DBG')) console.log(t); });
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  await pg.evaluate(() => {
    const A = window.__app.arena;
    const p0 = A.pathForL(A.LofX(0.5)).sample(0);
    const pA = A.pathForL(A.LofX(10)).sample(0);
    const pB = A.pathForL(A.LofX(10)).sample(0.25);
    console.log('DBG p0', p0.x, p0.z, p0.nx, p0.nz);
    console.log('DBG pA', pA.x, pA.z, pA.nx, pA.nz);
    console.log('DBG pB', pB.x, pB.z, pB.nx, pB.nz);
    const r0 = Math.hypot(p0.x, p0.z), n0 = Math.hypot(p0.nx, p0.nz);
    console.log('DBG k', (p0.x * p0.nx + p0.z * p0.nz) / (r0 * n0));
  });
  await b.close();
})();
