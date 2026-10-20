const fs = require('fs');
// 座椅尺寸：略放大 + 靠背加高，让远距离也能形成排纹
let p = 'src/scenes/arena.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace("  const W = 0.46, D = 0.42;      // 座宽 / 座深\n  const SH = 0.42;               // 坐高\n  const BH = 0.46;               // 靠背高",
              "  const W = 0.50, D = 0.46;      // 座宽 / 座深（座距 0.52，留 0.02 缝）\n  const SH = 0.44;               // 坐高\n  const BH = 0.56;               // 靠背高（加高，远看形成清晰排纹）");
// 座椅材质：提高环境光响应
s = s.replace("    seat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.06, envMapIntensity: 0.6 }),",
              "    seat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.52, metalness: 0.05, envMapIntensity: 0.95 }),");
fs.writeFileSync(p, s, 'utf8');
console.log('seat size', s.includes('0.50, D = 0.46'));

// 配色：从近白灰改为饱和的深蓝/暖白（真实球场座椅色）
let t = fs.readFileSync('src/lib/seats.js', 'utf8');
t = t.replace(/const PALETTE = \[[\s\S]*?\];/, `const PALETTE = [
  ['#2f4d6e', '#375a7e', '#3f688c', '#48769a', '#527fa3'],   // L1 深蓝
  ['#dfe4ea', '#d2d9e1', '#c5cdd7', '#b8c2ce', '#abb6c4'],   // L2 暖白
  ['#7a4a5c', '#875264', '#94606c', '#a06e74', '#ac7c7c'],   // L3 酒红
];`);
fs.writeFileSync('src/lib/seats.js', t, 'utf8');
console.log('palette', t.includes('#2f4d6e'));
