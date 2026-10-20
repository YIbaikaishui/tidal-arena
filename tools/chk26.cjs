const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  const r = await p.evaluate(async () => {
    const S = await import('./src/lib/seats.js?x='+Date.now());
    const it = S.seatInstances(S.MODEL);
    const us = [];
    for (let i = 0; i < 200; i++) { const v = it.next().value; if (i % 20 === 0) us.push({ i, u: +v.u.toFixed(5), row: v.row, zone: v.zone }); }
    return us;
  });
  console.log(JSON.stringify(r));
  // 实际矩阵分布
  const m = await p.evaluate(() => {
    const inst = window.__app.arena.groups.seats.children[0];
    const a = inst.instanceMatrix.array;
    const pts = [];
    for (const i of [0, 36, 100, 360, 800, 5000, 40000]) pts.push([a[i*16+12], a[i*16+13], a[i*16+14]].map(v=>+v.toFixed(1)));
    return pts;
  });
  console.log('matrices:', JSON.stringify(m));
  await b.close();
})();
