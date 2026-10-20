/* ═══════════════════════════════════════════════════════════════════════
   app.js — 启动 / 主循环 / 分阶段装载 / 性能预算
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import {
  stage, initRenderer, resize, PRESETS, preset, lerpPreset,
  buildEnvironment, applyEnvFromPreset, sleep, clamp, fmt,
  NO_SOFTWARE, PIXEL_BUDGET, POWER_PREF,
} from './lib/core.js';
import { buildSky } from './scenes/sky.js';
import { buildArena } from './scenes/arena.js';
import { buildEnv } from './scenes/env.js';
import { buildPostFX } from './lib/postfx.js';
import { OrbitRig } from './lib/orbit.js';
import { Walk } from './lib/walk.js';
import { DraftViews } from './lib/draft.js';
import { ModeController } from './lib/modes.js';
import { buildUI } from './ui.js';
import { setTextureScale } from './lib/textures.js';
/* ⚠️ v5：只静态导入 game/init.js（它只依赖 state.js，不含 three / 场景代码）。
   世界层 game/world.js 在 initWorld() 里延迟导入 —— 见 state.js 文件头的架构约束。
   v4 曾用 `import('./game/index.js')` 动态加载，index.html 的 modulepreload 会与动态
   import 并发各建一份模块图，导致 state.js / caps.js 被求值两次（两个互不可见的实例）。 */
import * as gameLayer from './game/init.js';

const $ = (s) => document.querySelector(s);
const loader = $('#loader');
const ldFill = $('#ldFill');
const ldStep = $('#ldStep');

const steps = [
  ['正在初始化渲染管线…', 6],
  ['构建环境光照与天穹…', 14],
  ['生成坐席几何（逐排逐区）…', 30],
  ['浇筑看台与环廊结构…', 50],
  ['安装悬挑屋盖与桁架…', 66],
  ['装配外立面与檐口…', 78],
  ['布置场地、灯光与室内…', 88],
  ['铺设周边城市肌理…', 95],
  ['编译着色器…', 100],
];
let stepIdx = 0;
async function step(label, pct) {
  ldStep.textContent = label;
  ldFill.style.width = (pct ?? steps[stepIdx][1]) + '%';
  await sleep(16);
}

async function boot() {
  try {
    initRenderer($('#gl'));
    stage.quality = detectQuality();
    stage.perf = detectPerfMode();
    stage.lite = detectLiteMode();
    /* 轻量档天然包含省电档的渲染端降压（默认都开），
       这样 setPerfMode / resize / postfx 只需认 perf 一个开关即可生效 */
    if (stage.lite) stage.perf = true;
    /* 纹理尺寸必须在任何程序化纹理生成之前定好（首屏耗时的大头之一） */
    setTextureScale(stage.lite ? 0.5 : 1);
    resize();

    /* 软渲染兜底：SwiftShader / llvmpipe 里 100 万面只有个位数帧率，
       继续跑下去只会让用户以为「卡死了」。先明确告知，再允许强制进入。 */
    let forceSW = false;
    try { forceSW = sessionStorage.getItem('tidal_force_sw') === '1'; } catch (e) { /* noop */ }
    if (stage.software && NO_SOFTWARE && !forceSW) {
      showSoftwareWarning(stage.softwareInfo);
      return;
    }

    await step(steps[stepIdx][0], steps[stepIdx][1]); stepIdx++;
    buildEnvironment();

    await step(steps[stepIdx][0], steps[stepIdx][1]); stepIdx++;
    const sky = buildSky(stage.scene);
    sky.bindStage(stage);

    await step(steps[stepIdx][0], steps[stepIdx][1]); stepIdx++;
    await sleep(30);
    const arena = buildArena(stage.scene, stage);
    sky.bindLamps(arena.lamps);

    await step(steps[stepIdx][0], steps[stepIdx][1]); stepIdx++;
    await sleep(16);

    await step(steps[stepIdx][0], steps[stepIdx][1]); stepIdx++;
    sky.update(0, 0);

    await step(steps[stepIdx][0], steps[stepIdx][1]); stepIdx++;
    const env = buildEnv(stage.scene, stage);

    /* 周边配套也注册成"构件"，图层 / 聚焦 / solo 才能统一处理 */
    if (env && env.ents) {
      for (const k in env.ents) if (!arena.ents[k]) arena.ents[k] = env.ents[k];
    }

    await step(steps[stepIdx][0], steps[stepIdx][1]); stepIdx++;
    const fx = buildPostFX(stage);
    /* 省电/轻量档：关泛光（UnrealBloom 是一整条 mip 链，实测占 10+ fps）、关投影阴影、降压分辨率 */
    if (stage.perf || stage.lite) {
      fx.setPerfMode && fx.setPerfMode(true);
      stage.renderer.shadowMap.enabled = false;
    }
    const orbit = new OrbitRig(stage.camera, stage.canvas);
    const walk = new Walk(stage, arena);
    const draft = new DraftViews(stage, arena);
    const modes = new ModeController({ arena, stage });
  modes.fx = fx;

    await step(steps[stepIdx][0], steps[stepIdx][1]); stepIdx++;
    stage.renderer.compile(stage.scene, stage.camera);

    const ui = buildUI({ arena, env, sky, fx, orbit, walk, draft, stage, modes });

    /* 游戏层提前"发起"：首帧要编译大量着色器，主线程会堵几秒。
       静态导入保证只有一份模块图（见文件头说明）。 */
    const gameBoot = Promise.resolve(gameLayer);

    /* ── 主循环 ── */
    const clock = new THREE.Clock();
    let t = 0, acc = 0, frames = 0, fps = 60;
    const perf = { slow: 0, level: 0, history: [] };
    window.__fps = 60;
    window.__stats = {};

    function frame() {
      requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.1);
      t += dt; acc += dt; frames++;
      if (acc >= 0.5) {
        const f = frames / acc;
        fps = f; window.__fps = f;
        fnLog(f);
        acc = 0; frames = 0;
      }
      if (walk.active) walk.update(dt); else orbit.update(dt);
      modes.update(dt);
      sky.update(dt, t);
      ui.update(dt, t, fps);
      env.update && env.update(dt, t);
      fx.render(dt, t);
      /* composer 内部每个 pass 都会 autoReset，帧末只剩最后一遍的 1 个四边形。
         这里用"每帧最大 calls/tris"累积：把 renderer.info.autoReset 关掉，
         由我们自己按帧清理，才能读到整帧真实的绘制量。 */
      const info = stage.renderer.info;
      const tri = info.render.triangles, calls = info.render.calls;
      const meshes = info.memory.geometries, texes = info.memory.textures;
      info.autoReset = false;
      info.reset();
      window.__stats = {
        fps, tris: tri, calls, meshes, textures: texes,
        seats: arena.seatTotal, cam: stage.camera.position.toArray().map(v => +v.toFixed(1)),
      };
    }

    /* 自适应画质：连续 3 次采样低于 38fps 就降一档。
       ⚠️ 轻量/省电档下泛光本来就关着，这里绝不能再把它打开
       （历史上 level===1 会无条件 bloom.enabled = true，导致开了省电模式后
        掉几帧就被重新打开泛光，帧率反而更差）。 */
    function fnLog(f) {
      perf.history.push(f);
      if (perf.history.length > 8) perf.history.shift();
      if (perf.level >= 2) return;
      if (f < 38) perf.slow++; else perf.slow = Math.max(0, perf.slow - 0.6);
      if (perf.slow > 4) {
        perf.slow = 0; perf.level++;
        if (perf.level === 1) {
          stage.quality = 'mid'; resize();
          fx.bloom.enabled = !(stage.perf || stage.lite);
          ui.toast('已自动降低渲染分辨率', '性能自适应：保持流畅优先', 'plain');
        } else if (perf.level === 2) {
          stage.quality = 'low'; stage.perf = true; resize(); fx.bloom.enabled = false;
          ui.toast('已切换到性能模式', '关闭泛光 / 降低采样', 'plain');
        }
      }
    }

    /* 显卡上下文丢失（驱动重置 / 显存回收）时给明确提示，而不是停在一张黑屏 */
    stage.onContextLost = () => {
      ldStep.textContent = '显卡上下文已丢失，请刷新页面';
      loader.classList.remove('off');
      ldStep.style.color = '#e2603f';
    };

    /* 启动 */
    ldStep.textContent = '就绪';
    await sleep(120);
    loader.classList.add('off');
    $('#hud').classList.add('on');
    orbit.snapTo(ui.INTRO);
    ui.postBoot && ui.postBoot();
    requestAnimationFrame(frame);

    window.__app = { arena, env, sky, fx, orbit, walk, draft, modes, ui, stage, preset };
    window.__THREE = THREE;   /* 调试/自检用（拾取、包围盒统计等） */
    window.__ready = true;
    bindPerfKeys();
    watchPerf();

    /* 游戏层（任务 / 徽章 / 疏散 / 建造 / 照片 / 音效）——失败不影响主体展示 */
    try {
      const g = await gameBoot;
      if (g) await g.init(window.__app);
    } catch (e) {
      console.warn('[game] 初始化跳过：', e);
      window.__gameError = String(e && e.message || e);
    }
  } catch (e) {
    console.error(e);
    window.__bootError = String(e && e.stack || e);
    ldStep.textContent = '启动失败：' + (e && e.message);
    ldStep.style.color = '#e2603f';
  }
}

function detectQuality() {
  /* 超时看门狗里的「以低画质重试」会写这个标记 */
  try { if (localStorage.getItem('tidal_lowq') === '1') return 'low'; } catch (e) { /* 隐私模式 */ }
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const small = Math.min(window.innerWidth, window.innerHeight) < 620;
  if (mobile || small) return 'low';
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  if (mem <= 4 || cores <= 4) return 'mid';
  return 'high';
}

/* ══════════════ 性能档（省电模式） ══════════════ */
/* 判定顺序：
   ① URL 参数 ?perf=1 / ?perf=0 —— 最优先，便于分享链接或排查
   ② localStorage 'tidal_perf' = '1' / '0' —— 设置面板写入
   ③ 自动：电量非充电状态 / 省电模式 / 低内存 → 省电档
   若同一台机器上次连续掉帧（tidal_perf_last='slow'），也默认进省电档。 */
export function detectPerfMode() {
  const q = new URLSearchParams(location.search);
  const qv = q.get('perf');
  if (qv === '1' || qv === '0') return qv === '1';
  try {
    const saved = localStorage.getItem('tidal_perf');
    if (saved === '1' || saved === '0') return saved === '1';
    if (localStorage.getItem('tidal_perf_last') === 'slow') return true;
  } catch (e) { /* 隐私模式：不记忆 */ }
  try {
    const b = navigator.getBattery ? navigator.getBattery() : null;
    /* getBattery 是异步的，这里只看同步可得的粗糙信息 */
    if (navigator.connection && /(^|-)(2g|3g)$/.test(navigator.connection.effectiveType || '')) return true;
  } catch (e) { /* noop */ }
  const mem = navigator.deviceMemory || 8;
  if (mem <= 4) return true;
  return false;
}

/* ══════════════ 轻量档（默认档） ══════════════ */
/* 设计目标：「点开就能看」，不需要独立显卡也能动。
   与「省电档」的区别：省电档只是渲染端降压（分辨率/泛光/阴影），
   轻量档是**从几何源头减量**（坐席抽稀 3 倍、树木与绿篱减半、关泛光），
   所以首屏构建设备耗时更短、运行时 draw call 与顶点量都更低。

   判定顺序：
   ① URL ?lite=0 / ?lite=1 或 ?full=1（后者等价 ?lite=0）—— 最高优先
   ② localStorage 'tidal_lite'
   ③ 默认开启（面向分享场景：大多数访客的机器不强），
      只有检测到"明显是高端独显"时才默认走完整档。 */
export function detectLiteMode() {
  const q = new URLSearchParams(location.search);
  if (q.get('full') === '1') return false;
  const qv = q.get('lite');
  if (qv === '1') return true;
  if (qv === '0') return false;
  try {
    const saved = localStorage.getItem('tidal_lite');
    if (saved === '1' || saved === '0') return saved === '1';
  } catch (e) { /* 隐私模式 */ }
  /* 默认轻量。只有识别出 NVIDIA / Radeon / Apple 这类独显时才默认完整档 */
  const gpu = (stage.softwareInfo || '').toLowerCase();
  const strong = /(nvidia|geforce|rtx|gtx|radeon rx|apple m\d|adreno 7|mali-g7)/.test(gpu);
  if (strong && !stage.software) return false;
  return true;
}

/* 运行时切换轻量/完整档：几何已经在建，无法原地重建，所以刷新页面生效 */
export function setLiteMode(on) {
  try { localStorage.setItem('tidal_lite', on ? '1' : '0'); } catch (e) { /* noop */ }
  const A = window.__app;
  /* 轻量档的减量是构建期决定的，必须刷新；这里先同步渲染端能立即生效的部分 */
  if (A) {
    A.stage.lite = !!on;
    A.stage.perf = !!on || A.stage.perf;
    resize();
    if (A.fx && A.fx.setPerfMode) A.fx.setPerfMode(!!on || A.stage.perf);
    if (on) A.stage.renderer.shadowMap.enabled = false;
  }
  return true;
}
window.__setLiteMode = setLiteMode;

/* 运行时切换性能档（设置面板 / 控制台都能调）：立即生效，不用刷新 */
export function setPerfMode(on) {
  const A = window.__app;
  if (!A) return false;
  const perf = !!on;
  A.stage.perf = perf;
  if (!perf) A.stage.lite = false;
  resize();
  if (A.fx && A.fx.setPerfMode) A.fx.setPerfMode(perf);
  A.stage.renderer.shadowMap.enabled = !perf;
  try { localStorage.setItem('tidal_perf', perf ? '1' : '0'); } catch (e) { /* noop */ }
  return true;
}
window.__setPerfMode = setPerfMode;

/* ══════════════ 性能诊断浮层 ══════════════ */
/* 按 Shift+P 打开/关闭；也可以在控制台执行 __perfShow(true)。
   内容就是排查「为什么慢」最需要的四项：实际用的 GPU、像素比、帧率、绘制量。
   —— 很多「很慢」的现场其实是跑在了核显或软渲染上，一眼就能看出来。 */
export function showPerfHud(show = true) {
  let el = document.getElementById('perfhud');
  if (!show) { if (el) el.remove(); return null; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'perfhud';
    el.style.cssText = [
      'position:fixed', 'right:12px', 'bottom:12px', 'z-index:99999',
      'padding:10px 12px', 'border-radius:10px', 'pointer-events:none',
      'background:rgba(6,10,16,.86)', 'border:1px solid rgba(127,226,239,.35)',
      'color:#cfe9f2', 'font:12px/1.55 ui-monospace,Consolas,monospace',
      'white-space:pre', 'backdrop-filter:blur(6px)',
    ].join(';');
    document.body.appendChild(el);
  }
  const tick = () => {
    if (!document.body.contains(el)) return;
    const A = window.__app;
    if (!A) { el.textContent = '等待启动…'; setTimeout(tick, 400); return; }
    const s = window.__stats || {};
    const pr = A.stage.pr, W = A.stage.W, H = A.stage.H;
    const px = Math.round(W * pr) + '×' + Math.round(H * pr);
    el.textContent = [
      '帧率      ' + (s.fps ? s.fps.toFixed(1) : '—') + ' fps' + (s.fps && s.fps < 45 ? '   ← 偏慢' : ''),
      'GPU       ' + (A.stage.softwareInfo || '未知') + (A.stage.software ? '  ← 软渲染！' : ''),
      '像素比    ' + pr.toFixed(2) + '  (' + px + ')',
      '预算      ' + (A.stage.perf ? '省电 1.3M' : '高性能 2.6M') + '  档位 ' + A.stage.quality,
      '绘制      ' + (s.calls || 0) + ' call / ' + ((s.tris || 0) / 1e6).toFixed(2) + 'M 三角面',
      '省电模式  ' + (A.stage.perf ? '开（Shift+P 关闭）' : '关（Shift+P 开启）'),
    ].join('\n');
    setTimeout(tick, 300);
  };
  tick();
  return el;
}
window.__perfShow = showPerfHud;

/* 启动后若连续掉帧，记一笔，下次自动进省电档 */
function watchPerf() {
  let slowRounds = 0;
  const iv = setInterval(() => {
    const s = window.__stats || {};
    if (!s.fps) return;
    slowRounds = s.fps < 40 ? slowRounds + 1 : 0;
    if (slowRounds >= 12) {
      clearInterval(iv);
      try { localStorage.setItem('tidal_perf_last', 'slow'); } catch (e) { /* noop */ }
      const A = window.__app;
      if (A && !A.stage.perf && A.ui && A.ui.toast) {
        A.ui.toast('检测到持续掉帧', '按 Shift+P 或打开设置 → 性能，切到省电模式可明显提速', 'plain');
      }
    }
  }, 1000);
  return iv;
}

/* Shift+P：右下角诊断面板（GPU 型号 / 像素比 / 帧率 / 绘制量）。
   很多「很慢」的现场其实是跑在了核显或软渲染上，这个面板一眼能看出来。 */
function bindPerfKeys() {
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'P' || !e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const on = !document.getElementById('perfhud');
    showPerfHud(on);
  });
}

/* 软渲染提示页 */
function showSoftwareWarning(glName) {
  const box = document.createElement('div');
  box.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:99999', 'display:flex',
    'align-items:center', 'justify-content:center', 'background:#070b11',
    'color:#d8e6ee', 'font:14px/1.8 system-ui,"Segoe UI",sans-serif', 'padding:24px',
  ].join(';');
  box.innerHTML = `
    <div style="max-width:560px">
      <h2 style="margin:0 0 12px;font-size:19px;color:#e8c07a">当前浏览器没有启用显卡加速</h2>
      <p style="margin:0 0 10px">检测到的图形后端是<b>软件渲染</b>（${glName || 'SwiftShader'}），
      这个三维场景在软件渲染下只有个位数帧率，不是程序卡死。</p>
      <p style="margin:0 0 10px">按下面的顺序处理，通常第 1 条就能解决：</p>
      <ol style="margin:0 0 14px;padding-left:20px">
        <li>Chrome 地址栏输入 <b>chrome://settings/system</b>，确认"使用图形加速功能"已开启，然后重启浏览器</li>
        <li>笔记本插上电源（省电模式会让浏览器退到核显甚至软渲染）</li>
        <li>地址栏打开 <b>chrome://gpu</b>，看 WebGL2 是否为 Hardware accelerated</li>
      </ol>
      <button id="swForce" style="padding:8px 16px;border-radius:8px;border:1px solid #7fe2ef;background:transparent;color:#7fe2ef;cursor:pointer;font:inherit">仍然进入（会很卡）</button>
    </div>`;
  document.body.appendChild(box);
  const btn = box.querySelector('#swForce');
  btn.addEventListener('click', () => {
    box.remove();
    try { sessionStorage.setItem('tidal_force_sw', '1'); } catch (e) { /* noop */ }
    location.reload();
  });
}

boot();
