const { chromium } = require('playwright-core');
const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

const R = {};

async function boot(p) {
  await p.goto('http://127.0.0.1:8099/index.html');
  await p.waitForFunction('window.__ready === true', null, { timeout: 60000 });
  await p.waitForFunction('window.__gameApi', null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(2000);
}

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });

  /* ── 1. 桌面 1440×900 图集 ── */
  {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await boot(p);
    const shot = async (n, fn) => { if (fn) await p.evaluate(fn); await p.waitForTimeout(1300); await p.screenshot({ path: `audit/f_${n}.png` }); };
    await shot('01_night');
    await shot('02_day', () => document.querySelector('#btnEnv').click());
    await shot('03_day2', () => document.querySelector('#btnEnv').click());
    await shot('04_night2', () => document.querySelector('#btnEnv').click());
    await shot('05_hero', () => window.__app.orbit.snapTo({ dist: 330, az: 0.62, el: 0.30, target: { x: 0, y: 20, z: 0 } }));
    await shot('06_close', () => window.__app.orbit.snapTo({ dist: 165, az: 1.05, el: 0.18, target: { x: 0, y: 24, z: 30 } }));
    await shot('07_inside', () => window.__app.orbit.snapTo({ dist: 95, az: 2.2, el: 0.12, target: { x: 0, y: 8, z: 0 } }));
    R.desktop = { errs, stats: await p.evaluate(() => window.__stats) };
    await p.close();
  }

  /* ── 2. 漫游模式 ── */
  {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await boot(p);
    await p.evaluate(() => document.querySelector('#btnWalk').click());
    await p.waitForTimeout(1500);
    const st = await p.evaluate(() => ({
      active: !!(window.__app.walk && window.__app.walk.active),
      pos: window.__app.walk && window.__app.walk.pos ? window.__app.walk.pos.toArray().map(v => +v.toFixed(1)) : null,
      bodyWalking: document.body.classList.contains('walking'),
      mode: window.__game ? window.__game.mode : null,
    }));
    // 走两步
    await p.keyboard.down('KeyW');
    await p.waitForTimeout(1400);
    await p.keyboard.up('KeyW');
    const st2 = await p.evaluate(() => ({ pos: window.__app.walk.pos.toArray().map(v => +v.toFixed(1)) }));
    await p.screenshot({ path: 'audit/f_10_walk.png' });
    // Esc 退出
    await p.keyboard.press('Escape');
    await p.waitForTimeout(700);
    const st3 = await p.evaluate(() => ({ active: !!window.__app.walk.active, bodyWalking: document.body.classList.contains('walking') }));
    R.walk = { enter: st, moved: st2, exit: st3, errs };
    await p.close();
  }

  /* ── 3. 游戏层 ── */
  {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await boot(p);
    R.game = await p.evaluate(() => {
      const g = window.__game, gp = window.__gameApi;
      const out = {
        hasGame: !!g, level: g && g.level, xp: g && g.xp,
        missions: g && g.missions ? g.missions.length : (gp && gp.missions ? gp.missions.length : 0),
        badgesKeys: window.__badges ? Object.keys(window.__badges) : null,
        badgeCount: (() => {
          const bd = window.__badges;
          if (!bd) return 0;
          if (Array.isArray(bd.list)) return bd.list.length;
          if (typeof bd.list === 'function') return bd.list().length;
          if (Array.isArray(bd.items)) return bd.items.length;
          return 'n/a';
        })(),
        evac: !!window.__evac, build: !!window.__build, photo: !!window.__photo,
        timings: gp && gp.timings, errors: gp && gp.errors,
      };
      try { if (window.__evac && typeof window.__evac.run === 'function') { window.__evac.run(); out.evacRan = true; } else out.evacKeys = window.__evac ? Object.keys(window.__evac) : null; } catch (e) { out.evacErr = String(e); }
      try { if (window.__build && typeof window.__build.setPhase === 'function') { window.__build.setPhase(3); out.buildSet = true; } } catch (e) { out.buildErr = String(e); }
      return out;
    });
    await p.waitForTimeout(2500);
    R.gameAfter = await p.evaluate(() => ({
      evacPeak: window.__evac && window.__evac.state ? window.__evac.state.peak : null,
      buildPhase: window.__build && window.__build.phase,
      fps: +window.__stats.fps.toFixed(1),
    }));
    await p.screenshot({ path: 'audit/f_11_game.png' });
    await p.close();
  }

  /* ── 4. 移动端 390×844 ── */
  {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    try {
      await boot(p);
      await p.screenshot({ path: 'audit/f_12_mobile.png' });
      R.mobile = await p.evaluate(() => {
        const de = document.documentElement;
        const overflowX = de.scrollWidth - de.clientWidth;
        const overflowY = de.scrollHeight - de.clientHeight;
        const q = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), vis: getComputedStyle(e).display !== 'none' }; };
        const ids = ['hud', 'hudTop', 'hudLeft', 'dock', 'minimap', 'hudRight'];
        const boxes = {};
        for (const id of ids) boxes[id] = q('#' + id);
        return { overflowX, overflowY, stats: window.__stats, boxes };
      });
      R.mobile.errs = errs;
    } catch (e) { R.mobile = { err: String(e) }; }
    await p.close();
  }

  /* ── 5. 平板 1024×768 ── */
  {
    const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
    await boot(p).catch(() => {});
    await p.screenshot({ path: 'audit/f_13_tablet.png' });
    R.tablet = await p.evaluate(() => ({ overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    await p.close();
  }

  console.log(JSON.stringify(R, null, 1));
  await b.close();
})();
