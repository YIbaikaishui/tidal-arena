/* ══════════════════════════════════════════════════════════════════════
   hud_test.cjs — HUD 验收脚本（三档视口）
   · 截图 → tools/shots/hud_<w>x<h>.png
   · p.evaluate 两两求交检测面板矩形重叠 / 视口溢出
   · 点击所有按钮，收集 JS 错误 + 控制台错误
   · 打印 { fps, overlaps, overflow, errors }
   用法：node hud_test.cjs [--shots-only] [viewport]
   ══════════════════════════════════════════════════════════════════════ */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const URL = process.env.HUD_URL || 'http://127.0.0.1:8099/index.html';
const OUT = path.join(__dirname, process.env.HUD_OUT || 'shots');
const VIEWS = [
  { w: 1440, h: 900, name: 'desktop' },
  { w: 1024, h: 768, name: 'tablet' },
  { w: 390, h: 844, name: 'mobile' },
];

/* 需要检测重叠的顶层面板（顶栏 / 左右栏面板 / 底栏机位与模式 / 小地图 / 引导 / 照片条） */
const PANEL_SEL = [
  '.top', '.left .panel', '.right .panel', '.bottom .shots', '.bottom .modes',
  '#mmWrap', '.guide', '#photoBar',
];

async function run() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
  });
  const report = [];

  for (const v of VIEWS) {
    const page = await browser.newPage({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: 1 });
    const errors = [], consoleErrors = [];
    page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const t = m.text().slice(0, 240);
      /* favicon 之类的静态资源 404 不计入 UI 错误 */
      if (/Failed to load resource/.test(t) && /404/.test(t)) return;
      consoleErrors.push(t);
    });
    await page.goto(URL + '?cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForFunction('window.__ready===true', { timeout: 45000 }).catch(() => {});
    await page.evaluate(() => { const u = window.__app && window.__app.ui; if (u && u.openPanel) { u.openPanel(null); u.photoMode(false); } });
    await page.waitForTimeout(1600);

    /* ── 几何检测 ── */
    const geo = await page.evaluate((sels) => {
      const out = { overlaps: [], overflow: [], nodes: [] };
      const vw = window.innerWidth, vh = window.innerHeight;
      const rects = [];
      for (const sel of sels) {
        document.querySelectorAll(sel).forEach((el, i) => {
          const r = el.getBoundingClientRect();
          if (r.width < 2 || r.height < 2) return;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return;
          // 只统计自身所在的栏容器可见的
          if (el.closest('[data-collapsed="1"]') ) return;
          if (el.closest('.rail') && !el.closest('.panel')) return;
          const label = sel + (document.querySelectorAll(sel).length > 1 ? `#${i}` : '')
            + (el.id ? `[${el.id}]` : '');
          rects.push({ label, el, r });
          out.nodes.push({ label, x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
          if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) {
            out.overflow.push({ label, rect: [r.left, r.top, r.right, r.bottom].map(n => +n.toFixed(1)), vw, vh });
          }
        });
      }
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], b = rects[j];
          if (a.el.contains(b.el) || b.el.contains(a.el)) continue;  // 嵌套不算
          const x = Math.max(0, Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left));
          const y = Math.max(0, Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top));
          if (x > 1.5 && y > 1.5) {
            out.overlaps.push({ a: a.label, b: b.label, area: +(x * y).toFixed(0) });
          }
        }
      }
      return out;
    }, PANEL_SEL);

    /* ── 内容被裁剪检测（真实溢出：子元素横向溢出容器 / 纵向内容被 hidden 截断）── */
    const clip = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll('.panel, .left, .right, #hud').forEach((el) => {
        const cs = getComputedStyle(el);
        if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') {
          bad.push({ label: (el.id || el.className) + ' scrollW', sw: el.scrollWidth, cw: el.clientWidth });
        }
      });
      // 逐面板子项：任何子元素右边界超出面板右边界
      document.querySelectorAll('.panel').forEach((el) => {
        const pr = el.getBoundingClientRect();
        el.querySelectorAll('*').forEach((c) => {
          const r = c.getBoundingClientRect();
          if (r.width > 1 && (r.right > pr.right + 1.5 || r.left < pr.left - 1.5)) {
            const k = (el.id || 'panel') + ' < ' + (c.id || c.className || c.tagName);
            if (!bad.find(b => b.label === k)) bad.push({ label: k, right: +r.right.toFixed(1), pRight: +pr.right.toFixed(1) });
          }
        });
      });
      return bad;
    });

    /* ── 点击全部按钮 ── */
    const clickReport = await page.evaluate(async () => {
      const out = { clicked: 0, failed: [] };
      const btns = Array.from(document.querySelectorAll('#hud button, #help button, .sheet.on button'))
        .filter((b) => !b.disabled && b.offsetParent !== null && !b.closest('.hidden'));
      for (const b of btns) {
        try {
          b.click();
          out.clicked++;
          await new Promise((r) => setTimeout(r, 12));
        } catch (e) {
          out.failed.push((b.id || b.className) + ': ' + e.message);
        }
      }
      // 复原：复位
      document.getElementById('btnReset') && document.getElementById('btnReset').click();
      return out;
    });
    await page.waitForTimeout(500);

    /* ── 契约检查 ── */
    const api = await page.evaluate(() => {
      const u = window.__app && window.__app.ui;
      if (!u) return { ok: false };
      const must = ['update', 'toast', 'INTRO', 'goShot', 'setEnv', 'setMat', 'setExplode', 'setSection',
        'postBoot', 'S', 'setLayer', 'openPanel', 'setMobile', 'photoMode', 'getLayout'];
      return { ok: true, missing: must.filter((k) => !(k in u)), keys: Object.keys(u), layout: u.getLayout && u.getLayout() };
    });

    const ids = await page.evaluate(() => {
      const need = ['btnEnv', 'btnWalk', 'btnTour', 'btnStory', 'btnFlow', 'btnFlowMode', 'capNum', 'questList',
        'layerList', 'rgExplode', 'rgSection', 'btnSecToggle', 'gridView', 'segMat', 'shotList', 'help',
        'helpClose', 'czGrid', 'tierBars', 'lvNum', 'xpFill', 'flowPct', 'flOut', 'flLeft', 'flTime',
        'roSeat', 'roTier', 'roZone', 'roRow', 'roDist', 'roFps', 'questPct', 'capMode', 'capSub',
        'cxWheel', 'cxVip', 'cxPress', 'exVal', 'secVal', 'layerCount', 'btnReset', 'btnHelp', 'btnSound',
        'envName', 'envDot', 'walkHint', 'hoverTip', 'gArrow', 'gName', 'gDist', 'mm'];
      return need.filter((id) => !document.getElementById(id));
    });

    const fps = await page.evaluate(() => Math.round(window.__fps || 0));

    /* ── 截图 ── */
    const shot = path.join(OUT, `hud_${v.w}x${v.h}_${v.name}.png`);
    await page.screenshot({ path: shot });

    /* 交互态截图：打开一层抽屉/设置/帮助 */
    const hasUI = await page.evaluate(() => !!(window.__app && window.__app.ui && window.__app.ui.openPanel));
    if (hasUI) {
      if (v.w < 768) {
        await page.evaluate(() => { window.__app.ui.openPanel('quest'); });
        await page.waitForTimeout(420);
        await page.screenshot({ path: path.join(OUT, `hud_${v.w}x${v.h}_${v.name}_drawer.png`) });
        await page.evaluate(() => { window.__app.ui.openPanel(null); });
      } else if (v.w < 1280) {
        await page.evaluate(() => { window.__app.ui.openPanel('cap'); });
        await page.waitForTimeout(420);
        await page.screenshot({ path: path.join(OUT, `hud_${v.w}x${v.h}_${v.name}_flyout.png`) });
        await page.evaluate(() => { window.__app.ui.openPanel(null); });
      } else {
        await page.evaluate(() => { window.__app.ui.openPanel('help'); });
        await page.waitForTimeout(360);
        await page.screenshot({ path: path.join(OUT, `hud_${v.w}x${v.h}_${v.name}_help.png`) });
        await page.evaluate(() => { window.__app.ui.openPanel(null); });
      }
    }

    report.push({
      viewport: `${v.w}x${v.h}`, shot, fps,
      overlaps: geo.overlaps, overflow: geo.overflow, clip,
      errors, consoleErrors, clicked: clickReport.clicked, clickFailed: clickReport.failed,
      missingIds: ids, apiMissing: api.missing || ['NO__app.ui'], layout: api.layout,
    });
    await page.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'hud_report.json'), JSON.stringify(report, null, 2));
  for (const r of report) {
    console.log('\n════ ' + r.viewport + ' ════');
    console.log('shot        :', r.shot);
    console.log('fps         :', r.fps);
    console.log('overlaps    :', r.overlaps.length ? JSON.stringify(r.overlaps) : '[]  ✓');
    console.log('overflow    :', r.overflow.length ? JSON.stringify(r.overflow) : '[]  ✓');
    console.log('clip        :', r.clip.length ? JSON.stringify(r.clip) : '[]  ✓');
    console.log('errors      :', r.errors.length ? JSON.stringify(r.errors) : '[]  ✓');
    console.log('consoleErr  :', r.consoleErrors.length ? JSON.stringify(r.consoleErrors) : '[]  ✓');
    console.log('clicked     :', r.clicked, 'failed:', JSON.stringify(r.clickFailed));
    console.log('missingIds  :', JSON.stringify(r.missingIds));
    console.log('apiMissing  :', JSON.stringify(r.apiMissing));
    console.log('layout      :', JSON.stringify(r.layout));
  }
}
run().catch((e) => { console.error(e); process.exit(1); });

