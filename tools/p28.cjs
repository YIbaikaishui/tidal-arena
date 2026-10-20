const fs = require('fs');
const p = 'src/app.js';
let s = fs.readFileSync(p, 'utf8');
// 让 modes 拿到 fx 引用
if (!s.includes('modes.fx =')) {
  s = s.replace(/(const modes = new ModeController\([^)]*\);)/, '$1\n  modes.fx = fx;');
}
fs.writeFileSync(p, s, 'utf8');
console.log('fx linked', s.includes('modes.fx = fx'));
