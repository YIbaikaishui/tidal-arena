const fs = require('fs');
const p = 'src/scenes/arena.js';
let s = fs.readFileSync(p, 'utf8');
const start = s.indexOf('  for (const s of seatInstances(MODEL)) {');
const end = s.indexOf('    inst.setMatrixAt(i, dummy.matrix);');
const oldBlock = s.slice(start, end);
const newBlock = `  for (const s of seatInstances(MODEL)) {
    /* u 是"沿周长归一化"的弧长比，需按弧长反解到段索引：
       refRing 各段等分（约 1.7m），故 u*SEGS 不是弧长映射。
       这里用 row.perimeter 与 refRing.total 的比例换算后再插值。 */
    const fu = (((s.u % 1) + 1) % 1) * (ring.total / rowPerimeterOf(s)) * SEGS;
    const fi = ((fu % SEGS) + SEGS) % SEGS;
    const i0 = Math.floor(fi) % SEGS, i1 = (i0 + 1) % SEGS, fr = fi - Math.floor(fi);
    const b0 = ring.pts[i0], b1 = ring.pts[i1];
    let nx = b0.nx + (b1.nx - b0.nx) * fr;
    let nz = b0.nz + (b1.nz - b0.nz) * fr;
    const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    const hx = HALF_X + s.s, hz = HALF_Z + s.s;
    const t = boundaryT(hx, hz, hx * CORNER_F, nx, nz);
    dummy.position.set(nx * t, s.y, nz * t);
    // 朝向：面向场地（外法向反向）
    dummy.rotation.set(0, Math.atan2(-nx, -nz), 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
`;
s = s.slice(0, start) + newBlock + s.slice(end);
// 加辅助：rowPerimeters 缓存
s = s.replace('function buildSeats(group, M, stage) {',
`let _rowPerim = null;
function rowPerimeterOf(s) {
  if (!_rowPerim) {
    _rowPerim = new Map();
    for (const t of MODEL.tiers) for (const r of t.rows) _rowPerim.set(t.id + ':' + r.k, r.perimeter);
  }
  return _rowPerim.get(s.tier + ':' + s.row) || 325;
}
function buildSeats(group, M, stage) {`);
fs.writeFileSync(p, s, 'utf8');
console.log('patched rows', oldBlock.split('\n').length, '->', newBlock.split('\n').length);
