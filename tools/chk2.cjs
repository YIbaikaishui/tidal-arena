const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGE', e.message, '\n', (e.stack||'').split('\n').slice(0,4).join('\n')));
  p.on('response', r => { if (r.status()>=400) console.log('HTTP', r.status(), r.url()); });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now(), { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(4000);
  await b.close();
})();
