const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGE ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('ERR ' + m.text().slice(0,160)); });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 45000 }).catch(()=>{});
  await p.waitForTimeout(1500);
  console.log('errors:', errs.length ? errs.slice(0,10).join('\n') : 'none');
  // 各视图 + 模式切换
  const acts = [
    ['m01_hero', async () => { await p.evaluate(()=>window.__app.ui.goShot('hero')); }],
    ['m02_plan', async () => { await p.evaluate(()=>window.__app.ui.setView('plan')); }],
    ['m03_front', async () => { await p.evaluate(()=>window.__app.ui.setView('front')); }],
    ['m04_left', async () => { await p.evaluate(()=>window.__app.ui.setView('left')); }],
    ['m05_section', async () => { await p.evaluate(()=>{window.__app.ui.setView('section'); window.__app.ui.S.section=true; window.__app.modes.setSection(true, {x:-1,y:0,z:0}, 0);}); }],
    ['m06_persp', async () => { await p.evaluate(()=>{window.__app.modes.setSection(false); window.__app.ui.setView('persp'); window.__app.ui.goShot('inside');}); }],
    ['m07_white', async () => { await p.evaluate(()=>window.__app.modes.setMode('white')); }],
    ['m08_xray', async () => { await p.evaluate(()=>window.__app.modes.setMode('xray')); }],
    ['m09_mat', async () => { await p.evaluate(()=>window.__app.modes.setMode('material')); }],
    ['m10_explode', async () => { await p.evaluate(()=>{window.__app.modes.setExplode(0.75);}); }],
    ['m11_day', async () => { await p.evaluate(()=>{window.__app.modes.setExplode(0); window.__app.ui.setEnv('day');}); }],
    ['m12_dusk', async () => { await p.evaluate(()=>window.__app.ui.setEnv('dusk')); }],
  ];
  for (const [n, fn] of acts) {
    try { await fn(); } catch(e) { console.log(n, 'ACTION FAIL', e.message.slice(0,120)); }
    await p.waitForTimeout(650);
    await p.screenshot({ path: 'shots/' + n + '.png' });
  }
  console.log('errors after:', errs.length ? errs.slice(0,10).join('\n') : 'none');
  console.log('stats', JSON.stringify(await p.evaluate(()=>window.__stats)));
  await b.close();
})();
