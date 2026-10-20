/* ═══════════════════════════════════════════════════════════════════════
   insights.js — 建筑洞察图鉴（Lv.5 解锁）
   · 12 处真实建筑细节，每处一条设计说明（把方案讲成故事）
   · 位置全部由真实几何推导（ring 的 pt() + 看台剖面），保证"看得见、走得到"
   · 走近 5m 自动收录 + 16 XP；HUD 面板显示已收录 / 未解锁
   · v4：收录状态写入 window.__caps，刷新后不会复活（v3 的 got 未持久化 → 可重复刷分）
   对外：window.__insights = { list, update, found, total, grant }
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { GEO, SEGS, L1, L2, L3, BACK_S, TIERS } from '../world/sections.js';
import { pt } from '../world/rings.js';
import * as caps from './caps.js';

const P = (u, s, y) => pt(Math.round(u * SEGS) % SEGS, s, y);
const PICK_R = 5.0;

function buildDefs() {
  const suiteY = (TIERS[1] ? TIERS[1].cY : 26.65) + 1.2;
  const l1cY = TIERS[0] ? TIERS[0].cY : 16.25;
  const l3cY = TIERS[2] ? TIERS[2].cY : 42.45;
  return [
    {
      id: 'i1', name: '八根潮柱', zone: '外广场 · 柱基',
      fact: '8 根外倾 8° 的清水混凝土柱落在广场基座上，柱→环梁→24 榀径向桁架→檩条→面板构成完整传力链。',
      pos: P(0, GEO.mastS_base, 2.0).toArray(), color: 0xe8c07a,
    },
    {
      id: 'i2', name: '鞍面屋盖', zone: '屋盖 · 鞍点',
      fact: '屋盖是连续单层曲面环带：四边中部高、四角低（环向余弦调制），内檐 ≤1.3m 厚，场地正上方完全开敞。',
      pos: P(0, GEO.roofRidgeS, GEO.roofRidgeY - 4).toArray(), color: 0x6fd3e0,
    },
    {
      id: 'i3', name: '悬挑内檐', zone: '屋盖 · 内檐',
      fact: '内檐是一条细薄的悬浮边（≤1.3m），带金属收边与连续灯带 —— 观众抬头看到的是一条会发光的缝，而不是封闭的天窗。',
      pos: P(0.125, GEO.roofInnerS + 2, GEO.roofInnerY - 2).toArray(), color: 0x6fd3e0,
    },
    {
      id: 'i4', name: '三道潮线立面', zone: '外立面 · 网幕',
      fact: '外立面由 3 道连续水平铝带分成 4 段，铝带内藏夜间灯带；下段清水混凝土基座，中上段青铜网幕 + 深色玻璃。',
      pos: P(0.25, GEO.outerS + 1.2, GEO.outerMidY).toArray(), color: 0x8c7a5e,
    },
    {
      id: 'i5', name: '24m 主券洞', zone: '北门 · 主入口',
      fact: '4 个 24m 高主券洞是唯一的无台阶入口，洞内退 9m 形成检票门厅；混凝土反曲梁把券洞上方荷载导入基座。',
      pos: P(0, GEO.outerS - 1, 6).toArray(), color: 0xede8de,
    },
    {
      id: 'i6', name: '三层看台', zone: '看台 · L1 前排',
      fact: '三层看台共 64 排：下层 28 排、中层 19 排、上层 17 排；踏步 0.80m / 踢面 0.50m，每 4 排一道 1.2m 纵向走道。',
      pos: P(0, TIERS[0].s0 + 2, 3.0).toArray(), color: 0xc9a15f,
    },
    {
      id: 'i7', name: '一层环廊', zone: 'L1 环廊',
      fact: '一层环廊净宽 13m，标高 16.25m，与看台末排同层；它是观众疏散与换层的主动线，也是遮阳与结构双重受益的环。',
      pos: P(0.5, (L1.cS0 + L1.cS1) / 2, l1cY + 1.2).toArray(), color: 0xc9a15f,
    },
    {
      id: 'i8', name: '包厢夹层', zone: 'L2 · 包厢层',
      fact: '贵宾包厢夹层插在 L2 与 L3 之间，带独立后走道；两层包厢共 768 席，是全场视野与疏散效率最难同时满足的一段。',
      pos: P(0.25, (L2.cS0 + L2.cS1) / 2, suiteY).toArray(), color: 0xd7b6ff,
    },
    {
      id: 'i9', name: '上层环廊', zone: 'L3 环廊',
      fact: '上层环廊标高 42.45m、净宽 8m，正对潮冠檐口；站在这里可以一眼看完 105×68m 场地与四角的出入口布局。',
      pos: P(0.125, (L3.cS0 + L3.cS1) / 2, l3cY + 1.2).toArray(), color: 0xb7a0c4,
    },
    {
      id: 'i10', name: '球员通道', zone: '南侧 · 通道口',
      fact: '南北各留一条球员 / 车辆通道，通道口处的座席在座位模型里被真实扣除（SKIP_U），所以容量统计与几何完全一致。',
      /* 放在通道口贴地的场边硬地上：放在看台踏面里会被埋住看不见 */
      pos: P(0.5, L1.s0 - 1.5, GEO.groundY + 1.0).toArray(), color: 0x8ff0c8,
    },
    {
      id: 'i11', name: '四组灯桥', zone: '场地 · 灯桥',
      fact: '四角 4 组灯桥挂在屋盖内檐下，夜赛时把光压向场地；不设地面灯杆，所以看台第一排没有视线遮挡。',
      pos: P(0.125, GEO.roofInnerS + 8, GEO.roofInnerY - 6).toArray(), color: 0xfff0c0,
    },
    {
      id: 'i12', name: 'LED 广告板', zone: '场地 · 边线',
      fact: 'LED 板沿场地边线连续围合，板面高度刻意压低，避免在看台第一排形成一条挡住草皮的黑带。',
      pos: P(0.375, GEO.boardS + 1, 2.2).toArray(), color: 0x6fd3e0,
    },
  ];
}

export function createInsights(app) {
  const A = window.__app || app || {};
  const stage = A.stage || {};
  const scene = stage.scene;
  if (!scene) return null;

  const defs = buildDefs();
  const list = defs.map((d) => ({ ...d, got: false, _t: Math.random() * 6 }));

  const group = new THREE.Group();
  group.name = 'GAME_INSIGHTS';
  scene.add(group);

  const geo = new THREE.TorusGeometry(0.85, 0.045, 6, 28);
  const dia = new THREE.OctahedronGeometry(0.42, 0);
  /* 合批：12 个圆环 + 12 个菱形 → 2 个 InstancedMesh（24 draw call → 2） */
  const ringMesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.85, toneMapped: false, depthTest: false,
  }), list.length);
  const coreMesh = new THREE.InstancedMesh(dia, new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.9, toneMapped: false, depthTest: false,
  }), list.length);
  ringMesh.name = 'GAME_INSIGHT_RINGS';
  coreMesh.name = 'GAME_INSIGHT_CORES';
  ringMesh.frustumCulled = false;
  coreMesh.frustumCulled = false;
  ringMesh.renderOrder = 890;
  coreMesh.renderOrder = 891;
  ringMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  coreMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(ringMesh, coreMesh);
  const _c = new THREE.Color();
  list.forEach((d, i) => {
    _c.setHex(d.color);
    ringMesh.setColorAt(i, _c);
    coreMesh.setColorAt(i, _c);
  });
  if (ringMesh.instanceColor) ringMesh.instanceColor.needsUpdate = true;
  if (coreMesh.instanceColor) coreMesh.instanceColor.needsUpdate = true;
  const nodes = list.map((d) => ({
    pos: new THREE.Vector3(d.pos[0], d.pos[1], d.pos[2]),
    spin: 0, spinY: 0,
  }));
  const _dum = new THREE.Object3D();
  const _hide = (i) => {
    _dum.position.set(0, -9999, 0);
    _dum.rotation.set(0, 0, 0);
    _dum.scale.setScalar(0.0001);
    _dum.updateMatrix();
    ringMesh.setMatrixAt(i, _dum.matrix);
    coreMesh.setMatrixAt(i, _dum.matrix);
    ringMesh.instanceMatrix.needsUpdate = true;
    coreMesh.instanceMatrix.needsUpdate = true;
  };

  const playerPos = () => {
    const w = A.walk;
    if (w && w.active && w.pos) return w.pos;
    const cam = stage.camera;
    return cam ? cam.position : null;
  };

  let t = 0;
  const subs = new Set();
  const foundCount = () => list.filter((x) => x.got).length;

  function collect(d, i) {
    if (d.got) return;
    d.got = true;
    _hide(i);
    try { caps.add('insightsGot', d.id); } catch (e) { /* 忽略 */ }
    try {
      window.__game?.addXP?.(16, '收录建筑洞察');
      A.ui?.toast?.('收录建筑洞察', `${d.name} · ${d.zone}`, 'gold');
      window.__audio?.sfx?.('badge');
    } catch (e) { /* 忽略 */ }
    for (const cb of subs) { try { cb(list); } catch (e) { /* 忽略 */ } }
    try { document.dispatchEvent(new CustomEvent('insight:found', { detail: { id: d.id, name: d.name } })); } catch (e) { /* 忽略 */ }
  }

  /* 从存档回灌（刷新后已收录的洞察不再出现、不能重复拿分） */
  function restore() {
    let n = 0;
    try {
      const got = new Set(caps.hasAll('insightsGot'));
      list.forEach((d, i) => { if (got.has(d.id)) { d.got = true; _hide(i); n++; } });
    } catch (e) { /* 忽略 */ }
    return n;
  }

  /* 显式收录（测试 / 调试 / 归档用）：与走近判定走同一条 collect 路径 */
  function grant(id) {
    const i = list.findIndex((d) => d.id === id);
    if (i < 0) return false;
    if (list[i].got) return true;
    collect(list[i], i);
    return true;
  }

  function update(dt) {
    t += dt;
    const p = playerPos();
    let dirty = false;
    for (let i = 0; i < list.length; i++) {
      const d = list[i], n = nodes[i];
      if (d.got) continue;
      n.spin += dt * 0.7;
      n.spinY += dt * 1.3;
      const bob = Math.sin(t * 1.6 + d._t) * 0.22;
      /* 圆环：平铺于 XZ 面并绕自身轴自转 */
      _dum.position.copy(n.pos);
      _dum.rotation.set(Math.PI / 2, 0, n.spin);
      _dum.scale.setScalar(1);
      _dum.updateMatrix();
      ringMesh.setMatrixAt(i, _dum.matrix);
      /* 菱形：自转 + 上下浮动 */
      _dum.position.set(n.pos.x, n.pos.y + bob, n.pos.z);
      _dum.rotation.set(0, n.spinY, 0);
      _dum.updateMatrix();
      coreMesh.setMatrixAt(i, _dum.matrix);
      dirty = true;
      if (p && p.distanceTo(n.pos) < PICK_R) collect(d, i);
    }
    if (dirty) {
      ringMesh.instanceMatrix.needsUpdate = true;
      coreMesh.instanceMatrix.needsUpdate = true;
    }
  }

  const api = {
    list, update, grant, restore,
    get found() { return foundCount(); },
    get total() { return list.length; },
    on(cb) { if (typeof cb === 'function') { subs.add(cb); return () => subs.delete(cb); } return () => {}; },
  };
  window.__insights = api;
  /* ⚠️ 必须在这里回灌：badges.js / insights.js 都会 import caps.js，
     谁先被求值取决于模块图顺序（app.js 静态导入游戏层时由 esbuild 决定）。
     所以在 index.js 里统一调 restore 是不可靠的 —— 这里在自身求值时就做。 */
  restore();
  return api;
}

export default createInsights;
