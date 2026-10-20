/* ═══════════════════════════════════════════════════════════════════════
   core.js — 渲染主干：渲染器 / 环境(IBL) / 色彩预设 / 通用工具
   TIDAL ARENA · 潮汐场  （重构版）
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const D2R = Math.PI / 180;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);

/* ══════════════ 渲染舞台 ══════════════ */
/* 像素预算（设备像素总数上限）：
   · 高性能档 = 旧行为（2.6M，等于 1920×1080 @1.25 倍）
   · 省电档   = 一半（1.3M）。实测帧率与像素数近似成反比，
     2.6M→1.3M 在这台机器上是 17fps→30fps 的量级。 */
export const PIXEL_BUDGET = { perf: 2.6e6, eco: 1.3e6 };
/* 功耗偏好：默认 'default'（跟随操作系统：拔电时系统会尽量用核显省电）。
   显式给 'high-performance' 会强制请求独显 —— 若双显卡笔记本接在核显输出上，
   部分驱动会退回软件渲染（SwiftShader，3D 只剩个位数帧），所以不做默认值。 */
export const POWER_PREF = 'default';
/* 是否排除软渲染：实测软件渲染（SwiftShader）里 100 万三角面只有 ~1fps，
   与其让用户看幻灯片，不如给一句明确的提示。设 0 可强制不拦截。 */
export const NO_SOFTWARE = 1;

export const stage = {
  renderer: null, scene: null, camera: null, canvas: null,
  W: 2, H: 2, pr: 1, quality: 'high',
  perf: false,                     /* 省电档：降低像素预算 + 关泛光 + 不投影阴影 */
  software: false, softwareInfo: '',   /* 软件渲染检测结果 */
  onResize: null, onContextLost: null,
};

/* 读一下真正在用的 GPU（调试信息扩展被隐私设置遮挡时返回空串） */
export function readGPU(renderer) {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  } catch (e) { return ''; }
}
const isSoftwareName = (s) => /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(s || '');

export function initRenderer(canvas) {
  /* 走 EffectComposer 管线：抗锯齿由后期处理（SMAA/超采样）负责，
     关闭 MSAA 默认缓冲可省下大量带宽（实测同一机位提升约 15%）。 */
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, powerPreference: POWER_PREF,
    stencil: false, alpha: false, preserveDrawingBuffer: false,
    failIfMajorPerformanceCaveat: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  /* PCFSoft 每个采样点要做 4 次纹理读取；PCF 只要 1 次。阴影本来就不是这个
     场景的观感重点（夜赛 + 泛光），换成 PCF 几乎看不出差别。 */
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.setClearColor(0x05060a, 1);
  stage.renderer = renderer;
  stage.canvas = canvas;
  stage.softwareInfo = readGPU(renderer);
  stage.software = isSoftwareName(stage.softwareInfo);

  /* 上下文丢失（显卡驱动重置 / 显存被回收）时给个明确提示，而不是白屏 */
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stage.onContextLost && stage.onContextLost();
  });

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0f18, 0.00055);
  stage.scene = scene;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.25, 9000);
  camera.position.set(0, 240, 300);
  stage.camera = camera;

  resize();
  window.addEventListener('resize', resize);
  return stage;
}

export function resize() {
  const r = stage.renderer; if (!r) return;
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  /* 省电档整体再压一档：即使手动选「高」也不超过 1.5 倍 */
  const maxDpr = stage.quality === 'low' ? 1.0 : stage.quality === 'mid' ? 1.5 : (stage.perf ? 1.25 : 2.0);
  const budget = stage.perf ? PIXEL_BUDGET.eco : PIXEL_BUDGET.perf;
  const pr = Math.min(dpr, maxDpr, Math.sqrt(budget / (w * h)));
  stage.W = w; stage.H = h; stage.pr = pr;
  r.setPixelRatio(pr);
  r.setSize(w, h, false);
  stage.camera.aspect = w / h;
  stage.camera.updateProjectionMatrix();
  stage.onResize && stage.onResize();
}

/* ══════════════ 色彩预设 ══════════════ */
export const PRESETS = {
  night: {
    key: 'night', name: '夜赛', en: 'NIGHT MATCH',
    skyTop: '#050a18', skyHor: '#12325c', skyBot: '#05070c',
    sun: '#c3d4ff', sunI: 0.22, sunEl: 40, sunAz: 205,
    hemiSky: '#66809f', hemiGround: '#26292e', hemiI: 0.40,
    fog: '#0b1728', fogD: 0.00068, exposure: 1.24,
    night: 1.0, flood: 1.0, stars: 1.0, interior: 1.0,
    cloudA: '#22304a', cloudB: '#2f4468', haze: 0.62,
    interiorGlow: 1.0, floodI: 2.20,
  },
  day: {
    key: 'day', name: '日间', en: 'DAYLIGHT',
    skyTop: '#3a7cc4', skyHor: '#d8e6f2', skyBot: '#8f98a4',
    sun: '#fff8ee', sunI: 4.30, sunEl: 56, sunAz: -62,
    hemiSky: '#dceaf8', hemiGround: '#776a58', hemiI: 1.95,
    fog: '#c8d6e2', fogD: 0.00030, exposure: 1.55,
    night: 0.0, flood: 0.0, stars: 0.0, interior: 0.25,
    cloudA: '#ffffff', cloudB: '#e2ecf6', haze: 1.0,
    interiorGlow: 0.28, floodI: 0.0,
  },
  dusk: {
    key: 'dusk', name: '黄昏', en: 'DUSK KICKOFF',
    skyTop: '#1b2c52', skyHor: '#d08a5c', skyBot: '#2a2320',
    sun: '#ffb379', sunI: 1.9, sunEl: 6.5, sunAz: -114,
    hemiSky: '#a8b8d8', hemiGround: '#3b3228', hemiI: 0.85,
    fog: '#8f7a76', fogD: 0.00042, exposure: 1.02,
    night: 0.55, flood: 0.55, stars: 0.15, interior: 0.7,
    cloudA: '#ffd2a8', cloudB: '#8a7f96', haze: 0.9,
    interiorGlow: 0.75, floodI: 1.6,
  },
};
export const preset = { ...PRESETS.night };

const _ca = new THREE.Color(), _cb = new THREE.Color();
export function lerpColor(a, b, t) {
  _ca.set(a); _cb.set(b);
  return '#' + _ca.lerp(_cb, t).getHexString();
}
export function lerpPreset(target, t) {
  for (const k of Object.keys(target)) {
    const a = preset[k], b = target[k];
    if (typeof b === 'number') preset[k] = lerp(a, b, t);
    else if (typeof b === 'string' && b.startsWith('#')) preset[k] = lerpColor(a, b, t);
    else preset[k] = b;
  }
  return preset;
}

/* ══════════════ 程序化 IBL（亮/暗两套，夜间灯光切换时插值） ══════════════ */
const envVert = /* glsl */`
varying vec3 vDir;
void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const envFrag = /* glsl */`
uniform vec3 cTop, cHor, cBot, floodCol;
uniform float flood;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = h > 0.0 ? mix(cHor, cTop, pow(clamp(h,0.0,1.0), 0.6)) : mix(cHor, cBot, pow(clamp(-h,0.0,1.0), 0.45));
  // 四组灯棚在环境里的方向性高光带
  float band = 0.0;
  for (int i=0;i<4;i++){
    float a = float(i) * 1.5708 + 0.5;
    vec3 ld = normalize(vec3(cos(a), 0.55, sin(a)));
    band += pow(max(dot(d, ld), 0.0), 26.0);
  }
  col += floodCol * band * flood * 0.85;
  col = mix(col, vec3(0.13,0.13,0.14) + floodCol*0.05, smoothstep(0.0,-0.45,h));
  gl_FragColor = vec4(max(col, vec3(0.012)), 1.0);
}`;

export const ENV = { rt: null, src: null, mat: null, keys: {} };
export function buildEnvironment() {
  const pmrem = new THREE.PMREMGenerator(stage.renderer);
  const mat = new THREE.ShaderMaterial({
    vertexShader: envVert, fragmentShader: envFrag, side: THREE.BackSide, depthWrite: false,
    uniforms: {
      cTop: { value: new THREE.Color() }, cHor: { value: new THREE.Color() }, cBot: { value: new THREE.Color() },
      flood: { value: 0 }, floodCol: { value: new THREE.Color('#fff3e0') },
    },
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), mat);
  const sc = new THREE.Scene(); sc.add(dome);
  ENV.mat = mat; ENV.dome = dome; ENV.scene = sc; ENV.pmrem = pmrem;
  ENV.src = null;
  applyEnvFromPreset(preset, true);
  return ENV;
}
let _envT = -1;
export function applyEnvFromPreset(p, force) {
  if (!ENV.mat) return;
  const sig = p.skyTop + p.skyHor + p.skyBot + p.flood.toFixed(2) + p.sunI.toFixed(2) + p.hemiI.toFixed(2);
  if (!force && sig === ENV.src) return;
  ENV.src = sig;
  const u = ENV.mat.uniforms;
  u.cTop.value.set(p.skyTop); u.cHor.value.set(p.skyHor); u.cBot.value.set(p.skyBot);
  u.flood.value = p.flood;
  ENV.mat.needsUpdate = true;
  if (ENV.rt) ENV.rt.dispose();
  ENV.rt = ENV.pmrem.fromScene(ENV.scene, 0.03, 0.1, 200);
  stage.scene.environment = ENV.rt.texture;
  if (stage.scene.environmentIntensity === undefined) { /* three r160 */ }
}

/* ══════════════ 几何累加器：按材质合批，把上万个小构件压成几十个 draw call ══════════════ */
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
export class GeomBatch {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.idx = []; this.vc = 0; }
  /** 追加一个带 position/normal/uv(+index) 的几何 */
  add(geo, matrix) {
    const g = geo.index ? geo : geo;
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    const m = matrix || null;
    const nm = new THREE.Matrix3();
    if (m) nm.getNormalMatrix(m);
    const base = this.vc;
    for (let i = 0; i < p.count; i++) {
      _v1.fromBufferAttribute(p, i);
      if (m) _v1.applyMatrix4(m);
      this.pos.push(_v1.x, _v1.y, _v1.z);
      if (n) { _v2.fromBufferAttribute(n, i); if (m) _v2.applyMatrix3(nm).normalize(); this.nor.push(_v2.x, _v2.y, _v2.z); }
      else this.nor.push(0, 1, 0);
      if (u) this.uv.push(u.getX(i), u.getY(i)); else this.uv.push(0, 0);
    }
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) this.idx.push(a[i] + base); }
    else for (let i = 0; i < p.count; i++) this.idx.push(i + base);
    this.vc += p.count;
    return this;
  }
  /** 追加一个由 4 个角点定义的四边形（自动法向） */
  quad(a, b, c, d, uvs) {
    const base = this.vc;
    const nrm = _v1.copy(b).sub(a).cross(_v2.copy(c).sub(a)).normalize().clone();
    for (const v of [a, b, c, d]) { this.pos.push(v.x, v.y, v.z); this.nor.push(nrm.x, nrm.y, nrm.z); }
    if (uvs) for (const t of uvs) this.uv.push(t[0], t[1]); else for (let i = 0; i < 4; i++) this.uv.push(0, 0);
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.vc += 4;
    return this;
  }
  /** 追加一个由 8 个角点定义的箱体（沿任意轴，用于梁/檩/压顶，避免纸片感） */
  box(p0, p1, w, h, up) {
    const dir = _v1.copy(p1).sub(p0);
    const len = dir.length(); if (len < 1e-5) return this;
    dir.normalize();
    const u = (up || _v2.set(0, 1, 0)).clone();
    if (Math.abs(u.dot(dir)) > 0.98) u.set(1, 0, 0);
    const side = new THREE.Vector3().crossVectors(dir, u).normalize();
    const upv = new THREE.Vector3().crossVectors(side, dir).normalize();
    const hs = side.clone().multiplyScalar(w / 2), hu = upv.clone().multiplyScalar(h / 2);
    const A = p0.clone().add(hs).add(hu), B = p0.clone().sub(hs).add(hu), C = p0.clone().sub(hs).sub(hu), D = p0.clone().add(hs).sub(hu);
    const A2 = A.clone().addScaledVector(dir, len), B2 = B.clone().addScaledVector(dir, len),
      C2 = C.clone().addScaledVector(dir, len), D2 = D.clone().addScaledVector(dir, len);
    this.quad(B, A, A2, B2); this.quad(C, B, B2, C2); this.quad(D, C, C2, D2); this.quad(A, D, D2, A2);
    this.quad(A2, B2, C2, D2); this.quad(C, D, A, B);
    return this;
  }
  build() {
    if (!this.vc) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.vc > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    return g;
  }
  get tris() { return this.idx.length / 3; }
}

/* ══════════════ 路径采样（圆角矩形环，按弧长参数化） ══════════════ */
export function roundedRectPath(L, W, r, cornerSeg = 8) {
  r = Math.max(0.4, Math.min(r, Math.min(L, W) * 0.9));
  const ax = L - r, az = W - r;
  const shapes = [];
  const push = (x, z) => shapes.push({ x, z });
  // 起点 (0, W) 顺时针（俯视）
  push(0, W);
  const nSeg = (len) => Math.max(1, Math.round(len / 2.0));
  const line = (x0, z0, x1, z1) => { const n = nSeg(Math.hypot(x1 - x0, z1 - z0)); for (let i = 1; i <= n; i++) push(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n); };
  const arc = (cx, cz, a0, a1) => { for (let i = 1; i <= cornerSeg; i++) { const a = a0 + (a1 - a0) * i / cornerSeg; push(cx + Math.cos(a) * r, cz + Math.sin(a) * r); } };
  line(0, W, ax, W);
  arc(ax, az, Math.PI / 2, 0);
  line(ax, az, ax, -az);
  arc(ax, -az, 0, -Math.PI / 2);
  line(ax, -az, -ax, -az);
  arc(-ax, -az, -Math.PI / 2, -Math.PI);
  line(-ax, -az, -ax, az);
  arc(-ax, az, Math.PI, Math.PI * 1.5);
  line(-ax, az, 0, az);
  // 法向（外法向 = 指向远离中心）
  const cum = [0];
  for (let i = 1; i <= shapes.length; i++) { const a = shapes[i - 1], b = shapes[i % shapes.length]; cum.push(cum[i - 1] + Math.hypot(b.x - a.x, b.z - a.z)); }
  const total = cum[shapes.length];
  const pts = shapes.map((p) => {
    const l = Math.hypot(p.x, p.z) || 1;
    return { x: p.x, z: p.z, nx: p.x / l, nz: p.z / l };
  });
  const sample = (u) => {
    u = ((u % 1) + 1) % 1;
    const target = u * total;
    let lo = 0, hi = pts.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m + 1] <= target) lo = m + 1; else hi = m; }
    const i = lo, j = (i + 1) % pts.length;
    const segLen = cum[i + 1] - cum[i] || 1e-9;
    const f = (target - cum[i]) / segLen;
    const a = pts[i], b = pts[j];
    const x = a.x + (b.x - a.x) * f, z = a.z + (b.z - a.z) * f;
    const dx = b.x - a.x, dz = b.z - a.z;
    const dl = Math.hypot(dx, dz) || 1;
    // 切向 & 外法向（外法向 = 切向顺时针旋转 90°）
    const tx = dx / dl, tz = dz / dl;
    let nx = tz, nz = -tx;
    const l = Math.hypot(x, z) || 1;
    if (nx * x + nz * z < 0) { nx = -nx; nz = -nz; }
    return { x, z, nx, nz, tx, tz, u };
  };
  return { L, W, r, total, sample, pts };
}

/* ══════════════ 程序化纹理工具 ══════════════ */
export function canvasTex(w, h, draw, opts = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = opts.wrap || THREE.ClampToEdgeWrapping;
  t.anisotropy = opts.aniso || 8;
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  t.needsUpdate = true;
  return t;
}

/* ══════════════ 小工具 ══════════════ */
export function disposeTree(obj) {
  if (!obj) return;
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
  });
}
export function boxAt(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export function fmt(n) { return n.toLocaleString('en-US'); }
