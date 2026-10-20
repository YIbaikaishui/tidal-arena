const fs = require('fs');
const s = fs.readFileSync('src/ui.js', 'utf8');
const i = s.indexOf('function lerpPreset');
console.log(s.slice(i - 300, i + 900));
console.log('=== PRESETS keys ===');
const c = fs.readFileSync('src/lib/core.js', 'utf8');
const j = c.indexOf('export const PRESETS');
console.log(c.slice(j, j + 1200));
