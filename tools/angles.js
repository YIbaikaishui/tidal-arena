/* 多角度无 UI 场景检查 */
const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const OUT = 'D:/Desktop/世界杯3d/tools/shots';
const views = [
  ['pitch', [0, 6, 0], 120, 0.02, 0.10],
  ['tier', [0, 14, 40], 70, 1.02, 0.22],
  ['facade', [0, 22, 90], 110, 0.22, 0.08],
  ['roof', [0, 24, 0], 260, -0.55, 0.80],
  ['under', [0, 30, 55], 150, 0.0, 0.02],
  ['top', [0, 0, 0], 480, 0.0, 1.42],
];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=angle', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true || window.__bootError', null, { timeout: 120000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    document.querySelectorAll('.hud,#help,#vault,#loader,#hint,#toast,#probe').forEach(e => e.style.display = 'none');
  });
  for (const [name, target, dist, az, el] of views) {
    await page.evaluate(([t, d, a, e]) => {
      const o = window.__app.orbit;
      o.tTarget.set(t[0], t[1], t[2]); o.target.set(t[0], t[1], t[2]);
      o.tDist = d; o.dist = d;
      o.tAz = a; o.az = a;
      o.tElv = e; o.elv = e;
      o.apply();
    }, [target, dist, az, el]);
    await page.waitForTimeout(420);
    await page.screenshot({ path: `${OUT}/v-${name}.png` });
    console.log('shot', name);
  }
  await browser.close();
})();
