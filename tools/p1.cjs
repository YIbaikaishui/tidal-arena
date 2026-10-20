const fs = require('fs');
const p = 'src/scenes/sky.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace('    l.position.set(Math.cos(ang) * 150, 95, Math.sin(ang) * 150);',
              '    l.position.set(Math.cos(ang) * 78, 44, Math.sin(ang) * 78);');
s = s.replace('      for (const l of floods) l.intensity = fi * 0.55;\n      top.intensity = fi * 0.45;',
              '      for (const l of floods) l.intensity = fi * 0.30;\n      top.intensity = fi * 0.08;');
fs.writeFileSync(p, s, 'utf8');
console.log('patched', s.includes('* 78'), s.includes('* 0.30'));
