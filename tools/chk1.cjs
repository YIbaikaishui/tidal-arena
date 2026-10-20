const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe', args: ['--use-gl=angle','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 860 } });
  const errs = [];
  p.on('console', m => { if (m.type()==='error') errs.push('ERR '+m.text()); });
  p.on('pageerror', e => errs.push('PAGE '+e.message));
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now(), { waitUntil:'domcontentloaded' });
  try { await p.waitForFunction('window.__ready===true', { timeout: 45000 }); } catch(e){ console.log('NOT READY'); }
  await p.waitForTimeout(2500);
  console.log('bootError:', await p.evaluate(() => window.__bootError||null));
  console.log('stats:', JSON.stringify(await p.evaluate(() => window.__stats||null)));
  console.log('errors:', errs.slice(0,12).join('\n'));
  await p.screenshot({ path: 'shots/n01.png' });
  await b.close();
})();
