const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args:['--use-gl=angle','--use-angle=d3d11'] });
  const pg = await b.newPage({ viewport: { width: 900, height: 620 } });
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  const info = await pg.evaluate(() => {
    const A = window.__app.arena;
    const out = [];
    const g = A.ents.roof.mesh.geometry;
    const p = g.attributes.position, nrm = g.attributes.normal;
    // 取最后一段剖面（屋面顶部平台段）的顶点：剖面点数 profN
    for (const segs of [400]) { out.push('verts=' + p.count); }
    const profN = (() => { // 尝试从 indices 推断
      const idx = g.index.array; // 每段 n*6
      return Math.round(idx.length / (400 * 6));
    })();
    out.push('profN=' + profN);
    const rows = [];
    for (let s = 0; s <= 400; s += 40) {
      const i = s * profN;
      rows.push([s, +p.getX(i).toFixed(1), +p.getY(i).toFixed(1), +p.getZ(i).toFixed(1)]);
    }
    return { out, rows, total: p.count };
  });
  console.log(JSON.stringify(info));
  // 分步隐藏：先隐藏 soffit/core，看屋盖顶部是否仍破碎
  const a = await pg.evaluate(() => {
    document.querySelectorAll('.hud,#help,#vault,#loader,#hint,#toast,#probe').forEach(e => e.style.display = 'none');
    const A = window.__app.arena;
    for (const id in A.ents) if (!['roof'].includes(id)) A.ents[id].mesh.visible = false;
    const o = window.__app.orbit;
    o.tTarget.set(0,20,0); o.target.set(0,20,0); o.tDist=430; o.dist=430; o.tAz=0; o.az=0; o.tElv=1.5; o.elv=1.5; o.apply();
    return 'ok';
  });
  await pg.waitForTimeout(500);
  await pg.screenshot({ path: 'shots/roof-only.png' });
  await b.close();
})();
