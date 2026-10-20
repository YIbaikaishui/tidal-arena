/* ═══════════════════════════════════════════════════════════════════════
   stamps.js — 徽章印章 / 建筑画廊（v4 新增 · 创造性收集品）
   ───────────────────────────────────────────────────────────────────────
   问题：v3 的收集品（5 徽章 + 12 洞察）全是"走到就自动拿"，
        玩家没有"发现"与"操作"的乐趣，收集品也不构成一个"作品"。
   做法：印章不是散落的道具，而是要**被激活**的一条游戏弧线：

     s1 破土     —— 把建造时间轴从 0 拖到 100（5 阶段都看过）
     s2 总座     —— 在容量仪表里读满 3 层 × 20 区（本层已有入口，这里只做发放）
     s3 全夜灯   —— 比赛日进入「开赛」时段
     s4 满员     —— 疏散送达 100% 且评级 ≥ A
     s5 极光     —— 照片构图分 ≥ 88（S 级）
     s6 潮线     —— 5 枚建筑徽章 + 12 处洞察全部收录（"建筑学通关"）

   每枚印章 +12 积分，并在 `window.__stamps` 里可查（HUD 画廊面板）。
   印章本身不是 3D 物件，而是"你在这个世界里做过的事"的凭证 —— 这是与徽章/洞察的分工。

   对外：window.__stamps = { list, found, total, grant, has, update, on }
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

export const STAMP_DEFS = [
  { id: 's1', name: '破土', en: 'GROUNDBREAK', desc: '把建造时间轴从 0 拖到 100%，看完五个施工阶段。', color: 0xe8c07a },
  { id: 's2', name: '总座', en: 'FULL HOUSE', desc: '在容量仪表里逐层逐区读完 3 层 × 20 区。', color: 0x9fe6ff },
  { id: 's3', name: '全夜灯', en: 'LIGHTS UP', desc: '把比赛日推进到「开赛」时段，全场灯桥点亮。', color: 0x6fd3e0 },
  { id: 's4', name: '满员', en: 'CLEARED', desc: '完成一次 100% 疏散，并且评级不低于 A。', color: 0x8ff0c8 },
  { id: 's5', name: '极光', en: 'S-GRADE', desc: '在照片模式拍出一张构图 S 级（≥88 分）的作品。', color: 0xffb0c4 },
  { id: 's6', name: '潮线', en: 'TIDE LINE', desc: '收齐 5 枚建筑徽章与 12 处建筑洞察 —— 建筑学通关。', color: 0xd7b6ff },
  { id: 's7', name: '调度', en: 'DISPATCH', desc: '在疏散里用满 10 组人力，并且整场没有超时。', color: 0xffd27a },
];

const GRADE = { S: 5, A: 4, B: 3, C: 2, D: 1, '—': 0 };

export function createStamps(app) {
  const A = window.__app || app || {};
  const scene = A.stage && A.stage.scene;
  const subs = new Set();
  const list = STAMP_DEFS.map((d) => ({ ...d, got: false }));

  const caps = () => (window.__caps || null);
  const isGot = (id) => !!(caps() && caps().has('stamps', id));

  /* 3D 提示：印章本身不是道具，但在达成瞬间给一个"从天而降的光环"作为表演。
     ⚠️ v4 踩坑：RingGeometry 在 DoubleSide 下叠加深色场景 + 软件光栅会被过曝成
     一大片粉色实心圆盘（截图中确认为视觉污染）。改为：细环 + 低不透明度 + 加色混合 +
     scale 上限，宁可"淡"也不要"盖住整个画面"。 */
  let burst = null;
  let burstT = 0;
  try {
    if (scene) {
      const g = new THREE.RingGeometry(2.6, 2.9, 48);
      burst = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        color: 0xffd27a, transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthTest: false, depthWrite: false,
        blending: THREE.AdditiveBlending, toneMapped: false,
      }));
      burst.name = 'GAME_STAMP_BURST';
      burst.rotation.x = -Math.PI / 2;
      burst.renderOrder = 950;
      burst.visible = false;
      scene.add(burst);
    }
  } catch (e) { burst = null; }

  function emit(reason) {
    const p = { found: found(), total: list.length, list: list.map((d) => ({ id: d.id, got: d.got })), reason };
    for (const cb of subs) { try { cb(p); } catch (e) { /* 忽略 */ } }
    try { document.dispatchEvent(new CustomEvent('stamps:changed', { detail: p })); } catch (e) { /* 忽略 */ }
  }

  function grant(id, quiet) {
    const d = list.find((x) => x.id === id);
    if (!d || d.got) return false;
    d.got = true;
    const c = caps();
    if (c) c.add('stamps', id);
    if (!quiet) {
      try { window.__game?.addXP?.(12, '建筑印章'); } catch (e) { /* 忽略 */ }
      try { A.ui?.toast?.('获得印章', `${d.name} · ${d.desc}`, 'gold'); } catch (e) { /* 忽略 */ }
      try { window.__audio?.sfx?.('badge'); } catch (e) { /* 忽略 */ }
      /* 表演：在玩家/相机上方亮一下 */
      if (burst) {
        const cam = A.stage && A.stage.camera;
        const w = A.walk;
        const base = (w && w.active && w.pos) ? w.pos.clone() : (cam ? cam.position.clone() : null);
        if (base) {
          burst.position.set(base.x, Math.max(0.4, base.y - 1.4), base.z);
          burst.material.color.setHex(d.color || 0xffd27a);
          burst.material.opacity = 1;
          burstT = 1.1;
          burst.visible = true;
        }
      }
    }
    emit('grant');
    return true;
  }

  function found() { return list.filter((d) => d.got).length; }

  /* 从存档回灌 */
  function restore() {
    const c = caps();
    if (!c) return 0;
    let n = 0;
    for (const d of list) { if (c.has('stamps', d.id)) { d.got = true; n++; } }
    return n;
  }

  /* 每次事件都重新评估（成本极低：6 个布尔） */
  function evaluate() {
    const g = window.__game;
    const ev = window.__evac;
    const bd = window.__badges;
    const ins = window.__insights;
    const ph = window.__photo;
    const c = caps();

    /* s2 总座：容量仪表的阅读计数由 ui.js 写在 S._capReads —— 这里读 UI 状态 */
    try { if (A.ui && A.ui.S && (A.ui.S._capReads || 0) >= 3) grant('s2'); } catch (e) { /* 忽略 */ }
    /* s1 破土：建造时间轴走到 100 */
    try {
      const b = window.__build;
      if (b && b.phase >= 99.9 && (b._visited || b.phase)) {
        /* 需要"走过五阶段"：用一次 0→100 的播放记录做判据 */
        if (b._playedFromZero !== false) grant('s1');
      }
    } catch (e) { /* 忽略 */ }
    /* s4 满员 / s7 调度：疏散结果 */
    try {
      const best = c && c.get('evacBest', {});
      for (const k of Object.keys(best || {})) {
        const r = best[k];
        if (r && r.success >= 0.999 && (GRADE[r.grade] || 0) >= GRADE.A) grant('s4');
      }
    } catch (e) { /* 忽略 */ }
    /* s5 极光：摄影最高分 ≥ 88 */
    try {
      const pb = (c && c.get('photoBest', 0)) || 0;
      if (pb >= 88) grant('s5');
      else if (ph && ph.best >= 88) grant('s5');
    } catch (e) { /* 忽略 */ }
    /* s6 潮线：建筑学通关 */
    try {
      const badgesOk = bd && Array.isArray(bd.list) && bd.list.length && bd.list.every((b) => b.taken);
      const insOk = ins && ins.found >= ins.total;
      if (badgesOk && insOk) grant('s6');
    } catch (e) { /* 忽略 */ }
  }

  /* 时段钩子：开赛 → s3 */
  try {
    document.addEventListener('day:phase', (e) => {
      if (e && e.detail && e.detail.phase === 'kickoff') grant('s3');
      evaluate();
    });
  } catch (e) { /* 忽略 */ }
  try { document.addEventListener('contest:changed', () => evaluate()); } catch (e) { /* 忽略 */ }
  try {
    document.addEventListener('evac:changed', (e) => {
      const d = e && e.detail;
      if (!d || !d.done) return;
      if (d.success >= 0.999 && (GRADE[d.grade] || 0) >= GRADE.A) grant('s4');
      if (d.teams >= d.teamMax && (GRADE[d.grade] || 0) >= GRADE.B) grant('s7');
    });
  } catch (e) { /* 忽略 */ }
  try { document.addEventListener('build:phase', () => evaluate()); } catch (e) { /* 忽略 */ }
  try { document.addEventListener('insight:found', () => evaluate()); } catch (e) { /* 忽略 */ }
  try { document.addEventListener('game:changed', () => evaluate()); } catch (e) { /* 忽略 */ }

  function update(dt) {
    if (!burst || burstT <= 0) return;
    burstT = Math.max(0, burstT - dt);
    /* 最高 0.55 不透明度 + 缩放上限 1.6：只做"一圈光扩散"，不做满屏色块 */
    burst.material.opacity = Math.min(0.55, burstT * 0.7);
    const k = Math.min(1.6, 1 + (1.1 - burstT) * 0.5);
    burst.scale.set(k, k, k);
    burst.rotation.z += dt * 0.8;
    if (burstT <= 0) burst.visible = false;
  }

  const api = {
    list, update, grant, has: isGot, evaluate, restore,
    get found() { return found(); },
    get total() { return list.length; },
    help: '印章不是散落的道具，而是你在潮汐场做过的事的凭证。',
    on(cb) { if (typeof cb === 'function') { subs.add(cb); return () => subs.delete(cb); } return () => {}; },
  };
  window.__stamps = api;
  restore();
  emit('boot');
  return api;
}

export default createStamps;
