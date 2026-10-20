/* ═══════════════════════════════════════════════════════════════════════
   build.js — 由剖面驱动生成的体育场实体几何
   · 看台板 / 楼板 / 墙体 / 屋盖均由 sections.js 的折线沿圆角矩形路径
     扫掠成有厚度的实体（不是纸片构件）。
   · 场地 105×68，环路径沿 z 为长轴（南北长、东西短），剖面沿 x 展开。
   TIDAL ARENA · 潮汐场
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { buildSection, SEG, END0, SIDE0, LEVEL, PITCH } from './sections.js';

const TAU = Math.PI * 2;

/* ══════════════ 圆角矩形环路径 ══════════════ */
export function makePath(L, W, r) {
  r = Math.max(0.5, Math.min(r, Math.min(L, W) * 0.86));
  const ax = L - r, az = W - r;
  const pts = [];
  const push = (x, z, corner, t) => {
    const last = pts[pts.length - 1];
    if (last && Math.abs(last.x - x) < 1e-6 && Math.abs(last.z - z) < 1e-6) return;
    pts.push({ x, z, corner: corner || null, t: t == null ? NaN : t });
  };
  const line = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 3.5));
    for (let i = 1; i <= n; i++) push(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, null);
  };
  const arc = (cx, cz, a0, a1, tag, steps) => {
    for (let i = 1; i <= steps; i++) {
      const a = a0 + (a1 - a0) * i / steps;
      push(cx + Math.cos(a) * r, cz + Math.sin(a) * r, tag, a);
    }
  };
  push(0, W);
  line(0, W, ax, W);
  arc(ax, az, Math.PI / 2, 0, 'NE', 12);
  line(ax, az, ax, -az);
  arc(ax, -az, 0, -Math.PI / 2, 'SE', 12);
  line(ax, -az, -ax, -az);
  arc(-ax, -az, -Math.PI / 2, -Math.PI, 'SW', 12);
  line(-ax, -az, -ax, az);
  arc(-ax, az, Math.PI, Math.PI * 1.5, 'NW', 12);
  line(-ax, az, 0, az);

  const cum = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length];
    let d;
    if (a.corner && !Number.isNaN(a.t)) {
      let da = (Number.isNaN(b.t) ? a.t : b.t) - a.t;
      if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU;
      d = Math.abs(da) * r;
    } else d = Math.hypot(b.x - a.x, b.z - a.z);
    cum.push(cum[i - 1] + d);
  }
  const total = cum[cum.length - 1];

  return {
    L, W, r, ax, az, pts, cum, total,
    sample(u, ring = L) {
      u = ((u % 1) + 1) % 1;
      const target = u * total;
      let lo = 0, hi = pts.length;
      while (lo < hi - 1) { const m = (lo + hi) >> 1; if (cum[m] <= target) lo = m; else hi = m; }
      const i = lo, j = (i + 1) % pts.length;
      const segLen = cum[i + 1] - cum[i] || 1e-9;
      const f = (target - cum[i]) / segLen;
      const a = pts[i], b = pts[j];
      let px, pz;
      if (a.corner && !Number.isNaN(a.t)) {
        const cx = (a.corner === 'NE' || a.corner === 'SE') ? ax : -ax;
        const cz = (a.corner === 'NE' || a.corner === 'NW') ? az : -az;
        let da = (Number.isNaN(b.t) ? a.t : b.t) - a.t;
        if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU;
        const ang = a.t + da * f;
        px = cx + Math.cos(ang) * r; pz = cz + Math.sin(ang) * r;
      } else {
        px = a.x + (b.x - a.x) * f; pz = a.z + (b.z - a.z) * f;
      }
      // 偏移环：沿该辐射方向在同一角度上求半径，保证各层严格一一对应
      if (ring !== L) {
        const ang = Math.atan2(pz, px);
        const rr = rrAt(ring, ring * (W / L), Math.cos(ang), Math.sin(ang));
        px = Math.cos(ang) * rr; pz = Math.sin(ang) * rr;
      }
      const r2 = Math.hypot(px, pz) || 1;
      return { x: px, z: pz, nx: px / r2, nz: pz / r2, u };
    },
  };
}

/* 圆角矩形（半宽 ax0、半深 az0、角半径 0.40·min）沿方向 (ex,ez) 的边界半径。
   用于把"同一角度"映射到不同内缩量的环上，保证各层几何严格一一对应。 */
function rrAt(ax0, az0, ex, ez) {
  const rc = Math.min(ax0, az0) * 0.40;
  const ilx = ax0 - rc, ilz = az0 - rc;
  const a = Math.abs(ex), c = Math.abs(ez);
  const tEdge = (a > 1e-9 && c > 1e-9) ? Math.min(ilx / a, ilz / c) : (a > 1e-9 ? ilx / a : ilz / c);
  if (a * tEdge <= ilx && c * tEdge <= ilz) return tEdge;
  const bq = ilx * a + ilz * c, aq = a * a + c * c, cq = ilx * ilx + ilz * ilz - rc * rc;
  return (bq + Math.sqrt(Math.max(0, bq * bq - aq * cq))) / aq;
}

/* ══════════════ 统一环参数 ══════════════
   环路径按剖面水平距离 x 的线性关系收缩（偏移曲线），使同一 x 处的
   看台板 / 立面 / 屋面 / 座椅保持严格共形，不出现穿插。
   南北向半宽 L = SIDE0 - (x - X0)。 */
export const X0 = 40.10;                 // 一层看台起点（剖面 x）
export const XT = 90.30;                 // 二层看台终点（剖面 x）
export const W_END = 43.40;              // 端部（东西向）内轮廓半宽 = 路径 W

/** 剖面水平距离 x → 环路径南北向半宽 L */
export function Lof(x) { return SIDE0 - (x - X0); }
export function xOfL(L) { return X0 + (SIDE0 - L); }

export const RING = {
  wRatio: W_END / SIDE0,                 // 43.4 / 56.5 = 0.768
  eaveL: Lof(31.0),                      // 屋面内檐（剖面 31 → 47.6m）
  path(L, offset = 0) {
    const r = offset ? Lof(xOfL(L) + offset) : L;
    return makePath(r, r * RING.wRatio, r * 0.26);
  },
  pathAtX(x) { return this.path(Lof(x)); },
  /** 屋面：南北两端抬起，形成"潮汐起伏"屋脊 */
  eaveY(u) { return LEVEL.eave + 1.8 * Math.pow(Math.sin(u * TAU), 2); },
};



/* ══════════════ 路径扫掠 ═══════════════════════════════════════════════
   profile: [{x: 水平距离(向内), y: 绝对标高}]（逆时针）
   opts: { segs, uScale, vScale, warp(v,u) → 附加偏移, uv(v,u,idx) }
   ══════════════════════════════════════════════════════════════════════ */
export function sweep(path, profile, opts = {}) {
  const segs = opts.segs || 240;
  const n = profile.length;
  if (n < 3) return new THREE.BufferGeometry();

  let area = 0;
  for (let i = 0; i < n; i++) { const a = profile[i], b = profile[(i + 1) % n]; area += a.x * b.y - b.x * a.y; }
  const ccw = area > 0;
  const pn = [];
  for (let i = 0; i < n; i++) {
    const p0 = profile[(i - 1 + n) % n], p1 = profile[(i + 1) % n];
    let dx = p1.x - p0.x, dy = p1.y - p0.y;
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    pn.push(ccw ? [dy, -dx] : [-dy, dx]);
  }
  const perim = [];
  let run = 0;
  for (let i = 0; i < n; i++) { perim.push(run); const a = profile[i], b = profile[(i + 1) % n]; run += Math.hypot(b.x - a.x, b.y - a.y); }

  const pos = new Float32Array((segs + 1) * n * 3);
  const nor = new Float32Array((segs + 1) * n * 3);
  const uv = new Float32Array((segs + 1) * n * 2);
  const idx = [];
  const uScale = opts.uScale || 0.02, vScale = opts.vScale || 0.05;

  const rings = [];
  for (let s = 0; s <= segs; s++) rings.push(path.sample((s / segs) % 1));

  let vi = 0;
  for (let s = 0; s <= segs; s++) {
    const p = rings[s];
    const dist = (s / segs) * path.total;
    for (let i = 0; i < n; i++) {
      const [ox, oy] = pn[i];
      const w = opts.warp ? opts.warp(profile[i], s / segs, i) : null;
      const px = p.x - p.nx * profile[i].x + (w ? w.x : 0);
      const pz = p.z - p.nz * profile[i].x + (w ? w.z : 0);
      const py = profile[i].y + (w ? w.y : 0);
      pos[vi] = px; pos[vi + 1] = py; pos[vi + 2] = pz;
      nor[vi] = p.nx * ox; nor[vi + 1] = oy; nor[vi + 2] = p.nz * ox;
      const u0 = opts.uv ? opts.uv(profile[i], s / segs, i) : null;
      uv[(vi / 3) * 2] = u0 ? u0[0] : dist * uScale;
      uv[(vi / 3) * 2 + 1] = u0 ? u0[1] : perim[i] * vScale;
      vi += 3;
    }
  }
  for (let s = 0; s < segs; s++) {
    const a0 = s * n, a1 = (s + 1) * n;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      idx.push(a0 + i, a1 + i, a0 + j);
      idx.push(a0 + j, a1 + i, a1 + j);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/* ══════════════ 剖面片段工具 ══════════════ */
/** 从折线中取连续点 [i0..i1]，加上厚度生成封闭剖面 */
export function band(pts, i0, i1, thickness, mode = 'down') {
  const top = [];
  for (let i = i0; i <= i1; i++) top.push({ x: pts[i].x, y: pts[i].y });
  const bot = [];
  for (let i = top.length - 1; i >= 0; i--) {
    const a = top[Math.min(top.length - 1, i + 1)], b = top[Math.max(0, i - 1)];
    let dx = a.x - b.x, dy = a.y - b.y;
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    let nx = dy, ny = -dx;              // 逆时针折线的右手法向（指向外/上）
    if (mode === 'down') { nx = dy; ny = -dx; }
    bot.push({ x: top[i].x + nx * thickness, y: top[i].y + ny * thickness });
  }
  return top.concat(bot);
}

/** 由两条折线（上/下）围合生成封闭剖面：用于屋面、楼板 */
export function plate(topLine, bottomLine) {
  const out = topLine.map(p => ({ x: p.x, y: p.y }));
  for (let i = bottomLine.length - 1; i >= 0; i--) out.push({ x: bottomLine[i].x, y: bottomLine[i].y });
  return out;
}

/** 折线在某个索引处的法向（逆时针折线，返回向外法向） */
export function normalAt(pts, i) {
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[Math.min(pts.length - 1, i + 1)];
  let dx = p1.x - p0.x, dy = p1.y - p0.y;
  const l = Math.hypot(dx, dy) || 1;
  return { x: dy / l, y: -dx / l };
}

/* ══════════════ 主构建 ═════════════════════════════════════════════════
   返回 { groups: {name: Object3D}, ents: [], paths: {...} }
   ══════════════════════════════════════════════════════════════════════ */
export function buildStadiumGeometry(M) {
  const S = buildSection();
  const P = S.pts;

  const OUT = S.back + 5.4;                        // 后墙外皮（剖面 x）
  const paths = {
    core: RING.path(END0, 0),
    outer: RING.path(SIDE0, 0),
  };

  const group = new THREE.Group();
  group.name = 'ARENA';
  const g = {
    tier1: new THREE.Group(), tier2: new THREE.Group(),
    circulation: new THREE.Group(), suites: new THREE.Group(),
    facade: new THREE.Group(), roof: new THREE.Group(),
    structure: new THREE.Group(), seats: new THREE.Group(),
    pitch: new THREE.Group(), ads: new THREE.Group(), screens: new THREE.Group(),
    corridors: new THREE.Group(), club: new THREE.Group(),
  };
  for (const k in g) { g[k].name = k; group.add(g[k]); }

  const SE = {};
  const addEnt = (name, mesh, parent, extra = {}) => {
    mesh.name = name;
    parent.add(mesh);
    SE[name] = Object.assign({ id: name, mesh, parent }, extra);
    return mesh;
  };

  /* ─────────── 1. 核心体（后墙以内的所有结构，一个连续实体） ─────────── */
  // 剖面从 t1 起点到后墙底部，组成一个封闭体：(END0+2.1, 0.95) → 台阶… → 后墙 → (END0+2.1, 0.95)
  {
    const startIdx = P.findIndex(p => p.k === 'tierBase');
    const endIdx = P.length - 1;    // roofSoffitBack
    // 取 startIdx..endIdx 的折线（含屋盖）作为外轮廓
    const prof = [];
    for (let i = startIdx; i < P.length - 0; i++) prof.push({ x: P[i].x, y: P[i].y });
    // 闭合：从屋盖后部下皮回到 tierBase
    const lastX = prof[prof.length - 1].x, lastY = prof[prof.length - 1].y;
    prof.push({ x: prof[prof.length - 1].x, y: LEVEL.topDeck });
    prof.push({ x: prof[prof.length - 1].x, y: LEVEL.conc2 });
    prof.push({ x: prof[prof.length - 1].x, y: LEVEL.conc1 });
    prof.push({ x: prof[prof.length - 1].x, y: 0.95 });
    const coreProf = prof;
    const geo = sweep(paths.core, coreProf, { segs: 300, uScale: 0.012, vScale: 0.12 });
    const mat = M.concreteCore;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    addEnt('core', mesh, g.structure);
  }

  /* ─────────── 2. 看台板（分两环，独立材质：座椅面） ─────────── */
  {
    // 一层看台板：t1Tread / t1Riser 连续段 + 排后走道
    const i0 = P.findIndex(p => p.k === 'tierBase');
    const i1 = P.findIndex(p => p.k === 'suiteFront');
    const prof = [];
    for (let i = i0; i <= i1; i++) prof.push({ x: P[i].x, y: P[i].y });
    for (let i = i1; i >= i0; i--) {
      // 台阶底板：向下 0.28m，但整体是箱体 ▸ 用 0.30 平板
      prof.push({ x: P[i].x + 0.0, y: P[i].y - 0.30 });
    }
    // 简化：套用 sweep 的折线→板：用 top 线 + 每条 0.30 下沉
    const geo = sweep(paths.core, prof, { segs: 320, uScale: 0.02, vScale: 0.1 });
    const mesh = new THREE.Mesh(geo, M.seatTier);
    mesh.receiveShadow = true;
    addEnt('tier1', mesh, g.tier1, { zoom: 60 });
  }
  {
    const i0 = P.findIndex(p => p.k === 'tierBase' && p.x > 60);
    const i1 = P.findIndex((p, i) => p.k === 'walk' && i > i0);
    const prof = [];
    for (let i = i0; i <= i1; i++) prof.push({ x: P[i].x, y: P[i].y });
    for (let i = i1; i >= i0; i--) prof.push({ x: P[i].x, y: P[i].y - 0.30 });
    const geo = sweep(paths.core, prof, { segs: 320, uScale: 0.02, vScale: 0.1 });
    const mesh = new THREE.Mesh(geo, M.seatTier);
    mesh.receiveShadow = true;
    addEnt('tier2', mesh, g.tier2, { zoom: 60 });
  }
  return { group, ents: SE, g, S, paths, OUT };
}