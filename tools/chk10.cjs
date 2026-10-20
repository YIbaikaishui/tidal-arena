const fs = require('fs');
const src = fs.readFileSync('../src/scenes/arena.js', 'utf8');
// 去掉注释块，再逐行找
const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
fs.writeFileSync('_arena_stripped.js', stripped);
const lines = stripped.split('\n');
let lo = 2, hi = lines.length;
for (let n = 2; n <= lines.length; n++) {
  let s = lines.slice(0, n).join('\n');
  s = s.replace(/^import[^;]*;/gm, '').replace(/^export /gm, '');
  let open = 0;
  for (const ch of s) { if ('{(['.includes(ch)) open++; else if ('})]'.includes(ch)) open--; }
  s += '\n' + '}'.repeat(Math.max(0, open)) + '\n';
  try { new Function(s); } catch (e) {
    const prev = lines[n-2], cur = lines[n-1];
    if (/\+|'|"/.test(cur)) { console.log('line', n, '>>>', cur.trim(), '|', e.message); break; }
  }
}
