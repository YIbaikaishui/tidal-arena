const fs = require('fs');
let p = 'src/lib/sections.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace('  roofInnerS: 40.0,                  // 内檐（自由边，位于下层看台上方）\n  roofInnerY: 41.5,\n  roofRidgeS: 74.0,                  // 屋脊环（最高处）\n  roofRidgeY: 50.5,',
              '  roofInnerS: 24.0,                  // 内檐（自由边，悬挑到下层看台上方）\n  roofInnerY: 40.0,\n  roofRidgeS: 66.0,                  // 屋脊环（最高处）\n  roofRidgeY: 50.8,');
fs.writeFileSync(p, s, 'utf8');
console.log('inner s=24');
