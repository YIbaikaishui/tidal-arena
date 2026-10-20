/* 二分定位：composer 的哪个 pass 洗白 */
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('http://127.0.0.1:8099/index.html?cb=' + Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1000);

  const rev = await p.evaluate(() => {
    const A = window.__app;
    // 冻结自动渲染，改为手动
    A.fx.render = () => {};
    return { rev: A ? (window.__three_rev || 'n/a') : 'n/a' };
  });

  // 逐级测试不同 pass 组合，采样中心像素
  const combos = [
    ['renderpass_only', (A) => { const c = A.fx.composer; c.passes.forEach((q, i) => { q.enabled = i === 0; q.renderToScreen = i === 0; }); }],
    ['pass0+bloom', (A) => { const c = A.fx.composer; c.passes.forEach((q, i) => { q.enabled = i <= 1; q.renderToScreen = i === 1; }); }],
    ['bloom_as_compose_only', (A) => { const c = A.fx.composer; c.passes.forEach((q, i) => { q.enabled = i === 1; q.renderToScreen = i === 1; }); }],
    ['all', (A) => { const c = A.fx.composer; c.passes.forEach((q, i) => { q.enabled = true; q.renderToScreen = i === c.passes.length - 1; }); }],
    ['compose_only', (A) => { const c = A.fx.composer; c.passes.forEach((q, i) => { q.enabled = i === 2; q.renderToScreen = i === 2; }); }],
  ];
  for (const [name, setup] of combos) {
    await p.evaluate((n) => {
      const A = window.__app;
      const c = A.fx.composer;
      c.passes.forEach((q, i) => { q.enabled = true; q.renderToScreen = i === c.passes.length - 1; });
      window.__applyCombo && window.__applyCombo(n);
      c.render(0.016);
    }, name).catch(e => console.log('err', e.message));
    // 无法传函数，用第二个 evaluate 设置
    await p.evaluate((n) => {
      const A = window.__app, c = A.fx.composer;
      const map = {
        renderpass_only: (q, i) => { q.enabled = i === 0; q.renderToScreen = i === 0; },
        'pass0+bloom': (q, i) => { q.enabled = i <= 1; q.renderToScreen = i === 1; },
        bloom_as_compose_only: (q, i) => { q.enabled = i === 1; q.renderToScreen = i === 1; },
        all: (q, i) => { q.enabled = true; q.renderToScreen = i === c.passes.length - 1; },
        compose_only: (q, i) => { q.enabled = i === 2; q.renderToScreen = i === 2; },
      };
      c.passes.forEach(map[n]);
      c.render(0.016);
    }, name);
    await p.waitForTimeout(200);
    const px = await p.evaluate(() => {
      const r = window.__app.stage.renderer, gl = r.getContext();
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const buf = new Uint8Array(4);
      gl.readPixels((w / 2) | 0, (h / 2) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      return { px: Array.from(buf), size: [w, h] };
    });
    console.log(name, JSON.stringify(px));
    await p.screenshot({ path: 'audit/pass_' + name + '.png' });
  }

  // 顺便读一下 three 版本 & bloom 参数
  const meta = await p.evaluate(() => ({
    bloom: (() => { const bl = window.__app.fx.composer.passes[1]; return { strength: bl.strength, radius: bl.radius, threshold: bl.threshold, res: bl.resolution ? bl.resolution.toArray() : null, type: bl.constructor.name }; })(),
    composeUniforms: Object.keys(window.__app.fx.composer.passes[2].uniforms || {}),
  }));
  console.log(JSON.stringify(meta));
  await b.close();
})();
