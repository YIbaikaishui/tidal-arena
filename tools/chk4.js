const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const pg = await b.newPage();
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  const d = await pg.evaluate(() => {
    const A = window.__app.arena;
    const p = A.ents.roof.mesh.geometry.attributes.position;
    const nProf = 6;
    const out = [];
    for (const s of [0, 100, 200, 300]) {
      const row = [];
      for (let i = 0; i < nProf; i++) { const v = s * nProf + i; row.push([+p.getX(v).toFixed(1), +p.getY(v).toFixed(1), +p.getZ(v).toFixed(1)]); }
      out.push([s, row]);
    }
    return out;
  });
  console.log(JSON.stringify(d));
  await b.close();
})();
