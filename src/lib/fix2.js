const fs=require('fs');
const p='rings.js';
let s=fs.readFileSync(p,'utf8');
const a=s.indexOf('export function roundedPerimeter');
const b=s.indexOf('/* 参考环');
const newFn=`export function roundedPerimeter(hx, hz, r, n) {
  // hx: x 半宽；hz: z 半长；r: 角半径。9 个 shape 首尾相连、覆盖整圈。
  const ix = Math.max(0.01, hx - r), iz = Math.max(0.01, hz - r);
  const arc = Math.PI / 2 * r;
  const SH = [
    { t: 'l', len: ix, p0: [0, hz], d: [1, 0] },
    { t: 'a', len: arc, cx: ix, cz: iz, a0: Math.PI / 2, sw: -Math.PI / 2 },
    { t: 'l', len: 2 * iz, p0: [ix, iz], d: [0, -1] },
    { t: 'a', len: arc, cx: ix, cz: -iz, a0: 0, sw: -Math.PI / 2 },
    { t: 'l', len: 2 * ix, p0: [ix, -iz], d: [-1, 0] },
    { t: 'a', len: arc, cx: -ix, cz: -iz, a0: -Math.PI / 2, sw: -Math.PI / 2 },
    { t: 'l', len: 2 * iz, p0: [-ix, -iz], d: [0, 1] },
    { t: 'a', len: arc, cx: -ix, cz: iz, a0: Math.PI, sw: -Math.PI / 2 },
    { t: 'l', len: ix, p0: [-ix, hz], d: [1, 0] },
  ];
  const total = SH.reduce((s2, x) => s2 + x.len, 0);
  const raw = SH.map((x) => (x.len / total) * n);
  const cnt = raw.map((v) => Math.max(2, Math.floor(v)));
  let sum = cnt.reduce((a2, b2) => a2 + b2, 0);
  const order = raw.map((v, i) => [v - cnt[i], i]).sort((a2, b2) => b2[0] - a2[0]);
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
        const a2 = sh.a0 + sh.sw * (i / c);
        x = sh.cx + Math.cos(a2) * r; z = sh.cz + Math.sin(a2) * r;
        const sg = Math.sign(sh.sw);
        tx = -Math.sin(a2) * sg; tz = Math.cos(a2) * sg;
      }
      let nx = tz, nz = -tx;
      if (nx * x + nz * z < 0) { nx = -nx; nz = -nz; }
      const dl = Math.hypot(nx, nz) || 1;
      pts.push({ x, z, nx: nx / dl, nz: nz / dl, u: gi / n });
    }
  });
  return { pts, total, hx, hz, r, counts: cnt };
}

`;
s = s.slice(0,a) + newFn + s.slice(b);
// refRing 参数修正：hx = HALF_X, hz = HALF_Z
s = s.replace("roundedPerimeter(HALF_Z, HALF_X, HALF_X * CORNER_F, segs)", "roundedPerimeter(HALF_X, HALF_Z, HALF_X * CORNER_F, segs)");
// pt() 中 L/W 语义修正
s = s.replace(`  const L = HALF_Z + s, W = HALF_X + s;
  const t = boundaryT(L, W, W * CORNER_F, b.nx, b.nz);`, `  const hx = HALF_X + s, hz = HALF_Z + s;
  const t = boundaryT(hx, hz, hx * CORNER_F, b.nx, b.nz);`);
s = s.replace(`      const L = HALF_Z + profile[i].s, W = HALF_X + profile[i].s;
      const t = boundaryT(L, W, W * CORNER_F, b.nx, b.nz);`, `      const hx = HALF_X + profile[i].s, hz = HALF_Z + profile[i].s;
      const t = boundaryT(hx, hz, hx * CORNER_F, b.nx, b.nz);`);
// boundaryT 参数名改为 hx/hz
s = s.replace(`export function boundaryT(L, W, r, ex, ez) {
  const ax = L - r, az = W - r;`, `export function boundaryT(hx, hz, r, ex, ez) {
  const ax = hx - r, az = hz - r;`);
fs.writeFileSync(p,s,'utf8');
console.log('rewritten');
