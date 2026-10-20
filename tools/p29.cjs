const fs = require('fs');
const p = 'src/lib/modes.js';
let s = fs.readFileSync(p, 'utf8');
const a = s.indexOf('  _applyExplode() {');
const b = s.indexOf('  /* ── 剖切 ── */');
const block = `  _applyExplode() {
    const e = this.explode;
    for (const r of this.explodeRefs) {
      if (r.radial) {
        const sc = 1 + e * (r.amt / 900);
        r.obj.position.copy(r.base);
        r.obj.scale.set(sc, 1, sc);
        r.obj.position.y = r.base.y + e * (r.amt * 0.45);
      } else {
        r.obj.position.copy(r.base).addScaledVector(r.dir, e * r.amt);
      }
    }
    /* 分解时让外围立面/看台外壳半透明，露出内部层级 */
    const fa = this.arena.groups.facade, bo = this.arena.groups.bowl;
    const alpha = 1 - e * 0.72;
    for (const g of [fa, bo]) {
      if (!g) continue;
      g.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh || !o.material) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!m.transparent && e > 0.01) { m.transparent = true; m._wasOpaque = true; }
          m.opacity = alpha;
          m.depthWrite = e < 0.02;
          if (e < 0.02 && m._wasOpaque) { m.transparent = false; m.opacity = 1; m.depthWrite = true; m._wasOpaque = false; }
        }
      });
    }
  }

`;
s = s.slice(0, a) + block + s.slice(b);
// 每帧都应用爆炸（因为透明度需要连续更新），确认 app 是否每帧调用
fs.writeFileSync(p, s, 'utf8');
console.log('explode transparency', s.includes('露出内部层级'));
