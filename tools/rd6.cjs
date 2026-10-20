const fs = require('fs');
const s = fs.readFileSync('src/scenes/sky.js', 'utf8');
const i = s.indexOf('update(');
console.log(s.slice(i - 900, i + 1600));
