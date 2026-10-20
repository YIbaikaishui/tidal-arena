const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1400, height: 860 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  await p.waitForTimeout(2000);
  console.log('stats', JSON.stringify(await p.evaluate(()=>window.__stats)));
  console.log('cam', await p.evaluate(()=>window.__app.stage.camera.position.toArray().join(',')));
  await p.screenshot({ path: 'shots/s01.png' });
  await b.close();
})();
