const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 900, height: 600 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  const r = await p.evaluate(() => {
    const A = window.__app.arena;
    // 找 bowl 组里最大的 meshes，检查其包围盒
    return A.groups.bowl.children.filter(o=>o.isMesh).map(o => {
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox;
      return { mat: o.material.color && '#'+o.material.color.getHexString(), tris: o.geometry.index? o.geometry.index.count/3 : 0,
        min: [bb.min.x|0, bb.min.y|0, bb.min.z|0], max: [bb.max.x|0, bb.max.y|0, bb.max.z|0] };
    });
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
