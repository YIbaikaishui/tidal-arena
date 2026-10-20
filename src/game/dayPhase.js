/* ═══════════════════════════════════════════════════════════════════════
   dayPhase.js — 比赛日时段循环（v4 新增 · 创造性主轴）
   ───────────────────────────────────────────────────────────────────────
   问题：场馆本来就有 日间 / 黄昏 / 夜赛 三套照明，但对玩家来说它只是"看效果"的开关。
   做法：把照明绑到**一个比赛日**上，让每个时段承担一种玩法，照明从"皮肤"变成"关卡"。

     赛前 PRE   —— 日间。建馆、调容量、拍宣传照。玩家第一次走进广场时开始检票。
     开赛 KICK  —— 夜赛。全场灯桥点亮，疏散演练在此刻**更值钱**（限时更紧）。
     中场 HALF  —— 黄昏。转播休息：照片模式构图分 ×1.2，适合出片。
     赛后 POST  —— 日间散场。必须完成一次"满员疏散"才能结束比赛日。

   · 每个时段有：照明预设、玩法钩子（scoreMul / 提示 / 任务简报）、推进条件
   · 时段推进必须可被玩家看到：顶栏徽标（#btnMatch）+ 一段 toast，不能"悄悄换了天"
   · 全部状态落 window.__day，UI 只读不写
   对外：window.__day = { phase, phases, setPhase, next, reset, progress,
                          effects, scoreMul, on, update }
   ═══════════════════════════════════════════════════════════════════════ */
/* v5 注意：本模块刻意**不** import caps.js —— 模块图顺序会让 caps 在早期求值时被重复初始化；
   需要存档一律通过 window.__caps 访问（由 badges.js 先行注入）。 */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const PHASES = [
  {
    id: 'pre', name: '赛前', en: 'PRE-MATCH · BUILD', env: 'day', dur: 0,
    accent: '#e8c07a',
    tip: '建馆与调容量：建造时间轴、容量仪表、宣传照都在这段时间做',
    hooks: ['build', 'capacity', 'photo'],
  },
  {
    id: 'kickoff', name: '开赛', en: 'KICKOFF · NIGHT MATCH', env: 'night', dur: 45,
    accent: '#6fd3e0',
    tip: '灯桥全开：疏散演练此刻更紧急（限时 -10s，成绩 ×1.15）',
    hooks: ['evac', 'evacRush'],
    evac: { timePenalty: 10, scoreMul: 1.15 },
  },
  {
    id: 'halftime', name: '中场', en: 'HALFTIME · GOLDEN HOUR', env: 'dusk', dur: 60,
    accent: '#ffb379',
    tip: '黄金时段：照片构图分 ×1.2，去拍一张能进画廊的片子',
    hooks: ['photo', 'photoGolden'],
    photo: { scoreMul: 1.2 },
  },
  {
    id: 'after', name: '赛后', en: 'FULL TIME · EGRESS', env: 'day', dur: 0,
    accent: '#9fe6ff',
    tip: '散场：完成一次满员疏散，为这个比赛日收尾',
    hooks: ['evac', 'codex'],
    evac: { timePenalty: 0, scoreMul: 1.0 },
  },
];

const IDX = (id) => Math.max(0, PHASES.findIndex((p) => p.id === id));

export function createDayPhase(app) {
  const A = window.__app || app || {};
  const subs = new Set();

  const S = {
    idx: 0,
    t: 0,              /* 当前时段已持续的秒数 */
    auto: true,        /* 是否按时段时长自动推进 */
    days: 0,           /* 已完成多少个比赛日 */
    lastChange: 0,
  };

  const phase = () => PHASES[S.idx];
  const effects = () => {
    const p = phase();
    return {
      phase: p.id, name: p.name, env: p.env, accent: p.accent,
      evac: p.evac || null, photo: p.photo || null, hooks: p.hooks.slice(),
      tip: p.tip,
      auto: S.auto, t: S.t, dur: p.dur,
      progress: p.dur > 0 ? clamp(S.t / p.dur, 0, 1) : 0,
    };
  };

  function emit(reason) {
    const e = effects();
    for (const cb of subs) { try { cb(e, reason); } catch (err) { /* 忽略 */ } }
    try { document.dispatchEvent(new CustomEvent('day:phase', { detail: e })); } catch (e) { /* 忽略 */ }
  }

  /* 应用照明：优先走 UI 的 setEnv（它负责 1.2s 缓动与 HUD 文案），失败则直接改 preset */
  function applyEnv(envId) {
    try {
      const ui = A.ui;
      if (ui && typeof ui.setEnv === 'function') { ui.setEnv(envId); return true; }
    } catch (e) { /* 忽略 */ }
    return false;
  }

  function announce(p, silent) {
    if (silent) return;
    try {
      A.ui?.toast?.(
        `比赛日 · ${p.name}`,
        `${p.en} · ${p.tip}`,
        p.id === 'kickoff' ? 'gold' : 'plain',
      );
    } catch (e) { /* 忽略 */ }
    /* 顶栏徽标 */
    try {
      const btn = document.getElementById('btnMatch');
      const nm = document.getElementById('matchName');
      const dt = document.getElementById('matchTime');
      if (btn) {
        btn.hidden = false;
        btn.setAttribute('aria-label', `比赛日 当前时段 ${p.name}（点击进入下一时段）`);
        btn.style.setProperty('--match-accent', p.accent);
      }
      if (nm) nm.textContent = p.name;
      if (dt) dt.textContent = String(S.days + 1).padStart(2, '0');
    } catch (e) { /* 忽略 */ }
  }

  function setPhase(id, silent) {
    const next = IDX(id);
    const changed = next !== S.idx;
    S.idx = next;
    S.t = 0;
    const p = phase();
    applyEnv(p.env);
    if (changed) S.lastChange = Date.now();
    announce(p, silent || !changed);
    emit('phase');
    return p.id;
  }

  /* 推进：赛后 → 回到赛前（新的一天），同时累计 days */
  function next(silent) {
    const wasAfter = phase().id === 'after';
    const ni = (S.idx + 1) % PHASES.length;
    if (wasAfter) S.days += 1;
    setPhase(PHASES[ni].id, silent);
    if (wasAfter && !silent) {
      try { A.ui?.toast?.('比赛日结束', `第 ${S.days} 个比赛日完成 · 新的一天从「赛前」开始`, 'green'); } catch (e) { /* 忽略 */ }
    }
    return phase().id;
  }

  function reset() {
    S.idx = 0; S.t = 0; S.auto = true;
    applyEnv('day');
    if (S.lastChange) S.lastChange = Date.now();
    emit('reset');
    return phase().id;
  }

  function update(dt) {
    if (!S.auto || !(dt > 0)) return;
    S.t += dt;
    const p = phase();
    if (p.dur > 0 && S.t >= p.dur) { next(false); return; }
    /* 进度条不需要每帧刷 DOM，交给 emit 节流 */
    S._acc = (S._acc || 0) + dt;
    if (S._acc > 1) { S._acc = 0; emit('tick'); }
  }

  /* ══════════ 玩法钩子（供其它模块查询） ══════════ */
  function evacMods() {
    const e = phase().evac;
    return e ? { timePenalty: e.timePenalty, scoreMul: e.scoreMul } : { timePenalty: 0, scoreMul: 1 };
  }
  function photoMods() {
    const e = phase().photo;
    return e ? { scoreMul: e.scoreMul } : { scoreMul: 1 };
  }

  const api = {
    phases: PHASES, update, next, reset, setPhase, evacMods, photoMods,
    get phase() { return phase().id; },
    get kickoff() { return phase().id === 'kickoff'; },
    get info() { return { ...phase() }; },
    get days() { return S.days; },
    get auto() { return S.auto; },
    get progress() { return effects(); },
    get effects() { return effects; },
    on(cb) { if (typeof cb === 'function') { subs.add(cb); return () => subs.delete(cb); } return () => {}; },
    setAuto(v) { S.auto = !!v; emit('auto'); return S.auto; },
  };

  window.__day = api;
  /* 首次进入：应用赛前照明（日间），让玩家先看见白天、再进夜赛 */
  applyEnv(phase().env);
  announce(phase(), true);
  emit('boot');
  return api;
}

export default createDayPhase;
