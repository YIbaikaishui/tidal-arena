const HZ = 52.5, HX = 34.0;
const TREAD = 0.8, AISLE = 1.2;
function perim(hx, hz) { const r = hx * 0.36; return 4*(hx-r) + 4*(hz-r) + 2*Math.PI*r; }
function layout(cfg) {
  const Z = cfg.zones, PITCH = cfg.pitch;
  let s = 9.6, y = 1.35, total = 0; const tiers = [];
  cfg.tiers.forEach((t, i) => {
    const rows = []; let ss = s, yy = y;
    for (let k = 0; k < t.rows; k++) {
      const isA = (k % t.aisle) === 0 && k > 0;
      const sf = ss + (isA ? AISLE : 0); rows.push({ sf }); ss = sf + TREAD; yy += t.riser;
    }
    let n = 0;
    for (const row of rows) {
      const p = perim(HX + row.sf + 0.4, HZ + row.sf + 0.4);
      n += Math.floor((p / Z - AISLE) / PITCH) * Z;
    }
    tiers.push({ n, s0: s, s1: ss, y0: y, y1: yy }); total += n;
    s = ss + t.concourse; y = yy + t.dy;
  });
  return { total, tiers, endS: s, endY: y };
}
const out = [];
for (const zones of [18,20,22,24,26]) for (const pitch of [0.5,0.52,0.54]) {
  for (let r1=18;r1<=28;r1++) for (let r2=16;r2<=28;r2++) for (let r3=14;r3<=24;r3++) {
    const cfg = { zones, pitch, tiers: [
      { rows:r1, aisle:4, riser:0.5, concourse:13.0, dy:0.9 },
      { rows:r2, aisle:4, riser:0.5, concourse:9.0, dy:0.9 },
      { rows:r3, aisle:4, riser:0.5, concourse:8.0, dy:0.9 }] };
    const res = layout(cfg);
    if (res.total >= 80000 && res.total <= 80400 && res.endS <= 110)
      out.push([res.total, zones, pitch, r1,r2,r3, +res.endS.toFixed(1), +res.endY.toFixed(1)]);
  }
}
out.sort((a,b)=>Math.abs(a[0]-80000)-Math.abs(b[0]-80000));
console.log(out.slice(0,12).map(b=>JSON.stringify(b)).join('\n'));
