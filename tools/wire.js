const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const pg = await b.newPage({ viewport: { width: 900, height: 620 } });
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  await pg.evaluate(() => {
    document.querySelectorAll('.hud,#help,#vault,#loader,#hint,#toast,#probe').forEach(e => e.style.display = 'none');
    const A = window.__app.arena;
    for (const id in A.ents) if (id !== 'roof') A.ents[id].mesh.visible = false;
    const m = A.ents.roof.mesh.material; m.wireframe = true; m.color.set(0x111111); m.metalness = 0; m.roughness = 1;
    const o = window.__app.orbit;
    o.tTarget.set(0,20,0); o.target.set(0,20,0); o.tDist=340; o.dist=340; o.tAz=0; o.az=0; o.tElv=1.5; o.elv=1.5; o.apply();
  });
  await pg.waitForTimeout(600);
  await pg.screenshot({ path: 'shots/wire-roof.png' });
  await b.close();
})();
