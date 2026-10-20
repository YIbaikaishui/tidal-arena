/* ═══════════════════════════════════════════════════════════════════════
   play_test.cjs — 相机与表达模式（task-3）自动验收
   · 漫游：active / W 前进 / 外墙四向不穿 / 券洞可通行 / 相机不低于地面 /
           R 巡游 / Tab 切换 / Esc 退出
   · 材质三态 20 次循环：透明材质数量与初始一致（无残留）
   · 爆炸 0→100→0：groups.roof.position.y 归零、立面缩放复原、透明度复原
   · 剖切：renderer.clippingPlanes.length 正确 + 剖面填充可见
   · 后期：setQuality 三档
   · 截图：tools/shots/play_walk.png / play_explode.png / play_section.png / play_xray.png
   用法： node play_test.cjs      (需要 127.0.0.1:8099 静态服务)
   ═══════════════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const URL = 'http://127.0.0.1:8099/index.html';
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (detail !== undefined ? '  → ' + detail : ''));
}

(async () => {
  const b = await chromium.launch({
    executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
  });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 240)); });
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + (e.message || '').slice(0, 240)));

  console.log('· 加载 ' + URL);
  await p.goto(URL + '?cb=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
  const ready = await p.waitForFunction('window.__ready===true', { timeout: 90000 }).then(() => true).catch(() => false);
  if (!ready) {
    console.log('启动失败:', await p.evaluate(() => window.__bootError || '(无)'));
    await b.close();
    process.exit(2);
  }
  await p.waitForTimeout(1500);
  const ev = (fn, arg) => p.evaluate(fn, arg);
  const hideHud = (on) => ev((v) => { document.getElementById('hud').style.display = v ? 'none' : ''; }, on);
  /* 直接用 orbit.snapTo 定机位（ui.goShot 是带缓动的异步动画，测试里不用它） */
  const setCam = async (target, dist, az, el, settle = 1500) => {
    await ev(({ target, dist, az, el }) => {
      window.__app.orbit.snapTo({ target, dist, az, el });
    }, { target, dist, az, el });
    await p.waitForTimeout(settle);
  };
  const shot = async (n) => { await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, n + '.png') }); console.log('  · 截图 shots/' + n + '.png'); };

  const R_Z = (s) => 52.5 + s;                 // 沿 ±z（长轴）墙面半径
  const R_X = (s) => (34 + s) * (1 - 0.36);    // 沿 ±x 直边段墙面半径（hx - r，r = 0.36·hx）
  const OUTER = await ev(() => window.__app.arena.GEO.outerS);

  /* ─── 1. 漫游 ─── */
  console.log('\n【1】第一人称漫游');
  await ev(() => {
    window.__app.walk.start(new (window.__app.stage.camera.position.constructor)(0, 2.0, 200));
    window.__app.orbit.enabled = false;
    document.getElementById('hud').style.display = 'none';
  });
  await p.waitForTimeout(900);
  const st0 = await ev(() => {
    const w = window.__app.walk, c = window.__app.stage.camera;
    return { active: w.active, camY: c.position.y, ground: w.groundAt(w.pos.x, w.pos.z) };
  });
  check('walk.active === true', st0.active === true, String(st0.active));
  check('相机 y ≥ 地面 + 1.6', st0.camY >= st0.ground + 1.55, `camY=${st0.camY.toFixed(2)} ground=${st0.ground.toFixed(2)}`);

  const p0 = await ev(() => window.__app.walk.pos.toArray());
  await p.keyboard.down('w');
  await p.waitForTimeout(2000);
  await p.keyboard.up('w');
  await p.waitForTimeout(150);
  const p1 = await ev(() => window.__app.walk.pos.toArray());
  const moved = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
  check('按 W 2s 位移 > 3m', moved > 3, moved.toFixed(2) + ' m');
  const gAfter = await ev(() => {
    const w = window.__app.walk;
    return { camY: window.__app.stage.camera.position.y, g: w.groundAt(w.pos.x, w.pos.z) };
  });
  check('行走后相机仍高于地面', gAfter.camY >= gAfter.g - 0.01, `camY=${gAfter.camY.toFixed(2)} g=${gAfter.g.toFixed(2)}`);

  /* 撞墙 4 向：起点场内硬地，朝外冲 3s */
  const wallTests = [
    { name: '+z 南', yaw: 0, from: [0, 62], rOut: R_Z(OUTER + 0.4) },
    { name: '-z 北', yaw: Math.PI, from: [0, -62], rOut: R_Z(OUTER + 0.4) },
    { name: '+x 东', yaw: Math.PI / 2, from: [-62, 0], rOut: R_X(OUTER + 0.4) },
    { name: '-x 西', yaw: -Math.PI / 2, from: [62, 0], rOut: R_X(OUTER + 0.4) },
  ];
  for (const t of wallTests) {
    await ev(({ from, yaw }) => {
      const w = window.__app.walk;
      w.toggleAuto(false);
      w.pos.set(from[0], 1.6, from[1]);
      w.yaw = yaw; w.pitch = 0; w.vel.set(0, 0);
    }, t);
    await p.waitForTimeout(250);
    await p.keyboard.down('Shift');
    await p.keyboard.down('w');
    await p.waitForTimeout(3000);
    await p.keyboard.up('w');
    await p.keyboard.up('Shift');
    const r = await ev(() => {
      const w = window.__app.walk;
      return { r: Math.hypot(w.pos.x, w.pos.z), x: +w.pos.x.toFixed(1), z: +w.pos.z.toFixed(1) };
    });
    check('外墙不穿 ' + t.name, r.r <= t.rOut + 0.6, `r=${r.r.toFixed(2)} ≤ 墙面 ${t.rOut.toFixed(2)} (x=${r.x}, z=${r.z})`);
  }

  /* 券洞可通行：+z 主券洞（u=0.5）正对面，朝内冲 4.5s */
  await ev(() => {
    const w = window.__app.walk;
    w.pos.set(0, 1.6, 168); w.yaw = Math.PI; w.pitch = 0; w.vel.set(0, 0);
  });
  await p.waitForTimeout(250);
  await p.keyboard.down('Shift');
  await p.keyboard.down('w');
  await p.waitForTimeout(4500);
  await p.keyboard.up('w');
  await p.keyboard.up('Shift');
  const door = await ev(() => {
    const w = window.__app.walk;
    return { z: w.pos.z, r: Math.hypot(w.pos.x, w.pos.z) };
  });
  check('南主券洞可通行（穿入立面内侧）', door.z < R_Z(OUTER) - 2, `z=${door.z.toFixed(2)}（墙面 ${R_Z(OUTER).toFixed(1)}）`);
  await shot('play_walk');

  /* R 巡游 */
  await ev(() => { const w = window.__app.walk; w.pos.set(0, 2, 190); w.toggleAuto(true); });
  await p.waitForTimeout(400);
  const a0 = await ev(() => window.__app.walk.pos.toArray());
  await p.waitForTimeout(5000);
  const a1 = await ev(() => ({ pos: window.__app.walk.pos.toArray(), auto: window.__app.walk.auto }));
  const autoMoved = Math.hypot(a1.pos[0] - a0[0], a1.pos[2] - a0[2]);
  check('R 自动巡游 5s 后位置变化 > 2m', autoMoved > 2, autoMoved.toFixed(2) + ' m');
  await p.keyboard.press('Tab');
  const autoOff = await ev(() => window.__app.walk.auto);
  check('Tab 手动/自动切换', autoOff === false, 'auto=' + autoOff);

  /* Esc 退出 */
  await p.keyboard.press('Escape');
  await p.waitForTimeout(1000);
  const esc = await ev(() => ({ active: window.__app.walk.active, orbit: window.__app.orbit.enabled }));
  check('Esc 退出漫游 (active=false)', esc.active === false, JSON.stringify(esc));
  await ev(() => { window.__app.orbit.enabled = true; });

  /* ─── 2. 材质三态无残留 ─── */
  console.log('\n【2】材质 / 白模 / X-ray 三态无残留');
  const cnt = () => ev(() => {
    const a = window.__app; let n = 0, meshes = 0;
    a.stage.scene.traverse((o) => {
      if (!o.isMesh) return; meshes++;
      [].concat(o.material).forEach((m) => { if (m && m.transparent) n++; });
    });
    return { trans: n, meshes, saved: a.modes._saved.size, mode: a.modes.mode };
  });
  const c0 = await cnt();
  const cyc = await ev(() => {
    const a = window.__app;
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) { a.modes.setMode('white'); a.modes.setMode('xray'); a.modes.setMode('material'); }
    return { ms: performance.now() - t0, mode: a.modes.mode };
  });
  const c1 = await cnt();
  check('20 次循环后透明材质数量与初始一致', c0.trans === c1.trans, `${c0.trans} → ${c1.trans}（mesh ${c0.meshes}）`);
  check('20 次循环后无材质替换残留 (_saved=0)', c1.saved === 0, 'saved=' + c1.saved);
  check('最终回到材质模式', c1.mode === 'material', c1.mode + `，耗时 ${cyc.ms.toFixed(0)}ms`);

  /* ─── 3. 爆炸 0→100→0 ─── */
  console.log('\n【3】分层爆炸 0 → 100 → 0');
  await ev(() => { window.__app.modes.setMode('material'); window.__app.orbit.stopAuto(); });
  await ev(() => { window.__app.modes.setExplode(100); });
  await setCam([0, 24, 0], 620, -1.22, 0.28, 1200);
  await p.waitForTimeout(3000);
  const e1 = await ev(() => {
    const g = window.__app.arena.groups;
    return { roofY: +g.roof.position.y.toFixed(2), facadeS: +g.facade.scale.x.toFixed(3), pitchY: +g.pitch.position.y.toFixed(2), explode: +window.__app.modes.explode.toFixed(3) };
  });
  check('爆炸 100：屋盖抬升 > 40m', e1.roofY > 40, `roof.y=${e1.roofY}`);
  check('爆炸 100：立面外扩 > 1.2×', e1.facadeS > 1.2, `facade.scale.x=${e1.facadeS}`);
  check('爆炸 100：场地下沉 > 8m', e1.pitchY < -8, `pitch.y=${e1.pitchY}`);
  await hideHud(true);
  await shot('play_explode');
  await ev(() => window.__app.modes.setExplode(0));
  await p.waitForTimeout(3500);
  const e2 = await ev(() => {
    const g = window.__app.arena.groups;
    return { roofY: +g.roof.position.y.toFixed(6), facadeS: +g.facade.scale.x.toFixed(6), pitchY: +g.pitch.position.y.toFixed(6) };
  });
  check('归零后 groups.roof.position.y 回到 0', Math.abs(e2.roofY) < 1e-6, 'roof.y=' + e2.roofY);
  check('归零后立面缩放回到 1', Math.abs(e2.facadeS - 1) < 1e-6, 'facade.scale.x=' + e2.facadeS);
  check('归零后场地位置回到 0', Math.abs(e2.pitchY) < 1e-6, 'pitch.y=' + e2.pitchY);
  const c2 = await cnt();
  check('爆炸归零后透明材质数量复原', c2.trans === c0.trans, `${c2.trans} vs ${c0.trans}`);
  await hideHud(false);

  /* ─── 4. 剖切 ─── */
  console.log('\n【4】剖切');
  const s0 = await ev(() => window.__app.stage.renderer.clippingPlanes.length);
  check('初始 clippingPlanes.length === 0', s0 === 0, '= ' + s0);
  await ev(() => window.__app.modes.setSection(true, new (window.__app.stage.camera.position.constructor)(0, 0, -1), 0));
  await p.waitForTimeout(400);
  const s1 = await ev(() => {
    const a = window.__app;
    const f = a.modes._fill;
    return { n: a.stage.renderer.clippingPlanes.length, fill: !!(f && f.A && f.A.visible) };
  });
  check('开启后 clippingPlanes.length === 1', s1.n === 1, '= ' + s1.n);
  check('剖面填充体可见', s1.fill === true, 'fill=' + s1.fill);
  await setCam([0, 22, 0], 330, -1.52, 0.10, 1200);
  await hideHud(true);
  await shot('play_section');
  await ev(() => window.__app.modes.setSection(false));
  await p.waitForTimeout(400);
  const s2 = await ev(() => window.__app.stage.renderer.clippingPlanes.length);
  check('关闭后 clippingPlanes.length === 0', s2 === 0, '= ' + s2);

  /* ─── 5. X-ray ─── */
  console.log('\n【5】X-ray 表达');
  await ev(() => window.__app.modes.setMode('xray'));
  await setCam([0, 20, 0], 520, -1.28, 0.30, 1200);
  await shot('play_xray');
  await ev(() => window.__app.modes.setMode('material'));

  /* ─── 6. 后期画质档位 ─── */
  console.log('\n【6】后期画质档位');
  await hideHud(false);
  await setCam([0, 16, 0], 660, -1.5, 0.44, 1200);
  const q = await ev(async () => {
    const a = window.__app, out = {};
    for (const lv of ['low', 'mid', 'high']) {
      a.fx.setQuality(lv);
      await new Promise((r) => setTimeout(r, 900));
      out[lv] = { bloom: a.fx.bloomEnabled, grain: +a.fx.compose.uniforms.grain.value.toFixed(3) };
    }
    a.fx.setQuality('high');
    return out;
  });
  check('setQuality 三档：low 关 bloom、mid/high 开', q.low.bloom === false && q.mid.bloom === true && q.high.bloom === true, JSON.stringify(q));

  /* ─── 7. 性能 ─── */
  console.log('\n【7】性能（1440×900，静止 hero 机位）');
  await p.waitForTimeout(2500);
  const perf = await ev(async () => {
    const s = [];
    for (let i = 0; i < 10; i++) { await new Promise((r) => setTimeout(r, 260)); s.push(window.__fps || 0); }
    s.sort((a, b) => a - b);
    return { med: s[s.length >> 1], min: s[0], stats: window.__stats || {}, quality: window.__app.stage.quality };
  });
  check('1440×900 中位 fps ≥ 55', perf.med >= 55, `median=${perf.med.toFixed(1)} min=${perf.min.toFixed(1)} quality=${perf.quality}`);
  console.log('  性能读数：' + JSON.stringify(perf.stats));

  /* ─── 8. 控制台 ─── */
  console.log('\n【8】控制台');
  const realErrs = errs.filter((s) => !/404|Failed to load resource/i.test(s));
  check('无 JS 运行时错误', realErrs.length === 0, realErrs.length ? realErrs.slice(0, 3).join(' | ') : '0 条（已忽略 404 资源）');

  const bad = results.filter((r) => !r.pass);
  console.log('\n═══ 结果：' + (results.length - bad.length) + '/' + results.length + ' 通过 ═══');
  if (bad.length) bad.forEach((r) => console.log('  FAIL ' + r.name + '  → ' + r.detail));
  await b.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('测试脚本异常：', e); process.exit(3); });
