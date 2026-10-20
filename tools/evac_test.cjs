/* ══════════════════════════════════════════════════════════════════════
   evac_test.cjs — 潮汐调度玩法验收
   ① 12 出口 / 人力预算生效
   ② 关闭出口 → 人流改道 → 拥堵变化
   ③ 人力不足时拒绝开启
   ④ 时限内跑完 → 评级 / 成功率回填任务
   ⑤ 全开策略 vs 仅开主券洞策略的对比
   ══════════════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const OUT = path.join(__dirname, 'shots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

/* 页面里时间跑得慢（软件光栅 ~0.5s/帧），用条件等待而不是固定等待 */
async function step(page, label, fn, timeout = 90000) {
  const t0 = Date.now();
  let r;
  try {
    r = await page.waitForFunction(fn, null, { timeout, polling: 250 });
  } catch (e) {
    r = { timedOut: true, label };
  }
  console.log(`  ${label}: ${JSON.stringify(r && r.jsonValue ? r.jsonValue() : r)} (${Date.now() - t0}ms)`);
  return r;
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1600, height: 980 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 180)); });

  await page.goto('http://127.0.0.1:8099/index.html?cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  await page.waitForFunction('window.__gameReady === true', null, { timeout: 60000 });
  await page.waitForTimeout(800);

  const R = {};

  /* ① 出口与人力 */
  R.init = await page.evaluate(() => {
    const e = window.__evac;
    return {
      exits: e.exits.length,
      teams: e.teams, teamMax: e.teamMax,
      open: e.exits.filter((x) => x.open).map((x) => x.id),
      total: e.total, limit: e.limit, broadcast: e.broadcastLeft,
      gridBtns: document.querySelectorAll('#exitGrid .xbtn').length,
      quads: document.querySelectorAll('#quadRow .quad').length,
    };
  });
  console.log('① 初始状态', JSON.stringify(R.init));

  /* ② 人力预算：全开 12 出口需 16 组 > 10 组预算，应拒绝超额开启 */
  R.budget = await page.evaluate(() => {
    const e = window.__evac;
    const before = e.teams;
    e.setExit('S1', false); e.setExit('S5', false);   /* 腾出 2 组 → 8 组 */
    const mid = e.teams;
    const ok = e.setExit('S2', true);   /* 次门 1 组 → 9 组，应成功 */
    const ok2 = e.setExit('S3', true);  /* 次门 1 组 → 10 组，应成功 */
    const over = e.setExit('S4', true); /* 再开 1 组 → 11 组，应被拒 */
    return { before, mid, after: e.teams, ok, ok2, over, want: e.exits.filter((x) => x.want).map((x) => x.id) };
  });
  console.log('② 人力预算', JSON.stringify(R.budget));

  /* ③ 演练闭环：重置 → 开始 → 等待完成或超时 */
  await page.evaluate(() => {
    const e = window.__evac;
    e.reset();
    /* 推荐布局：4 主 + 2 次（10 组） */
    ['P1', 'P2', 'P3', 'P4', 'S1', 'S5'].forEach((id) => e.setExit(id, true));
    ['S2', 'S3', 'S4', 'S6', 'S7', 'S8'].forEach((id) => e.setExit(id, false));
    e.start();
  });
  await page.waitForTimeout(1500);
  R.mid = await page.evaluate(() => {
    const e = window.__evac;
    return {
      t: +e.elapsed.toFixed(1), out: e.evacuated, rem: e.remaining,
      success: +e.success.toFixed(3),
      cong: e.exits.map((x) => ({ id: x.id, o: x.open, c: +x.cong.toFixed(2), load: x.load })).filter((x) => x.o),
      teams: e.teams, gateVisible: !!window.__app.stage.scene.getObjectByName('GAME_EVAC_GATES'),
    };
  });
  console.log('③ 演练中', JSON.stringify(R.mid));
  await page.screenshot({ path: path.join(OUT, 'evac_running.png') });

  /* 等到结束 */
  await step(page, '演练结束', () => window.__evac && window.__evac.done, 180000);
  R.done = await page.evaluate(() => {
    const e = window.__evac;
    return {
      t: +e.elapsed.toFixed(1), out: e.evacuated, rem: e.remaining,
      success: +e.success.toFixed(3), grade: e.grade, peak: +e.peak.toFixed(2),
      reason: e.finishReason,
      missionDone: window.__game.missionDone('m5'),
      xp: window.__game.xp,
      hudGrade: document.querySelector('#flowGrade')?.textContent,
      hudFin: document.querySelector('#flowFin')?.textContent,
    };
  });
  console.log('④ 结果', JSON.stringify(R.done));
  await page.screenshot({ path: path.join(OUT, 'evac_done.png') });

  /* ⑤ 极端策略：只开 4 个主券洞（8 组，浪费 2 组） */
  R.worst = await page.evaluate(async () => {
    const e = window.__evac;
    e.reset();
    ['P1', 'P2', 'P3', 'P4'].forEach((id) => e.setExit(id, true));
    ['S1', 'S5'].forEach((id) => e.setExit(id, false));
    e.start();
    return { teams: e.teams, open: e.exits.filter((x) => x.open).length };
  });
  await step(page, '极端策略结束', () => window.__evac && window.__evac.done, 180000);
  R.worst = await page.evaluate(() => {
    const e = window.__evac;
    return {
      t: +e.elapsed.toFixed(1), success: +e.success.toFixed(3), grade: e.grade,
      reason: e.finishReason, peak: +e.peak.toFixed(2), rem: e.remaining,
    };
  });
  console.log('⑤ 仅主券洞', JSON.stringify(R.worst));

  R.errors = errs;
  console.log('ERRORS', JSON.stringify(errs));
  fs.writeFileSync(path.join(__dirname, '_evac_report.json'), JSON.stringify(R, null, 2));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
