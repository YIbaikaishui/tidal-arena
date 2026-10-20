/* site_test.cjs — 场所与环境自测：昼/夜/黄昏 + 俯视总平面 + 人视广场 + 城市肌理
   输出 tools/shots/site_*.png，并打印 {fps, calls, tris, consoleErrors, envStats}
   用法：node tools/site_test.cjs [extra]
     extra = 'env' → 只跑与 env/sky 相关的统计与截图（不依赖 arena 是否可加载）
*/
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const URL = 'http://127.0.0.1:8099/index.html?cb=' + Date.now();

(async () => {
  const b = await chromium.launch({
    executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
  });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  p.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e.message).slice(0, 300)));
  p.on('requestfailed', (r) => errors.push('REQFAIL: ' + r.url().slice(-70) + ' ' + (r.failure() || {}).errorText));

  const t0 = Date.now();
  await p.goto(URL, { waitUntil: 'load', timeout: 60000 });
  const ready = await p.waitForFunction('window.__ready===true', { timeout: 90000 }).then(() => true).catch(() => false);
  console.log('ready=', ready, 'boot_ms=', Date.now() - t0);
  if (!ready) console.log('bootError=', (await p.evaluate(() => window.__bootError || 'none')).slice(0, 900));
  await p.waitForTimeout(1200);

  /* ── 隐藏 HUD / 冻结相机自动更新（截图用） ── */
  const hideUI = () => p.evaluate(() => {
    const h = document.getElementById('hud'); if (h) h.style.display = 'none';
    const l = document.getElementById('loader'); if (l) l.style.display = 'none';
    if (window.__app && window.__app.orbit) window.__app.orbit.enabled = false;
  });

  /* ── 相机工具：设位置 + 目标，绕开 orbit 阻尼 ── */
  const cam = (pos, tgt) => p.evaluate(([pos, tgt]) => {
    const a = window.__app;
    if (a.orbit) { a.orbit.apply = function () {}; a.orbit.enabled = false; }
    const c = a.stage.camera;
    c.position.set(pos[0], pos[1], pos[2]);
    c.lookAt(tgt[0], tgt[1], tgt[2]);
    c.updateProjectionMatrix();
    c.updateMatrixWorld(true);
  }, [pos, tgt]);

  const setEnv = async (k) => {
    await p.evaluate((k) => { window.__app.ui.setEnv(k); }, k);
    // 等 1.2s 缓动 + 一帧
    await p.waitForTimeout(1900);
  };

  const stats = () => p.evaluate(() => {
    const s = window.__stats || {};
    const a = window.__app || {};
    const r = a.stage && a.stage.renderer;
    const info = r ? r.info : null;
    // env 单独统计
    let envTris = 0, envCalls = 0, groups = {};
    if (a.env && a.env.root) {
      a.env.root.traverse((o) => {
        if (o.isMesh || o.isLine) {
          const g = o.geometry;
          const tris = g && g.index ? g.index.count / 3 : (g ? g.attributes.position.count / 3 : 0);
          const n = o.isInstancedMesh ? o.count : 1;
          envTris += tris * n;
          envCalls += 1;
        }
      });
      Object.keys(a.env.groups || {}).forEach((k) => {
        let c = 0, t = 0;
        a.env.groups[k].traverse((o) => {
          if (o.isMesh || o.isLine) {
            const g = o.geometry;
            const tris = g && g.index ? g.index.count / 3 : (g ? g.attributes.position.count / 3 : 0);
            const n = o.isInstancedMesh ? o.count : 1;
            t += tris * n; c++;
          }
        });
        groups[k] = { calls: c, tris: Math.round(t) };
      });
    }
    return {
      fps: +(window.__fps || 0).toFixed(1),
      calls: s.calls, tris: s.tris,
      rendererCalls: info ? info.calls : null,
      rendererTris: info ? info.triangles : null,
      envCalls, envTris: Math.round(envTris), envGroups: groups,
      ents: a.env ? Object.keys(a.env.ents || {}) : [],
      trees: a.env && a.env.ents && a.env.ents.trees ? a.env.ents.trees.spec : '',
    };
  });

  await hideUI();

  /* ── 1. 夜景 hero（默认） ── */
  await setEnv('night');
  await cam([330, 250, 420], [0, 20, 0]);
  const heroNight = await stats();
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(OUT, 'site_night.png') });
  console.log('shot site_night.png');

  /* ── 2. 日间 hero ── */
  await setEnv('day');
  await p.waitForTimeout(400);
  const heroDay = await stats();
  await p.screenshot({ path: path.join(OUT, 'site_day.png') });
  console.log('shot site_day.png');

  /* ── 3. 黄昏 ── */
  await setEnv('dusk');
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, 'site_dusk.png') });
  console.log('shot site_dusk.png');

  /* ── 4. 俯视总平面 ── */
  await setEnv('day');
  await cam([0, 1000, 0.5], [0, 0, 0]);
  await p.waitForTimeout(700);
  await p.screenshot({ path: path.join(OUT, 'site_plan.png') });
  console.log('shot site_plan.png');

  /* ── 5. 人视看广场（南向，站在广场南端看向南门/水景/旗阵） ── */
  await cam([0, 2.4, 296], [0, 18, 120]);
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(OUT, 'site_plaza.png') });
  console.log('shot site_plaza.png');

  /* ── 6. 城市肌理（斜俯视看城市街区 + 主馆） ── */
  await cam([420, 190, -420], [-40, 10, 60]);
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(OUT, 'site_city.png') });
  console.log('shot site_city.png');

  /* ── 7. 夜景近景（看 4 组灯桥光斑 / 立面灯带） ── */
  await setEnv('night');
  await cam([150, 90, 210], [0, 10, 0]);
  await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(OUT, 'site_night_close.png') });
  console.log('shot site_night_close.png');

  /* ── 8. 性能采样（回到 hero 机位，跑 3 秒） ── */
  await cam([330, 250, 420], [0, 20, 0]);
  await setEnv('day');
  const samples = await p.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 300));
      out.push(window.__fps || 0);
    }
    return out;
  });
  const perf = await stats();
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;

  const report = {
    fps: +avg.toFixed(1),
    fpsSamples: samples.map((v) => +v.toFixed(0)),
    calls: perf.calls, tris: perf.tris,
    rendererCalls: perf.rendererCalls, rendererTris: perf.rendererTris,
    envCalls: perf.envCalls, envTris: perf.envTris,
    envGroups: perf.envGroups,
    trees: perf.trees, ents: perf.ents,
    consoleErrors: errors.length,
    errors: errors.slice(0, 12),
  };
  console.log('SITE_REPORT ' + JSON.stringify(report, null, 1));
  await b.close();
})();
