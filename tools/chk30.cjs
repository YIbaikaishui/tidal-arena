const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  await p.waitForTimeout(600);
  await p.evaluate(() => {
    document.getElementById('hud').style.display='none';
    window.__app.orbit.apply = function(){}; window.__app.orbit.enabled=false;
    window.__app.arena.groups.roof.visible=false;
    const c = window.__app.stage.camera; c.position.set(0,6,20); c.lookAt(0,14,-60);
  });
  await p.waitForTimeout(300);
  // 用 MeshBasicMaterial 纯白替换座椅，确认哪些像素是座椅
  const r = await p.evaluate(async () => {
    const THREE = await import('./vendor/build/three.module.js');
    let n = 0;
    for (const k of window.__app.arena.groups.seats.children) {
      k.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      n++;
    }
    return { meshes: n, kids: window.__app.arena.groups.seats.children.map(x=>x.name+':'+x.count) };
  });
  console.log(JSON.stringify(r));
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'shots/z_red.png' });
  await b.close();
})();
