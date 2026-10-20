/* 采样主循环状态，找出洗白原因 */
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('http://127.0.0.1:8099/index.html?cb=' + Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 60000 }).catch(() => {});
  const rows = [];
  for (let i = 0; i < 14; i++) {
    await p.waitForTimeout(250);
    rows.push(await p.evaluate(() => {
      const A = window.__app, st = A.stage, fx = A.fx, U = fx.compose.uniforms;
      const rt = fx.composer.renderTarget1;
      return {
        i: window.__tick,
        draft: fx.draftMode, camType: st.camera.type, camY: +st.camera.position.y.toFixed(0),
        bg: st.scene.background ? (st.scene.background.isColor ? '#' + st.scene.background.getHexString() : 'tex') : null,
        fog: !!st.scene.fog,
        exp: U.exposure.value, flash: U.flash.value, vign: U.vignette.value,
        time: +U.time.value.toFixed(2), grain: U.grain.value,
        pr: st.pr, rtSize: [rt.width, rt.height],
        bloom: [fx.bloom.strength, fx.bloom.threshold],
        nmode: A.modes.mode, clip: st.renderer.clippingPlanes.length,
        autoClear: st.renderer.autoClear,
        xray: A.modes.xrayMat ? 1 : 0,
      };
    }));
  }
  rows.forEach(r => console.log(JSON.stringify(r)));
  await p.screenshot({ path: 'audit/live_state.png' });
  await b.close();
})();
