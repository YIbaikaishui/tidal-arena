const fs = require('fs');
const p = 'src/scenes/arena.js';
let s = fs.readFileSync(p, 'utf8');

// 屋盖曲面：改成 2 段式曲面（缓起坡 → 屋脊 → 外檐下压），并加真正的檐口板
s = s.replace(`    const line = [
      { s: RI, y: RY },
      { s: RI + (RS - RI) * 0.45, y: lerp(RY, RRY, 0.62) },
      { s: RS, y: RRY },
      { s: RO - 8, y: lerp(RRY, ROY, 0.78) },
      { s: RO, y: ROY },
    ];`, `    const line = [
      { s: RI, y: RY },
      { s: RI + (RS - RI) * 0.5, y: lerp(RY, RRY, 0.42) },
      { s: RS, y: RRY },
      { s: RS + (RO - RS) * 0.55, y: lerp(RRY, ROY, 0.72) },
      { s: RO, y: ROY },
    ];`);

// 内檐收边：加厚成垂直檐口板（视觉上给出屋盖厚度）
s = s.replace(`    ms.geo('aluDark', sweepRing([
      { s: RI, y: RY }, { s: RI + 0.5, y: RY + 0.35 },
      { s: RI + 0.5, y: RY - 0.9 }, { s: RI, y: RY - 1.25 },
    ], { uScale: 0.2, vScale: 0.2 }));`,
`    // 内檐檐口：垂直铝板包边（厚 2.2m），让悬挑端读作实体而非纸片
    ms.geo('aluDark', sweepRing([
      { s: RI - 0.35, y: RY + 0.1 }, { s: RI + 0.15, y: RY + 0.1 },
      { s: RI + 0.15, y: RY - 2.3 }, { s: RI - 0.35, y: RY - 2.3 },
    ], { uScale: 0.12, vScale: 0.12 }));
    // 檐口下皮翻边（向外收 0.9m）
    ms.geo('roofUnder', sweepRing([
      { s: RI - 0.35, y: RY - 2.3 }, { s: RI + 1.1, y: RY - 2.3 },
      { s: RI + 1.1, y: RY - 2.75 }, { s: RI - 0.35, y: RY - 2.75 },
    ], { uScale: 0.12, vScale: 0.12 }));`);

// 桁架深度改为随悬挑长度缩放（内檐更深）
s = s.replace("        const depth = [3.6, 4.4, 4.0, 2.6, 1.6][Math.min(i, 4)];",
              "        const depth = [4.6, 4.9, 4.2, 2.7, 1.7][Math.min(i, 4)];");

// 灯桥位置随内檐走
s = s.replace(`    ms.geo('glow', sweepRing([
      { s: RI + 0.9, y: RY - 1.1 }, { s: RI + 1.5, y: RY - 1.35 },
      { s: RI + 1.5, y: RY - 1.75 }, { s: RI + 0.9, y: RY - 1.5 },
    ], { uScale: 0.2, vScale: 0.2 }));`,
`    ms.geo('glow', sweepRing([
      { s: RI + 1.2, y: RY - 2.45 }, { s: RI + 2.0, y: RY - 2.6 },
      { s: RI + 2.0, y: RY - 3.05 }, { s: RI + 1.2, y: RY - 2.9 },
    ], { uScale: 0.2, vScale: 0.2 }));`);

// 桁架支座：外端落到后墙顶（檐口上皮），不再插到 crownY
s = s.replace("ms.box('steelDark', botPts[botPts.length - 1], radialPoint(refRing(SEGS).pts[idx], OUT_S - 0.4, GEO.outerTopY), 0.9, 0.9);",
              "ms.box('steelDark', botPts[botPts.length - 1], radialPoint(refRing(SEGS).pts[idx], OUT_S - 0.4, GEO.crownY), 0.9, 0.9);");
s = s.replace("ms.box('steelDark', botPts[1], radialPoint(refRing(SEGS).pts[idx], RS, GEO.outerTopY), 0.7, 0.7);",
              "ms.box('steelDark', botPts[1], radialPoint(refRing(SEGS).pts[idx], RS, GEO.crownY), 0.7, 0.7);");

fs.writeFileSync(p, s, 'utf8');
console.log('roof geometry patched');
