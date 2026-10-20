/* ═══════════════════════════════════════════════════════════════════════
   objectives.js — 目标系统（可玩性核心）
   · 每个任务绑定一个「真实几何区域」：环向净距 s + 标高 y + 环向 u 窗口
     —— 看台环廊是「环」，用世界 x/z 猜点必然判错（改用 s / y 判定）
   · 3D 信标：光柱 + 地面圆环 + 悬浮菱形，depthTest:false，远距离也能看见
   · 信标跟随「当前任务」自动切换；走进区域即完成任务
   对外：window.__objectives = { list, current, check, update, target, group }
   依赖 window.__app（arena/stage/walk），缺项即降级不抛错。
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { GEO, SEGS, L1, L2, L3 } from '../world/sections.js';
import { pt } from '../world/rings.js';
import { locate } from '../world/walkr.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const U_AXIS = 0;                 /* +z 边中点（北门主轴 · 导览路线所在） */
const U_WIN = 0.085;              /* 轴向判定窗口（环向 ±8.5% ≈ ±27°） */
const CYAN = 0x6fd3e0;
const GOLD = 0xffd27a;

/* ══════════════ 目标定义（数值全部来自真实几何） ══════════════ */
function buildDefs() {
  const hallS = GEO.outerS - 4;          /* 门厅：外立面内退处 */
  const plazaS = GEO.outerS + 16;        /* 广场：主馆外 16m */
  return [
    {
      id: 'm1', mission: 'm1', name: '球迷广场', zone: '主轴尽端',
      desc: '走出主馆，站到球迷广场的主轴上',
      s: [GEO.outerS + 4, 1e4], y: [-6, 7], u: U_AXIS, uWin: U_WIN,
      beacon: { i: U_AXIS * SEGS, s: plazaS, y: GEO.groundY + 0.5 },
      tip: '沿主轴向北走，绕过旗阵',
    },
    {
      id: 'm2', mission: 'm2', name: '入口大厅', zone: '北门券洞',
      desc: '穿过 24m 主入口券洞，走进检票门厅',
      s: [hallS - 8, GEO.outerS + 2], y: [-4, 9], u: U_AXIS, uWin: 0.05,
      /* 信标必须落在"人能站住"的地面：券洞轴线上的门厅空腔（顶层环廊下方）是地面，
         再往里就是看台后墙。 */
      beacon: { i: U_AXIS * SEGS, s: GEO.outerS - 5, y: 0 },
      tip: '正对旗阵的券洞就是主入口',
    },
    {
      id: 'm3', mission: 'm3', name: '二层环廊', zone: '中层环廊',
      desc: '登上二层环廊，俯瞰 105×68m 全场',
      s: [L2.cS0 - 2, L2.cS1 + 2], y: [L2.cY - 4, L2.cY + 7], u: null,
      beacon: { i: U_AXIS * SEGS, s: (L2.cS0 + L2.cS1) / 2, y: L2.cY },
      tip: '沿看台逐排上行即可抵达',
    },
    {
      id: 'm4', mission: 'm4', name: '球员通道', zone: '南侧通道口',
      desc: '走进球员通道（更衣室方向）',
      s: [L1.s0 - 1, L1.endS + 4], y: [-6, 7], u: 0.5, uWin: 0.035,
      /* 球员通道口的座席在模型里被真实扣除（SKIP_U），通道贴着场边硬地：
         信标放在场边地面，而不是看台踏面之下（否则会埋在看台里看不见）。 */
      beacon: { i: 0.5 * SEGS, s: L1.s0 - 1.5, y: GEO.groundY + 0.4 },
      tip: '看台正中的缺口就是球员通道',
    },
    {
      id: 'm5', mission: 'm5', name: '疏散演练', zone: '主入口 / 出口',
      desc: '在「疏散」面板里调度出口，把全場观众安全送出',
      s: [GEO.outerS - 2, GEO.outerS + 6], y: [-6, 8], u: U_AXIS, uWin: U_WIN,
      beacon: { i: U_AXIS * SEGS, s: GEO.outerS + 3, y: 0 },
      tip: '打开左侧「疏散」面板开始调度',
      action: 'panel:flow',
    },
    {
      id: 'm6', mission: 'm6', name: '建筑徽章', zone: '全馆 5 处',
      desc: '集齐 5 枚建筑徽章',
      s: null, y: null, u: null,
      beacon: null,
      tip: '跟着光柱走，徽章就在光柱下面',
      action: 'badges',
    },
  ];
}

/* ══════════════ 信标贴图 ══════════════ */
function columnTexture() {
  try {
    const cv = document.createElement('canvas');
    cv.width = 8; cv.height = 256;
    const g = cv.getContext('2d');
    const lg = g.createLinearGradient(0, 256, 0, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0.95)');
    lg.addColorStop(0.12, 'rgba(255,255,255,0.55)');
    lg.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg; g.fillRect(0, 0, 8, 256);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  } catch (e) { return null; }
}
function ringTexture() {
  try {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const rg = g.createRadialGradient(64, 64, 30, 64, 64, 63);
    rg.addColorStop(0, 'rgba(255,255,255,0)');
    rg.addColorStop(0.72, 'rgba(255,255,255,0.30)');
    rg.addColorStop(0.90, 'rgba(255,255,255,0.85)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(64, 64, 63, 0, Math.PI * 2); g.fill();
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  } catch (e) { return null; }
}

export function createObjectives(app) {
  const A = window.__app || app || {};
  const stage = A.stage || {};
  const scene = stage.scene;
  if (!scene) return null;

  const defs = buildDefs();
  const list = defs.map((d) => ({ ...d, done: false, _beacon: null }));

  /* ── 3D 信标 ── */
  const group = new THREE.Group();
  group.name = 'GAME_OBJECTIVES';
  scene.add(group);

  const colTex = columnTexture();
  const ringTex = ringTexture();
  const COL_H = 78;

  const mkBeacon = (pos) => {
    const node = new THREE.Group();
    node.position.copy(pos);

    /* 地面圆环（贴地） */
    if (ringTex) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: ringTex, color: CYAN, transparent: true, opacity: 0.9,
        depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false,
      }));
      sp.scale.set(15, 15, 1);
      sp.position.y = 0.3;
      sp.renderOrder = 900;
      node.add(sp);
    }
    /* 光柱 */
    if (colTex) {
      const cm = new THREE.MeshBasicMaterial({
        map: colTex, color: CYAN, transparent: true, opacity: 0.55,
        depthWrite: false, depthTest: false, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, toneMapped: false,
      });
      const col = new THREE.Mesh(new THREE.PlaneGeometry(3.4, COL_H), cm);
      col.position.y = COL_H / 2;
      col.renderOrder = 901;
      node.add(col);
      const col2 = col.clone();
      col2.rotation.y = Math.PI / 2;
      node.add(col2);
    }
    /* 悬浮菱形 */
    const dia = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.5, 0),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.95, depthTest: false, toneMapped: false }),
    );
    dia.position.y = 3.4;
    dia.renderOrder = 902;
    node.add(dia);

    group.add(node);
    return { node, dia };
  };

  list.forEach((o) => {
    if (!o.beacon) return;
    const p = pt(o.beacon.i, o.beacon.s, o.beacon.y);
    o._beacon = mkBeacon(p.clone());
    o._pos = p.clone();
  });

  /* ── 当前目标 ── */
  let currentId = null;
  const target = new THREE.Vector3();

  function game() { const g = window.__game; return (g && Array.isArray(g.missions)) ? g : null; }

  function current() {
    const g = game();
    if (!g) return list[0];
    const done = new Set(g.missions.filter((m) => m.done).map((m) => m.id));
    let c = list.find((o) => !done.has(o.mission));
    if (!c) c = list[list.length - 1];
    if (c.id !== currentId) {
      currentId = c.id;
      list.forEach((o) => { if (o._beacon) o._beacon.node.visible = (o.id === c.id); });
      try {
        document.dispatchEvent(new CustomEvent('objective:changed', { detail: { id: c.id, name: c.name, desc: c.desc } }));
      } catch (e) { /* 忽略 */ }
    }
    return c;
  }

  /* 徽章类目标：信标跟随最近的未收集徽章 */
  function badgeTarget() {
    const ext = window.__badges;
    const arr = ext && Array.isArray(ext.list) ? ext.list : null;
    if (!arr) return null;
    let best = null, bd = Infinity;
    for (const b of arr) {
      if (b.taken || !b.pos) continue;
      const d = Math.hypot(b.pos[0], b.pos[2]);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  /* ── 判定：玩家位置 → 命中区域 ── */
  function check(p) {
    const g = game();
    if (!g || !p) return null;
    const cur = current();
    if (!cur || cur.action === 'badges' || cur.action === 'panel:flow') return null;
    const loc = locate(p.x, p.z);
    const s = loc.s, y = p.y;
    const u = loc.u;
    let uOk = true;
    if (cur.u != null) {
      let d = Math.abs(u - cur.u);
      d = Math.min(d, 1 - d);
      uOk = d <= (cur.uWin ?? U_WIN);
    }
    const sOk = cur.s ? (s >= cur.s[0] && s <= cur.s[1]) : true;
    const yOk = cur.y ? (y >= cur.y[0] && y <= cur.y[1]) : true;
    if (!(uOk && sOk && yOk)) return null;
    if (g.missionDone(cur.mission)) return null;
    g.complete(cur.mission);
    try { A.ui?.toast?.('任务完成', `${cur.name} · ${cur.desc}`, 'gold'); } catch (e) { /* 忽略 */ }
    try { document.dispatchEvent(new CustomEvent('objective:reached', { detail: { id: cur.id } })); } catch (e) { /* 忽略 */ }
    return cur.id;
  }

  /* ── 每帧更新 ── */
  let t = 0;
  function update(dt) {
    t += dt;
    const cur = current();
    /* 徽章目标：信标跳到最近的未收集徽章 */
    if (cur.action === 'badges') {
      const b = badgeTarget();
      const bo = list.find((o) => o.action === 'badges');
      if (bo && b && bo._beacon) {
        const bp = new THREE.Vector3(b.pos[0], b.pos[1], b.pos[2]);
        bo._beacon.node.position.lerp(bp, clamp(dt * 4, 0, 1));
        bo._pos = bo._beacon.node.position.clone();
      }
    }
    list.forEach((o) => {
      if (!o._beacon || !o._beacon.node.visible) return;
      const d = o._beacon;
      d.dia.rotation.y += dt * 1.1;
      d.dia.rotation.x += dt * 0.45;
      d.dia.position.y = 3.4 + Math.sin(t * 2.0) * 0.55;
      const pulse = 1 + Math.sin(t * 2.4) * 0.08;
      d.dia.scale.setScalar(pulse);
      d.node.children.forEach((c) => {
        if (c.material && c.material.color) {
          const near = 1;
          c.material.opacity = (c.isSprite ? 0.9 : 0.5) * near * (0.82 + Math.sin(t * 2.4) * 0.18);
        }
      });
    });
    /* 当前目标的世界坐标（给 HUD 距离用） */
    const curBeacon = cur._beacon || (cur.action === 'badges' ? list.find((o) => o.action === 'badges')?._beacon : null);
    if (curBeacon) target.copy(curBeacon.node.position);
  }

  const api = {
    list, update, check,
    get current() { return current(); },
    get target() { return target; },
    get group() { return group; },
    get currentId() { return currentId; },
  };
  Object.defineProperty(api, 'current', { get: current, configurable: true });
  window.__objectives = api;
  return api;
}

export default createObjectives;
