const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 45000 }).catch(()=>{});
  await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    try { window.__app.ui.setView('plan'); }
    catch (e) { return 'THROW: ' + e.message + ' | ' + e.stack.split('\n')[1]; }
    const on = [...document.querySelectorAll('#gridView button')].filter(b=>b.classList.contains('on')).map(b=>b.dataset.view);
    const roof = window.__app.arena.groups.roof.visible;
    return { active: on, roofVisible: roof, cam: window.__app.stage.camera.type };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
