const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    document.getElementById('hud').style.display='none';
    window.__app.orbit.apply = function(){}; window.__app.orbit.enabled = false;
    window.__app.arena.groups.roof.visible = false;
  });
  // 高角度俯视看台
  const cams = [
    ['s_top', [0, 240, 1], [0, 0, 0]],
    ['s_obl', [0, 95, 130], [0, 12, 20]],
    ['s_tier', [0, 55, 60], [0, 12, -20]],
  ];
  for (const [n, pos, tgt] of cams) {
    await p.evaluate(([pos,tgt]) => { const c = window.__app.stage.camera; c.position.set(...pos); c.lookAt(...tgt); c.updateProjectionMatrix(); }, [pos, tgt]);
    await p.waitForTimeout(400);
    await p.screenshot({ path: 'shots/' + n + '.png' });
  }
  await b.close();
})();
