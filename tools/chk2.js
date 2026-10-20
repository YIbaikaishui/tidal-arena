const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const pg = await b.newPage();
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  const d = await pg.evaluate(() => {
    const A = window.__app.arena;
    const g = A.ents.roof.mesh.geometry;
    const p = g.attributes.position, nrm = g.attributes.normal, idx = g.index;
    const rows = [];
    for (let t = 0; t < idx.count; t += 3 * 400 * 3) {} // noop
    // 打印每个剖面段的平均几何法向与顶点法向
    const nProf = 6;
    for (let i = 0; i < nProf; i++) {
      const j = (i + 1) % nProf;
      let gy = 0, vy = 0, cnt = 0;
      for (let s = 0; s < 400; s += 20) {
        const a0 = s * nProf, a1 = (s + 1) * nProf;
        // 找到对应三角形索引（前 nProf*6 per seg）
        const base = s * nProf * 6 + i * 6;
        const a = idx.getX(base), bb = idx.getX(base + 1), c = idx.getX(base + 2);
        const ax=p.getX(a),ay=p.getY(a),az=p.getZ(a),bx=p.getX(bb),by=p.getY(bb),bz=p.getZ(bb),cx=p.getX(c),cy=p.getY(c),cz=p.getZ(c);
        const ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-ax,vy2=cy-ay,vz=cz-az;
        const nx=uy*vz-uz*vy2, ny=uz*vx-ux*vz, nz=ux*vy2-uy*vx;
        gy += ny; vy += nrm.getY(a); cnt++;
      }
      rows.push([i, +(gy/cnt).toFixed(3), +(vy/cnt).toFixed(3)]);
    }
    return rows;
  });
  console.log(JSON.stringify(d));
  await b.close();
})();
