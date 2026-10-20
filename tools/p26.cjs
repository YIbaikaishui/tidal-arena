const fs = require('fs');
const p = 'src/lib/draft.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace("this.center = new THREE.Vector3(0, EY * 0.40, 0);", "this.center = new THREE.Vector3(0, EY * 0.30, 0);");
s = s.replace("      front: [EX * 2.02, EY * 1.02],\n      left: [EZ * 2.02, EY * 1.02],\n      section: [EX * 2.02, EY * 1.02],",
              "      front: [EX * 2.02, EY * 0.86],\n      left: [EZ * 2.02, EY * 0.86],\n      section: [EX * 2.02, EY * 0.86],");
fs.writeFileSync(p, s, 'utf8');
console.log('ok');
