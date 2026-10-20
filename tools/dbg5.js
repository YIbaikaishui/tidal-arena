const { chromium } = require('playwright-core');
(async () => {
  const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
  const b = await chromium.launch({ executablePath: CHROME });
  const pg = await b.newPage();
  await pg.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
  await pg.waitForFunction('window.__ready === true', null, { timeout: 90000 });
  const r = await pg.evaluate(() => {
    const SQ_LR0 = 56.5, SQ_WR = 43.40 / 56.5, SQ_RR = 0.26;
    const out = [];
    for (const th of [0, 0.1, 0.5, 0.785]) {
      const ex = Math.cos(th), ez = Math.sin(th), a = Math.abs(ex), c = Math.abs(ez);
      const L = SQ_LR0, W = SQ_WR * L, R = Math.min(L, W) * SQ_RR;
      const ilx = L - R, ilz = W - R;
      const tE = Math.min(ilx / a, ilz / c);
      out.push([th, a, c, tE.toFixed(2), r0v(a, c, tE, ilx, ilz, R).toFixed(2), sq2(th).toFixed(2)]);
    }
    function r0v(a, c, tE, ilx, ilz, R) {
      if (a * tE <= ilx && c * tE <= ilz) return tE;
      const bq = ilx * a + ilz * c, cq = ilx * ilx + ilz * ilz - R * R;
      return bq - Math.sqrt(Math.max(0, bq * bq - cq));
    }
    function sq2(th) {
      const ex = Math.cos(th), ez = Math.sin(th), a = Math.abs(ex), c = Math.abs(ez);
      const L = SQ_LR0, W = SQ_WR * L, R = Math.min(L, W) * SQ_RR;
      const ilx = L - R, ilz = W - R;
      if (a < 1e-9) return Math.max(2, L - 90);
      if (c < 1e-9) return Math.max(2, W - Math.min(90, W - 2));
      const s = Math.min(1, Math.max(0.02, 1 - 90 / L));
      const L2 = L * s, W2 = W * s;
      const R2 = Math.min(L2, W2) * SQ_RR;
      const ilx2 = L2 - R2, ilz2 = W2 - R2;
      const tE2 = Math.min(ilx2 / a, ilz2 / c);
      if (a * tE2 <= ilx2 && c * tE2 <= ilz2) return tE2;
      const bq2 = ilx2 * a + ilz2 * c, cq2 = ilx2 * ilx2 + ilz2 * ilz2 - R2 * R2;
      return bq2 - Math.sqrt(Math.max(0, bq2 * bq2 - cq2));
    }
    return out;
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
