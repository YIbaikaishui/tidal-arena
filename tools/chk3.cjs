const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGE', e.message, '|', e.stack ? e.stack.split('\n').slice(0,3).join(' // ') : ''));
  p.on('requestfailed', r => console.log('FAILREQ', r.url()));
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now(), { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(3500);
  console.log('ready', await p.evaluate(()=>window.__ready), 'err', await p.evaluate(()=>window.__bootError));
  await b.close();
})();
