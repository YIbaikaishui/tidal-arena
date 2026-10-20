const fs = require('fs');
const p = 'src/ui.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace("    $('#gridView button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));",
              "    $$('#gridView button').forEach((b) => b.classList.toggle('on', b.dataset.view === v));");
s = s.replace(`    // 平面视图自动隐藏屋盖，否则只能看到屋面
    const hide = AUTO_HIDE[v] || [];
    const roofG = arena.groups.roof;
    if (roofG) {
      const wantRoof = hide.includes('roof') ? false : layerState.roof ? layerState.roof.on : true;
      roofG.visible = key === 'persp' ? (layerState.roof ? layerState.roof.on : true) : wantRoof;
    }`,
`    // 平面视图自动隐藏屋盖，否则只能看到屋面
    const hide = AUTO_HIDE[v] || [];
    const roofG = arena.groups.roof;
    if (roofG) {
      const on = lyOn('roof');
      roofG.visible = key === 'persp' ? on : (hide.includes('roof') ? false : on);
    }`);
// lyOn 辅助：安全读取图层状态（layerState 在后面才定义）
s = s.replace("  const AUTO_HIDE = {",
`  function lyOn(id) {
    const st = (typeof layerState !== 'undefined' && layerState) ? layerState[id] : null;
    return st ? st.on : true;
  }
  const AUTO_HIDE = {`);
fs.writeFileSync(p, s, 'utf8');
console.log('fixed', s.includes('function lyOn'));
