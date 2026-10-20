const fs = require('fs');
const s = fs.readFileSync('src/ui.js', 'utf8');
const i = s.indexOf('function setEnv');
console.log('=== ui.setEnv ===');
console.log(s.slice(i - 200, i + 900));
