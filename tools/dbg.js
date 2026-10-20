/* 调试图：无 UI 叠加，直接看 3D 场景本体 */
const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const OUT = 'D:/Desktop/世界杯3d/tools/shots';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 820 } });
  const logs = [];
  page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
  await page.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true || window.__bootError', null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  // 隐藏全部 HUD 与遮罩
  await page.evaluate(() => {
    document.querySelectorAll('.hud-top,.hud-left,.hud-right,.hud-bottom,#help,#loader,#vault,#toast,.reticle,.grade,.vignette,.scan,#titleCard').forEach(e => e.style.display = 'none');
    document.body.style.overflow = 'hidden';
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/dbg-a.png' });
  // 换成夜间，再拍
  await page.evaluate(() => { window.__app.ui.setPreset('night'); });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: OUT + '/dbg-b.png' });
  // 相机位置数据
  const cam = await page.evaluate(() => {
    const c = window.__app.stage.camera;
    const info = window.__app.stage.renderer.info;
    return { pos: c.position.toArray().map(v => +v.toFixed(1)), calls: info.render.calls, tris: info.render.triangles,
      drawing: window.__app.stage.renderer.getContext().getParameter(window.__app.stage.renderer.getContext().DRAW_BUFFER_WIDTH) };
  });
  console.log(JSON.stringify(cam));
  console.log('ERRORS:', logs.slice(0, 10).join(' | '));
  await browser.close();
})();

