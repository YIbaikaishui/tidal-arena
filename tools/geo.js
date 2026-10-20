/* 几何自检：检查屋盖/看台核心几何的高度分布与法向一致性 */
const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=d3d11'] });
  const page = await browser.newPage({ viewport: { width: 600, height: 400 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  const r = await page.evaluate(() => {
    const A = window.__app.arena;
    const out = {};
    for (const id of ['roof', 'core', 'tier1', 'tier2', 'facadeUpper', 'facadeBase', 'cornice']) {
      const e = A.ents[id]; if (!e || !e.mesh) { out[id] = 'missing'; continue; }
      const g = e.mesh.geometry;
      const p = g.attributes.position, nr = g.attributes.normal;
      let minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
      const hist = {};
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i), x = p.getX(i), z = p.getZ(i);
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
        if (id === 'roof') { const b = Math.round(y); hist[b] = (hist[b] || 0) + 1; }
      }
      // 法向向上比例（屋面应绝大多数朝上）
      let up = 0;
      for (let i = 0; i < nr.count; i++) if (nr.getY(i) > 0.5) up++;
      out[id] = {
        verts: p.count, bbox: [minX, minY, minZ, maxX, maxY, maxZ].map(v => +v.toFixed(1)),
        normalUpPct: +(up / nr.count * 100).toFixed(1),
        hist: id === 'roof' ? Object.entries(hist).sort((a, b) => a[0] - b[0]).slice(0, 8) : undefined,
      };
    }
    out.seatTotal = A.seatTotal;
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
