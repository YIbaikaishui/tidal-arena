const fs = require('fs');
const p = 'src/scenes/arena.js';
let s = fs.readFileSync(p, 'utf8');
const a = s.indexOf('let _rowPerim = null;');
const b = s.indexOf('/* ══════════════ 室内空间 ══════════════ */');
if (a < 0 || b < 0) { console.log('anchor fail', a, b); process.exit(1); }
const block = `let _rowPerim = null;
function rowPerimeterOf(s) {
  if (!_rowPerim) {
    _rowPerim = new Map();
    for (const t of MODEL.tiers) for (const r of t.rows) _rowPerim.set(t.id + ':' + r.k, r.perimeter);
  }
  return _rowPerim.get(s.tier + ':' + s.row) || 325;
}

/* 座椅：每个看台层一个 InstancedMesh（固定材质色，保证夜间可读），
   强调色座椅单独一个 InstancedMesh —— 共 4 个 draw call 绘制 80,000 座 */
function buildSeats(group, M, stage) {
  const geo = seatGeom();
  const ring = refRing(SEGS);
  const dummy = new THREE.Object3D();
  const buckets = MODEL.tiers.map(() => []);
  const accent = [];
  let total = 0;

  for (const s of seatInstances(MODEL)) {
    const perim = rowPerimeterOf(s);
    const fu = (((s.u % 1) + 1) % 1) * (ring.total / perim) * SEGS;
    const fi = ((fu % SEGS) + SEGS) % SEGS;
    const i0 = Math.floor(fi) % SEGS, i1 = (i0 + 1) % SEGS, fr = fi - Math.floor(fi);
    const b0 = ring.pts[i0], b1 = ring.pts[i1];
    let nx = b0.nx + (b1.nx - b0.nx) * fr;
    let nz = b0.nz + (b1.nz - b0.nz) * fr;
    const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    const hx = HALF_X + s.s, hz = HALF_Z + s.s;
    const t = boundaryT(hx, hz, hx * CORNER_F, nx, nz);
    dummy.position.set(nx * t, s.y, nz * t);
    dummy.rotation.set(0, Math.atan2(-nx, -nz), 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    const mtx = dummy.matrix.clone();
    const hex = seatColor(s.tierIdx, s.row, s.zone, s.idx, MODEL.tiers[s.tierIdx].rows[0].perZone);
    const isAccent = ACCENT.includes(hex);
    if (isAccent) accent.push(mtx); else buckets[s.tierIdx].push(mtx);
    total++;
  }

  const TIER_COLORS = [0x6f9fd0, 0xe8ebf0, 0xd08f95];
  const meshes = [];
  buckets.forEach((mats, ti) => {
    if (!mats.length) return;
    const mat = M.seat.clone();
    mat.color = new THREE.Color(TIER_COLORS[ti] || 0xdddddd);
    const inst = new THREE.InstancedMesh(geo, mat, mats.length);
    inst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    for (let i = 0; i < mats.length; i++) inst.setMatrixAt(i, mats[i]);
    inst.instanceMatrix.needsUpdate = true;
    inst.name = 'seats-' + MODEL.tiers[ti].id;
    inst.computeBoundingSphere();
    group.add(inst);
    meshes.push(inst);
  });
  if (accent.length) {
    const mat = M.seat.clone();
    mat.color = new THREE.Color(0xf0cf8a);
    mat.emissive = new THREE.Color(0x3a2a10);
    const inst = new THREE.InstancedMesh(geo, mat, accent.length);
    inst.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    for (let i = 0; i < accent.length; i++) inst.setMatrixAt(i, accent[i]);
    inst.instanceMatrix.needsUpdate = true;
    inst.name = 'seats-accent';
    inst.computeBoundingSphere();
    group.add(inst);
    meshes.push(inst);
  }
  return { inst: meshes[0], total, geometry: geo, meshes };
}

`;
s = s.slice(0, a) + block + s.slice(b);
// 导入 ACCENT
s = s.replace("import { MODEL, seatInstances, seatColor, ZONE_NAMES } from '../lib/seats.js';",
              "import { MODEL, seatInstances, seatColor, ACCENT, ZONE_NAMES } from '../lib/seats.js';");
fs.writeFileSync(p, s, 'utf8');
console.log('per-tier seat meshes built');
