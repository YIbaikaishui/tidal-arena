/* ═══════════════════════════════════════════════════════════════════════
   init.js — 游戏层入口（app.js 在首帧之后 await init(window.__app)）
   只依赖 state.js（无 three / 无场景代码），因此可以静态导入而不改变求值顺序。
   真正的世界层（徽章/目标/图鉴/疏散/建造/照片/音效/时段/成绩/每日挑战）
   在 initWorld() 里**延迟导入**，此时主循环的 rAF 已经跑过一帧。
   对外：window.__gameApi（由 world.js 填充），window.__game（由 state.js 填充）
   ═══════════════════════════════════════════════════════════════════════ */
import { createGame, MISSIONS, initWorld } from './state.js';

export async function init(app) {
  const A = window.__app || app || {};
  let game = null;
  try { game = (window.__game && window.__game.__isGame) ? window.__game : createGame(); } catch (e) {
    try { console.warn('[game] state 初始化失败', e); } catch (_) { /* 忽略 */ }
  }
  /* 首屏之后再把世界层接进来（失败不影响建筑展示） */
  let world = null;
  try { world = await initWorld(A); } catch (e) {
    try { console.warn('[game] world 初始化失败', e); } catch (_) { /* 忽略 */ }
    try { window.__gameError = String(e && e.message || e); } catch (_) { /* 忽略 */ }
  }
  return world || { game, missions: MISSIONS, ready: !!world };
}

export default init;
