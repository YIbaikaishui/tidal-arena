const fs = require('fs');
const p = 'src/scenes/arena.js';
let s = fs.readFileSync(p, 'utf8');
const anchor = "  /* ══════════ 7. 室内空间 ══════════ */";
const add = `  /* ══════════ 6.5 场地照明实际光源（跟随灯桥的 SpotLight 组） ══════════ */
  const lamps = [];
  {
    const n = 4;
    for (let k = 0; k < n; k++) {
      const u = k / n + 0.125;
      const idx = Math.round(u * SEGS) % SEGS;
      const pos = radialPoint(refRing(SEGS).pts[idx], RI + 2.0, RY - 2.4);
      const sp = new THREE.SpotLight(0xfff4e4, 0, 340, 0.86, 0.55, 1.4);
      sp.position.copy(pos);
      sp.target.position.set(0, 0, 0);
      root.add(sp); root.add(sp.target);
      lamps.push(sp);
    }
  }

`;
s = s.replace(anchor, add + anchor);
// 返回值里带上 lamps
s = s.replace("    root, groups, ents, M, seatInst, model: MODEL,", "    root, groups, ents, M, seatInst, model: MODEL, lamps,");
fs.writeFileSync(p, s, 'utf8');
console.log('lamps added', s.includes('6.5 场地照明'));

// sky.js 里按预设驱动 lamps 强度
let k = fs.readFileSync('src/scenes/sky.js', 'utf8');
k = k.replace("  api.bindStage = (s) => { stageRef = s; };",
`  api.bindStage = (s) => { stageRef = s; };
  api.bindLamps = (arr) => { api._lamps = arr; };`);
k = k.replace("      if (stageRef) stageRef.renderer.toneMappingExposure = preset.exposure;",
`      if (api._lamps) for (const sp of api._lamps) sp.intensity = (preset.floodI || 0) * 26;
      if (stageRef) stageRef.renderer.toneMappingExposure = preset.exposure;`);
fs.writeFileSync('src/scenes/sky.js', k, 'utf8');

// app.js 里绑定
let a = fs.readFileSync('src/app.js', 'utf8');
a = a.replace("    const arena = buildArena(stage.scene, stage);",
              "    const arena = buildArena(stage.scene, stage);\n    sky.bindLamps(arena.lamps);");
fs.writeFileSync('src/app.js', a, 'utf8');
console.log('binding ok', a.includes('bindLamps'));
