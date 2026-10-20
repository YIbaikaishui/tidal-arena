const fs = require('fs');
let t = fs.readFileSync('src/lib/seats.js', 'utf8');
t = t.replace(/const PALETTE = \[[\s\S]*?\];/, `const PALETTE = [
  ['#5b86b8', '#6792c2', '#729ecc', '#7eaad6', '#8ab6e0'],   // L1 天蓝
  ['#eef0f4', '#e3e7ed', '#d8dee6', '#cdd5df', '#c2cbd8'],   // L2 暖白
  ['#c0787f', '#cb848a', '#d69096', '#e19ca2', '#eaa8ae'],   // L3 玫瑰
];`);
t = t.replace("export const ACCENT = ['#a8544a', '#c9a15f', '#8fb6c4', '#7d6b9c'];",
              "export const ACCENT = ['#e8c07a', '#f2d79a', '#6fd3e0', '#a99bd8'];");
fs.writeFileSync('src/lib/seats.js', t, 'utf8');
console.log('palette brightened');
