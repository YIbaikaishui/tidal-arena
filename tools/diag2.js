const { chromium } = require('playwright-core');
(async () => {
  const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
  const b = await chromium.launch({ executablePath: CHROME, args:['--use-gl=angle','--use-angle=d3d11'] });
  const pg = await b.newPage({ viewport: { width: 1000, height: 640 } });
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 120000 });
  await pg.waitForTimeout(800);
  // hide UI for debug
  await pg.evaluate(()=>{ document.querySelectorAll('.hud, #hud').forEach(e=>e.style.display='none'); });
  await pg.evaluate(()=>{ const A=window.__app, S=A.stage;
    S.renderer.info.autoReset=false; S.renderer.info.reset(); S.renderer.render(S.scene,S.camera);
    console.log('x');
  });
  const info = await pg.evaluate(()=>{ const S=window.__app.stage; return {calls:S.renderer.info.render.calls, tris:S.renderer.info.render.triangles}; });
  console.log('RAW', JSON.stringify(info));
  await pg.screenshot({ path: 'shots/d-raw.png' });
  // 材质 A/B：把 concrete 材质提亮
  await pg.evaluate(()=>{ const A=window.__app.arena; A.root.traverse(o=>{ if(o.material){ [].concat(o.material).forEach(m=>{ if(m.map) m.map=null; if(m.isMeshStandardMaterial){m.roughness=0.6;m.metalness=0.0;} }); } }); });
  await pg.waitForTimeout(600);
  await pg.screenshot({ path: 'shots/d-nomap.png' });
  await b.close();
})();
