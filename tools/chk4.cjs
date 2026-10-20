const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage();
  p.on('pageerror', async (e) => {
    console.log('PAGE', e.message);
    console.log('STACK', e.stack);
  });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now(), { waitUntil:'domcontentloaded' });
  await p.waitForTimeout(3000);
  // 直接逐个 import 模块找元凶
  const files = ['lib/core.js','lib/sections.js','lib/rings.js','lib/seats.js','lib/textures.js','lib/orbit.js','lib/walk.js','lib/draft.js','lib/modes.js','lib/postfx.js','scenes/sky.js','scenes/arena.js','scenes/env.js','ui.js','app.js'];
  for (const f of files) {
    const r = await p.evaluate(async (u) => { try { await import(u); return 'ok'; } catch(e) { return 'ERR ' + e.message; } }, './src/'+f+'?x='+Date.now());
    console.log(f, r);
  }
  await b.close();
})();
