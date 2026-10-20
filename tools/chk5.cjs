const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const res = await fetch('./src/scenes/arena.js').then(r=>r.text());
    const lines = res.split('\n');
    const out = [];
    lines.forEach((l,i)=>out.push((i+1)+': '+l));
    return { n: lines.length, tail: out.slice(0,0), sample: out.filter(x=>/ \+'|'\+ |\+ '/.test(x)).slice(0,10) };
  });
  console.log(JSON.stringify(r, null, 1).slice(0, 2500));
  await b.close();
})();
