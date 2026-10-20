/* 探针：检查 locate/groundAt 在广场与环廊带的取值是否自洽 */
const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  await p.goto('http://127.0.0.1:8099/index.html?cb=' + Date.now(), { waitUntil: 'load' });
  await p.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  await p.waitForTimeout(800);

  const R = await p.evaluate(() => {
    const w = window.__app.walk;
    const rows = [];
    /* 北轴 (x=0) 上取一串 z 值，看地面高度随位置的变化 */
    for (let z = 60; z <= 200; z += 10) {
      rows.push({ x: 0, z, g: +w.groundAt(0, z).toFixed(2) });
    }
    /* 反推 s：由 ring 约定 axis radius = 40.26 + 0.64*s */
    const sOf = (z) => +(((z - 40.26) / 0.64)).toFixed(1);
    /* 目标点 */
    const tgt = window.__objectives?.target;
    const ov = window.__objectives?.current;
    return {
      rows: rows.map((r) => ({ ...r, sGuess: sOf(r.z) })),
      target: tgt ? tgt.toArray().map((v) => +v.toFixed(1)) : null,
      current: ov ? { name: ov.name, s: ov.s, y: ov.y, u: ov.u } : null,
      walkApi: Object.keys(w).filter((k) => typeof w[k] === 'function'),
    };
  });
  console.log(JSON.stringify(R, null, 2));
  console.log('ERR', JSON.stringify(errs));
  await b.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
