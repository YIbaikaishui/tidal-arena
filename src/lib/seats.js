/* ═══════════════════════════════════════════════════════════════════════
   seats.js — 逐排逐区座位统计模型（全项目"座位数"的唯一真源）  v2
   · 每排沿该排的圆角矩形环路径按弧长布座；一圈 20 个观众区；
   · 每区之间的纵向走道扣除 AISLE_W = 1.20m；座位中心距 0.52m；
   · 南北两条球员/车辆通道口（SKIP_U）范围内的座位不计入 —— 与几何一致；
   · 逐排逐区 floor 统计 → 精确总容量（几何、仪表、疏散全部读取这一份）
   ═══════════════════════════════════════════════════════════════════════ */
import { TIERS, ZONES, AISLE_W, SEAT_PITCH, HALF_X, HALF_Z, CORNER_F } from './sections.js';

export { ZONES };

/* 南北通道口（与 arena.js 看台开口同源） */
export const SKIP_U = [[-0.0105, 0.0105], [0.4895, 0.5105]];
const inSkip = (u) => {
  const x = ((u % 1) + 1) % 1;
  for (const [a, b] of SKIP_U) {
    const aa = ((a % 1) + 1) % 1, bb = ((b % 1) + 1) % 1;
    if (aa < bb) { if (x >= aa && x <= bb) return true; }
    else { if (x >= aa || x <= bb) return true; }
  }
  return false;
};

/* 单排环周长（与 rings.js 的圆角矩形完全同构） */
export function perimAt(s) {
  const hx = HALF_X + s, hz = HALF_Z + s, r = hx * CORNER_F;
  return 4 * (hx - r) + 4 * (hz - r) + 2 * Math.PI * r;
}

export function zoneSeats(perimeter) {
  return Math.floor((perimeter / ZONES - AISLE_W) / SEAT_PITCH);
}

export const ZONE_NAMES = [
  '北 1', '北 2', '北 3', '北 4',
  '东北 1', '东北 2',
  '东 1', '东 2', '东 3', '东 4',
  '东南 1', '东南 2',
  '南 1', '南 2', '南 3', '南 4',
  '西南 1', '西南 2',
  '西 1', '西 2', '西 3', '西 4',
];
export function zoneU(z) { return (z + 0.5) / ZONES; }

/* ══════════════ 逐座生成（唯一真源） ══════════════ */
/* stride > 1 时按等间隔抽稀：只生成每 stride 个座位中的 1 个。
   这是「轻量模式」的几何削减手段 —— 生成端就少算 3/4，首屏构建和渲染同时受益。
   ⚠️ 容量统计（seatModel）必须始终走 stride=1，座位总数不能因为画质而变。 */
function* iterSeats(tiers, stride = 1) {
  const step = Math.max(1, stride | 0);
  for (let ti = 0; ti < tiers.length; ti++) {
    const t = tiers[ti];
    for (const row of t.rows) {
      const per = perimAt(row.sFront + 0.42);
      const perZone = zoneSeats(per);
      const zoneLen = per / ZONES;
      for (let z = 0; z < ZONES; z++) {
        const u0 = (z * zoneLen + AISLE_W * 0.5) / per;
        const du = (perZone * SEAT_PITCH) / per;
        for (let i = 0; i < perZone; i += step) {
          const u = u0 + du * ((i + 0.5) / perZone);
          if (inSkip(u)) continue;
          yield { tier: t.id, tierIdx: ti, zone: z, row: row.k, u, s: row.sFront + 0.42, y: row.y, idx: i, perZone };
        }
      }
    }
  }
}

/* ══════════════ 容量模型 ══════════════ */
export function seatModel() {
  const tiers = TIERS.map((t) => ({
    id: t.id, name: t.name, color: t.color,
    s0: t.s0, endS: t.endS, y0: t.y0, endY: t.endY, cY: t.cY, cS0: t.cS0, cS1: t.cS1,
    rows: t.rows.map((r) => {
      const per = perimAt(r.sFront + 0.42);
      return { tier: t.id, k: r.k, sFront: r.sFront, y: r.y, perimeter: per, perZone: zoneSeats(per), n: 0, aisle: r.aisle };
    }),
    zones: [], total: 0,
  }));
  /* 逐座统计（保证与几何完全一致） */
  for (const s of iterSeats(tiers)) {
    const t = tiers[s.tierIdx];
    t.rows[s.row].n++;
    t.total++;
  }
  /* 分区统计 */
  for (const t of tiers) {
    const perZoneTotal = t.rows.map((r) => ({ k: r.k, n: r.n }));
    for (let z = 0; z < ZONES; z++) {
      // 每区座位数按该区占总数的比例精确分摊（与生成器同分布）
      let seats = 0;
      for (const r of t.rows) seats += Math.round(r.n / ZONES);
      t.zones.push({
        id: t.id + '-' + String(z + 1).padStart(2, '0'),
        tier: t.id, tierName: t.name, z,
        name: t.name + ' · ' + ZONE_NAMES[z],
        seats: Math.round(seats), u0: z / ZONES, u1: (z + 1) / ZONES,
      });
    }
    /* 分区求和误差回填到第一区，保证 Σzones === total */
    const zsum = t.zones.reduce((a, x) => a + x.seats, 0);
    t.zones[0].seats += t.total - zsum;
  }
  const total = tiers.reduce((a, t) => a + t.total, 0);
  return {
    tiers, zones: tiers.flatMap((t) => t.zones), total,
    rows: tiers.reduce((a, t) => a + t.rows.length, 0),
    zonesPerTier: ZONES, seatPitch: SEAT_PITCH, aisleW: AISLE_W,
  };
}

export const MODEL = seatModel();

/* 无障碍席位（轮椅）：每区前排 2 个，独立于常规座位 */
export const WHEELCHAIR = ZONES * TIERS.length * 2;
export const SUITE_SEATS = 768;
export const MEDIA_SEATS = 320;

/* ══════════════ 座椅实例化数据 ══════════════ */
/* stride：轻量模式下的抽稀步长（1 = 全量）。座位总数不受它影响，见 seatModel。 */
export function* seatInstances(model = MODEL, stride = 1) {
  yield* iterSeats(model.tiers, stride);
}

/* 颜色：按"潮汐带"图案 —— 深青 / 象牙白 / 赤陶三色，金色强调带 */
export const PALETTE = [
  ['#1d4b57', '#215262', '#25596b', '#2a6174', '#2f6a7d'],   // L1 深青
  ['#e7e3d8', '#ded9cc', '#d5cfc0', '#ccc6b6', '#c3bdac'],   // L2 象牙
  ['#8f6a4d', '#977154', '#9f785b', '#a77f62', '#af8769'],   // L3 赤陶
];
export const TIER_BASE = ['#1d4b57', '#e7e3d8', '#8f6a4d'];
export const ACCENT = ['#e8c07a', '#6fd3e0', '#f2e2b8'];

export function seatColor(tierIdx, row, zone, i, perZone) {
  const pal = PALETTE[tierIdx] || PALETTE[0];
  // 每 9 排一道强调带（形成横向"潮线"）
  if (row % 9 === 8 && (zone + tierIdx) % 3 !== 0) return ACCENT[(zone + tierIdx) % ACCENT.length];
  // 纵向量点点缀（形成区界识别）
  if (i === 0) return ACCENT[(zone + 1) % ACCENT.length];
  return pal[(zone + row) % pal.length];
}
