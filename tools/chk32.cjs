const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 45000 }).catch(()=>{});
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    window.__app.ui.setView('section');
    window.__app.modes.setSection(true, {x:0,y:0,z:-1}, 0);
    const st = window.__app.stage, c = st.camera, r = st.renderer;
    const v = new (window.__app.arena.root.constructor)(); // dummy
    return {
      canvas: [st.canvas.width, st.canvas.height],
      css: [st.canvas.clientWidth, st.canvas.clientHeight],
      pr: st.pr, pixelRatio: r.getPixelRatio(),
      viewport: r.getViewport(new (Object.getPrototypeOf(r).constructor === Object ? Object : Object)()) ? null : null,
      cam: { l: c.left, r: c.right, t: c.top, b: c.bottom, pos: c.position.toArray(), near: c.near, far: c.far },
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
