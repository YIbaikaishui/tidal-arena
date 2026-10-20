const { chromium } = require('playwright-core');
(async () => {
  const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
  const b = await chromium.launch({ executablePath: CHROME, args:['--use-gl=angle','--use-angle=d3d11'] });
  const pg = await b.newPage({ viewport: { width: 1000, height: 640 } });
  pg.on('pageerror', e=>console.log('ERR',e.message));
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 120000 });
  await pg.waitForTimeout(1000);
  const r = await pg.evaluate(()=>{
    const A = window.__app.arena, S = window.__app.stage;
    const out = {};
    // 收集材质
    const mats = new Map();
    A.root.traverse(o=>{ if(o.material){ const ms=[].concat(o.material); ms.forEach(m=>{ if(!mats.has(m)) mats.set(m,{n:0,name:m.type+':'+(m.userData.matKey||'')}); }); } });
    out.matCount = mats.size;
    // 根据 renderer 统计：重跑一次 render 并读 info
    S.renderer.info.autoReset = false;
    S.renderer.info.reset();
    S.renderer.render(S.scene, S.camera);
    out.calls = S.renderer.info.render.calls; out.tris = S.renderer.info.render.triangles;
    S.renderer.info.autoReset = true;
    // 场景光照
    out.lights = [];
    S.scene.traverse(o=>{ if(o.isLight) out.lights.push({t:o.type, i:o.intensity, c:'#'+o.color.getHexString(), vis:o.visible}); });
    out.envMap = !!S.scene.environment;
    out.tone = { exposure: S.renderer.toneMappingExposure, tm: S.renderer.toneMapping };
    // 采样中心像素颜色
    return out;
  });
  console.log(JSON.stringify(r,null,1));
  await b.close();
})();
