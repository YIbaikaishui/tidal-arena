const fs = require('fs');
const p = 'src/scenes/arena.js';
let s = fs.readFileSync(p, 'utf8');
// 每层座椅：以自身颜色做自发光（在阴影下仍可读）
s = s.replace(`    const mat = M.seat.clone();
    mat.color = new THREE.Color(TIER_COLORS[ti] || 0xdddddd);`,
`    const mat = M.seat.clone();
    mat.color = new THREE.Color(TIER_COLORS[ti] || 0xdddddd);
    mat.emissive = mat.color.clone().multiplyScalar(0.42);   // 阴影下自发光补偿
    mat.emissiveIntensity = 1.0;`);
s = s.replace(`    mat.color = new THREE.Color(0xf0cf8a);
    mat.emissive = new THREE.Color(0x3a2a10);`,
`    mat.color = new THREE.Color(0xf0cf8a);
    mat.emissive = new THREE.Color(0xf0cf8a).multiplyScalar(0.5);`);
// 基准座椅材质去掉白色自发光（会冲淡颜色）
s = s.replace("    seat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.58, metalness: 0.0, envMapIntensity: 1.35, emissive: 0xffffff, emissiveIntensity: 0.16 }),",
              "    seat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.58, metalness: 0.0, envMapIntensity: 1.1 }),");
fs.writeFileSync(p, s, 'utf8');
console.log('seat emissive', s.includes('multiplyScalar(0.42)'));
