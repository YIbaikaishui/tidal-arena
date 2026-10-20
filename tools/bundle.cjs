#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════════
   bundle.cjs — 把 src/ 打成 IIFE 单文件（src/boot.js → src/bundle.js）
   · 只做"打包"，不改任何业务逻辑；three 与 vendor 走 importmap 的外部依赖
   · 为什么需要：http.server / 各类静态服务的 importmap 与 ES module 组合
     在部分回访（reload）场景下不稳定，实测二次启动时报
     `Failed to resolve module specifier "three"`，导致 6 个任务全部丢失。
     打包成单个 IIFE 后，importmap 只对顶层的 `import * as THREE` 生效，
     不再有几十个深度模块各自解析裸标识符的问题。
   · 用法：cd tools && node bundle.cjs   （写 ../src/bundle.js）
          cd tools && node bundle.cjs --watch
   ══════════════════════════════════════════════════════════════════════ */
const path = require('path');
const fs = require('fs');

let esbuild;
try {
  esbuild = require('esbuild');
} catch (e) {
  console.error('缺少 esbuild：请在 tools/ 下执行  npm install');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const ENTRY = path.join(ROOT, 'src', 'boot.js');
const OUT = path.join(ROOT, 'src', 'bundle.js');
const watch = process.argv.includes('--watch');

const options = {
  entryPoints: [ENTRY],
  outfile: OUT,
  bundle: true,
  /* 必须是 esm：three 通过 importmap 外部化；若用 iife，esbuild 会把外部 ESM 降级成
     require('three')，浏览器里直接抛 Dynamic require of "three" is not supported。 */
  format: 'esm',
  target: ['chrome100', 'firefox110', 'safari16'],
  platform: 'browser',
  charset: 'utf8',
  legalComments: 'none',
  sourcemap: false,
  /* three 与 vendor/ 走 index.html 的 importmap 外部化：
     esbuild 知道它们存在（node_modules/three 已安装），这里只保留为 import */
  external: ['three', 'three/addons/*'],
  banner: {
    js: '/* 自动生成：由 tools/bundle.cjs 从 src/boot.js 打出，请勿手改。'
      + ' 改动业务代码请改 src/ 下的模块然后重新打包。 */',
  },
  logLevel: 'info',
};

(async () => {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('[bundle] watching src/ → src/bundle.js');
    return;
  }
  const t0 = Date.now();
  await esbuild.build(options);
  const st = fs.statSync(OUT);
  console.log(`[bundle] ${(st.size / 1024).toFixed(1)} KB → src/bundle.js  (${Date.now() - t0} ms)`);
})().catch((e) => {
  console.error('[bundle] 失败：', e && (e.errors || e.message));
  process.exit(1);
});
