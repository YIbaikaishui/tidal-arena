/* ═══════════════════════════════════════════════════════════════════════
   state.js — 潮汐场游戏状态机（SPEC 3.5）
   · window.__game = {xp, level, badges, missions, stats, mode, addXP,
                      complete, reset, save, load, onChange, ...}
   · 6 个任务 / 每 120 XP 升 1 级 / localStorage: tidal_arena_save_v1
   · 任何变化 → document.dispatchEvent(new CustomEvent('game:changed'))
   本文件不 import 任何其他模块，可单独加载；缺 DOM/存储时降级不抛错。

   ⚠️ v5 架构约束（踩过坑，改动前务必看）：
     本文件**不得** import 任何会加载 three / scenes / walk 的模块。
     求值顺序是 THREE → postfx → orbit → walk → **本文件**。
     若本文件把 game/world.js（里面 import 了 scenes/arena.js）拉进来，
     arena 的求值期代码会在 walk 模块初始化完成前执行，导致
     `Cannot access 'Walk' before initialization`，整页白屏。
     世界相关（徽章/洞察/目标/疏散）延迟到 _tick / initWorld() 之后才 import。
   ═══════════════════════════════════════════════════════════════════════ */
export const SAVE_KEY = 'tidal_arena_save_v1';
export const XP_PER_LEVEL = 120;
export const GAME_VERSION = 'v5.0';

/* ── 6 个任务（探索 / 门厅 / 环廊 / 通道 / 疏散 / 收藏） ── */
/* desc 里的 {n} 会被真实容量（座位模型 MODEL.total）替换，避免写死数字打架 */
export const MISSIONS = [
  { id: 'm1', name: '抵达球迷广场', desc: '走出场馆，来到南侧球迷广场', reward: 24 },
  { id: 'm2', name: '进入入口大厅', desc: '穿过 24m 主入口券洞，走进门厅', reward: 24 },
  { id: 'm3', name: '登上二层环廊', desc: '上到二层环廊，俯瞰 105×68m 全场', reward: 30 },
  { id: 'm4', name: '进入球员通道', desc: '走进北侧球员通道（更衣室方向）', reward: 30 },
  { id: 'm5', name: '完成疏散演练', desc: '{n} 人疏散成功率 ≥ 85%', reward: 40 },
  { id: 'm6', name: '集齐 5 枚徽章', desc: '广场 / 门厅 / 一层环廊 / 二层环廊 / 中圈 全收集', reward: 48 },
];

/* 把 {n} 占位符换成真实容量 */
const fillDesc = (desc, n) => String(desc || '').replace(/\{n\}/g, (n || 0).toLocaleString('en-US'));

/* ══════════ 等级解锁（让 XP 有实际意义） ══════════ */
export const LEVEL_UNLOCKS = [
  { level: 2, key: 'dusk', name: '黄昏模式', desc: '第三种照明预设：日落后 18 分钟的天光' },
  { level: 3, key: 'film', name: '胶片滤镜', desc: '照片模式解锁暖调 / 黑白 / 青调与构图评分' },
  { level: 4, key: 'broadcast', name: '应急广播', desc: '疏散调度台解锁 3 次分区疏导' },
  { level: 5, key: 'codex', name: '建筑洞察图鉴', desc: '解锁 12 处建筑细节的讲解与收藏' },
];

const DEFAULT_STATS = () => ({
  playTime: 0, missions: 0, badges: 0, evacRate: 0, evacTime: 0,
  evacRuns: 0, photos: 0, distance: 0, xpEarned: 0,
});
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);

/* 延迟加载世界层（见文件头说明）。永不抛错：失败时返回 null，主体展示不受影响。 */
let _worldP = null;
export function initWorld() {
  if (_worldP) return _worldP;
  _worldP = import('./world.js').then((m) => {
    try { return m.initWindowWorld(window.__app); } catch (e) {
      console.warn('[game] world 初始化失败', e);
      return null;
    }
  }).catch((e) => {
    console.warn('[game] world 模块加载失败', e);
    try { window.__gameError = String(e && e.message || e); } catch (e2) { /* 忽略 */ }
    return null;
  });
  return _worldP;
}

export function createGame() {
  if (window.__game && window.__game.__isGame) return window.__game;

  const subs = new Set();
  const levelHooks = [];
  const S = {
    xp: 0, level: 1, badges: [],
    missions: MISSIONS.map((m) => ({ ...m, done: false })),
    stats: DEFAULT_STATS(), mode: 'explore',
    landmarks: null, savedAt: 0, capacity: 0, unlocks: [],
  };

  const inLevel = () => clamp(Math.round(S.xp - (S.level - 1) * XP_PER_LEVEL), 0, XP_PER_LEVEL);
  function snapshot() {
    return {
      xp: S.xp, level: S.level, xpMax: XP_PER_LEVEL, xpInLevel: inLevel(),
      xpPct: clamp((inLevel() / XP_PER_LEVEL) * 100, 0, 100),
      badges: S.badges.slice(), badgeCount: S.badges.length,
      missions: S.missions.map((m) => ({ ...m })),
      missionDone: S.missions.filter((m) => m.done).length,
      missionTotal: S.missions.length, stats: { ...S.stats },
      mode: S.mode, savedAt: S.savedAt, capacity: S.capacity,
      version: GAME_VERSION,
    };
  }
  function emit(reason) {
    const snap = snapshot();
    for (const cb of subs) { try { cb(snap, reason); } catch (e) { /* 回调异常不扩散 */ } }
    try {
      document.dispatchEvent(new CustomEvent('game:changed', { detail: snap }));
    } catch (e) { /* 非浏览器环境 */ }
  }

  function save() {
    const data = {
      v: 1, xp: S.xp, badges: S.badges.slice(),
      missions: S.missions.filter((m) => m.done).map((m) => m.id),
      stats: { ...S.stats }, mode: S.mode, ts: Date.now(),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      S.savedAt = data.ts;
      return true;
    } catch (e) { return false; }
  }
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
    if (!raw) return false;
    let d;
    try { d = JSON.parse(raw); } catch (e) { return false; }
    if (!d || typeof d !== 'object') return false;
    S.xp = Math.max(0, num(d.xp));
    S.level = 1 + Math.floor(S.xp / XP_PER_LEVEL);
    S.unlocks = LEVEL_UNLOCKS.filter((u) => S.level >= u.level).map((u) => u.key);
    S.badges = Array.isArray(d.badges) ? d.badges.filter((b) => typeof b === 'string') : [];
    const done = new Set(Array.isArray(d.missions) ? d.missions : []);
    S.missions = MISSIONS.map((m) => ({ ...m, done: done.has(m.id) }));
    S.stats = Object.assign(DEFAULT_STATS(), d.stats || {});
    S.stats.missions = S.missions.filter((m) => m.done).length;
    S.stats.badges = S.badges.length;
    S.mode = typeof d.mode === 'string' ? d.mode : 'explore';
    S.savedAt = num(d.ts);
    return true;
  }

  function addXP(n, why) {
    n = Math.round(num(n));
    if (!n) return S.xp;
    const before = S.level;
    S.xp = Math.max(0, S.xp + n);
    if (n > 0) S.stats.xpEarned += n;
    S.level = 1 + Math.floor(S.xp / XP_PER_LEVEL);
    save();
    if (S.level > before) {
      const gained = [];
      for (const u of LEVEL_UNLOCKS) {
        if (S.level >= u.level && !S.unlocks.includes(u.key)) {
          S.unlocks.push(u.key);
          gained.push(u);
        }
      }
      for (const h of levelHooks) { try { h(S.level, why || '探索'); } catch (e) { /* 忽略 */ } }
      try {
        document.dispatchEvent(new CustomEvent('game:levelup',
          { detail: { level: S.level, xp: S.xp, reason: why || '', unlocks: gained } }));
      } catch (e) { /* 忽略 */ }
    }
    emit('xp');
    return S.xp;
  }

  const missionDone = (id) => !!(S.missions.find((x) => x.id === id) || {}).done;

  function complete(id, meta) {
    const m = S.missions.find((x) => x.id === id);
    if (!m || m.done) return false;
    m.done = true;
    if (meta && typeof meta === 'object') m.meta = meta;
    S.stats.missions = S.missions.filter((x) => x.done).length;
    save();
    emit('mission');
    addXP(m.reward, m.name);
    return true;
  }

  function awardBadge(id) {
    if (!id || S.badges.includes(id)) return false;
    S.badges.push(id);
    S.stats.badges = S.badges.length;
    save();
    emit('badge');
    addXP(24, '收集徽章');
    if (S.badges.length >= 5) complete('m6');
    return true;
  }

  /* 疏散演练结束回填：成功率 ≥85% → m5 */
  function evacDone({ successRate = 0, time = 0, rating = 'C' } = {}) {
    S.stats.evacRate = Math.round(successRate * 1000) / 10;
    S.stats.evacTime = Math.round(time);
    S.stats.evacRuns += 1;
    const ok = successRate >= 0.85;
    emit('evac');
    addXP(20, '疏散演练');
    if (ok) complete('m5', { successRate, time, rating });
    save();
    return ok;
  }

  function reset(clearSave = true) {
    S.xp = 0; S.level = 1; S.badges = [];
    S.unlocks = [];
    S.missions = MISSIONS.map((m) => ({ ...m, done: false }));
    S.stats = DEFAULT_STATS();
    S.mode = 'explore';
    if (clearSave) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ } }
    /* v4：世界层的一次性状态（徽章 taken / 洞察 got / 印章）与 XP 存档必须一起清，
       否则"重置进度"之后世界里已经没有徽章，玩家永远集不齐（状态自相矛盾）。 */
    try { if (window.__caps && window.__caps.clear) window.__caps.clear(); } catch (e) { /* 忽略 */ }
    try { document.dispatchEvent(new CustomEvent('game:reset')); } catch (e) { /* 忽略 */ }
    emit('reset');
    return snapshot();
  }

  function setMode(mode) {
    if (!mode || S.mode === mode) return S.mode;
    S.mode = mode; emit('mode'); return S.mode;
  }

  /* 真实容量注入：把任务文案里的 {n} 换成座位模型的总座数 */
  function setCapacity(n) {
    n = Math.max(0, Math.round(num(n)));
    if (!n) return S.capacity;
    S.capacity = n;
    const def = MISSIONS.find((x) => x.id === 'm5');
    const m = S.missions.find((x) => x.id === 'm5');
    if (def && m) m.desc = fillDesc(def.desc, n);
    emit('capacity');
    return S.capacity;
  }

  /* 等级解锁查询 */
  function unlocked(key) {
    if (!key) return false;
    if (S.unlocks.includes(key)) return true;
    const u = LEVEL_UNLOCKS.find((x) => x.key === key);
    return !!(u && S.level >= u.level);
  }
  function unlockList() { return LEVEL_UNLOCKS.map((u) => ({ ...u, got: unlocked(u.key) })); }
  function onChange(cb) {
    if (typeof cb !== 'function') return () => {};
    subs.add(cb);
    try { cb(snapshot(), 'init'); } catch (e) { /* 忽略 */ }
    return () => subs.delete(cb);
  }
  const onLevel = (cb) => { if (typeof cb === 'function') levelHooks.push(cb); };

  /* ── 位置 → 任务判定（旧路径；有目标系统时由 objectives 接管） ── */
  function setLandmarks(lm) { S.landmarks = lm || null; }
  function checkPlayer(p) {
    const lm = S.landmarks;
    if (!p || !lm) return null;
    const dxz = (q) => Math.hypot(p.x - q.x, p.z - q.z);
    const hit = [];
    if (!missionDone('m1') && lm.plaza && dxz(lm.plaza) < 55 && p.y < 14) hit.push('m1');
    if (!missionDone('m2') && lm.hall && dxz(lm.hall) < 22 && p.y < 16) hit.push('m2');
    if (!missionDone('m3') && lm.concourse && p.y > lm.concourse.y - 4 && p.y < lm.concourse.y + 8
      && dxz(lm.concourse) < 26) hit.push('m3');
    if (!missionDone('m4') && lm.tunnel && dxz(lm.tunnel) < 26 && p.y < 20) hit.push('m4');
    for (const id of hit) complete(id);
    return hit.length ? hit : null;
  }
  function tick(dt) { if (dt > 0 && dt < 1) S.stats.playTime += dt; }

  const api = {
    __isGame: true,
    VERSION: GAME_VERSION,
    get xp() { return S.xp; },
    get level() { return S.level; },
    get xpMax() { return XP_PER_LEVEL; },
    get xpInLevel() { return inLevel(); },
    get badges() { return S.badges; },
    get missions() { return S.missions; },
    get stats() { return S.stats; },
    get mode() { return S.mode; },
    get capacity() { return S.capacity; },
    get unlocks() { return S.unlocks.slice(); },
    get saveKey() { return SAVE_KEY; },
    get nextMission() { return S.missions.find((m) => !m.done) || null; },
    addXP, complete, reset, save, load, onChange, onLevel, missionDone,
    awardBadge, evacDone, setMode, setLandmarks, checkPlayer, tick, snapshot, emit, setCapacity,
    unlocked, unlockList, LEVEL_UNLOCKS, initWorld,
  };

  load();
  window.__game = api;
  try {
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') save();
    });
  } catch (e) { /* 忽略 */ }
  emit('boot');
  /* 主循环一旦跑起来（标志位已就绪），立即把世界层接进来。见 init.js */
  return api;
}

if (typeof window !== 'undefined') {
  try { if (!window.__game) createGame(); } catch (e) { console.warn('[game] state 初始化失败', e); }
}
export default createGame;
