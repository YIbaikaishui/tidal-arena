const fs = require('fs');
const s = fs.readFileSync('src/lib/modes.js', 'utf8');
const i = s.indexOf("m === 'xray'");
console.log(s.slice(i, i + 1500));
