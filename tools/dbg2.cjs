const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: "C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe" });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://127.0.0.1:8099/index.html?cb="+Date.now());
  await p.waitForTimeout(3000);
  const r = await p.evaluate(async () => {
    const out = {};
    for (const [k,url] of [["ui","./src/ui.js?v=1"],["app","./src/app.js?v=1"]]) {
      try { await import(url); out[k]="ok"; } catch(e){ out[k]=String(e); }
    }
    return out;
  });
  console.log(JSON.stringify(r,null,1));
  await b.close();
})();
