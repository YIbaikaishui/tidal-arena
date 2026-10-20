const fs = require('fs');
const p = 'src/scenes/arena.js';
let s = fs.readFileSync(p, 'utf8');
const old = `  for (const s of seatInstances(MODEL)) {
    const gi = Math.round(s.u * SEGS) % SEGS;
    const b = ring.pts[gi];
    const hx = HALF_X + s.s, hz = HALF_Z + s.s;
    const t = boundaryT(hx, hz, hx * CORNER_F, b.nx, b.nz);
    dummy.position.set(b.nx * t, s.y, b.nz * t);`;
const neu = `  for (const s of seatInstances(MODEL)) {
    // 沿弧插值：u 精确映射到两个控制段之间，避免同段座椅叠在一点
    const fu = (((s.u % 1) + 1) % 1) * SEGS;
    const i0 = Math.floor(fu) % SEGS, i1 = (i0 + 1) % SEGS, fr = fu - Math.floor(fu);
    const b0 = ring.pts[i0], b1 = ring.pts[i1];
    let nx = b0.nx + (b1.nx - b0.nx) * fr;
    let nz = b0.nz + (b1.nz - b0.nz) * fr;
    const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    const hx = HALF_X + s.s, hz = HALF_Z + s.s;
    const t = boundaryT(hx, hz, hx * CORNER_F, nx, nz);
    dummy.position.set(nx * t, s.y, nz * t);`;
if (!s.includes(old)) { console.log('ANCHOR NOT FOUND'); process.exit(1); }
s = s.replace(old, neu);
s = s.replace("    dummy.rotation.set(0, Math.atan2(-b.nx, -b.nz), 0);",
              "    dummy.rotation.set(0, Math.atan2(-nx, -nz), 0);");
fs.writeFileSync(p, s, 'utf8');
console.log('seat interpolation patched');
