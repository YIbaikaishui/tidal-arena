const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage();
  p.on('console', m => console.log('C:', m.text()));
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => {
    const S = await import('./src/lib/sections.js?x='+Date.now());
    const R = await import('./src/lib/rings.js?x='+Date.now());
    const G = S.GEO;
    const log = [];
    for (const u of [0.0, 0.25, 0.5, 0.75]) {
      const prof = [{ s: G.outerS + 0.4, y: 7.6 }, { s: G.outerS + 7.0, y: 7.2 }, { s: G.outerS + 7.0, y: 6.9 }, { s: G.outerS + 0.4, y: 7.3 }];
      try { R.sweepRing(prof, { uRange: [u - 0.035, u + 0.035], capEnds: true }); log.push(u + ' ok'); }
      catch (e) { log.push(u + ' FAIL ' + e.message); }
    }
    return { log, outerS: G.outerS, segs: S.SEGS };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
