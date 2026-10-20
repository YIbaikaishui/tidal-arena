const fs = require('fs');
// ── 1. 调亮夜间预设 ──
let s = fs.readFileSync('src/lib/core.js', 'utf8');
s = s.replace("    fog: '#0a1424', fogD: 0.00055, exposure: 1.16,\n    night: 1.0, flood: 1.0, stars: 1.0, interior: 1.0,\n    cloudA: '#1b2a44', cloudB: '#2b3f60', haze: 0.55,\n    interiorGlow: 1.0, floodI: 3.4,",
              "    fog: '#0a1424', fogD: 0.00050, exposure: 1.34,\n    night: 1.0, flood: 1.0, stars: 1.0, interior: 1.0,\n    cloudA: '#22304a', cloudB: '#2f4468', haze: 0.62,\n    interiorGlow: 1.0, floodI: 4.2,");
s = s.replace("    hemiSky: '#4d6490', hemiGround: '#1a1a1e', hemiI: 0.55,",
              "    hemiSky: '#5d76a4', hemiGround: '#20242a', hemiI: 0.85,");
fs.writeFileSync('src/lib/core.js', s, 'utf8');
console.log('core night', s.includes('exposure: 1.34'));

// ── 2. sky.js：环境光与泛光强度配平 ──
let k = fs.readFileSync('src/scenes/sky.js', 'utf8');
k = k.replace('      ambient.intensity = 0.05 + preset.night * 0.12;',
              '      ambient.intensity = 0.10 + preset.night * 0.22;');
k = k.replace('      for (const l of floods) l.intensity = fi * 0.30;',
              '      for (const l of floods) l.intensity = fi * 0.24;');
k = k.replace('      top.intensity = fi * 0.08;', '      top.intensity = fi * 0.14;');
fs.writeFileSync('src/scenes/sky.js', k, 'utf8');
console.log('sky ok');
