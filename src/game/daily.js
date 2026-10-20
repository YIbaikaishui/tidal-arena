/* ═══════════════════════════════════════════════════════════════════════
   daily.js — 每日挑战（v4 新增 · 重复可玩）
   ───────────────────────────────────────────────────────────────────────
   问题：一次性内容收齐之后游戏就"结束"了。v3 的答案是让玩家"重复刷"，
        但重复刷同样的内容没有意义。
   做法：按**日期做确定性种子**，每天生成一组"今日三项挑战"：
         · 疏散工况（今天疏散什么）
         · 摄影地点（今天去哪拍）
         · 印章目标（今天要找哪一枚）
       并给出门槛。全部完成即记入存档（caps: daily），HUD 里显示今日进度。

   确定性要求（可测）：同一天无论刷新多少次，挑战内容与门楣都必须一致；
   不同日期必须轮换（避免"每天一样"）。

   对外：window.__daily = { today, force, date, seedOf, keys, progress, check, on }
   ═══════════════════════════════════════════════════════════════════════ */
const DAILY_PREFIX = 'daily:';

/* FNV-1a：稳定的字符串 → 32 位种子 */
export function hash32(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function dateKey(d) {
  const t = d instanceof Date ? d : new Date(d == null ? Date.now() : d);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const dd = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const PHOTO_SPOTS = [
  { id: 'hero', name: '主入口轴线', hint: '正面机位，券洞与鞍面屋盖同框' },
  { id: 'roof', name: '屋盖内檐', hint: '贴近内檐，让悬挑薄边占满画面' },
  { id: 'pitch', name: '场边低机位', hint: '压低机位看 LED 板与三层看台' },
  { id: 'plaza', name: '球迷广场', hint: '退到广场，把整个场馆收进来' },
  { id: 'concourse', name: '二层环廊', hint: '站在环廊里拍"环"的透视' },
  { id: 'corner', name: '四角灯桥', hint: '找灯桥与屋盖结构的交接' },
];

export const DAILY_THRESHOLDS = {
  evacGrade: 'A',      /* 今日疏散至少要 A */
  photoScore: 74,      /* 今日摄影至少要 74 分 */
};

export function createDaily(app) {
  const A = window.__app || app || {};
  const subs = new Set();
  let T = null;      /* 今日挑战 */
  let override = null;

  const caps = () => (window.__caps || null);
  const todayKey = () => (override ? override : dateKey(Date.now()));

  function build(date) {
    const seed = hash32('tidal-daily-' + date);
    const scenes = (window.__evac && window.__evac.scenarioIds) || ['calm', 'rain', 'power', 'kickoff'];
    const stamps = (window.__stamps && window.__stamps.list) || [];
    const R = (n, salt) => (hash32(date + ':' + salt) % n);
    const scene = scenes.length ? scenes[R(scenes.length, 'sc')] : 'calm';
    const spot = PHOTO_SPOTS[Math.abs(hash32(date + ':spot') % PHOTO_SPOTS.length)];
    const stamp = stamps.length ? stamps[Math.abs(hash32(date + ':stamp') % stamps.length)].id : null;
    return {
      date, seed,
      scenario: scene,
      photoSpot: spot.id, photoName: spot.name, photoHint: spot.hint,
      stamp,
      evacGrade: DAILY_THRESHOLDS.evacGrade,
      photoScore: DAILY_THRESHOLDS.photoScore,
      items: [
        { id: 'evac', name: `疏散演练：${scene} 工况拿到 ${DAILY_THRESHOLDS.evacGrade} 以上`, kind: 'evac' },
        { id: 'photo', name: `摄影：在「${spot.name}」拍出 ≥${DAILY_THRESHOLDS.photoScore} 分`, kind: 'photo' },
        { id: 'stamp', name: '收集：找到今天的印章', kind: 'stamp' },
      ],
    };
  }

  function completeKey(date) { return DAILY_PREFIX + date; }

  function progress() {
    const c = caps();
    const date = todayKey();
    const done = !!(c && c.get('daily', {})[completeKey(date)]);
    const evac = c && c.get('evacBest', {})[T.scenario];
    const photo = c ? (c.get('photoBest', 0) || 0) : 0;
    const items = T.items.map((it) => {
      let ok = false;
      if (it.id === 'evac') ok = !!(evac && ({ S: 5, A: 4, B: 3, C: 2, D: 1 }[evac.grade] || 0) >= ({ S: 5, A: 4, B: 3, C: 2, D: 1 }[T.evacGrade] || 0));
      else if (it.id === 'photo') ok = photo >= T.photoScore;
      /* 逐项判据必须一致：这里直接问印章层，而不是读存档字段，
         否则实时发放（尚未落盘/同一帧内）会与存档读法产生分歧 */
      else ok = !!(T.stamp && window.__stamps && window.__stamps.has(T.stamp));
      return { ...it, done: ok };
    });
    return { date, done, items, finished: items.filter((x) => x.done).length, total: items.length };
  }

  /* 收尾：三项都达成 → 落盘为"今日已完成"，并给一次奖励 */
  function check() {
    const p = progress();
    if (p.finished >= p.total && !p.done) {
      const c = caps();
      if (c) {
        const d = { ...(c.get('daily', {}) || {}) };
        d[completeKey(p.date)] = true;
        c.set('daily', d);
      }
      try { window.__game?.addXP?.(30, '完成每日挑战'); } catch (e) { /* 忽略 */ }
      try { A.ui?.toast?.('每日挑战完成', `${p.date} · 三项全达成 · +30 积分`, 'green'); } catch (e) { /* 忽略 */ }
      try { document.dispatchEvent(new CustomEvent('daily:done', { detail: p })); } catch (e) { /* 忽略 */ }
    }
    for (const cb of subs) { try { cb(p); } catch (e) { /* 忽略 */ } }
    return p;
  }

  function refresh() {
    T = build(todayKey());
    try { if (window.__evac && T.scenario) window.__evac.reset(T.scenario); } catch (e) { /* 忽略 */ }
    try { document.dispatchEvent(new CustomEvent('daily:changed', { detail: T })); } catch (e) { /* 忽略 */ }
    return T;
  }

  /* 今日印章达成即刷新（印章由其它玩法发放，不经过 contest 事件） */
  try { document.addEventListener('stamps:changed', () => check()); } catch (e) { /* 忽略 */ }

  /* 测试/调试：强制某一天（不影响真实日期） */
  function force(date) {
    override = date === false || date === null ? null : dateKey(date);
    return refresh();
  }

  const api = {
    get today() {
      /* 印章层可能晚于本模块就绪（模块图顺序），到 T.stamp 为空时补建一次 */
      if (T && !T.stamp && window.__stamps && window.__stamps.list && window.__stamps.list.length) refresh();
      return T;
    },
    get progressValue() { return progress(); },
    progress, check, force, refresh,
    get date() { return todayKey(); },
    seedOf: (d) => hash32('tidal-daily-' + dateKey(d)),
    keys: Object.keys(DAILY_THRESHOLDS),
    photoSpots: PHOTO_SPOTS,
    on(cb) { if (typeof cb === 'function') { subs.add(cb); return () => subs.delete(cb); } return () => {}; },
  };
  window.__daily = api;
  refresh();
  /* 成绩变化时重新评估今日挑战 */
  try { document.addEventListener('contest:changed', () => check()); } catch (e) { /* 忽略 */ }
  return api;
}

export default createDaily;
