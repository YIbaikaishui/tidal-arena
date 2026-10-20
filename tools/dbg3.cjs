const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: "C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe" });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const logs=[];
  p.on("console", m => logs.push(m.type()+": "+m.text()));
  p.on("pageerror", e=>logs.push("PAGEERROR "+e.message));
  await p.goto("http://127.0.0.1:8099/index.html?cb="+Date.now());
  await p.waitForTimeout(4000);
  const r = await p.evaluate(async () => {
    try { await import("./src/lib/core.js?v=9"); return "core ok"; } catch(e){ return "core: "+e; }
  });
  console.log(r);
  const r2 = await p.evaluate(async () => {
    try { await import("./src/scenes/arena.js?v=9"); return "arena ok"; } catch(e){ return "arena: "+e; }
  });
  console.log(r2);
  await b.close();
})();
