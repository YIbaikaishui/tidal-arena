const fs = require('fs');
const p = 'src/scenes/arena.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace("    tier: std({ color: 0xb0a89a, roughness: 0.82, metalness: 0.02, envMapIntensity: 0.55 }),",
              "    tier: std({ color: 0x9a958c, roughness: 0.84, metalness: 0.03, envMapIntensity: 0.46 }),");
s = s.replace("    concreteLight: std({ color: 0xd8d2c6, roughness: 0.85 }),",
              "    concreteLight: std({ color: 0xc0bcb2, roughness: 0.87, envMapIntensity: 0.5 }),");
fs.writeFileSync(p, s, 'utf8');
console.log('materials tuned', s.includes('0x9a958c'));
