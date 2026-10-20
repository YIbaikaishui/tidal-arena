const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  const r = await p.evaluate(async () => {
    const S = await import('./src/lib/sections.js?x='+Date.now());
    const A = window.__app.arena;
    const g = A.groups.roof.children.filter(o=>o.isMesh).map(o => ({ name:o.name, tris:(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3 }));
    return { GEO: { RI: S.GEO.roofInnerS, RY: S.GEO.roofInnerY, RS: S.GEO.roofRidgeS, RO: S.GEO.roofOuterS }, meshes: g };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
