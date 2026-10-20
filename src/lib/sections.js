/* ═══════════════════════════════════════════════════════════════════════
   sections.js — 剖面 / 布局真源（全项目唯一数据源）  v3
   坐标系：z 为南北（长轴，场地 105m），x 为东西（短轴，场地 68m），y 向上。
   剖面沿"到场地边界的净距 s（米）"展开：s = 0 即 105×68 场地边界。
   看台是圆角矩形环族：同一 s 对应同族圆角矩形，环环外扩、互不穿插。

   v3 剖面逻辑（三层看台 + 两道夹层）—— 容量修正为 80,952 席：
     L1 座席 1.35→15.35（28 排）｜ L1 环廊 16.25（s 38.4→51.4）｜
     L2 座席 16.25→25.75 ｜ 贵宾包厢夹层 26.65→32.70（2 层包厢，面向场地）｜
     L3 座席 33.05→41.55 ｜ L3 顶层环廊 42.45（s 100.8→108.8）｜
     潮冠檐口 47.3 ｜ 鞍面屋盖 45.4→51.8→47.5
   v3 变更：L1 前排由 s=9.6 前移至 8.8（贴近边线，视线更紧），排数 25→28；
         外轮廓仅外扩 1.6m；屋盖与立面上抬 1.5m 以保住顶层环廊 5.05m 净空。
   ═══════════════════════════════════════════════════════════════════════ */
export const PITCH = { L: 105, W: 68 };
export const HALF_Z = PITCH.L / 2;      // 52.5
export const HALF_X = PITCH.W / 2;      // 34.0
export const CORNER_F = 0.36;           // 角半径 / 短向半宽
export const SEGS = 192;                // 环向离散段（周长约 325m，段长约 1.7m）

export const TREAD = 0.80;              // 座深
export const RISER = 0.50;              // 踏步高
export const AISLE_W = 1.20;            // 纵向走道净宽
export const SEAT_PITCH = 0.52;         // 座位中心距（FIFA 建议值）
export const ZONES = 20;                // 一圈 20 个观众区（世界杯标准分区）
export const AISLE_EVERY = 4;           // 每 4 排一道横向走道

/* ── 三层看台 ── */
export const SEAT_DEFS = [
  { id: 'L1', name: '下层看台', rows: 28, s0: 8.8, y0: 1.35, color: '#c9a15f' },
  { id: 'L2', name: '中层看台', rows: 19, s0: null, y0: null, color: '#8fb6c4' },
  { id: 'L3', name: '上层看台', rows: 17, s0: null, y0: null, color: '#b7a0c4' },
];
export const CONCOURSE_DEPTH = [13.0, 11.0, 8.0];   // 一层 / 二层（含包厢） / 三层
export const CONCOURSE_DY = 0.90;                   // 楼面高出看台末排的踏面
export const TIER_GAP = [0, 0, 6.4];                // 该层起排前的竖向夹层高度（第三层留包厢带）

function rowsSpan(rows) {
  let s = 0, aisles = 0;
  for (let k = 0; k < rows; k++) if (k % AISLE_EVERY === 0 && k > 0) aisles++;
  return { span: rows * TREAD + aisles * AISLE_W, rise: rows * RISER };
}

export function buildTiers() {
  const out = [];
  let s = SEAT_DEFS[0].s0, y = SEAT_DEFS[0].y0;
  SEAT_DEFS.forEach((def, i) => {
    const rows = [];
    let ss = s, yy = y;
    for (let k = 0; k < def.rows; k++) {
      const isAisle = (k % AISLE_EVERY === 0) && k > 0;
      const sFront = ss + (isAisle ? AISLE_W : 0);
      rows.push({ tier: def.id, k, sFront, sBack: sFront + TREAD, y: yy, yBack: yy + RISER, aisle: isAisle });
      ss = sFront + TREAD; yy += RISER;
    }
    const endS = ss, endY = yy;
    const cDepth = CONCOURSE_DEPTH[i] ?? 8;
    const cY = endY + CONCOURSE_DY;
    out.push({
      id: def.id, name: def.name, color: def.color, rows, n: def.rows,
      s0: s, y0: y, endS, endY, cDepth, cY, cS0: endS, cS1: endS + cDepth,
      // 本层看台体量的底面（落在下一层环廊楼面上）
      soffitY: i === 0 ? -1.2 : (out[i - 1].cY - 0.55),
    });
    s = endS + cDepth;
    y = cY + (TIER_GAP[i + 1] ?? 0.9);
  });
  return out;
}
export const TIERS = buildTiers();

/* ── 派生总控制点 ── */
export const L1 = TIERS[0], L2 = TIERS[1], L3 = TIERS[2];
export const BACK_S = L3.cS1;                     // 看台后墙（外墙内皮）
export const BACK_Y = L3.endY;                    // 末排标高
export const C3_Y = L3.cY;                        // 三层环廊楼面
export const SUITE_BOTTOM = L2.cY;                // 包厢夹层楼面
export const SUITE_TOP = L3.y0 - 0.35;            // 包厢夹层顶（L3 起排下方）

export const GEO = {
  /* 场地周边 */
  boardS: 5.2, boardH: 1.05,
  barrierS: 6.2, barrierH: 1.18,
  apron: 6.0,

  /* 外立面（三段：基座 / 网幕 / 潮冠） */
  outerS: BACK_S + 1.2,
  outerBaseY: 17.0,                   // 基座顶
  outerMidY: 31.2,                    // 网幕上沿
  outerTopY: 43.7,                    // 檐口下沿（v3：随看台增高上抬 1.5m）
  crownY: 47.3,                       // 潮冠顶（外挑 3.2m）
  crownOut: 3.2,

  /* 屋盖：鞍面环带 */
  roofInnerS: 23.5,
  roofInnerY: 45.4,
  roofRidgeS: 64.0,
  roofRidgeY: 51.8,
  roofOuterS: BACK_S + 8.4,
  roofOuterY: 47.5,
  roofThick: 1.30,
  saddleAmp: 3.4,
  trussStep: 8,                       // 每 8 段一榀 → 24 榀

  /* 八根潮柱（4 角 + 4 边中，外倾） */
  mastS_base: BACK_S + 21.0,
  mastS_top: BACK_S + 2.4,
  mastBaseY: -1.2,

  /* 主券洞 / 次入口 */
  portalHalfU: 0.030,
  portalH: 23.0,
  portalRecess: 9.0,
  subDoorU: [0.0625, 0.1875, 0.3125, 0.4375, 0.5625, 0.6875, 0.8125, 0.9375],
  subHalfU: 0.0105,
  subH: 7.0,

  /* 贵宾包厢夹层（L2 环廊之上、L3 座席之下，面向场地） */
  suiteS: L2.cS1 - 0.2,               // 包厢前玻璃面（= L2 末排后墙）
  suiteDepth: 5.6,
  suiteLevels: [SUITE_BOTTOM + 0.35, SUITE_BOTTOM + 3.55],
  suiteH: 3.0,
  suiteWalk: 4.2,                     // 包厢后走道净宽

  /* 球门 / 大屏 */
  screenS: BACK_S - 9.0,
  screenY: 34.2,
  screenW: 26, screenH: 13,

  groundY: -1.2,
};

/* ── 门洞（弧长参数 u）与出口编号 ── */
export const PORTALS = [0.0, 0.25, 0.5, 0.75];
export const PORTAL_NAMES = ['北门 · 球迷广场', '东门 · 公交接驳', '南门 · 城市大道', '西门 · 训练场'];
export const SUB_DOORS = GEO.subDoorU;

export const EXITS = [
  ...PORTALS.map((u, i) => ({ id: 'P' + (i + 1), u, kind: 'main', name: PORTAL_NAMES[i] })),
  ...SUB_DOORS.map((u, i) => ({ id: 'S' + (i + 1), u, kind: 'sub', name: '次入口 ' + (i + 1) })),
];

/* ── 鞍面调制：segIdx → y 偏移（四边高、四角低） ── */
export function saddleAt(i, segs = SEGS) {
  const th = (i / segs) * Math.PI * 2;
  return Math.cos(4 * th) * 0.5 * GEO.saddleAmp;
}
/* 屋盖基准剖面（不含鞍面调制） —— 全项目共用 */
export function roofBaseY(s) {
  const { roofInnerS: a, roofInnerY: ya, roofRidgeS: b, roofRidgeY: yb, roofOuterS: c, roofOuterY: yc } = GEO;
  if (s <= a) return ya - (a - s) * 0.02;
  if (s <= b) return ya + (yb - ya) * Math.pow((s - a) / (b - a), 0.78);
  return yb + (yc - yb) * Math.pow((s - b) / (c - b), 1.35);
}
/* 屋盖在 (s, segIdx) 处的高度 */
export function roofY(s, i, segs = SEGS) {
  const { roofInnerS: a, roofOuterS: c } = GEO;
  const w = 0.30 + 0.70 * Math.min(1, Math.max(0, (s - a) / (c - a)));
  return roofBaseY(s) + saddleAt(i, segs) * w;
}
/* yMod 适配器：给 sweepRing 用，使任意"基准剖面"自动贴合鞍面 */
export function roofMod(dy = 0) {
  return (i, s) => roofY(s, i) - roofBaseY(s) + dy;
}
