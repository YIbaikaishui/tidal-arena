const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  await p.waitForTimeout(700);
  await p.evaluate(() => {
    document.getElementById('hud').style.display='none';
    window.__app.orbit.apply = function(){};   // 冻结 orbit
    window.__app.orbit.enabled = false;
  });
  const cams = [
    ['in_a', [0, 3.5, 30], [0, 0.5, -40]],     // 场地内北望
    ['in_b', [0, 6, -34], [0, 12, 40]],        // 场地内南望看台
    ['in_c', [34, 26, 0], [0, 6, 0]],          // 东侧看台俯视
    ['in_d', [0, 44, 0], [0, 0, 30]],          // 屋盖下俯视全场
  ];
  for (const [n, pos, tgt] of cams) {
    await p.evaluate(([pos,tgt]) => {
      const c = window.__app.stage.camera;
      c.position.set(...pos); c.lookAt(...tgt); c.updateProjectionMatrix();
    }, [pos, tgt]);
    await p.waitForTimeout(350);
    await p.screenshot({ path: 'shots/' + n + '.png' });
  }
  await b.close();
})();
