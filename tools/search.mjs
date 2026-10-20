// 参数搜索：三层看台（排数、走道间隔）→ 精确 80,000 席
const HZ = 52.5, HX = 34.0, R = 0.36 * HX;
const TREAD = 0.8, AISLE = 1.2, PITCH = 0.52, ZONES = 24, CORNER_F = 0.94;
function perim(hx, hz, r) {
  const ix = hx - r, iz = hz - r;
  return 4 * ix + 4 * iz + 2 * Math.PI * r;
}
function tierRows(s0, rows, aisleEvery) {
  let s = s0, y = 0;
  const out = [];
  for (let k = 0; k < rows; k++) {
    const isA = (k % aisleEvery) === 0 && k > 0;
    const sf = s + (isA ? AISLE : 0);
    out.push(sf);
    s = sf + TREAD;
  }
  return { endS: s, fronts: out };
}
function count(s0, rows, aisleEvery) {
  const { endS, fronts } = tierRows(s0, rows, aisleEvery);
  let n = 0;
  for (const sf of fronts) {
    const s = sf + 0.4;
    const p = perim(HX + s, HZ + s, (HX + s) * R / HX);
    const perZone = Math.floor((p / ZONES - AISLE) / PITCH);
    n += Math.round(perZone * ZONES * (1 - 4 / ZONES * (1 - CORNER_F)));
  }
  return { n, endS };
}
// 尝试：L1 22 rows/aisle4, L2 26/aisle4, L3 20/aisle4
const tries = [
  [22,4],[24,4],[26,4],[28,4],[30,4],[24,3],[26,3],[28,3],[20,3],[22,3]
];
let s0 = 9.6;
for (const [r, a] of tries) { const c = count(s0, r, a); console.log(`rows=${r} aisle=${a} seats=${c.n} endS=${c.endS.toFixed(1)}`); }
