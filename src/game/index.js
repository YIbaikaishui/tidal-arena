/* ═══════════════════════════════════════════════════════════════════════
   index.js — 游戏层总装（LEAD 在 app.js 里 import { init } 并 init(window.__app)）
   · 分模块 try/catch 初始化，任一模块失败不影响其余
   · 单 rAF 循环驱动 badges / evac / build 的 update，并做位置→任务判定
   · 全部完成后 window.__gameReady = true
   对外：window.__gameApi = {game, badges, evac, build, photo, audio, stop}
   ═══════════════════════════════════════════════════════════════════════ */
import { createGame, MISSIONS } from './state.js';
import { createBadges } from './badges.js';
import { createEvac } from './evacuation.js';
import { createConstruction } from './construction.js';
import { createPhoto } from './photo.js';
import { createAudio } from './audio.js';
import { createObjectives } from './objectives.js';
import { createInsights } from './insights.js';
import { createDayPhase } from './dayPhase.js';

const LM = {
  plaza: { x: 0, z: 190 },
  hall: { x: 0, z: 118 },
  concourse: { x: 0, z: 84, y: 28 },
  tunnel: { x: 0, z: -96 },
};

export async function init(app) {
  const A = window.__app || app || {};
  const api = { game: null, badges: null, objectives: null, insights: null, evac: null, build: null, photo: null, audio: null };
  const errors = [];
  const guard = (name, fn) => {
    try { return fn(); } catch (e) {
      errors.push(name + ': ' + (e && e.message || e));
      try { console.warn('[game] ' + name + ' 初始化失败', e); } catch (_) { /* 忽略 */ }
      return null;
    }
  };

  /* ① 状态机（最早，其他模块依赖 __game） */
  const T0 = performance.now(); const tim = [];
  const tk = (n) => { tim.push([n, +(performance.now() - T0).toFixed(0)]); };
  api.game = guard('state', () => (window.__game && window.__game.__isGame) ? window.__game : createGame());
  tk('state');
  const G = api.game || window.__game || null;
  if (G) {
    guard('landmarks', () => {
      const model = A.arena && A.arena.model;
      const l2 = model && model.tiers && model.tiers[1];
      if (l2 && isFinite(l2.cY)) {
        LM.concourse.y = l2.cY;
        LM.concourse.z = Math.round((l2.cS0 + l2.cS1) / 2);
      }
      G.setLandmarks(LM);
    });
    /* 把真实容量注入任务文案（避免"8 万"写死数字与仪表打架） */
    guard('capacity', () => {
      const model = A.arena && A.arena.model;
      if (model && model.total) G.setCapacity(model.total);
    });
  }

  /* ② 徽章 */
  api.badges = guard('badges', () => createBadges(A)); tk('badges');
  /* ②b 目标系统（信标 + 区域判定） */
  api.objectives = guard('objectives', () => createObjectives(A)); tk('objectives');
  /* ②c 建筑洞察图鉴 */
  api.insights = guard('insights', () => createInsights(A)); tk('insights');
  /* ②d 比赛日时段（照明 + 玩法钩子；必须在 UI 就绪后创建，它要调 ui.setEnv） */
  api.day = guard('dayPhase', () => createDayPhase(A)); tk('day');
  /* ③ 疏散 */
  api.evac = guard('evacuation', () => createEvac(A)); tk('evac');
  /* ④ 建造 */
  api.build = guard('construction', () => createConstruction(A)); tk('build');
  /* ⑤ 照片 */
  api.photo = guard('photo', () => createPhoto(A)); tk('photo');
  /* ⑥ 音频（默认关闭） */
  api.audio = guard('audio', () => createAudio()); tk('audio');

  /* ── 主循环 ── */
  let raf = 0;
  let last = 0;
  let acc = 0;
  let running = true;
  const pos = () => {
    const w = A.walk;
    if (w && w.active && w.pos) return w.pos;
    const cam = A.stage && A.stage.camera;
    return cam ? cam.position : null;
  };

  function frame(ts) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const now = typeof ts === 'number' ? ts : performance.now();
    const dt = Math.min(0.1, Math.max(0, (now - (last || now)) / 1000));
    last = now;

    try { api.badges && api.badges.update(dt); } catch (e) { /* 忽略 */ }
    try { api.day && api.day.update(dt); } catch (e) { /* 忽略 */ }
    try { api.objectives && api.objectives.update(dt); } catch (e) { /* 忽略 */ }
    try { api.insights && api.insights.update(dt); } catch (e) { /* 忽略 */ }
    try { api.evac && api.evac.update(dt); } catch (e) { /* 忽略 */ }
    try { api.build && api.build.update(dt); } catch (e) { /* 忽略 */ }
    try { G && G.tick(dt); } catch (e) { /* 忽略 */ }

    /* 位置 → 任务（节流 150ms） */
    acc += dt;
    if (acc > 0.15) {
      acc = 0;
      try {
        const p = pos();
        if (p && G) {
          /* 入场过渡期间玩家还在"飞"（镜头→人眼的插值路径会穿过场馆内部），
             此时判定区域会误触发任务 → 只在落地后（无过渡）才判定。 */
          const inTrans = !!(A.walk && A.walk.trans && A.walk.trans.mode === 'in');
          /* 有目标系统时由 objectives 按 (s,y,u) 精确判定 */
          if (api.objectives) { if (!inTrans) api.objectives.check(p); }
          else if (!inTrans) G.checkPlayer(p);
          if (A.walk && A.walk.active && G.mode !== 'walk') G.setMode('walk');
          else if (!(A.walk && A.walk.active) && G.mode === 'walk') G.setMode('explore');
        }
      } catch (e) { /* 忽略 */ }
    }
  }
  try {
    last = 0;
    raf = requestAnimationFrame(frame);
  } catch (e) { errors.push('loop: ' + e.message); }

  /* ── 对外 / 就绪 ── */
  window.__gameApi = {
    ...api, missions: MISSIONS, landmarks: LM, errors, timings: tim,
    get ready() { return true; },
    stop() { running = false; try { cancelAnimationFrame(raf); } catch (e) { /* 忽略 */ } },
  };
  try {
    if (G) G.emit('ready');
    document.dispatchEvent(new CustomEvent('game:ready', { detail: { errors } }));
  } catch (e) { /* 忽略 */ }
  /* 让 HUD 立即同步一次任务/等级 */
  try { document.dispatchEvent(new CustomEvent('game:changed')); } catch (e) { /* 忽略 */ }
  window.__gameReady = true;
  if (errors.length) { try { console.warn('[game] 初始化降级：', errors); } catch (e) { /* 忽略 */ } }
  return window.__gameApi;
}

export default init;
