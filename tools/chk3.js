const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const pg = await b.newPage({ viewport: { width: 900, height: 620 } });
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  const d = await pg.evaluate(() => {
    const A = window.__app.arena;
    // 重新建一个只含屋盖的独立场景不好做，改为打印顶面顶点在平面上是否单调（检查自交）
    const g = A.ents.roof.mesh.geometry;
    const p = g.attributes.position;
    const nProf = 6, segs = 400;
    const ring = [];
    for (let s = 0; s < segs; s += 20) {
      const i = s * nProf + 2; // 屋顶平台点
      const j = s * nProf + 0;
      ring.push([+p.getX(i).toFixed(1), +p.getZ(i).toFixed(1), +p.getY(i).toFixed(1)]);
    }
    return ring;
  });
  console.log(JSON.stringify(d));
  await b.close();
})();
