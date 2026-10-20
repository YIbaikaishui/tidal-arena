/* ═══════════════════════════════════════════════════════════════════════
   contest.js — 三表记分 + 个人最佳（v4 新增 · 重复可玩的地基）
   ───────────────────────────────────────────────────────────────────────
   问题：v3 的成绩全靠 toast 一闪而过，玩家拿不到"我比上次好"的证据，
        也就没有理由再来一次。
   做法：把三类可量化的成绩固化下来，并在 HUD 里给出"三表徽章"：

     疏散表  —— 每个工况的最优成绩（用时 / 评级 / 成功率），取最优的那一个
     摄影表  —— 构图最高分 + 评级
     综合表  —— 任务 + 徽章 + 洞察 + 印章 的完成度，算一个总督察分

   全部写进 window.__caps（与关卡状态同一份存档），刷新不丢。
   对外：window.__contest = { tiers, submitEvac, submitPhoto, board, medal,
                              best, clear, onChange, snapshot }
   ═══════════════════════════════════════════════════════════════════════ */
const GRADE_RANK = { S: 5, A: 4, B: 3, C: 2, D: 1, '—': 0 };

function capsApi() { return (typeof window !== 'undefined' && window.__caps) ? window.__caps : null; }

/* 用时越短越好；同级比用时。返回 true 表示本次更好 */
export function isBetter(prev, next) {
  if (!next) return false;
  if (!prev) return true;
  const rp = GRADE_RANK[prev.grade] || 0, rn = GRADE_RANK[next.grade] || 0;
  if (rn !== rp) return rn > rp;
  return (next.t || 999) < (prev.t || 999);
}

export function createContest(app) {
  const subs = new Set();
  const emit = (reason) => {
    for (const cb of subs) { try { cb(snapshot(), reason); } catch (e) { /* 忽略 */ } }
    try { document.dispatchEvent(new CustomEvent('contest:changed', { detail: { reason } })); } catch (e) { /* 忽略 */ }
  };

  const caps = () => capsApi();
  const store = (k, d) => { const c = caps(); return c ? (c.get(k, d) || d) : d; };

  /* ── 疏散表 ── */
  function bestEvac() {
    const m = store('evacBest', {});
    let best = null, bestId = null;
    for (const id of Object.keys(m)) {
      const r = m[id];
      if (!r) continue;
      if (!best || isBetter(best, r)) { best = r; bestId = id; }
    }
    return best ? { ...best, scenario: bestId } : null;
  }
  function submitEvac(scenarioId, result) {
    const c = caps();
    if (!c || !scenarioId || !result) return null;
    const m = { ...(c.get('evacBest', {}) || {}) };
    const next = { t: Math.round((result.t || 0) * 10) / 10, grade: result.grade || '—', success: +(result.success || 0).toFixed(3) };
    const prev = m[scenarioId];
    const better = isBetter(prev, next);
    if (better) { m[scenarioId] = next; c.set('evacBest', m); }
    emit('evac');
    return { better, prev: prev || null, next, best: bestEvac() };
  }

  /* ── 摄影表 ── */
  function submitPhoto(score) {
    const c = caps();
    if (!c || !(score > 0)) return null;
    const prev = c.get('photoBest', 0) || 0;
    if (score > prev) { c.set('photoBest', score); emit('photo'); return { better: true, prev, next: score }; }
    return { better: false, prev, next: prev };
  }

  /* ── 综合表 ── */
  function coverage() {
    const g = window.__game;
    const ins = window.__insights;
    const st = window.__stamps;
    const missions = g && Array.isArray(g.missions) ? g.missions.filter((m) => m.done).length : 0;
    const missionTotal = g && Array.isArray(g.missions) ? g.missions.length : 6;
    const badges = g && Array.isArray(g.badges) ? g.badges.length : 0;
    const insights = ins ? ins.found : 0;
    const insightTotal = ins ? ins.total : 12;
    const stamps = st ? st.found : 0;
    const stampTotal = st ? st.total : 0;
    /* 各占固定权重，合计 100：任务 40 / 徽章 20 / 洞察 24 / 印章 16 */
    const sc = (missionTotal ? (missions / missionTotal) * 40 : 0)
      + (5 ? (Math.min(badges, 5) / 5) * 20 : 0)
      + (insightTotal ? (insights / insightTotal) * 24 : 0)
      + (stampTotal ? (stamps / stampTotal) * 16 : 0);
    return { score: Math.round(sc), missions, missionTotal, badges, insights, insightTotal, stamps, stampTotal };
  }

  function board() {
    return {
      evac: { best: bestEvac(), perScenario: store('evacBest', {}) },
      photo: { best: store('photoBest', 0) },
      overall: coverage(),
    };
  }

  /* 三表徽章：达到某个水平就给一枚（纯计算，不落库；展示用） */
  function medal() {
    const ev = bestEvac();
    const ph = store('photoBest', 0);
    const ov = coverage();
    return [
      {
        id: 'evac', name: '疏散表', got: !!(ev && (GRADE_RANK[ev.grade] || 0) >= 4),
        label: ev ? `${ev.grade} · ${ev.t}″` : '尚无成绩',
        hint: '任一工况拿到 A 或 S',
      },
      {
        id: 'photo', name: '摄影表', got: ph >= 78,
        label: ph ? `${ph} 分` : '尚无成绩',
        hint: '构图评分 ≥ 78',
      },
      {
        id: 'overall', name: '综合表', got: ov.score >= 80,
        label: `${ov.score} 分`,
        hint: '覆盖度 ≥ 80',
      },
    ];
  }

  function snapshot() {
    return { board: board(), medal: medal(), tiers: ['evac', 'photo', 'overall'] };
  }

  const api = {
    submitEvac, submitPhoto, board, medal, coverage, best: bestEvac, isBetter,
    tiers: ['evac', 'photo', 'overall'],
    clear() {
      const c = caps();
      if (!c) return false;
      c.set('evacBest', {});
      c.set('photoBest', 0);
      emit('clear');
      return true;
    },
    onChange(cb) { if (typeof cb === 'function') { subs.add(cb); return () => subs.delete(cb); } return () => {}; },
    snapshot,
    get snapshotValue() { return snapshot(); },
  };
  window.__contest = api;
  return api;
}

export default createContest;
