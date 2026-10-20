const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  await p.waitForTimeout(700);
  await p.evaluate(() => { document.getElementById('hud').style.display='none'; });
  // 直接摆相机位置：站在场地端线后 20m、高 12m，看向对面看台
  await p.evaluate(() => {
    const c = window.__app.stage.camera, o = window.__app.orbit;
    o.set({ dist: 9999999, az: 0, el: 0, snap: true });
    c.position.set(0, 12, 74);
    c.lookAt(0, 10, 0);
  });
  await p.waitForTimeout(300);
  // orbit.update 每帧都会覆盖，需临时停掉
  await p.evaluate(() => { window.__app.orbit.enabled = false; window.__app.orbit.apply = function(){}; });
  await p.waitForTimeout(400);
  await p.evaluate(() => { const c = window.__app.stage.camera; c.position.set(0, 12, 74); c.lookAt(0,10,0); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'shots/in2_pitch.png' });
  await p.evaluate(() => { const c = window.__app.stage.camera; c.position.set(90, 30, 96); c.lookAt(0,8,0); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'shots/in2_corner.png' });
  await b.close();
})();
