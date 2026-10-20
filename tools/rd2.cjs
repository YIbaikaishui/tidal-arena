const fs = require('fs');
const s = fs.readFileSync('src/app.js', 'utf8');
const i = s.indexOf('new ModeController');
console.log(JSON.stringify(s.slice(i - 200, i + 260)));
