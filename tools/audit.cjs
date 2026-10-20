/* 全量审计：控制台错误 / 性能 / 各表达模式截图 / UI 交互冒烟测试 */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');
const OUT = path.join(__dirname, 'audit');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch({
    executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
  });
  const p = await b.newPage({ viewport: { width: 1600, height: 980 } });
  const logs = [];
  p.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  p.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  p.on('requestfailed', (r) => logs.push('REQFAIL: ' + r.url().slice(0, 100) + ' ' + (r.failure() || {}).errorText));

  const t0 = Date.now();
  await p.goto('http://127.0.0.1:8099/index.html?cb=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
  const ok = await p.waitForFunction('window.__ready===true', { timeout: 90000 }).then(() => true).catch(() => false);
  console.log('ready=', ok, 'boot_ms=', Date.now() - t0);
  if (!ok) console.log('bootError=', await p.evaluate(() => window.__bootError));
  await p.waitForTimeout(1500);

  // 性能采样
  const perf = await p.evaluate(async () => {
    const samples = [];
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 250));
      samples.push(window.__fps || 0);
    }
    return { fps: samples, stats: window.__stats || {}, ready: window.__ready };
  });
  console.log('PERF', JSON.stringify(perf));

  const shot = async (name) => {
    await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(OUT, name + '.png') });
    console.log('shot', name, 'fps', await p.evaluate(() => window.__fps));
  };

  const ev = (fn, arg) => p.evaluate(fn, arg).then(r => r).catch(e => ({ err: String(e).slice(0, 200) }));

  // 1. 夜赛 hero
  await ev(() => { window.__app.ui.goShot('hero'); });
  await shot('01_night_hero');
  // 2. 日间 hero
  console.log('day=', JSON.stringify(await ev(() => { window.__app.ui.setEnv('day'); return 1; })));
  await shot('02_day_hero');
  // 3. 白模
  await ev(() => window.__app.ui.setMat('white'));
  await shot('03_white');
  // 4. X 光
  await ev(() => window.__app.ui.setMat('xray'));
  await shot('04_xray');
  // 5. 拆解
  await ev(() => { window.__app.ui.setMat('material'); window.__app.ui.setExplode(60); });
  await shot('05_explode');
  await ev(() => window.__app.ui.setExplode(0));
  // 6. 剖切
  await ev(() => window.__app.ui.setSection(true, 0));
  await shot('06_section');
  await ev(() => window.__app.ui.setSection(false, 0));
  // 7. 各视图
  for (const v of ['plan', 'front', 'left', 'pitch']) {
    await ev((v) => window.__app.ui.goShot(v), v);
    await shot('07_view_' + v);
  }
  // 8. 返回 hero
  await ev(() => window.__app.ui.goShot('hero'));

  // UI 冒烟：点所有按钮
  const btns = await p.$$eval('button', els => els.map((e, i) => ({ i, id: e.id || '', t: (e.textContent || '').trim().slice(0, 16) })));
  console.log('buttons=', btns.length, JSON.stringify(btns.map(b => b.id || b.t)));
  const clickRes = [];
  for (const b2 of btns) {
    if (!b2.id && !b2.t) continue;
    const errBefore = logs.length;
    try {
      await p.evaluate(({ id, t }) => {
        let el = id ? document.getElementById(id) : null;
        if (!el) el = [...document.querySelectorAll('button')].find(e => (e.textContent || '').trim().slice(0, 16) === t);
        if (el) el.click();
      }, b2);
      await p.waitForTimeout(120);
      const errs = logs.slice(errBefore).filter(s => s.startsWith('PAGEERROR') || s.startsWith('error:'));
      clickRes.push({ id: b2.id || b2.t, err: errs[0] || null });
      if (errs.length) await ev(() => window.__app.ui.goShot('hero'));
    } catch (e) { clickRes.push({ id: b2.id || b2.t, err: String(e).slice(0, 120) }); }
  }
  console.log('CLICK_ERRORS', JSON.stringify(clickRes.filter(c => c.err)));
  await shot('08_after_clicks');

  // 交互：漫游（walk.start 是真实入口；旧脚本误用不存在的 walk.enter）
  await ev(() => { window.__app.ui.setEnv('night'); window.__app.ui.goShot('hero'); });
  await ev(() => { if (window.__app.walk.start) window.__app.walk.start(new window.__THREE.Vector3(0, 2, 200)); });
  await p.waitForTimeout(1200);
  await p.keyboard.down('w'); await p.waitForTimeout(1200); await p.keyboard.up('w');
  await shot('09_walk');
  const walkState = await ev(() => ({ active: window.__app.walk.active, pos: window.__app.stage.camera.position.toArray().map(v => +v.toFixed(1)) }));
  console.log('WALK', JSON.stringify(walkState));

  console.log('--- CONSOLE (' + logs.length + ') ---');
  console.log(logs.slice(0, 80).join('\n'));
  await b.close();
})();

