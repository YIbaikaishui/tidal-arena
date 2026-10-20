const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: "C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe" });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on("pageerror", e => errs.push("PAGEERROR: " + e.message + "\n" + (e.stack||"").split("\n").slice(0,5).join("\n")));
  p.on("console", m => { if (m.type()==="error"||m.type()==="warning") errs.push(m.type()+": "+m.text()); });
  await p.goto("http://127.0.0.1:8099/index.html?cb="+Date.now());
  await p.waitForTimeout(9000);
  console.log("ready:", await p.evaluate(()=>window.__ready), "bootErr:", await p.evaluate(()=>window.__bootError||null));
  console.log(errs.join("\n"));
  await b.close();
})();
