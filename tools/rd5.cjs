const fs = require('fs');
const s = fs.readFileSync('src/lib/core.js', 'utf8');
const i = s.indexOf('lerpPreset');
console.log(s.slice(i - 500, i + 1100));
console.log('=== applyEnvFromPreset ===');
const j = s.indexOf('applyEnvFromPreset');
console.log(s.slice(j - 200, j + 1500));
