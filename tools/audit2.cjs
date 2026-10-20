/* ══════════════════════════════════════════════════════════════════════
   audit2.cjs — 潮汐场终验（几何一致性 / 游戏闭环 / 表达模式 / 性能）
   前置：静态服务已在 http://127.0.0.1:8099/index.html（勿自行起服务）
   用法：cd tools && node audit2.cjs
   输出：tools/audit2/*.png + tools/_audit2_report.json + 终端摘要
   ══════════════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'audit2');
fs.mkdirSync(OUT, { recursive: true });
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const p = await b.newPage({ viewport: { width: 1600, height: 980 } });
  const logs = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 200)); });
  p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  p.on('requestfailed', (r) => logs.push('REQFAIL: ' + r.url().slice(0, 100)));

  const R = { checks: {}, shots: [], logs: [] };
  const shot = async (name) => {
    await p.waitForTimeout(700);
    const f = path.join(OUT, name + '.png');
    await p.screenshot({ path: f });
    R.shots.push('tools/audit2/' + name + '.png');
  };
  const ev = (fn, arg) => p.evaluate(fn, arg).then((r) => r).catch((e) => ({ err: String(e).slice(0, 160) }));
  /* 条件等待：不依赖页面 rAF。
     headless 下 screenshot() 之后 rAF 可能被浏览器节流冻结，
     此时 p.waitForFunction(默认 raf 轮询) 会一直等到超时 → 误判。 */
  const waitCond = async (fn, timeout = 90000, iv = 500) => {
    const t0 = Date.now();
    for (;;) {
      let r = null;
      try { r = await p.evaluate(fn); } catch (e) { r = null; }
      if (r) return true;
      if (Date.now() - t0 > timeout) return false;
      await p.waitForTimeout(iv);
    }
  };

  /* ── 启动 ── */
  const t0 = Date.now();
  await p.goto('http://127.0.0.1:8099/index.html?cb=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
  const ready = await p.waitForFunction('window.__ready===true', { timeout: 90000 }).then(() => true).catch(() => false);
  R.checks.boot = { ready, ms: Date.now() - t0, err: await ev(() => window.__bootError || null) };
  if (!ready) { console.log(JSON.stringify(R, null, 2)); await b.close(); return; }
  await p.waitForFunction('window.__gameReady===true', { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1200);

  /* ── ① 容量 / 一致性 ── */
  R.checks.capacity = await ev(() => {
    const m = window.__app.arena.model;
    const rowsSum = m.tiers.reduce((a, t) => a + t.zones.reduce((x, z) => x + z.seats, 0), 0);
    return {
      modelTotal: m.total, zonesSum: rowsSum, rows: m.rows, tiers: m.tiers.length,
      hudCap: document.querySelector('#capNum')?.textContent?.trim(),
      hudSeat: document.querySelector('#roSeat')?.textContent?.trim(),
      evacTotal: window.__evac?.total,
      m5desc: window.__game?.missions?.find((m) => m.id === 'm5')?.desc,
      abSeat: document.querySelector('#abSeat')?.textContent?.trim(),
      seatInst: window.__app.arena.seatTotal,
    };
  });

  /* ── ② 目标系统 / 信标 / 指引 ── */
  R.checks.objectives = await ev(() => {
    const ov = window.__objectives;
    const sc = window.__app.stage.scene;
    return {
      exists: !!ov,
      current: ov?.current?.name,
      target: ov?.target ? ov.target.toArray().map((v) => +v.toFixed(1)) : null,
      beacons: ov?.list?.filter((o) => o._beacon).length,
      visibleBeacon: ov?.list?.filter((o) => o._beacon && o._beacon.node.visible).map((o) => o.id),
      guide: document.querySelector('#gName')?.textContent?.trim(),
      guideDist: document.querySelector('#gDist')?.textContent?.trim(),
      briefExists: !!document.getElementById('briefing'),
      briefHidden: document.getElementById('briefing')?.hidden,
      beaconGroup: !!sc.getObjectByName('GAME_OBJECTIVES'),
    };
  });

  /* 关掉开场简报，后续截图保持干净 */
  await ev(() => { const b = document.getElementById('briefGo'); if (b) b.click(); });
  await p.waitForTimeout(400);
  R.checks.briefDismissed = await ev(() => document.getElementById('briefing')?.hidden);

  /* ── ③ 徽章唯一真源 ── */
  R.checks.badges = await ev(() => {
    const sc = window.__app.stage.scene;
    const ext = window.__badges;
    return {
      isGameApi: !!(ext && Array.isArray(ext.list)),
      count: ext?.list?.length,
      legacyHidden: sc.getObjectByName('BADGES')?.visible === false,
      gameVisible: sc.getObjectByName('GAME_BADGES')?.visible,
      hudOn: document.querySelectorAll('#badgeRow i.on').length,
    };
  });

  /* ── ④ 疏散调度台 ── */
  R.checks.dispatch = await ev(() => {
    const e = window.__evac;
    return {
      exits: e?.exits?.length, teams: e?.teams, max: e?.teamMax, limit: e?.limit,
      open: e?.exits?.filter((x) => x.open).map((x) => x.id),
      gridBtns: document.querySelectorAll('#exitGrid .xbtn').length,
      quads: document.querySelectorAll('#quadRow .quad').length,
      gates: !!window.__app.stage.scene.getObjectByName('GAME_EVAC_GATES'),
      overBudget: e?.setExit('S4', true),
    };
  });

  /* ── ⑤ 表达模式截图 ── */
  await ev(() => { window.__app.ui.toggleBrief && window.__app.ui.toggleBrief(true); });
  await shot('00_briefing');
  await ev(() => { window.__app.ui.toggleBrief(false); });
  await ev(() => window.__app.ui.goShot('hero'));
  await shot('01_hero_night');
  await ev(() => window.__app.ui.setEnv('day'));
  await shot('02_hero_day');
  await ev(() => window.__app.ui.setEnv('dusk'));
  await shot('03_hero_dusk');
  await ev(() => window.__app.ui.setEnv('night'));
  await ev(() => window.__app.ui.setMat('white'));
  await shot('04_white');
  await ev(() => window.__app.ui.setMat('xray'));
  await shot('05_xray');
  await ev(() => { window.__app.ui.setMat('material'); window.__app.ui.setExplode(60); });
  await shot('06_explode');
  await ev(() => window.__app.ui.setExplode(0));
  await ev(() => window.__app.ui.setSection(true, 0));
  await shot('07_section');
  await ev(() => window.__app.ui.setSection(false, 0));
  for (const v of ['plan', 'front', 'left', 'pitch']) {
    await ev((x) => window.__app.ui.goShot(x), v);
    await shot('08_view_' + v);
  }
  await ev(() => window.__app.ui.goShot('hero'));

  /* ── ⑥ 疏散面板 + 演练 ── */
  await ev(() => window.__app.ui.openPanel('flow'));
  await shot('09_dispatch_panel');
  await ev(() => { window.__app.ui.openPanel(null); window.__app.ui.setEnv('night'); });
  await ev(() => { window.__app.ui.goShot('hero'); window.__app.ui.setView('plan'); });
  await p.waitForTimeout(900);
  await ev(() => { const e = window.__evac; e.reset(); e.start(); });
  await p.waitForTimeout(4000);
  await shot('10_evac_running');
  R.checks.evacRunning = await ev(() => {
    const e = window.__evac;
    return {
      t: +e.elapsed.toFixed(1), out: e.evacuated, rem: e.remaining,
      queues: e.exits.filter((x) => x.open).map((x) => x.id + ':' + Math.round(x.wait) + 's'),
    };
  });
  /* 跑到结束：软件光栅下 rAF 仅 ~0.7fps，实时跑完 68.8s 要十几分钟。
     改为「确定性快进」——同一个 update(dt)、同一个 dt=0.1 步长，只是不等 vsync。
     JS 单线程：整个循环期间不会有 rAF 插进来，所以读数就是精确值。 */
  R.checks.evacFast = await ev(() => {
    const e = window.__evac;
    const t0 = performance.now();
    let steps = 0;
    while (!e.done && steps < 1400) { e.update(0.1); steps++; }
    return {
      steps, wallMs: Math.round(performance.now() - t0),
      done: e.done, t: +e.elapsed.toFixed(1), out: e.evacuated, rem: e.remaining,
      success: +e.success.toFixed(4), grade: e.grade, reason: e.finishReason,
      mission5: window.__game.missionDone('m5'), xp: window.__game.xp,
    };
  });
  await p.waitForTimeout(700);
  R.checks.evacResult = await ev(() => {
    const e = window.__evac;
    return {
      done: e.done, t: +e.elapsed.toFixed(1), out: e.evacuated, rem: e.remaining,
      success: +e.success.toFixed(4), grade: e.grade, reason: e.finishReason,
      mission5: window.__game.missionDone('m5'), xp: window.__game.xp,
      hudGrade: document.querySelector('#flowGrade')?.textContent,
      hudFin: document.querySelector('#flowFin')?.textContent,
    };
  });
  R.checks.evacFinished = !!R.checks.evacResult.done;
  await shot('11_evac_done');

  /* ── ⑦ 漫游 + 目标判定 ── */
  await p.bringToFront();               /* 截图后恢复标签页激活，避免 rAF 被节流 */
  await ev(() => { window.__app.ui.setView('persp'); window.__app.ui.goShot('hero'); });
  const tgt = await ev(() => window.__objectives?.target?.toArray());
  if (tgt) {
    /* 任务可能已被相机判定完成（非漫游态下 pos() 回落到相机位置）→ 记录漫游前状态 */
    const m1Before = await ev(() => !!window.__game.missionDone('m1'));
    await ev((q) => {
      const A = window.__app;
      A.walk.start(new window.__THREE.Vector3(q[0], q[1] + 1, q[2]));
      A.walk.yaw = Math.PI; A.walk.pitch = 0;
    }, tgt);
    const reached = await waitCond(
      () => { const g = window.__game; return !!(g && g.missions.some((m) => m.id === 'm1' && m.done)); },
      90000,
    );
    /* 等入场过渡结束，读取"落地后"的真实站位（过渡途中是插值假象） */
    const settled = await waitCond(() => !window.__app.walk.trans, 60000);
    R.checks.m1Reached = {
      reached, m1Before, settled,
      pos: await ev(() => window.__app.walk.pos?.toArray().map((v) => +v.toFixed(1))),
      ground: await ev(() => +window.__app.walk.groundAt(window.__app.walk.pos.x, window.__app.walk.pos.z).toFixed(2)),
      active: await ev(() => !!window.__app.walk.active),
      /* 落地后与目标点的水平距离：证明"走到了目标"而不是停在半空 */
      targetDist: await ev(() => {
        const w = window.__app.walk, t = window.__objectives?.target;
        if (!w || !t) return null;
        return +Math.hypot(w.pos.x - t.x, w.pos.z - t.z).toFixed(2);
      }),
    };
    await shot('12_walk_objective');
  }
  await ev(() => window.__app.walk && window.__app.walk.stop());

  /* ── ⑧ 照片模式 + 构图评分 ── */
  await ev(() => { window.__app.ui.photoMode(true); });
  await p.waitForTimeout(900);
  R.checks.photo = await ev(() => {
    const sc = window.__photo?.score?.();
    return { score: sc ? sc.total : null, grade: sc ? sc.grade : null, items: sc ? sc.items.length : 0 };
  });
  await shot('13_photo_mode');
  await ev(() => window.__app.ui.photoMode(false));

  /* ── ⑧b 信标落地校验：信标必须落在"人能站住"的地面 ── */
  R.checks.beaconGround = await ev(() => {
    const w = window.__app.walk;
    const list = window.__objectives?.list || [];
    const rows = list.filter((o) => o._beacon).map((o) => {
      const p = o._beacon.node.position;
      const g = w.groundAt(p.x, p.z);
      return { id: o.id, name: o.name, beaconY: +p.y.toFixed(2), ground: +g.toFixed(2), gap: +(p.y - g).toFixed(2) };
    });
    return { rows, allOnGround: rows.every((r) => Math.abs(r.gap) <= 3) };
  });

  /* ── ⑧c 建筑洞察图鉴 + 等级解锁 ── */
  R.checks.codex = await ev(() => {
    const ins = window.__insights;
    const g = window.__game;
    return {
      insights: ins ? ins.total : 0,
      found: ins ? ins.found : 0,
      panelRows: document.querySelectorAll('#codexList .cxi').length,
      count: document.querySelector('#cxCount')?.textContent?.trim(),
      locked: document.querySelector('#codexBox')?.classList.contains('locked'),
      level: g?.level, xp: g?.xp,
      unlocks: g?.unlockList ? g.unlockList().map((u) => u.key + (u.got ? '✓' : '✗')) : null,
      codexUnlocked: !!(g?.unlocked && g.unlocked('codex')),
    };
  });
  await ev(() => window.__app.ui.openPanel('quest'));
  await shot('15_codex');

  /* 成长曲线可达性：一次性内容积分必须够到 Lv.5（图鉴解锁线），否则是死内容 */
  R.checks.xpCurve = await ev(() => {
    const g = window.__game;
    const missionXP = g.missions.reduce((a, m) => a + (m.reward || 0), 0);
    const badgeXP = 5 * 24, insightXP = 12 * 16;
    const total = missionXP + badgeXP + insightXP;
    const levelIfAll = 1 + Math.floor(total / (g.xpMax || 120));
    g.addXP(total, 'audit-full-content');   /* 模拟"全部内容收齐" */
    return {
      missionXP, badgeXP, insightXP, total,
      levelIfAll, codexLevel: 5,
      levelNow: g.level, codex: g.unlocked('codex'),
      rows: document.querySelectorAll('#codexList .cxi').length,
      unlocks: g.unlockList().map((u) => u.key + (u.got ? '✓' : '✗')),
      /* HUD 等级/积分必须跟随游戏层刷新 */
      hudLevel: document.querySelector('#lvNum')?.textContent?.trim(),
      hudXp: document.querySelector('#xpVal')?.textContent?.trim(),
      hudXpPct: document.querySelector('#xpPct')?.textContent?.trim(),
    };
  });
  await shot('16_codex_unlocked');

  /* ── ⑨ 性能 ── */
  R.checks.perf = await ev(async () => {
    const s = [];
    for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 400)); s.push(window.__stats); }
    const last = s[s.length - 1] || {};
    return { tris: last.tris, calls: last.calls, meshes: last.meshes, textures: last.textures, seats: last.seats, fps: last.fps };
  });

  /* ── ⑩ 按钮冒烟 ── */
  const btnIds = await p.$$eval('button', (els) => els.map((e) => e.id).filter(Boolean));
  const errBefore = logs.length;
  for (const id of btnIds) {
    await ev((i) => { const el = document.getElementById(i); if (el) el.click(); }, id);
    await p.waitForTimeout(40);
  }
  R.checks.clickErrors = logs.slice(errBefore).filter((s) => s.startsWith('PAGEERROR'));
  await shot('14_after_clicks');

  /* ── ⑪ 主入口可达性：从广场步行进入门厅（券洞必须真的能走进去） ── */
  R.checks.entrance = await ev(() => {
    const A = window.__app, w = A.walk;
    w.start(new window.__THREE.Vector3(0, 2, 200));
    w.yaw = Math.PI; w.pitch = 0;
    w.keys.add('KeyW');
    for (let i = 0; i < 420; i++) w.update(0.1);   /* 42s 模拟时间：走完 90m */
    w.keys.delete('KeyW');
    const pos = w.pos.toArray().map((v) => +v.toFixed(1));
    const g = +w.groundAt(pos[0], pos[2]).toFixed(2);
    w.stop();
    return {
      pos, ground: g,
      entered: pos[2] < 108,     /* 立面线在 z≈110.5，进入门厅需越过它 */
      onGround: g < 2,
    };
  });

  R.logs = logs;
  fs.writeFileSync(path.join(__dirname, '_audit2_report.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  console.log('\n=== 控制台 (' + logs.length + ') ===\n' + logs.slice(0, 30).join('\n'));
  await b.close();
})();
