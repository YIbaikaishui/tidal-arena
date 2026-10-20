const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForTimeout(2000);
  const r = await p.evaluate(async () => {
    const R = await import('./src/lib/rings.js?x='+Date.now());
    const prof = [{ s: 107.4, y: 7.6 }, { s: 114, y: 7.2 }, { s: 114, y: 6.9 }, { s: 107.4, y: 7.3 }];
    try { const g = R.sweepRing(prof, { uRange: [0.465, 0.535], capEnds: true }); return { ok: true, v: g.attributes.position.count }; }
    catch (e) { return { err: e.message, stack: e.stack.split('\n').slice(0,4) }; }
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
