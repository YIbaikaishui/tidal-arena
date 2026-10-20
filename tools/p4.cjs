const fs = require('fs');
const p = 'src/scenes/arena.js';
let s = fs.readFileSync(p, 'utf8');

// 门洞加宽（0.021 → 0.033 u，约 10.7m 宽 → 21.6m 宽的进场门廊）
s = s.replace('const doorHalf = 0.021;                  // 每个门洞半宽（u）',
              'const doorHalf = 0.032;                  // 每个门洞半宽（u），约 21m 宽的门廊');

// 在基座门洞处补"门廊内壁"（门洞两侧的实体墙垛 + 顶部过梁），避免空洞穿帮
s = s.replace("    if (cursor < 1) ms.geo('stone', sweepRing(baseProf, { uRange: [cursor, 1], capEnds: true }));",
`    if (cursor < 1) ms.geo('stone', sweepRing(baseProf, { uRange: [cursor, 1], capEnds: true }));

    // 门廊：内退 6m 的吊顶 + 侧壁 + 地面 + 发光门带
    doorU.forEach((u) => {
      const a = u - doorHalf, b = u + doorHalf;
      ms.geo('interiorDark', sweepRing([
        { s: OUT_S - 7.0, y: 9.2 }, { s: OUT_S + 0.45, y: 9.2 },
        { s: OUT_S + 0.45, y: 8.5 }, { s: OUT_S - 7.0, y: 8.5 },
      ], { uRange: [a, b], capEnds: true }));
      // 门洞两侧墙垛（厚 0.9m，从地面到过梁）
      [a, b].forEach((uu) => {
        ms.geo('stone', sweepRing([
          { s: OUT_S - 7.0, y: groundY }, { s: OUT_S + 0.5, y: groundY },
          { s: OUT_S + 0.5, y: 8.5 }, { s: OUT_S - 7.0, y: 8.5 },
        ], { uRange: [uu - 0.0055, uu + 0.0055], capEnds: true }));
      });
      // 门廊里的发光门带（8 樘玻璃门）
      for (let g = -3; g <= 3; g++) {
        const gu = u + g * (doorHalf * 0.24);
        ms.geo('glowWarm', sweepRing([
          { s: OUT_S - 3.4, y: 0.1 }, { s: OUT_S - 3.4, y: 3.9 },
          { s: OUT_S - 3.62, y: 3.9 }, { s: OUT_S - 3.62, y: 0.1 },
        ], { uRange: [gu - 0.006, gu + 0.006] }));
      }
    });`);

// 幕墙：拆成"窗带 + 实墙"两层，窗带用发光玻璃，夜里形成横向光带
s = s.replace("    ms.geo('alu', sweepRing(aluProf));",
`    ms.geo('alu', sweepRing(aluProf));
    // 3 道环形窗带（内凹 0.2m 的发光玻璃，夜间形成横向光带）
    for (let k = 0; k < 3; k++) {
      const y0 = GEO.outerBaseY + 1.4 + k * 8.4;
      const y1 = y0 + 3.4;
      ms.geo('glassDark', sweepRing([
        { s: OUT_S - 0.2, y: y0 }, { s: OUT_S + 0.15, y: y0 },
        { s: OUT_S + 0.15, y: y1 }, { s: OUT_S - 0.2, y: y1 },
      ], { uScale: 0.05, vScale: 0.05 }));
    }`);

fs.writeFileSync(p, s, 'utf8');
console.log('facade patched', s.includes('门廊：内退'), s.includes('环形窗带'));
