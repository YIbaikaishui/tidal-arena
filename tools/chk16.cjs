const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1400, height: 860 } });
  p.on('pageerror', e => { if (!global.__seen) { global.__seen = 1; console.log(e.stack ? e.stack.split('\n').slice(0,6).join('\n') : e.message); } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForTimeout(3000);
  await b.close();
})();
