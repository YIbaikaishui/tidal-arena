const { chromium } = require('playwright-core');
(async () => {
  const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
  const b = await chromium.launch({ executablePath: CHROME, args:['--use-gl=angle','--use-angle=d3d11','--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 900, height: 620 } });
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 120000 });
  const r = await pg.evaluate(() => {
    const A = window.__app.arena, S = window.__app.stage;
    const info = S.renderer.info;
    const out = { ents: {}, seatTotal: A.seatTotal };
    for (const k in A.ents) {
      const e = A.ents[k];
      if (!e) continue;
      const o = e.mesh || (e.group || e);
      let tris = 0, meshes = 0;
      o.traverse ? o.traverse(c => { if (c.isMesh && c.geometry) { meshes++; const g=c.geometry; tris += (g.index? g.index.count : g.attributes.position.count)/3 * (c.count||1); } }) : 0;
      out.ents[k] = { meshes, tris: Math.round(tris), visible: !!o.visible };
    }
    out.info = { calls: info.render.calls, tris: info.render.triangles, programs: info.programs ? info.programs.length : -1, tex: info.memory.textures, geo: info.memory.geometries };
    out.keys = Object.keys(A);
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
