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
    window.__app.arena.groups.glow.visible = false;   // 关掉 LED 以看清座椅
  });
  const cams = [
    ['seat_close', [0, 8.5, -60], [0, 12, -76]],   // 近距离看下层看台
    ['seat_mid', [0, 14, -30], [0, 20, -80]],
    ['seat_wide', [0, 20, 10], [0, 24, -90]],
  ];
  for (const [n, pos, tgt] of cams) {
    await p.evaluate(([pos,tgt]) => { const c = window.__app.stage.camera; c.position.set(...pos); c.lookAt(...tgt); }, [pos, tgt]);
    await p.waitForTimeout(350);
    await p.screenshot({ path: 'shots/' + n + '.png' });
  }
  await b.close();
})();
