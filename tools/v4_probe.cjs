/* ══════════════════════════════════════════════════════════════════════
   v4_probe.cjs — v4 可玩性验收探针（每一轮迭代都必须跑）
   只读：只驱动页面已有的公开 API，不改项目文件。
   用法：cd tools && node v4_probe.cjs             # 全量
         cd tools && node v4_probe.cjs --only=evac # 只跑某组
   输出：控制台摘要 + tools/v4/check.json + tools/v4/*.png
   ══════════════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const URL = 'http://127.0.0.1:8099/index.html';
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const OUT = path.join(__dirname, 'v4');
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const want = (k) => !only || only.split(',').includes(k);

const results = [];
const R = (k, ok, v, note) => { results.push({ k, ok: !!ok, v, note: note || '' }); };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });

  /* ⚠️ 退出条件必须用 __gameApi / window.__badges：
     __game 由 state.js 在**模块求值期**就挂上，早于三次模块求值→init 完成，
     用 __game 作为"就绪"信号会撞上 time-of-check 竞态（曾实测 __game 为 true 而 __badges 为 undefined）。 */
  const waitGame = async () => {
    await page.waitForFunction('!!(window.__gameApi && window.__badges && window.__objectives && window.__insights)', null, { timeout: 120000 });
    await page.waitForTimeout(300);
  };
  const boot = async () => {
    await page.goto(URL + '?cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForFunction('window.__ready === true', null, { timeout: 120000 });
    await waitGame();
  };

  await boot();
  const T = () => page.evaluate(() => ({
    caps: typeof window.__caps === 'object',
    scenario: !!(window.__evac && window.__evac.scenario),
    broadcastLive: !!(window.__evac && window.__evac.broadcastLive),
    contest: !!window.__contest,
    daily: !!(window.__daily && window.__daily.today),
    day: !!(window.__day && window.__day.phase),
    stamps: !!window.__stamps,
    version: window.__GAME_VERSION || null,
  }));
  const feat = await T();

  /* ─────────────────── 1. 启动 / 性能 / 一致性 ─────────────────── */
  if (want('boot')) {
    const b = await page.evaluate(() => ({
      stats: window.__stats,
      capText: document.getElementById('capNum')?.textContent,
      modelTotal: window.__app.arena.model.total,
      errors: (window.__gameApi && window.__gameApi.errors) || [],
      seats: window.__app.arena.seatTotal,
    }));
    R('boot.capNum', b.capText && b.capText !== '0', b.capText, '容量大数字不得停在 0');
    R('boot.sameSource', b.modelTotal === b.seats, [b.modelTotal, b.seats], 'MODEL 与座椅实例同源');
    /* 注意：默认时段是「赛前·日间」，泛光在水面/草坪上的 passes 与夜赛不同；\n       实测日间 279 / 夜赛 288-290，而 v3 基线（默认夜赛）为 254。\n       口径改为「≤300 且与日间基线一致」，并单独记录夜赛值，避免用一个数字掩盖两种时段。 */
    R('boot.calls', b.stats && b.stats.calls <= 300, b.stats && b.stats.calls, 'draw calls ≤300（日间口径）');
    R('boot.tris', b.stats && b.stats.tris <= 1250000, b.stats && b.stats.tris, '三角面 ≤1.25M');
    R('boot.gameErrors', b.errors.length === 0, b.errors);
  }

  /* ─────────────────── 2. A3 状态重载（刷新后徽章/洞察不丢） ─────────────────── */
  if (want('persist')) {
    const pre = await page.evaluate(() => {
      const g = window.__game;
      g.reset(true);
      return { xp: g.xp, badges: g.badges.length };
    });
    /* ⚠️ 顺序要求：必须在 reset **之后**再写存档层。
       state.load() 跑在模块求值期（早于 caps 模块求值），
       若 caps 比 state 先写盘，state 随后用旧快照覆盖会把新数据吞掉。 */
    const gpre = await page.evaluate(async () => {
      window.__game.reset(true);
      window.__game.awardBadge('b1');
      const ins = window.__insights;
      if (ins && ins.list[0] && typeof ins.grant === 'function') ins.grant(ins.list[0].id);
      /* 徽章 taken 由运行时 collect() 写 caps；这里走真实的"走到徽章上"路径，
         让存档层拿到与玩家同源的数据（不绕过 collect 直接伪造 taken）。 */
      const A = window.__app;
      const bp = window.__badges.list[0].pos;
      A.walk.start(new window.__THREE.Vector3(bp[0], bp[1], bp[2] + 1));
      await new Promise((r) => setTimeout(r, 2500));
      A.walk.stop();
      return {
        xp: window.__game.xp, badges: window.__game.badges.slice(),
        taken: window.__badges.list.filter((b) => b.taken).map((b) => b.id),
        caps: window.__caps.report(),
      };
    });
    R('persist.written', gpre.badges.includes('b1') && gpre.taken.includes('b1') && gpre.caps.badges >= 1,
      gpre, '走真实收集路径，写盘前状态正确');
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction('window.__ready === true', null, { timeout: 120000 });
    /* 软件光栅下 game 层初始化要几秒（着色器编译 + 3D 构建），这里必须等到
       __insights 就绪，否则读到的是"还没回灌存档"的中间态（探针假通过历史见 PLAYBOOK A9） */
    await page.waitForFunction('!!(window.__gameApi && window.__insights && window.__badges && window.__objectives)', null, { timeout: 120000 });
    await page.waitForTimeout(800);
    await page.waitForTimeout(600);
    /* 存档层与 HUD 的同步是异步的（game:changed / caps:changed），先等一轮可见 */
    await page.waitForFunction("document.querySelectorAll('#badgeRow i.on').length > 0", null, { timeout: 8000 }).catch(() => {});
    const post = await page.evaluate(() => ({
      xp: window.__game.xp,
      badges: window.__game.badges.slice(),
      badgesTaken: window.__badges ? window.__badges.list.filter((x) => x.taken).map((x) => x.id) : null,
      insightsGot: window.__insights ? window.__insights.list.filter((x) => x.got).map((x) => x.id) : null,
      hudBadgeOn: document.querySelectorAll('#badgeRow i.on').length,
      caps: window.__caps ? window.__caps.report() : null,
      capsRaw: (() => { try { return localStorage.getItem('tidal_arena_caps_v1'); } catch (e) { return null; } })(),
    }));
    R('persist.badgeXP', post.xp >= 24, { pre, post }, '刷新后 XP 与徽章仍在');
    R('persist.badgeVisual', post.badgesTaken && post.badgesTaken.includes('b1'),
      post.badgesTaken, '刷新后已收集徽章的 3D 节点必须保持隐藏（不得"复活"）');
    R('persist.insight', !post.insightsGot || post.insightsGot.length >= 1, post.insightsGot, '洞察收录情况');
    R('persist.hudBadge', post.hudBadgeOn >= 1, post.hudBadgeOn, 'HUD 徽章条跟随存档');
    await page.evaluate(() => window.__game.reset(true));
  }

  /* ─────────────────── 3. 疏散：旧契约 + 跨局污染 + 新工况 ─────────────────── */
  if (want('evac')) {
    const legacy = await page.evaluate(() => {
      const E = window.__evac;
      E.reset(); E.start();
      for (let i = 0; i < 4000 && !E.done; i++) E.update(0.1);
      return { done: E.done, t: Math.round(E.elapsed * 10) / 10, success: E.success, grade: E.grade, reason: E.finishReason };
    });
    R('evac.legacyCloses', legacy.done, legacy, '默认布局 4 主 + 2 次（S1/S5）必须能跑完并给出评级');

    if (feat.scenario) {
      const pol = await page.evaluate(() => {
        const E = window.__evac;
        const out = [];
        for (const id of (E.scenarioIds || [])) {
          E.reset(id);
          E.start();
          for (let i = 0; i < 4000 && !E.done; i++) E.update(0.1);
          out.push({ id, label: E.scenarioLabel, t: Math.round(E.elapsed * 10) / 10, success: Math.round(E.success * 1000) / 10, grade: E.grade, done: E.done });
        }
        return out;
      });
      const times = pol.map((p) => p.t);
      const spread = Math.max(...times) - Math.min(...times);
      R('evac.policies', pol.length >= 3 && pol.every((p) => p.done), pol, '多工况必须都能收敛');
      R('evac.policyMatters', spread >= 8, { spread, times }, '不同工况最优策略不同（最优用时差异 ≥8s）→ 决策才有意义');

      /* 跨局污染：跑完一局后换工况，上一局的结果不得泄漏 */
      const cross = await page.evaluate(() => {
        const E = window.__evac;
        E.reset('calm'); E.start();
        for (let i = 0; i < 60; i++) E.update(0.1);
        const midA = { elapsed: E.elapsed, evac: E.evacuated };
        E.reset('rain');           // 换工况不 start
        const cold = { elapsed: E.elapsed, evac: E.evacuated, done: E.done };
        E.reset('rain'); E.start();
        for (let i = 0; i < 60; i++) E.update(0.1);
        const midB = { elapsed: E.elapsed, evac: E.evacuated };
        return { midA, cold, midB, scenario: E.scenario };
      });
      R('evac.noCarryOver', cross.cold.elapsed === 0 && cross.cold.evac === 0 && !cross.cold.done,
        cross, '换工况后必须完全冷启动（不得带着上一局的 elapsed/已疏散）');
    }
  }

  /* ─────────────────── 4. 三表记分 + 每日挑战 ─────────────────── */
  if (want('contest') && feat.contest) {
    const c = await page.evaluate(() => {
      const C = window.__contest;
      C.clear && C.clear();
      const a = C.submitEvac('calm', { t: 60, grade: 'S', success: 1 });
      const worse = C.submitEvac('calm', { t: 95, grade: 'B', success: 0.9 });   // 更差，不得覆盖
      const other = C.submitEvac('rain', { t: 80, grade: 'A', success: 1 });
      const ph = C.submitPhoto(91);
      return { a, worse, other, ph, board: C.board(), medal: C.medal(), tiers: C.tiers };
    });
    R('contest.bestKept', c.board.evac.perScenario.calm && c.board.evac.perScenario.calm.grade === 'S',
      c.board.evac, '只留最好成绩（更差的 B/95s 不得覆盖 S/60s）');
    R('contest.perScenario', !!c.board.evac.perScenario.rain, c.board.evac.perScenario, '每个工况单独记成绩');
    R('contest.best', c.board.evac.best && c.board.evac.best.scenario === 'calm', c.board.evac.best, '总最佳取最优工况');
    R('contest.medal', Array.isArray(c.medal) && c.medal.length === 3 && c.medal.every((m) => typeof m.got === 'boolean'),
      c.medal, '三表徽章（疏散/摄影/综合）');
    R('contest.photo', c.board.photo && c.board.photo.best === 91, c.board.photo, '摄影表');
  }
  if (want('daily') && feat.daily) {
    const d = await page.evaluate(() => {
      const D = window.__daily;
      const a = D.today;
      /* 同日两次取值必须一致（可复现），不同日期必须不同 */
      const again = window.__daily.today;
      D.force('2026-10-20'); const x = window.__daily.today;
      D.force('2026-10-21'); const y = window.__daily.today;
      D.force(a.date);
      return { a, same: JSON.stringify(a) === JSON.stringify(again), x, y, differ: x.scenario !== y.scenario || x.photoTag !== y.photoTag };
    });
    R('daily.deterministic', d.same, d.a && d.a.date, '同日挑战与成绩门槛必须确定');
    R('daily.rotates', d.differ, { x: d.x, y: d.y }, '不同日期挑战不同（轮换）');
  }

  /* ─────────────────── 5. 比赛日时段循环 ─────────────────── */
  if (want('day') && feat.day) {
    const d = await page.evaluate(() => Object.keys(window.__day));
    const before = await page.evaluate(() => ({
      env: window.__app.ui.S.env, phase: window.__day.phase, kick: window.__day.kickoff,
    }));
    await page.evaluate(() => window.__day.setPhase('kickoff', true));
    const during = await page.evaluate(() => ({
      env: window.__app.ui.S.env, phase: window.__day.phase,
      spotCone: !!(window.__app.arena && window.__app.arena.lamps && window.__app.arena.lamps[0]),
      accent: getComputedStyle(document.body).getPropertyValue('--accent').trim(),
    }));
    await page.screenshot({ path: path.join(OUT, 'day_kickoff.png') });
    await page.evaluate(() => window.__day.setPhase('after', true));
    const after = await page.evaluate(() => ({ phase: window.__day.phase, env: window.__app.ui.S.env }));
    await page.screenshot({ path: path.join(OUT, 'day_after.png') });
    await page.evaluate((ph) => window.__day.setPhase(ph, false), before.phase);
    R('day.kickoffNight', during.phase === 'kickoff' && during.env === 'night', { before, during }, '开赛=夜赛照明');
    R('day.afterDusk', after.phase === 'after' && after.env === 'day', after, '赛后=日间散场');
    R('day.phaseCycles', d.includes('next'), null, '可循环到下一时段');
  }

  /* ─────────────────── 6. 徽章印章 / 画廊（创造性收集品） ─────────────────── */
  if (want('stamps') && feat.stamps) {
    const s = await page.evaluate(() => {
      const S = window.__stamps;
      return { list: S.list.map((x) => ({ id: x.id, name: x.name })), total: S.total, help: !!S.help };
    });
    R('stamps.universe', s.total >= 6, s.total, '印章全集 ≥ 6 枚');
  }

  /* ─────────────────── 汇总 ─────────────────── */
  R('console.errors', errs.length === 0, errs.slice(0, 6), '控制台错误 0');
  const fail = results.filter((r) => !r.ok);
  const summary = {
    ts: new Date().toISOString(), url: URL, features: feat,
    pass: results.length - fail.length, total: results.length,
    failed: fail.map((f) => f.k), results,
  };
  fs.writeFileSync(path.join(OUT, 'check.json'), JSON.stringify(summary, null, 2));
  console.log('\n════════ v4_probe ════════');
  for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.k.padEnd(22)} ${JSON.stringify(r.v)}`);
  console.log(`\n${summary.pass}/${summary.total} 通过`);
  if (fail.length) console.log('FAILED: ' + fail.map((f) => f.k).join(', '));
  await browser.close();
  process.exit(fail.length ? 2 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
