const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 45000 }).catch(()=>{});
  await p.waitForTimeout(800);
  const r = await p.evaluate(async () => {
    const THREE = await import('./vendor/build/three.module.js');
    window.__app.ui.setView('section');
    window.__app.modes.setSection(true, new THREE.Vector3(0,0,-1), 0);
    const st = window.__app.stage, c = st.camera, r = st.renderer;
    const vp = r.getViewport(new THREE.Vector4());
    return {
      canvas: [st.canvas.width, st.canvas.height],
      css: [st.canvas.clientWidth, st.canvas.clientHeight],
      pixelRatio: r.getPixelRatio(),
      viewport: vp.toArray(),
      cam: { l: +c.left.toFixed(1), r: +c.right.toFixed(1), t: +c.top.toFixed(1), b: +c.bottom.toFixed(1), pos: c.position.toArray().map(v=>+v.toFixed(1)) },
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
