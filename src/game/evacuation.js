/* ═══════════════════════════════════════════════════════════════════════
   evacuation.js — 潮汐调度：8 万人疏散演练（SPEC 3.5 / 验收 17）
   ───────────────────────────────────────────────────────────────────────
   从"看动画"升级为"做决策"的策略玩法（v3）→ v4 再加"不同工况下最优解不同"：

     · 12 个出口（4 主券洞 + 8 次门），每个出口消耗人力（主 2 组 / 次 1 组）
     · 人力预算 10 组：全开需 16 组 → 必须取舍（位置与容量都要算）
     · 人流按"步行时间 + 排队时延"选路；出口开关有 6 秒"调配中"延迟
     · 应急广播：真的要拿走 2 组人力（在岗班组临时调岗），并削弱最堵出口的排队惩罚
     · 4 种工况（scenario）：晴好 / 暴雨 / 停电 / 夜赛后 —— 出口能力、步行速度、时限都不同
     · 失败是真实状态：时限到达即滞留
   总人数 = arena.model.total（座位模型真源，与仪表/几何同源）

   对外：window.__evac = {
     state, start, pause, reset, on, update, exits, setExit, toggleExit, broadcast,
     scenario, scenarioId, scenarioIds, scenarioLabel, scenarioBrief,
     total, evacuated, remaining, elapsed, success, score, running, paused, done,
     zones, heat, teams, teamMax, grade, peak, finishReason, limit, broadcastLeft,
     simulate(info), recomputeTotal(n)
   }
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { GEO, SEGS, EXITS } from '../world/sections.js';
import { pt } from '../world/rings.js';

const CLIQUES = 600;
const N_ZONES = 20;
const N_TIERS = 3;
const BASE_LIMIT = 110;          /* 秒：基准时限 */
const TEAMS = 10;                /* 人力预算（组）—— 全开 12 出口需 16 组 */
const BROADCAST_MAX = 3;
const BROADCAST_T = 12;          /* 广播持续秒数 */
const BROADCAST_COST = 2;        /* 广播一次要抽调在岗班组（组） */
const SWAP_DELAY = 6;            /* 出口调配延迟（秒） */
const MAIN_CAP = 230;            /* 主券洞通过能力 人/秒（v4：340 → 230，见 SCENARIOS 平衡记录） */
const SUB_CAP = 130;             /* 次门通过能力 人/秒 */
const WALK_BASE = 7, WALK_DU = 26, WALK_TIER = 7;   /* 步行时间模型 */
const WAIT_W = 0.30, QUEUE_CAP = 20;                /* 选路时的排队惩罚（封顶） */
const GRADE_S = 70, GRADE_A = 90;                   /* 评级时间阈值（秒） */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
/* 环向 u → 方向（与 arena / rings 同源：u=0 → +z） */
const dirOf = (u) => ({ x: Math.sin(u * Math.PI * 2), z: Math.cos(u * Math.PI * 2) });
/* u 环向最短距离 */
const du = (a, b) => { const d = Math.abs(a - b) % 1; return Math.min(d, 1 - d); };

/* ══════════════ 工况（v4） ══════════════
   每种工况改三件事：出口通行能力、步行速度、时限。
   于是"最优出口组合"与"该不该开广播"都会变 —— 决策才有重复游玩的价值。

   ⚠️ 平衡记录（tools/evac_sweep.mjs 实测）：
   第一版参数下 12 种出口组合的成绩**完全一样**（都是 68.8s / S）——
   原因是 4 个主券洞合计 1360 人/秒，已经超过全场最优步行吞吐，
   再开的次门根本分不到人流，等于"假选项"。
   现在把主券洞能力压到与全场吞吐同量级（MAIN_CAP），并且在极端工况里
   把主券洞的效率降下来（power 工况 mainPenalty=0.45），让"开不开次门"真的有差别。 */
export const SCENARIOS = [
  {
    id: 'calm', name: '晴好夜赛', en: 'CLEAR NIGHT', limit: 110,
    capMul: 1.0, walkMul: 1.0,
    brief: '无风无雨，出口能力正常。标准工况：先摸清 12 个出口和看台的关系。',
    accent: '#6fd3e0',
  },
  {
    id: 'rain', name: '暴雨', en: 'HEAVY RAIN', limit: 118,
    capMul: 0.86, walkMul: 1.14,
    brief: '暴雨：闸机放慢、人群走不快。需要靠"多开几个口"把吞吐摊开。',
    accent: '#8aa4c8',
  },
  {
    id: 'power', name: '停电', en: 'POWER CUT', limit: 132,
    capMul: 1.0, walkMul: 1.06,
    brief: '停电：4 个主券洞的动力闸机失效，效率只剩不到一半 —— 必须改走分散的次门。',
    accent: '#ff8a5c',
    mainPenalty: 0.45,
  },
  {
    id: 'kickoff', name: '开赛前 5 分钟', en: 'KICK-OFF RUSH', limit: 104,
    capMul: 0.94, walkMul: 0.94,
    brief: '开赛倒计时：时限只剩 104s，人群更急。冗余不多，选错一处就超时。',
    accent: '#e8c07a',
    broadcastMul: 1.5,
  },
];

const SC = (id) => SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];

/* ═══════════════════════════════════════════════════════════════════════
   纯模拟：不碰任何 3D / DOM —— 这样才能离线批量扫描平衡（tools/evac_sim.mjs）
   ═══════════════════════════════════════════════════════════════════════ */
export function createSim(info) {
  info = info || {};
  const TOTAL = info.total > 0 ? info.total : 80952;
  const sc = SC(info.scenario);
  const tierRows = info.tierRows || null;
  const rowOf = (ti, c, perZone) => {
    const rows = (tierRows && tierRows[ti]) || null;
    if (rows && rows.length) return rows[Math.min(rows.length - 1, Math.floor((c / perZone) * rows.length))] || rows[0];
    return { sFront: 18 + c * 4, y: [3, 14, 25][ti] + c * 0.8 };
  };
  const ZONE_CAP = TOTAL / (N_ZONES * N_TIERS);
  const limit = info.limit > 0 ? info.limit : (sc.limit || BASE_LIMIT);
  const capMul = sc.capMul != null ? sc.capMul : 1;
  const walkMul = sc.walkMul != null ? sc.walkMul : 1;
  const seed = (info.seed | 0) || 20261020;

  /* ── 出口 ── */
  const exits = EXITS.map((e, i) => {
    const main = e.kind === 'main';
    const seg = Math.round(e.u * SEGS) % SEGS;
    const p = pt(seg, GEO.outerS + 1.0, main ? 4.2 : 2.4);
    const base = (main ? MAIN_CAP : SUB_CAP) * (main && sc.mainPenalty ? sc.mainPenalty : 1) * capMul;
    return {
      idx: i, id: e.id, u: e.u, kind: e.kind, name: e.name,
      main, cost: main ? 2 : 1, cap: Math.max(40, Math.round(base)),
      open: false, want: false, load: 0, flow: 0, cong: 0, wait: 0,
      pos: p.clone(), seg, swapT: 0,
    };
  });
  /* 初始布局：4 个主券洞（8 组）+ 2 个次门（2 组）= 10 组，正好用满 */
  const openSeed = info.openSeed || ['P1', 'P2', 'P3', 'P4', 'S1', 'S5'];
  exits.forEach((e) => { e.open = openSeed.includes(e.id); e.want = e.open; });
  const usedTeams = () => exits.reduce((a, e) => a + (e.want ? e.cost : 0), 0);

  /* ── 人流团 ── */
  const clumps = [];
  const zw = [];
  {
    let s = seed;
    const R = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (let z = 0; z < N_ZONES; z++) zw.push(0.62 + R() * 0.9);
  }
  const zsum = zw.reduce((a, b) => a + b, 0);
  const perZone = Math.round(CLIQUES / (N_TIERS * N_ZONES));
  for (let ti = 0; ti < N_TIERS; ti++) {
    for (let z = 0; z < N_ZONES; z++) {
      const zu = (z + 0.5) / N_ZONES;
      for (let c = 0; c < perZone; c++) {
        const row = rowOf(ti, c, perZone);
        const n = Math.max(40, Math.round((TOTAL / CLIQUES) * (zw[z] * N_ZONES / zsum)));
        clumps.push({
          ti, z, u: zu, n,
          s: (row.sFront || 20) + 0.42,
          y: (row.y || 0) + 1.0,
          delay: 0.4 + c * 0.45 + z * 0.05 + ti * 1.0,
          p: 0, done: false, exit: -1, stuck: false,
          zone: ti * N_ZONES + z,
        });
      }
    }
  }
  {
    /* 配平：总人数必须与真实容量完全一致（否则永远差几个人出不去） */
    const real = clumps.reduce((a, x) => a + x.n, 0);
    const k = TOTAL / real;
    clumps.forEach((x) => { x.n = Math.max(20, Math.round(x.n * k)); });
    const diff = TOTAL - clumps.reduce((a, x) => a + x.n, 0);
    if (diff !== 0) {
      let big = clumps[0];
      for (const c of clumps) if (c.n > big.n) big = c;
      big.n = Math.max(20, big.n + diff);
    }
  }
  const walkTo = (c, e) => (WALK_BASE + WALK_DU * du(c.u, e.u) + c.ti * WALK_TIER) * walkMul;

  const st = {
    total: TOTAL, evacuated: 0, remaining: TOTAL, elapsed: 0,
    success: 0, score: 0, running: false, paused: false, done: false,
    zones: new Array(N_ZONES * N_TIERS).fill(0),
    wave: 0, peak: 0, grade: '—', teams: usedTeams(), teamMax: TEAMS,
    broadcast: BROADCAST_MAX, broadcastT: 0, limit,
    finishReason: '', swapT: 0, scenario: sc.id, scenarioLabel: sc.name,
    offDuty: 0,     /* 被广播抽调走的班组 */
  };

  function route(c, dem) {
    let best = -1, bc = Infinity;
    const wMul = 1 - (st.offDuty * 0.5);   /* 被抽调的班组 → 排队惩罚更疼 */
    for (const e of exits) {
      if (!e.open) continue;
      const wait = Math.min((dem[e.idx] || 0) / e.cap, QUEUE_CAP);
      const cost = walkTo(c, e) + wait * WAIT_W * wMul;
      if (cost < bc) { bc = cost; best = e.idx; }
    }
    if (best >= 0) c.exit = best;
    c.stuck = best < 0;
  }

  function routeAll() {
    const dem = exits.map(() => 0);
    for (const c of clumps) if (!c.done && c.exit >= 0) dem[c.exit] += c.n;
    for (const c of clumps) if (!c.done) route(c, dem);
  }

  function setExit(id, open) {
    const e = exits.find((x) => x.id === id);
    if (!e) return { ok: false, reason: 'no-exit' };
    const want = !!open;
    if (e.want === want) return { ok: true, reason: 'same' };
    const need = usedTeams() + (want ? e.cost : -e.cost);
    if (want && need > TEAMS - st.offDuty) {
      return { ok: false, reason: 'no-teams', need, have: TEAMS - st.offDuty, cost: e.cost, name: e.name };
    }
    e.want = want;
    e.swapT = SWAP_DELAY;
    routeAll();
    return { ok: true, reason: 'queued', name: e.name };
  }
  const toggleExit = (id) => {
    const e = exits.find((x) => x.id === id);
    if (!e) return { ok: false, reason: 'no-exit' };
    return setExit(id, !e.want);
  };

  function broadcast() {
    if (st.broadcast <= 0 || st.done) return { ok: false, reason: 'empty' };
    if (TEAMS - st.offDuty - usedTeams() < BROADCAST_COST && usedTeams() + BROADCAST_COST > TEAMS) {
      /* 没有可抽调的班组：先关出口腾人力 */
      return { ok: false, reason: 'no-teams', need: BROADCAST_COST };
    }
    st.broadcast -= 1;
    st.broadcastT = BROADCAST_T * (sc.broadcastMul || 1);
    st.offDuty += BROADCAST_COST;
    /* 找当前最拥堵的出口：广播把排队惩罚削掉一半（持续 broadcastT 秒） */
    let worst = null;
    for (const e of exits) if (e.open && (!worst || e.wait > worst.wait)) worst = e;
    st.broadcastTarget = worst ? worst.id : null;
    for (const e of exits) e.cong = Math.max(0, e.cong - 0.2);
    routeAll();
    return { ok: true, target: st.broadcastTarget };
  }

  function update(dt) {
    if (!st.running || st.paused || st.done) return;
    st.elapsed += dt;
    st.wave = Math.min(6, 1 + Math.floor(st.elapsed / 25));

    for (const e of exits) {
      if (e.swapT > 0) {
        e.swapT = Math.max(0, e.swapT - dt);
        if (e.swapT === 0) e.open = e.want;
      }
    }
    if (st.broadcastT > 0) {
      st.broadcastT = Math.max(0, st.broadcastT - dt);
      if (st.broadcastT === 0 && st.offDuty > 0) { st.offDuty = Math.max(0, st.offDuty - BROADCAST_COST); }
    }

    const dem = exits.map(() => 0);
    for (const c of clumps) if (!c.done && c.exit >= 0) dem[c.exit] += c.n;
    for (const c of clumps) if (!c.done) route(c, dem);
    const dem2 = exits.map(() => 0);
    for (const c of clumps) if (!c.done && c.exit >= 0) dem2[c.exit] += c.n;
    for (const e of exits) {
      e.load = dem2[e.idx] || 0;
      e.flow = 0;
      e.wait = e.open ? (e.load / Math.max(1, e.cap)) : 0;
      e.cong = clamp(e.wait / 45, 0, 1.6);
    }

    const boost = st.broadcastT > 0 ? 1.25 : 1;
    for (const c of clumps) {
      if (c.done || st.elapsed < c.delay) continue;
      if (c.exit < 0) continue;
      const e = exits[c.exit];
      const d = Math.max(1, dem2[c.exit]);
      const service = e.cap / d;
      const walking = 1 / walkTo(c, e);
      const rate = Math.min(service, walking) * boost;
      c.p = clamp(c.p + dt * rate, 0, 1);
      if (c.p >= 1) { c.done = true; e.flow += c.n; }
    }

    const flow = new Array(N_ZONES * N_TIERS).fill(0);
    let out = 0;
    for (const c of clumps) {
      if (c.done) { out += c.n; continue; }
      if (c.p > 0.02 && c.p < 1) flow[c.zone] += c.n * (1 - c.p * 0.55);
    }
    st.evacuated = out;
    st.remaining = Math.max(0, TOTAL - out);
    for (let i = 0; i < flow.length; i++) st.zones[i] = clamp(flow[i] / ZONE_CAP, 0, 1);
    const avgCong = st.zones.reduce((s, v) => s + v, 0) / st.zones.length;
    if (avgCong > st.peak) st.peak = avgCong;

    st.teams = usedTeams();
    st.success = st.remaining > 0 ? clamp(st.evacuated / TOTAL, 0, 1) : 1;
    st.score = Math.round(st.success * 100);

    if (st.remaining <= 0) finish('全部疏散');
    else if (st.elapsed >= st.limit) finish('超时滞留');
  }

  function gradeOf() {
    if (st.success < 0.85) return 'D';
    if (st.success >= 0.999 && st.elapsed <= GRADE_S) return 'S';
    if (st.success >= 0.999 && st.elapsed <= GRADE_A) return 'A';
    if (st.success >= 0.95) return 'B';
    return 'C';
  }
  function finish(reason) {
    st.done = true;
    st.running = false;
    st.finishReason = reason;
    st.success = clamp(st.evacuated / TOTAL, 0, 1);
    st.score = Math.round(st.success * 100);
    st.grade = gradeOf();
  }

  function start() {
    /* ⚠️ v3 的 bug：start() 里若上一局 done 会 reset，但 reset 不清 done/elapsed；
       v4 把"开始"定义成"从干净状态开始"：任何一次 start 都先清空"已疏散/用时"，
       但**保留玩家已经调好的出口组合**（否则玩家在开始时做的取舍会被静默抹掉）。 */
    st.evacuated = 0; st.remaining = TOTAL; st.elapsed = 0;
    st.success = 0; st.score = 0; st.done = false; st.wave = 0; st.peak = 0; st.grade = '—';
    st.broadcast = BROADCAST_MAX; st.broadcastT = 0; st.offDuty = 0;
    st.finishReason = ''; st.broadcastTarget = null;
    st.zones = new Array(N_ZONES * N_TIERS).fill(0);
    for (const c of clumps) { c.p = 0; c.done = false; c.exit = -1; c.stuck = false; }
    /* 出口：want 立即生效（起跑前调配完毕），不是排队等候 */
    for (const e of exits) { e.open = e.want; e.swapT = 0; e.load = 0; e.flow = 0; e.cong = 0; e.wait = 0; }
    st.teams = usedTeams();
    st.running = true;
    st.paused = false;
    return st;
  }
  function reset() {
    st.evacuated = 0; st.remaining = TOTAL; st.elapsed = 0;
    st.success = 0; st.score = 0; st.running = false; st.paused = false;
    st.done = false; st.wave = 0; st.peak = 0; st.grade = '—';
    st.broadcast = BROADCAST_MAX; st.broadcastT = 0; st.swapT = 0;
    st.finishReason = ''; st.offDuty = 0; st.broadcastTarget = null;
    st.zones = new Array(N_ZONES * N_TIERS).fill(0);
    for (const c of clumps) { c.p = 0; c.done = false; c.exit = -1; c.stuck = false; }
    for (const e of exits) {
      e.swapT = 0; e.load = 0; e.flow = 0; e.cong = 0; e.wait = 0;
      e.open = openSeed.includes(e.id); e.want = e.open;
    }
    st.teams = usedTeams();
    return st;
  }
  function pause() {
    if (!st.running) return st.paused;
    st.paused = !st.paused;
    return st.paused;
  }

  return {
    st, exits, clumps, scenario: sc, limit,
    update, start, pause, reset, setExit, toggleExit, broadcast, routeAll, gradeOf,
    get usedTeams() { return usedTeams(); },
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   带 3D 的运行时封装（热力团 + 12 个闸口状态牌）
   ═══════════════════════════════════════════════════════════════════════ */
export function createEvac(app) {
  const A = window.__app || app || {};
  const stage = A.stage || {};
  const scene = stage.scene;
  if (!scene) return null;

  const MODEL = A.arena && A.arena.model;
  const TOTAL = (MODEL && Number.isFinite(MODEL.total) && MODEL.total > 0) ? MODEL.total : 80952;
  const tiers = (MODEL && Array.isArray(MODEL.tiers) && MODEL.tiers.length) ? MODEL.tiers : null;
  const tierRows = tiers ? tiers.map((t) => (Array.isArray(t.rows) ? t.rows : null)) : null;

  let sim = null;
  let scenarioId = 'calm';
  const subs = new Set();
  let heatMesh = null;
  let groups = null;

  /* ── 3D：热力团（一次分配，切换工况只改尺寸） ── */
  const HEAT_MAX = CLIQUES;
  try {
    heatMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }),
      HEAT_MAX,
    );
    heatMesh.name = 'GAME_EVAC_HEAT';
    heatMesh.frustumCulled = false;
    heatMesh.visible = false;
    heatMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(heatMesh);
  } catch (e) { heatMesh = null; }

  /* ── 3D：12 个闸口状态牌 ── */
  const gateGroup = new THREE.Group();
  gateGroup.name = 'GAME_EVAC_GATES';
  scene.add(gateGroup);
  const gateGeo = new THREE.BoxGeometry(2.2, 2.2, 0.5);
  const gates = EXITS.map((e) => {
    const main = e.kind === 'main';
    const p = pt(Math.round(e.u * SEGS) % SEGS, GEO.outerS + 1.0, main ? 4.2 : 2.4);
    const m = new THREE.Mesh(gateGeo, new THREE.MeshBasicMaterial({
      color: 0x5fbf8a, transparent: true, opacity: 0.9, depthTest: false, toneMapped: false,
    }));
    m.position.copy(p);
    m.renderOrder = 880;
    gateGroup.add(m);
    return m;
  });

  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  function snap() {
    const s = sim.st;
    return {
      total: s.total, evacuated: s.evacuated, remaining: s.remaining,
      elapsed: s.elapsed, success: s.success, score: s.score,
      running: s.running, paused: s.paused, done: s.done,
      zones: s.zones.slice(), wave: s.wave, grade: s.grade,
      teams: s.teams, teamMax: s.teamMax, broadcast: s.broadcast,
      broadcastT: s.broadcastT, limit: s.limit, finishReason: s.finishReason,
      swapT: s.swapT, offDuty: s.offDuty, broadcastTarget: s.broadcastTarget,
      scenario: scenarioId, scenarioLabel: sim.scenario.name, scenarioBrief: sim.scenario.brief,
      exits: sim.exits.map((e) => ({
        id: e.id, name: e.name, kind: e.kind, open: e.open, want: e.want,
        cost: e.cost, cap: e.cap, load: e.load, cong: e.cong, wait: e.wait, flow: e.flow, swapT: e.swapT,
      })),
    };
  }
  function emit(reason) {
    const s = snap();
    for (const cb of subs) { try { cb(s, reason); } catch (e) { /* 忽略 */ } }
    try { document.dispatchEvent(new CustomEvent('evac:changed', { detail: s })); } catch (e) { /* 忽略 */ }
  }

  /* ══════════ 3D 刷新 ══════════ */
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  function applyMatrices() {
    if (!heatMesh) return;
    const clumps = sim.clumps, exits = sim.exits, st = sim.st;
    for (let i = 0; i < clumps.length; i++) {
      const c = clumps[i];
      if (c.done) {
        dummy.position.set(0, -9999, 0);
        dummy.scale.setScalar(0.0001);
      } else {
        const ex = c.exit >= 0 ? exits[c.exit] : null;
        const tgtU = ex ? ex.u : c.u;
        const swing = ease(clamp(c.p / 0.62, 0, 1));
        const u = c.u + (tgtU - c.u) * swing;
        const out = clamp((c.p - 0.62) / 0.38, 0, 1);
        const r0 = c.s + 4;
        const rE = ex ? 108 + 6 : r0 + 50;
        const r = lerp(r0, rE, ease(out));
        const d = dirOf(u);
        const y = lerp(c.y, ex ? 1.2 : 0.8, ease(clamp(c.p / 0.8, 0, 1))) - out * 0.8;
        const rad = clamp(Math.sqrt(c.n) * 0.28, 1.2, 3.6) * (1 + out * 0.35);
        dummy.position.set(d.x * r, y, d.z * r);
        dummy.scale.setScalar(rad);
      }
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      heatMesh.setMatrixAt(i, dummy.matrix);
      const cg = c.done ? 0 : (st.zones[c.zone] || 0);
      if (cg > 0.66) col.setRGB(0.89, 0.38, 0.25);
      else if (cg > 0.33) col.setRGB(0.88, 0.66, 0.29);
      else col.setRGB(0.37, 0.75, 0.54);
      heatMesh.setColorAt(i, col);
    }
    heatMesh.instanceMatrix.needsUpdate = true;
    if (heatMesh.instanceColor) heatMesh.instanceColor.needsUpdate = true;
  }
  function paintGates() {
    sim.exits.forEach((e, i) => {
      const g = gates[i];
      if (!g) return;
      const c = e.swapT > 0 ? 0xe0a94b : (e.open ? (e.wait > 35 ? 0xe2603f : e.wait > 18 ? 0xe0a94b : 0x5fbf8a) : 0x6b7785);
      g.material.color.setHex(c);
      const s = e.open ? 1 + Math.min(0.5, e.cong * 0.5) : 0.7;
      g.scale.set(s, s, 1);
      g.material.opacity = e.open ? 0.92 : 0.5;
    });
  }

  /* ══════════ 工况切换 / 开局 ══════════ */
  function build(id) {
    scenarioId = SC(id).id;
    sim = createSim({ total: TOTAL, scenario: scenarioId, tierRows });
    if (heatMesh) heatMesh.visible = false;
    applyMatrices();
    paintGates();
  }

  function finishHook() {
    const s = sim.st;
    if (heatMesh) heatMesh.visible = false;
    try {
      window.__game?.evacDone?.({ successRate: s.success, time: s.elapsed, rating: s.grade, scenario: scenarioId });
      const ok = s.success >= 0.85;
      A.ui?.toast?.(ok ? `疏散达标 · ${sim.scenario.name}` : `疏散未达标 · ${sim.scenario.name}`,
        `${Math.round(s.elapsed)}″ / ${s.limit}″ · 成功率 ${Math.round(s.success * 100)}% · 峰值拥堵 ${(s.peak * 100).toFixed(0)}% · 评级 ${s.grade}`,
        ok ? 'green' : 'red');
    } catch (e) { /* 忽略 */ }
    /* 成绩记入三表（window.__contest 由上层注入） */
    try { window.__contest?.submitEvac?.(scenarioId, { t: s.elapsed, grade: s.grade, success: s.success }); } catch (e) { /* 忽略 */ }
  }

  /* ══════════ 玩家操作（带 UI 反馈） ══════════ */
  function setExit(id, open) {
    const r = sim.setExit(id, open);
    if (!r.ok && r.reason === 'no-teams') {
      try { A.ui?.toast?.('人力不足', `开启 ${r.name} 需要 ${r.cost} 组人力，可用 ${r.need - r.cost} 组（已含广播抽调）`, 'red'); } catch (e) { /* 忽略 */ }
    }
    emit(r.ok ? 'swap' : 'budget');
    return r.ok;
  }
  const toggleExit = (id) => {
    const e = sim.exits.find((x) => x.id === id);
    if (!e) return false;
    return setExit(id, !e.want);
  };
  function broadcast() {
    const r = sim.broadcast();
    if (r.ok) {
      try { A.ui?.toast?.('应急广播', `抽调 ${BROADCAST_COST} 组班组 · 疏导最拥堵出口 ${r.target || '—'}（${Math.round(sim.st.broadcastT)} 秒）`, 'plain'); } catch (e) { /* 忽略 */ }
    } else {
      try { A.ui?.toast?.('无法广播', r.reason === 'no-teams' ? `需要 ${BROADCAST_COST} 组可抽调班组，请先关闭部分出口` : '广播次数已用完', 'red'); } catch (e) { /* 忽略 */ }
    }
    emit(r.ok ? 'broadcast' : 'budget');
    return r.ok;
  }
  function start() {
    sim.start();
    if (heatMesh) { heatMesh.visible = true; applyMatrices(); }
    emit('start');
    return snap();
  }
  function pause() { const p = sim.pause(); emit('pause'); return p; }
  function reset(id) {
    if (id && SC(id).id !== scenarioId) build(id);
    else sim.reset();
    if (heatMesh) { heatMesh.visible = false; applyMatrices(); }
    paintGates();
    emit('reset');
    return snap();
  }

  /* 只读快进：与游戏主循环**完全相同的步长**（0.1s），供离线仿真与验收使用 */
  function simulate(opts) {
    const o = opts || {};
    const s = createSim({ total: TOTAL, scenario: o.scenario || scenarioId, tierRows, limit: o.limit });
    if (typeof o.policy === 'function') o.policy(s);
    else if (Array.isArray(o.open)) s.exits.forEach((e) => { if (o.open.includes(e.id) !== e.want) s.setExit(e.id, o.open.includes(e.id)); });
    s.start();
    const step = 0.1;
    let guard = 0;
    while (!s.st.done && guard++ < 5000) {
      s.update(step);
      if (typeof o.each === 'function') o.each(s);
    }
    const t = s.st;
    return {
      scenario: s.scenario.id, done: t.done, elapsed: +t.elapsed.toFixed(1),
      success: t.success, grade: t.grade, peak: t.peak, reason: t.finishReason,
      total: t.total, evacuated: t.evacuated,
    };
  }

  const api = {
    start, pause, reset, update: null, setExit, toggleExit, broadcast, simulate,
    state: snap,
    get total() { return sim.st.total; },
    get evacuated() { return sim.st.evacuated; },
    get remaining() { return sim.st.remaining; },
    get elapsed() { return sim.st.elapsed; },
    get success() { return sim.st.success; },
    get score() { return sim.st.score; },
    get running() { return sim.st.running; },
    get paused() { return sim.st.paused; },
    get done() { return sim.st.done; },
    get zones() { return sim.st.zones; },
    get heat() { return heatMesh; },
    get exits() { return snap().exits; },
    get teams() { return sim.st.teams; },
    get teamMax() { return sim.st.teamMax; },
    get grade() { return sim.st.grade; },
    get peak() { return sim.st.peak; },
    get finishReason() { return sim.st.finishReason; },
    get limit() { return sim.st.limit; },
    get broadcastLeft() { return sim.st.broadcast; },
    get scenario() { return { id: scenarioId, ...SC(scenarioId) }; },
    get scenarioId() { return scenarioId; },
    get scenarioIds() { return SCENARIOS.map((s) => s.id); },
    get scenarioLabel() { return sim.scenario.name; },
    get scenarioBrief() { return sim.scenario.brief; },
    get scenarios() { return SCENARIOS.slice(); },
    get openSeed() { return sim.exits.filter((e) => e.want).map((e) => e.id); },
    /* 容量真源变化时重建（当前是静态的，保留接口以备扩容） */
    recomputeTotal(n) { if (n > 0 && n !== sim.st.total) { sim = createSim({ total: n, scenario: scenarioId, tierRows }); } return sim.st.total; },
    on(cb) { if (typeof cb === 'function') { subs.add(cb); return () => subs.delete(cb); } return () => {}; },
    get group() { return gateGroup; },
  };

  /* 主循环驱动（含闸口着色节流与结束钩子） */
  let wasRunning = false;
  let paintT = 0;
  api.update = (dt) => {
    const wasDone = sim.st.done;
    sim.update(dt);
    paintT += dt;
    if (paintT > 0.12) { paintT = 0; paintGates(); }
    if (sim.st.running || wasRunning) applyMatrices();
    wasRunning = sim.st.running;
    if (!wasDone && sim.st.done) finishHook();
    emit('tick');
  };

  build('calm');
  window.__evac = api;
  return api;
}

export default createEvac;
