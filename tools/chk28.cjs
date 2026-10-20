const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  await p.waitForTimeout(600);
  // 测试：把座椅材质改成不受光的纯色，看是否显示
  await p.evaluate(() => {
    const inst = window.__app.arena.groups.seats.children[0];
    inst.material = new (window.__app.arena.M.seat.constructor)({ color: 0xff4444, roughness: 1 });
  });
  await p.evaluate(() => {
    document.getElementById('hud').style.display='none';
    window.__app.orbit.apply = function(){}; window.__app.orbit.enabled = false;
    window.__app.arena.groups.roof.visible = false;
    const c = window.__app.stage.camera; c.position.set(0, 6, 20); c.lookAt(0, 14, -60);
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'shots/seat_mat_test.png' });
  await b.close();
})();
