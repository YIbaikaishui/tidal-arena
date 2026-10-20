const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  await p.waitForTimeout(900);
  await p.evaluate(() => { document.getElementById('hud').style.display='none'; });
  const views = [
    ['v_hero', 0, 18, 520, -1.32, 0.40],
    ['v_night2', 0, 16, 470, 2.1, 0.24],
    ['v_low', 0, 8, 300, -0.6, 0.10],
    ['v_top', 0, 10, 560, -1.5, 1.15],
  ];
  for (const [n, x, y, d, az, el] of views) {
    await p.evaluate(([x,y,d,az,el]) => {
      const o = window.__app.orbit;
      o.tTarget.set(x,y,0); o.target.set(x,y,0);
      o.tDist=d; o.dist=d; o.tAz=az; o.az=az; o.tElv=el; o.elv=el;
      o.vAz=0; o.vEl=0;
    }, [x,y,d,az,el]);
    await p.waitForTimeout(500);
    await p.screenshot({ path: 'shots/' + n + '.png' });
  }
  console.log('stats', JSON.stringify(await p.evaluate(()=>window.__stats)));
  await b.close();
})();
