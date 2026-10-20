const fs = require('fs');
const src = fs.readFileSync('../src/scenes/arena.js', 'utf8');
const lines = src.split('\n');
// 逐行累积，用 vm.SourceTextModule 不可用 → 用 new Function 包一层（去掉 import/export）
let lo = 2, hi = lines.length, bad = -1;
function ok(n) {
  let s = lines.slice(0, n).join('\n');
  s = s.replace(/^import[^;]*;/gm, '').replace(/^export /gm, '');
  // 补齐未闭合括号以便局部判断
  let open = 0;
  for (const ch of s) { if (ch === '{' || ch === '(' || ch === '[') open++; else if (ch === '}' || ch === ')' || ch === ']') open--; }
  s += '\n' + '}'.repeat(Math.max(0, open)) + '\n';
  try { new Function(s); return true; } catch (e) { return e.message; }
}
for (let n = 2; n <= lines.length; n++) {
  const r = ok(n);
  if (r !== true) { console.log('first failure at line', n); console.log('>>>', lines[n-1]); console.log('err', r); break; }
}
