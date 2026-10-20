const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  await p.waitForTimeout(800);
  // 只留屋盖
  const info = await p.evaluate(() => {
    const A = window.__app.arena;
    const out = {};
    for (const k of Object.keys(A.groups)) {
      const g = A.groups[k];
      let tris = 0, meshes = 0;
      g.traverse(o => { if (o.isMesh && o.geometry) { meshes++; tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } });
      out[k] = { meshes, tris: Math.round(tris) };
    }
    return out;
  });
  console.log(JSON.stringify(info));
  await p.evaluate(() => { const A = window.__app.arena; for (const k of Object.keys(A.groups)) A.groups[k].visible = (k === 'roof'); window.__app.env.root.visible = false; });
  await p.evaluate(() => { const o = window.__app.orbit; o.set({ target: new THREE.Vector3? null : null }); });
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'shots/d_roof.png' });
  await b.close();
})();
