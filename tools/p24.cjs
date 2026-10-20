const fs = require('fs');
const p = 'src/lib/modes.js';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(`  _applySection() {
    const r = this.stage.renderer;
    const s = this.section;
    if (s.on) {
      this.clipPlane.set(s.normal, s.cut);
      r.clippingPlanes = [this.clipPlane];
    } else {
      r.clippingPlanes = [];
    }
  }`,
`  _applySection() {
    const r = this.stage.renderer;
    const s = this.section;
    if (s.on) {
      this.clipPlane.set(s.normal, s.cut);
      r.clippingPlanes = [this.clipPlane];
      r.localClippingEnabled = true;
      this._setSides(THREE.DoubleSide);
    } else {
      r.clippingPlanes = [];
      this._setSides(THREE.FrontSide);
    }
  }

  /* 剖面模式下把实体材质改为双面，让切面读作实体而非空壳 */
  _setSides(side) {
    if (this._sided === side) return;
    this._sided = side;
    const seen = new Set();
    this.arena.root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (seen.has(m)) continue;
        seen.add(m);
        if (m.isShaderMaterial || m.transparent) continue;
        if (this._origSide === undefined) this._origSide = m.side;
        m.side = side;
        m.needsUpdate = true;
      }
    });
  }`);
fs.writeFileSync(p, s, 'utf8');
console.log('doubleSide section', s.includes('_setSides'));

// 剖面方向改为沿视线（z 轴），ui 里同步
let u = fs.readFileSync('src/ui.js', 'utf8');
u = u.replace(/new THREE\.Vector3\(-1, 0, 0\)/g, 'new THREE.Vector3(0, 0, -1)');
fs.writeFileSync('src/ui.js', u, 'utf8');
console.log('section normal -> z');
