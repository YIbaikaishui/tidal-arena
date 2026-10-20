const fs = require('fs');
const p = 'src/scenes/arena.js';
let s = fs.readFileSync(p, 'utf8');
// instanceColor 需要 sRGB→linear 已由 color.set 完成，但 Three 把它当线性用。
// 真正问题是 InstancedBufferAttribute 未标记 needsUpdate 且 colors 用的是 sRGB 值。
// 改：instanceColor 用 SRGBColorSpace 转换后的值 + 提高亮度补偿
const old = `    color.set(seatColor(s.tierIdx, s.row, s.zone, s.idx, MODEL.tiers[s.tierIdx].rows[0].perZone));
    colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;`;
const neu = `    color.setStyle(seatColor(s.tierIdx, s.row, s.zone, s.idx, MODEL.tiers[s.tierIdx].rows[0].perZone), THREE.SRGBColorSpace);
    colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;`;
if (!s.includes(old)) { console.log('anchor miss 1'); process.exit(1); }
s = s.replace(old, neu);
s = s.replace("  inst.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);",
              "  inst.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);\n  inst.instanceColor.needsUpdate = true;");
// 材质：给座椅一点自发光补偿，避免夜间死黑
s = s.replace("    seat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.52, metalness: 0.05, envMapIntensity: 0.95 }),",
              "    seat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.02, envMapIntensity: 1.25 }),");
fs.writeFileSync(p, s, 'utf8');
console.log('instanceColor fixed');
