const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  const r = await p.evaluate(async () => {
    const S = await import('./src/lib/seats.js?x='+Date.now());
    const t0 = S.MODEL.tiers[0];
    const rows = t0.rows.slice(0, 5).map(r => ({ k: r.k, sFront: +r.sFront.toFixed(2), y: +r.y.toFixed(2), perZone: r.perZone }));
    // 取前 6 个实例
    const it = S.seatInstances(S.MODEL);
    const first = [];
    for (let i = 0; i < 6; i++) { const v = it.next().value; first.push({ row: v.row, s: +v.s.toFixed(2), y: +v.y.toFixed(2), u: +v.u.toFixed(4) }); }
    return { rows, first, nrows: t0.rows.length };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
