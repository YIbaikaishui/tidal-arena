/* 终验 quick：图鉴 / 解锁 / 构图评分 / 照片条隐藏 / 容量一致性 */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const OUT = path.join(__dirname, 'audit2');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await b.newPage({ viewport: { width: 1600, height: 980 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 180)); });
  await p.goto('http://127.0.0.1:8099/index.html?cb=' + Date.now(), { waitUntil: 'load' });
  await p.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  await p.waitForFunction('window.__gameReady === true', null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  const R = {};

  R.photoBarHidden = await p.evaluate(() => {
    const el = document.getElementById('photoBar');
    return { hidden: el.hidden, display: getComputedStyle(el).display };
  });

  R.insights = await p.evaluate(() => {
    const ins = window.__insights;
    return {
      exists: !!ins, count: ins?.list?.length,
      first: ins?.list?.[0] ? { name: ins.list[0].name, pos: ins.list[0].pos.map((v) => +v.toFixed(1)) } : null,
      group: !!window.__app.stage.scene.getObjectByName('GAME_INSIGHTS'),
    };
  });

  /* 升到 Lv5 解锁图鉴 */
  R.unlock = await p.evaluate(() => {
    const g = window.__game;
    g.addXP(600, '测试');
    return {
      level: g.level, unlocks: g.unlocks, codex: g.unlocked('codex'),
      list: g.unlockList().map((u) => u.key + (u.got ? '✓' : '✗')),
    };
  });
  await p.waitForTimeout(800);
  R.codexPanel = await p.evaluate(() => ({
    rows: document.querySelectorAll('#codexList .cxi').length,
    count: document.querySelector('#cxCount')?.textContent,
    locked: document.querySelector('#codexBox')?.classList.contains('locked'),
  }));
  await p.evaluate(() => window.__app.ui.openPanel('quest'));
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(OUT, '15_codex.png') });

  /* 收集一枚洞察（走到 i10 球员通道） */
  const ip = await p.evaluate(() => {
    const d = window.__insights.list.find((x) => x.id === 'i10');
    return d ? d.pos : null;
  });
  if (ip) {
    await p.evaluate((q) => {
      const A = window.__app;
      A.walk.start(new window.__THREE.Vector3(q[0], q[1] + 1, q[2]));
    }, ip);
    const got = await p.waitForFunction(() => window.__insights.found > 0, { timeout: 90000 }).then(() => true).catch(() => false);
    R.insightCollected = { got, found: await p.evaluate(() => window.__insights.found) };
  }

  /* 构图评分 */
  R.photo = await p.evaluate(() => {
    const sc = window.__photo.score();
    return { total: sc.total, grade: sc.grade, items: sc.items };
  });
  await p.evaluate(() => window.__app.ui.photoMode(true));
  await p.waitForTimeout(900);
  R.photoBarVisible = await p.evaluate(() => getComputedStyle(document.getElementById('photoBar')).display);
  await p.screenshot({ path: path.join(OUT, '16_photo_score.png') });
  await p.evaluate(() => window.__app.ui.photoMode(false));
  await p.waitForTimeout(400);
  R.photoBarHiddenAfter = await p.evaluate(() => getComputedStyle(document.getElementById('photoBar')).display);

  R.errors = errs;
  console.log(JSON.stringify(R, null, 2));
  await b.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
