/* 探针：复现 audit2 的 m1 漫游流程，逐帧记录玩家位置 / 过渡 / 自动巡游状态 */
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

  const setup = await p.evaluate(() => {
    const A = window.__app;
    A.ui.setView('persp');
    A.ui.goShot('hero');
    const tgt = window.__objectives.target.toArray();
    return { tgt, cam: A.stage.camera.position.toArray().map((v) => +v.toFixed(1)) };
  });
  console.log('camera@hero', JSON.stringify(setup.cam), 'target', JSON.stringify(setup.tgt));

  await p.evaluate((q) => {
    const A = window.__app;
    A.walk.start(new window.__THREE.Vector3(q[0], q[1] + 1, q[2]));
    A.walk.yaw = Math.PI; A.walk.pitch = 0;
    /* 记录轨迹 */
    window.__traj = [];
    window.__trajT = setInterval(() => {
      const w = A.walk;
      window.__traj.push({
        t: Date.now() % 100000,
        pos: w.pos.toArray().map((v) => +v.toFixed(1)),
        g: +w.groundAt(w.pos.x, w.pos.z).toFixed(2),
        trans: w.trans ? w.trans.mode : null,
        auto: !!w.auto,
        active: !!w.active,
        m1: !!(window.__game && window.__game.missionDone('m1')),
      });
    }, 250);
  }, setup.tgt);

  await p.waitForTimeout(20000);
  const traj = await p.evaluate(() => { clearInterval(window.__trajT); return window.__traj; });
  console.log('traj:');
  for (const r of traj) console.log(' ', JSON.stringify(r));
  console.log('ERR', JSON.stringify(errs));
  await b.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
