const fs = require('fs');
const p = 'src/scenes/arena.js';
let s = fs.readFileSync(p, 'utf8');
const before = s.length;
// 屋盖材质：改暗色金属，降低对泛光的响应
s = s.replace("roofMetal: std({ color: 0xb8bfc7, roughness: 0.42, metalness: 0.6, envMapIntensity: 1.0 }),",
              "roofMetal: std({ color: 0x7d858e, roughness: 0.62, metalness: 0.42, envMapIntensity: 0.55 }),");
// 桁架支撑杆：原来直接扎到檐口顶，改为落在檐口下皮 y = outerTopY
s = s.replace("ms.box('steelDark', botPts[botPts.length - 1], radialPoint(refRing(SEGS).pts[idx], OUT_S + 0.2, GEO.crownY), 0.9, 0.9);",
              "ms.box('steelDark', botPts[botPts.length - 1], radialPoint(refRing(SEGS).pts[idx], OUT_S - 0.4, GEO.outerTopY), 0.9, 0.9);");
s = s.replace("ms.box('steelDark', botPts[1], radialPoint(refRing(SEGS).pts[idx], RS, GEO.crownY), 0.7, 0.7);",
              "ms.box('steelDark', botPts[1], radialPoint(refRing(SEGS).pts[idx], RS, GEO.outerTopY), 0.7, 0.7);");
fs.writeFileSync(p, s, 'utf8');
console.log('ok', before, s.length);
