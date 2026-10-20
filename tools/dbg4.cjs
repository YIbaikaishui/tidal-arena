const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: "C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe" });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on("pageerror", e=>console.log("PAGEERROR", e.message));
  await p.goto("http://127.0.0.1:8099/tools/harness.html?cb="+Date.now());
  await p.waitForFunction("window.__ready===true",{timeout:20000});
  await p.waitForTimeout(800);
  const info = await p.evaluate(() => {
    const el = document.getElementById("settings");
    const cs = getComputedStyle(el);
    return { cls: el.className, opacity: cs.opacity, pe: cs.pointerEvents, hasUI: !!(window.__app && window.__app.ui), layout: window.__app && window.__app.ui && window.__app.ui.getLayout && window.__app.ui.getLayout() };
  });
  console.log(JSON.stringify(info));
  await p.evaluate(()=>{ document.getElementById("settings").classList.remove("on"); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: "shots/h/plain.png" });
  await b.close();
})();
