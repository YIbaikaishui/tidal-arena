const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('http://127.0.0.1:8099/index.html?cb='+Date.now());
  await p.waitForFunction('window.__ready===true', { timeout: 40000 }).catch(()=>{});
  await p.waitForTimeout(700);
  await p.evaluate(() => { document.getElementById('hud').style.display='none'; });
  // 用 orbit：目标点在场内，距离小 → 相机在场内上方，能看清对侧看台座椅
  const cams = [
    ['seats_a', 0, 14, 118, 0, 0.16],
    ['seats_b', 0, 22, 150, 0, 0.30],
    ['seats_c', 0, 30, 175, 0.5, 0.36],
  ];
  for (const [n, x, y, d, az, el] of cams) {
    await p.evaluate(([x,y,d,az,el]) => {
      const o = window.__app.orbit;
      o.tTarget.set(x,y,0); o.target.set(x,y,0);
      o.tDist=d; o.dist=d; o.tAz=az; o.az=az; o.tElv=el; o.elv=el; o.vAz=0; o.vEl=0;
    }, [x,y,d,az,el]);
    await p.waitForTimeout(400);
    await p.screenshot({ path: 'shots/' + n + '.png' });
  }
  await b.close();
})();
