const fs = require('fs');
// 屋盖：内檐退到 s=44（下层看台顶上方），形成真正的环形雨棚
let p = 'src/lib/sections.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace("  roofInnerS: 2.6,                   // 内檐（自由边，挑出场边）\n  roofInnerY: 45.0,\n  roofRidgeS: 58.0,                  // 屋脊环（最高处）\n  roofRidgeY: 56.4,\n  roofOuterS: BACK_S + 4.2,          // 外檐\n  roofOuterY: 40.2,",
`  /* 屋盖：环形挑檐。内檐悬挑到看台上方（不遮场地），外檐落在后墙上 */
  roofInnerS: 40.0,                  // 内檐（自由边，位于下层看台上方）
  roofInnerY: 41.5,
  roofRidgeS: 74.0,                  // 屋脊环（最高处）
  roofRidgeY: 50.5,
  roofOuterS: BACK_S + 4.2,          // 外檐
  roofOuterY: 43.0,`);
fs.writeFileSync(p, s, 'utf8');
console.log('sections roof', s.includes('roofInnerS: 40.0'));
