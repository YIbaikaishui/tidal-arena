const fs = require('fs');
const p = 'src/scenes/arena.js';
let s = fs.readFileSync(p, 'utf8');
// 座椅底面贴地：整体下移 (SH-0.06)，使几何原点位于踏面
s = s.replace(`  const p = (x, y, z) => new THREE.Vector3(x, y, z);`,
`  const p = (x, y, z) => new THREE.Vector3(x, y, z);
  const OFF = -(SH - 0.06);   // 让座底正好落在踏面上`);
// 把所有 p(...) 的 y 加上 OFF —— 用一次性替换：把 quad 参数里的 SH 相关 y 抬高
s = s.replace(`  // 坐垫（顶面 + 前立面 + 两侧立面）
  b.quad(p(-W/2, SH, -D/2), p(W/2, SH, -D/2), p(W/2, SH, D/2), p(-W/2, SH, D/2));
  b.quad(p(-W/2, SH-0.06, D/2), p(W/2, SH-0.06, D/2), p(W/2, SH, D/2), p(-W/2, SH, D/2));
  b.quad(p(-W/2, SH-0.06, -D/2), p(-W/2, SH-0.06, D/2), p(-W/2, SH, D/2), p(-W/2, SH, -D/2));
  b.quad(p(W/2, SH-0.06, -D/2), p(W/2, SH-0.06, D/2), p(W/2, SH, D/2), p(W/2, SH, -D/2));
  b.quad(p(-W/2, SH-0.06, -D/2), p(W/2, SH-0.06, -D/2), p(W/2, SH, -D/2), p(-W/2, SH, -D/2));
  // 靠背（正面 + 顶面 + 两侧）
  const z0 = -D / 2;
  b.quad(p(-W/2, SH, z0), p(W/2, SH, z0), p(W/2, SH + BH, z0), p(-W/2, SH + BH, z0));
  b.quad(p(-W/2, SH, z0), p(-W/2, SH + BH, z0), p(-W/2, SH + BH, z0 - 0.07), p(-W/2, SH, z0 - 0.07));
  b.quad(p(W/2, SH, z0), p(W/2, SH + BH, z0), p(W/2, SH + BH, z0 - 0.07), p(W/2, SH, z0 - 0.07));
  b.quad(p(-W/2, SH + BH, z0), p(W/2, SH + BH, z0), p(W/2, SH + BH, z0 - 0.07), p(-W/2, SH + BH, z0 - 0.07));
  return b.build();`,
`  const y0 = 0, yS = SH + OFF, yT = SH + OFF + 0.06, yB = SH + BH + OFF;
  // 坐垫顶面
  b.quad(p(-W/2, yS, -D/2), p(W/2, yS, -D/2), p(W/2, yS, D/2), p(-W/2, yS, D/2));
  // 坐垫前立面
  b.quad(p(-W/2, y0, D/2), p(W/2, y0, D/2), p(W/2, yS, D/2), p(-W/2, yS, D/2));
  // 坐垫两侧立面
  b.quad(p(-W/2, y0, -D/2), p(-W/2, y0, D/2), p(-W/2, yS, D/2), p(-W/2, yS, -D/2));
  b.quad(p(W/2, y0, -D/2), p(W/2, y0, D/2), p(W/2, yS, D/2), p(W/2, yS, -D/2));
  // 座底
  b.quad(p(-W/2, y0, -D/2), p(W/2, y0, -D/2), p(W/2, y0, D/2), p(-W/2, y0, D/2));
  // 靠背
  const z0 = -D / 2;
  b.quad(p(-W/2, yS, z0), p(W/2, yS, z0), p(W/2, yB, z0), p(-W/2, yB, z0));
  b.quad(p(-W/2, yS, z0), p(-W/2, yB, z0), p(-W/2, yB, z0 - 0.07), p(-W/2, yS, z0 - 0.07));
  b.quad(p(W/2, yS, z0), p(W/2, yB, z0), p(W/2, yB, z0 - 0.07), p(W/2, yS, z0 - 0.07));
  b.quad(p(-W/2, yB, z0), p(W/2, yB, z0), p(W/2, yB, z0 - 0.07), p(-W/2, yB, z0 - 0.07));
  return b.build();`);
// 材质加自发光：夜间座椅必须可读
s = s.replace("    seat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.02, envMapIntensity: 1.25 }),",
              "    seat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.58, metalness: 0.0, envMapIntensity: 1.35, emissive: 0xffffff, emissiveIntensity: 0.16 }),");
fs.writeFileSync(p, s, 'utf8');
console.log('seat geom grounded + emissive', s.includes('let y0 = 0') || s.includes('const y0 = 0'));
