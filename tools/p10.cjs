const fs = require('fs');
const p = 'src/lib/postfx.js';
let s = fs.readFileSync(p, 'utf8');
// 暗角：从 0.92→0.18 的 smoothstep 太狠，改为温和的径向衰减
s = s.replace("      float v = smoothstep(0.92, 0.18, length(d) * 1.32);\n      col *= mix(1.0, v, vignette * 0.85);",
              "      float v = smoothstep(1.28, 0.34, length(d) * 1.02);\n      col *= mix(1.0, v, vignette * 0.52);");
// 色差再弱一点
s = s.replace("    ca: { value: 0.0011 },", "    ca: { value: 0.0007 },");
fs.writeFileSync(p, s, 'utf8');
console.log('vignette softened');
