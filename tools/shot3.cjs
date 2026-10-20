const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  await p.waitForTimeout(800);
  await p.evaluate(() => { document.getElementById('hud').style.display='none'; });
  // 日间
  await p.evaluate(() => { window.__app.ui.setEnv('day'); });
  await p.waitForTimeout(2500);
  const views = [
    ['day_hero', 0, 18, 560, -1.32, 0.42],
    ['day_inside', 0, 6, 150, 1.2, 0.14],
    ['day_inside2', 0, 10, 210, -2.4, 0.22],
    ['day_corner', 60, 26, 230, 0.9, 0.20],
  ];
  for (const [n, x, y, d, az, el] of views) {
    await p.evaluate(([x,y,d,az,el]) => {
      const o = window.__app.orbit;
      o.tTarget.set(x,y,0); o.target.set(x,y,0);
      o.tDist=d; o.dist=d; o.tAz=az; o.az=az; o.tElv=el; o.elv=el; o.vAz=0; o.vEl=0;
    }, [x,y,d,az,el]);
    await p.waitForTimeout(500);
    await p.screenshot({ path: 'shots/' + n + '.png' });
  }
  await b.close();
})();
