const { chromium } = require('playwright-core');
(async () => {
  const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
  const b = await chromium.launch({ executablePath: CHROME });
  const pg = await b.newPage();
  pg.on('pageerror', e => console.log('PAGEERR', e.message));
  pg.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForTimeout(15000);
  const st = await pg.evaluate(() => ({ ready: !!window.__ready, step: document.getElementById('loadStep') ? document.getElementById('loadStep').textContent : null }));
  console.log(JSON.stringify(st));
  await b.close();
})();
