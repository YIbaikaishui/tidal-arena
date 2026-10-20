const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForTimeout(1200);
  const r = await p.evaluate(async () => {
    const res = await fetch('./src/scenes/arena.js').then(r=>r.text());
    // 二分：找最短的报错前缀
    const lines = res.split('\n');
    let lo = 1, hi = lines.length, bad = lines.length;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const src = lines.slice(0, mid).join('\n');
      try { new Function(src.replace(/^import[\s\S]*?;$/gm, '').replace(/export /g,'')); lo = mid + 1; }
      catch (e) { bad = mid; hi = mid - 1; }
    }
    return { bad, line: lines[bad-1], n: lines.length };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
