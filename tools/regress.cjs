/* 快速回归：容量 / 目标系统 / 徽章 / 疏散 一致性 */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const OUT = path.join(__dirname, 'shots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });

  await page.goto('http://127.0.0.1:8099/index.html?cb=' + Date.now(), { waitUntil: 'load' });
  const ok = await page.waitForFunction('window.__ready === true', null, { timeout: 90000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(2000);
  const R = { ready: ok, bootError: await page.evaluate(() => window.__bootError || null) };

  R.capacity = await page.evaluate(() => ({
    modelTotal: window.__app.arena.model.total,
    rows: window.__app.arena.model.rows,
    hudCap: document.querySelector('#capNum')?.textContent,
    hudSub: document.querySelector('#capSub')?.textContent,
    evacTotal: window.__evac?.total,
    m5: window.__game?.missions?.find((m) => m.id === 'm5')?.desc,
    abSeat: document.querySelector('#abSeat')?.textContent,
    abRows: document.querySelector('#abRows')?.textContent,
  }));

  R.objectives = await page.evaluate(() => {
    const ov = window.__objectives;
    if (!ov) return { missing: true };
    return {
      current: ov.current?.name,
      currentId: ov.currentId,
      target: ov.target ? ov.target.toArray().map((v) => +v.toFixed(1)) : null,
      list: ov.list.map((o) => ({ id: o.id, name: o.name, pos: o._pos ? o._pos.toArray().map((v) => +v.toFixed(1)) : null })),
      beaconVisible: ov.list.filter((o) => o._beacon && o._beacon.node.visible).map((o) => o.id),
    };
  });

  R.badges = await page.evaluate(() => {
    const b = window.__badges;
    return {
      isGameApi: !!(b && b.list),
      badges: b?.list?.map((x) => ({ id: x.id, name: x.name, pos: x.pos.map((v) => +v.toFixed(1)) })),
      legacyVisible: window.__app.stage.scene.getObjectByName('BADGES')?.visible,
    };
  });

  R.guide = await page.evaluate(() => ({
    name: document.querySelector('#gName')?.textContent,
    dist: document.querySelector('#gDist')?.textContent,
  }));

  R.stats = await page.evaluate(() => window.__stats);

  /* 走到广场目标，看任务是否触发 */
  const t = await page.evaluate(() => window.__objectives?.target?.toArray());
  if (t) {
    await page.evaluate((p) => {
      const A = window.__app;
      A.walk.start(new window.__THREE.Vector3(p[0], p[1] + 1, p[2]));
      A.walk.yaw = Math.PI; A.walk.pitch = 0;
    }, t);
    await page.waitForTimeout(1600);
    R.afterWalk = await page.evaluate(() => ({
      walkActive: window.__app.walk.active,
      pos: window.__app.walk.pos?.toArray().map((v) => +v.toFixed(1)),
      missions: window.__game?.missions?.map((m) => m.id + ':' + (m.done ? 1 : 0)),
      xp: window.__game?.xp,
    }));
  }
  await page.screenshot({ path: path.join(OUT, 'reg_objective.png') });

  /* 白模 + 夜景截图，看几何是否正常 */
  await page.evaluate(() => { window.__app.ui.setEnv('night'); window.__app.ui.goShot('hero'); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'reg_hero_night.png') });
  await page.evaluate(() => window.__app.ui.setEnv('day'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'reg_hero_day.png') });

  R.errors = errs;
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
