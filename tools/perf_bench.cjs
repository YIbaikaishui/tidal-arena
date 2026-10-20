#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
   perf_bench.cjs — 帧率体检 / 优化前后对比（可复现）

   用法：
     cd tools
     node perf_bench.cjs                  # 默认端口随机，自动开无头 Chromium
     node perf_bench.cjs --headed         # 有头跑（更接近真实表现）

   它会依次测量四组配置并打印帧率 + 像素比 + 绘制量：
     A 高性能档（自动降质生效后，即用户默认看到的状态）
     B 省电档  （自动降质生效后）
     C 省电档  （关闭自动降质）
     D 高性能档（关闭自动降质）

   判读方法：先看 A。如果 A 已经 ≥ 55fps，问题不在渲染管线，
   应去查浏览器硬件加速 / 是否跑在核显或软渲染上（页面内按 Shift+P 看诊断面板）。
   如果 A < 40 且 B 明显高于 A，说明瓶颈是填充率（像素数），开省电模式即有效。
   ══════════════════════════════════════════════════════════════════════ */
const http = require('http');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const HEADED = process.argv.includes('--headed');
const CHROME = process.env.CHROME_PATH || [
  'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find((p) => fs.existsSync(p));

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function serve() {
  return new Promise((res) => {
    const s = http.createServer((q, rq) => {
      let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      fs.readFile(path.join(ROOT, p), (e, b) => {
        if (e) { rq.writeHead(404).end('not found'); return; }
        rq.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        rq.end(b);
      });
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

const read = (p) => p.evaluate(() => ({
  fps: Math.round(window.__stats.fps * 10) / 10,
  pr: +window.__app.stage.pr.toFixed(2),
  quality: window.__app.stage.quality,
  perf: window.__app.stage.perf,
  bloom: window.__app.fx.bloom.enabled,
  shadow: window.__app.stage.renderer.shadowMap.enabled,
  calls: window.__stats.calls,
  mtris: +((window.__stats.tris || 0) / 1e6).toFixed(2),
  gpu: window.__app.stage.softwareInfo,
}));

async function run(browser, url, label, autoQuality) {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1000 }, deviceScaleFactor: 1.25 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', null, { timeout: 180000 });
  await page.evaluate(() => { const b = document.getElementById('briefGo'); if (b) b.click(); });
  await page.evaluate((a) => { window.__app.ui.S.autoQuality = a; }, autoQuality);
  await sleep(16000);            /* 让自动降质把档位走完 */
  await read(page);
  await sleep(4000);             /* 稳态再采一次 */
  const s = await read(page);
  console.log(label.padEnd(26), JSON.stringify(s), errs.length ? ' ERR×' + errs.length : '');
  await page.close();
  return s;
}

(async () => {
  if (!CHROME) { console.error('找不到 Chromium/Chrome，请设置 CHROME_PATH'); process.exit(1); }
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}/index.html`;
  const browser = await chromium.launch({ executablePath: CHROME, headless: !HEADED });
  console.log('GPU =', (await (async () => {
    const p = await browser.newPage();
    await p.goto(base);
    await p.waitForFunction('window.__ready === true', null, { timeout: 180000 });
    const g = await p.evaluate(() => window.__app.stage.softwareInfo);
    await p.close();
    return g;
  })()));
  await run(browser, base + '?perf=0', 'A 高性能档(自动降质)', true);
  await run(browser, base + '?perf=1', 'B 省电档(自动降质)', true);
  await run(browser, base + '?perf=1', 'C 省电档(不自动降质)', false);
  await run(browser, base + '?perf=0', 'D 高性能档(不自动降质)', false);
  await browser.close();
  srv.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
