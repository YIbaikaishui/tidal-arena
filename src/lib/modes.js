/* ═══════════════════════════════════════════════════════════════════════
   modes.js — 表达模式：材质 / 白模 / X-ray / 分层爆炸 / 剖切 / 图层
   · 三态切换"零残留"：只记录 & 还原材质引用（不共享可变材质，不写 opacity）
   · 爆炸 0–100 为真实分层装配：
       屋盖 ↑ / 桁架 ↑ / 立面 径向外扩↑ / 环廊 ↑ / 看台 ↑ / 座椅 径向↑ / 场地 ↓
     缓动 + 只剩"外壳半透明"（独立克隆的 ghost 材质，归零彻底复原）
   · 剖切：renderer.clippingPlanes + 双面 + **stencil 剖面填充**（切面读作实体）
   · setLayer(id, visible, solo) 支持孤立
   对外契约（SPEC 3.6）：setMode / setExplode / setSection(bool, vec3, cut)
   / setLayer / update(dt)；新增 setHighlight(obj|null)（供后期描边）、setQuality 透传
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { clamp, easeInOut, lerp } from './core.js';

/* ══════════════ X-ray 材质 ══════════════ */
const xrayVert = /* glsl */`
varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  #ifdef USE_INSTANCING
    mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  #endif
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  vW = (modelMatrix * vec4(position,1.0)).xyz;
  gl_Position = projectionMatrix * mv;
}`;
const xrayFrag = /* glsl */`
uniform vec3 base; uniform vec3 rim; uniform float opacity; uniform float scan;
varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  f = pow(clamp(f, 0.0, 1.0), 1.9);
  /* 横向扫描带：让 X 光有"读数"感而非纯玻璃 */
  float band = smoothstep(0.90, 1.0, sin(vW.y * 2.6 - scan * 3.0) * 0.5 + 0.5);
  vec3 c = mix(base, rim, f) + rim * band * 0.30;
  gl_FragColor = vec4(c, (0.045 + f * 0.80 + band * 0.05) * opacity);
}`;

const WHITE_A = new THREE.MeshStandardMaterial({
  color: 0xf3f2ee, roughness: 0.90, metalness: 0.0, envMapIntensity: 0.62,
});
const WHITE_B = new THREE.MeshStandardMaterial({
  color: 0xe6e5e0, roughness: 0.90, metalness: 0.0, envMapIntensity: 0.55, side: THREE.DoubleSide,
});
const BG = {
  material: new THREE.Color(0x0a0d12),
  white: new THREE.Color(0x202226),
  xray: new THREE.Color(0x04070c),
};

/* 爆炸顺序：从外到内（屋盖→桁架→立面→环廊→看台→座椅→场地） */
const EXPLODE_ORDER = ['roof', 'structure', 'facade', 'suites', 'concourse', 'bowl', 'seats', 'interior', 'pitch'];

export class ModeController {
  constructor({ arena, stage }) {
    this.arena = arena;
    this.stage = stage;
    this.mode = 'material';
    this.explode = 0; this.explodeT = 0;
    this.section = { on: false, normal: new THREE.Vector3(0, 0, -1), cut: 0 };
    this.fx = null;
    this.highlight = null;

    /* 材质记忆：mesh → 原始材质（只存引用，不改原材质属性） */
    this._saved = new Map();
    this._savedRender = new Map();

    this.xrayMat = new THREE.ShaderMaterial({
      vertexShader: xrayVert, fragmentShader: xrayFrag,
      uniforms: { base: { value: new THREE.Color('#123a52') }, rim: { value: new THREE.Color('#6fe6ff') }, opacity: { value: 1 }, scan: { value: 0 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });

    /* 爆炸/剖切用的"幽灵"半透明材质缓存（独立克隆，不污染原材质） */
    this._ghost = new Map();
    /* 剖切双面材质副本 */
    this._dsMat = new Map();
    this._clipCapture = new Map();

    const r = stage.renderer;
    r.localClippingEnabled = true;

    /* 剖面填充：stencil */
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    this._fill = null;                    // {A, B}
    this._buildSectionFills();

    this.explodeRefs = this._buildExplodeRefs();
    this.layerState = {};
    this._applyMaterialMode();
  }

  /* ══════════════ 材质三态 ══════════════ */
  setMode(m) {
    if (m !== 'material' && m !== 'white' && m !== 'xray') return;
    this.mode = m;
    this._restoreMaterials();
    this._applyMaterialMode();
    /* 白模/X-ray 时关闭 bloom 溢出，保留曝光 */
    const fx = this.fx;
    if (fx) {
      if (m === 'material') { fx.bloomEnabled = true; fx.exposureBoost = 1.0; }
      else { fx.bloomEnabled = false; fx.exposureBoost = m === 'xray' ? 0.78 : 0.86; }
    }
    /* 背景/雾：全部走同一个 renderer clearColor，不再叠加 scene.background */
    const r = this.stage.renderer;
    r.setClearColor(BG[m], 1);
    const sc = this.stage.scene;
    if (sc.fog) {
      sc.fog.color.copy(m === 'material' ? new THREE.Color(0x0a0f18) : BG[m]);
      sc.fog.density = m === 'xray' ? 0.00018 : 0.00046;
    }
  }

  _applyMaterialMode() {
    const root = this.arena.root;
    if (this.mode === 'material') return;
    const m = this.mode;
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      this._saved.set(o, o.material);
      if (!this._savedRender.has(o)) this._savedRender.set(o, o.renderOrder);
      if (m === 'white') {
        const isDS = [].concat(o.material).some((mm) => mm && mm.side === THREE.DoubleSide);
        o.material = isDS ? WHITE_B : WHITE_A;
      } else {
        /* X-ray：巨体（>4 万三角）保持原材质，避免加色叠加糊成一片 */
        const tri = o.geometry ? (o.geometry.index ? o.geometry.index.count / 3 : 0) : 0;
        if (tri > 40000) return;
        o.material = this.xrayMat;
        o.renderOrder = 4;
      }
    });
  }

  _restoreMaterials() {
    for (const [o, mat] of this._saved) {
      o.material = mat;
      o.renderOrder = this._savedRender.get(o) ?? 0;
    }
    this._saved.clear();
    this._savedRender.clear();
    /* 剖切/爆炸副本在此处也一并失效，切回材质模式即完全复原 */
    this._clearGhosts();
  }

  /* 材质副本（双面 / 半透明）统一克隆，可重复使用 */
  _cloneFor(orig, key, patch) {
    let map = this._ghost;
    if (key === 'ds') map = this._dsMat;
    if (map.has(orig)) return map.get(orig);
    const c = orig.clone();
    if (patch) Object.assign(c, patch);
    c.userData.__src = orig;
    map.set(orig, c);
    return c;
  }
  _clearGhosts() {
    for (const map of [this._ghost, this._dsMat]) {
      for (const m of map.values()) { m.dispose && m.dispose(); }
      map.clear();
    }
  }

  /* ══════════════ 爆炸（真实分层装配） ══════════════ */
  _buildExplodeRefs() {
    const G = this.arena.groups || {};
    /* amount：0→1 时的最大位移（米）；weight：露内部时的半透明强度 */
    const defs = {
      roof: { amt: 132, alpha: 0.55, dir: 'y' },
      structure: { amt: 128, alpha: 0.0, dir: 'y' },
      facade: { amt: 74, alpha: 0.62, radial: 1, lift: 6 },
      suites: { amt: 26, alpha: 0.34, radial: 1, lift: 4 },
      concourse: { amt: 34, alpha: 0.30, dir: 'y' },
      bowl: { amt: 22, alpha: 0.26, dir: 'y' },
      interior: { amt: 16, alpha: 0.20, dir: 'y' },
      seats: { amt: 46, alpha: 0.0, radial: 1, lift: 12 },
      pitch: { amt: 22, alpha: 0.0, dir: 'down' },
    };
    const refs = [];
    EXPLODE_ORDER.forEach((k, idx) => {
      const obj = G[k];
      if (!obj) return;
      const d = defs[k] || { amt: 20, alpha: 0.2, dir: 'y' };
      refs.push({
        key: k, obj, idx,
        basePos: obj.position.clone(),
        scale: obj.scale.clone(),
        ...d,
      });
    });
    return refs;
  }

  /* 兼容两种入参：0–1 或 0–100（ui.js 传 0–1，键盘/脚本可能传百分数） */
  setExplode(v) {
    v = +v || 0;
    this.explodeT = clamp(v > 1 ? v / 100 : v, 0, 1);
  }
  set explodePercent(v) { this.setExplode(v); }
  get explodePercent() { return this.explodeT * 100; }

  _applyExplode() {
    const e = easeInOut(this.explode);
    for (const r of this.explodeRefs) {
      const o = r.obj;
      o.position.copy(r.basePos);
      o.scale.copy(r.scale);
      if (e < 1e-4) continue;
      if (r.radial) {
        /* 径向分离：组是绕世界原点的环族，缩放即"外扩"（不产生穿插） */
        const k = 1 + e * (r.amt / 106);
        o.scale.set(k, 1, k);
        if (r.lift) o.position.y = r.basePos.y + e * r.lift;
      } else if (r.dir === 'down') {
        o.position.y = r.basePos.y - e * r.amt;
      } else {
        o.position.y = r.basePos.y + e * r.amt;
      }
    }
    /* 露出内部：仅对外壳族做半透明（克隆材质，不动原材质）。
       用 depthWrite:false —— 否则屋盖/立面自身背面会挡住内部，
       "半透明露内部"就失效了（实测暴露：爆炸图里外壳仍是不透明黑面）。 */
    for (const r of this.explodeRefs) {
      const a = r.alpha * clamp((this.explode - 0.10) / 0.5, 0, 1);
      this._setGhost(r.obj, a);
    }
    /* 归零时立刻复原 */
    if (this.explode < 1e-3) this._resetExplode();
  }

  _resetExplode() {
    for (const r of this.explodeRefs) {
      r.obj.position.copy(r.basePos);
      r.obj.scale.copy(r.scale);
    }
    this._setGhostAll(0);
  }

  /* 对一组构件套用半透明版本（alpha=0 还原）；材质按 1/40 档位克隆复用 */
  _setGhost(group, alpha) {
    group.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      if (alpha <= 0.004) {
        if (o.userData.__ghostOn) { o.material = o.userData.__ghostOn; o.userData.__ghostOn = null; o.userData.__gKey = 0; }
        return;
      }
      const orig = o.userData.__ghostOn || o.material;
      if (!orig || orig.isShaderMaterial) return;
      if (this.mode !== 'material') return;          // 白模/X 光下不做
      if ([].concat(orig).length > 1) return;         // 多材质组跳过，避免过度开销
      const key = Math.round(clamp(alpha, 0, 1) * 40);
      if (o.userData.__gKey === key) return;
      const src = orig.userData && orig.userData.__src ? orig.userData.__src : orig;
      const mapKey = src.uuid + '@' + key;
      let mat = this._ghost.get(mapKey);
      if (!mat) {
        mat = src.clone();
        mat.transparent = true;
        mat.opacity = clamp(key / 40, 0, 1);
        mat.depthWrite = false;
        mat.userData.__src = src;
        this._ghost.set(mapKey, mat);
      }
      o.userData.__ghostOn = orig;
      o.userData.__gKey = key;
      o.material = mat;
    });
  }
  _setGhostAll(alpha) {
    for (const r of this.explodeRefs) this._setGhost(r.obj, alpha);
  }

  /* ══════════════ 剖切 ══════════════ */
  setSection(on, normal, cut) {
    this.section.on = !!on;
    if (normal) {
      if (normal.isVector3) this.section.normal.copy(normal).normalize();
      else if (Array.isArray(normal)) this.section.normal.set(normal[0], normal[1], normal[2]).normalize();
    }
    if (cut != null) this.section.cut = +cut;
    this._applySection();
  }
  setSectionPosition(cut) { this.setSection(this.section.on, null, cut); }

  _applySection() {
    const r = this.stage.renderer;
    const s = this.section;
    /* 平面：法向 n，常数 c —— 保留 n·p + c >= 0 的一侧 */
    /* 剖切平面：保留"远离相机"的一侧。
       相机在正前方（+Z）时，保留 z <= cut 的一侧并让切面正对相机；
       法向取 (0,0,-1)、constant = +cut → 保留 z <= cut。
       之前写成了 constant = -cut 导致保留 z >= cut，把整个体育场都剖掉了。 */
    if (this.section.on) {
      /* 法向 +Z、constant = +cut：three 的裁剪保留 n·p + c >= 0，
         即保留 z >= cut 的一侧（相机在 +Z 方向，先切掉近处，露出断面）。
         实测只有 n=+Z 时断面朝向正确、不会把整个场地剖掉。 */
      this.clipPlane.normal.set(0, 0, 1).normalize();
      this.clipPlane.constant = -Math.abs(s.cut);
    } else {
      this.clipPlane.normal.copy(s.normal).normalize();
      this.clipPlane.constant = s.cut;
    }
    if (s.on) {
      r.clippingPlanes = [this.clipPlane];
      this._captureClipped();
      this._setDoubleSided(true);
    } else {
      r.clippingPlanes = [];
      this._ghostSection(false);
      this._setDoubleSided(false);
    }
    const fills = this._fill;
    const vis = s.on;
    if (fills) {
      fills.A.visible = vis;
      if (vis) this._updateFillPlane();
    }
    /* 注意：A 是填充组根节点，B 子节点随父自动显隐 */
  }

  /* 记住被剖切影响的材质（只记录下来，不改属性） */
  _captureClipped() {
    if (this._clipCapture.size) return;
    this.arena.root.traverse((o) => {
      if (!o.isMesh || !o.material || o.isInstancedMesh) return;
      const mats = [].concat(o.material);
      if (mats.some((m) => m && m.isShaderMaterial)) return;
      if (!this._clipCapture.has(o)) this._clipCapture.set(o, o.material);
    });
  }

  /* 剖切时改成双面（只克隆一次并缓存，重复调用不泄漏材质） */
  _setDoubleSided(on) {
    for (const [o, orig] of this._clipCapture) {
      if (on) {
        if (o.userData.__ds) continue;                 // 已经克隆过，别重复克隆
        const src = [].concat(orig);
        const mats = src.map((m) => {
          if (!m || m.isShaderMaterial) return m;
          const key = m.uuid + ':ds';
          let c = this._dsMat.get(key);
          if (!c) {
            c = m.clone();
            c.side = THREE.DoubleSide;                  // 剖切后内壁需要可见
            c.transparent = !!m.transparent;            // 保持原透明度语义
            c.needsUpdate = true;
            this._dsMat.set(key, c);
          }
          return c;
        });
        o.material = Array.isArray(orig) ? mats : mats[0];
        o.userData.__ds = orig;
      } else if (o.userData.__ds) {
        o.material = o.userData.__ds;
        o.userData.__ds = null;
      }
    }
    if (!on) {
      for (const m of this._dsMat.values()) m.dispose && m.dispose();
      this._dsMat.clear();
    }
  }

  /* 剖面填充：A 只写模板（不写颜色），B 用“模板 != 1”的条件着色。
     思路（按 A→B 顺序同步绘制即可，无需依赖图元顺序）：
       · A（背面）恒写 stencil=1 且不写颜色 —— 其作用是先把模板清成 1，
         再由前面已绘制的实体在模板里留下的 0 区分开；
       · B 只在模板==0 处上色（即“实体所在像素”），并保持 depthTest，
         被前方实体遮住的位置不画 —— 于是“看得见的部分”恰好是被剖开
         的实体断面，读作实心体块而不是空壳。
     注：renderer 建时 stencil:false 也可用 —— 模板缓冲由 three 的
     WebGLRenderer 自动分配（模板测试默认要求 stencil 附件，three 内部
     总是请求 STENCIL_INDEX8），这里仍做了降级兼容：若模板不可用，
     退化为纯双面染色（至少切面不再是空壳）。 */
  _buildSectionFills() {
    /* 断面填充：不再用 stencil（模板缓冲在部分驱动上不可靠，会画出不受光照的
       纯白大三角）。改为在剖切面上铺一张深色"纸"，配合材质双面化，
       切开的实体读作实心断面，且不会过曝。 */
    const g = new THREE.PlaneGeometry(760, 520);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x232a33, side: THREE.DoubleSide, transparent: true, opacity: 0.9,
      depthWrite: false, depthTest: true, toneMapped: true,
    });
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = 'SECTION_FILL';
    mesh.renderOrder = 60;
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    const grp = new THREE.Group();
    grp.name = 'SECTION_FILL';
    grp.add(mesh);
    grp.visible = false;
    this.stage.scene.add(grp);
    this._fill = { A: grp, planeA: mesh, planeB: mesh, matA: mat, matB: mat, src: g };
    this._fillGroup = grp;
  }

  _updateFillPlane() {
    const f = this._fill;
    if (!f) return;
    const n = this.clipPlane.normal, c = this.clipPlane.constant;
    /* 平面上一点：n·p + c = 0 → p = -c·n；再沿 -n 内推 0.6m，避免被裁剪平面切掉 */
    const p = n.clone().multiplyScalar(-c).addScaledVector(n, -0.6);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    for (const m of [f.planeA, f.planeB]) {
      m.position.copy(p);
      m.quaternion.copy(q);
      m.updateMatrix();
      m.updateMatrixWorld(true);
    }
  }

  _ghostSection(on) {
    /* 剖切模式下不做额外处理（双面已保证切面有填充几何） */
    if (!on) this._clipCapture.clear();
  }

  /* ══════════════ 图层 ══════════════ */
  setLayer(id, visible, solo) {
    const groups = this.arena.groups || {};
    const alias = {
      roofSoffit: 'roof', ringBeam: 'roof', truss: 'roof', trusses: 'structure',
      structureRoof: 'structure', seat: 'seats', massing: 'seats', suite: 'suites',
    };
    const key = alias[id] || id;
    if (solo !== undefined && solo !== null) {
      /* 孤立：只显示这一族 */
      for (const k of Object.keys(groups)) {
        if (!groups[k]) continue;
        groups[k].visible = !!solo ? (k === key) : true;
      }
      this.layerState[key] = { on: true, solo: !!solo };
      return;
    }
    if (groups[key]) groups[key].visible = !!visible;
    this.layerState[key] = { on: !!visible, solo: false };
  }

  /* 选中构件描边（后期 pass 使用） */
  setHighlight(obj) {
    const fx = this.fx;
    this.highlight = obj || null;
    if (fx && fx.setOutline) fx.setOutline(obj || null);
  }

  /* ══════════════ 每帧 ══════════════ */
  update(dt) {
    dt = Math.min(dt || 0.016, 0.1);
    /* 爆炸缓动（指数逼近，无限接近但永不抖动） */
    const d = this.explodeT - this.explode;
    if (Math.abs(d) > 1e-5) {
      this.explode += d * Math.min(1, dt * 4.2);
      if (Math.abs(this.explodeT - this.explode) < 1e-4) this.explode = this.explodeT;
      this._applyExplode();
    } else if (this.explode === 0 && this._needsRestore) {
      this._resetExplode();
      this._needsRestore = false;
    }
    if (this.explode > 0) this._needsRestore = true;
    /* X 光扫描线 */
    if (this.mode === 'xray') this.xrayMat.uniforms.scan.value += dt * 0.35;
    /* 剖切平面跟随 */
    if (this.section.on) { this.clipPlane.constant = this.section.cut; this._updateFillPlane(); }
  }
}
