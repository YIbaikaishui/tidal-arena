/* ══════════════════════════════════════════════════════════════════════
   evac_sim.mjs — 疏散模型离线仿真（稳定队列模型 · 调参用）
   设计要点：
     · 出口 = 服务台 μ=cap 人/秒；分流团推进速率 = min(步行速率, 该出口分到的服务速率)
     · 选路 = 就近为主（真实人群行为），队列时延只做小幅修正（有上限）
     · 分区人流不均匀（真实看台分区有大小差异）→ 出口选址有意义
     · 上层看台（三层）离场更慢 → 尾部是三层滞留
   ═══════════════════════════════════════════════════════════════════════ */
const CLIQUES = 600, N_ZONES = 20, N_TIERS = 3, TOTAL = 80952;
const TIME_LIMIT = 150;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const du = (a, b) => { const d = Math.abs(a - b) % 1; return Math.min(d, 1 - d); };

/* 确定性伪随机（保证每次仿真一致） */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function makeExits(P) {
  const mains = [0, 0.25, 0.5, 0.75];
  const subs = [0.0625, 0.1875, 0.3125, 0.4375, 0.5625, 0.6875, 0.8125, 0.9375];
  return [
    ...mains.map((u, i) => ({ id: 'P' + (i + 1), u, main: true, cost: 2, cap: P.mainCap })),
    ...subs.map((u, i) => ({ id: 'S' + (i + 1), u, main: false, cost: 1, cap: P.subCap })),
  ];
}
function makeClumps(P) {
  const c = [];
  const R = rng(20261020);
  /* 分区人数权重：真实看台分区有大有小，合计保持不变 */
  const zw = [];
  let zsum = 0;
  for (let z = 0; z < N_ZONES; z++) { const w = 0.62 + R() * 0.9; zw.push(w); zsum += w; }
  for (let ti = 0; ti < N_TIERS; ti++) {
    const perZone = Math.round(CLIQUES / (N_TIERS * N_ZONES));
    for (let z = 0; z < N_ZONES; z++) {
      const zu = (z + 0.5) / N_ZONES;
      for (let k = 0; k < perZone; k++) {
        const n = Math.max(40, Math.round(TOTAL / CLIQUES * (zw[z] * 20 / zsum)));
        c.push({
          ti, z, u: zu, n,
          delay: 0.4 + k * 0.45 + z * 0.05 + ti * 1.0,
          p: 0, done: false, exit: -1,
        });
      }
    }
  }
  const real = c.reduce((a, x) => a + x.n, 0);
  const k = TOTAL / real;
  c.forEach((x) => { x.n = Math.max(20, Math.round(x.n * k)); });
  return c;
}const walkTo = (P, c, e) => P.walkBase + P.walkDu * du(c.u, e.u) + c.ti * P.walkTier;

function run(openIds, P) {
  const exits = makeExits(P);
  const clumps = makeClumps(P);
  const TOT = clumps.reduce((a, x) => a + x.n, 0);
  const openSet = new Set(openIds);
  const cong = exits.map(() => 0);
  let t = 0, out = 0, peak = 0, outT = null;
  const dt = 0.25;
  while (t < TIME_LIMIT + 20) {
    t += dt;
    const dem = exits.map(() => 0);
    for (const c of clumps) if (!c.done && c.exit >= 0) dem[c.exit] += c.n;
    /* 选路：就近为主 + 队列时延（封顶）小幅修正 */
    for (const c of clumps) {
      if (c.done) continue;
      let best = -1, bc = Infinity;
      for (let i = 0; i < exits.length; i++) {
        const e = exits[i];
        if (!openSet.has(e.id)) continue;
        const wait = Math.min(dem[i] / e.cap, P.queueCap);
        const cost = walkTo(P, c, e) + wait * P.waitW;
        if (cost < bc) { bc = cost; best = i; }
      }
      c.exit = best;
    }
    const dem2 = exits.map(() => 0);
    for (const c of clumps) if (!c.done && c.exit >= 0) dem2[c.exit] += c.n;
    for (let i = 0; i < exits.length; i++) {
      cong[i] = openSet.has(exits[i].id) ? clamp(dem2[i] / (exits[i].cap * P.queueT), 0, 4) : 0;
    }
    const openEx = exits.filter((e) => openSet.has(e.id));
    const avgC = openEx.length ? openEx.reduce((a, e) => a + cong[exits.indexOf(e)], 0) / openEx.length : 0;
    if (avgC > peak) peak = avgC;
    for (const c of clumps) {
      if (c.done || t < c.delay || c.exit < 0) continue;
      const d = dem2[c.exit] || 1;
      const e = exits[c.exit];
      const rate = Math.min(e.cap / d, 1 / walkTo(P, c, e));
      c.p = clamp(c.p + dt * rate, 0, 1);
      if (c.p >= 1) { c.done = true; out += c.n; }
    }
    if (out >= TOT) { outT = t; break; }
  }
  const success = out / TOT;
  const grade = success < 0.85 ? 'D'
    : (success >= 0.999 && outT <= P.sT && peak <= P.sPeak) ? 'S'
      : (success >= 0.999 && outT <= P.aT) ? 'A'
        : success >= 0.95 ? 'B' : 'C';
  return { t: outT == null ? TIME_LIMIT : +outT.toFixed(1), success: +success.toFixed(3), peak: +peak.toFixed(2), grade };
}

const P = {
  mainCap: 340, subCap: 150, walkBase: 7, walkDu: 26, walkTier: 7,
  waitW: 0.30, queueCap: 20, queueT: 14,
  sT: 74, aT: 96, sPeak: 1.15,
};

const STRATS = {
  '4主+2次(推荐)': ['P1', 'P2', 'P3', 'P4', 'S1', 'S5'],
  '4主+2次(另一处)': ['P1', 'P2', 'P3', 'P4', 'S3', 'S7'],
  '4主': ['P1', 'P2', 'P3', 'P4'],
  '3主+4次': ['P1', 'P2', 'P3', 'S1', 'S3', 'S5', 'S7'],
  '2主+6次': ['P1', 'P3', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  '8次': ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
  '1主+8次': ['P1', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
};

function sweep() {
  console.log('参数', JSON.stringify(P));
  for (const [k, ids] of Object.entries(STRATS)) {
    const r = run(ids, P);
    const teams = makeExits(P).filter((e) => ids.includes(e.id)).reduce((a, e) => a + e.cost, 0);
    console.log(k.padEnd(20), '人力' + String(teams).padStart(2), JSON.stringify(r));
  }
}
sweep();
if (process.argv.includes('--sweep')) {
  console.log('\n=== 扫描 mainCap / subCap / walkDu ===');
  for (const mc of [300, 340, 380]) {
    for (const sc of [140, 170, 200]) {
      P.mainCap = mc; P.subCap = sc;
      const a = run(STRATS['4主+2次(推荐)'], P), b = run(STRATS['4主'], P), c = run(STRATS['8次'], P);
      console.log(`main=${mc} sub=${sc}  4+2 ${a.t}s/${a.grade}  4主 ${b.t}s/${b.grade}  8次 ${c.t}s/${c.grade}`);
    }
  }
}
