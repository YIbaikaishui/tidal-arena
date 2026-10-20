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
    const i0 = P.findIndex(p => p.k === 'tierBase' && p.x > 69.5);
    let i1 = i0;
    for (let i = i0; i < P.length; i++) if (P[i].k === 't2Tread' && P[i].y > 29) { i1 = i; break; }
    const bb = A.ents.tier2.mesh.geometry.boundingBox || (A.ents.tier2.mesh.geometry.computeBoundingBox(), A.ents.tier2.mesh.geometry.boundingBox);
    return { i0, i1, pt0: [P[i0].k, P[i0].x, P[i0].y], pt1: [P[i1].k, P[i1].x, P[i1].y], bb: [bb.min.toArray(), bb.max.toArray()] };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
