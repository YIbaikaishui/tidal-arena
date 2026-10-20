const HZ = 52.5, HX = 34.0;
const TREAD = 0.8, AISLE = 1.2, PITCH = 0.52;
function perim(hx, hz) { const r = hx * 0.36; return 4*(hx-r) + 4*(hz-r) + 2*Math.PI*r; }
function layout(cfg) {
  const ZONES = cfg.zones, CF = cfg.cornerF;
  let s = 9.6, y = 1.35, total = 0;
  const tiers = [];
  cfg.tiers.forEach((t, i) => {
    const rows = [];
    let ss = s, yy = y;
    for (let k = 0; k < t.rows; k++) {
      const isA = (k % t.aisle) === 0 && k > 0;
      const sf = ss + (isA ? AISLE : 0);
      rows.push({ sf, y: yy });
      ss = sf + TREAD; yy += t.riser;
    }
    let n = 0;
    for (const row of rows) {
      const p = perim(HX + row.sf + 0.4, HZ + row.sf + 0.4);
      const perZone = Math.floor((p / ZONES - AISLE) / PITCH);
      n += Math.round(perZone * ZONES * (1 - 4 / ZONES * (1 - CF)));
    }
    tiers.push({ id: 'L' + (i+1), n, s0: s, s1: ss, y0: y, y1: yy });
    total += n;
    s = ss + t.concourse; y = yy + t.dy;
  });
  return { total, tiers, endS: s, endY: y };
}
const cfg = {
  zones: 24, cornerF: 0.94,
  tiers: [
    { rows: 26, aisle: 4, riser: 0.5, concourse: 13.0, dy: 0.9 },
    { rows: 26, aisle: 4, riser: 0.5, concourse: 9.0, dy: 0.9 },
    { rows: 22, aisle: 4, riser: 0.5, concourse: 8.0, dy: 0.9 },
  ]
};
let r = layout(cfg);
console.log('total', r.total, JSON.stringify(r.tiers.map(t=>({id:t.id,n:t.n,s0:+t.s0.toFixed(1),s1:+t.s1.toFixed(1),y1:+t.y1.toFixed(1)}))), 'endS', r.endS.toFixed(1), 'endY', r.endY.toFixed(1));
