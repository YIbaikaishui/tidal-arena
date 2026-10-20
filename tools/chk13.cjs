const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForTimeout(2000);
  const r = await p.evaluate(async () => {
    const R = await import('./src/lib/rings.js?x='+Date.now());
    const rr = R.refRing(192);
    return { n: rr.pts.length, counts: rr.counts, sample: rr.pts.slice(188).map(q=>[q.x,q.z]) };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
