const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  await p.waitForTimeout(600);
  const info = await p.evaluate(() => {
    const kids = window.__app.arena.groups.seats.children;
    return kids.map(k => ({ name: k.name, count: k.count, hasColor: !!k.instanceColor,
      matColor: '#'+k.material.color.getHexString(), type: k.material.type,
      emissive: '#'+k.material.emissive.getHexString(), visible: k.visible }));
  });
  console.log(JSON.stringify(info, null, 1));
  await p.evaluate(() => {
    document.getElementById('hud').style.display='none';
    window.__app.orbit.apply = function(){}; window.__app.orbit.enabled=false;
    window.__app.arena.groups.roof.visible=false;
    const c = window.__app.stage.camera; c.position.set(0,6,20); c.lookAt(0,14,-60);
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'shots/z_before.png' });
  // 改基本材质
  await p.evaluate(() => {
    const T = window.__app.arena.M.seat.constructor;
    for (const k of window.__app.arena.groups.seats.children) {
      k.material = new (window.__THREE_MB || Object)();
    }
  }).catch(()=>{});
  await b.close();
})();
