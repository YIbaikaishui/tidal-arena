const fs = require('fs');
const p = 'src/lib/modes.js';
let s = fs.readFileSync(p, 'utf8');

// 1) 白模：降低 gamma/曝光 + 关闭 bloom（通过 fx 联动）
s = s.replace(`    } else if (m === 'white') {
      this._restore();
      root.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        this._saved.set(o, o.material);
        const isDS = [].concat(o.material).some((mm) => mm && mm.side === THREE.DoubleSide);
        o.material = isDS ? whiteMatDS : whiteMat;
      });
      this.stage.renderer.setClearColor(BG.white, 1);`,
`    } else if (m === 'white') {
      this._restore();
      root.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        if (o.isInstancedMesh) { o.visible = false; return; }   // 座椅在形体研究中隐去
        this._saved.set(o, o.material);
        const isDS = [].concat(o.material).some((mm) => mm && mm.side === THREE.DoubleSide);
        o.material = isDS ? whiteMatDS : whiteMat;
      });
      this._tintLight(false);
      this.stage.renderer.setClearColor(BG.white, 1);`);

// 2) X 光：跳过座椅/小构件的加色叠加，避免过曝
s = s.replace(`    } else if (m === 'xray') {
      this._restore();
      root.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        this._saved.set(o, o.material);
        o.material = this.xrayMat;
        o.renderOrder = 4;
      });
      this.stage.renderer.setClearColor(BG.xray, 1);`,
`    } else if (m === 'xray') {
      this._restore();
      root.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        if (o.isInstancedMesh) { o.visible = false; return; }   // 8 万座椅加色叠加会糊成一片
        const tri = o.geometry ? (o.geometry.index ? o.geometry.index.count / 3 : 0) : 0;
        if (tri > 40000) return;                                // 超大实体保留原材质
        this._saved.set(o, o.material);
        o.material = this.xrayMat;
        o.renderOrder = 4;
      });
      this._tintLight(false);
      this.stage.renderer.setClearColor(BG.xray, 1);`);

// 3) 恢复时把隐藏的实例网格重新打开
s = s.replace(`  _restore() {
    for (const [o, m] of this._saved) { o.material = m; o.renderOrder = 0; }
    this._saved.clear();
  }`,
`  _restore() {
    for (const [o, m] of this._saved) { o.material = m; o.renderOrder = 0; }
    this._saved.clear();
    this.arena.root.traverse((o) => { if (o.isInstancedMesh) o.visible = true; });
    this._tintLight(true);
  }

  /* 表现方式切换时的灯光/后期联动（白模与 X 光需要收敛溢出） */
  _tintLight(real) {
    const fx = this.fx;
    if (!fx) return;
    if (real) { fx.bloomEnabled = true; fx.exposureBoost = 1.0; }
    else { fx.bloomEnabled = false; fx.exposureBoost = 0.62; }
  }`);

// 4) material 分支恢复灯光
s = s.replace(`    if (m === 'material') {
      this._restore();`,
`    if (m === 'material') {
      this._restore();
      this._tintLight(true);`);
fs.writeFileSync(p, s, 'utf8');
console.log('modes patched', s.includes('_tintLight'));

// 5) postfx 支持 bloom 开关与曝光补偿
const q = 'src/lib/postfx.js';
let t = fs.readFileSync(q, 'utf8');
t = t.replace("    draftMode: false,\n    draftCam: null,",
              "    draftMode: false,\n    draftCam: null,\n    bloomEnabled: true,\n    exposureBoost: 1.0,");
t = t.replace("      compose.uniforms.exposure.value = preset.exposure;",
              "      compose.uniforms.exposure.value = preset.exposure * api.exposureBoost;");
t = t.replace("      bloom.strength = 0.18 + preset.night * 0.62;",
              "      bloom.strength = api.bloomEnabled ? 0.18 + preset.night * 0.62 : 0;");
fs.writeFileSync(q, t, 'utf8');
console.log('postfx patched', t.includes('exposureBoost'));
