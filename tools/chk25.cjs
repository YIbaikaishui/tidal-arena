const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  const r = await p.evaluate(async () => {
    const R = await import('./src/lib/rings.js?x='+Date.now());
    const S = await import('./src/lib/sections.js?x='+Date.now());
    const rr = R.refRing(192);
    const out = [];
    for (const u of [0.0022, 0.0035, 0.25, 0.5]) {
      const fu = u * 192;
      const i0 = Math.floor(fu) % 192, i1 = (i0 + 1) % 192, fr = fu - Math.floor(fu);
      const b0 = rr.pts[i0], b1 = rr.pts[i1];
      let nx = b0.nx + (b1.nx-b0.nx)*fr, nz = b0.nz + (b1.nz-b0.nz)*fr;
      const hx = S.HALF_X + 10.02, hz = S.HALF_Z + 10.02;
      const t = R.boundaryT(hx, hz, hx * S.CORNER_F, nx, nz);
      out.push({ u, t: +t.toFixed(3), pos: [+(nx*t).toFixed(2), +(nz*t).toFixed(2)], b0: [+b0.nx.toFixed(2), +b0.nz.toFixed(2)] });
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
