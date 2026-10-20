/* ══════════════════════════════════════════════════════════════════════
   game_test.cjs — 潮汐场游戏层验收（SPEC 3.5 / 验收 16–19）
   前置：静态服务已在 http://127.0.0.1:8099/index.html
   用法：cd tools && node game_test.cjs
   输出：tools/shots/game_*.png + 终端 JSON 报告
   ══════════════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const URL = 'http://127.0.0.1:8099/index.html';
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const OUT = path.join(__dirname, 'shots');

async function game() {
  /* app.js 尚未接线时，测试侧兜底注入；已接线则直接复用 */
  return await page_eval(async () => {
    if (window.__gameReady) return { ok: true, injected: false };
    try {
      const m = await import('/src/game/index.js');
      await m.init(window.__app);
      return { ok: !!window.__gameReady, injected: true };
    } catch (e) {
      return { ok: false, error: String((e && e.message) || e) };
    }
  });
}
async function page_eval(fn) { return await globalThis.__page.evaluate(fn); }

async function ensure(page) {
  await page.waitForFunction('window.__ready === true', null, { timeout: 60000 });
  await page.waitForTimeout(900);
  globalThis.__page = page;
  let r = await game();
  if (!r.ok) {
    await page.waitForTimeout(1200);
    r = await game();
  }
  return r;
}

async function run() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const jsErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => jsErrors.push(String((e && e.message) || e)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });

  const R = { checks: {}, values: {}, shots: [] };
  const shot = async (name) => {
    const f = path.join(OUT, `game_${name}.png`);
    await page.screenshot({ path: f });
    R.shots.push('tools/shots/game_' + name + '.png');
    return f;
  };

  await page.goto(URL + '?cb=' + Date.now(), { waitUntil: 'load' });
  const boot = await ensure(page);
  R.checks.boot = !!boot.ok;
  R.values.boot = boot;
  await page.waitForTimeout(1200);
  await shot('01_boot');

  /* ① __game 存在 */
  R.checks.gameExists = await page.evaluate(() => {
    const g = window.__game;
    return !!(g && typeof g.addXP === 'function' && Array.isArray(g.missions) && g.missions.length === 6
      && typeof g.complete === 'function' && typeof g.save === 'function' && typeof g.load === 'function');
  });

  /* ② 完成 m1 → xp > 0；③ localStorage 有档 */
  R.values.m1 = await page.evaluate(() => {
    const g = window.__game;
    g.reset();
    const before = g.xp;
    g.complete('m1');
    const m = g.missions.find((x) => x.id === 'm1');
    let save = null;
    try { save = localStorage.getItem(g.saveKey || 'tidal_arena_save_v1'); } catch (e) { save = null; }
    return {
      before, xp: g.xp, level: g.level, done: !!(m && m.done),
      saved: !!save, saveLen: save ? save.length : 0,
      missions: g.missions.map((x) => x.id + ':' + (x.done ? 1 : 0)).join(' '),
    };
  });
  R.checks.m1XP = R.values.m1.done && R.values.m1.xp > 0;
  R.checks.save = R.values.m1.saved;

  /* ④ 徽章 5 枚 */
  R.values.badges = await page.evaluate(() => {
    const b = window.__badges;
    return {
      isObj: !!b && !Array.isArray(b),
      len: (b && b.list && b.list.length) || 0,
      pos: (b && b.list || []).map((x) => x.pos.join(',')),
      nearest: b && b.nearest ? (b.nearest.name || null) : null,
    };
  });
  R.checks.badges5 = R.values.badges.len === 5;

  /* ⑤ 疏散：start 后 6s 已疏散 > 0 */
  await page.evaluate(() => { window.__evac && window.__evac.start(); });
  await page.waitForTimeout(6000);
  R.values.evac = await page.evaluate(() => {
    const e = window.__evac;
    const s = e && typeof e.state === 'function' ? e.state() : null;
    const zones = (e && e.zones) || [];
    return {
      evacuated: e ? e.evacuated : -1,
      remaining: e ? e.remaining : -1,
      elapsed: e ? +(e.elapsed || 0).toFixed(2) : -1,
      running: !!(e && e.running),
      success: e ? +(e.success || 0).toFixed(3) : -1,
      zones: zones.length,
      zonesInRange: zones.every((v) => v >= 0 && v <= 1),
      stateOk: !!s && typeof s.evacuated === 'number',
    };
  });
  R.checks.evacStart = R.values.evac.evacuated > 0 && R.values.evac.elapsed > 5;
  await shot('02_evac');

  /* ⑥ 建造 setPhase(50) */
  R.values.build = await page.evaluate(() => {
    const b = window.__build;
    const p = b.setPhase(50);
    return { ret: p, phase: b.phase, stageName: b.stageName, hasStages: !!(b.stages && b.stages.length === 5) };
  });
  R.checks.build50 = Math.abs((R.values.build.phase || 0) - 50) < 1 && !!R.values.build.stageName;
  await page.waitForTimeout(700);
  await shot('03_build50');
  await page.evaluate(() => { window.__build && window.__build.setPhase(100); });
  await page.waitForTimeout(400);

  /* ⑦ 照片模式 */
  R.values.photo = await page.evaluate(() => {
    const p = window.__photo;
    try {
      const on = p.enter();
      const r = p.shot();
      const cls = document.body.classList.contains('photo');
      p.exit();
      return { enter: !!on, ok: !!r.ok, len: r.len, name: r.name, err: r.error || null, cls, exited: !document.body.classList.contains('photo') };
    } catch (e) {
      return { threw: String((e && e.message) || e) };
    }
  });
  R.checks.photoShot = !R.values.photo.threw && R.values.photo.ok === true;
  await shot('04_after_photo');

  /* ⑧ reload 后存档仍在 */
  await page.reload({ waitUntil: 'load' });
  const boot2 = await ensure(page);
  R.values.reload = await page.evaluate(() => {
    const g = window.__game;
    return {
      has: !!g,
      xp: g ? g.xp : -1,
      level: g ? g.level : -1,
      m1: !!(g && g.missions.find((x) => x.id === 'm1' && x.done)),
      raw: (() => { try { return !!localStorage.getItem('tidal_arena_save_v1'); } catch (e) { return false; } })(),
    };
  });
  R.checks.reloadXP = R.values.reload.has && R.values.reload.xp > 0 && R.values.reload.m1;
  R.values.boot2 = boot2;
  await page.waitForTimeout(900);
  await shot('05_reload');

  R.jsErrors = jsErrors.slice(0, 12);
  R.consoleErrors = consoleErrors.filter((t) => !/favicon|404|ERR_FILE/i.test(t)).slice(0, 12);
  R.checks.noFatal = jsErrors.length === 0;
  R.pass = Object.values(R.checks).every(Boolean);
  R.gameReady = await page.evaluate(() => !!window.__gameReady);

  console.log(JSON.stringify(R, null, 2));
  await browser.close();
  process.exit(R.pass ? 0 : 1);
}

run().catch((e) => { console.error('[game_test] 失败：', e); process.exit(2); });
