const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForTimeout(1200);
  const r = await p.evaluate(async () => {
    const res = await fetch('./src/scenes/arena.js').then(r=>r.text());
    // 用 blob url 载入以获得真实行列
    const url = URL.createObjectURL(new Blob([res], {type:'text/javascript'}));
    try { await import(url); return 'ok'; } catch(e) { return e.message + ' | ' + (e.stack||'').slice(0,300); }
  });
  console.log(r);
  await b.close();
})();
