/* ═══════════════════════════════════════════════════════════════════════
   caps.js — 存档能力层（v4 新增）
   · 解决 v3 的"半存档"：state.js 存了 xp / 任务 / 徽章 id，
     但**徽章的 3D 收集状态（taken）与建筑洞察（got）没有存**，
     于是刷新后：徽章与洞察在世界里"复活"，玩家还能再拿一遍分 —— 存档自相矛盾 + 刷分漏洞。
   · 这里用「已消费集合」作为唯一真源：任何一次性的世界状态（徽章 taken / 洞察 got /
     印章 / 每日挑战）都写进同一份 localStorage，load 时回灌。
   · 也负责 `report()`：给玩家一眼看清"存档存了什么"，避免"我明明拿了却没了"的困惑。
   对外：window.__caps = { get, set, has, key, keys, save, load, report, clear, onChange }
   本模块不 import 其它模块，缺 DOM/存储时静默降级。
   ═══════════════════════════════════════════════════════════════════════ */
export const CAPS_KEY = 'tidal_arena_caps_v1';

const DEFAULT = () => ({
  v: 1,
  badgesTaken: [],      /* 已收集徽章 id */
  insightsGot: [],      /* 已收录洞察 id */
  stamps: [],           /* 已获得的印章 id */
  daily: {},            /* { 'daily:2026-10-20': true } 每日挑战完成记录 */
  evacBest: {},         /* { scenarioId: {t, grade, success} } */
  photoBest: 0,
  seen: {},             /* 一次性提示（例如"已看过某说明"） */
});

let S = DEFAULT();
const subs = new Set();
let dirty = false;
/* 时钟保护：state.js 的 load() 跑在模块求值期（早于本模块求值），
   若玩家先写盘、state 随后用旧快照覆盖，会把新数据吞掉。
   这里记录"本页第一次写盘的时间"，之后的 load() 会拒绝覆盖晚于它的数据。 */
let firstWriteTs = 0;

function emit(reason) {
  try {
    for (const cb of subs) { try { cb(S, reason); } catch (e) { /* 忽略 */ } }
    document.dispatchEvent(new CustomEvent('caps:changed', { detail: { reason } }));
  } catch (e) { /* 非浏览器环境 */ }
}

/* ⚠️ 必须在模块求值期就直接读盘（v4 踩坑记录）：
   `export` 函数声明会被提升，而调用方（badges.js / insights.js）在**自己的求值期**
   就会调 restore() 回灌存档。若读盘交给 index.js 的 init() 再去调 load()，
   那一刻 caps 拿到的还是空白 DEFAULT，restore() 自然什么都没恢复 ——
   表现为"存档文件里有数据，世界里的徽章照样复活"。
   所以读盘放在这里，并以函数声明形式定义（提升到模块顶层执行）。 */
load();

export function load() {
  let raw = null;
  try { raw = localStorage.getItem(CAPS_KEY); } catch (e) { return false; }
  if (!raw) { S = DEFAULT(); return false; }
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return false;
    /* 本页已经写过更新的数据 → 拒绝用旧快照覆盖 */
    if (firstWriteTs && typeof d.ts === 'number' && d.ts < firstWriteTs) return false;
    const base = DEFAULT();
    /* 只接受已知字段 + 正确类型：坏存档不得让世界状态崩溃 */
    for (const k of Object.keys(base)) {
      const v = d[k];
      if (Array.isArray(base[k])) base[k] = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : base[k];
      else if (typeof base[k] === 'number') base[k] = typeof v === 'number' && isFinite(v) ? v : base[k];
      else if (base[k] && typeof base[k] === 'object') base[k] = (v && typeof v === 'object') ? v : base[k];
    }
    S = base;
    return true;
  } catch (e) { S = DEFAULT(); return false; }
}

export function save() {
  try {
    S.ts = Date.now();
    localStorage.setItem(CAPS_KEY, JSON.stringify(S));
    dirty = false;
    if (!firstWriteTs) firstWriteTs = S.ts;
    return true;
  } catch (e) { return false; }
}

/* 通用：把一个一次性状态写进去（去重 + 落盘）。返回 true 表示这是"新"状态。 */
export function add(key, id) {
  if (!key || !id) return false;
  const arr = S[key];
  if (!Array.isArray(arr)) return false;
  if (arr.includes(id)) return false;
  arr.push(id);
  save();
  emit(key);
  return true;
}
export function has(key, id) { const a = S[key]; return Array.isArray(a) && a.includes(id); }
export function hasAll(key) { const a = S[key]; return Array.isArray(a) ? a.slice() : []; }

export function setFlag(key, val) {
  if (typeof S[key] === 'boolean' && S[key] === !!val) return false;
  S[key] = val;
  save();
  emit(key);
  return true;
}
export function get(key, dflt) { return (key in S) ? S[key] : dflt; }
export function set(key, val) { S[key] = val; save(); emit(key); return S[key]; }

/* 给 HUD 用：一眼看清存了什么 */
export function report() {
  return {
    key: CAPS_KEY,
    badges: S.badgesTaken.length,
    insights: S.insightsGot.length,
    stamps: S.stamps.length,
    daily: Object.keys(S.daily).length,
    evacBest: Object.keys(S.evacBest).length,
    photoBest: S.photoBest,
    available: (() => { try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return true; } catch (e) { return false; } })(),
  };
}

export function clear() {
  S = DEFAULT();
  try { localStorage.removeItem(CAPS_KEY); } catch (e) { /* 忽略 */ }
  emit('clear');
}

export const onChange = (cb) => { if (typeof cb === 'function') { subs.add(cb); return () => subs.delete(cb); } return () => {}; };

const api = {
  KEY: CAPS_KEY, load, save, add, has, hasAll, setFlag, get, set, report, clear, onChange,
  get state() { return S; },
};

if (typeof window !== 'undefined') window.__caps = api;
export default api;
