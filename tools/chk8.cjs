const fs = require('fs');
const src = fs.readFileSync('../src/scenes/arena.js', 'utf8');
// 用 acorn 风格的粗暴检测：找出会破坏解析的可疑行
const bad = [];
src.split('\n').forEach((l, i) => {
  const m = l.match(/'\s*\+\s*'|\+\s*'[^']*'\s*\+/g);
  if (m && l.includes('+') && !/\/\/|\*/.test(l.slice(0, Math.max(0,l.indexOf('+')-3)))) bad.push((i+1)+': '+l);
});
console.log('suspicious', bad.length);
console.log(bad.slice(0,20).join('\n'));
console.log('--- size', src.length, 'lines', src.split('\n').length);
