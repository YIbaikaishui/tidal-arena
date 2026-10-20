const fs=require('fs');
const p='rings.js';
let s=fs.readFileSync(p,'utf8');
s=s.replace("      pts.push({ x, z, nx: nx / dl, nz: nz / dl, u: gi / n });",
"      if (pts.length && Math.hypot(x - pts[pts.length-1].x, z - pts[pts.length-1].z) < 1e-6) continue;\n      pts.push({ x, z, nx: nx / dl, nz: nz / dl, u: gi / n });");
fs.writeFileSync(p,s,'utf8');
