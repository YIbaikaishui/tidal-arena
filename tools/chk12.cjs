const fs = require('fs');
const lines = fs.readFileSync('_a.js', 'utf8').split('\n');
// 逐行：用 vm 编译"单行片段"不现实，改为找 { s: ..., y } 简写模式并打印行号
lines.forEach((l, i) => {
  if (/\{\s*s:\s*[^,]+,\s*y\s*\}/.test(l)) console.log((i + 1) + ': ' + l.trim());
});
