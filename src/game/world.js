/* ═══════════════════════════════════════════════════════════════════════
   world.js — 世界层总装（徽章 / 目标 / 图鉴 / 疏散 / 建造 / 照片 / 音效 / 时段 / 成绩 / 每日挑战）
   由 state.js 的 initWorld() **延迟导入**：等主循环的 requestAnimationFrame 已经跑起来、
   walk 等模块初始化完毕后才求值本模块及其世界依赖（见 state.js 文件头的架构约束）。

   对外：window.__gameApi = { game, badges, objectives, insights, day, evac, build,
                              photo, audio, contest, daily, stamps, stop, errors }
   ═══════════════════════════════════════════════════════════════════════ */
import { MISSIONS } from './state.js';
import { createBadges } from './badges.js';
import { createEvac } from './evacuation.js';
import { createConstruction } from './construction.js';
import { createPhoto } from './photo.js';
import { createAudio } from './audio.js';
import { createObjectives } from './objectives.js';
import { createInsights } from './insights.js';
import { createDayPhase } from './dayPhase.js';
import { createContest } from './contest.js';
import { createDaily } from './daily.js';
import { createStamps } from './stamps.js';

const LM = {
  plaza: { x: 0, z: 190 },
  hall: { x: 0, z: 118 },
  concourse: { x: 0, z: 84, y: 28 },
  tunnel: { x: 0, z: -96 },
};

export function initWindowWorld(app) {
  const A = window.__app || app || {};
  const api = {
    game: null, badges: null, objectives: null, insights: null, day: null,
    evac: null, build: null, photo: null, audio: null,
    contest: null, daily: null, stamps: null,
  };
  const errors = [];
  const guard = (name, fn) => {
    try { return fn(); } catch (e) {
      errors.push(name + ': ' + (e && e.message || e));
      try { console.warn('[game] ' + name + ' 初始化失败', e); } catch (_) { /* 忽略 */ }
      return null;
    }
  };

  const T0 = performance.now(); const tim = [];
  const tk = (n) => { tim.push([n, +(performance.now() - T0).toFixed(0)]); };

  api.game = window.__game || null;
  const G = api.game;
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
    guard('capacity', () => {
      const model = A.arena && A.arena.model;
      if (model && model.total) G.setCapacity(model.total);
    });
  }

  /* ① 成绩 / 每日挑战（纯数据，无 3D 依赖，先建） */
  api.contest = guard('contest', () => createContest(A)); tk('contest');
  api.daily = guard('daily', () => createDaily(A)); tk('daily');

  /* ② 世界实体 */
  api.badges = guard('badges', () => createBadges(A)); tk('badges');
  api.objectives = guard('objectives', () => createObjectives(A)); tk('objectives');
  api.insights = guard('insights', () => createInsights(A)); tk('insights');
  api.stamps = guard('stamps', () => createStamps(A)); tk('stamps');
  api.evac = guard('evacuation', () => createEvac(A)); tk('evac');
  api.build = guard('construction', () => createConstruction(A)); tk('build');
  api.photo = guard('photo', () => createPhoto(A)); tk('photo');
  api.audio = guard('audio', () => createAudio()); tk('audio');
  api.day = guard('dayPhase', () => createDayPhase(A)); tk('day');

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
    try { api.stamps && api.stamps.update(dt); } catch (e) { /* 忽略 */ }
    try { api.objectives && api.objectives.update(dt); } catch (e) { /* 忽略 */ }
    try { api.insights && api.insights.update(dt); } catch (e) { /* 忽略 */ }
    try { api.evac && api.evac.update(dt); } catch (e) { /* 忽略 */ }
    try { api.build && api.build.update(dt); } catch (e) { /* 忽略 */ }
    try { api.day && api.day.update(dt); } catch (e) { /* 忽略 */ }
    try { G && G.tick(dt); } catch (e) { /* 忽略 */ }

    acc += dt;
    if (acc > 0.15) {
      acc = 0;
      try {
        const p = pos();
        if (p && G) {
          /* 入场过渡期间玩家还在"飞"（镜头→人眼的插值路径会穿过场馆内部），
             此时判定区域会误触发任务 → 只在落地后（无过渡）才判定。 */
          const inTrans = !!(A.walk && A.walk.trans && A.walk.trans.mode === 'in');
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

  window.__gameApi = {
    ...api, missions: MISSIONS, landmarks: LM, errors, timings: tim,
    get ready() { return true; },
    stop() { running = false; try { cancelAnimationFrame(raf); } catch (e) { /* 忽略 */ } },
  };
  try {
    if (G) G.emit('ready');
    document.dispatchEvent(new CustomEvent('game:ready', { detail: { errors } }));
  } catch (e) { /* 忽略 */ }
  try { document.dispatchEvent(new CustomEvent('game:changed')); } catch (e) { /* 忽略 */ }
  window.__gameReady = true;
  if (errors.length) { try { console.warn('[game] 初始化降级：', errors); } catch (e) { /* 忽略 */ } }
  return window.__gameApi;
}

export default initWindowWorld;
