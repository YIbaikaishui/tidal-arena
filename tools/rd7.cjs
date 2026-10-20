const fs = require('fs');
const s = fs.readFileSync('src/app.js', 'utf8');
const i = s.indexOf('function frame');
console.log(i >= 0 ? s.slice(i, i + 1800) : 'no frame fn');
const j = s.indexOf('requestAnimationFrame');
console.log('--- loop ---');
console.log(s.slice(j - 600, j + 800));
