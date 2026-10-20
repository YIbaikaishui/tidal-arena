const fs = require('fs');
// 1) 立面/剖面取景压缩，让建筑填满画幅
let p = 'src/lib/draft.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace("      front: [EX * 2.05, EY * 1.35],\n      left: [EZ * 2.05, EY * 1.35],\n      section: [EX * 2.05, EY * 1.35],",
              "      front: [EX * 2.02, EY * 1.02],\n      left: [EZ * 2.02, EY * 1.02],\n      section: [EX * 2.02, EY * 1.02],");
// 立面视图中心下沉，使地面线靠近画面底部
s = s.replace("this.center = new THREE.Vector3(0, EY * 0.42, 0);", "this.center = new THREE.Vector3(0, EY * 0.40, 0);");
fs.writeFileSync(p, s, 'utf8');
console.log('framing', s.includes('EY * 1.02'));

// 2) 二维视图给一个明确的背景色（避免纯黑）
let q = 'src/lib/postfx.js';
let t = fs.readFileSync(q, 'utf8');
t = t.replace("    setDraft(on) { api.draftMode = on; },",
`    setDraft(on) {
      api.draftMode = on;
      if (on) {
        if (stage.scene.background == null) stage.scene.background = new THREE.Color('#0d141c');
        stage.scene.fog = null;
      }
    },`);
fs.writeFileSync(q, t, 'utf8');
console.log('draft bg', t.includes('#0d141c'));
