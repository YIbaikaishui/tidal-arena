const { chromium } = require('playwright-core');
(async () => {
  const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
  const b = await chromium.launch({ executablePath: CHROME, args:['--use-gl=angle','--use-angle=d3d11'] });
  const pg = await b.newPage({ viewport: { width: 1400, height: 860 } });
  pg.on('pageerror', e=>console.log('ERR',e.message));
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 120000 });
  await pg.waitForTimeout(800);
  // 采样信息
  await pg.evaluate(()=>{ window.__fps=[]; let last=performance.now();
    const tick=()=>{ const n=performance.now(); window.__fps.push(1000/(n-last)); last=n; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  const names = ['外景','屋顶','场地','球门','立面','看台','天穹','广场','总平'];
  for (let i=0;i<9;i++){
    await pg.evaluate(k=>window.__app.ui.setShot(k,true), i);
    await pg.waitForTimeout(1200);
    await pg.screenshot({ path: `shots/s${i}.png` });
  }
  const fps = await pg.evaluate(()=>{ const a=window.__fps.slice(5); return (a.reduce((x,y)=>x+y,0)/a.length).toFixed(1); });
  const info = await pg.evaluate(()=>{ const i=window.__app.stage.renderer.info; return {calls:i.render.calls, tris:i.render.triangles}; });
  console.log('FPS',fps, JSON.stringify(info));
  await b.close();
})();
