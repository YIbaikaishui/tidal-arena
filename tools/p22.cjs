const fs = require('fs');
// 1) ui.js：切到平面/剖面/正视/左视时自动隐藏遮挡构件
let p = 'src/ui.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(`  function setView(v, byUser = true) {`,
`  const AUTO_HIDE = {
    plan: ['roof'],
    front: [],
    left: [],
    section: [],
  };
  function setView(v, byUser = true) {`);
s = s.replace(`    $$('#gridView button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
    if (byUser) orbit.enabled = key === 'persp';`,
`    $$('#gridView button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));
    if (byUser) orbit.enabled = key === 'persp';
    // 平面视图自动隐藏屋盖，否则只能看到屋面
    const hide = AUTO_HIDE[v] || [];
    const roofG = arena.groups.roof;
    if (roofG) {
      const wantRoof = hide.includes('roof') ? false : layerState.roof ? layerState.roof.on : true;
      roofG.visible = key === 'persp' ? (layerState.roof ? layerState.roof.on : true) : wantRoof;
    }`);
fs.writeFileSync(p, s, 'utf8');
console.log('ui draft hide', s.includes('AUTO_HIDE'));

// 2) 夜间更亮
let c = fs.readFileSync('src/lib/core.js', 'utf8');
c = c.replace("fog: '#0a1424', fogD: 0.00050, exposure: 1.34,", "fog: '#0b1728', fogD: 0.00046, exposure: 1.52,");
c = c.replace("hemiSky: '#5d76a4', hemiGround: '#20242a', hemiI: 0.85,", "hemiSky: '#66809f', hemiGround: '#26292e', hemiI: 1.15,");
fs.writeFileSync('src/lib/core.js', c, 'utf8');
console.log('night brightened');
