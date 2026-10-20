const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const pg = await b.newPage({ viewport: { width: 900, height: 620 } });
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  const d = await pg.evaluate(() => {
    const A = window.__app.arena;
    const dg = A.ents.roof.mesh.geometry;
    const p = dg.attributes.position, nrm = dg.attributes.normal, idx = dg.index;
    const out = { verts: p.count, tris: idx.count / 3 };
    // 统计塌陷三角形与反向法向
    let degen = 0, flip = 0;
    for (let t = 0; t < idx.count; t += 3) {
      const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2);
      const ax = p.getX(a), ay = p.getY(a), az = p.getZ(a);
      const bx = p.getX(b), by = p.getY(b), bz = p.getZ(b);
      const cx = p.getX(c), cy = p.getY(c), cz = p.getZ(c);
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const L = Math.hypot(nx, ny, nz);
      if (L < 1e-6) degen++;
      else if (ny < 0) flip++;
    }
    out.degen = degen; out.flip = flip;
    return out;
  });
  console.log(JSON.stringify(d));
  await b.close();
})();
