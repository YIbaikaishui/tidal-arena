/* 验证脚本：用本机 Playwright Chromium 打开页面，收集控制台错误并多角度截图 */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:/Users/zhang/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const ROOT = 'D:/Desktop/世界杯3d';
const URL = 'http://127.0.0.1:8099/index.html';
const OUT = path.join(ROOT, 'tools/shots');

const shots = process.argv.slice(2);   // 额外执行的 JS 步骤标记

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()));
  page.on('pageerror', e => logs.push('[pageerror] ' + e.message + '\n' + (e.stack || '').slice(0, 900)));
  page.on('requestfailed', r => logs.push('[reqfail] ' + r.url() + ' :: ' + (r.failure() && r.failure().errorText)));

  await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);
  try {
    await page.waitForFunction('window.__ready === true || window.__bootError', null, { timeout: 120000 });
  } catch (e) { logs.push('[timeout] waiting ready'); }
  await page.waitForTimeout(2500);

  const status = await page.evaluate(() => ({
    ready: !!window.__ready,
    bootError: window.__bootError || null,
    stats: window.__stats || null,
    seats: window.__app ? window.__app.arena.seatTotal : null,
  }));
  console.log('STATUS', JSON.stringify(status, null, 2));

  await page.screenshot({ path: path.join(OUT, '01-first.png') });
  if (!status.ready) { console.log('--- CONSOLE(boot) ---'); console.log(logs.join('\n')); await browser.close(); return; }

  // 多机位截图
  const list = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (const i of list) {
    await page.evaluate((k) => { window.__app.ui.setShot(k, true); }, i);
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `shot-${i}.png`) });
  }

  console.log('--- CONSOLE ---');
  console.log(logs.slice(0, 60).join('\n'));
  const errs = logs.filter(l => l.startsWith('[error]') || l.startsWith('[pageerror]') || l.startsWith('[reqfail]'));
  console.log('--- ERRORS (' + errs.length + ') ---');
  console.log(errs.slice(0, 25).join('\n'));
  await browser.close();
})();

