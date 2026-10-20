const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  const r = await p.evaluate(() => {
    const A = window.__app.arena;
    const g = A.groups.seats;
    const inst = g.children[0];
    inst.geometry.computeBoundingBox();
    const bb = inst.geometry.boundingBox;
    return {
      isInstanced: !!inst.isInstancedMesh, count: inst.count, visible: inst.visible,
      parentVisible: g.visible, matColor: '#'+inst.material.color.getHexString(),
      matType: inst.material.type, hasInstColor: !!inst.instanceColor,
      geoBB: { min: bb.min.toArray(), max: bb.max.toArray() },
      hasIdx: !!inst.geometry.index,
      posCount: inst.geometry.attributes.position.count,
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
