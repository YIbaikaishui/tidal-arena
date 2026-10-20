/* ══════════════════════════════════════════════════════════════════════
   evac_sweep.mjs — 疏散平衡离线仿真（v4：多工况 × 出口组合扫描）
   目的：证明「工况不同 → 最优出口组合不同」，即决策不是假选项。
   用法：cd tools && node evac_sweep.mjs            # 打印矩阵
         node tools && node evac_sweep.mjs --json    # 机器可读
   说明：直接复用游戏内同一个纯模拟 createSim（不碰 3D），
        步长 0.1s 与主循环一致 —— 结果与游戏内实测完全同源。
   ══════════════════════════════════════════════════════════════════════ */
import { createSim, SCENARIOS } from '../src/game/evacuation.js';

const TOTAL = 80952;
const MAINS = ['P1', 'P2', 'P3', 'P4'];
const SUBS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];

/* 生成候选策略：4 主 + k 次（k=0..6，次门按不同展开方式取） */
function policies() {
  const out = [];
  out.push({ id: '4M', label: '仅 4 主券洞（浪费 2 组）', open: [...MAINS] });
  const spreads = {
    '2': [['S1', 'S5'], ['S3', 'S7'], ['S2', 'S6']],
    '4': [['S1', 'S3', 'S5', 'S7'], ['S2', 'S4', 'S6', 'S8']],
    '6': [['S1', 'S2', 'S3', 'S5', 'S6', 'S7'], ['S1', 'S3', 'S3', 'S5', 'S7', 'S8'].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6)],
  };
  for (const k of Object.keys(spreads)) {
    spreads[k].forEach((subs, i) => {
      if (new Set(subs).size !== subs.length) return;
      out.push({ id: `4M+${k}S#${i + 1}`, label: `4 主 + ${k} 次（${subs.join('/')}）`, open: [...MAINS, ...subs] });
    });
  }
  out.push({ id: '3M+4S', label: '3 主 + 4 次', open: ['P1', 'P2', 'P3', 'S1', 'S3', 'S5', 'S7'] });
  out.push({ id: '2M+6S', label: '2 主 + 6 次', open: ['P1', 'P2', 'S1', 'S2', 'S3', 'S5', 'S6', 'S7'] });
  out.push({ id: '8S', label: '仅 8 次门', open: [...SUBS] });
  out.push({ id: '1M+8S', label: '1 主 + 8 次（超预算）', open: ['P1', ...SUBS] });
  return out;
}

function run(scenario, open) {
  const sim = createSim({ total: TOTAL, scenario });
  /* 去掉默认布局，按策略开启（setExit 有 6s 调配延迟，起跑前就位） */
  const avail = sim.exits.map((e) => e.id).filter((id) => !open.includes(id));
  for (const id of avail) sim.setExit(id, false);
  for (const id of open) sim.setExit(id, true);
  /* 调配延迟：起跑前先快进 6s（用 update 前先把 open 落定，保持与真实开局一致） */
  sim.start();
  const t0 = sim.exits.map((e) => e.swapT);
  let guard = 0;
  while (!sim.st.done && guard++ < 6000) sim.update(0.1);
  const st = sim.st;
  return {
    t: +st.elapsed.toFixed(1), success: +(st.success * 100).toFixed(1), grade: st.grade,
    teams: sim.usedTeams, done: st.done, swapAtStart: Math.max(0, ...t0),
  };
}

const rows = [];
const pols = policies();
for (const sc of SCENARIOS) {
  const res = pols.map((p) => ({ id: p.id, label: p.label, teams: p.open.length + (p.open.filter((x) => x.startsWith('P')).length), ...run(sc.id, p.open) }));
  const valid = res.filter((r) => r.teams <= 10);
  const best = valid.filter((r) => r.done).sort((a, b) => (b.success - a.success) || (a.t - b.t))[0];
  rows.push({ scenario: sc.id, name: sc.name, limit: sc.limit, best, all: res });
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  for (const r of rows) {
    console.log(`\n══ ${r.name} (${r.scenario}) · 时限 ${r.limit}s ══`);
    for (const a of r.all) {
      const flag = a.teams > 10 ? '（超人力预算）' : '';
      console.log(`  ${a.id.padEnd(10)} ${a.label.padEnd(30)} ${String(a.t).padStart(6)}s  ${String(a.success).padStart(5)}%  ${a.grade} ${flag}`);
    }
    console.log(`  → 最优：${r.best ? r.best.label + ' · ' + r.best.t + 's · ' + r.best.grade : '无可行解'}`);
  }
  const bests = rows.map((r) => r.best && r.best.id);
  const unique = new Set(bests).size;
  console.log(`\n各工况最优策略：${bests.join(' | ')}  → 不同工况最优解 ${unique === 1 ? '相同（决策无差异）' : '不同（决策有意义）'}`);

  /* ── 可玩性门槛：每个工况都必须"有的赢、有的输"且"最优解不同" ── */
  const fails = [];
  for (const r of rows) {
    const valid = r.all.filter((a) => a.teams <= 10);
    const win = valid.filter((a) => a.done && a.success >= 99.9);
    const lose = valid.filter((a) => !(a.done && a.success >= 99.9));
    if (!win.length) fails.push(`${r.scenario}: 无可行策略能达到 100%`);
    if (!lose.length) fails.push(`${r.scenario}: 所有策略都能满分（没有失败可能）`);
    if (r.best && r.best.success < 99.9) fails.push(`${r.scenario}: 最优策略也过不了关`);
    if (r.best && r.best.t > r.limit - 5) fails.push(`${r.scenario}: 最优策略余量不足（${r.best.t}/${r.limit}s）`);
  }
  if (unique < 2) fails.push('不同工况的最优出口组合相同（决策是假选项）');
  /* 极限工况必须"必须换策略"：停电时全开主券洞必须失败 */
  const power = rows.find((r) => r.scenario === 'power');
  if (power) {
    const fourM = power.all.find((a) => a.id === '4M');
    if (fourM && fourM.success >= 99.9) fails.push('停电工况下"只开主券洞"居然也能满分（惩罚不够）');
  }
  if (fails.length) {
    console.log('\n✗ 平衡未通过：\n  ' + fails.join('\n  '));
    process.exitCode = 2;
  } else {
    console.log('\n✓ 平衡通过：每个工况都有胜负、最优组合各不相同、最优策略留有余量');
  }
}
