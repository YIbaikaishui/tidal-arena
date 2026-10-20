/* ═══════════════════════════════════════════════════════════════════════
   construction.js — 建造逻辑 5 阶段（SPEC 3.5 / 验收 18）
   基础与场地 → 看台与环廊 → 屋盖与结构 → 立面与室内 → 竣工
   · 用 arena.groups 可见性编排阶段
   · 每个进行中的阶段用竖直裁剪平面（材质级 clippingPlanes）做「生长」
   · setPhase(0..100)；兼容 HUD 的 0..5 阶段刻度（≤5 视为阶段数值）
   对外：window.__build = {setPhase, play, stop, phase, stageName, ...}
   依赖 window.__app 防御性读取，缺东西时退化为纯可见性，不抛错。
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* 阶段：groups 为 arena.groups 的键；y 为兜底竖向范围（算不出包围盒时用） */
const STAGES = [
  { name: '基础与场地', desc: '场地 / 基座 / 潮柱结构', groups: ['pitch', 'structure'], y: [-2, 22] },
  { name: '看台与环廊', desc: '三层看台 / 8 万座席 / 环廊', groups: ['bowl', 'seats', 'concourse'], y: [0, 34] },
  { name: '屋盖与结构', desc: '24 榀径向桁架 / 鞍面屋盖', groups: ['roof'], y: [32, 48] },
  { name: '立面与室内', desc: '三道潮线立面 / 门厅与包厢', groups: ['facade', 'interior', 'glow'], y: [-2, 26] },
  { name: '竣工', desc: '全部构件就位 · 竣工状态', groups: [], y: [0, 0] },
];

export function createConstruction(app) {
  const A = window.__app || app || {};
  const stage = A.stage || {};
  const groups = (A.arena && A.arena.groups) || {};
  const renderer = stage.renderer;

  try { if (renderer) renderer.localClippingEnabled = true; } catch (e) { /* 忽略 */ }

  /* ── 收集每个阶段的网格与材质（材质按 阶段×材质 克隆，避免横向串剪） ── */
  let cloneBudget = 140;
  const plan = STAGES.map((s) => {
    const meshes = [];
    const mats = new Map();
    s.groups.forEach((gn) => {
      const g = groups[gn];
      if (!g || !g.traverse) return;
      g.traverse((o) => {
        if (!o.isMesh && !o.isInstancedMesh) return;
        if (!o.material) return;
        meshes.push(o);
        const arr = Array.isArray(o.material) ? o.material : [o.material];
        arr.forEach((m) => { if (m && !mats.has(m)) mats.set(m, null); });
      });
    });
    /* 包围盒竖向范围 */
    let minY = s.y[0];
    let maxY = s.y[1];
    try {
      const box = new THREE.Box3();
      let valid = false;
      s.groups.forEach((gn) => {
        const g = groups[gn];
        if (!g) return;
        g.traverse((o) => {
          if (!o.isMesh && !o.isInstancedMesh) return;
          if (!o.geometry) return;
          o.geometry.computeBoundingBox?.();
          const bb = o.geometry.boundingBox;
          if (!bb) return;
          const b2 = bb.clone().applyMatrix4(o.matrixWorld);
          box.union(b2);
          valid = true;
        });
      });
      if (valid && isFinite(box.min.y) && box.max.y - box.min.y > 2) {
        minY = box.min.y;
        maxY = box.max.y;
      }
    } catch (e) { /* 用兜底范围 */ }
    return { meshes, mats, minY, maxY, plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), cloned: false };
  });

  function ensureClones(p) {
    if (p.cloned || !p.mats.size) return;
    if (cloneBudget < p.mats.size) return; /* 预算不足 → 纯可见性 */
    cloneBudget -= p.mats.size;
    p.mats.forEach((_, m) => {
      let c;
      try { c = m.clone(); } catch (e) { c = null; }
      if (c) {
        c.clippingPlanes = [p.plane];
        c.clipShadows = true;
        p.mats.set(m, c);
      }
    });
    p.meshes.forEach((o) => {
      const orig = Array.isArray(o.material) ? o.material : [o.material];
      const next = orig.map((m) => p.mats.get(m) || m);
      if (!o.userData.__origMat) o.userData.__origMat = o.material;
      o.material = Array.isArray(o.material) ? next : next[0];
    });
    p.cloned = true;
  }
  function restore(p) {
    if (!p.cloned) return;
    p.meshes.forEach((o) => {
      if (o.userData.__origMat) { o.material = o.userData.__origMat; delete o.userData.__origMat; }
    });
    p.cloned = false;
  }

  const S = { phase: 100, playing: false, speed: 100 / 14 };

  function apply(percent) {
    const t = clamp(percent, 0, 100) / 20; /* 0..5 阶段刻度 */
    let stageName = STAGES[STAGES.length - 1].name;
    for (let i = 0; i < STAGES.length; i++) {
      const st = STAGES[i];
      const gs = st.groups.map((n) => groups[n]).filter(Boolean);
      const p = clamp(t - i, 0, 1);
      if (p >= 1) {
        gs.forEach((g) => { g.visible = true; });
        restore(plan[i]);
      } else if (p <= 0) {
        gs.forEach((g) => { g.visible = false; });
        restore(plan[i]);
      } else {
        gs.forEach((g) => { g.visible = true; });
        stageName = st.name;
        const pl = plan[i];
        const y = pl.minY + (pl.maxY - pl.minY) * p;
        pl.plane.constant = -y;
        ensureClones(pl);
      }
    }
    S.phase = Math.round(percent * 10) / 10;
    try {
      document.dispatchEvent(new CustomEvent('build:phase', {
        detail: { phase: S.phase, stage: stageName },
      }));
    } catch (e) { /* 忽略 */ }
    return S.phase;
  }

  function setPhase(v) {
    const n = typeof v === 'number' && isFinite(v) ? v : 100;
    /* HUD 传 0..5 的阶段刻度；对外契约为 0..100 */
    const percent = n <= 5 ? n * 20 : n;
    return apply(percent);
  }
  function play() { S.playing = true; if (S.phase >= 99.9) apply(0); return S.playing; }
  function stop() { S.playing = false; return S.playing; }
  function update(dt) {
    if (!S.playing) return;
    const next = S.phase + S.speed * dt;
    apply(next);
    if (next >= 100) { S.playing = false; apply(100); }
  }
  function stageIndex() { return clamp(Math.floor(S.phase / 20), 0, 4); }

  const api = {
    setPhase, play, stop, update, stages: STAGES,
    get phase() { return S.phase; },
    get playing() { return S.playing; },
    get stageName() { return STAGES[stageIndex()].name; },
    get stageDesc() { return STAGES[stageIndex()].desc; },
  };

  apply(100);
  window.__build = api;
  return api;
}

export default createConstruction;
