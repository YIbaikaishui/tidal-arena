/* 探针：模拟按键行走，验证主入口券洞是否真的能走进去（门厅空腔） */
const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  await p.goto('http://127.0.0.1:8099/index.html?cb=' + Date.now(), { waitUntil: 'load' });
  await p.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  await p.waitForFunction('window.__gameReady === true', null, { timeout: 60000 });
  await p.waitForTimeout(600);

  /* 走 20 秒：同步步进（不依赖 rAF） */
  const R = await p.evaluate(() => {
    const A = window.__app, w = A.walk;
    const start = { pos: w.pos.toArray().map((v) => +v.toFixed(1)) };
    w.start(new window.__THREE.Vector3(0, 2, 200));
    w.yaw = Math.PI; w.pitch = 0;
    w.keys.add('KeyW');
    const trace = [];
    for (let i = 0; i < 420; i++) {
      w.update(0.1);
      if (i % 30 === 0) {
        trace.push({
          step: i,
          pos: w.pos.toArray().map((v) => +v.toFixed(1)),
          g: +w.groundAt(w.pos.x, w.pos.z).toFixed(2),
        });
      }
    }
    w.keys.delete('KeyW');
    const pos = w.pos.toArray().map((v) => +v.toFixed(1));
    return { start, trace, pos, ground: +w.groundAt(w.pos.x, w.pos.z).toFixed(2) };
  });
  console.log('walk trace:');
  for (const t of R.trace) console.log('  ', JSON.stringify(t));
  console.log('final', JSON.stringify(R.pos), 'ground', R.ground);

  /* 等游戏层判定任务 */
  await p.waitForTimeout(2500);
  const M = await p.evaluate(() => ({
    m1: window.__game.missionDone('m1'),
    m2: window.__game.missionDone('m2'),
    xp: window.__game.xp,
    current: window.__objectives?.current?.name,
  }));
  console.log('missions', JSON.stringify(M));
  await p.screenshot({ path: 'D:/Desktop/世界杯3d/tools/audit2/_lobby.png' });
  console.log('ERR', JSON.stringify(errs));
  await b.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
