/* ══════════════════════════════════════════════════════════════════════
   playability_probe.cjs — 可玩性 / 一致性取证探针
   只读为主：不改项目文件，仅在浏览器里跑一遍真实交互并报告证据。
   用法：cd tools && node playability_probe.cjs
   ══════════════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const URL = 'http://127.0.0.1:8099/index.html';
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const OUT = path.join(__dirname, 'shots');
const log = (...a) => console.log(...a);

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });

  await page.goto(URL + '?cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  await page.waitForTimeout(1500);

  const R = {};

  /* ── 1. 容量一致性 ── */
  R.capacity = await page.evaluate(() => ({
    modelTotal: window.__app.arena.model.total,
    seatTotal: window.__app.arena.seatTotal,
    hudCap: document.querySelector('#capNum')?.textContent?.trim(),
    hudRoSeat: document.querySelector('#roSeat')?.textContent?.trim(),
    hudCapSub: document.querySelector('#capSub')?.textContent?.trim(),
    evacTotal: window.__evac?.total,
    evacHud: document.querySelector('#flLeft')?.textContent?.trim(),
    m5desc: window.__game?.missions?.find((m) => m.id === 'm5')?.desc,
    htmlClaim: document.body.innerHTML.includes('80,000 座'),
  }));

  /* ── 2. 徽章系统双实现冲突 ── */
  R.badges = await page.evaluate(() => {
    const sc = window.__app.stage.scene;
    const legacy = sc.getObjectByName('BADGES');
    const gameg = sc.getObjectByName('GAME_BADGES');
    const ext = window.__badges;
    return {
      extIsArray: Array.isArray(ext),
      extKeys: ext && !Array.isArray(ext) ? Object.keys(ext) : null,
      extLen: Array.isArray(ext) ? ext.length : null,
      legacyVisible: legacy ? legacy.visible : null,
      legacyChildren: legacy ? legacy.children.length : null,
      gameVisible: gameg ? gameg.visible : null,
      gameChildren: gameg ? gameg.children.length : null,
      gameBadgeTaken: window.__badges?.list?.map((b) => b.taken) ?? null,
      gameBadges: window.__badges?.list?.map((b) => ({ id: b.id, pos: b.pos })) ?? null,
      hudBadgeRowOn: document.querySelectorAll('#badgeRow i.on').length,
      gameBadgesArray: window.__game?.badges,
      missionsDone: window.__game?.missions?.map((m) => m.id + ':' + (m.done ? 1 : 0)),
    };
  });

  /* ── 3. 指引箭头指向什么？ ── */
  R.guide = await page.evaluate(() => {
    const sc = window.__app.stage.scene;
    const legacy = sc.getObjectByName('BADGES');
    const gameg = sc.getObjectByName('GAME_BADGES');
    const legacyKids = legacy ? legacy.children.map((c) => ({ name: c.name, vis: c.visible, p: c.position.toArray() })) : [];
    const gameKids = gameg ? gameg.children.map((c) => ({ name: c.name, vis: c.visible, p: c.position.toArray() })) : [];
    return {
      guideName: document.querySelector('#gName')?.textContent?.trim(),
      guideDist: document.querySelector('#gDist')?.textContent?.trim(),
      legacyKids, gameKids,
    };
  });

  /* ── 4. 走到一个可见徽章处，看能否收集（walk.start API） ── */
  const bpos = await page.evaluate(() => {
    const g = window.__badges?.list?.find((b) => !b.taken);
    return g ? g.pos.slice() : null;
  });
  R.walkTest = { targetBadge: bpos };
  if (bpos) {
    await page.evaluate(async (p) => {
      const A = window.__app;
      A.walk.start(new window.__THREE.Vector3(p[0], p[1], p[2] + 1.2));
      A.walk.yaw = Math.PI; A.walk.pitch = 0;
    }, bpos);
    await page.waitForTimeout(1400);
    R.walkTest.after = await page.evaluate(() => ({
      walkActive: window.__app.walk.active,
      walkPos: window.__app.walk.pos?.toArray().map((v) => +v.toFixed(1)),
      gameBadges: window.__game?.badges?.slice(),
      hudBadgeRowOn: document.querySelectorAll('#badgeRow i.on').length,
      xp: window.__game?.xp,
      toast: document.querySelector('#toastWrap')?.innerText?.replace(/\s+/g, ' ').slice(0, 120),
    }));
    await page.screenshot({ path: path.join(OUT, 'probe_walk_badge.png') });
  }

  /* ── 5. 相机能否走到 m6 条件（5 枚徽章）── */
  R.m6 = await page.evaluate(() => {
    const g = window.__game;
    return { badges: g?.badges?.length ?? 0, m6done: g?.missionDone?.('m6') ?? null };
  });

  /* ── 6. 照片模式状态泄漏：点一遍按钮后是否还在 photo ── */
  await page.evaluate(() => { window.__app.ui.photoMode?.(false); });
  await page.waitForTimeout(200);
  const btnIds = await page.$$eval('button', (els) => els.map((e) => e.id).filter(Boolean));
  for (const id of btnIds) {
    await page.evaluate((i) => { const el = document.getElementById(i); if (el) el.click(); }, id);
    await page.waitForTimeout(60);
  }
  R.afterClicks = await page.evaluate(() => ({
    bodyClass: document.body.className,
    photoBarHidden: document.getElementById('photoBar')?.hidden,
    walking: document.body.classList.contains('walking'),
    panelsOpen: [...document.querySelectorAll('.panel')].filter((p) => getComputedStyle(p).display !== 'none').length,
  }));
  await page.screenshot({ path: path.join(OUT, 'probe_after_clicks.png') });

  /* ── 7. 疏散演练：跑一次看是否收敛 ── */
  R.evac = await page.evaluate(async () => {
    const e = window.__evac;
    if (!e) return { missing: true };
    e.reset(); e.start();
    await new Promise((r) => setTimeout(r, 2500));
    const mid = { elapsed: e.elapsed, evacuated: e.evacuated, remaining: e.remaining, success: e.success, zones: e.zones?.slice(0, 6) };
    return { mid, total: e.total };
  });

  /* ── 8. 建造阶段 ── */
  R.build = await page.evaluate(() => {
    const b = window.__build;
    if (!b) return { missing: true };
    const out = [];
    for (const p of [0, 25, 50, 75, 100]) { b.setPhase(p); out.push({ p, phase: b.phase, name: b.stageName }); }
    b.setPhase(100);
    return out;
  });

  /* ── 9. 关键交互对象是否都存在 ── */
  R.apis = await page.evaluate(() => ({
    ui: typeof window.__app.ui.goShot,
    walkStart: typeof window.__app.walk.start,
    walkEnter: typeof window.__app.walk.enter,
    focusOn: typeof window.__app.arena.focusOn,
    setSolo: typeof window.__app.arena.setSolo,
    setVisible: typeof window.__app.arena.setVisible,
    gameReady: !!window.__gameReady,
    gameErrors: window.__gameApi?.errors || null,
  }));

  R.errors = errs;
  log(JSON.stringify(R, null, 2));
  fs.writeFileSync(path.join(__dirname, '_playability_report.json'), JSON.stringify(R, null, 2));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
