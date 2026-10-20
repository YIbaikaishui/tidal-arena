const fs = require('fs');
// 1) 徽章缩小（1.5 → 0.55），环形也缩小
let p = 'src/ui.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace("const badgeGeo = new THREE.OctahedronGeometry(1.5, 0);", "const badgeGeo = new THREE.OctahedronGeometry(0.55, 0);");
s = s.replace("const ringGeo = new THREE.TorusGeometry(2.6, 0.07, 6, 40);", "const ringGeo = new THREE.TorusGeometry(1.0, 0.045, 6, 40);");
s = s.replace("      b.obj.position.y = b.def.pos[1] + Math.sin(t * 1.4 + b.def.pos[0]) * 0.35;",
              "      b.obj.position.y = b.def.pos[1] + Math.sin(t * 1.4 + b.def.pos[0]) * 0.18;");
fs.writeFileSync(p, s, 'utf8');
console.log('badge scaled', s.includes('0.55, 0'));

// 2) 看台材质提亮 + 台阶层次
let a = fs.readFileSync('src/scenes/arena.js', 'utf8');
a = a.replace("tier: std({ color: 0xb9b3a8, roughness: 0.94, metalness: 0.02 }),",
              "tier: std({ color: 0x8e8b86, roughness: 0.92, metalness: 0.03, envMapIntensity: 0.42 }),");
a = a.replace("concreteLight: std({ color: 0xd8d2c6, roughness: 0.9 }),",
              "concreteLight: std({ color: 0xb8b4ac, roughness: 0.9, envMapIntensity: 0.45 }),");
fs.writeFileSync('src/scenes/arena.js', a, 'utf8');
console.log('tier material', a.includes('0x8e8b86'));
