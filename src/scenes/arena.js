/* ═══════════════════════════════════════════════════════════════════════
   arena.js — 潮汐场 TIDAL ARENA 主体建造  v2
   造型："四潮八柱 · 鞍面悬浮"
     · 三层看台 + 两道夹层（L1 环廊 / 包厢带 / L3 顶层环廊）
     · 鞍面屋盖：四边中部高、四角低；内檐细薄悬浮，场地正上方完全开敞
     · 8 根外倾潮柱 + 24 榀径向桁架 + 2 道环梁 + 檩条
     · 三段式立面：石材基座（4 主券洞 + 8 次门）/ 青铜网幕 / 铝质潮冠
   全部实体由 sections.js 剖面沿圆角矩形环扫掠生成，同族共形，不自穿插。
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import {
  SEGS, GEO, TIERS, L1, L2, L3, BACK_S, BACK_Y, C3_Y, HALF_X, HALF_Z, ZONES,
  CORNER_F, PORTALS, SUB_DOORS, roofBaseY, roofY, roofMod, saddleAt,
} from '../lib/sections.js';
import {
  sweepRing, plateRing, pt, radialPoint, refRing, every, segWindow, subtractWindows, boundaryT,
} from '../lib/rings.js';
import { MODEL, seatInstances, seatColor, ACCENT, SKIP_U } from '../lib/seats.js';
import { GeomBatch, TAU, clamp, lerp } from '../lib/core.js';
import { makeMaterials, scoreboardMap } from '../lib/materials.js';

/* ══════════════ 合批器 ══════════════ */
class Mesher {
  constructor(mats) { this.mats = mats; this.buckets = new Map(); }
  batch(k) { if (!this.buckets.has(k)) this.buckets.set(k, new GeomBatch()); return this.buckets.get(k); }
  geo(k, g) { this.batch(k).add(g); return this; }
  box(k, p0, p1, w, h, up) { this.batch(k).box(p0, p1, w, h, up); return this; }
  quad(k, a, b, c, d, uvs) { this.batch(k).quad(a, b, c, d, uvs); return this; }
  flush(parent, prefix = '') {
    const out = [];
    for (const [k, b] of this.buckets) {
      const g = b.build();
      if (!g) continue;
      const m = new THREE.Mesh(g, this.mats[k]);
      m.name = prefix + k;
      m.userData.matKey = k;
      m.castShadow = true; m.receiveShadow = true;
      parent.add(m); out.push(m);
    }
    this.buckets.clear();
    return out;
  }
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const RM = roofMod();

/* 沿 s 的屋盖点 */
function roofPt(i, s, dy) { return pt(i, s, roofBaseY(s) + (dy || 0)); }

/* 锥形棱柱（潮柱 / 灯桥支架）：底宽 w0、顶宽 w1 的四边形柱 */
function tapered(batch, p0, p1, w0, w1, d0, d1, up) {
  const dir = p1.clone().sub(p0); const len = dir.length(); if (len < 1e-4) return;
  dir.normalize();
  const u = (up || V(0, 1, 0)).clone();
  if (Math.abs(u.dot(dir)) > 0.97) u.set(1, 0, 0);
  const side = new THREE.Vector3().crossVectors(dir, u).normalize();
  const upv = new THREE.Vector3().crossVectors(side, dir).normalize();
  const corner = (p, w, d, sx, sy) => p.clone()
    .addScaledVector(side, sx * w / 2).addScaledVector(upv, sy * d / 2);
  const A0 = corner(p0, w0, d0, -1, 1), B0 = corner(p0, w0, d0, 1, 1),
    C0 = corner(p0, w0, d0, 1, -1), D0 = corner(p0, w0, d0, -1, -1);
  const A1 = corner(p1, w1, d1, -1, 1), B1 = corner(p1, w1, d1, 1, 1),
    C1 = corner(p1, w1, d1, 1, -1), D1 = corner(p1, w1, d1, -1, -1);
  batch.quad(A0, B0, B1, A1); batch.quad(B0, C0, C1, B1);
  batch.quad(C0, D0, D1, C1); batch.quad(D0, A0, A1, D1);
  batch.quad(A1, B1, C1, D1); batch.quad(D0, C0, B0, A0);
}

/* ══════════════ 看台阶梯剖面 ══════════════ */
function tierProfile(tier, bottomY) {
  const top = [{ s: tier.s0, y: tier.y0 }];
  for (const r of tier.rows) {
    top.push({ s: r.sFront, y: r.y }, { s: r.sBack, y: r.y }, { s: r.sBack, y: r.yBack });
  }
  const last = top[top.length - 1];
  const back = [
    { s: last.s, y: last.y },
    { s: last.s + 0.75, y: last.y },          // 末排后平台
    { s: last.s + 0.75, y: bottomY },          // 后端竖直落到底
    { s: tier.s0, y: bottomY },                // 底面向内
    { s: tier.s0, y: tier.y0 },
  ];
  return dedupe(top.concat(back.slice(1)));
}
function dedupe(list) {
  const out = [];
  for (const p of list) {
    const l = out[out.length - 1];
    if (l && Math.abs(l.s - p.s) < 1e-5 && Math.abs(l.y - p.y) < 1e-5) continue;
    out.push(p);
  }
  return out;
}

/* ══════════════ 主构建 ══════════════ */
export function buildArena(scene, stage) {
  const M = makeMaterials(stage.renderer);
  const root = new THREE.Group(); root.name = 'ARENA';
  scene.add(root);

  const groups = {};
  const G = (name) => { const g = new THREE.Group(); g.name = name; root.add(g); groups[name] = g; return g; };
  const gPitch = G('pitch'), gBowl = G('bowl'), gConc = G('concourse'),
    gSuite = G('suites'), gFacade = G('facade'), gStruct = G('structure'),
    gRoof = G('roof'), gInterior = G('interior'), gSeats = G('seats'), gGlow = G('glow');

  const ents = {};
  const ent = (name, obj, label, spec) => { ents[name] = { id: name, mesh: obj, parent: obj, label, spec }; return obj; };

  const msP = new Mesher(M), msB = new Mesher(M), msC = new Mesher(M), msS = new Mesher(M),
    msF = new Mesher(M), msT = new Mesher(M), msR = new Mesher(M), msI = new Mesher(M), msG = new Mesher(M);

  /* ═══════════════ 1. 场地 ═══════════════ */
  buildPitch(gPitch, gGlow, msP, msG, M, stage);
  msP.flush(gPitch, 'pitch-'); msG.flush(gGlow, 'glow-');
  ent('pitch', gPitch, '比赛场地', '105 × 68 m · 天然草皮 · 无跑道');

  /* ═══════════════ 2. 看台核心体 ═══════════════ */
  buildBowl(gBowl, msB, M);
  msB.flush(gBowl, 'bowl-');
  ent('bowl', gBowl, '看台核心体', `3 层 ${MODEL.rows} 排 · 预制混凝土阶梯 · 视线 C 值 ≥ 60mm`);

  /* ═══════════════ 3. 环廊与楼板 ═══════════════ */
  buildConcourse(gConc, msC, M);
  msC.flush(gConc, 'conc-');
  ent('concourse', gConc, '看台环廊', '3 层连续环廊 · 净宽 8–13 m · 每 12 m 一柱');

  /* ═══════════════ 4. 贵宾包厢夹层 ═══════════════ */
  buildSuites(gSuite, msI, msG, M);
  msI.flush(gSuite, 'suite-'); msG.flush(gGlow, 'glowB-');
  ent('suites', gSuite, '贵宾包厢层', '2 层包厢 · 面向场地 · 独立后走道');

  /* ═══════════════ 5. 外立面 ═══════════════ */
  buildFacade(gFacade, msF, M);
  msF.flush(gFacade, 'facade-');
  ent('facade', gFacade, '外立面', '石材基座 + 青铜网幕 + 铝质潮冠 · 4 主券洞 / 8 次门');

  /* ═══════════════ 6. 结构系统 ═══════════════ */
  buildStructure(gStruct, msT, M);
  msT.flush(gStruct, 'struct-');
  ent('structure', gStruct, '结构系统', '8 潮柱 + 24 榀径向桁架 + 2 道环梁 + 檩条');

  /* ═══════════════ 7. 鞍面屋盖 ═══════════════ */
  const lamps = buildRoof(gRoof, msR, msG, M);
  msR.flush(gRoof, 'roof-'); msG.flush(gGlow, 'glowR-');
  ent('roof', gRoof, '鞍面屋盖', `四边高四角低 · 悬挑 ${Math.round(GEO.roofRidgeS - GEO.roofInnerS)}m · 场地全开敞`);

  /* ═══════════════ 8. 座椅 ═══════════════ */
  const seatRes = buildSeats(gSeats, M, stage);
  ent('seats', gSeats, '座椅阵列', `${MODEL.total.toLocaleString()} 座 · 逐排逐区 · 20 区 / 层`);

  /* ═══════════════ 9. 室内空间 ═══════════════ */
  buildInterior(gInterior, msI, msG, M);
  msI.flush(gInterior, 'int-'); msG.flush(gGlow, 'glowI-');
  ent('interior', gInterior, '室内空间', '入口大厅 / 环廊 / 包厢 / 更衣室 / 媒体中心');

  /* 场地泛光灯（sky.js 会绑定强度） */
  const lampLights = [];
  {
    for (let k = 0; k < 4; k++) {
      const i = Math.round(k * SEGS / 4);
      const p = pt(i, GEO.roofInnerS + 9, roofY(GEO.roofInnerS + 9, i) - 4.2);
      const sp = new THREE.SpotLight(0xfff4e4, 0, 360, 0.92, 0.62, 1.2);
      sp.position.copy(p); sp.target.position.set(0, 0, 0);
      root.add(sp, sp.target);
      lampLights.push(sp);
    }
  }

  const api = {
    root, groups, ents, M, model: MODEL, lamps: lampLights,
    seatInst: seatRes, seatTotal: MODEL.total,
    ring: refRing(SEGS), TIERS, L1, L2, L3, GEO, BACK_S, BACK_Y,
    /* —— 供 UI / 游戏层调用的统一入口 —— */
    setVisible(id, v) { const e = ents[id]; if (e) e.mesh.visible = !!v; },
    setSolo(id) {
      for (const k in ents) ents[k].mesh.visible = (id === null || k === id);
    },
    focusOn(id) {
      const e = ents[id]; if (!e) return null;
      const box = new THREE.Box3().setFromObject(e.mesh);
      const c = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length();
      return { target: c, dist: Math.max(70, size * 1.1) };
    },
  };
  return api;
}

/* ══════════════ 1. 场地 ══════════════ */
function buildPitch(gPitch, gGlow, ms, msG, M, stage) {
  /* 草皮 */
  const g = new THREE.PlaneGeometry(111, 74, 1, 1);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, M.pitch);
  m.name = 'pitchSurface'; m.receiveShadow = true;
  gPitch.add(m);

  /* 场地外环形硬地（s 0 → barrierS）与排水沟 */
  ms.geo('concreteDark', sweepRing([
    { s: 0, y: -0.04 }, { s: GEO.barrierS + 0.6, y: -0.04 },
    { s: GEO.barrierS + 0.6, y: -0.55 }, { s: 0, y: -0.55 },
  ], { uScale: 0.03, vScale: 0.03 }));

  /* 前挡墙（防暴冲）+ 顶部扶手 */
  ms.geo('concreteLight', sweepRing([
    { s: GEO.barrierS, y: -0.1 }, { s: GEO.barrierS, y: GEO.barrierH },
    { s: GEO.barrierS + 0.28, y: GEO.barrierH }, { s: GEO.barrierS + 0.28, y: -0.1 },
  ], { uScale: 0.12, vScale: 0.12 }));
  ms.geo('rail', sweepRing([
    { s: GEO.barrierS - 0.1, y: GEO.barrierH + 0.02 }, { s: GEO.barrierS + 0.38, y: GEO.barrierH + 0.02 },
    { s: GEO.barrierS + 0.38, y: GEO.barrierH + 0.10 }, { s: GEO.barrierS - 0.1, y: GEO.barrierH + 0.10 },
  ], { uScale: 0.3, vScale: 0.3 }));

  /* LED 广告板：四段（留出球员通道口） */
  const gaps = [[-0.012, 0.012], [0.238, 0.262], [0.488, 0.512], [0.738, 0.762]];
  for (const [a, b] of subtractWindows(1, gaps.map(([u0, u1]) => ({ u0, u1 })))) {
    const seg = Math.max(2, Math.round((b - a) * SEGS));
    const board = new THREE.PlaneGeometry(1, 1);
    const inst = new THREE.InstancedMesh(board, M.adBoard, seg);
    const d = new THREE.Object3D();
    for (let k = 0; k < seg; k++) {
      const u = a + (b - a) * (k + 0.5) / seg;
      const i = Math.round(u * SEGS);
      const p = pt(i, GEO.boardS, 0.02);
      const q = pt(i + 1, GEO.boardS, 0.02);
      d.position.copy(p).setY(GEO.boardH / 2 + 0.02);
      d.lookAt(0, d.position.y, 0);
      d.scale.set(p.distanceTo(q) * 1.06, GEO.boardH, 1);
      d.updateMatrix();
      inst.setMatrixAt(k, d.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    gPitch.add(inst);
  }

  /* 球门（南北各一） */
  for (const sz of [-1, 1]) {
    const gz = sz * (HALF_Z - 0.6);
    const post = (x) => {
      ms.box('aluLight', V(x, 0, gz), V(x, 2.44, gz), 0.12, 0.12);
    };
    post(-3.66); post(3.66);
    ms.box('aluLight', V(-3.72, 2.44, gz), V(3.72, 2.44, gz), 0.12, 0.12);
    // 后撑与网
    const netMat = new THREE.MeshBasicMaterial({ color: 0xdfe8ee, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(7.32, 2.2), netMat);
    back.position.set(0, 1.0, gz + sz * 1.8); back.rotation.y = 0;
    gPitch.add(back);
    ms.box('aluLight', V(-3.66, 2.44, gz), V(-3.66, 1.2, gz + sz * 1.8), 0.1, 0.1);
    ms.box('aluLight', V(3.66, 2.44, gz), V(3.66, 1.2, gz + sz * 1.8), 0.1, 0.1);
  }

  /* 角旗杆 */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    ms.box('aluLight', V(sx * HALF_X, 0, sz * HALF_Z), V(sx * HALF_X, 1.8, sz * HALF_Z), 0.07, 0.07);
  }

  /* 技术区（西侧替补席，带顶棚） */
  for (let k = -1; k <= 1; k += 2) {
    const z0 = k * 8;
    ms.box('interiorDark', V(-HALF_X - 2.2, 0, z0 - 6), V(-HALF_X - 2.2, 0.45, z0 + 6), 3.6, 0.45);
    ms.box('glassLite', V(-HALF_X - 4.0, 2.2, z0 - 6), V(-HALF_X - 4.0, 2.2, z0 + 6), 0.16, 0.16);
    for (let b = -2; b <= 2; b++) {
      ms.box('aluDark', V(-HALF_X - 2.2, 0.45, z0 + b * 1.6), V(-HALF_X - 2.2, 1.1, z0 + b * 1.6), 1.1, 0.5);
    }
  }

  /* 大屏（南北） */
  const sb = scoreboardMap();
  M.scoreboard.map = sb;
  M.scoreboard.needsUpdate = true;
  for (const sz of [-1, 1]) {
    const s = GEO.screenS;
    const seg = 2;
    for (let i = 0; i < seg; i++) {
      const u = sz > 0 ? 0.5 : 0.0;
      const p = pt(Math.round(u * SEGS) + (i - 0.5) * 3, s, GEO.screenY);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(GEO.screenW, GEO.screenH), M.scoreboard);
      scr.position.copy(p);
      scr.lookAt(V(0, GEO.screenY, 0));
      scr.rotateY(Math.PI);
      gPitch.add(scr);
    }
    // 屏体边框 + 吊杆
    const p = pt(Math.round((sz > 0 ? 0.5 : 0) * SEGS), s, GEO.screenY);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(GEO.screenW + 1.6, GEO.screenH + 1.6, 1.0), M.steelDark);
    frame.position.copy(p).setY(GEO.screenY);
    frame.lookAt(V(0, GEO.screenY, 0));
    gPitch.add(frame);
    for (const dx of [-1, 1]) {
      ms.box('steelDark', V(p.x + dx * 6, GEO.screenY + GEO.screenH / 2, p.z),
        V(p.x + dx * 6, roofY(s, 0) - 1.4, p.z), 0.35, 0.35);
    }
  }
}

/* ══════════════ 2. 看台核心体 ══════════════ */
function buildBowl(gBowl, ms, M) {
  const bottoms = [GEO.groundY, L1.cY - 0.55, L2.cY - 0.55];

  /* 球员通道 / 车辆入口的开口（北 u=0，南 u=0.5） */
  const mouths = [
    { u0: -0.0105, u1: 0.0105 },
    { u0: 0.4895, u1: 0.5105 },
  ];

  TIERS.forEach((t, ti) => {
    const prof = tierProfile(t, bottoms[ti]);
    const opts = { uScale: 0.055, vScale: 0.055 };
    if (ti === 0) {
      /* 下层看台被两条通道口切开 */
      const spans = subtractWindows(1, mouths);
      for (const [a, b] of spans) {
        ms.geo('tier', sweepRing(prof, { ...opts, uRange: [a, b], capEnds: true }));
      }
    } else {
      ms.geo('tier', sweepRing(prof, opts));
    }
    /* 每层顶部后侧的座后挡墙（栏板） */
    ms.geo('concrete', sweepRing([
      { s: t.endS + 0.7, y: t.endY - 0.2 }, { s: t.endS + 0.7, y: t.endY + 1.05 },
      { s: t.endS + 1.15, y: t.endY + 1.05 }, { s: t.endS + 1.15, y: t.endY - 0.2 },
    ], { uScale: 0.12, vScale: 0.12 }));

    /* 纵向走道扶手：每区边界一道，随台阶爬升 */
    const railH = 0.92;
    for (let z = 0; z < ZONES; z++) {
      const i = Math.round((z / ZONES) * SEGS) % SEGS;
      for (const r of t.rows) {
        const y = r.y + railH;
        const p0 = pt(i, r.sFront + 0.05, y), p1 = pt(i, r.sBack + 0.05, y + 0.0);
        ms.box('rail', p0, p1, 0.055, 0.055);
      }
      // 扶手立杆（每 4 排一根）
      for (let k = 0; k < t.rows.length; k += 4) {
        const r = t.rows[k];
        const p0 = pt(i, r.sFront + 0.1, r.y), p1 = pt(i, r.sFront + 0.1, r.y + railH);
        ms.box('rail', p0, p1, 0.06, 0.06);
      }
    }

    /* 前端玻璃栏板（每层第一排前） */
    ms.geo('glass', sweepRing([
      { s: t.s0 - 0.02, y: t.y0 + 0.02 }, { s: t.s0 - 0.02, y: t.y0 + 1.02 },
      { s: t.s0 + 0.02, y: t.y0 + 1.02 }, { s: t.s0 + 0.02, y: t.y0 + 0.02 },
    ], { uScale: 0.3, vScale: 0.3 }));
    ms.geo('rail', sweepRing([
      { s: t.s0 - 0.06, y: t.y0 + 1.02 }, { s: t.s0 + 0.06, y: t.y0 + 1.02 },
      { s: t.s0 + 0.06, y: t.y0 + 1.09 }, { s: t.s0 - 0.06, y: t.y0 + 1.09 },
    ], { uScale: 0.3, vScale: 0.3 }));

    /* 疏散口（每区 1 个，嵌在座后墙上：深色凹龛 + 门楣） */
    for (let z = 0; z < ZONES; z++) {
      const u = (z + 0.5) / ZONES;
      const w = segWindow(u, 0.0062);
      ms.geo('interiorDark', sweepRing([
        { s: t.endS + 0.68, y: t.endY - 1.1 }, { s: t.endS + 0.68, y: t.endY + 0.95 },
        { s: t.endS + 0.76, y: t.endY + 0.95 }, { s: t.endS + 0.76, y: t.endY - 1.1 },
      ], { uRange: [w.u0, w.u1], capEnds: true }));
      ms.geo('glowWarm', sweepRing([
        { s: t.endS + 0.70, y: t.endY + 0.9 }, { s: t.endS + 0.70, y: t.endY + 0.98 },
        { s: t.endS + 0.75, y: t.endY + 0.98 }, { s: t.endS + 0.75, y: t.endY + 0.9 },
      ], { uRange: [w.u0, w.u1] }));
    }
  });

  /* 一层看台底部的结构楼梯间（看台下的空腔被楼板封起） */
  ms.geo('concreteDark', sweepRing([
    { s: L1.s0, y: GEO.groundY }, { s: L1.endS + 0.7, y: GEO.groundY },
    { s: L1.endS + 0.7, y: GEO.groundY + 0.2 }, { s: L1.s0, y: GEO.groundY + 0.2 },
  ], { uScale: 0.05, vScale: 0.05 }));
}

/* ══════════════ 3. 环廊 ══════════════ */
function buildConcourse(gConc, ms, M) {
  const floors = [
    { tier: L1, y: L1.cY, ceil: L1.cY + 5.4 },
    { tier: L2, y: L2.cY, ceil: L2.cY + 5.2 },
    { tier: L3, y: L3.cY, ceil: GEO.crownY - 1.2 },
  ];
  for (const f of floors) {
    const t = f.tier;
    const s0 = t.cS0 + 0.1, s1 = t.cS1;
    /* 环廊楼板 */
    ms.geo('concrete', sweepRing([
      { s: s0, y: f.y }, { s: s1, y: f.y },
      { s: s1, y: f.y - 0.55 }, { s: s0, y: f.y - 0.55 },
    ], { uScale: 0.07, vScale: 0.07 }));
    /* 顶板（吊顶） */
    ms.geo('concreteDark', sweepRing([
      { s: s0, y: f.ceil }, { s: s1, y: f.ceil },
      { s: s1, y: f.ceil - 0.32 }, { s: s0, y: f.ceil - 0.32 },
    ], { uScale: 0.07, vScale: 0.07 }));
    /* 内边缘钢栏板 + 玻璃 */
    ms.geo('glass', sweepRing([
      { s: s0 + 0.02, y: f.y + 0.02 }, { s: s0 + 0.02, y: f.y + 1.08 },
      { s: s0 + 0.07, y: f.y + 1.08 }, { s: s0 + 0.07, y: f.y + 0.02 },
    ], { uScale: 0.3, vScale: 0.3 }));
    ms.geo('rail', sweepRing([
      { s: s0 - 0.02, y: f.y + 1.08 }, { s: s0 + 0.12, y: f.y + 1.08 },
      { s: s0 + 0.12, y: f.y + 1.15 }, { s: s0 - 0.02, y: f.y + 1.15 },
    ], { uScale: 0.3, vScale: 0.3 }));
    /* 结构柱（每 12 段一榀，贯穿上下） */
    for (const i of every(12)) {
      const p0 = pt(i, s1 - 1.4, f.y - 0.55);
      const p1 = pt(i, s1 - 1.4, f.ceil);
      ms.box('concrete', p0, p1, 1.0, 1.0, V(1, 0, 0));
    }
    /* 吊顶灯带（每 8 段一段，向内洗墙） */
    for (const i of every(8)) {
      const a = pt(i, s0 + 1.0, f.ceil - 0.42), b = pt(i + 6, s0 + 1.0, f.ceil - 0.42);
      ms.box('glow', a, b, 0.22, 0.1, V(0, 1, 0));
    }
    /* 后墙商铺：柱间填充柜台 + 发光招牌（沿外墙内表面） */
    for (let k = 0; k < SEGS / 12; k++) {
      const i = k * 12 + 6;
      const a = pt(i - 3.4, s1 - 0.25, f.y), b = pt(i + 3.4, s1 - 0.25, f.y);
      ms.box('interior', a, b, 2.2, 3.0, V(0, 0, 1));
      const g0 = pt(i - 2.6, s1 - 1.15, f.y + 3.35), g1 = pt(i + 2.6, s1 - 1.15, f.y + 3.35);
      ms.box(i % 24 === 6 ? 'glowCyan' : 'glowWarm', g0, g1, 0.16, 0.35, V(0, 0, 1));
    }
  }

  /* 三层环廊的屋顶采光/通风带（贴屋盖下皮） */
  ms.geo('steelDark', sweepRing([
    { s: L3.cS0 + 1.0, y: GEO.crownY - 1.6 }, { s: L3.cS1 - 1.0, y: GEO.crownY - 1.6 },
    { s: L3.cS1 - 1.0, y: GEO.crownY - 2.4 }, { s: L3.cS0 + 1.0, y: GEO.crownY - 2.4 },
  ], { uScale: 0.1, vScale: 0.1 }));
}

/* ══════════════ 4. 包厢夹层 ══════════════ */
function buildSuites(gSuite, ms, msG, M) {
  const sF = GEO.suiteS;                 // 玻璃面
  const sB = sF - GEO.suiteDepth;        // 后墙
  const walkS = sB - GEO.suiteWalk;      // 后走道
  for (let L = 0; L < 2; L++) {
    const y = GEO.suiteLevels[L];
    const H = GEO.suiteH;
    /* 楼板 */
    ms.geo('concrete', sweepRing([
      { s: walkS, y }, { s: sF, y }, { s: sF, y: y - 0.4 }, { s: walkS, y: y - 0.4 },
    ], { uScale: 0.08, vScale: 0.08 }));
    /* 后墙 */
    ms.geo('interior', sweepRing([
      { s: sB, y: y + 0.05 }, { s: sB + 0.28, y: y + 0.05 },
      { s: sB + 0.28, y: y + H }, { s: sB, y: y + H },
    ], { uScale: 0.18, vScale: 0.18 }));
    /* 包厢隔墙（每 4 段一樘包厢） */
    for (const i of every(4)) {
      ms.box('interior', pt(i, sB + 0.4, y + 0.1), pt(i, sF - 0.2, y + 0.1), 0.22, H - 0.1, V(0, 1, 0));
    }
    /* 前玻璃 */
    ms.geo('glassDark', sweepRing([
      { s: sF - 0.05, y: y + 0.12 }, { s: sF - 0.05, y: y + H - 0.24 },
      { s: sF + 0.02, y: y + H - 0.24 }, { s: sF + 0.02, y: y + 0.12 },
    ], { uScale: 0.3, vScale: 0.3 }));
    /* 玻璃竖框 + 顶部横梁 */
    for (const i of every(4)) {
      ms.box('aluDark', pt(i, sF, y + 0.12), pt(i, sF, y + H - 0.24), 0.14, 0.2);
    }
    ms.geo('aluDark', sweepRing([
      { s: sF - 0.1, y: y + H - 0.32 }, { s: sF + 0.05, y: y + H - 0.32 },
      { s: sF + 0.05, y: y + H }, { s: sF - 0.1, y: y + H },
    ], { uScale: 0.2, vScale: 0.2 }));
    /* 顶板 */
    ms.geo('concreteDark', sweepRing([
      { s: walkS, y: y + H }, { s: sF, y: y + H },
      { s: sF, y: y + H - 0.3 }, { s: walkS, y: y + H - 0.3 },
    ], { uScale: 0.08, vScale: 0.08 }));
    /* 室内暖光条 */
    msG.geo('glowWarm', sweepRing([
      { s: sF - 0.55, y: y + H - 0.34 }, { s: sF - 0.55, y: y + H - 0.42 },
      { s: sF - 0.75, y: y + H - 0.42 }, { s: sF - 0.75, y: y + H - 0.34 },
    ], { uScale: 0.2, vScale: 0.2 }));
    /* 后走道栏杆 */
    ms.geo('rail', sweepRing([
      { s: walkS + 0.1, y: y + 0.9 }, { s: walkS + 0.1, y: y + 0.98 },
      { s: walkS + 0.16, y: y + 0.98 }, { s: walkS + 0.16, y: y + 0.9 },
    ], { uScale: 0.3, vScale: 0.3 }));
    /* 走道灯带 */
    msG.geo('glow', sweepRing([
      { s: walkS + 0.6, y: y + H - 0.36 }, { s: walkS + 0.6, y: y + H - 0.44 },
      { s: walkS + 0.9, y: y + H - 0.44 }, { s: walkS + 0.9, y: y + H - 0.36 },
    ], { uScale: 0.2, vScale: 0.2 }));
  }
}

/* ══════════════ 5. 外立面 ══════════════ */
function buildFacade(gFacade, ms, M) {
  const S = GEO.outerS, gY = GEO.groundY;
  const baseTop = GEO.outerBaseY, midTop = GEO.outerMidY, topY = GEO.outerTopY, crownY = GEO.crownY;

  /* ── 基座：石材（扣掉 4 主券洞 + 8 次门） ── */
  const baseProf = [
    { s: S - 1.5, y: gY }, { s: S, y: gY }, { s: S, y: baseTop }, { s: S - 1.5, y: baseTop },
  ];
  const openings = [
    ...PORTALS.map((u) => ({ u0: u - GEO.portalHalfU, u1: u + GEO.portalHalfU, h: GEO.portalH, main: true })),
    ...SUB_DOORS.map((u) => ({ u0: u - GEO.subHalfU, u1: u + GEO.subHalfU, h: GEO.subH, main: false })),
  ];
  for (const [a, b] of subtractWindows(1, openings)) {
    ms.geo('stone', sweepRing(baseProf, { uRange: [a, b], capEnds: true }));
  }

  /* ── 主券洞：侧壁 / 顶 / 台阶 / 雨棚 / 门 ── */
  for (const u of PORTALS) {
    const half = GEO.portalHalfU, H = GEO.portalH, R = GEO.portalRecess;
    // 侧壁（厚 1.5，从外皮到门厅）
    [u - half, u + half].forEach((uu) => {
      ms.geo('stone', sweepRing([
        { s: S - R, y: gY }, { s: S + 1.5, y: gY },
        { s: S + 1.5, y: H }, { s: S - R, y: H },
      ], { uRange: [uu - 0.0032, uu + 0.0032], capEnds: true }));
    });
    // 券洞顶（内退的吊顶 + 灯槽）
    ms.geo('concreteDark', sweepRing([
      { s: S - R, y: H }, { s: S + 1.4, y: H },
      { s: S + 1.4, y: H - 0.9 }, { s: S - R, y: H - 0.9 },
    ], { uRange: [u - half, u + half], capEnds: true }));
    ms.geo('glowWarm', sweepRing([
      { s: S - R + 1.0, y: H - 0.92 }, { s: S - R + 1.0, y: H - 0.98 },
      { s: S - 1.0, y: H - 0.98 }, { s: S - 1.0, y: H - 0.92 },
    ], { uRange: [u - half + 0.002, u + half - 0.002] }));
    // 入口地坪与三级大台阶
    ms.geo('stone', sweepRing([
      { s: S - R, y: 0 }, { s: S + 6.0, y: 0 }, { s: S + 6.0, y: -0.45 }, { s: S - R, y: -0.45 },
    ], { uRange: [u - half - 0.006, u + half + 0.006], capEnds: true }));
    for (let k = 0; k < 3; k++) {
      ms.geo('stone', sweepRing([
        { s: S + 6.4 + k * 1.5, y: -0.15 * (k + 1) }, { s: S + 7.6 + k * 1.5, y: -0.15 * (k + 1) },
        { s: S + 7.6 + k * 1.5, y: -0.15 * (k + 2) - 0.2 }, { s: S + 6.4 + k * 1.5, y: -0.15 * (k + 2) - 0.2 },
      ], { uRange: [u - half - 0.008, u + half + 0.008], capEnds: true }));
    }
    // 雨棚（外挑 7m 的薄板 + 边梁）
    ms.geo('alu', sweepRing([
      { s: S + 7.4, y: H + 1.6 }, { s: S - 1.0, y: H + 1.6 },
      { s: S - 1.0, y: H + 1.1 }, { s: S + 7.4, y: H + 1.1 },
    ], { uRange: [u - half - 0.004, u + half + 0.004], capEnds: true }));
    ms.geo('aluLight', sweepRing([
      { s: S + 7.4, y: H + 1.7 }, { s: S + 7.4, y: H + 0.9 },
      { s: S + 7.8, y: H + 0.9 }, { s: S + 7.8, y: H + 1.7 },
    ], { uRange: [u - half - 0.004, u + half + 0.004], capEnds: true }));
    // 门厅玻璃门（8 樘，发光）
    for (let g = -3; g <= 3; g++) {
      const gu = u + g * (half * 0.235);
      ms.geo('glowWarm', sweepRing([
        { s: S - 2.2, y: 0.1 }, { s: S - 2.2, y: 3.5 },
        { s: S - 2.32, y: 3.5 }, { s: S - 2.32, y: 0.1 },
      ], { uRange: [gu - 0.0055, gu + 0.0055] }));
      ms.geo('steelDark', sweepRing([
        { s: S - 2.14, y: 3.5 }, { s: S - 2.14, y: 3.62 },
        { s: S - 2.4, y: 3.62 }, { s: S - 2.4, y: 3.5 },
      ], { uRange: [gu - 0.0055, gu + 0.0055] }));
    }
  }

  /* ── 次入口：门洞 + 门套 + 雨棚 ── */
  for (const u of SUB_DOORS) {
    const half = GEO.subHalfU, H = GEO.subH;
    [u - half, u + half].forEach((uu) => {
      ms.geo('stone', sweepRing([
        { s: S - 3.0, y: gY }, { s: S + 1.2, y: gY },
        { s: S + 1.2, y: H }, { s: S - 3.0, y: H },
      ], { uRange: [uu - 0.0022, uu + 0.0022], capEnds: true }));
    });
    ms.geo('concreteDark', sweepRing([
      { s: S - 3.0, y: H }, { s: S + 1.1, y: H },
      { s: S + 1.1, y: H - 0.5 }, { s: S - 3.0, y: H - 0.5 },
    ], { uRange: [u - half, u + half], capEnds: true }));
    ms.geo('glow', sweepRing([
      { s: S - 2.6, y: 0.2 }, { s: S - 2.6, y: 3.0 },
      { s: S - 2.72, y: 3.0 }, { s: S - 2.72, y: 0.2 },
    ], { uRange: [u - half * 0.8, u + half * 0.8] }));
    ms.geo('aluDark', sweepRing([
      { s: S + 3.4, y: H + 0.9 }, { s: S - 0.4, y: H + 0.9 },
      { s: S - 0.4, y: H + 0.5 }, { s: S + 3.4, y: H + 0.5 },
    ], { uRange: [u - half - 0.004, u + half + 0.004], capEnds: true }));
  }

  /* ── 中段：玻璃幕墙 + 青铜网幕 + 竖肋 ── */
  ms.geo('glassDark', sweepRing([
    { s: S - 0.75, y: baseTop }, { s: S - 0.75, y: midTop },
    { s: S - 0.72, y: midTop }, { s: S - 0.72, y: baseTop },
  ], { uScale: 0.14, vScale: 0.14 }));
  ms.geo('bronzeMesh', sweepRing([
    { s: S + 0.85, y: baseTop + 0.6 }, { s: S + 0.85, y: midTop },
    { s: S + 0.88, y: midTop }, { s: S + 0.88, y: baseTop + 0.6 },
  ], { uScale: 0.16, vScale: 0.2 }));
  // 竖肋
  for (const i of every(4)) {
    ms.box('bronze', pt(i, S + 0.55, baseTop + 0.5), pt(i, S + 0.55, midTop), 0.22, 0.75, V(1, 0, 0));
  }
  // 三道潮线（外挑铝带 + 底面灯带）
  [baseTop + 1.2, baseTop + 6.4, midTop - 0.6].forEach((y, k) => {
    ms.geo('alu', sweepRing([
      { s: S + 1.5, y }, { s: S - 0.2, y },
      { s: S - 0.2, y: y - 0.55 }, { s: S + 1.5, y: y - 0.55 },
    ], { uScale: 0.14, vScale: 0.14 }));
    ms.geo('glow', sweepRing([
      { s: S + 1.4, y: y - 0.56 }, { s: S + 1.4, y: y - 0.62 },
      { s: S + 0.1, y: y - 0.62 }, { s: S + 0.1, y: y - 0.56 },
    ], { uScale: 0.2, vScale: 0.2 }));
  });

  /* ── 上段：铝板幕墙（每 12 段一道竖向凹槽） ── */
  ms.geo('alu', sweepRing([
    { s: S - 0.2, y: midTop }, { s: S + 0.5, y: midTop },
    { s: S + 0.5, y: topY }, { s: S - 0.2, y: topY },
  ], { uScale: 0.14, vScale: 0.14 }));
  for (const i of every(12)) {
    const w = segWindow(i / SEGS, 0.0055);
    ms.geo('glassDark', sweepRing([
      { s: S - 0.05, y: midTop + 0.4 }, { s: S - 0.05, y: topY - 0.4 },
      { s: S - 0.02, y: topY - 0.4 }, { s: S - 0.02, y: midTop + 0.4 },
    ], { uRange: [w.u0, w.u1], capEnds: true }));
  }

  /* ── 潮冠：外挑 3.2m 的亮色檐带（做成折面，读作实体） ── */
  const crownProf = [
    { s: S - 0.4, y: topY },
    { s: S + GEO.crownOut, y: topY + 0.5 },
    { s: S + GEO.crownOut, y: crownY - 0.9 },
    { s: S + GEO.crownOut - 0.7, y: crownY },
    { s: S - 0.4, y: crownY + 0.15 },
  ];
  ms.geo('aluLight', sweepRing(crownProf, { uScale: 0.1, vScale: 0.1 }));
  // 檐带底面灯槽（夜间形成一圈连续光边）
  ms.geo('glowCyan', sweepRing([
    { s: S + GEO.crownOut - 1.2, y: topY + 0.42 }, { s: S + GEO.crownOut - 1.2, y: topY + 0.34 },
    { s: S + 0.6, y: topY + 0.34 }, { s: S + 0.6, y: topY + 0.42 },
  ], { uScale: 0.2, vScale: 0.2 }));

  /* ── 屋面雨水立管（8 根，贴立面） ── */
  for (const i of every(24)) {
    ms.box('aluDark', pt(i, S + 0.6, crownY - 1.2), pt(i, S + 0.6, gY + 0.4), 0.55, 0.55, V(1, 0, 0));
  }
}

/* ══════════════ 6. 结构 ══════════════ */
function buildStructure(gStruct, ms, M) {
  const RI = GEO.roofInnerS, RS = GEO.roofRidgeS, RO = GEO.roofOuterS;

  /* ── 24 榀径向桁架 ── */
  const NSEG = 11;
  for (const i of every(GEO.trussStep)) {
    const top = [], bot = [];
    for (let k = 0; k < NSEG; k++) {
      const f = k / (NSEG - 1);
      const s = lerp(RI + 0.6, RO - 0.8, f);
      const yTop = roofY(s, i) - GEO.roofThick - 0.18;
      // 桁架高度：内陆端浅、屋脊处深
      const depth = 2.4 + 2.9 * Math.sin(Math.PI * Math.pow(f, 0.72));
      top.push(pt(i, s, yTop));
      bot.push(pt(i, s, yTop - depth));
    }
    for (let k = 0; k < NSEG - 1; k++) {
      ms.box('steel', top[k], top[k + 1], 0.62, 0.62, V(0, 0, 1));
      ms.box('steel', bot[k], bot[k + 1], 0.54, 0.54, V(0, 0, 1));
      ms.box('steelDark', bot[k], top[k + 1], 0.38, 0.38, V(0, 0, 1));
      if (k < NSEG - 2) ms.box('steelDark', top[k], bot[k + 1], 0.34, 0.34, V(0, 0, 1));
      // 竖腹杆
      if (k % 2 === 1) ms.box('steelDark', top[k], bot[k], 0.3, 0.3, V(0, 0, 1));
    }
    // 内檐端：上下弦收成一点（悬挑端）
    ms.box('steel', top[0], bot[0], 0.5, 0.5, V(0, 0, 1));
  }

  /* ── 两道环梁（屋脊环 / 外檐环），随鞍面起伏 ── */
  const ringBeam = (s, yOff, hgt, wdt) => {
    const y = roofBaseY(s) + yOff;
    ms.geo('steel', sweepRing([
      { s: s - wdt, y }, { s: s + wdt, y },
      { s: s + wdt, y: y - hgt }, { s: s - wdt, y: y - hgt },
    ], { uScale: 0.1, vScale: 0.1, yMod: RM }));
  };
  ringBeam(RS, -1.5, 2.6, 1.5);
  ringBeam(RO - 1.6, -1.2, 2.2, 1.4);
  ringBeam(RI + 0.35, -1.1, 1.9, 0.9);

  /* ── 环向檩条（4 道，随曲面） ── */
  for (const f of [0.22, 0.42, 0.62, 0.82]) {
    const s = lerp(RI, RO, f);
    const y = roofBaseY(s) - GEO.roofThick - 0.62;
    ms.geo('steelDark', sweepRing([
      { s: s - 0.26, y }, { s: s + 0.26, y },
      { s: s + 0.26, y: y - 0.42 }, { s: s - 0.26, y: y - 0.42 },
    ], { uScale: 0.14, vScale: 0.14, yMod: RM }));
  }

  /* ── 8 根潮柱（4 角 + 4 边中） ── */
  for (let k = 0; k < 8; k++) {
    const i = (k * SEGS / 8) % SEGS;
    const baseP = pt(i, GEO.mastS_base, GEO.mastBaseY);
    const topY = roofY(GEO.roofOuterS - 2.2, i) - 2.0;
    const topP = pt(i, GEO.mastS_top, topY);
    // 混凝土柱身（分级收分）
    tapered(ms.batch('concrete'), baseP, baseP.clone().lerp(topP, 0.5), 3.4, 2.9, 2.9, 2.5);
    tapered(ms.batch('concrete'), baseP.clone().lerp(topP, 0.5), topP, 2.9, 2.2, 2.5, 1.9);
    // 柱脚台座 + 基础
    ms.box('concreteDark', baseP.clone().setY(GEO.mastBaseY + 0.35), baseP.clone().setY(GEO.mastBaseY - 0.6), 5.4, 5.4);
    // 柱顶钢叉（双板 + 销轴）
    const fork = topP.clone().addScaledVector(topP.clone().sub(baseP).normalize(), 0.6);
    ms.box('steelDark', topP, fork, 2.8, 1.4, V(0, 0, 1));
    for (const sgn of [-1, 1]) {
      const off = new THREE.Vector3().crossVectors(topP.clone().sub(baseP).normalize(), V(0, 1, 0)).normalize().multiplyScalar(sgn * 1.5);
      ms.box('steel', fork.clone().add(off), pt(i, GEO.roofOuterS - 1.0, topY + 1.0).add(off), 0.34, 0.34);
    }
    // 拉索：柱顶向两侧屋盖斜拉
    for (const sgn of [-1, 1]) {
      const j = (i + sgn * 10 + SEGS) % SEGS;
      const anchor = pt(j, GEO.roofRidgeS, roofY(GEO.roofRidgeS, j) - GEO.roofThick - 0.4);
      ms.box('steel', topP.clone().add(V(0, 1.2, 0)), anchor, 0.16, 0.16, V(0, 1, 0));
    }
    // 柱身竖向凹槽（折面，避免读作圆柱）
    for (const sgn of [-1, 1]) {
      const mid = baseP.clone().lerp(topP, 0.5);
      const off = new THREE.Vector3().crossVectors(topP.clone().sub(baseP).normalize(), V(0, 1, 0)).normalize().multiplyScalar(sgn * 1.55);
      ms.box('concreteDark', baseP.clone().add(off).setY(GEO.mastBaseY + 1.2), mid.clone().add(off), 0.35, 0.6);
    }
  }

  /* ── 环廊与看台下的斜撑（结构可读性） ── */
  for (const i of every(16)) {
    const a = pt(i, L2.s0 + 0.5, L2.cY - 0.6);
    const b = pt(i, L1.endS + 0.4, L1.cY - 4.2);
    ms.box('steelDark', a, b, 0.55, 0.55, V(0, 0, 1));
    const c = pt(i, L3.s0 + 0.5, L3.cY - 0.6);
    const d = pt(i, L2.endS + 0.4, L2.cY - 4.2);
    ms.box('steelDark', c, d, 0.5, 0.5, V(0, 0, 1));
  }

  /* ── 屋盖检修马道 ── */
  ms.geo('steelDark', sweepRing([
    { s: RS - 2.4, y: roofBaseY(RS) - 6.4 }, { s: RS + 2.4, y: roofBaseY(RS) - 6.4 },
    { s: RS + 2.4, y: roofBaseY(RS) - 6.9 }, { s: RS - 2.4, y: roofBaseY(RS) - 6.9 },
  ], { uScale: 0.06, vScale: 0.06, yMod: RM }));
  for (const i of every(12)) {
    ms.box('steelDark', pt(i, RS - 2.2, roofBaseY(RS) - 6.9), pt(i, RS + 2.2, roofBaseY(RS) - 6.9), 0.12, 0.12);
  }
}

/* ══════════════ 7. 鞍面屋盖 ══════════════ */
function buildRoof(gRoof, ms, msG, M) {
  const RI = GEO.roofInnerS, RS = GEO.roofRidgeS, RO = GEO.roofOuterS;

  /* 主曲面：闭合剖面（上表面 + 下皮），沿环扫掠并做鞍面调制 */
  const topLine = [];
  const N = 14;
  for (let k = 0; k < N; k++) {
    const f = k / (N - 1);
    const s = lerp(RI, RO, f);
    topLine.push({ s, y: roofBaseY(s) });
  }
  ms.geo('roofMetal', plateRing(topLine, GEO.roofThick, -1, { uScale: 0.42, vScale: 0.24, yMod: RM }));

  /* 内檐：细薄悬浮边（上翻 1.5m 的金属收边 + 下翻檐口） */
  ms.geo('aluLight', sweepRing([
    { s: RI - 0.22, y: roofBaseY(RI) + 1.55 }, { s: RI + 0.55, y: roofBaseY(RI) + 1.55 },
    { s: RI + 0.55, y: roofBaseY(RI) - 0.35 }, { s: RI - 0.22, y: roofBaseY(RI) - 0.35 },
  ], { uScale: 0.14, vScale: 0.14, yMod: RM }));
  // 内檐下皮（向内收的浅折面）
  ms.geo('roofSoffit', sweepRing([
    { s: RI - 0.22, y: roofBaseY(RI) - 1.55 }, { s: RI + 1.4, y: roofBaseY(RI) - 1.55 },
    { s: RI + 1.4, y: roofBaseY(RI) - 2.15 }, { s: RI - 0.22, y: roofBaseY(RI) - 2.15 },
  ], { uScale: 0.14, vScale: 0.14, yMod: RM }));
  // 内檐连续灯带（夜间勾出场地开口）
  msG.geo('glowCyan', sweepRing([
    { s: RI - 0.05, y: roofBaseY(RI) - 1.58 }, { s: RI - 0.05, y: roofBaseY(RI) - 1.72 },
    { s: RI + 0.35, y: roofBaseY(RI) - 1.72 }, { s: RI + 0.35, y: roofBaseY(RI) - 1.58 },
  ], { uScale: 0.25, vScale: 0.25, yMod: RM }));

  /* 外檐收边（落在潮冠上，形成厚度感） */
  ms.geo('aluLight', sweepRing([
    { s: RO - 0.3, y: roofBaseY(RO) + 0.35 }, { s: RO + 1.1, y: roofBaseY(RO) + 0.05 },
    { s: RO + 1.1, y: roofBaseY(RO) - 1.5 }, { s: RO - 0.3, y: roofBaseY(RO) - 1.5 },
  ], { uScale: 0.12, vScale: 0.12, yMod: RM }));

  /* 径向屋面板缝（每 2 段一道，随曲面） */
  for (const i of every(2)) {
    const a = pt(i, RI, roofBaseY(RI) + 0.02);
    const b = pt(i, RO, roofBaseY(RO) + 0.02);
    const mid = pt(i, RS, roofBaseY(RS) + 0.02);
    // 用两段折线逼近曲面
    ms.box('aluDark', a, mid, 0.16, 0.1, V(1, 0, 0));
    ms.box('aluDark', mid, b, 0.16, 0.1, V(1, 0, 0));
  }

  /* 檐口排水天沟 */
  ms.geo('steelDark', sweepRing([
    { s: RO - 0.9, y: roofBaseY(RO) - 1.52 }, { s: RO + 0.6, y: roofBaseY(RO) - 1.9 },
    { s: RO + 0.6, y: roofBaseY(RO) - 2.25 }, { s: RO - 0.9, y: roofBaseY(RO) - 1.95 },
  ], { uScale: 0.1, vScale: 0.1, yMod: RM }));

  /* ── 4 组灯桥（挂在内檐下方，朝场地） ── */
  const lamps = [];
  for (let k = 0; k < 4; k++) {
    const i = Math.round(k * SEGS / 4) % SEGS;
    const s = RI + 8.5;
    const y = roofY(s, i) - 4.0;
    const c = pt(i, s, y);
    const dir = new THREE.Vector3(-c.x, 0, -c.z).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    // 灯桥箱体
    const halfLen = 11;
    ms.box('steelDark', c.clone().addScaledVector(side, -halfLen), c.clone().addScaledVector(side, halfLen), 2.0, 1.5, V(0, 1, 0));
    // 吊杆
    for (const sgn of [-1, 0, 1]) {
      const p = c.clone().addScaledVector(side, sgn * halfLen * 0.85);
      ms.box('steelDark', p, p.clone().setY(roofY(s, i) - GEO.roofThick - 0.4), 0.18, 0.18);
    }
    // 灯具（3 排 × 9 组，自发光）
    for (let r = 0; r < 2; r++) for (let m = -4; m <= 4; m++) {
      const p = c.clone().addScaledVector(side, m * 2.3).addScaledVector(dir, 1.05).setY(y - 0.55 + r * 0.55);
      msG.box('glow', p.clone().addScaledVector(side, 0.9), p.clone().addScaledVector(side, -0.9), 0.5, 0.28, V(0, 1, 0));
      lamps.push(p.clone());
    }
  }
  return lamps;
}

/* ══════════════ 8. 座椅 ══════════════ */
function seatGeom(hi) {
  /* 8 面低模：坐垫顶 + 坐垫前 + 靠背 + 靠背顶（双面材质，远处读作排座） */
  const b = new GeomBatch();
  const W = hi ? 0.50 : 0.52, D = 0.46, SH = 0.44, BH = 0.58;
  const p = (x, y, z) => new THREE.Vector3(x, y, z);
  const yS = SH, yB = SH + BH;
  b.quad(p(-W / 2, yS, -D / 2), p(W / 2, yS, -D / 2), p(W / 2, yS, D / 2), p(-W / 2, yS, D / 2));   // 坐垫顶
  b.quad(p(-W / 2, 0, D / 2), p(W / 2, 0, D / 2), p(W / 2, yS, D / 2), p(-W / 2, yS, D / 2));       // 坐垫前
  b.quad(p(-W / 2, yS, -D / 2), p(W / 2, yS, -D / 2), p(W / 2, yB, -D / 2 - 0.05), p(-W / 2, yB, -D / 2 - 0.05));  // 靠背
  b.quad(p(-W / 2, yB, -D / 2 - 0.05), p(W / 2, yB, -D / 2 - 0.05), p(W / 2, yB, -D / 2 - 0.11), p(-W / 2, yB, -D / 2 - 0.11)); // 靠背顶
  if (hi) {
    b.quad(p(-W / 2, 0, -D / 2), p(-W / 2, 0, D / 2), p(-W / 2, yS, D / 2), p(-W / 2, yS, -D / 2));
    b.quad(p(W / 2, 0, -D / 2), p(W / 2, 0, D / 2), p(W / 2, yS, D / 2), p(W / 2, yS, -D / 2));
  }
  return b.build();
}

function buildSeats(group, M, stage) {
  const geoLo = seatGeom(false), geoHi = seatGeom(true);
  const ring = refRing(SEGS);
  const dummy = new THREE.Object3D();
  const TIER_COLORS = [0xc9a15f, 0xdfe4e8, 0xb08a92];
  const buckets = MODEL.tiers.map(() => []);
  const accent = [];
  const rowPerim = new Map();
  for (const t of MODEL.tiers) for (const r of t.rows) rowPerim.set(t.id + ':' + r.k, r.perimeter);

  /* 轻量模式：坐席抽稀。几何量按 stride² 降（实例数除以 stride，单个实例切向放大 stride 倍
     仍只是 8 面），远景读到的是连续色带，近景才会看出座位变宽。
     这是本项目最有效的单项优化：实测 1600×900 下 103 万面 → 52 万面，帧率 +5~16。 */
  const stride = (stage && stage.lite) ? Math.max(1, stage.seatStride || 3) : 1;

  for (const s of seatInstances(MODEL, stride)) {
    const perim = rowPerim.get(s.tier + ':' + s.row) || 330;
    const fu = (((s.u % 1) + 1) % 1) * (ring.total / perim) * SEGS;
    const fi = ((fu % SEGS) + SEGS) % SEGS;
    const i0 = Math.floor(fi) % SEGS, i1 = (i0 + 1) % SEGS, fr = fi - Math.floor(fi);
    let nx = ring.pts[i0].nx + (ring.pts[i1].nx - ring.pts[i0].nx) * fr;
    let nz = ring.pts[i0].nz + (ring.pts[i1].nz - ring.pts[i0].nz) * fr;
    const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    const hx = HALF_X + s.s, hz = HALF_Z + s.s;
    const t = boundaryT(hx, hz, hx * CORNER_F, nx, nz);
    dummy.position.set(nx * t, s.y, nz * t);
    dummy.rotation.set(0, Math.atan2(-nx, -nz), 0);
    /* 抽稀后把保留的座位沿切向（本地 x）放大 stride 倍，视觉上仍是连续色带 */
    dummy.scale.set(stride, 1, 1);
    dummy.updateMatrix();
    const mtx = dummy.matrix.clone();
    const hex = seatColor(s.tierIdx, s.row, s.zone, s.idx, MODEL.tiers[s.tierIdx].rows[0].perZone);
    if (ACCENT.includes(hex)) accent.push(mtx); else buckets[s.tierIdx].push(mtx);
  }

  const meshes = [];
  const mkInst = (mt, list, colorHex, name, hi) => {
    if (!list.length) return;
    const mat = M.seat.clone();
    mat.color = new THREE.Color(colorHex);
    mat.emissive = new THREE.Color(colorHex).multiplyScalar(0.16);
    mat.emissiveIntensity = 1.0;
    const inst = new THREE.InstancedMesh(hi ? geoHi : geoLo, mat, list.length);
    inst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    for (let i = 0; i < list.length; i++) inst.setMatrixAt(i, list[i]);
    inst.instanceMatrix.needsUpdate = true;
    inst.name = name;
    inst.castShadow = false; inst.receiveShadow = false;
    inst.computeBoundingSphere();
    group.add(inst); meshes.push(inst);
  };
  buckets.forEach((list, ti) => {
    /* 前 8 排用高模，其余低模。轻量模式下整体降为低模（省一半面数，远景无差别） */
    const hi = [], lo = [];
    const firstRows = stride > 1 ? 0 : 8;
    for (let i = 0; i < list.length; i++) (i < firstRows * 200 ? hi : lo).push(list[i]);
    mkInst(hi, hi, TIER_COLORS[ti], 'seats-' + MODEL.tiers[ti].id + '-hi', true);
    mkInst(lo, lo, TIER_COLORS[ti], 'seats-' + MODEL.tiers[ti].id, false);
  });
  mkInst(null, accent, 0xf0cf8a, 'seats-accent', false);
  return { meshes, total: MODEL.total, stride };
}

/* ══════════════ 9. 室内 ══════════════ */
function buildInterior(gInterior, ms, msG, M) {
  const S = GEO.outerS;
  const P = (i, s, y) => pt(i, s, y);
  const seg = (u) => Math.round(u * SEGS) % SEGS;

  /* ── 首层环廊（podium）：地面层，连接 12 个出入口 ── */
  const podY = 0, podH = 9.4;
  ms.geo('interior', sweepRing([
    { s: L1.endS + 1.0, y: podY }, { s: S - 1.5, y: podY },
    { s: S - 1.5, y: podY - 0.35 }, { s: L1.endS + 1.0, y: podY - 0.35 },
  ], { uScale: 0.05, vScale: 0.05 }));
  ms.geo('interiorDark', sweepRing([
    { s: L1.endS + 1.2, y: podH }, { s: S - 1.5, y: podH },
    { s: S - 1.5, y: podH - 0.35 }, { s: L1.endS + 1.2, y: podH - 0.35 },
  ], { uScale: 0.05, vScale: 0.05 }));
  // 柱网
  for (const i of every(12)) {
    ms.box('concrete', P(i, S - 4.2, podY), P(i, S - 4.2, podH), 1.0, 1.0, V(1, 0, 0));
    ms.box('concrete', P(i, L1.endS + 4.0, podY), P(i, L1.endS + 4.0, podH), 0.9, 0.9, V(1, 0, 0));
  }
  // 吊顶灯带
  for (const i of every(6)) {
    ms.box('glowCool', P(i, S - 9, podH - 0.42), P(i + 4, S - 9, podH - 0.42), 0.2, 0.1, V(0, 1, 0));
  }
  // 商铺 / 餐饮 / 卫生间体块（沿外墙内侧）
  for (let k = 0; k < SEGS / 12; k++) {
    const i = k * 12 + 6;
    const w = k % 3 === 0 ? 'interior' : 'interiorDark';
    ms.box(w, P(i - 4.2, S - 2.2, podY), P(i + 4.2, S - 2.2, podY), 6.0, 4.2, V(0, 0, 1));
    ms.box('glowWarm', P(i - 3.4, S - 5.4, 3.3), P(i + 3.4, S - 5.4, 3.3), 0.16, 0.3, V(0, 0, 1));
  }

  /* ── 入口大厅（4 个，深 26m） ── */
  for (const u of PORTALS) {
    const half = GEO.portalHalfU;
    const sIn = S - 26;
    // 地坪
    ms.geo('stone', sweepRing([
      { s: sIn, y: 0.02 }, { s: S - 1.0, y: 0.02 },
      { s: S - 1.0, y: -0.3 }, { s: sIn, y: -0.3 },
    ], { uRange: [u - half - 0.008, u + half + 0.008], capEnds: true }));
    // 大厅吊顶（14m 高）
    ms.geo('interiorDark', sweepRing([
      { s: sIn, y: 14.0 }, { s: S - 1.0, y: 14.0 },
      { s: S - 1.0, y: 13.5 }, { s: sIn, y: 13.5 },
    ], { uRange: [u - half - 0.008, u + half + 0.008], capEnds: true }));
    // 侧墙
    [u - half - 0.008, u + half + 0.008].forEach((uu) => {
      ms.geo('interior', sweepRing([
        { s: sIn, y: 0 }, { s: S - 1.0, y: 0 },
        { s: S - 1.0, y: 14.0 }, { s: sIn, y: 14.0 },
      ], { uRange: [uu - 0.0016, uu + 0.0016], capEnds: true }));
    });
    // 吊顶灯阵
    for (let r = 0; r < 3; r++) {
      msG.box('glow', P(seg(u), sIn + 3 + r * 7, 13.4), P(seg(u) + 2, sIn + 3 + r * 7, 13.4), 4.2, 0.12, V(0, 1, 0));
    }
    // 检票闸机
    for (let k = -3; k <= 3; k++) {
      const i = seg(u) + k;
      ms.box('steelDark', P(i, sIn + 9, 0.02), P(i, sIn + 9, 1.3), 1.0, 0.36);
      ms.box('glowCyan', P(i, sIn + 9, 1.3), P(i, sIn + 9, 1.42), 0.9, 0.1);
    }
    // 服务台
    ms.box('wood', P(seg(u) - 3, sIn + 3, 0.02), P(seg(u) + 3, sIn + 3, 0.02), 0.9, 1.1, V(0, 1, 0));
    // 背景 LED 墙
    ms.box('glowCool', P(seg(u) - 5, sIn, 0.05), P(seg(u) + 5, sIn, 7.5), 0.3, 0.3);
  }

  /* ── 自动扶梯（4 组，从首层大厅上到 L1 环廊） ── */
  for (const u of PORTALS) {
    const i = seg(u);
    const sA = S - 20, sB = L1.cS1 - 2.0;
    const pA = P(i + 2, sA, 0.2), pB = P(i + 2, sB, L1.cY);
    // 梯身
    const mid = pA.clone().lerp(pB, 0.5);
    ms.box('steelDark', pA, pB, 2.4, 0.4, V(0, 1, 0));
    // 扶手带
    ms.box('rail', pA.clone().setY(pA.y + 1.0), pB.clone().setY(pB.y + 1.0), 0.12, 0.12);
    ms.box('glassLite', pA.clone().setY(pA.y + 0.5), pB.clone().setY(pB.y + 0.5), 0.06, 1.0);
    // 底部机房
    ms.box('concreteDark', pA.clone().setY(0.1), pA.clone().setY(-1.0), 3.2, 3.2);
  }

  /* ── 垂直疏散楼梯（8 部，从首层到 L1/L2/L3 环廊） ── */
  for (let k = 0; k < 8; k++) {
    const u = (k + 0.5) / 8;
    const i = seg(u);
    const s0 = L1.cS1 - 1.2, s1 = L1.cS1 + 3.4;
    const base = P(i, s0, 0);
    const boxTop = P(i, s1, L3.cY);
    // 楼梯间外围墙（上下贯通，形成竖向疏散核）
    ms.box('concrete', base.clone().setY(0), boxTop, 6.4, 6.4, V(0, 0, 1));
    // 楼梯踏步（意象化：每 1.2m 一道薄板）
    for (let y = 0.6; y < L3.cY - 1; y += 1.15) {
      ms.box('concreteLight', P(i, s0 + 0.3, y), P(i, s1 - 0.3, y), 2.6, 0.16, V(0, 1, 0));
    }
    // 楼梯间的疏散指示灯
    msG.box('glowWarm', base.clone().setY(2.4), base.clone().setY(2.5), 0.5, 0.5);
  }

  /* ── 球员区（北侧）：通道 + 更衣室 + 医疗 + 热身 ── */
  {
    const iN = 0;
    const zTunnel = GEO.barrierS;
    // 球员通道：从场地穿过下层看台到首层环廊
    const sA = zTunnel - 3.0, sB = L1.endS + 6.0;
    // 地面（比场地低 0.05）
    ms.geo('carpet', sweepRing([
      { s: sA, y: -0.05 }, { s: sB, y: -0.05 },
      { s: sB, y: -0.35 }, { s: sA, y: -0.35 },
    ], { uRange: [-0.0105, 0.0105], capEnds: true }));
    // 两侧墙 + 吊顶
    [-0.0105, 0.0105].forEach((uu) => {
      ms.geo('interior', sweepRing([
        { s: sA, y: 0 }, { s: sB, y: 0 }, { s: sB, y: 3.2 }, { s: sA, y: 3.2 },
      ], { uRange: [uu - 0.0018, uu + 0.0018], capEnds: true }));
    });
    ms.geo('interiorDark', sweepRing([
      { s: sA, y: 3.2 }, { s: sB, y: 3.2 }, { s: sB, y: 2.85 }, { s: sA, y: 2.85 },
    ], { uRange: [-0.0105, 0.0105], capEnds: true }));
    // 通道灯带
    for (let s = sA + 2; s < sB; s += 5) {
      msG.box('glow', P(iN, s, 2.8), P(iN + 2, s, 2.8), 1.6, 0.12, V(0, 1, 0));
    }
    // 更衣室（两支球队，左右对称）
    for (const side of [-1, 1]) {
      const i = iN + side * 6;
      const c = P(i, L1.endS + 16, 0);
      const rot = Math.atan2(c.x, c.z);
      const put = (w, h, d, x, y, z, mat) => {
        const g = new THREE.BoxGeometry(w, h, d);
        const mtx = new THREE.Matrix4().makeRotationY(rot);
        mtx.setPosition(c.clone().add(new THREE.Vector3(x, y, z).applyAxisAngle(V(0, 1, 0), rot)));
        ms.batch(mat).add(g, mtx);
        g.dispose();
        return null;
      };
      // 房间壳
      put(15, 0.2, 11, 0, 0.1, 0, 'interiorDark');
      put(15, 0.25, 11, 0, 3.6, 0, 'interiorDark');
      put(15, 3.6, 0.25, 0, 1.8, -5.4, 'interior');
      put(0.25, 3.6, 11, -7.4, 1.8, 0, 'interior');
      put(0.25, 3.6, 11, 7.4, 1.8, 0, 'interior');
      // 更衣柜（两排）
      for (const rz of [-3.4, 3.4]) for (let m = -4; m <= 4; m++) {
        put(1.35, 2.0, 0.62, m * 1.55, 1.0, rz, 'wood');
      }
      // 战术板 + 按摩床 + 冰浴
      put(4.2, 2.4, 0.12, 0, 1.6, -5.1, 'interiorDark');
      put(2.0, 0.75, 0.9, -2.4, 0.38, 0, 'wood');
      put(2.0, 0.9, 1.6, 3.4, 0.45, 1.4, 'steelDark');
      // 灯带
      const lp = c.clone().setY(3.3);
      msG.box('glow', lp.clone().add(new THREE.Vector3(-3, 0, 0)), lp.clone().add(new THREE.Vector3(3, 0, 0)), 0.2, 0.1, V(0, 1, 0));
    }
  }

  /* ── 媒体中心（西侧，u=0.75）：新闻发布厅 + 记者工作区 ── */
  {
    const i = seg(0.75);
    const c = P(i, L1.endS + 14, 0);
    const rot = Math.atan2(c.x, c.z);
    const put = (w, h, d, x, y, z, mat) => {
      const g = new THREE.BoxGeometry(w, h, d);
      const mtx = new THREE.Matrix4().makeRotationY(rot);
      mtx.setPosition(c.clone().add(new THREE.Vector3(x, y, z).applyAxisAngle(V(0, 1, 0), rot)));
      ms.batch(mat).add(g, mtx);
      g.dispose();
      return null;
    };
    put(30, 0.25, 20, 0, 0.12, 0, 'interiorDark');
    put(30, 0.3, 20, 0, 8.0, 0, 'interiorDark');
    put(30, 8.0, 0.3, 0, 4.0, -10, 'interior');
    put(0.3, 8.0, 20, -15, 4.0, 0, 'interior');
    put(0.3, 8.0, 20, 15, 4.0, 0, 'interior');
    // 发布台 + 背景屏 + 阶梯记者席
    put(12, 1.1, 1.4, 0, 0.68, -6.4, 'wood');
    put(10, 5.0, 0.25, 0, 3.4, -9.4, 'glowCool');
    for (let r = 0; r < 5; r++) {
      put(24, 0.55, 1.1, 0, 0.28 + r * 0.32, -3.0 + r * 1.5, 'interiorDark');
      for (let cc = -7; cc <= 7; cc++) {
        put(0.85, 0.72, 0.55, cc * 1.5, 0.4 + r * 0.32, -3.0 + r * 1.5, 'interiorDark');
      }
    }
    for (let r = 0; r < 3; r++) {
      put(6, 0.1, 1.2, 0, 7.6, -6 + r * 3, 'glow');
    }
  }

  /* ── 贵宾入口与休息厅（东侧，u=0.25） ── */
  {
    const i = seg(0.25);
    const c = P(i, S - 12, 0);
    const rot = Math.atan2(c.x, c.z);
    const put = (w, h, d, x, y, z, mat) => {
      const g = new THREE.BoxGeometry(w, h, d);
      const mtx = new THREE.Matrix4().makeRotationY(rot);
      mtx.setPosition(c.clone().add(new THREE.Vector3(x, y, z).applyAxisAngle(V(0, 1, 0), rot)));
      ms.batch(mat).add(g, mtx);
      g.dispose();
      return null;
    };
    put(22, 0.25, 16, 0, 6.6, 0, 'interiorDark');   // 二层休息厅楼板
    put(22, 4.2, 0.3, 0, 2.1, -8, 'interior');
    put(0.3, 4.2, 16, -11, 2.1, 0, 'interior');
    put(0.3, 4.2, 16, 11, 2.1, 0, 'interior');
    // 吧台 + 沙发组
    put(9, 1.1, 0.9, 0, 0.55, -2, 'wood');
    for (let k = -1; k <= 1; k++) put(2.4, 0.7, 0.9, k * 4, 1.05, 2.4, 'carpet');
    for (let k = -1; k <= 1; k++) put(6.0, 0.12, 0.55, 0, 4.0, k * 3.0, 'glowWarm');
  }
}
