/* ═══════════════════════════════════════════════════════════════════════
   rings.js — 环带几何构建器（本项目所有实体都由它生成）  v2
   核心：看台 / 环廊楼板 / 屋盖 / 外墙 / 檐口都是"同一族圆角矩形环上、
   s-y 剖面沿环向扫掠"的实体。同一 θ 上不同 s 的点严格一一对应，
   因此各构件天然共形，不自穿插、不出现纸片。

   v2 新增：`opts.yMod(segIdx, s) => dy`
   —— 沿环向对剖面做竖向调制，用于"鞍面屋盖"（四边高、四角低）。
   uv 也随 yMod 更新，保证面板分格在曲面上不失真。
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { SEGS, HALF_Z, HALF_X, CORNER_F } from './sections.js';

/* ══════════════ 圆角矩形（按弧长切分 n 段，首尾不重复） ══════════════ */
export function roundedPerimeter(hx, hz, r, n) {
  const ix = Math.max(0.01, hx - r), iz = Math.max(0.01, hz - r);
  const arc = Math.PI / 2 * r;
  const SH = [
    { t: 'l', len: ix, p0: [0, hz], d: [1, 0] },
    { t: 'a', len: arc, cx: ix, cz: iz, a0: Math.PI / 2, sw: -Math.PI / 2 },
    { t: 'l', len: 2 * iz, p0: [hx, iz], d: [0, -1] },
    { t: 'a', len: arc, cx: ix, cz: -iz, a0: 0, sw: -Math.PI / 2 },
    { t: 'l', len: 2 * ix, p0: [ix, -hz], d: [-1, 0] },
    { t: 'a', len: arc, cx: -ix, cz: -iz, a0: -Math.PI / 2, sw: -Math.PI / 2 },
    { t: 'l', len: 2 * iz, p0: [-hx, -iz], d: [0, 1] },
    { t: 'a', len: arc, cx: -ix, cz: iz, a0: Math.PI, sw: -Math.PI / 2 },
    { t: 'l', len: ix, p0: [-ix, hz], d: [1, 0] },
  ];
  const total = SH.reduce((a, x) => a + x.len, 0);
  const raw = SH.map((x) => (x.len / total) * n);
  const cnt = raw.map((v) => Math.max(2, Math.floor(v)));
  let sum = cnt.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - cnt[i], i]).sort((a, b) => b[0] - a[0]);
  let k = 0;
  while (sum < n) { cnt[order[k % 9][1]]++; sum++; k++; }
  while (sum > n) { const i = order[8 - (k % 9)][1]; if (cnt[i] > 2) { cnt[i]--; sum--; } k++; }
  const pts = [];
  let gi = 0;
  SH.forEach((sh, si) => {
    const c = cnt[si];
    for (let i = 0; i < c; i++, gi++) {
      let x, z, tx, tz;
      if (sh.t === 'l') {
        const f = i / c;
        x = sh.p0[0] + sh.d[0] * sh.len * f;
        z = sh.p0[1] + sh.d[1] * sh.len * f;
        tx = sh.d[0]; tz = sh.d[1];
      } else {
        const a = sh.a0 + sh.sw * (i / c);
        x = sh.cx + Math.cos(a) * r; z = sh.cz + Math.sin(a) * r;
        const sg = Math.sign(sh.sw);
        tx = -Math.sin(a) * sg; tz = Math.cos(a) * sg;
      }
      let nx = tz, nz = -tx;
      if (nx * x + nz * z < 0) { nx = -nx; nz = -nz; }
      const dl = Math.hypot(nx, nz) || 1;
      pts.push({ x, z, nx: nx / dl, nz: nz / dl, u: gi / n });
    }
  });
  return { pts, total, hx, hz, r, counts: cnt };
}

/* 参考环与缓存 */
const _refCache = new Map();
export function refRing(segs = SEGS) {
  if (!_refCache.has(segs)) _refCache.set(segs, roundedPerimeter(HALF_X, HALF_Z, HALF_X * CORNER_F, segs));
  return _refCache.get(segs);
}
export function clearRingCache() { _refCache.clear(); }

/* 沿方向 (ex,ez) 求圆角矩形边界距离 */
export function boundaryT(hx, hz, r, ex, ez) {
  const ax = hx - r, az = hz - r;
  const a = Math.abs(ex), c = Math.abs(ez);
  const te = Math.min(a > 1e-9 ? ax / a : Infinity, c > 1e-9 ? az / c : Infinity);
  if (Math.abs(ex) * te <= ax + 1e-6 && Math.abs(ez) * te <= az + 1e-6) return te;
  const bq = ax * a + az * c, aq = a * a + c * c, cq = ax * ax + az * az - r * r;
  return (bq + Math.sqrt(Math.max(0, bq * bq - aq * cq))) / aq;
}

/* 径向距离：净距 s 对应的世界半径 */
export function radiusAt(s, ex, ez) {
  const hx = HALF_X + s, hz = HALF_Z + s;
  return boundaryT(hx, hz, hx * CORNER_F, ex, ez);
}
/* 第 i 方向、净距 s、标高 y 的世界坐标 */
export function pt(i, s, y, segs = SEGS) {
  const rr = refRing(segs);
  // 支持小数段号：在相邻两段之间做线性插值（含法向），保证所有调用都安全
  const f = ((i % segs) + segs) % segs;
  const i0 = Math.floor(f) % segs, i1 = (i0 + 1) % segs, fr = f - Math.floor(f);
  const a = rr.pts[i0], b2 = rr.pts[i1];
  if (!a) return new THREE.Vector3(0, y, 0);
  let nx = a.nx, nz = a.nz;
  if (fr > 1e-6 && b2) {
    nx = a.nx + (b2.nx - a.nx) * fr;
    nz = a.nz + (b2.nz - a.nz) * fr;
    const l = Math.hypot(nx, nz) || 1;
    nx /= l; nz /= l;
  }
  return radialPoint({ nx, nz }, s, y);
}
export function radialPoint(b, s, y) {
  const hx = HALF_X + s, hz = HALF_Z + s;
  const t = boundaryT(hx, hz, hx * CORNER_F, b.nx, b.nz);
  return new THREE.Vector3(b.nx * t, y, b.nz * t);
}
/* 第 i 段的单位外法向 */
export function normalAt(i, segs = SEGS) {
  const rr = refRing(segs);
  const b = rr.pts[((i % segs) + segs) % segs];
  return { nx: b.nx, nz: b.nz, u: i / segs };
}

/* ══════════════ 环带扫掠（支持沿环竖向调制 yMod） ══════════════ */
export function sweepRing(profile, opts = {}) {
  const segs = opts.segs || SEGS;
  const yMod = opts.yMod || null;
  const rr = refRing(segs);
  const n = profile.length;
  const closed = !opts.uRange;
  const pos = [], nor = [], uv = [], idx = [];
  let rows, segIndexAt;
  if (closed) { rows = segs; segIndexAt = (r) => ((r % segs) + segs) % segs; }
  else {
    const [u0, u1] = opts.uRange;
    const i0 = Math.round(u0 * segs), i1 = Math.round(u1 * segs);
    segIndexAt = (r) => (((i0 + r) % segs) + segs) % segs;
    rows = Math.max(2, i1 - i0 + 1);
  }

  /* 剖面法向（(s,y) 平面内，按多边形绕向） */
  let area = 0;
  for (let i = 0; i < n; i++) { const a = profile[i], b = profile[(i + 1) % n]; area += a.s * b.y - b.s * a.y; }
  const ccw = area > 0;
  const pn = [];
  for (let i = 0; i < n; i++) {
    const i0 = opts.open ? Math.max(0, i - 1) : (i - 1 + n) % n;
    const i1 = opts.open ? Math.min(n - 1, i + 1) : (i + 1) % n;
    const p0 = profile[i0], p1 = profile[i1];
    let ds = p1.s - p0.s, dy = p1.y - p0.y;
    const l = Math.hypot(ds, dy) || 1; ds /= l; dy /= l;
    pn.push(ccw ? [dy, -ds] : [-dy, ds]);
  }

  /* 每个剖面点的径向距离表 tTable[r][i]，以及调制后的高度表 yTable[r][i] */
  const tTable = [], yTable = [];
  for (let r = 0; r < rows; r++) {
    const si = segIndexAt(r);
    const b = rr.pts[si];
    const rowT = new Float32Array(n), rowY = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const s = profile[i].s;
      const hx = HALF_X + s, hz = HALF_Z + s;
      rowT[i] = boundaryT(hx, hz, hx * CORNER_F, b.nx, b.nz);
      rowY[i] = profile[i].y + (yMod ? yMod(si, s, i) : 0);
    }
    tTable.push(rowT); yTable.push(rowY);
  }

  const dist = [0];
  for (let i = 1; i < n; i++) dist.push(dist[i - 1] + Math.hypot(profile[i].s - profile[i - 1].s, profile[i].y - profile[i - 1].y));
  const uS = opts.uScale || 0.05, vS = opts.vScale || 0.05;
  const uvOff = opts.uvOff || [0, 0];

  for (let r = 0; r < rows; r++) {
    const b = rr.pts[segIndexAt(r)];
    for (let i = 0; i < n; i++) {
      const t = tTable[r][i];
      pos.push(b.nx * t, yTable[r][i], b.nz * t);
      nor.push(b.nx * pn[i][0], pn[i][1], b.nz * pn[i][0]);
      uv.push(uvOff[0] + (r / rows) * rr.total * uS, uvOff[1] + dist[i] * vS);
    }
  }
  const segCount = closed ? segs : rows - 1;
  for (let r = 0; r < segCount; r++) {
    const a0 = r * n, a1 = (closed ? (r + 1) % segs : r + 1) * n;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (i === n - 1 && opts.open) continue;
      if (ccw) idx.push(a0 + i, a1 + i, a0 + j, a0 + j, a1 + i, a1 + j);
      else idx.push(a0 + i, a0 + j, a1 + i, a0 + j, a1 + j, a1 + i);
    }
  }

  /* 端头封口：把剖面多边形贴到首/末段平面上（用于被截断的环带） */
  if (opts.capEnds && !closed) {
    const tris = THREE.ShapeUtils.triangulateShape(profile.map((p) => new THREE.Vector2(p.s, p.y)), []);
    for (const which of [0, rows - 1]) {
      const b = rr.pts[segIndexAt(which)];
      const start = pos.length / 3;
      for (let i = 0; i < n; i++) {
        const t = tTable[which][i];
        pos.push(b.nx * t, yTable[which][i], b.nz * t);
        nor.push(b.nx * (which === 0 ? -1 : 1), 0, b.nz * (which === 0 ? -1 : 1));
        uv.push(0, i / n);
      }
      for (const tri of tris) {
        if (which === 0) idx.push(start + tri[0], start + tri[2], start + tri[1]);
        else idx.push(start + tri[0], start + tri[1], start + tri[2]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/* 开口折线 → 有厚度板材（沿剖面法向偏移 thick；dir=-1 向下，+1 向上） */
export function plateRing(line, thick, dir = -1, opts = {}) {
  const len = line.length;
  const bot = [];
  for (let i = len - 1; i >= 0; i--) {
    const p0 = line[Math.max(0, i - 1)], p1 = line[Math.min(len - 1, i + 1)];
    let ds = p1.s - p0.s, dy = p1.y - p0.y; const l = Math.hypot(ds, dy) || 1; ds /= l; dy /= l;
    const nx = dy * dir, ny = -ds * dir;
    bot.push({ s: line[i].s + nx * thick, y: line[i].y + ny * thick });
  }
  return sweepRing(line.concat(bot), opts);
}

/* 每 step 段取一个索引（梁/柱排布用） */
export function every(step, segs = SEGS) {
  const out = [];
  for (let i = 0; i < segs; i += step) out.push(i);
  return out;
}

/* 在以 i 为中心、宽 halfU（u 单位）的窗口内取段索引，用于门洞/开口 */
export function segWindow(centerU, halfU, segs = SEGS) {
  const c = Math.round(centerU * segs), h = Math.max(1, Math.round(halfU * segs));
  return { i0: c - h, i1: c + h, u0: (c - h) / segs, u1: (c + h) / segs };
}

/* 分段（u 区间）列表，扣掉开口窗口 —— 用于带门洞的连续墙带 */
export function subtractWindows(total, windows) {
  const list = windows.map((w) => [((w.u0 % 1) + 1) % 1, ((w.u1 % 1) + 1) % 1]).sort((a, b) => a[0] - b[0]);
  const out = [];
  let cur = 0;
  for (const [a, b] of list) {
    if (b <= a) continue;
    if (a > cur) out.push([cur, a]);
    cur = Math.max(cur, b);
  }
  if (cur < 1) out.push([cur, 1]);
  return out;
}
