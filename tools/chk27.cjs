const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage();
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  const r = await p.evaluate(() => {
    const inst = window.__app.arena.groups.seats.children[0];
    const srgb = window.__app.arena.groups.seats.children[0].instanceColor;
    const arr = Array.from(inst.instanceColor.array.slice(0, 12));
    return { type: inst.instanceColor.constructor.name, first12: arr.map(v=>+v.toFixed(3)),
      colorAttrSet: !!inst.geometry.getAttribute('color') };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
