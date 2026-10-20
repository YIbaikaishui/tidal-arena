/* 诊断：为什么画面是白的 */
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('http://127.0.0.1:8099/index.html?cb=' + Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1200);

  const d = await p.evaluate(() => {
    const A = window.__app, st = A.stage, r = st.renderer, sc = st.scene;
    const info = { count: 0, meshes: 0, visible: 0, inst: 0, tris: 0, mats: {}, names: [] };
    sc.traverse(o => {
      info.count++;
      if (o.isMesh) {
        info.meshes++;
        if (o.visible) info.visible++;
        if (o.isInstancedMesh) info.inst++;
        const g = o.geometry;
        const t = g && g.index ? g.index.count / 3 : (g && g.attributes.position ? g.attributes.position.count / 3 : 0);
        info.tris += t;
        const mk = (o.material && o.material.type) || '?';
        info.mats[mk] = (info.mats[mk] || 0) + 1;
      }
    });
    info.names = sc.children.map(c => c.name + ':' + c.type);
    // 手动清屏+直接渲染（绕过 composer）
    r.info.autoReset = false; r.info.reset();
    r.setRenderTarget(null);
    r.setClearColor(0x102030, 1);
    r.clear();
    r.render(sc, st.camera);
    const direct = { calls: r.info.render.calls, tris: r.info.render.triangles };
    r.info.reset();
    // 用 composer
    A.fx.composer.render(0.016);
    const comp = { calls: r.info.render.calls, tris: r.info.render.triangles };
    r.info.autoReset = true;
    return {
      info, direct, comp,
      bg: sc.background ? (sc.background.isColor ? '#' + sc.background.getHexString() : sc.background.type) : null,
      fog: sc.fog ? { type: sc.fog.type, color: '#' + sc.fog.color.getHexString(), d: sc.fog.density } : null,
      env: !!sc.environment,
      cam: { p: st.camera.position.toArray(), near: st.camera.near, far: st.camera.far, fov: st.camera.fov, aspect: +st.camera.aspect.toFixed(3) },
      pr: st.pr, size: [r.domElement.width, r.domElement.height],
      passes: A.fx.composer.passes.map(pp => pp.constructor.name + ':' + pp.enabled + ':' + pp.renderToScreen),
      exposure: r.toneMappingExposure,
      err: window.__bootError || null,
    };
  });
  console.log(JSON.stringify(d, null, 1));

  // 直接渲染一帧截图对比
  await p.evaluate(() => {
    const A = window.__app;
    A.fx.render = function () {
      A.stage.renderer.setRenderTarget(null);
      A.stage.renderer.setClearColor(0x102030, 1);
      A.stage.renderer.render(A.stage.scene, A.stage.camera);
    };
  });
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'audit/dbg_direct.png' });
  // 隐藏天空
  await p.evaluate(() => { window.__app.sky.group && (window.__app.sky.group.visible = false); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'audit/dbg_nosky.png' });
  await b.close();
})();

