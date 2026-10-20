const fs = require('fs');
const p = 'src/lib/core.js';
let s = fs.readFileSync(p, 'utf8');
// IBL 签名里没有 sunI/hemiI，导致昼夜切换时环境贴图不重算
s = s.replace("  const sig = p.skyTop + p.skyHor + p.skyBot + p.flood.toFixed(2);",
              "  const sig = p.skyTop + p.skyHor + p.skyBot + p.flood.toFixed(2) + p.sunI.toFixed(2) + p.hemiI.toFixed(2);");
fs.writeFileSync(p, s, 'utf8');
console.log('env sig patched');

// sky.js：提高日间半球光与环境的贡献
let k = fs.readFileSync('src/scenes/sky.js', 'utf8');
k = k.replace("      hemi.intensity = preset.hemiI;", "      hemi.intensity = preset.hemiI * (preset.night > 0.5 ? 1.15 : 1.0);");
k = k.replace("      sun.intensity = preset.sunI * 0.85;", "      sun.intensity = preset.sunI * 1.15;");
fs.writeFileSync('src/scenes/sky.js', k, 'utf8');
console.log('sky patched');
