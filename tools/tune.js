const fs=require('fs');
const p='../src/lib/sections.js';
let s=fs.readFileSync(p,'utf8');
s=s.replace(`  { id: 'L2', name: '二层看台', s0: 57.4, y0: 22.4, rows: 26, aisleEvery: 2, color: '#8fb6c4' },
  { id: 'L3', name: '三层看台', s0: 86.2, y0: 34.2, rows: 21, aisleEvery: 3, color: '#b7a0c4' },`,
`  { id: 'L2', name: '二层看台', s0: 57.4, y0: 22.4, rows: 26, aisleEvery: 2, color: '#8fb6c4' },
  { id: 'L3', name: '三层看台', s0: 86.0, y0: 35.2, rows: 21, aisleEvery: 3, color: '#b7a0c4' },`);
s=s.replace(`  { id: 'C2', name: '二层环廊', s0: 66.0, depth: 8.0, y: 23.0, h: 7.2, tier: 'L2' },
  { id: 'C3', name: '三层环廊', s0: 93.6, depth: 8.0, y: 36.0, h: 6.4, tier: 'L3' },`,
`  { id: 'C2', name: '二层环廊', s0: 66.0, depth: 8.0, y: 23.0, h: 7.0, tier: 'L2' },
  { id: 'C3', name: '三层环廊', s0: 93.0, depth: 8.0, y: 35.6, h: 6.4, tier: 'L3' },`);
s=s.replace(`  backWallS: 101.0,                   // 看台后墙（外墙内皮）
  outerS: 102.5,                      // 外立面铝板完成面
  outerHeight: 58.0,                  // 建筑高度`,
`  backWallS: 108.4,                   // 看台后墙（外墙内皮）
  outerS: 109.9,                      // 外立面铝板完成面
  outerHeight: 56.0,                  // 建筑高度`);
s=s.replace(`  roofEaveY: 50.0,
  roofOuterY: 44.0,
  roofTopY: 66.0,`, `  roofEaveY: 50.0,
  roofOuterY: 44.0,
  roofTopY: 68.0,`);
fs.writeFileSync(p,s,'utf8');
