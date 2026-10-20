const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 45000 }).catch(()=>{});
  await p.waitForTimeout(900);
  await p.evaluate(async () => {
    const THREE = await import('./vendor/build/three.module.js');
    document.getElementById('hud').style.display = 'none';
    window.__app.ui.setView('section');
    window.__app.modes.setSection(true, new THREE.Vector3(0,0,-1), 0);
  });
  await p.waitForTimeout(800);
  await p.screenshot({ path: 'shots/sec_clean.png' });
  await b.close();
})();
