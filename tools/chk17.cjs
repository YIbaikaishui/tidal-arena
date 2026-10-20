const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1200, height: 760 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    const o = window.__app.orbit;
    return { target: o.target.toArray(), tTarget: o.tTarget.toArray(), dist: o.dist, tDist: o.tDist, az: o.az, tAz: o.tAz, elv: o.elv, tElv: o.tElv, vAz: o.vAz, vEl: o.vEl };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
