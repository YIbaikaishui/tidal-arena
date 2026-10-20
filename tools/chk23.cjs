const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 900, height: 600 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  const r = await p.evaluate(() => {
    const A = window.__app.arena;
    const inst = A.groups.seats.children[0];
    // 取前 3 个实例矩阵的世界坐标
    const m = new window.__app.stage.scene.constructor().constructor; // dummy
    const out = [];
    const mat4 = inst.instanceMatrix.array;
    for (let i = 0; i < 3; i++) {
      out.push([mat4[i*16+12], mat4[i*16+13], mat4[i*16+14]].map(v=>+v.toFixed(2)));
    }
    // 检查 instanceColor 前几个
    const ic = inst.instanceColor ? Array.from(inst.instanceColor.array.slice(0,9)).map(v=>+v.toFixed(2)) : null;
    return { poses: out, colors: ic, count: inst.count, matVis: inst.material.visible,
             matSide: inst.material.side, matOpacity: inst.material.opacity, transparent: inst.material.transparent,
             renderOrder: inst.renderOrder, layers: inst.layers.mask, geoGroups: inst.geometry.groups.length };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
