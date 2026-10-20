/* 自动生成：由 tools/bundle.cjs 从 src/boot.js 打出，请勿手改。 改动业务代码请改 src/ 下的模块然后重新打包。 */
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/core.js
import * as THREE from "three";
function readGPU(renderer) {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  } catch (e) {
    return "";
  }
}
function initRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: POWER_PREF,
    stencil: false,
    alpha: false,
    preserveDrawingBuffer: false,
    failIfMajorPerformanceCaveat: false
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.setClearColor(329226, 1);
  stage.renderer = renderer;
  stage.canvas = canvas;
  stage.softwareInfo = readGPU(renderer);
  stage.software = isSoftwareName(stage.softwareInfo);
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    stage.onContextLost && stage.onContextLost();
  });
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(724760, 55e-5);
  stage.scene = scene;
  const camera = new THREE.PerspectiveCamera(42, 1, 0.25, 9e3);
  camera.position.set(0, 240, 300);
  stage.camera = camera;
  resize();
  window.addEventListener("resize", resize);
  return stage;
}
function resize() {
  const r = stage.renderer;
  if (!r) return;
  const w = window.innerWidth, h = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  const maxDpr = stage.lite ? 1 : stage.quality === "low" ? 1 : stage.quality === "mid" ? 1.5 : stage.perf ? 1.25 : 2;
  const budget = stage.lite ? PIXEL_BUDGET.lite : stage.perf ? PIXEL_BUDGET.eco : PIXEL_BUDGET.perf;
  const pr = Math.min(dpr, maxDpr, Math.sqrt(budget / (w * h)));
  stage.W = w;
  stage.H = h;
  stage.pr = pr;
  r.setPixelRatio(pr);
  r.setSize(w, h, false);
  stage.camera.aspect = w / h;
  stage.camera.updateProjectionMatrix();
  stage.onResize && stage.onResize();
}
function lerpColor(a, b, t) {
  _ca.set(a);
  _cb.set(b);
  return "#" + _ca.lerp(_cb, t).getHexString();
}
function lerpPreset(target, t) {
  for (const k of Object.keys(target)) {
    const a = preset[k], b = target[k];
    if (typeof b === "number") preset[k] = lerp(a, b, t);
    else if (typeof b === "string" && b.startsWith("#")) preset[k] = lerpColor(a, b, t);
    else preset[k] = b;
  }
  return preset;
}
function buildEnvironment() {
  const pmrem = new THREE.PMREMGenerator(stage.renderer);
  const mat = new THREE.ShaderMaterial({
    vertexShader: envVert,
    fragmentShader: envFrag,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      cTop: { value: new THREE.Color() },
      cHor: { value: new THREE.Color() },
      cBot: { value: new THREE.Color() },
      flood: { value: 0 },
      floodCol: { value: new THREE.Color("#fff3e0") }
    }
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), mat);
  const sc = new THREE.Scene();
  sc.add(dome);
  ENV.mat = mat;
  ENV.dome = dome;
  ENV.scene = sc;
  ENV.pmrem = pmrem;
  ENV.src = null;
  applyEnvFromPreset(preset, true);
  return ENV;
}
function applyEnvFromPreset(p, force) {
  if (!ENV.mat) return;
  const sig = p.skyTop + p.skyHor + p.skyBot + p.flood.toFixed(2) + p.sunI.toFixed(2) + p.hemiI.toFixed(2);
  if (!force && sig === ENV.src) return;
  ENV.src = sig;
  const u = ENV.mat.uniforms;
  u.cTop.value.set(p.skyTop);
  u.cHor.value.set(p.skyHor);
  u.cBot.value.set(p.skyBot);
  u.flood.value = p.flood;
  ENV.mat.needsUpdate = true;
  if (ENV.rt) ENV.rt.dispose();
  ENV.rt = ENV.pmrem.fromScene(ENV.scene, 0.03, 0.1, 200);
  stage.scene.environment = ENV.rt.texture;
  if (stage.scene.environmentIntensity === void 0) {
  }
}
function canvasTex(w, h, draw, opts = {}) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = opts.wrap || THREE.ClampToEdgeWrapping;
  t.anisotropy = opts.aniso || 8;
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  t.needsUpdate = true;
  return t;
}
function fmt(n) {
  return n.toLocaleString("en-US");
}
var TAU, D2R, clamp, lerp, smooth, easeInOut, PIXEL_BUDGET, POWER_PREF, NO_SOFTWARE, stage, isSoftwareName, PRESETS, preset, _ca, _cb, envVert, envFrag, ENV, _v1, _v2, _v3, GeomBatch, sleep;
var init_core = __esm({
  "src/lib/core.js"() {
    TAU = Math.PI * 2;
    D2R = Math.PI / 180;
    clamp = (v, a, b) => v < a ? a : v > b ? b : v;
    lerp = (a, b, t) => a + (b - a) * t;
    smooth = (t) => t * t * (3 - 2 * t);
    easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    PIXEL_BUDGET = { perf: 26e5, eco: 13e5, lite: 9e5 };
    POWER_PREF = "default";
    NO_SOFTWARE = 1;
    stage = {
      renderer: null,
      scene: null,
      camera: null,
      canvas: null,
      W: 2,
      H: 2,
      pr: 1,
      quality: "high",
      perf: false,
      /* 省电档：降低像素预算 + 关泛光 + 不投影阴影 */
      lite: false,
      /* 轻量档：在省电档基础上再从几何源头减量（坐席抽稀 / 场景减密） */
      seatStride: 3,
      /* 轻量档的坐席抽稀步长 */
      software: false,
      softwareInfo: "",
      /* 软件渲染检测结果 */
      onResize: null,
      onContextLost: null
    };
    isSoftwareName = (s) => /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(s || "");
    PRESETS = {
      night: {
        key: "night",
        name: "夜赛",
        en: "NIGHT MATCH",
        skyTop: "#050a18",
        skyHor: "#12325c",
        skyBot: "#05070c",
        sun: "#c3d4ff",
        sunI: 0.22,
        sunEl: 40,
        sunAz: 205,
        hemiSky: "#66809f",
        hemiGround: "#26292e",
        hemiI: 0.4,
        fog: "#0b1728",
        fogD: 68e-5,
        exposure: 1.24,
        night: 1,
        flood: 1,
        stars: 1,
        interior: 1,
        cloudA: "#22304a",
        cloudB: "#2f4468",
        haze: 0.62,
        interiorGlow: 1,
        floodI: 2.2
      },
      day: {
        key: "day",
        name: "日间",
        en: "DAYLIGHT",
        skyTop: "#3a7cc4",
        skyHor: "#d8e6f2",
        skyBot: "#8f98a4",
        sun: "#fff8ee",
        sunI: 4.3,
        sunEl: 56,
        sunAz: -62,
        hemiSky: "#dceaf8",
        hemiGround: "#776a58",
        hemiI: 1.95,
        fog: "#c8d6e2",
        fogD: 3e-4,
        exposure: 1.55,
        night: 0,
        flood: 0,
        stars: 0,
        interior: 0.25,
        cloudA: "#ffffff",
        cloudB: "#e2ecf6",
        haze: 1,
        interiorGlow: 0.28,
        floodI: 0
      },
      dusk: {
        key: "dusk",
        name: "黄昏",
        en: "DUSK KICKOFF",
        skyTop: "#1b2c52",
        skyHor: "#d08a5c",
        skyBot: "#2a2320",
        sun: "#ffb379",
        sunI: 1.9,
        sunEl: 6.5,
        sunAz: -114,
        hemiSky: "#a8b8d8",
        hemiGround: "#3b3228",
        hemiI: 0.85,
        fog: "#8f7a76",
        fogD: 42e-5,
        exposure: 1.02,
        night: 0.55,
        flood: 0.55,
        stars: 0.15,
        interior: 0.7,
        cloudA: "#ffd2a8",
        cloudB: "#8a7f96",
        haze: 0.9,
        interiorGlow: 0.75,
        floodI: 1.6
      }
    };
    preset = { ...PRESETS.night };
    _ca = new THREE.Color();
    _cb = new THREE.Color();
    envVert = /* glsl */
    `
varying vec3 vDir;
void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
    envFrag = /* glsl */
    `
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
    ENV = { rt: null, src: null, mat: null, keys: {} };
    _v1 = new THREE.Vector3();
    _v2 = new THREE.Vector3();
    _v3 = new THREE.Vector3();
    GeomBatch = class {
      constructor() {
        this.pos = [];
        this.nor = [];
        this.uv = [];
        this.idx = [];
        this.vc = 0;
      }
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
          if (n) {
            _v2.fromBufferAttribute(n, i);
            if (m) _v2.applyMatrix3(nm).normalize();
            this.nor.push(_v2.x, _v2.y, _v2.z);
          } else this.nor.push(0, 1, 0);
          if (u) this.uv.push(u.getX(i), u.getY(i));
          else this.uv.push(0, 0);
        }
        if (g.index) {
          const a = g.index.array;
          for (let i = 0; i < a.length; i++) this.idx.push(a[i] + base);
        } else for (let i = 0; i < p.count; i++) this.idx.push(i + base);
        this.vc += p.count;
        return this;
      }
      /** 追加一个由 4 个角点定义的四边形（自动法向） */
      quad(a, b, c, d, uvs) {
        const base = this.vc;
        const nrm = _v1.copy(b).sub(a).cross(_v2.copy(c).sub(a)).normalize().clone();
        for (const v of [a, b, c, d]) {
          this.pos.push(v.x, v.y, v.z);
          this.nor.push(nrm.x, nrm.y, nrm.z);
        }
        if (uvs) for (const t of uvs) this.uv.push(t[0], t[1]);
        else for (let i = 0; i < 4; i++) this.uv.push(0, 0);
        this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        this.vc += 4;
        return this;
      }
      /** 追加一个由 8 个角点定义的箱体（沿任意轴，用于梁/檩/压顶，避免纸片感） */
      box(p0, p1, w, h, up) {
        const dir = _v1.copy(p1).sub(p0);
        const len = dir.length();
        if (len < 1e-5) return this;
        dir.normalize();
        const u = (up || _v2.set(0, 1, 0)).clone();
        if (Math.abs(u.dot(dir)) > 0.98) u.set(1, 0, 0);
        const side = new THREE.Vector3().crossVectors(dir, u).normalize();
        const upv = new THREE.Vector3().crossVectors(side, dir).normalize();
        const hs = side.clone().multiplyScalar(w / 2), hu = upv.clone().multiplyScalar(h / 2);
        const A = p0.clone().add(hs).add(hu), B = p0.clone().sub(hs).add(hu), C = p0.clone().sub(hs).sub(hu), D = p0.clone().add(hs).sub(hu);
        const A2 = A.clone().addScaledVector(dir, len), B2 = B.clone().addScaledVector(dir, len), C2 = C.clone().addScaledVector(dir, len), D2 = D.clone().addScaledVector(dir, len);
        this.quad(B, A, A2, B2);
        this.quad(C, B, B2, C2);
        this.quad(D, C, C2, D2);
        this.quad(A, D, D2, A2);
        this.quad(A2, B2, C2, D2);
        this.quad(C, D, A, B);
        return this;
      }
      build() {
        if (!this.vc) return null;
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
        g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
        g.setIndex(this.vc > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
        g.computeBoundingSphere();
        return g;
      }
      get tris() {
        return this.idx.length / 3;
      }
    };
    sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  }
});

// src/world/sections.js
function buildTiers2() {
  const out = [];
  let s = SEAT_DEFS2[0].s0, y = SEAT_DEFS2[0].y0;
  SEAT_DEFS2.forEach((def, i) => {
    const rows = [];
    let ss = s, yy = y;
    for (let k = 0; k < def.rows; k++) {
      const isAisle = k % AISLE_EVERY2 === 0 && k > 0;
      const sFront = ss + (isAisle ? AISLE_W2 : 0);
      rows.push({ tier: def.id, k, sFront, sBack: sFront + TREAD2, y: yy, yBack: yy + RISER2, aisle: isAisle });
      ss = sFront + TREAD2;
      yy += RISER2;
    }
    const endS = ss, endY = yy;
    const cDepth = CONCOURSE_DEPTH2[i] ?? 8;
    const cY = endY + CONCOURSE_DY2;
    out.push({
      id: def.id,
      name: def.name,
      color: def.color,
      rows,
      n: def.rows,
      s0: s,
      y0: y,
      endS,
      endY,
      cDepth,
      cY,
      cS0: endS,
      cS1: endS + cDepth,
      // 本层看台体量的底面（落在下一层环廊楼面上）
      soffitY: i === 0 ? -1.2 : out[i - 1].cY - 0.55
    });
    s = endS + cDepth;
    y = cY + (TIER_GAP2[i + 1] ?? 0.9);
  });
  return out;
}
var PITCH2, HALF_Z2, HALF_X2, CORNER_F2, SEGS2, TREAD2, RISER2, AISLE_W2, AISLE_EVERY2, SEAT_DEFS2, CONCOURSE_DEPTH2, CONCOURSE_DY2, TIER_GAP2, TIERS2, L12, L22, L32, BACK_S2, BACK_Y2, C3_Y2, SUITE_BOTTOM2, SUITE_TOP2, GEO2, PORTALS2, PORTAL_NAMES2, SUB_DOORS2, EXITS2;
var init_sections = __esm({
  "src/world/sections.js"() {
    PITCH2 = { L: 105, W: 68 };
    HALF_Z2 = PITCH2.L / 2;
    HALF_X2 = PITCH2.W / 2;
    CORNER_F2 = 0.36;
    SEGS2 = 192;
    TREAD2 = 0.8;
    RISER2 = 0.5;
    AISLE_W2 = 1.2;
    AISLE_EVERY2 = 4;
    SEAT_DEFS2 = [
      { id: "L1", name: "下层看台", rows: 28, s0: 8.8, y0: 1.35, color: "#c9a15f" },
      { id: "L2", name: "中层看台", rows: 19, s0: null, y0: null, color: "#8fb6c4" },
      { id: "L3", name: "上层看台", rows: 17, s0: null, y0: null, color: "#b7a0c4" }
    ];
    CONCOURSE_DEPTH2 = [13, 11, 8];
    CONCOURSE_DY2 = 0.9;
    TIER_GAP2 = [0, 0, 6.4];
    TIERS2 = buildTiers2();
    L12 = TIERS2[0];
    L22 = TIERS2[1];
    L32 = TIERS2[2];
    BACK_S2 = L32.cS1;
    BACK_Y2 = L32.endY;
    C3_Y2 = L32.cY;
    SUITE_BOTTOM2 = L22.cY;
    SUITE_TOP2 = L32.y0 - 0.35;
    GEO2 = {
      /* 场地周边 */
      boardS: 5.2,
      boardH: 1.05,
      barrierS: 6.2,
      barrierH: 1.18,
      apron: 6,
      /* 外立面（三段：基座 / 网幕 / 潮冠） */
      outerS: BACK_S2 + 1.2,
      outerBaseY: 17,
      // 基座顶
      outerMidY: 31.2,
      // 网幕上沿
      outerTopY: 43.7,
      // 檐口下沿（v3：随看台增高上抬 1.5m）
      crownY: 47.3,
      // 潮冠顶（外挑 3.2m）
      crownOut: 3.2,
      /* 屋盖：鞍面环带 */
      roofInnerS: 23.5,
      roofInnerY: 45.4,
      roofRidgeS: 64,
      roofRidgeY: 51.8,
      roofOuterS: BACK_S2 + 8.4,
      roofOuterY: 47.5,
      roofThick: 1.3,
      saddleAmp: 3.4,
      trussStep: 8,
      // 每 8 段一榀 → 24 榀
      /* 八根潮柱（4 角 + 4 边中，外倾） */
      mastS_base: BACK_S2 + 21,
      mastS_top: BACK_S2 + 2.4,
      mastBaseY: -1.2,
      /* 主券洞 / 次入口 */
      portalHalfU: 0.03,
      portalH: 23,
      portalRecess: 9,
      subDoorU: [0.0625, 0.1875, 0.3125, 0.4375, 0.5625, 0.6875, 0.8125, 0.9375],
      subHalfU: 0.0105,
      subH: 7,
      /* 贵宾包厢夹层（L2 环廊之上、L3 座席之下，面向场地） */
      suiteS: L22.cS1 - 0.2,
      // 包厢前玻璃面（= L2 末排后墙）
      suiteDepth: 5.6,
      suiteLevels: [SUITE_BOTTOM2 + 0.35, SUITE_BOTTOM2 + 3.55],
      suiteH: 3,
      suiteWalk: 4.2,
      // 包厢后走道净宽
      /* 球门 / 大屏 */
      screenS: BACK_S2 - 9,
      screenY: 34.2,
      screenW: 26,
      screenH: 13,
      groundY: -1.2
    };
    PORTALS2 = [0, 0.25, 0.5, 0.75];
    PORTAL_NAMES2 = ["北门 · 球迷广场", "东门 · 公交接驳", "南门 · 城市大道", "西门 · 训练场"];
    SUB_DOORS2 = GEO2.subDoorU;
    EXITS2 = [
      ...PORTALS2.map((u, i) => ({ id: "P" + (i + 1), u, kind: "main", name: PORTAL_NAMES2[i] })),
      ...SUB_DOORS2.map((u, i) => ({ id: "S" + (i + 1), u, kind: "sub", name: "次入口 " + (i + 1) }))
    ];
  }
});

// src/world/rings.js
import * as THREE14 from "three";
function roundedPerimeter2(hx, hz, r, n) {
  const ix = Math.max(0.01, hx - r), iz = Math.max(0.01, hz - r);
  const arc = Math.PI / 2 * r;
  const SH = [
    { t: "l", len: ix, p0: [0, hz], d: [1, 0] },
    { t: "a", len: arc, cx: ix, cz: iz, a0: Math.PI / 2, sw: -Math.PI / 2 },
    { t: "l", len: 2 * iz, p0: [hx, iz], d: [0, -1] },
    { t: "a", len: arc, cx: ix, cz: -iz, a0: 0, sw: -Math.PI / 2 },
    { t: "l", len: 2 * ix, p0: [ix, -hz], d: [-1, 0] },
    { t: "a", len: arc, cx: -ix, cz: -iz, a0: -Math.PI / 2, sw: -Math.PI / 2 },
    { t: "l", len: 2 * iz, p0: [-hx, -iz], d: [0, 1] },
    { t: "a", len: arc, cx: -ix, cz: iz, a0: Math.PI, sw: -Math.PI / 2 },
    { t: "l", len: ix, p0: [-ix, hz], d: [1, 0] }
  ];
  const total = SH.reduce((a, x) => a + x.len, 0);
  const raw = SH.map((x) => x.len / total * n);
  const cnt = raw.map((v) => Math.max(2, Math.floor(v)));
  let sum = cnt.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - cnt[i], i]).sort((a, b) => b[0] - a[0]);
  let k = 0;
  while (sum < n) {
    cnt[order[k % 9][1]]++;
    sum++;
    k++;
  }
  while (sum > n) {
    const i = order[8 - k % 9][1];
    if (cnt[i] > 2) {
      cnt[i]--;
      sum--;
    }
    k++;
  }
  const pts = [];
  let gi = 0;
  SH.forEach((sh, si) => {
    const c = cnt[si];
    for (let i = 0; i < c; i++, gi++) {
      let x, z, tx, tz;
      if (sh.t === "l") {
        const f = i / c;
        x = sh.p0[0] + sh.d[0] * sh.len * f;
        z = sh.p0[1] + sh.d[1] * sh.len * f;
        tx = sh.d[0];
        tz = sh.d[1];
      } else {
        const a = sh.a0 + sh.sw * (i / c);
        x = sh.cx + Math.cos(a) * r;
        z = sh.cz + Math.sin(a) * r;
        const sg = Math.sign(sh.sw);
        tx = -Math.sin(a) * sg;
        tz = Math.cos(a) * sg;
      }
      let nx = tz, nz = -tx;
      if (nx * x + nz * z < 0) {
        nx = -nx;
        nz = -nz;
      }
      const dl = Math.hypot(nx, nz) || 1;
      pts.push({ x, z, nx: nx / dl, nz: nz / dl, u: gi / n });
    }
  });
  return { pts, total, hx, hz, r, counts: cnt };
}
function refRing2(segs = SEGS2) {
  if (!_refCache2.has(segs)) _refCache2.set(segs, roundedPerimeter2(HALF_X2, HALF_Z2, HALF_X2 * CORNER_F2, segs));
  return _refCache2.get(segs);
}
function boundaryT2(hx, hz, r, ex, ez) {
  const ax = hx - r, az = hz - r;
  const a = Math.abs(ex), c = Math.abs(ez);
  const te = Math.min(a > 1e-9 ? ax / a : Infinity, c > 1e-9 ? az / c : Infinity);
  if (Math.abs(ex) * te <= ax + 1e-6 && Math.abs(ez) * te <= az + 1e-6) return te;
  const bq = ax * a + az * c, aq = a * a + c * c, cq = ax * ax + az * az - r * r;
  return (bq + Math.sqrt(Math.max(0, bq * bq - aq * cq))) / aq;
}
function pt2(i, s, y, segs = SEGS2) {
  const rr = refRing2(segs);
  const f = (i % segs + segs) % segs;
  const i0 = Math.floor(f) % segs, i1 = (i0 + 1) % segs, fr = f - Math.floor(f);
  const a = rr.pts[i0], b2 = rr.pts[i1];
  if (!a) return new THREE14.Vector3(0, y, 0);
  let nx = a.nx, nz = a.nz;
  if (fr > 1e-6 && b2) {
    nx = a.nx + (b2.nx - a.nx) * fr;
    nz = a.nz + (b2.nz - a.nz) * fr;
    const l = Math.hypot(nx, nz) || 1;
    nx /= l;
    nz /= l;
  }
  return radialPoint2({ nx, nz }, s, y);
}
function radialPoint2(b, s, y) {
  const hx = HALF_X2 + s, hz = HALF_Z2 + s;
  const t = boundaryT2(hx, hz, hx * CORNER_F2, b.nx, b.nz);
  return new THREE14.Vector3(b.nx * t, y, b.nz * t);
}
var _refCache2;
var init_rings = __esm({
  "src/world/rings.js"() {
    init_sections();
    _refCache2 = /* @__PURE__ */ new Map();
  }
});

// src/game/caps.js
function emit(reason) {
  try {
    for (const cb of subs) {
      try {
        cb(S, reason);
      } catch (e) {
      }
    }
    document.dispatchEvent(new CustomEvent("caps:changed", { detail: { reason } }));
  } catch (e) {
  }
}
function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(CAPS_KEY);
  } catch (e) {
    return false;
  }
  if (!raw) {
    S = DEFAULT();
    return false;
  }
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== "object") return false;
    if (firstWriteTs && typeof d.ts === "number" && d.ts < firstWriteTs) return false;
    const base = DEFAULT();
    for (const k of Object.keys(base)) {
      const v = d[k];
      if (Array.isArray(base[k])) base[k] = Array.isArray(v) ? v.filter((x) => typeof x === "string") : base[k];
      else if (typeof base[k] === "number") base[k] = typeof v === "number" && isFinite(v) ? v : base[k];
      else if (base[k] && typeof base[k] === "object") base[k] = v && typeof v === "object" ? v : base[k];
    }
    S = base;
    return true;
  } catch (e) {
    S = DEFAULT();
    return false;
  }
}
function save() {
  try {
    S.ts = Date.now();
    localStorage.setItem(CAPS_KEY, JSON.stringify(S));
    dirty = false;
    if (!firstWriteTs) firstWriteTs = S.ts;
    return true;
  } catch (e) {
    return false;
  }
}
function add(key, id) {
  if (!key || !id) return false;
  const arr = S[key];
  if (!Array.isArray(arr)) return false;
  if (arr.includes(id)) return false;
  arr.push(id);
  save();
  emit(key);
  return true;
}
function has(key, id) {
  const a = S[key];
  return Array.isArray(a) && a.includes(id);
}
function hasAll(key) {
  const a = S[key];
  return Array.isArray(a) ? a.slice() : [];
}
function setFlag(key, val) {
  if (typeof S[key] === "boolean" && S[key] === !!val) return false;
  S[key] = val;
  save();
  emit(key);
  return true;
}
function get(key, dflt) {
  return key in S ? S[key] : dflt;
}
function set(key, val) {
  S[key] = val;
  save();
  emit(key);
  return S[key];
}
function report() {
  return {
    key: CAPS_KEY,
    badges: S.badgesTaken.length,
    insights: S.insightsGot.length,
    stamps: S.stamps.length,
    daily: Object.keys(S.daily).length,
    evacBest: Object.keys(S.evacBest).length,
    photoBest: S.photoBest,
    available: (() => {
      try {
        localStorage.setItem("__t", "1");
        localStorage.removeItem("__t");
        return true;
      } catch (e) {
        return false;
      }
    })()
  };
}
function clear() {
  S = DEFAULT();
  try {
    localStorage.removeItem(CAPS_KEY);
  } catch (e) {
  }
  emit("clear");
}
var CAPS_KEY, DEFAULT, S, subs, dirty, firstWriteTs, onChange, api;
var init_caps = __esm({
  "src/game/caps.js"() {
    CAPS_KEY = "tidal_arena_caps_v1";
    DEFAULT = () => ({
      v: 1,
      badgesTaken: [],
      /* 已收集徽章 id */
      insightsGot: [],
      /* 已收录洞察 id */
      stamps: [],
      /* 已获得的印章 id */
      daily: {},
      /* { 'daily:2026-10-20': true } 每日挑战完成记录 */
      evacBest: {},
      /* { scenarioId: {t, grade, success} } */
      photoBest: 0,
      seen: {}
      /* 一次性提示（例如"已看过某说明"） */
    });
    S = DEFAULT();
    subs = /* @__PURE__ */ new Set();
    dirty = false;
    firstWriteTs = 0;
    load();
    onChange = (cb) => {
      if (typeof cb === "function") {
        subs.add(cb);
        return () => subs.delete(cb);
      }
      return () => {
      };
    };
    api = {
      KEY: CAPS_KEY,
      load,
      save,
      add,
      has,
      hasAll,
      setFlag,
      get,
      set,
      report,
      clear,
      onChange,
      get state() {
        return S;
      }
    };
    if (typeof window !== "undefined") window.__caps = api;
  }
});

// src/game/badges.js
import * as THREE15 from "three";
function haloTexture() {
  try {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    const g = cv.getContext("2d");
    const rg = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    rg.addColorStop(0, "rgba(255,255,255,0.95)");
    rg.addColorStop(0.22, "rgba(255,255,255,0.40)");
    rg.addColorStop(0.58, "rgba(255,255,255,0.10)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg;
    g.beginPath();
    g.arc(64, 64, 62, 0, Math.PI * 2);
    g.fill();
    const tex = new THREE15.CanvasTexture(cv);
    tex.colorSpace = THREE15.SRGBColorSpace;
    return tex;
  } catch (e) {
    return null;
  }
}
function createBadges(app) {
  const A = window.__app || app || {};
  const stage2 = A.stage || {};
  const scene = stage2.scene;
  if (!scene) return null;
  const container = A.arena?.root || scene;
  const group = new THREE15.Group();
  group.name = "GAME_BADGES";
  container.add(group);
  try {
    const legacy = scene.getObjectByName("BADGES");
    if (legacy && legacy !== group) legacy.visible = false;
  } catch (e) {
  }
  const halo = haloTexture();
  const geo = (() => {
    const g = new THREE15.OctahedronGeometry(0.62, 0);
    g.scale(1, 1, 1);
    return g;
  })();
  const ringGeo = new THREE15.TorusGeometry(1.05, 0.035, 6, 40);
  const list = [];
  DEFS.forEach((d) => {
    const node = new THREE15.Group();
    node.name = "badge-" + d.id;
    node.position.set(d.pos[0], d.pos[1], d.pos[2]);
    const core = new THREE15.Mesh(geo, new THREE15.MeshBasicMaterial({
      color: d.color,
      transparent: true,
      opacity: 0.95,
      toneMapped: false
    }));
    node.add(core);
    const ring = new THREE15.Mesh(ringGeo, new THREE15.MeshBasicMaterial({
      color: d.color,
      transparent: true,
      opacity: 0.55,
      toneMapped: false
    }));
    ring.rotation.x = Math.PI / 2;
    node.add(ring);
    if (halo) {
      const sp = new THREE15.Sprite(new THREE15.SpriteMaterial({
        map: halo,
        color: d.color,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: THREE15.AdditiveBlending,
        toneMapped: false
      }));
      sp.scale.set(7, 7, 1);
      node.add(sp);
    }
    group.add(node);
    list.push({ ...d, taken: false, obj: node, core, ring, pos: d.pos.slice(), _t: Math.random() * 6 });
  });
  const playerPos = () => {
    const w = A.walk;
    if (w && w.active && w.pos) return w.pos;
    const cam = stage2.camera;
    return cam ? cam.position : null;
  };
  let nearestCache = null;
  function nearest() {
    const p = playerPos();
    let best = null;
    let bd = Infinity;
    for (const b of list) {
      if (b.taken || !p) continue;
      const d = p.distanceTo(b.obj.position);
      if (d < bd) {
        bd = d;
        best = { ...b, dist: bd };
      }
    }
    nearestCache = best;
    return best;
  }
  function toastAll() {
    try {
      const n = list.filter((b) => b.taken).length;
      const row = document.getElementById("badgeRow");
      if (row) {
        Array.from(row.children).forEach((el, i) => el.classList.toggle("on", i < n));
        row.setAttribute("aria-label", `建筑徽章 ${n}/${list.length}`);
      }
    } catch (e) {
    }
  }
  function collect(b) {
    if (b.taken) return;
    b.taken = true;
    b.obj.visible = false;
    try {
      add("badgesTaken", b.id);
    } catch (e) {
    }
    try {
      window.__game?.awardBadge?.(b.id);
      A.ui?.toast?.("收集到建筑徽章", `${b.name} · ${b.desc}`, "gold");
      window.__audio?.sfx?.("badge");
    } catch (e) {
    }
    toastAll();
  }
  function restore() {
    let n = 0;
    try {
      const got = new Set(hasAll("badgesTaken"));
      for (const b of list) {
        if (!got.has(b.id)) continue;
        b.taken = true;
        b.obj.visible = false;
        n++;
      }
    } catch (e) {
    }
    toastAll();
    return n;
  }
  let t = 0;
  function update(dt) {
    t += dt;
    const p = playerPos();
    for (const b of list) {
      if (b.taken) continue;
      b.obj.rotation.y += dt * 0.9;
      b.obj.position.y = b.pos[1] + Math.sin(t * 1.4 + b._t) * 0.22;
      b.core.rotation.z += dt * 0.6;
      const pulse = 1 + Math.sin(t * 2.1 + b._t) * 0.07;
      b.obj.scale.setScalar(pulse);
      if (p && p.distanceTo(b.obj.position) < PICK_R) collect(b);
    }
  }
  function reset() {
    for (const b of list) {
      b.taken = false;
      b.obj.visible = true;
    }
    try {
      for (const b of list) {
        const arr = get("badgesTaken");
        const i = Array.isArray(arr) ? arr.indexOf(b.id) : -1;
        if (i >= 0) arr.splice(i, 1);
      }
      save();
    } catch (e) {
    }
    toastAll();
  }
  try {
    document.addEventListener("game:reset", () => {
      for (const b of list) {
        b.taken = false;
        b.obj.visible = true;
      }
      toastAll();
    });
  } catch (e) {
  }
  const api2 = { list, nearest: nearest(), update, reset, restore, group };
  Object.defineProperty(api2, "nearest", { get: nearest, configurable: true });
  window.__badges = api2;
  restore();
  return api2;
}
var P, PICK_R, DEFS;
var init_badges = __esm({
  "src/game/badges.js"() {
    init_sections();
    init_rings();
    init_caps();
    P = (u, s, y) => pt2(Math.round(u * SEGS2) % SEGS2, s, y);
    PICK_R = 4.5;
    DEFS = [
      {
        id: "b1",
        name: "广场徽章",
        zone: "球迷广场",
        desc: "主轴尽端 · 6 万 m² 广场",
        pos: P(0, GEO2.outerS + 16, GEO2.groundY + 1.5).toArray(),
        color: 16765562
      },
      {
        id: "b2",
        name: "门厅徽章",
        zone: "入口大厅",
        desc: "24m 券洞 · 检票门厅",
        pos: P(0, GEO2.outerS - 3, 1.6).toArray(),
        color: 10479359
      },
      {
        id: "b3",
        name: "一层环廊徽章",
        zone: "一层环廊",
        desc: "净宽 13m · 南侧环廊",
        pos: P(0.5, (L12.cS0 + L12.cS1) / 2, L12.cY + 1.5).toArray(),
        color: 16756932
      },
      {
        id: "b4",
        name: "二层环廊徽章",
        zone: "二层环廊",
        desc: "净宽 11m · 全场俯瞰",
        pos: P(0, (L22.cS0 + L22.cS1) / 2, L22.cY + 1.5).toArray(),
        color: 14137087
      },
      {
        id: "b5",
        name: "冠军徽章",
        zone: "场地中圈",
        desc: "105×68m 天然草 · 中圈",
        pos: [0, GEO2.groundY + 1.8, 0],
        color: 9433288
      }
    ];
  }
});

// src/game/evacuation.js
import * as THREE16 from "three";
function createSim(info) {
  info = info || {};
  const TOTAL3 = info.total > 0 ? info.total : 80952;
  const sc = SC(info.scenario);
  const tierRows = info.tierRows || null;
  const rowOf = (ti, c, perZone2) => {
    const rows = tierRows && tierRows[ti] || null;
    if (rows && rows.length) return rows[Math.min(rows.length - 1, Math.floor(c / perZone2 * rows.length))] || rows[0];
    return { sFront: 18 + c * 4, y: [3, 14, 25][ti] + c * 0.8 };
  };
  const ZONE_CAP = TOTAL3 / (N_ZONES * N_TIERS);
  const limit = info.limit > 0 ? info.limit : sc.limit || BASE_LIMIT;
  const capMul = sc.capMul != null ? sc.capMul : 1;
  const walkMul = sc.walkMul != null ? sc.walkMul : 1;
  const seed = info.seed | 0 || 20261020;
  const exits = EXITS2.map((e, i) => {
    const main = e.kind === "main";
    const seg = Math.round(e.u * SEGS2) % SEGS2;
    const p = pt2(seg, GEO2.outerS + 1, main ? 4.2 : 2.4);
    const base = (main ? MAIN_CAP : SUB_CAP) * (main && sc.mainPenalty ? sc.mainPenalty : 1) * capMul;
    return {
      idx: i,
      id: e.id,
      u: e.u,
      kind: e.kind,
      name: e.name,
      main,
      cost: main ? 2 : 1,
      cap: Math.max(40, Math.round(base)),
      open: false,
      want: false,
      load: 0,
      flow: 0,
      cong: 0,
      wait: 0,
      pos: p.clone(),
      seg,
      swapT: 0
    };
  });
  const openSeed = info.openSeed || ["P1", "P2", "P3", "P4", "S1", "S5"];
  exits.forEach((e) => {
    e.open = openSeed.includes(e.id);
    e.want = e.open;
  });
  const usedTeams = () => exits.reduce((a, e) => a + (e.want ? e.cost : 0), 0);
  const clumps = [];
  const zw = [];
  {
    let s = seed;
    const R = () => {
      s = s + 1831565813 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    for (let z = 0; z < N_ZONES; z++) zw.push(0.62 + R() * 0.9);
  }
  const zsum = zw.reduce((a, b) => a + b, 0);
  const perZone = Math.round(CLIQUES / (N_TIERS * N_ZONES));
  for (let ti = 0; ti < N_TIERS; ti++) {
    for (let z = 0; z < N_ZONES; z++) {
      const zu = (z + 0.5) / N_ZONES;
      for (let c = 0; c < perZone; c++) {
        const row = rowOf(ti, c, perZone);
        const n = Math.max(40, Math.round(TOTAL3 / CLIQUES * (zw[z] * N_ZONES / zsum)));
        clumps.push({
          ti,
          z,
          u: zu,
          n,
          s: (row.sFront || 20) + 0.42,
          y: (row.y || 0) + 1,
          delay: 0.4 + c * 0.45 + z * 0.05 + ti * 1,
          p: 0,
          done: false,
          exit: -1,
          stuck: false,
          zone: ti * N_ZONES + z
        });
      }
    }
  }
  {
    const real = clumps.reduce((a, x) => a + x.n, 0);
    const k = TOTAL3 / real;
    clumps.forEach((x) => {
      x.n = Math.max(20, Math.round(x.n * k));
    });
    const diff = TOTAL3 - clumps.reduce((a, x) => a + x.n, 0);
    if (diff !== 0) {
      let big = clumps[0];
      for (const c of clumps) if (c.n > big.n) big = c;
      big.n = Math.max(20, big.n + diff);
    }
  }
  const walkTo = (c, e) => (WALK_BASE + WALK_DU * du(c.u, e.u) + c.ti * WALK_TIER) * walkMul;
  const st = {
    total: TOTAL3,
    evacuated: 0,
    remaining: TOTAL3,
    elapsed: 0,
    success: 0,
    score: 0,
    running: false,
    paused: false,
    done: false,
    zones: new Array(N_ZONES * N_TIERS).fill(0),
    wave: 0,
    peak: 0,
    grade: "—",
    teams: usedTeams(),
    teamMax: TEAMS,
    broadcast: BROADCAST_MAX,
    broadcastT: 0,
    limit,
    finishReason: "",
    swapT: 0,
    scenario: sc.id,
    scenarioLabel: sc.name,
    offDuty: 0
    /* 被广播抽调走的班组 */
  };
  function route(c, dem) {
    let best = -1, bc = Infinity;
    const wMul = 1 - st.offDuty * 0.5;
    for (const e of exits) {
      if (!e.open) continue;
      const wait = Math.min((dem[e.idx] || 0) / e.cap, QUEUE_CAP);
      const cost = walkTo(c, e) + wait * WAIT_W * wMul;
      if (cost < bc) {
        bc = cost;
        best = e.idx;
      }
    }
    if (best >= 0) c.exit = best;
    c.stuck = best < 0;
  }
  function routeAll() {
    const dem = exits.map(() => 0);
    for (const c of clumps) if (!c.done && c.exit >= 0) dem[c.exit] += c.n;
    for (const c of clumps) if (!c.done) route(c, dem);
  }
  function setExit(id, open) {
    const e = exits.find((x) => x.id === id);
    if (!e) return { ok: false, reason: "no-exit" };
    const want = !!open;
    if (e.want === want) return { ok: true, reason: "same" };
    const need = usedTeams() + (want ? e.cost : -e.cost);
    if (want && need > TEAMS - st.offDuty) {
      return { ok: false, reason: "no-teams", need, have: TEAMS - st.offDuty, cost: e.cost, name: e.name };
    }
    e.want = want;
    e.swapT = SWAP_DELAY;
    routeAll();
    return { ok: true, reason: "queued", name: e.name };
  }
  const toggleExit = (id) => {
    const e = exits.find((x) => x.id === id);
    if (!e) return { ok: false, reason: "no-exit" };
    return setExit(id, !e.want);
  };
  function broadcast() {
    if (st.broadcast <= 0 || st.done) return { ok: false, reason: "empty" };
    if (TEAMS - st.offDuty - usedTeams() < BROADCAST_COST && usedTeams() + BROADCAST_COST > TEAMS) {
      return { ok: false, reason: "no-teams", need: BROADCAST_COST };
    }
    st.broadcast -= 1;
    st.broadcastT = BROADCAST_T * (sc.broadcastMul || 1);
    st.offDuty += BROADCAST_COST;
    let worst = null;
    for (const e of exits) if (e.open && (!worst || e.wait > worst.wait)) worst = e;
    st.broadcastTarget = worst ? worst.id : null;
    for (const e of exits) e.cong = Math.max(0, e.cong - 0.2);
    routeAll();
    return { ok: true, target: st.broadcastTarget };
  }
  function update(dt) {
    if (!st.running || st.paused || st.done) return;
    st.elapsed += dt;
    st.wave = Math.min(6, 1 + Math.floor(st.elapsed / 25));
    for (const e of exits) {
      if (e.swapT > 0) {
        e.swapT = Math.max(0, e.swapT - dt);
        if (e.swapT === 0) e.open = e.want;
      }
    }
    if (st.broadcastT > 0) {
      st.broadcastT = Math.max(0, st.broadcastT - dt);
      if (st.broadcastT === 0 && st.offDuty > 0) {
        st.offDuty = Math.max(0, st.offDuty - BROADCAST_COST);
      }
    }
    const dem = exits.map(() => 0);
    for (const c of clumps) if (!c.done && c.exit >= 0) dem[c.exit] += c.n;
    for (const c of clumps) if (!c.done) route(c, dem);
    const dem2 = exits.map(() => 0);
    for (const c of clumps) if (!c.done && c.exit >= 0) dem2[c.exit] += c.n;
    for (const e of exits) {
      e.load = dem2[e.idx] || 0;
      e.flow = 0;
      e.wait = e.open ? e.load / Math.max(1, e.cap) : 0;
      e.cong = clamp2(e.wait / 45, 0, 1.6);
    }
    const boost = st.broadcastT > 0 ? 1.25 : 1;
    for (const c of clumps) {
      if (c.done || st.elapsed < c.delay) continue;
      if (c.exit < 0) continue;
      const e = exits[c.exit];
      const d = Math.max(1, dem2[c.exit]);
      const service = e.cap / d;
      const walking = 1 / walkTo(c, e);
      const rate = Math.min(service, walking) * boost;
      c.p = clamp2(c.p + dt * rate, 0, 1);
      if (c.p >= 1) {
        c.done = true;
        e.flow += c.n;
      }
    }
    const flow = new Array(N_ZONES * N_TIERS).fill(0);
    let out = 0;
    for (const c of clumps) {
      if (c.done) {
        out += c.n;
        continue;
      }
      if (c.p > 0.02 && c.p < 1) flow[c.zone] += c.n * (1 - c.p * 0.55);
    }
    st.evacuated = out;
    st.remaining = Math.max(0, TOTAL3 - out);
    for (let i = 0; i < flow.length; i++) st.zones[i] = clamp2(flow[i] / ZONE_CAP, 0, 1);
    const avgCong = st.zones.reduce((s, v) => s + v, 0) / st.zones.length;
    if (avgCong > st.peak) st.peak = avgCong;
    st.teams = usedTeams();
    st.success = st.remaining > 0 ? clamp2(st.evacuated / TOTAL3, 0, 1) : 1;
    st.score = Math.round(st.success * 100);
    if (st.remaining <= 0) finish("全部疏散");
    else if (st.elapsed >= st.limit) finish("超时滞留");
  }
  function gradeOf() {
    if (st.success < 0.85) return "D";
    if (st.success >= 0.999 && st.elapsed <= GRADE_S) return "S";
    if (st.success >= 0.999 && st.elapsed <= GRADE_A) return "A";
    if (st.success >= 0.95) return "B";
    return "C";
  }
  function finish(reason) {
    st.done = true;
    st.running = false;
    st.finishReason = reason;
    st.success = clamp2(st.evacuated / TOTAL3, 0, 1);
    st.score = Math.round(st.success * 100);
    st.grade = gradeOf();
  }
  function start() {
    st.evacuated = 0;
    st.remaining = TOTAL3;
    st.elapsed = 0;
    st.success = 0;
    st.score = 0;
    st.done = false;
    st.wave = 0;
    st.peak = 0;
    st.grade = "—";
    st.broadcast = BROADCAST_MAX;
    st.broadcastT = 0;
    st.offDuty = 0;
    st.finishReason = "";
    st.broadcastTarget = null;
    st.zones = new Array(N_ZONES * N_TIERS).fill(0);
    for (const c of clumps) {
      c.p = 0;
      c.done = false;
      c.exit = -1;
      c.stuck = false;
    }
    for (const e of exits) {
      e.open = e.want;
      e.swapT = 0;
      e.load = 0;
      e.flow = 0;
      e.cong = 0;
      e.wait = 0;
    }
    st.teams = usedTeams();
    st.running = true;
    st.paused = false;
    return st;
  }
  function reset() {
    st.evacuated = 0;
    st.remaining = TOTAL3;
    st.elapsed = 0;
    st.success = 0;
    st.score = 0;
    st.running = false;
    st.paused = false;
    st.done = false;
    st.wave = 0;
    st.peak = 0;
    st.grade = "—";
    st.broadcast = BROADCAST_MAX;
    st.broadcastT = 0;
    st.swapT = 0;
    st.finishReason = "";
    st.offDuty = 0;
    st.broadcastTarget = null;
    st.zones = new Array(N_ZONES * N_TIERS).fill(0);
    for (const c of clumps) {
      c.p = 0;
      c.done = false;
      c.exit = -1;
      c.stuck = false;
    }
    for (const e of exits) {
      e.swapT = 0;
      e.load = 0;
      e.flow = 0;
      e.cong = 0;
      e.wait = 0;
      e.open = openSeed.includes(e.id);
      e.want = e.open;
    }
    st.teams = usedTeams();
    return st;
  }
  function pause() {
    if (!st.running) return st.paused;
    st.paused = !st.paused;
    return st.paused;
  }
  return {
    st,
    exits,
    clumps,
    scenario: sc,
    limit,
    update,
    start,
    pause,
    reset,
    setExit,
    toggleExit,
    broadcast,
    routeAll,
    gradeOf,
    get usedTeams() {
      return usedTeams();
    }
  };
}
function createEvac(app) {
  const A = window.__app || app || {};
  const stage2 = A.stage || {};
  const scene = stage2.scene;
  if (!scene) return null;
  const MODEL2 = A.arena && A.arena.model;
  const TOTAL3 = MODEL2 && Number.isFinite(MODEL2.total) && MODEL2.total > 0 ? MODEL2.total : 80952;
  const tiers = MODEL2 && Array.isArray(MODEL2.tiers) && MODEL2.tiers.length ? MODEL2.tiers : null;
  const tierRows = tiers ? tiers.map((t) => Array.isArray(t.rows) ? t.rows : null) : null;
  let sim = null;
  let scenarioId = "calm";
  const subs2 = /* @__PURE__ */ new Set();
  let heatMesh = null;
  let groups = null;
  const HEAT_MAX = CLIQUES;
  try {
    heatMesh = new THREE16.InstancedMesh(
      new THREE16.SphereGeometry(1, 8, 6),
      new THREE16.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }),
      HEAT_MAX
    );
    heatMesh.name = "GAME_EVAC_HEAT";
    heatMesh.frustumCulled = false;
    heatMesh.visible = false;
    heatMesh.instanceMatrix.setUsage(THREE16.DynamicDrawUsage);
    scene.add(heatMesh);
  } catch (e) {
    heatMesh = null;
  }
  const gateGroup = new THREE16.Group();
  gateGroup.name = "GAME_EVAC_GATES";
  scene.add(gateGroup);
  const gateGeo = new THREE16.BoxGeometry(2.2, 2.2, 0.5);
  const gates = EXITS2.map((e) => {
    const main = e.kind === "main";
    const p = pt2(Math.round(e.u * SEGS2) % SEGS2, GEO2.outerS + 1, main ? 4.2 : 2.4);
    const m = new THREE16.Mesh(gateGeo, new THREE16.MeshBasicMaterial({
      color: 6274954,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      toneMapped: false
    }));
    m.position.copy(p);
    m.renderOrder = 880;
    gateGroup.add(m);
    return m;
  });
  const dummy = new THREE16.Object3D();
  const col = new THREE16.Color();
  function snap() {
    const s = sim.st;
    return {
      total: s.total,
      evacuated: s.evacuated,
      remaining: s.remaining,
      elapsed: s.elapsed,
      success: s.success,
      score: s.score,
      running: s.running,
      paused: s.paused,
      done: s.done,
      zones: s.zones.slice(),
      wave: s.wave,
      grade: s.grade,
      teams: s.teams,
      teamMax: s.teamMax,
      broadcast: s.broadcast,
      broadcastT: s.broadcastT,
      limit: s.limit,
      finishReason: s.finishReason,
      swapT: s.swapT,
      offDuty: s.offDuty,
      broadcastTarget: s.broadcastTarget,
      scenario: scenarioId,
      scenarioLabel: sim.scenario.name,
      scenarioBrief: sim.scenario.brief,
      exits: sim.exits.map((e) => ({
        id: e.id,
        name: e.name,
        kind: e.kind,
        open: e.open,
        want: e.want,
        cost: e.cost,
        cap: e.cap,
        load: e.load,
        cong: e.cong,
        wait: e.wait,
        flow: e.flow,
        swapT: e.swapT
      }))
    };
  }
  function emit2(reason) {
    const s = snap();
    for (const cb of subs2) {
      try {
        cb(s, reason);
      } catch (e) {
      }
    }
    try {
      document.dispatchEvent(new CustomEvent("evac:changed", { detail: s }));
    } catch (e) {
    }
  }
  const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lerp2 = (a, b, t) => a + (b - a) * t;
  function applyMatrices() {
    if (!heatMesh) return;
    const clumps = sim.clumps, exits = sim.exits, st = sim.st;
    for (let i = 0; i < clumps.length; i++) {
      const c = clumps[i];
      if (c.done) {
        dummy.position.set(0, -9999, 0);
        dummy.scale.setScalar(1e-4);
      } else {
        const ex = c.exit >= 0 ? exits[c.exit] : null;
        const tgtU = ex ? ex.u : c.u;
        const swing = ease(clamp2(c.p / 0.62, 0, 1));
        const u = c.u + (tgtU - c.u) * swing;
        const out = clamp2((c.p - 0.62) / 0.38, 0, 1);
        const r0 = c.s + 4;
        const rE = ex ? 108 + 6 : r0 + 50;
        const r = lerp2(r0, rE, ease(out));
        const d = dirOf(u);
        const y = lerp2(c.y, ex ? 1.2 : 0.8, ease(clamp2(c.p / 0.8, 0, 1))) - out * 0.8;
        const rad = clamp2(Math.sqrt(c.n) * 0.28, 1.2, 3.6) * (1 + out * 0.35);
        dummy.position.set(d.x * r, y, d.z * r);
        dummy.scale.setScalar(rad);
      }
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      heatMesh.setMatrixAt(i, dummy.matrix);
      const cg = c.done ? 0 : st.zones[c.zone] || 0;
      if (cg > 0.66) col.setRGB(0.89, 0.38, 0.25);
      else if (cg > 0.33) col.setRGB(0.88, 0.66, 0.29);
      else col.setRGB(0.37, 0.75, 0.54);
      heatMesh.setColorAt(i, col);
    }
    heatMesh.instanceMatrix.needsUpdate = true;
    if (heatMesh.instanceColor) heatMesh.instanceColor.needsUpdate = true;
  }
  function paintGates() {
    sim.exits.forEach((e, i) => {
      const g = gates[i];
      if (!g) return;
      const c = e.swapT > 0 ? 14723403 : e.open ? e.wait > 35 ? 14835775 : e.wait > 18 ? 14723403 : 6274954 : 7042949;
      g.material.color.setHex(c);
      const s = e.open ? 1 + Math.min(0.5, e.cong * 0.5) : 0.7;
      g.scale.set(s, s, 1);
      g.material.opacity = e.open ? 0.92 : 0.5;
    });
  }
  function build(id) {
    scenarioId = SC(id).id;
    sim = createSim({ total: TOTAL3, scenario: scenarioId, tierRows });
    if (heatMesh) heatMesh.visible = false;
    applyMatrices();
    paintGates();
  }
  function finishHook() {
    const s = sim.st;
    if (heatMesh) heatMesh.visible = false;
    try {
      window.__game?.evacDone?.({ successRate: s.success, time: s.elapsed, rating: s.grade, scenario: scenarioId });
      const ok = s.success >= 0.85;
      A.ui?.toast?.(
        ok ? `疏散达标 · ${sim.scenario.name}` : `疏散未达标 · ${sim.scenario.name}`,
        `${Math.round(s.elapsed)}″ / ${s.limit}″ · 成功率 ${Math.round(s.success * 100)}% · 峰值拥堵 ${(s.peak * 100).toFixed(0)}% · 评级 ${s.grade}`,
        ok ? "green" : "red"
      );
    } catch (e) {
    }
    try {
      window.__contest?.submitEvac?.(scenarioId, { t: s.elapsed, grade: s.grade, success: s.success });
    } catch (e) {
    }
  }
  function setExit(id, open) {
    const r = sim.setExit(id, open);
    if (!r.ok && r.reason === "no-teams") {
      try {
        A.ui?.toast?.("人力不足", `开启 ${r.name} 需要 ${r.cost} 组人力，可用 ${r.need - r.cost} 组（已含广播抽调）`, "red");
      } catch (e) {
      }
    }
    emit2(r.ok ? "swap" : "budget");
    return r.ok;
  }
  const toggleExit = (id) => {
    const e = sim.exits.find((x) => x.id === id);
    if (!e) return false;
    return setExit(id, !e.want);
  };
  function broadcast() {
    const r = sim.broadcast();
    if (r.ok) {
      try {
        A.ui?.toast?.("应急广播", `抽调 ${BROADCAST_COST} 组班组 · 疏导最拥堵出口 ${r.target || "—"}（${Math.round(sim.st.broadcastT)} 秒）`, "plain");
      } catch (e) {
      }
    } else {
      try {
        A.ui?.toast?.("无法广播", r.reason === "no-teams" ? `需要 ${BROADCAST_COST} 组可抽调班组，请先关闭部分出口` : "广播次数已用完", "red");
      } catch (e) {
      }
    }
    emit2(r.ok ? "broadcast" : "budget");
    return r.ok;
  }
  function start() {
    sim.start();
    if (heatMesh) {
      heatMesh.visible = true;
      applyMatrices();
    }
    emit2("start");
    return snap();
  }
  function pause() {
    const p = sim.pause();
    emit2("pause");
    return p;
  }
  function reset(id) {
    if (id && SC(id).id !== scenarioId) build(id);
    else sim.reset();
    if (heatMesh) {
      heatMesh.visible = false;
      applyMatrices();
    }
    paintGates();
    emit2("reset");
    return snap();
  }
  function simulate(opts) {
    const o = opts || {};
    const s = createSim({ total: TOTAL3, scenario: o.scenario || scenarioId, tierRows, limit: o.limit });
    if (typeof o.policy === "function") o.policy(s);
    else if (Array.isArray(o.open)) s.exits.forEach((e) => {
      if (o.open.includes(e.id) !== e.want) s.setExit(e.id, o.open.includes(e.id));
    });
    s.start();
    const step2 = 0.1;
    let guard = 0;
    while (!s.st.done && guard++ < 5e3) {
      s.update(step2);
      if (typeof o.each === "function") o.each(s);
    }
    const t = s.st;
    return {
      scenario: s.scenario.id,
      done: t.done,
      elapsed: +t.elapsed.toFixed(1),
      success: t.success,
      grade: t.grade,
      peak: t.peak,
      reason: t.finishReason,
      total: t.total,
      evacuated: t.evacuated
    };
  }
  const api2 = {
    start,
    pause,
    reset,
    update: null,
    setExit,
    toggleExit,
    broadcast,
    simulate,
    state: snap,
    get total() {
      return sim.st.total;
    },
    get evacuated() {
      return sim.st.evacuated;
    },
    get remaining() {
      return sim.st.remaining;
    },
    get elapsed() {
      return sim.st.elapsed;
    },
    get success() {
      return sim.st.success;
    },
    get score() {
      return sim.st.score;
    },
    get running() {
      return sim.st.running;
    },
    get paused() {
      return sim.st.paused;
    },
    get done() {
      return sim.st.done;
    },
    get zones() {
      return sim.st.zones;
    },
    get heat() {
      return heatMesh;
    },
    get exits() {
      return snap().exits;
    },
    get teams() {
      return sim.st.teams;
    },
    get teamMax() {
      return sim.st.teamMax;
    },
    get grade() {
      return sim.st.grade;
    },
    get peak() {
      return sim.st.peak;
    },
    get finishReason() {
      return sim.st.finishReason;
    },
    get limit() {
      return sim.st.limit;
    },
    get broadcastLeft() {
      return sim.st.broadcast;
    },
    get scenario() {
      return { id: scenarioId, ...SC(scenarioId) };
    },
    get scenarioId() {
      return scenarioId;
    },
    get scenarioIds() {
      return SCENARIOS.map((s) => s.id);
    },
    get scenarioLabel() {
      return sim.scenario.name;
    },
    get scenarioBrief() {
      return sim.scenario.brief;
    },
    get scenarios() {
      return SCENARIOS.slice();
    },
    get openSeed() {
      return sim.exits.filter((e) => e.want).map((e) => e.id);
    },
    /* 容量真源变化时重建（当前是静态的，保留接口以备扩容） */
    recomputeTotal(n) {
      if (n > 0 && n !== sim.st.total) {
        sim = createSim({ total: n, scenario: scenarioId, tierRows });
      }
      return sim.st.total;
    },
    on(cb) {
      if (typeof cb === "function") {
        subs2.add(cb);
        return () => subs2.delete(cb);
      }
      return () => {
      };
    },
    get group() {
      return gateGroup;
    }
  };
  let wasRunning = false;
  let paintT = 0;
  api2.update = (dt) => {
    const wasDone = sim.st.done;
    sim.update(dt);
    paintT += dt;
    if (paintT > 0.12) {
      paintT = 0;
      paintGates();
    }
    if (sim.st.running || wasRunning) applyMatrices();
    wasRunning = sim.st.running;
    if (!wasDone && sim.st.done) finishHook();
    emit2("tick");
  };
  build("calm");
  window.__evac = api2;
  return api2;
}
var CLIQUES, N_ZONES, N_TIERS, BASE_LIMIT, TEAMS, BROADCAST_MAX, BROADCAST_T, BROADCAST_COST, SWAP_DELAY, MAIN_CAP, SUB_CAP, WALK_BASE, WALK_DU, WALK_TIER, WAIT_W, QUEUE_CAP, GRADE_S, GRADE_A, clamp2, dirOf, du, SCENARIOS, SC;
var init_evacuation = __esm({
  "src/game/evacuation.js"() {
    init_sections();
    init_rings();
    CLIQUES = 600;
    N_ZONES = 20;
    N_TIERS = 3;
    BASE_LIMIT = 110;
    TEAMS = 10;
    BROADCAST_MAX = 3;
    BROADCAST_T = 12;
    BROADCAST_COST = 2;
    SWAP_DELAY = 6;
    MAIN_CAP = 230;
    SUB_CAP = 130;
    WALK_BASE = 7;
    WALK_DU = 26;
    WALK_TIER = 7;
    WAIT_W = 0.3;
    QUEUE_CAP = 20;
    GRADE_S = 70;
    GRADE_A = 90;
    clamp2 = (v, a, b) => v < a ? a : v > b ? b : v;
    dirOf = (u) => ({ x: Math.sin(u * Math.PI * 2), z: Math.cos(u * Math.PI * 2) });
    du = (a, b) => {
      const d = Math.abs(a - b) % 1;
      return Math.min(d, 1 - d);
    };
    SCENARIOS = [
      {
        id: "calm",
        name: "晴好夜赛",
        en: "CLEAR NIGHT",
        limit: 110,
        capMul: 1,
        walkMul: 1,
        brief: "无风无雨，出口能力正常。标准工况：先摸清 12 个出口和看台的关系。",
        accent: "#6fd3e0"
      },
      {
        id: "rain",
        name: "暴雨",
        en: "HEAVY RAIN",
        limit: 118,
        capMul: 0.86,
        walkMul: 1.14,
        brief: '暴雨：闸机放慢、人群走不快。需要靠"多开几个口"把吞吐摊开。',
        accent: "#8aa4c8"
      },
      {
        id: "power",
        name: "停电",
        en: "POWER CUT",
        limit: 132,
        capMul: 1,
        walkMul: 1.06,
        brief: "停电：4 个主券洞的动力闸机失效，效率只剩不到一半 —— 必须改走分散的次门。",
        accent: "#ff8a5c",
        mainPenalty: 0.45
      },
      {
        id: "kickoff",
        name: "开赛前 5 分钟",
        en: "KICK-OFF RUSH",
        limit: 104,
        capMul: 0.94,
        walkMul: 0.94,
        brief: "开赛倒计时：时限只剩 104s，人群更急。冗余不多，选错一处就超时。",
        accent: "#e8c07a",
        broadcastMul: 1.5
      }
    ];
    SC = (id) => SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
  }
});

// src/game/construction.js
import * as THREE17 from "three";
function createConstruction(app) {
  const A = window.__app || app || {};
  const stage2 = A.stage || {};
  const groups = A.arena && A.arena.groups || {};
  const renderer = stage2.renderer;
  try {
    if (renderer) renderer.localClippingEnabled = true;
  } catch (e) {
  }
  let cloneBudget = 140;
  const plan = STAGES.map((s) => {
    const meshes = [];
    const mats = /* @__PURE__ */ new Map();
    s.groups.forEach((gn) => {
      const g = groups[gn];
      if (!g || !g.traverse) return;
      g.traverse((o) => {
        if (!o.isMesh && !o.isInstancedMesh) return;
        if (!o.material) return;
        meshes.push(o);
        const arr = Array.isArray(o.material) ? o.material : [o.material];
        arr.forEach((m) => {
          if (m && !mats.has(m)) mats.set(m, null);
        });
      });
    });
    let minY = s.y[0];
    let maxY = s.y[1];
    try {
      const box = new THREE17.Box3();
      let valid = false;
      s.groups.forEach((gn) => {
        const g = groups[gn];
        if (!g) return;
        g.traverse((o) => {
          if (!o.isMesh && !o.isInstancedMesh) return;
          if (!o.geometry) return;
          o.geometry.computeBoundingBox?.();
          const bb = o.geometry.boundingBox;
          if (!bb) return;
          const b2 = bb.clone().applyMatrix4(o.matrixWorld);
          box.union(b2);
          valid = true;
        });
      });
      if (valid && isFinite(box.min.y) && box.max.y - box.min.y > 2) {
        minY = box.min.y;
        maxY = box.max.y;
      }
    } catch (e) {
    }
    return { meshes, mats, minY, maxY, plane: new THREE17.Plane(new THREE17.Vector3(0, 1, 0), 0), cloned: false };
  });
  function ensureClones(p) {
    if (p.cloned || !p.mats.size) return;
    if (cloneBudget < p.mats.size) return;
    cloneBudget -= p.mats.size;
    p.mats.forEach((_, m) => {
      let c;
      try {
        c = m.clone();
      } catch (e) {
        c = null;
      }
      if (c) {
        c.clippingPlanes = [p.plane];
        c.clipShadows = true;
        p.mats.set(m, c);
      }
    });
    p.meshes.forEach((o) => {
      const orig = Array.isArray(o.material) ? o.material : [o.material];
      const next = orig.map((m) => p.mats.get(m) || m);
      if (!o.userData.__origMat) o.userData.__origMat = o.material;
      o.material = Array.isArray(o.material) ? next : next[0];
    });
    p.cloned = true;
  }
  function restore(p) {
    if (!p.cloned) return;
    p.meshes.forEach((o) => {
      if (o.userData.__origMat) {
        o.material = o.userData.__origMat;
        delete o.userData.__origMat;
      }
    });
    p.cloned = false;
  }
  const S2 = { phase: 100, playing: false, speed: 100 / 14 };
  function apply(percent) {
    const t = clamp3(percent, 0, 100) / 20;
    let stageName = STAGES[STAGES.length - 1].name;
    for (let i = 0; i < STAGES.length; i++) {
      const st = STAGES[i];
      const gs = st.groups.map((n) => groups[n]).filter(Boolean);
      const p = clamp3(t - i, 0, 1);
      if (p >= 1) {
        gs.forEach((g) => {
          g.visible = true;
        });
        restore(plan[i]);
      } else if (p <= 0) {
        gs.forEach((g) => {
          g.visible = false;
        });
        restore(plan[i]);
      } else {
        gs.forEach((g) => {
          g.visible = true;
        });
        stageName = st.name;
        const pl = plan[i];
        const y = pl.minY + (pl.maxY - pl.minY) * p;
        pl.plane.constant = -y;
        ensureClones(pl);
      }
    }
    S2.phase = Math.round(percent * 10) / 10;
    try {
      document.dispatchEvent(new CustomEvent("build:phase", {
        detail: { phase: S2.phase, stage: stageName }
      }));
    } catch (e) {
    }
    return S2.phase;
  }
  function setPhase(v) {
    const n = typeof v === "number" && isFinite(v) ? v : 100;
    const percent = n <= 5 ? n * 20 : n;
    return apply(percent);
  }
  function play() {
    S2.playing = true;
    if (S2.phase >= 99.9) apply(0);
    return S2.playing;
  }
  function stop() {
    S2.playing = false;
    return S2.playing;
  }
  function update(dt) {
    if (!S2.playing) return;
    const next = S2.phase + S2.speed * dt;
    apply(next);
    if (next >= 100) {
      S2.playing = false;
      apply(100);
    }
  }
  function stageIndex() {
    return clamp3(Math.floor(S2.phase / 20), 0, 4);
  }
  const api2 = {
    setPhase,
    play,
    stop,
    update,
    stages: STAGES,
    get phase() {
      return S2.phase;
    },
    get playing() {
      return S2.playing;
    },
    get stageName() {
      return STAGES[stageIndex()].name;
    },
    get stageDesc() {
      return STAGES[stageIndex()].desc;
    }
  };
  apply(100);
  window.__build = api2;
  return api2;
}
var clamp3, STAGES;
var init_construction = __esm({
  "src/game/construction.js"() {
    clamp3 = (v, a, b) => v < a ? a : v > b ? b : v;
    STAGES = [
      { name: "基础与场地", desc: "场地 / 基座 / 潮柱结构", groups: ["pitch", "structure"], y: [-2, 22] },
      { name: "看台与环廊", desc: "三层看台 / 8 万座席 / 环廊", groups: ["bowl", "seats", "concourse"], y: [0, 34] },
      { name: "屋盖与结构", desc: "24 榀径向桁架 / 鞍面屋盖", groups: ["roof"], y: [32, 48] },
      { name: "立面与室内", desc: "三道潮线立面 / 门厅与包厢", groups: ["facade", "interior", "glow"], y: [-2, 26] },
      { name: "竣工", desc: "全部构件就位 · 竣工状态", groups: [], y: [0, 0] }
    ];
  }
});

// src/game/photo.js
import * as THREE18 from "three";
function createPhoto(app) {
  const A = window.__app || app || {};
  const stage2 = A.stage || {};
  const S2 = { on: false, exposure: 0, focal: 42, aperture: 8, filter: "none", shots: 0, best: 0 };
  function rerender() {
    try {
      const r = stage2.renderer;
      if (r && stage2.scene && stage2.camera) r.render(stage2.scene, stage2.camera);
    } catch (e) {
    }
  }
  function enter() {
    S2.on = true;
    try {
      document.body.classList.add("photo");
      document.body.classList.remove("photo-hide");
      const bar = document.getElementById("photoBar");
      if (bar) bar.hidden = false;
    } catch (e) {
    }
    try {
      A.ui?.openPanel?.(null);
    } catch (e) {
    }
    try {
      window.__game?.setMode?.("photo");
    } catch (e) {
    }
    return S2.on;
  }
  function exit() {
    S2.on = false;
    try {
      document.body.classList.remove("photo");
      document.body.classList.remove("photo-hide");
      const bar = document.getElementById("photoBar");
      if (bar) bar.hidden = true;
    } catch (e) {
    }
    try {
      window.__game?.setMode?.("explore");
    } catch (e) {
    }
    return S2.on;
  }
  function setExposure(v) {
    S2.exposure = clamp4(+v || 0, -1.2, 1.2);
    const r = stage2.renderer;
    if (r) {
      if (S2._baseExp == null) S2._baseExp = r.toneMappingExposure;
      r.toneMappingExposure = Math.max(0.05, S2._baseExp * Math.pow(2, S2.exposure));
    }
    return S2.exposure;
  }
  function setFocal(v) {
    S2.focal = clamp4(+v || 42, 18, 85);
    const cam = stage2.camera;
    if (cam && cam.isPerspectiveCamera) {
      cam.fov = clamp4(2 * Math.atan(18 / S2.focal) * 180 / Math.PI, 8, 90);
      cam.updateProjectionMatrix();
    }
    return S2.focal;
  }
  function setFilter(name) {
    S2.filter = String(name || "none");
    try {
      ["warm", "mono", "cyan"].forEach((f) => {
        document.body.classList.toggle("photo-filter-" + f, f === S2.filter);
      });
    } catch (e) {
    }
    return S2.filter;
  }
  function shot() {
    const out = { ok: false, len: 0, name: "" };
    try {
      rerender();
      const r = stage2.renderer;
      const cv = r && r.domElement;
      if (!cv || typeof cv.toDataURL !== "function") {
        out.error = "no-canvas";
        return out;
      }
      let url = "";
      try {
        url = cv.toDataURL("image/png");
      } catch (e) {
        out.error = String(e && e.message || e);
        return out;
      }
      if (!url || url.length < 64) {
        out.error = "empty";
        return out;
      }
      out.ok = true;
      out.len = url.length;
      const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
      out.name = `tidal-arena-${ts}.png`;
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = out.name;
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try {
            a.remove();
          } catch (e) {
          }
        }, 0);
      } catch (e) {
        out.download = false;
      }
      S2.shots += 1;
      try {
        if (window.__game?.stats) window.__game.stats.photos = S2.shots;
        window.__audio?.sfx?.("shutter");
      } catch (e) {
      }
      try {
        const sc = score();
        if (sc) {
          out.score = sc;
          const mul = (() => {
            try {
              return window.__day && window.__day.photoMods().scoreMul || 1;
            } catch (e) {
              return 1;
            }
          })();
          const final = Math.min(100, Math.round(sc.total * mul));
          if (final > (S2.best || 0)) S2.best = final;
          try {
            window.__contest?.submitPhoto?.(final);
          } catch (e) {
          }
          if (final >= 88) {
            window.__game?.addXP?.(20, "优秀构图");
            A.ui?.toast?.("S 级构图", `${final} 分 · 评级 ${sc.grade}${mul > 1 ? ` · 黄金时段 ×${mul}` : ""} · +20 积分`, "gold");
          } else {
            A.ui?.toast?.("已保存", `${final} 分 · 评级 ${sc.grade}${mul > 1 ? ` · 黄金时段 ×${mul}` : ""}`, "plain");
          }
        }
      } catch (e) {
      }
      out.dataUrl = url;
    } catch (e) {
      out.error = String(e && e.message || e);
    }
    return out;
  }
  const SUBJECT = { x: 0, y: 22, z: 0 };
  function score() {
    const cam = stage2.camera;
    if (!cam || !cam.isPerspectiveCamera) return null;
    const v = new THREE18.Vector3(SUBJECT.x, SUBJECT.y, SUBJECT.z);
    const p = v.clone().project(cam);
    const inFrame = Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05 && p.z < 1;
    const rx = (p.x + 1) / 2, ry = 1 - (p.y + 1) / 2;
    const thirds = [1 / 3, 2 / 3];
    const nearThirds = (v2, arr) => Math.min(...arr.map((t) => Math.abs(v2 - t)));
    const d3 = Math.hypot(nearThirds(rx, thirds) * 1.2, nearThirds(ry, thirds) * 0.9);
    const comp = inFrame ? 30 * (1 - d3 / 0.55) : 0;
    const up = new THREE18.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const tilt = Math.acos(Math.min(1, Math.abs(up.y)));
    const level = Math.max(0, 20 * (1 - tilt / 0.15));
    const r = stage2.renderer;
    const exp = r ? r.toneMappingExposure : 1;
    const eErr = Math.abs(Math.log2(Math.max(0.05, exp)));
    const expo = Math.max(0, 20 * (1 - eErr / 1.2));
    const h = cam.position.y;
    let hScore;
    if (h >= 25 && h <= 120) hScore = 30;
    else if (h > 120) hScore = Math.max(0, 30 - (h - 120) * 0.2);
    else hScore = Math.max(0, 30 - (25 - h) * 0.4);
    const total = Math.round(comp + level + expo + hScore);
    const items = [
      { k: "构图三分位", v: Math.round(comp), max: 30 },
      { k: "水平姿态", v: Math.round(level), max: 20 },
      { k: "曝光", v: Math.round(expo), max: 20 },
      { k: "视角高度", v: Math.round(hScore), max: 30 }
    ];
    const grade = total >= 88 ? "S" : total >= 78 ? "A" : total >= 66 ? "B" : total >= 50 ? "C" : "D";
    return { total, grade, items, inFrame };
  }
  const api2 = {
    enter,
    exit,
    shot,
    setExposure,
    setFocal,
    setFilter,
    rerender,
    score,
    get on() {
      return S2.on;
    },
    get shots() {
      return S2.shots;
    },
    get exposure() {
      return S2.exposure;
    },
    get focal() {
      return S2.focal;
    },
    get filter() {
      return S2.filter;
    },
    get best() {
      return S2.best;
    }
  };
  window.__photo = api2;
  return api2;
}
var clamp4;
var init_photo = __esm({
  "src/game/photo.js"() {
    clamp4 = (v, a, b) => v < a ? a : v > b ? b : v;
  }
});

// src/game/audio.js
function createAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  const S2 = { enabled: false, ctx: null, master: null, volume: 0.55, nodes: [], timer: 0, ready: false };
  function noiseBuffer(ctx, seconds = 4) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.94 + white * 0.06;
      d[i] = last * 3.2 + white * 0.06;
    }
    const fade = Math.min(2e3, Math.floor(len / 10));
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[i] *= k;
      d[len - 1 - i] *= k;
    }
    return buf;
  }
  function buildCrowd(ctx, dest) {
    const buf = noiseBuffer(ctx, 5);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 620;
    lp.Q.value = 0.6;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1500;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.07;
    const depth = ctx.createGain();
    depth.gain.value = 220;
    lfo.connect(depth).connect(lp.frequency);
    src.connect(lp).connect(g).connect(dest);
    src.connect(bp);
    bp.connect(dest);
    lfo.start(0);
    src.start(0);
    return [src, lfo, g];
  }
  function ctxOk() {
    if (!AC) return null;
    if (!S2.ctx) {
      try {
        S2.ctx = new AC();
        S2.master = S2.ctx.createGain();
        S2.master.gain.value = 0;
        S2.master.connect(S2.ctx.destination);
      } catch (e) {
        S2.ctx = null;
        return null;
      }
    }
    return S2.ctx;
  }
  function enable() {
    const ctx = ctxOk();
    if (!ctx) return false;
    try {
      if (ctx.state === "suspended") ctx.resume().catch(() => {
      });
    } catch (e) {
    }
    if (!S2.ready) {
      try {
        S2.nodes = buildCrowd(ctx, S2.master || ctx.destination);
        S2.ready = true;
      } catch (e) {
        S2.nodes = [];
      }
      try {
        S2.timer = setInterval(() => {
          if (!S2.enabled) return;
          const r = Math.random();
          if (r < 0.45) sfx("whistle");
          else if (r < 0.8) sfx("roar");
        }, 9e3);
      } catch (e) {
      }
    }
    S2.enabled = true;
    try {
      S2.master.gain.cancelScheduledValues(S2.ctx.currentTime);
      S2.master.gain.setTargetAtTime(S2.volume, S2.ctx.currentTime, 0.6);
    } catch (e) {
    }
    try {
      const btn = document.getElementById("btnSound");
      if (btn) {
        btn.setAttribute("aria-pressed", "true");
      }
      const tg = document.getElementById("tgSound");
      if (tg) {
        tg.setAttribute("aria-checked", "true");
      }
    } catch (e) {
    }
    return true;
  }
  function disable() {
    S2.enabled = false;
    try {
      if (S2.ctx && S2.master) {
        S2.master.gain.cancelScheduledValues(S2.ctx.currentTime);
        S2.master.gain.setTargetAtTime(0, S2.ctx.currentTime, 0.35);
      }
      if (S2.ctx && S2.ctx.state === "running") S2.ctx.suspend().catch(() => {
      });
    } catch (e) {
    }
    try {
      clearInterval(S2.timer);
      S2.timer = 0;
    } catch (e) {
    }
    try {
      const btn = document.getElementById("btnSound");
      if (btn) btn.setAttribute("aria-pressed", "false");
      const tg = document.getElementById("tgSound");
      if (tg) tg.setAttribute("aria-checked", "false");
    } catch (e) {
    }
    return false;
  }
  function toggle() {
    return S2.enabled ? disable() : enable();
  }
  function setVolume(v) {
    S2.volume = Math.max(0, Math.min(1, +v || 0));
    if (S2.enabled) enable();
    return S2.volume;
  }
  function sfx(kind = "click") {
    if (!S2.enabled) return false;
    const ctx = S2.ctx;
    if (!ctx) return false;
    const t0 = ctx.currentTime;
    try {
      if (kind === "badge" || kind === "levelup") {
        const notes = kind === "badge" ? [880, 1174.7, 1568] : [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => {
          const o2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          o2.type = "sine";
          o2.frequency.value = f;
          const at = t0 + i * (kind === "badge" ? 0.075 : 0.1);
          g2.gain.setValueAtTime(1e-4, at);
          g2.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
          g2.gain.exponentialRampToValueAtTime(1e-4, at + 0.5);
          o2.connect(g2).connect(S2.master);
          o2.start(at);
          o2.stop(at + 0.55);
        });
        return true;
      }
      if (kind === "whistle" || kind === "roar") {
        const len = kind === "whistle" ? 0.35 : 1.2;
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = kind === "whistle" ? 2600 : 900;
        f.Q.value = kind === "whistle" ? 8 : 1.2;
        const g2 = ctx.createGain();
        g2.gain.value = kind === "whistle" ? 0.1 : 0.3;
        src.connect(f).connect(g2).connect(S2.master);
        src.start(t0);
        return true;
      }
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = 420;
      g.gain.setValueAtTime(1e-4, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(1e-4, t0 + 0.16);
      o.connect(g).connect(S2.master);
      o.start(t0);
      o.stop(t0 + 0.18);
    } catch (e) {
      return false;
    }
    return true;
  }
  const api2 = {
    enable,
    disable,
    toggle,
    sfx,
    setVolume,
    get enabled() {
      return S2.enabled;
    },
    get volume() {
      return S2.volume;
    },
    get supported() {
      return !!AC;
    }
  };
  window.__audio = api2;
  return api2;
}
var init_audio = __esm({
  "src/game/audio.js"() {
  }
});

// src/world/walkr.js
import * as THREE19 from "three";
function bt2(h, ex, ez) {
  const hx = HALF_X2 + h, hz = HALF_Z2 + h, r = hx * CORNER_F2;
  const ax = hx - r, az = hz - r;
  const a = Math.abs(ex), c = Math.abs(ez);
  const te = Math.min(a > 1e-9 ? ax / a : Infinity, c > 1e-9 ? az / c : Infinity);
  if (Math.abs(ex) * te <= ax + 1e-6 && Math.abs(ez) * te <= az + 1e-6) return te;
  const bq = ax * a + az * c, aq = a * a + c * c, cq = ax * ax + az * az - r * r;
  return (bq + Math.sqrt(Math.max(0, bq * bq - aq * cq))) / aq;
}
function locate2(x, z) {
  const r = Math.hypot(x, z);
  if (r < 1e-6) return { s: -HALF_X2, i: 0, u: 0 };
  let bi = 0, bd = Infinity;
  let dx = 0, dz = 0, nx = 1, nz = 0;
  for (let i = 0; i < SEGS2; i++) {
    const p = REF2[i];
    const t = bt2(0, p.nx, p.nz);
    const proj = x * p.nx + z * p.nz;
    const lat = Math.abs(x * p.tx + z * p.tz) * (t < HALF_Z2 ? 0.9 : 1.2);
    const d = Math.abs(r - proj) + lat * 0.55;
    if (d < bd) {
      bd = d;
      bi = i;
      dx = x;
      dz = z;
      nx = p.nx;
      nz = p.nz;
    }
  }
  const ex = r > 1e-6 ? dx / r : nx, ez = r > 1e-6 ? dz / r : nz;
  let lo = -HALF_X2 + 0.01, hi = 320;
  for (let k = 0; k < 26; k++) {
    const mid = (lo + hi) * 0.5;
    const tt = bt2(mid, ex, ez);
    if (tt < r) lo = mid;
    else hi = mid;
  }
  return { s: (lo + hi) * 0.5, i: bi, u: REF2[bi].u };
}
var RING2, TOTAL2, REF2, PORTAL_HALF_M2;
var init_walkr = __esm({
  "src/world/walkr.js"() {
    init_core();
    init_sections();
    init_rings();
    RING2 = refRing2(SEGS2);
    TOTAL2 = RING2.total;
    REF2 = RING2.pts.map((p) => ({
      nx: p.nx,
      nz: p.nz,
      u: p.u,
      /* 该方向的单位切向（u 增大的方向） */
      tx: -p.nz,
      tz: p.nx
    }));
    PORTAL_HALF_M2 = (GEO2.portalHalfU ?? 0.03) * TOTAL2;
  }
});

// src/game/objectives.js
import * as THREE20 from "three";
function buildDefs() {
  const hallS = GEO2.outerS - 4;
  const plazaS = GEO2.outerS + 16;
  return [
    {
      id: "m1",
      mission: "m1",
      name: "球迷广场",
      zone: "主轴尽端",
      desc: "走出主馆，站到球迷广场的主轴上",
      s: [GEO2.outerS + 4, 1e4],
      y: [-6, 7],
      u: U_AXIS,
      uWin: U_WIN,
      beacon: { i: U_AXIS * SEGS2, s: plazaS, y: GEO2.groundY + 0.5 },
      tip: "沿主轴向北走，绕过旗阵"
    },
    {
      id: "m2",
      mission: "m2",
      name: "入口大厅",
      zone: "北门券洞",
      desc: "穿过 24m 主入口券洞，走进检票门厅",
      s: [hallS - 8, GEO2.outerS + 2],
      y: [-4, 9],
      u: U_AXIS,
      uWin: 0.05,
      /* 信标必须落在"人能站住"的地面：券洞轴线上的门厅空腔（顶层环廊下方）是地面，
         再往里就是看台后墙。 */
      beacon: { i: U_AXIS * SEGS2, s: GEO2.outerS - 5, y: 0 },
      tip: "正对旗阵的券洞就是主入口"
    },
    {
      id: "m3",
      mission: "m3",
      name: "二层环廊",
      zone: "中层环廊",
      desc: "登上二层环廊，俯瞰 105×68m 全场",
      s: [L22.cS0 - 2, L22.cS1 + 2],
      y: [L22.cY - 4, L22.cY + 7],
      u: null,
      beacon: { i: U_AXIS * SEGS2, s: (L22.cS0 + L22.cS1) / 2, y: L22.cY },
      tip: "沿看台逐排上行即可抵达"
    },
    {
      id: "m4",
      mission: "m4",
      name: "球员通道",
      zone: "南侧通道口",
      desc: "走进球员通道（更衣室方向）",
      s: [L12.s0 - 1, L12.endS + 4],
      y: [-6, 7],
      u: 0.5,
      uWin: 0.035,
      /* 球员通道口的座席在模型里被真实扣除（SKIP_U），通道贴着场边硬地：
         信标放在场边地面，而不是看台踏面之下（否则会埋在看台里看不见）。 */
      beacon: { i: 0.5 * SEGS2, s: L12.s0 - 1.5, y: GEO2.groundY + 0.4 },
      tip: "看台正中的缺口就是球员通道"
    },
    {
      id: "m5",
      mission: "m5",
      name: "疏散演练",
      zone: "主入口 / 出口",
      desc: "在「疏散」面板里调度出口，把全場观众安全送出",
      s: [GEO2.outerS - 2, GEO2.outerS + 6],
      y: [-6, 8],
      u: U_AXIS,
      uWin: U_WIN,
      beacon: { i: U_AXIS * SEGS2, s: GEO2.outerS + 3, y: 0 },
      tip: "打开左侧「疏散」面板开始调度",
      action: "panel:flow"
    },
    {
      id: "m6",
      mission: "m6",
      name: "建筑徽章",
      zone: "全馆 5 处",
      desc: "集齐 5 枚建筑徽章",
      s: null,
      y: null,
      u: null,
      beacon: null,
      tip: "跟着光柱走，徽章就在光柱下面",
      action: "badges"
    }
  ];
}
function columnTexture() {
  try {
    const cv = document.createElement("canvas");
    cv.width = 8;
    cv.height = 256;
    const g = cv.getContext("2d");
    const lg = g.createLinearGradient(0, 256, 0, 0);
    lg.addColorStop(0, "rgba(255,255,255,0.95)");
    lg.addColorStop(0.12, "rgba(255,255,255,0.55)");
    lg.addColorStop(0.5, "rgba(255,255,255,0.22)");
    lg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = lg;
    g.fillRect(0, 0, 8, 256);
    const t = new THREE20.CanvasTexture(cv);
    t.colorSpace = THREE20.SRGBColorSpace;
    return t;
  } catch (e) {
    return null;
  }
}
function ringTexture() {
  try {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    const g = cv.getContext("2d");
    const rg = g.createRadialGradient(64, 64, 30, 64, 64, 63);
    rg.addColorStop(0, "rgba(255,255,255,0)");
    rg.addColorStop(0.72, "rgba(255,255,255,0.30)");
    rg.addColorStop(0.9, "rgba(255,255,255,0.85)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg;
    g.beginPath();
    g.arc(64, 64, 63, 0, Math.PI * 2);
    g.fill();
    const t = new THREE20.CanvasTexture(cv);
    t.colorSpace = THREE20.SRGBColorSpace;
    return t;
  } catch (e) {
    return null;
  }
}
function createObjectives(app) {
  const A = window.__app || app || {};
  const stage2 = A.stage || {};
  const scene = stage2.scene;
  if (!scene) return null;
  const defs = buildDefs();
  const list = defs.map((d) => ({ ...d, done: false, _beacon: null }));
  const group = new THREE20.Group();
  group.name = "GAME_OBJECTIVES";
  scene.add(group);
  const colTex = columnTexture();
  const ringTex = ringTexture();
  const COL_H = 78;
  const mkBeacon = (pos) => {
    const node = new THREE20.Group();
    node.position.copy(pos);
    if (ringTex) {
      const sp = new THREE20.Sprite(new THREE20.SpriteMaterial({
        map: ringTex,
        color: CYAN,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        depthTest: false,
        blending: THREE20.AdditiveBlending,
        toneMapped: false
      }));
      sp.scale.set(15, 15, 1);
      sp.position.y = 0.3;
      sp.renderOrder = 900;
      node.add(sp);
    }
    if (colTex) {
      const cm = new THREE20.MeshBasicMaterial({
        map: colTex,
        color: CYAN,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        depthTest: false,
        side: THREE20.DoubleSide,
        blending: THREE20.AdditiveBlending,
        toneMapped: false
      });
      const col = new THREE20.Mesh(new THREE20.PlaneGeometry(3.4, COL_H), cm);
      col.position.y = COL_H / 2;
      col.renderOrder = 901;
      node.add(col);
      const col2 = col.clone();
      col2.rotation.y = Math.PI / 2;
      node.add(col2);
    }
    const dia = new THREE20.Mesh(
      new THREE20.OctahedronGeometry(1.5, 0),
      new THREE20.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.95, depthTest: false, toneMapped: false })
    );
    dia.position.y = 3.4;
    dia.renderOrder = 902;
    node.add(dia);
    group.add(node);
    return { node, dia };
  };
  list.forEach((o) => {
    if (!o.beacon) return;
    const p = pt2(o.beacon.i, o.beacon.s, o.beacon.y);
    o._beacon = mkBeacon(p.clone());
    o._pos = p.clone();
  });
  let currentId = null;
  const target = new THREE20.Vector3();
  function game() {
    const g = window.__game;
    return g && Array.isArray(g.missions) ? g : null;
  }
  function current() {
    const g = game();
    if (!g) return list[0];
    const done = new Set(g.missions.filter((m) => m.done).map((m) => m.id));
    let c = list.find((o) => !done.has(o.mission));
    if (!c) c = list[list.length - 1];
    if (c.id !== currentId) {
      currentId = c.id;
      list.forEach((o) => {
        if (o._beacon) o._beacon.node.visible = o.id === c.id;
      });
      try {
        document.dispatchEvent(new CustomEvent("objective:changed", { detail: { id: c.id, name: c.name, desc: c.desc } }));
      } catch (e) {
      }
    }
    return c;
  }
  function badgeTarget() {
    const ext = window.__badges;
    const arr = ext && Array.isArray(ext.list) ? ext.list : null;
    if (!arr) return null;
    let best = null, bd = Infinity;
    for (const b of arr) {
      if (b.taken || !b.pos) continue;
      const d = Math.hypot(b.pos[0], b.pos[2]);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }
  function check(p) {
    const g = game();
    if (!g || !p) return null;
    const cur = current();
    if (!cur || cur.action === "badges" || cur.action === "panel:flow") return null;
    const loc = locate2(p.x, p.z);
    const s = loc.s, y = p.y;
    const u = loc.u;
    let uOk = true;
    if (cur.u != null) {
      let d = Math.abs(u - cur.u);
      d = Math.min(d, 1 - d);
      uOk = d <= (cur.uWin ?? U_WIN);
    }
    const sOk = cur.s ? s >= cur.s[0] && s <= cur.s[1] : true;
    const yOk = cur.y ? y >= cur.y[0] && y <= cur.y[1] : true;
    if (!(uOk && sOk && yOk)) return null;
    if (g.missionDone(cur.mission)) return null;
    g.complete(cur.mission);
    try {
      A.ui?.toast?.("任务完成", `${cur.name} · ${cur.desc}`, "gold");
    } catch (e) {
    }
    try {
      document.dispatchEvent(new CustomEvent("objective:reached", { detail: { id: cur.id } }));
    } catch (e) {
    }
    return cur.id;
  }
  let t = 0;
  function update(dt) {
    t += dt;
    const cur = current();
    if (cur.action === "badges") {
      const b = badgeTarget();
      const bo = list.find((o) => o.action === "badges");
      if (bo && b && bo._beacon) {
        const bp = new THREE20.Vector3(b.pos[0], b.pos[1], b.pos[2]);
        bo._beacon.node.position.lerp(bp, clamp5(dt * 4, 0, 1));
        bo._pos = bo._beacon.node.position.clone();
      }
    }
    list.forEach((o) => {
      if (!o._beacon || !o._beacon.node.visible) return;
      const d = o._beacon;
      d.dia.rotation.y += dt * 1.1;
      d.dia.rotation.x += dt * 0.45;
      d.dia.position.y = 3.4 + Math.sin(t * 2) * 0.55;
      const pulse = 1 + Math.sin(t * 2.4) * 0.08;
      d.dia.scale.setScalar(pulse);
      d.node.children.forEach((c) => {
        if (c.material && c.material.color) {
          const near = 1;
          c.material.opacity = (c.isSprite ? 0.9 : 0.5) * near * (0.82 + Math.sin(t * 2.4) * 0.18);
        }
      });
    });
    const curBeacon = cur._beacon || (cur.action === "badges" ? list.find((o) => o.action === "badges")?._beacon : null);
    if (curBeacon) target.copy(curBeacon.node.position);
  }
  const api2 = {
    list,
    update,
    check,
    get current() {
      return current();
    },
    get target() {
      return target;
    },
    get group() {
      return group;
    },
    get currentId() {
      return currentId;
    }
  };
  Object.defineProperty(api2, "current", { get: current, configurable: true });
  window.__objectives = api2;
  return api2;
}
var clamp5, U_AXIS, U_WIN, CYAN, GOLD;
var init_objectives = __esm({
  "src/game/objectives.js"() {
    init_sections();
    init_rings();
    init_walkr();
    clamp5 = (v, a, b) => v < a ? a : v > b ? b : v;
    U_AXIS = 0;
    U_WIN = 0.085;
    CYAN = 7328736;
    GOLD = 16765562;
  }
});

// src/game/insights.js
import * as THREE21 from "three";
function buildDefs2() {
  const suiteY = (TIERS2[1] ? TIERS2[1].cY : 26.65) + 1.2;
  const l1cY = TIERS2[0] ? TIERS2[0].cY : 16.25;
  const l3cY = TIERS2[2] ? TIERS2[2].cY : 42.45;
  return [
    {
      id: "i1",
      name: "八根潮柱",
      zone: "外广场 · 柱基",
      fact: "8 根外倾 8° 的清水混凝土柱落在广场基座上，柱→环梁→24 榀径向桁架→檩条→面板构成完整传力链。",
      pos: P2(0, GEO2.mastS_base, 2).toArray(),
      color: 15253626
    },
    {
      id: "i2",
      name: "鞍面屋盖",
      zone: "屋盖 · 鞍点",
      fact: "屋盖是连续单层曲面环带：四边中部高、四角低（环向余弦调制），内檐 ≤1.3m 厚，场地正上方完全开敞。",
      pos: P2(0, GEO2.roofRidgeS, GEO2.roofRidgeY - 4).toArray(),
      color: 7328736
    },
    {
      id: "i3",
      name: "悬挑内檐",
      zone: "屋盖 · 内檐",
      fact: "内檐是一条细薄的悬浮边（≤1.3m），带金属收边与连续灯带 —— 观众抬头看到的是一条会发光的缝，而不是封闭的天窗。",
      pos: P2(0.125, GEO2.roofInnerS + 2, GEO2.roofInnerY - 2).toArray(),
      color: 7328736
    },
    {
      id: "i4",
      name: "三道潮线立面",
      zone: "外立面 · 网幕",
      fact: "外立面由 3 道连续水平铝带分成 4 段，铝带内藏夜间灯带；下段清水混凝土基座，中上段青铜网幕 + 深色玻璃。",
      pos: P2(0.25, GEO2.outerS + 1.2, GEO2.outerMidY).toArray(),
      color: 9206366
    },
    {
      id: "i5",
      name: "24m 主券洞",
      zone: "北门 · 主入口",
      fact: "4 个 24m 高主券洞是唯一的无台阶入口，洞内退 9m 形成检票门厅；混凝土反曲梁把券洞上方荷载导入基座。",
      pos: P2(0, GEO2.outerS - 1, 6).toArray(),
      color: 15591646
    },
    {
      id: "i6",
      name: "三层看台",
      zone: "看台 · L1 前排",
      fact: "三层看台共 64 排：下层 28 排、中层 19 排、上层 17 排；踏步 0.80m / 踢面 0.50m，每 4 排一道 1.2m 纵向走道。",
      pos: P2(0, TIERS2[0].s0 + 2, 3).toArray(),
      color: 13214047
    },
    {
      id: "i7",
      name: "一层环廊",
      zone: "L1 环廊",
      fact: "一层环廊净宽 13m，标高 16.25m，与看台末排同层；它是观众疏散与换层的主动线，也是遮阳与结构双重受益的环。",
      pos: P2(0.5, (L12.cS0 + L12.cS1) / 2, l1cY + 1.2).toArray(),
      color: 13214047
    },
    {
      id: "i8",
      name: "包厢夹层",
      zone: "L2 · 包厢层",
      fact: "贵宾包厢夹层插在 L2 与 L3 之间，带独立后走道；两层包厢共 768 席，是全场视野与疏散效率最难同时满足的一段。",
      pos: P2(0.25, (L22.cS0 + L22.cS1) / 2, suiteY).toArray(),
      color: 14137087
    },
    {
      id: "i9",
      name: "上层环廊",
      zone: "L3 环廊",
      fact: "上层环廊标高 42.45m、净宽 8m，正对潮冠檐口；站在这里可以一眼看完 105×68m 场地与四角的出入口布局。",
      pos: P2(0.125, (L32.cS0 + L32.cS1) / 2, l3cY + 1.2).toArray(),
      color: 12034244
    },
    {
      id: "i10",
      name: "球员通道",
      zone: "南侧 · 通道口",
      fact: "南北各留一条球员 / 车辆通道，通道口处的座席在座位模型里被真实扣除（SKIP_U），所以容量统计与几何完全一致。",
      /* 放在通道口贴地的场边硬地上：放在看台踏面里会被埋住看不见 */
      pos: P2(0.5, L12.s0 - 1.5, GEO2.groundY + 1).toArray(),
      color: 9433288
    },
    {
      id: "i11",
      name: "四组灯桥",
      zone: "场地 · 灯桥",
      fact: "四角 4 组灯桥挂在屋盖内檐下，夜赛时把光压向场地；不设地面灯杆，所以看台第一排没有视线遮挡。",
      pos: P2(0.125, GEO2.roofInnerS + 8, GEO2.roofInnerY - 6).toArray(),
      color: 16773312
    },
    {
      id: "i12",
      name: "LED 广告板",
      zone: "场地 · 边线",
      fact: "LED 板沿场地边线连续围合，板面高度刻意压低，避免在看台第一排形成一条挡住草皮的黑带。",
      pos: P2(0.375, GEO2.boardS + 1, 2.2).toArray(),
      color: 7328736
    }
  ];
}
function createInsights(app) {
  const A = window.__app || app || {};
  const stage2 = A.stage || {};
  const scene = stage2.scene;
  if (!scene) return null;
  const defs = buildDefs2();
  const list = defs.map((d) => ({ ...d, got: false, _t: Math.random() * 6 }));
  const group = new THREE21.Group();
  group.name = "GAME_INSIGHTS";
  scene.add(group);
  const geo = new THREE21.TorusGeometry(0.85, 0.045, 6, 28);
  const dia = new THREE21.OctahedronGeometry(0.42, 0);
  const ringMesh = new THREE21.InstancedMesh(geo, new THREE21.MeshBasicMaterial({
    color: 16777215,
    transparent: true,
    opacity: 0.85,
    toneMapped: false,
    depthTest: false
  }), list.length);
  const coreMesh = new THREE21.InstancedMesh(dia, new THREE21.MeshBasicMaterial({
    color: 16777215,
    transparent: true,
    opacity: 0.9,
    toneMapped: false,
    depthTest: false
  }), list.length);
  ringMesh.name = "GAME_INSIGHT_RINGS";
  coreMesh.name = "GAME_INSIGHT_CORES";
  ringMesh.frustumCulled = false;
  coreMesh.frustumCulled = false;
  ringMesh.renderOrder = 890;
  coreMesh.renderOrder = 891;
  ringMesh.instanceMatrix.setUsage(THREE21.DynamicDrawUsage);
  coreMesh.instanceMatrix.setUsage(THREE21.DynamicDrawUsage);
  group.add(ringMesh, coreMesh);
  const _c = new THREE21.Color();
  list.forEach((d, i) => {
    _c.setHex(d.color);
    ringMesh.setColorAt(i, _c);
    coreMesh.setColorAt(i, _c);
  });
  if (ringMesh.instanceColor) ringMesh.instanceColor.needsUpdate = true;
  if (coreMesh.instanceColor) coreMesh.instanceColor.needsUpdate = true;
  const nodes = list.map((d) => ({
    pos: new THREE21.Vector3(d.pos[0], d.pos[1], d.pos[2]),
    spin: 0,
    spinY: 0
  }));
  const _dum = new THREE21.Object3D();
  const _hide = (i) => {
    _dum.position.set(0, -9999, 0);
    _dum.rotation.set(0, 0, 0);
    _dum.scale.setScalar(1e-4);
    _dum.updateMatrix();
    ringMesh.setMatrixAt(i, _dum.matrix);
    coreMesh.setMatrixAt(i, _dum.matrix);
    ringMesh.instanceMatrix.needsUpdate = true;
    coreMesh.instanceMatrix.needsUpdate = true;
  };
  const playerPos = () => {
    const w = A.walk;
    if (w && w.active && w.pos) return w.pos;
    const cam = stage2.camera;
    return cam ? cam.position : null;
  };
  let t = 0;
  const subs2 = /* @__PURE__ */ new Set();
  const foundCount = () => list.filter((x) => x.got).length;
  function collect(d, i) {
    if (d.got) return;
    d.got = true;
    _hide(i);
    try {
      add("insightsGot", d.id);
    } catch (e) {
    }
    try {
      window.__game?.addXP?.(16, "收录建筑洞察");
      A.ui?.toast?.("收录建筑洞察", `${d.name} · ${d.zone}`, "gold");
      window.__audio?.sfx?.("badge");
    } catch (e) {
    }
    for (const cb of subs2) {
      try {
        cb(list);
      } catch (e) {
      }
    }
    try {
      document.dispatchEvent(new CustomEvent("insight:found", { detail: { id: d.id, name: d.name } }));
    } catch (e) {
    }
  }
  function restore() {
    let n = 0;
    try {
      const got = new Set(hasAll("insightsGot"));
      list.forEach((d, i) => {
        if (got.has(d.id)) {
          d.got = true;
          _hide(i);
          n++;
        }
      });
    } catch (e) {
    }
    return n;
  }
  function grant(id) {
    const i = list.findIndex((d) => d.id === id);
    if (i < 0) return false;
    if (list[i].got) return true;
    collect(list[i], i);
    return true;
  }
  function update(dt) {
    t += dt;
    const p = playerPos();
    let dirty2 = false;
    for (let i = 0; i < list.length; i++) {
      const d = list[i], n = nodes[i];
      if (d.got) continue;
      n.spin += dt * 0.7;
      n.spinY += dt * 1.3;
      const bob = Math.sin(t * 1.6 + d._t) * 0.22;
      _dum.position.copy(n.pos);
      _dum.rotation.set(Math.PI / 2, 0, n.spin);
      _dum.scale.setScalar(1);
      _dum.updateMatrix();
      ringMesh.setMatrixAt(i, _dum.matrix);
      _dum.position.set(n.pos.x, n.pos.y + bob, n.pos.z);
      _dum.rotation.set(0, n.spinY, 0);
      _dum.updateMatrix();
      coreMesh.setMatrixAt(i, _dum.matrix);
      dirty2 = true;
      if (p && p.distanceTo(n.pos) < PICK_R2) collect(d, i);
    }
    if (dirty2) {
      ringMesh.instanceMatrix.needsUpdate = true;
      coreMesh.instanceMatrix.needsUpdate = true;
    }
  }
  const api2 = {
    list,
    update,
    grant,
    restore,
    get found() {
      return foundCount();
    },
    get total() {
      return list.length;
    },
    on(cb) {
      if (typeof cb === "function") {
        subs2.add(cb);
        return () => subs2.delete(cb);
      }
      return () => {
      };
    }
  };
  window.__insights = api2;
  restore();
  return api2;
}
var P2, PICK_R2;
var init_insights = __esm({
  "src/game/insights.js"() {
    init_sections();
    init_rings();
    init_caps();
    P2 = (u, s, y) => pt2(Math.round(u * SEGS2) % SEGS2, s, y);
    PICK_R2 = 5;
  }
});

// src/game/dayPhase.js
function createDayPhase(app) {
  const A = window.__app || app || {};
  const subs2 = /* @__PURE__ */ new Set();
  const S2 = {
    idx: 0,
    t: 0,
    /* 当前时段已持续的秒数 */
    auto: true,
    /* 是否按时段时长自动推进 */
    days: 0,
    /* 已完成多少个比赛日 */
    lastChange: 0
  };
  const phase = () => PHASES[S2.idx];
  const effects = () => {
    const p = phase();
    return {
      phase: p.id,
      name: p.name,
      env: p.env,
      accent: p.accent,
      evac: p.evac || null,
      photo: p.photo || null,
      hooks: p.hooks.slice(),
      tip: p.tip,
      auto: S2.auto,
      t: S2.t,
      dur: p.dur,
      progress: p.dur > 0 ? clamp6(S2.t / p.dur, 0, 1) : 0
    };
  };
  function emit2(reason) {
    const e = effects();
    for (const cb of subs2) {
      try {
        cb(e, reason);
      } catch (err) {
      }
    }
    try {
      document.dispatchEvent(new CustomEvent("day:phase", { detail: e }));
    } catch (e2) {
    }
  }
  function applyEnv(envId) {
    try {
      const ui = A.ui;
      if (ui && typeof ui.setEnv === "function") {
        ui.setEnv(envId);
        return true;
      }
    } catch (e) {
    }
    return false;
  }
  function announce(p, silent) {
    if (silent) return;
    try {
      A.ui?.toast?.(
        `比赛日 · ${p.name}`,
        `${p.en} · ${p.tip}`,
        p.id === "kickoff" ? "gold" : "plain"
      );
    } catch (e) {
    }
    try {
      const btn = document.getElementById("btnMatch");
      const nm = document.getElementById("matchName");
      const dt = document.getElementById("matchTime");
      if (btn) {
        btn.hidden = false;
        btn.setAttribute("aria-label", `比赛日 当前时段 ${p.name}（点击进入下一时段）`);
        btn.style.setProperty("--match-accent", p.accent);
      }
      if (nm) nm.textContent = p.name;
      if (dt) dt.textContent = String(S2.days + 1).padStart(2, "0");
    } catch (e) {
    }
  }
  function setPhase(id, silent) {
    const next2 = IDX(id);
    const changed = next2 !== S2.idx;
    S2.idx = next2;
    S2.t = 0;
    const p = phase();
    applyEnv(p.env);
    if (changed) S2.lastChange = Date.now();
    announce(p, silent || !changed);
    emit2("phase");
    return p.id;
  }
  function next(silent) {
    const wasAfter = phase().id === "after";
    const ni = (S2.idx + 1) % PHASES.length;
    if (wasAfter) S2.days += 1;
    setPhase(PHASES[ni].id, silent);
    if (wasAfter && !silent) {
      try {
        A.ui?.toast?.("比赛日结束", `第 ${S2.days} 个比赛日完成 · 新的一天从「赛前」开始`, "green");
      } catch (e) {
      }
    }
    return phase().id;
  }
  function reset() {
    S2.idx = 0;
    S2.t = 0;
    S2.auto = true;
    applyEnv("day");
    if (S2.lastChange) S2.lastChange = Date.now();
    emit2("reset");
    return phase().id;
  }
  function update(dt) {
    if (!S2.auto || !(dt > 0)) return;
    S2.t += dt;
    const p = phase();
    if (p.dur > 0 && S2.t >= p.dur) {
      next(false);
      return;
    }
    S2._acc = (S2._acc || 0) + dt;
    if (S2._acc > 1) {
      S2._acc = 0;
      emit2("tick");
    }
  }
  function evacMods() {
    const e = phase().evac;
    return e ? { timePenalty: e.timePenalty, scoreMul: e.scoreMul } : { timePenalty: 0, scoreMul: 1 };
  }
  function photoMods() {
    const e = phase().photo;
    return e ? { scoreMul: e.scoreMul } : { scoreMul: 1 };
  }
  const api2 = {
    phases: PHASES,
    update,
    next,
    reset,
    setPhase,
    evacMods,
    photoMods,
    get phase() {
      return phase().id;
    },
    get kickoff() {
      return phase().id === "kickoff";
    },
    get info() {
      return { ...phase() };
    },
    get days() {
      return S2.days;
    },
    get auto() {
      return S2.auto;
    },
    get progress() {
      return effects();
    },
    get effects() {
      return effects;
    },
    on(cb) {
      if (typeof cb === "function") {
        subs2.add(cb);
        return () => subs2.delete(cb);
      }
      return () => {
      };
    },
    setAuto(v) {
      S2.auto = !!v;
      emit2("auto");
      return S2.auto;
    }
  };
  window.__day = api2;
  applyEnv(phase().env);
  announce(phase(), true);
  emit2("boot");
  return api2;
}
var clamp6, PHASES, IDX;
var init_dayPhase = __esm({
  "src/game/dayPhase.js"() {
    clamp6 = (v, a, b) => v < a ? a : v > b ? b : v;
    PHASES = [
      {
        id: "pre",
        name: "赛前",
        en: "PRE-MATCH · BUILD",
        env: "day",
        dur: 0,
        accent: "#e8c07a",
        tip: "建馆与调容量：建造时间轴、容量仪表、宣传照都在这段时间做",
        hooks: ["build", "capacity", "photo"]
      },
      {
        id: "kickoff",
        name: "开赛",
        en: "KICKOFF · NIGHT MATCH",
        env: "night",
        dur: 45,
        accent: "#6fd3e0",
        tip: "灯桥全开：疏散演练此刻更紧急（限时 -10s，成绩 ×1.15）",
        hooks: ["evac", "evacRush"],
        evac: { timePenalty: 10, scoreMul: 1.15 }
      },
      {
        id: "halftime",
        name: "中场",
        en: "HALFTIME · GOLDEN HOUR",
        env: "dusk",
        dur: 60,
        accent: "#ffb379",
        tip: "黄金时段：照片构图分 ×1.2，去拍一张能进画廊的片子",
        hooks: ["photo", "photoGolden"],
        photo: { scoreMul: 1.2 }
      },
      {
        id: "after",
        name: "赛后",
        en: "FULL TIME · EGRESS",
        env: "day",
        dur: 0,
        accent: "#9fe6ff",
        tip: "散场：完成一次满员疏散，为这个比赛日收尾",
        hooks: ["evac", "codex"],
        evac: { timePenalty: 0, scoreMul: 1 }
      }
    ];
    IDX = (id) => Math.max(0, PHASES.findIndex((p) => p.id === id));
  }
});

// src/game/contest.js
function capsApi() {
  return typeof window !== "undefined" && window.__caps ? window.__caps : null;
}
function isBetter(prev, next) {
  if (!next) return false;
  if (!prev) return true;
  const rp = GRADE_RANK[prev.grade] || 0, rn = GRADE_RANK[next.grade] || 0;
  if (rn !== rp) return rn > rp;
  return (next.t || 999) < (prev.t || 999);
}
function createContest(app) {
  const subs2 = /* @__PURE__ */ new Set();
  const emit2 = (reason) => {
    for (const cb of subs2) {
      try {
        cb(snapshot(), reason);
      } catch (e) {
      }
    }
    try {
      document.dispatchEvent(new CustomEvent("contest:changed", { detail: { reason } }));
    } catch (e) {
    }
  };
  const caps = () => capsApi();
  const store2 = (k, d) => {
    const c = caps();
    return c ? c.get(k, d) || d : d;
  };
  function bestEvac() {
    const m = store2("evacBest", {});
    let best = null, bestId = null;
    for (const id of Object.keys(m)) {
      const r = m[id];
      if (!r) continue;
      if (!best || isBetter(best, r)) {
        best = r;
        bestId = id;
      }
    }
    return best ? { ...best, scenario: bestId } : null;
  }
  function submitEvac(scenarioId, result) {
    const c = caps();
    if (!c || !scenarioId || !result) return null;
    const m = { ...c.get("evacBest", {}) || {} };
    const next = { t: Math.round((result.t || 0) * 10) / 10, grade: result.grade || "—", success: +(result.success || 0).toFixed(3) };
    const prev = m[scenarioId];
    const better = isBetter(prev, next);
    if (better) {
      m[scenarioId] = next;
      c.set("evacBest", m);
    }
    emit2("evac");
    return { better, prev: prev || null, next, best: bestEvac() };
  }
  function submitPhoto(score) {
    const c = caps();
    if (!c || !(score > 0)) return null;
    const prev = c.get("photoBest", 0) || 0;
    if (score > prev) {
      c.set("photoBest", score);
      emit2("photo");
      return { better: true, prev, next: score };
    }
    return { better: false, prev, next: prev };
  }
  function coverage() {
    const g = window.__game;
    const ins = window.__insights;
    const st = window.__stamps;
    const missions = g && Array.isArray(g.missions) ? g.missions.filter((m) => m.done).length : 0;
    const missionTotal = g && Array.isArray(g.missions) ? g.missions.length : 6;
    const badges = g && Array.isArray(g.badges) ? g.badges.length : 0;
    const insights = ins ? ins.found : 0;
    const insightTotal = ins ? ins.total : 12;
    const stamps = st ? st.found : 0;
    const stampTotal = st ? st.total : 0;
    const sc = (missionTotal ? missions / missionTotal * 40 : 0) + (5 ? Math.min(badges, 5) / 5 * 20 : 0) + (insightTotal ? insights / insightTotal * 24 : 0) + (stampTotal ? stamps / stampTotal * 16 : 0);
    return { score: Math.round(sc), missions, missionTotal, badges, insights, insightTotal, stamps, stampTotal };
  }
  function board() {
    return {
      evac: { best: bestEvac(), perScenario: store2("evacBest", {}) },
      photo: { best: store2("photoBest", 0) },
      overall: coverage()
    };
  }
  function medal() {
    const ev = bestEvac();
    const ph = store2("photoBest", 0);
    const ov = coverage();
    return [
      {
        id: "evac",
        name: "疏散表",
        got: !!(ev && (GRADE_RANK[ev.grade] || 0) >= 4),
        label: ev ? `${ev.grade} · ${ev.t}″` : "尚无成绩",
        hint: "任一工况拿到 A 或 S"
      },
      {
        id: "photo",
        name: "摄影表",
        got: ph >= 78,
        label: ph ? `${ph} 分` : "尚无成绩",
        hint: "构图评分 ≥ 78"
      },
      {
        id: "overall",
        name: "综合表",
        got: ov.score >= 80,
        label: `${ov.score} 分`,
        hint: "覆盖度 ≥ 80"
      }
    ];
  }
  function snapshot() {
    return { board: board(), medal: medal(), tiers: ["evac", "photo", "overall"] };
  }
  const api2 = {
    submitEvac,
    submitPhoto,
    board,
    medal,
    coverage,
    best: bestEvac,
    isBetter,
    tiers: ["evac", "photo", "overall"],
    clear() {
      const c = caps();
      if (!c) return false;
      c.set("evacBest", {});
      c.set("photoBest", 0);
      emit2("clear");
      return true;
    },
    onChange(cb) {
      if (typeof cb === "function") {
        subs2.add(cb);
        return () => subs2.delete(cb);
      }
      return () => {
      };
    },
    snapshot,
    get snapshotValue() {
      return snapshot();
    }
  };
  window.__contest = api2;
  return api2;
}
var GRADE_RANK;
var init_contest = __esm({
  "src/game/contest.js"() {
    GRADE_RANK = { S: 5, A: 4, B: 3, C: 2, D: 1, "—": 0 };
  }
});

// src/game/daily.js
function hash32(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function dateKey(d) {
  const t = d instanceof Date ? d : new Date(d == null ? Date.now() : d);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const dd = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function createDaily(app) {
  const A = window.__app || app || {};
  const subs2 = /* @__PURE__ */ new Set();
  let T = null;
  let override = null;
  const caps = () => window.__caps || null;
  const todayKey = () => override ? override : dateKey(Date.now());
  function build(date) {
    const seed = hash32("tidal-daily-" + date);
    const scenes = window.__evac && window.__evac.scenarioIds || ["calm", "rain", "power", "kickoff"];
    const stamps = window.__stamps && window.__stamps.list || [];
    const R = (n, salt) => hash32(date + ":" + salt) % n;
    const scene = scenes.length ? scenes[R(scenes.length, "sc")] : "calm";
    const spot = PHOTO_SPOTS[Math.abs(hash32(date + ":spot") % PHOTO_SPOTS.length)];
    const stamp = stamps.length ? stamps[Math.abs(hash32(date + ":stamp") % stamps.length)].id : null;
    return {
      date,
      seed,
      scenario: scene,
      photoSpot: spot.id,
      photoName: spot.name,
      photoHint: spot.hint,
      stamp,
      evacGrade: DAILY_THRESHOLDS.evacGrade,
      photoScore: DAILY_THRESHOLDS.photoScore,
      items: [
        { id: "evac", name: `疏散演练：${scene} 工况拿到 ${DAILY_THRESHOLDS.evacGrade} 以上`, kind: "evac" },
        { id: "photo", name: `摄影：在「${spot.name}」拍出 ≥${DAILY_THRESHOLDS.photoScore} 分`, kind: "photo" },
        { id: "stamp", name: "收集：找到今天的印章", kind: "stamp" }
      ]
    };
  }
  function completeKey(date) {
    return DAILY_PREFIX + date;
  }
  function progress() {
    const c = caps();
    const date = todayKey();
    const done = !!(c && c.get("daily", {})[completeKey(date)]);
    const evac = c && c.get("evacBest", {})[T.scenario];
    const photo = c ? c.get("photoBest", 0) || 0 : 0;
    const items = T.items.map((it) => {
      let ok = false;
      if (it.id === "evac") ok = !!(evac && ({ S: 5, A: 4, B: 3, C: 2, D: 1 }[evac.grade] || 0) >= ({ S: 5, A: 4, B: 3, C: 2, D: 1 }[T.evacGrade] || 0));
      else if (it.id === "photo") ok = photo >= T.photoScore;
      else ok = !!(T.stamp && window.__stamps && window.__stamps.has(T.stamp));
      return { ...it, done: ok };
    });
    return { date, done, items, finished: items.filter((x) => x.done).length, total: items.length };
  }
  function check() {
    const p = progress();
    if (p.finished >= p.total && !p.done) {
      const c = caps();
      if (c) {
        const d = { ...c.get("daily", {}) || {} };
        d[completeKey(p.date)] = true;
        c.set("daily", d);
      }
      try {
        window.__game?.addXP?.(30, "完成每日挑战");
      } catch (e) {
      }
      try {
        A.ui?.toast?.("每日挑战完成", `${p.date} · 三项全达成 · +30 积分`, "green");
      } catch (e) {
      }
      try {
        document.dispatchEvent(new CustomEvent("daily:done", { detail: p }));
      } catch (e) {
      }
    }
    for (const cb of subs2) {
      try {
        cb(p);
      } catch (e) {
      }
    }
    return p;
  }
  function refresh() {
    T = build(todayKey());
    try {
      if (window.__evac && T.scenario) window.__evac.reset(T.scenario);
    } catch (e) {
    }
    try {
      document.dispatchEvent(new CustomEvent("daily:changed", { detail: T }));
    } catch (e) {
    }
    return T;
  }
  try {
    document.addEventListener("stamps:changed", () => check());
  } catch (e) {
  }
  function force(date) {
    override = date === false || date === null ? null : dateKey(date);
    return refresh();
  }
  const api2 = {
    get today() {
      if (T && !T.stamp && window.__stamps && window.__stamps.list && window.__stamps.list.length) refresh();
      return T;
    },
    get progressValue() {
      return progress();
    },
    progress,
    check,
    force,
    refresh,
    get date() {
      return todayKey();
    },
    seedOf: (d) => hash32("tidal-daily-" + dateKey(d)),
    keys: Object.keys(DAILY_THRESHOLDS),
    photoSpots: PHOTO_SPOTS,
    on(cb) {
      if (typeof cb === "function") {
        subs2.add(cb);
        return () => subs2.delete(cb);
      }
      return () => {
      };
    }
  };
  window.__daily = api2;
  refresh();
  try {
    document.addEventListener("contest:changed", () => check());
  } catch (e) {
  }
  return api2;
}
var DAILY_PREFIX, PHOTO_SPOTS, DAILY_THRESHOLDS;
var init_daily = __esm({
  "src/game/daily.js"() {
    DAILY_PREFIX = "daily:";
    PHOTO_SPOTS = [
      { id: "hero", name: "主入口轴线", hint: "正面机位，券洞与鞍面屋盖同框" },
      { id: "roof", name: "屋盖内檐", hint: "贴近内檐，让悬挑薄边占满画面" },
      { id: "pitch", name: "场边低机位", hint: "压低机位看 LED 板与三层看台" },
      { id: "plaza", name: "球迷广场", hint: "退到广场，把整个场馆收进来" },
      { id: "concourse", name: "二层环廊", hint: '站在环廊里拍"环"的透视' },
      { id: "corner", name: "四角灯桥", hint: "找灯桥与屋盖结构的交接" }
    ];
    DAILY_THRESHOLDS = {
      evacGrade: "A",
      /* 今日疏散至少要 A */
      photoScore: 74
      /* 今日摄影至少要 74 分 */
    };
  }
});

// src/game/stamps.js
import * as THREE22 from "three";
function createStamps(app) {
  const A = window.__app || app || {};
  const scene = A.stage && A.stage.scene;
  const subs2 = /* @__PURE__ */ new Set();
  const list = STAMP_DEFS.map((d) => ({ ...d, got: false }));
  const caps = () => window.__caps || null;
  const isGot = (id) => !!(caps() && caps().has("stamps", id));
  let burst = null;
  let burstT = 0;
  try {
    if (scene) {
      const g = new THREE22.RingGeometry(2.6, 2.9, 48);
      burst = new THREE22.Mesh(g, new THREE22.MeshBasicMaterial({
        color: 16765562,
        transparent: true,
        opacity: 0,
        side: THREE22.DoubleSide,
        depthTest: false,
        depthWrite: false,
        blending: THREE22.AdditiveBlending,
        toneMapped: false
      }));
      burst.name = "GAME_STAMP_BURST";
      burst.rotation.x = -Math.PI / 2;
      burst.renderOrder = 950;
      burst.visible = false;
      scene.add(burst);
    }
  } catch (e) {
    burst = null;
  }
  function emit2(reason) {
    const p = { found: found(), total: list.length, list: list.map((d) => ({ id: d.id, got: d.got })), reason };
    for (const cb of subs2) {
      try {
        cb(p);
      } catch (e) {
      }
    }
    try {
      document.dispatchEvent(new CustomEvent("stamps:changed", { detail: p }));
    } catch (e) {
    }
  }
  function grant(id, quiet) {
    const d = list.find((x) => x.id === id);
    if (!d || d.got) return false;
    d.got = true;
    const c = caps();
    if (c) c.add("stamps", id);
    if (!quiet) {
      try {
        window.__game?.addXP?.(12, "建筑印章");
      } catch (e) {
      }
      try {
        A.ui?.toast?.("获得印章", `${d.name} · ${d.desc}`, "gold");
      } catch (e) {
      }
      try {
        window.__audio?.sfx?.("badge");
      } catch (e) {
      }
      if (burst) {
        const cam = A.stage && A.stage.camera;
        const w = A.walk;
        const base = w && w.active && w.pos ? w.pos.clone() : cam ? cam.position.clone() : null;
        if (base) {
          burst.position.set(base.x, Math.max(0.4, base.y - 1.4), base.z);
          burst.material.color.setHex(d.color || 16765562);
          burst.material.opacity = 1;
          burstT = 1.1;
          burst.visible = true;
        }
      }
    }
    emit2("grant");
    return true;
  }
  function found() {
    return list.filter((d) => d.got).length;
  }
  function restore() {
    const c = caps();
    if (!c) return 0;
    let n = 0;
    for (const d of list) {
      if (c.has("stamps", d.id)) {
        d.got = true;
        n++;
      }
    }
    return n;
  }
  function evaluate() {
    const g = window.__game;
    const ev = window.__evac;
    const bd = window.__badges;
    const ins = window.__insights;
    const ph = window.__photo;
    const c = caps();
    try {
      if (A.ui && A.ui.S && (A.ui.S._capReads || 0) >= 3) grant("s2");
    } catch (e) {
    }
    try {
      const b = window.__build;
      if (b && b.phase >= 99.9 && (b._visited || b.phase)) {
        if (b._playedFromZero !== false) grant("s1");
      }
    } catch (e) {
    }
    try {
      const best = c && c.get("evacBest", {});
      for (const k of Object.keys(best || {})) {
        const r = best[k];
        if (r && r.success >= 0.999 && (GRADE[r.grade] || 0) >= GRADE.A) grant("s4");
      }
    } catch (e) {
    }
    try {
      const pb = c && c.get("photoBest", 0) || 0;
      if (pb >= 88) grant("s5");
      else if (ph && ph.best >= 88) grant("s5");
    } catch (e) {
    }
    try {
      const badgesOk = bd && Array.isArray(bd.list) && bd.list.length && bd.list.every((b) => b.taken);
      const insOk = ins && ins.found >= ins.total;
      if (badgesOk && insOk) grant("s6");
    } catch (e) {
    }
  }
  try {
    document.addEventListener("day:phase", (e) => {
      if (e && e.detail && e.detail.phase === "kickoff") grant("s3");
      evaluate();
    });
  } catch (e) {
  }
  try {
    document.addEventListener("contest:changed", () => evaluate());
  } catch (e) {
  }
  try {
    document.addEventListener("evac:changed", (e) => {
      const d = e && e.detail;
      if (!d || !d.done) return;
      if (d.success >= 0.999 && (GRADE[d.grade] || 0) >= GRADE.A) grant("s4");
      if (d.teams >= d.teamMax && (GRADE[d.grade] || 0) >= GRADE.B) grant("s7");
    });
  } catch (e) {
  }
  try {
    document.addEventListener("build:phase", () => evaluate());
  } catch (e) {
  }
  try {
    document.addEventListener("insight:found", () => evaluate());
  } catch (e) {
  }
  try {
    document.addEventListener("game:changed", () => evaluate());
  } catch (e) {
  }
  function update(dt) {
    if (!burst || burstT <= 0) return;
    burstT = Math.max(0, burstT - dt);
    burst.material.opacity = Math.min(0.55, burstT * 0.7);
    const k = Math.min(1.6, 1 + (1.1 - burstT) * 0.5);
    burst.scale.set(k, k, k);
    burst.rotation.z += dt * 0.8;
    if (burstT <= 0) burst.visible = false;
  }
  const api2 = {
    list,
    update,
    grant,
    has: isGot,
    evaluate,
    restore,
    get found() {
      return found();
    },
    get total() {
      return list.length;
    },
    help: "印章不是散落的道具，而是你在潮汐场做过的事的凭证。",
    on(cb) {
      if (typeof cb === "function") {
        subs2.add(cb);
        return () => subs2.delete(cb);
      }
      return () => {
      };
    }
  };
  window.__stamps = api2;
  restore();
  emit2("boot");
  return api2;
}
var STAMP_DEFS, GRADE;
var init_stamps = __esm({
  "src/game/stamps.js"() {
    STAMP_DEFS = [
      { id: "s1", name: "破土", en: "GROUNDBREAK", desc: "把建造时间轴从 0 拖到 100%，看完五个施工阶段。", color: 15253626 },
      { id: "s2", name: "总座", en: "FULL HOUSE", desc: "在容量仪表里逐层逐区读完 3 层 × 20 区。", color: 10479359 },
      { id: "s3", name: "全夜灯", en: "LIGHTS UP", desc: "把比赛日推进到「开赛」时段，全场灯桥点亮。", color: 7328736 },
      { id: "s4", name: "满员", en: "CLEARED", desc: "完成一次 100% 疏散，并且评级不低于 A。", color: 9433288 },
      { id: "s5", name: "极光", en: "S-GRADE", desc: "在照片模式拍出一张构图 S 级（≥88 分）的作品。", color: 16756932 },
      { id: "s6", name: "潮线", en: "TIDE LINE", desc: "收齐 5 枚建筑徽章与 12 处建筑洞察 —— 建筑学通关。", color: 14137087 },
      { id: "s7", name: "调度", en: "DISPATCH", desc: "在疏散里用满 10 组人力，并且整场没有超时。", color: 16765562 }
    ];
    GRADE = { S: 5, A: 4, B: 3, C: 2, D: 1, "—": 0 };
  }
});

// src/game/world.js
var world_exports = {};
__export(world_exports, {
  default: () => world_default,
  initWindowWorld: () => initWindowWorld
});
function initWindowWorld(app) {
  const A = window.__app || app || {};
  const api2 = {
    game: null,
    badges: null,
    objectives: null,
    insights: null,
    day: null,
    evac: null,
    build: null,
    photo: null,
    audio: null,
    contest: null,
    daily: null,
    stamps: null
  };
  const errors = [];
  const guard = (name, fn) => {
    try {
      return fn();
    } catch (e) {
      errors.push(name + ": " + (e && e.message || e));
      try {
        console.warn("[game] " + name + " 初始化失败", e);
      } catch (_) {
      }
      return null;
    }
  };
  const T0 = performance.now();
  const tim = [];
  const tk = (n) => {
    tim.push([n, +(performance.now() - T0).toFixed(0)]);
  };
  api2.game = window.__game || null;
  const G = api2.game;
  if (G) {
    guard("landmarks", () => {
      const model = A.arena && A.arena.model;
      const l2 = model && model.tiers && model.tiers[1];
      if (l2 && isFinite(l2.cY)) {
        LM.concourse.y = l2.cY;
        LM.concourse.z = Math.round((l2.cS0 + l2.cS1) / 2);
      }
      G.setLandmarks(LM);
    });
    guard("capacity", () => {
      const model = A.arena && A.arena.model;
      if (model && model.total) G.setCapacity(model.total);
    });
  }
  api2.contest = guard("contest", () => createContest(A));
  tk("contest");
  api2.daily = guard("daily", () => createDaily(A));
  tk("daily");
  api2.badges = guard("badges", () => createBadges(A));
  tk("badges");
  api2.objectives = guard("objectives", () => createObjectives(A));
  tk("objectives");
  api2.insights = guard("insights", () => createInsights(A));
  tk("insights");
  api2.stamps = guard("stamps", () => createStamps(A));
  tk("stamps");
  api2.evac = guard("evacuation", () => createEvac(A));
  tk("evac");
  api2.build = guard("construction", () => createConstruction(A));
  tk("build");
  api2.photo = guard("photo", () => createPhoto(A));
  tk("photo");
  api2.audio = guard("audio", () => createAudio());
  tk("audio");
  api2.day = guard("dayPhase", () => createDayPhase(A));
  tk("day");
  let raf = 0;
  let last = 0;
  let acc = 0;
  let running = true;
  const pos = () => {
    const w = A.walk;
    if (w && w.active && w.pos) return w.pos;
    const cam = A.stage && A.stage.camera;
    return cam ? cam.position : null;
  };
  function frame(ts) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const now2 = typeof ts === "number" ? ts : performance.now();
    const dt = Math.min(0.1, Math.max(0, (now2 - (last || now2)) / 1e3));
    last = now2;
    try {
      api2.badges && api2.badges.update(dt);
    } catch (e) {
    }
    try {
      api2.stamps && api2.stamps.update(dt);
    } catch (e) {
    }
    try {
      api2.objectives && api2.objectives.update(dt);
    } catch (e) {
    }
    try {
      api2.insights && api2.insights.update(dt);
    } catch (e) {
    }
    try {
      api2.evac && api2.evac.update(dt);
    } catch (e) {
    }
    try {
      api2.build && api2.build.update(dt);
    } catch (e) {
    }
    try {
      api2.day && api2.day.update(dt);
    } catch (e) {
    }
    try {
      G && G.tick(dt);
    } catch (e) {
    }
    acc += dt;
    if (acc > 0.15) {
      acc = 0;
      try {
        const p = pos();
        if (p && G) {
          const inTrans = !!(A.walk && A.walk.trans && A.walk.trans.mode === "in");
          if (api2.objectives) {
            if (!inTrans) api2.objectives.check(p);
          } else if (!inTrans) G.checkPlayer(p);
          if (A.walk && A.walk.active && G.mode !== "walk") G.setMode("walk");
          else if (!(A.walk && A.walk.active) && G.mode === "walk") G.setMode("explore");
        }
      } catch (e) {
      }
    }
  }
  try {
    last = 0;
    raf = requestAnimationFrame(frame);
  } catch (e) {
    errors.push("loop: " + e.message);
  }
  window.__gameApi = {
    ...api2,
    missions: MISSIONS,
    landmarks: LM,
    errors,
    timings: tim,
    get ready() {
      return true;
    },
    stop() {
      running = false;
      try {
        cancelAnimationFrame(raf);
      } catch (e) {
      }
    }
  };
  try {
    if (G) G.emit("ready");
    document.dispatchEvent(new CustomEvent("game:ready", { detail: { errors } }));
  } catch (e) {
  }
  try {
    document.dispatchEvent(new CustomEvent("game:changed"));
  } catch (e) {
  }
  window.__gameReady = true;
  if (errors.length) {
    try {
      console.warn("[game] 初始化降级：", errors);
    } catch (e) {
    }
  }
  return window.__gameApi;
}
var LM, world_default;
var init_world = __esm({
  "src/game/world.js"() {
    init_state();
    init_badges();
    init_evacuation();
    init_construction();
    init_photo();
    init_audio();
    init_objectives();
    init_insights();
    init_dayPhase();
    init_contest();
    init_daily();
    init_stamps();
    LM = {
      plaza: { x: 0, z: 190 },
      hall: { x: 0, z: 118 },
      concourse: { x: 0, z: 84, y: 28 },
      tunnel: { x: 0, z: -96 }
    };
    world_default = initWindowWorld;
  }
});

// src/game/state.js
function initWorld() {
  if (_worldP) return _worldP;
  _worldP = Promise.resolve().then(() => (init_world(), world_exports)).then((m) => {
    try {
      return m.initWindowWorld(window.__app);
    } catch (e) {
      console.warn("[game] world 初始化失败", e);
      return null;
    }
  }).catch((e) => {
    console.warn("[game] world 模块加载失败", e);
    try {
      window.__gameError = String(e && e.message || e);
    } catch (e2) {
    }
    return null;
  });
  return _worldP;
}
function createGame() {
  if (window.__game && window.__game.__isGame) return window.__game;
  const subs2 = /* @__PURE__ */ new Set();
  const levelHooks = [];
  const S2 = {
    xp: 0,
    level: 1,
    badges: [],
    missions: MISSIONS.map((m) => ({ ...m, done: false })),
    stats: DEFAULT_STATS(),
    mode: "explore",
    landmarks: null,
    savedAt: 0,
    capacity: 0,
    unlocks: []
  };
  const inLevel = () => clamp7(Math.round(S2.xp - (S2.level - 1) * XP_PER_LEVEL), 0, XP_PER_LEVEL);
  function snapshot() {
    return {
      xp: S2.xp,
      level: S2.level,
      xpMax: XP_PER_LEVEL,
      xpInLevel: inLevel(),
      xpPct: clamp7(inLevel() / XP_PER_LEVEL * 100, 0, 100),
      badges: S2.badges.slice(),
      badgeCount: S2.badges.length,
      missions: S2.missions.map((m) => ({ ...m })),
      missionDone: S2.missions.filter((m) => m.done).length,
      missionTotal: S2.missions.length,
      stats: { ...S2.stats },
      mode: S2.mode,
      savedAt: S2.savedAt,
      capacity: S2.capacity,
      version: GAME_VERSION
    };
  }
  function emit2(reason) {
    const snap = snapshot();
    for (const cb of subs2) {
      try {
        cb(snap, reason);
      } catch (e) {
      }
    }
    try {
      document.dispatchEvent(new CustomEvent("game:changed", { detail: snap }));
    } catch (e) {
    }
  }
  function save2() {
    const data = {
      v: 1,
      xp: S2.xp,
      badges: S2.badges.slice(),
      missions: S2.missions.filter((m) => m.done).map((m) => m.id),
      stats: { ...S2.stats },
      mode: S2.mode,
      ts: Date.now()
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      S2.savedAt = data.ts;
      return true;
    } catch (e) {
      return false;
    }
  }
  function load2() {
    let raw = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (e) {
      return false;
    }
    if (!raw) return false;
    let d;
    try {
      d = JSON.parse(raw);
    } catch (e) {
      return false;
    }
    if (!d || typeof d !== "object") return false;
    S2.xp = Math.max(0, num(d.xp));
    S2.level = 1 + Math.floor(S2.xp / XP_PER_LEVEL);
    S2.unlocks = LEVEL_UNLOCKS.filter((u) => S2.level >= u.level).map((u) => u.key);
    S2.badges = Array.isArray(d.badges) ? d.badges.filter((b) => typeof b === "string") : [];
    const done = new Set(Array.isArray(d.missions) ? d.missions : []);
    S2.missions = MISSIONS.map((m) => ({ ...m, done: done.has(m.id) }));
    S2.stats = Object.assign(DEFAULT_STATS(), d.stats || {});
    S2.stats.missions = S2.missions.filter((m) => m.done).length;
    S2.stats.badges = S2.badges.length;
    S2.mode = typeof d.mode === "string" ? d.mode : "explore";
    S2.savedAt = num(d.ts);
    return true;
  }
  function addXP(n, why) {
    n = Math.round(num(n));
    if (!n) return S2.xp;
    const before = S2.level;
    S2.xp = Math.max(0, S2.xp + n);
    if (n > 0) S2.stats.xpEarned += n;
    S2.level = 1 + Math.floor(S2.xp / XP_PER_LEVEL);
    save2();
    if (S2.level > before) {
      const gained = [];
      for (const u of LEVEL_UNLOCKS) {
        if (S2.level >= u.level && !S2.unlocks.includes(u.key)) {
          S2.unlocks.push(u.key);
          gained.push(u);
        }
      }
      for (const h of levelHooks) {
        try {
          h(S2.level, why || "探索");
        } catch (e) {
        }
      }
      try {
        document.dispatchEvent(new CustomEvent(
          "game:levelup",
          { detail: { level: S2.level, xp: S2.xp, reason: why || "", unlocks: gained } }
        ));
      } catch (e) {
      }
    }
    emit2("xp");
    return S2.xp;
  }
  const missionDone = (id) => !!(S2.missions.find((x) => x.id === id) || {}).done;
  function complete(id, meta) {
    const m = S2.missions.find((x) => x.id === id);
    if (!m || m.done) return false;
    m.done = true;
    if (meta && typeof meta === "object") m.meta = meta;
    S2.stats.missions = S2.missions.filter((x) => x.done).length;
    save2();
    emit2("mission");
    addXP(m.reward, m.name);
    return true;
  }
  function awardBadge(id) {
    if (!id || S2.badges.includes(id)) return false;
    S2.badges.push(id);
    S2.stats.badges = S2.badges.length;
    save2();
    emit2("badge");
    addXP(24, "收集徽章");
    if (S2.badges.length >= 5) complete("m6");
    return true;
  }
  function evacDone({ successRate = 0, time = 0, rating = "C" } = {}) {
    S2.stats.evacRate = Math.round(successRate * 1e3) / 10;
    S2.stats.evacTime = Math.round(time);
    S2.stats.evacRuns += 1;
    const ok = successRate >= 0.85;
    emit2("evac");
    addXP(20, "疏散演练");
    if (ok) complete("m5", { successRate, time, rating });
    save2();
    return ok;
  }
  function reset(clearSave = true) {
    S2.xp = 0;
    S2.level = 1;
    S2.badges = [];
    S2.unlocks = [];
    S2.missions = MISSIONS.map((m) => ({ ...m, done: false }));
    S2.stats = DEFAULT_STATS();
    S2.mode = "explore";
    if (clearSave) {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch (e) {
      }
    }
    try {
      if (window.__caps && window.__caps.clear) window.__caps.clear();
    } catch (e) {
    }
    try {
      document.dispatchEvent(new CustomEvent("game:reset"));
    } catch (e) {
    }
    emit2("reset");
    return snapshot();
  }
  function setMode(mode) {
    if (!mode || S2.mode === mode) return S2.mode;
    S2.mode = mode;
    emit2("mode");
    return S2.mode;
  }
  function setCapacity(n) {
    n = Math.max(0, Math.round(num(n)));
    if (!n) return S2.capacity;
    S2.capacity = n;
    const def = MISSIONS.find((x) => x.id === "m5");
    const m = S2.missions.find((x) => x.id === "m5");
    if (def && m) m.desc = fillDesc(def.desc, n);
    emit2("capacity");
    return S2.capacity;
  }
  function unlocked(key) {
    if (!key) return false;
    if (S2.unlocks.includes(key)) return true;
    const u = LEVEL_UNLOCKS.find((x) => x.key === key);
    return !!(u && S2.level >= u.level);
  }
  function unlockList() {
    return LEVEL_UNLOCKS.map((u) => ({ ...u, got: unlocked(u.key) }));
  }
  function onChange2(cb) {
    if (typeof cb !== "function") return () => {
    };
    subs2.add(cb);
    try {
      cb(snapshot(), "init");
    } catch (e) {
    }
    return () => subs2.delete(cb);
  }
  const onLevel = (cb) => {
    if (typeof cb === "function") levelHooks.push(cb);
  };
  function setLandmarks(lm) {
    S2.landmarks = lm || null;
  }
  function checkPlayer(p) {
    const lm = S2.landmarks;
    if (!p || !lm) return null;
    const dxz = (q) => Math.hypot(p.x - q.x, p.z - q.z);
    const hit = [];
    if (!missionDone("m1") && lm.plaza && dxz(lm.plaza) < 55 && p.y < 14) hit.push("m1");
    if (!missionDone("m2") && lm.hall && dxz(lm.hall) < 22 && p.y < 16) hit.push("m2");
    if (!missionDone("m3") && lm.concourse && p.y > lm.concourse.y - 4 && p.y < lm.concourse.y + 8 && dxz(lm.concourse) < 26) hit.push("m3");
    if (!missionDone("m4") && lm.tunnel && dxz(lm.tunnel) < 26 && p.y < 20) hit.push("m4");
    for (const id of hit) complete(id);
    return hit.length ? hit : null;
  }
  function tick(dt) {
    if (dt > 0 && dt < 1) S2.stats.playTime += dt;
  }
  const api2 = {
    __isGame: true,
    VERSION: GAME_VERSION,
    get xp() {
      return S2.xp;
    },
    get level() {
      return S2.level;
    },
    get xpMax() {
      return XP_PER_LEVEL;
    },
    get xpInLevel() {
      return inLevel();
    },
    get badges() {
      return S2.badges;
    },
    get missions() {
      return S2.missions;
    },
    get stats() {
      return S2.stats;
    },
    get mode() {
      return S2.mode;
    },
    get capacity() {
      return S2.capacity;
    },
    get unlocks() {
      return S2.unlocks.slice();
    },
    get saveKey() {
      return SAVE_KEY;
    },
    get nextMission() {
      return S2.missions.find((m) => !m.done) || null;
    },
    addXP,
    complete,
    reset,
    save: save2,
    load: load2,
    onChange: onChange2,
    onLevel,
    missionDone,
    awardBadge,
    evacDone,
    setMode,
    setLandmarks,
    checkPlayer,
    tick,
    snapshot,
    emit: emit2,
    setCapacity,
    unlocked,
    unlockList,
    LEVEL_UNLOCKS,
    initWorld
  };
  load2();
  window.__game = api2;
  try {
    window.addEventListener("pagehide", save2);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") save2();
    });
  } catch (e) {
  }
  emit2("boot");
  return api2;
}
var SAVE_KEY, XP_PER_LEVEL, GAME_VERSION, MISSIONS, fillDesc, LEVEL_UNLOCKS, DEFAULT_STATS, clamp7, num, _worldP;
var init_state = __esm({
  "src/game/state.js"() {
    SAVE_KEY = "tidal_arena_save_v1";
    XP_PER_LEVEL = 120;
    GAME_VERSION = "v5.0";
    MISSIONS = [
      { id: "m1", name: "抵达球迷广场", desc: "走出场馆，来到南侧球迷广场", reward: 24 },
      { id: "m2", name: "进入入口大厅", desc: "穿过 24m 主入口券洞，走进门厅", reward: 24 },
      { id: "m3", name: "登上二层环廊", desc: "上到二层环廊，俯瞰 105×68m 全场", reward: 30 },
      { id: "m4", name: "进入球员通道", desc: "走进北侧球员通道（更衣室方向）", reward: 30 },
      { id: "m5", name: "完成疏散演练", desc: "{n} 人疏散成功率 ≥ 85%", reward: 40 },
      { id: "m6", name: "集齐 5 枚徽章", desc: "广场 / 门厅 / 一层环廊 / 二层环廊 / 中圈 全收集", reward: 48 }
    ];
    fillDesc = (desc, n) => String(desc || "").replace(/\{n\}/g, (n || 0).toLocaleString("en-US"));
    LEVEL_UNLOCKS = [
      { level: 2, key: "dusk", name: "黄昏模式", desc: "第三种照明预设：日落后 18 分钟的天光" },
      { level: 3, key: "film", name: "胶片滤镜", desc: "照片模式解锁暖调 / 黑白 / 青调与构图评分" },
      { level: 4, key: "broadcast", name: "应急广播", desc: "疏散调度台解锁 3 次分区疏导" },
      { level: 5, key: "codex", name: "建筑洞察图鉴", desc: "解锁 12 处建筑细节的讲解与收藏" }
    ];
    DEFAULT_STATS = () => ({
      playTime: 0,
      missions: 0,
      badges: 0,
      evacRate: 0,
      evacTime: 0,
      evacRuns: 0,
      photos: 0,
      distance: 0,
      xpEarned: 0
    });
    clamp7 = (v, a, b) => v < a ? a : v > b ? b : v;
    num = (v, d = 0) => typeof v === "number" && isFinite(v) ? v : d;
    _worldP = null;
    if (typeof window !== "undefined") {
      try {
        if (!window.__game) createGame();
      } catch (e) {
        console.warn("[game] state 初始化失败", e);
      }
    }
  }
});

// src/app.js
init_core();
import * as THREE23 from "three";

// src/scenes/sky.js
init_core();
import * as THREE3 from "three";

// src/lib/sections.js
var PITCH = { L: 105, W: 68 };
var HALF_Z = PITCH.L / 2;
var HALF_X = PITCH.W / 2;
var CORNER_F = 0.36;
var SEGS = 192;
var TREAD = 0.8;
var RISER = 0.5;
var AISLE_W = 1.2;
var SEAT_PITCH = 0.52;
var ZONES = 20;
var AISLE_EVERY = 4;
var SEAT_DEFS = [
  { id: "L1", name: "下层看台", rows: 28, s0: 8.8, y0: 1.35, color: "#c9a15f" },
  { id: "L2", name: "中层看台", rows: 19, s0: null, y0: null, color: "#8fb6c4" },
  { id: "L3", name: "上层看台", rows: 17, s0: null, y0: null, color: "#b7a0c4" }
];
var CONCOURSE_DEPTH = [13, 11, 8];
var CONCOURSE_DY = 0.9;
var TIER_GAP = [0, 0, 6.4];
function buildTiers() {
  const out = [];
  let s = SEAT_DEFS[0].s0, y = SEAT_DEFS[0].y0;
  SEAT_DEFS.forEach((def, i) => {
    const rows = [];
    let ss = s, yy = y;
    for (let k = 0; k < def.rows; k++) {
      const isAisle = k % AISLE_EVERY === 0 && k > 0;
      const sFront = ss + (isAisle ? AISLE_W : 0);
      rows.push({ tier: def.id, k, sFront, sBack: sFront + TREAD, y: yy, yBack: yy + RISER, aisle: isAisle });
      ss = sFront + TREAD;
      yy += RISER;
    }
    const endS = ss, endY = yy;
    const cDepth = CONCOURSE_DEPTH[i] ?? 8;
    const cY = endY + CONCOURSE_DY;
    out.push({
      id: def.id,
      name: def.name,
      color: def.color,
      rows,
      n: def.rows,
      s0: s,
      y0: y,
      endS,
      endY,
      cDepth,
      cY,
      cS0: endS,
      cS1: endS + cDepth,
      // 本层看台体量的底面（落在下一层环廊楼面上）
      soffitY: i === 0 ? -1.2 : out[i - 1].cY - 0.55
    });
    s = endS + cDepth;
    y = cY + (TIER_GAP[i + 1] ?? 0.9);
  });
  return out;
}
var TIERS = buildTiers();
var L1 = TIERS[0];
var L2 = TIERS[1];
var L3 = TIERS[2];
var BACK_S = L3.cS1;
var BACK_Y = L3.endY;
var C3_Y = L3.cY;
var SUITE_BOTTOM = L2.cY;
var SUITE_TOP = L3.y0 - 0.35;
var GEO = {
  /* 场地周边 */
  boardS: 5.2,
  boardH: 1.05,
  barrierS: 6.2,
  barrierH: 1.18,
  apron: 6,
  /* 外立面（三段：基座 / 网幕 / 潮冠） */
  outerS: BACK_S + 1.2,
  outerBaseY: 17,
  // 基座顶
  outerMidY: 31.2,
  // 网幕上沿
  outerTopY: 43.7,
  // 檐口下沿（v3：随看台增高上抬 1.5m）
  crownY: 47.3,
  // 潮冠顶（外挑 3.2m）
  crownOut: 3.2,
  /* 屋盖：鞍面环带 */
  roofInnerS: 23.5,
  roofInnerY: 45.4,
  roofRidgeS: 64,
  roofRidgeY: 51.8,
  roofOuterS: BACK_S + 8.4,
  roofOuterY: 47.5,
  roofThick: 1.3,
  saddleAmp: 3.4,
  trussStep: 8,
  // 每 8 段一榀 → 24 榀
  /* 八根潮柱（4 角 + 4 边中，外倾） */
  mastS_base: BACK_S + 21,
  mastS_top: BACK_S + 2.4,
  mastBaseY: -1.2,
  /* 主券洞 / 次入口 */
  portalHalfU: 0.03,
  portalH: 23,
  portalRecess: 9,
  subDoorU: [0.0625, 0.1875, 0.3125, 0.4375, 0.5625, 0.6875, 0.8125, 0.9375],
  subHalfU: 0.0105,
  subH: 7,
  /* 贵宾包厢夹层（L2 环廊之上、L3 座席之下，面向场地） */
  suiteS: L2.cS1 - 0.2,
  // 包厢前玻璃面（= L2 末排后墙）
  suiteDepth: 5.6,
  suiteLevels: [SUITE_BOTTOM + 0.35, SUITE_BOTTOM + 3.55],
  suiteH: 3,
  suiteWalk: 4.2,
  // 包厢后走道净宽
  /* 球门 / 大屏 */
  screenS: BACK_S - 9,
  screenY: 34.2,
  screenW: 26,
  screenH: 13,
  groundY: -1.2
};
var PORTALS = [0, 0.25, 0.5, 0.75];
var PORTAL_NAMES = ["北门 · 球迷广场", "东门 · 公交接驳", "南门 · 城市大道", "西门 · 训练场"];
var SUB_DOORS = GEO.subDoorU;
var EXITS = [
  ...PORTALS.map((u, i) => ({ id: "P" + (i + 1), u, kind: "main", name: PORTAL_NAMES[i] })),
  ...SUB_DOORS.map((u, i) => ({ id: "S" + (i + 1), u, kind: "sub", name: "次入口 " + (i + 1) }))
];
function saddleAt(i, segs = SEGS) {
  const th = i / segs * Math.PI * 2;
  return Math.cos(4 * th) * 0.5 * GEO.saddleAmp;
}
function roofBaseY(s) {
  const { roofInnerS: a, roofInnerY: ya, roofRidgeS: b, roofRidgeY: yb, roofOuterS: c, roofOuterY: yc } = GEO;
  if (s <= a) return ya - (a - s) * 0.02;
  if (s <= b) return ya + (yb - ya) * Math.pow((s - a) / (b - a), 0.78);
  return yb + (yc - yb) * Math.pow((s - b) / (c - b), 1.35);
}
function roofY(s, i, segs = SEGS) {
  const { roofInnerS: a, roofOuterS: c } = GEO;
  const w = 0.3 + 0.7 * Math.min(1, Math.max(0, (s - a) / (c - a)));
  return roofBaseY(s) + saddleAt(i, segs) * w;
}
function roofMod(dy = 0) {
  return (i, s) => roofY(s, i) - roofBaseY(s) + dy;
}

// src/lib/rings.js
import * as THREE2 from "three";
function roundedPerimeter(hx, hz, r, n) {
  const ix = Math.max(0.01, hx - r), iz = Math.max(0.01, hz - r);
  const arc = Math.PI / 2 * r;
  const SH = [
    { t: "l", len: ix, p0: [0, hz], d: [1, 0] },
    { t: "a", len: arc, cx: ix, cz: iz, a0: Math.PI / 2, sw: -Math.PI / 2 },
    { t: "l", len: 2 * iz, p0: [hx, iz], d: [0, -1] },
    { t: "a", len: arc, cx: ix, cz: -iz, a0: 0, sw: -Math.PI / 2 },
    { t: "l", len: 2 * ix, p0: [ix, -hz], d: [-1, 0] },
    { t: "a", len: arc, cx: -ix, cz: -iz, a0: -Math.PI / 2, sw: -Math.PI / 2 },
    { t: "l", len: 2 * iz, p0: [-hx, -iz], d: [0, 1] },
    { t: "a", len: arc, cx: -ix, cz: iz, a0: Math.PI, sw: -Math.PI / 2 },
    { t: "l", len: ix, p0: [-ix, hz], d: [1, 0] }
  ];
  const total = SH.reduce((a, x) => a + x.len, 0);
  const raw = SH.map((x) => x.len / total * n);
  const cnt = raw.map((v) => Math.max(2, Math.floor(v)));
  let sum = cnt.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - cnt[i], i]).sort((a, b) => b[0] - a[0]);
  let k = 0;
  while (sum < n) {
    cnt[order[k % 9][1]]++;
    sum++;
    k++;
  }
  while (sum > n) {
    const i = order[8 - k % 9][1];
    if (cnt[i] > 2) {
      cnt[i]--;
      sum--;
    }
    k++;
  }
  const pts = [];
  let gi = 0;
  SH.forEach((sh, si) => {
    const c = cnt[si];
    for (let i = 0; i < c; i++, gi++) {
      let x, z, tx, tz;
      if (sh.t === "l") {
        const f = i / c;
        x = sh.p0[0] + sh.d[0] * sh.len * f;
        z = sh.p0[1] + sh.d[1] * sh.len * f;
        tx = sh.d[0];
        tz = sh.d[1];
      } else {
        const a = sh.a0 + sh.sw * (i / c);
        x = sh.cx + Math.cos(a) * r;
        z = sh.cz + Math.sin(a) * r;
        const sg = Math.sign(sh.sw);
        tx = -Math.sin(a) * sg;
        tz = Math.cos(a) * sg;
      }
      let nx = tz, nz = -tx;
      if (nx * x + nz * z < 0) {
        nx = -nx;
        nz = -nz;
      }
      const dl = Math.hypot(nx, nz) || 1;
      pts.push({ x, z, nx: nx / dl, nz: nz / dl, u: gi / n });
    }
  });
  return { pts, total, hx, hz, r, counts: cnt };
}
var _refCache = /* @__PURE__ */ new Map();
function refRing(segs = SEGS) {
  if (!_refCache.has(segs)) _refCache.set(segs, roundedPerimeter(HALF_X, HALF_Z, HALF_X * CORNER_F, segs));
  return _refCache.get(segs);
}
function boundaryT(hx, hz, r, ex, ez) {
  const ax = hx - r, az = hz - r;
  const a = Math.abs(ex), c = Math.abs(ez);
  const te = Math.min(a > 1e-9 ? ax / a : Infinity, c > 1e-9 ? az / c : Infinity);
  if (Math.abs(ex) * te <= ax + 1e-6 && Math.abs(ez) * te <= az + 1e-6) return te;
  const bq = ax * a + az * c, aq = a * a + c * c, cq = ax * ax + az * az - r * r;
  return (bq + Math.sqrt(Math.max(0, bq * bq - aq * cq))) / aq;
}
function pt(i, s, y, segs = SEGS) {
  const rr = refRing(segs);
  const f = (i % segs + segs) % segs;
  const i0 = Math.floor(f) % segs, i1 = (i0 + 1) % segs, fr = f - Math.floor(f);
  const a = rr.pts[i0], b2 = rr.pts[i1];
  if (!a) return new THREE2.Vector3(0, y, 0);
  let nx = a.nx, nz = a.nz;
  if (fr > 1e-6 && b2) {
    nx = a.nx + (b2.nx - a.nx) * fr;
    nz = a.nz + (b2.nz - a.nz) * fr;
    const l = Math.hypot(nx, nz) || 1;
    nx /= l;
    nz /= l;
  }
  return radialPoint({ nx, nz }, s, y);
}
function radialPoint(b, s, y) {
  const hx = HALF_X + s, hz = HALF_Z + s;
  const t = boundaryT(hx, hz, hx * CORNER_F, b.nx, b.nz);
  return new THREE2.Vector3(b.nx * t, y, b.nz * t);
}
function sweepRing(profile, opts = {}) {
  const segs = opts.segs || SEGS;
  const yMod = opts.yMod || null;
  const rr = refRing(segs);
  const n = profile.length;
  const closed = !opts.uRange;
  const pos = [], nor = [], uv = [], idx = [];
  let rows, segIndexAt;
  if (closed) {
    rows = segs;
    segIndexAt = (r) => (r % segs + segs) % segs;
  } else {
    const [u0, u1] = opts.uRange;
    const i0 = Math.round(u0 * segs), i1 = Math.round(u1 * segs);
    segIndexAt = (r) => ((i0 + r) % segs + segs) % segs;
    rows = Math.max(2, i1 - i0 + 1);
  }
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = profile[i], b = profile[(i + 1) % n];
    area += a.s * b.y - b.s * a.y;
  }
  const ccw = area > 0;
  const pn = [];
  for (let i = 0; i < n; i++) {
    const i0 = opts.open ? Math.max(0, i - 1) : (i - 1 + n) % n;
    const i1 = opts.open ? Math.min(n - 1, i + 1) : (i + 1) % n;
    const p0 = profile[i0], p1 = profile[i1];
    let ds = p1.s - p0.s, dy = p1.y - p0.y;
    const l = Math.hypot(ds, dy) || 1;
    ds /= l;
    dy /= l;
    pn.push(ccw ? [dy, -ds] : [-dy, ds]);
  }
  const tTable = [], yTable = [];
  for (let r = 0; r < rows; r++) {
    const si = segIndexAt(r);
    const b = rr.pts[si];
    const rowT = new Float32Array(n), rowY = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const s = profile[i].s;
      const hx = HALF_X + s, hz = HALF_Z + s;
      rowT[i] = boundaryT(hx, hz, hx * CORNER_F, b.nx, b.nz);
      rowY[i] = profile[i].y + (yMod ? yMod(si, s, i) : 0);
    }
    tTable.push(rowT);
    yTable.push(rowY);
  }
  const dist = [0];
  for (let i = 1; i < n; i++) dist.push(dist[i - 1] + Math.hypot(profile[i].s - profile[i - 1].s, profile[i].y - profile[i - 1].y));
  const uS = opts.uScale || 0.05, vS = opts.vScale || 0.05;
  const uvOff = opts.uvOff || [0, 0];
  for (let r = 0; r < rows; r++) {
    const b = rr.pts[segIndexAt(r)];
    for (let i = 0; i < n; i++) {
      const t = tTable[r][i];
      pos.push(b.nx * t, yTable[r][i], b.nz * t);
      nor.push(b.nx * pn[i][0], pn[i][1], b.nz * pn[i][0]);
      uv.push(uvOff[0] + r / rows * rr.total * uS, uvOff[1] + dist[i] * vS);
    }
  }
  const segCount = closed ? segs : rows - 1;
  for (let r = 0; r < segCount; r++) {
    const a0 = r * n, a1 = (closed ? (r + 1) % segs : r + 1) * n;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (i === n - 1 && opts.open) continue;
      if (ccw) idx.push(a0 + i, a1 + i, a0 + j, a0 + j, a1 + i, a1 + j);
      else idx.push(a0 + i, a0 + j, a1 + i, a0 + j, a1 + j, a1 + i);
    }
  }
  if (opts.capEnds && !closed) {
    const tris = THREE2.ShapeUtils.triangulateShape(profile.map((p) => new THREE2.Vector2(p.s, p.y)), []);
    for (const which of [0, rows - 1]) {
      const b = rr.pts[segIndexAt(which)];
      const start = pos.length / 3;
      for (let i = 0; i < n; i++) {
        const t = tTable[which][i];
        pos.push(b.nx * t, yTable[which][i], b.nz * t);
        nor.push(b.nx * (which === 0 ? -1 : 1), 0, b.nz * (which === 0 ? -1 : 1));
        uv.push(0, i / n);
      }
      for (const tri of tris) {
        if (which === 0) idx.push(start + tri[0], start + tri[2], start + tri[1]);
        else idx.push(start + tri[0], start + tri[1], start + tri[2]);
      }
    }
  }
  const g = new THREE2.BufferGeometry();
  g.setAttribute("position", new THREE2.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE2.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE2.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}
function plateRing(line, thick, dir = -1, opts = {}) {
  const len = line.length;
  const bot = [];
  for (let i = len - 1; i >= 0; i--) {
    const p0 = line[Math.max(0, i - 1)], p1 = line[Math.min(len - 1, i + 1)];
    let ds = p1.s - p0.s, dy = p1.y - p0.y;
    const l = Math.hypot(ds, dy) || 1;
    ds /= l;
    dy /= l;
    const nx = dy * dir, ny = -ds * dir;
    bot.push({ s: line[i].s + nx * thick, y: line[i].y + ny * thick });
  }
  return sweepRing(line.concat(bot), opts);
}
function every(step2, segs = SEGS) {
  const out = [];
  for (let i = 0; i < segs; i += step2) out.push(i);
  return out;
}
function segWindow(centerU, halfU, segs = SEGS) {
  const c = Math.round(centerU * segs), h = Math.max(1, Math.round(halfU * segs));
  return { i0: c - h, i1: c + h, u0: (c - h) / segs, u1: (c + h) / segs };
}
function subtractWindows(total, windows) {
  const list = windows.map((w) => [(w.u0 % 1 + 1) % 1, (w.u1 % 1 + 1) % 1]).sort((a, b) => a[0] - b[0]);
  const out = [];
  let cur = 0;
  for (const [a, b] of list) {
    if (b <= a) continue;
    if (a > cur) out.push([cur, a]);
    cur = Math.max(cur, b);
  }
  if (cur < 1) out.push([cur, 1]);
  return out;
}

// src/scenes/sky.js
var LIGHT_RIGS = [0.125, 0.375, 0.625, 0.875].map((u) => {
  const idx = Math.round(u * SEGS) % SEGS;
  const p = radialPoint(refRing(SEGS).pts[idx], GEO.roofInnerS + 3, 0);
  const y = roofY(GEO.roofInnerS + 3, idx) - 3.4;
  return { u, idx, pos: new THREE3.Vector3(p.x, y, p.z) };
});
var vert = (
  /* glsl */
  `
varying vec3 vWorld;
void main(){
  /* 天空球跟随相机（在 JS 里每帧 copy 相机位置），这里传"世界方向"
     而不是世界坐标：片元里 normalize 后才能得到真正的视线方向。
     用 position（球面局部坐标，球心在原点、半径 4200）即可。 */
  vWorld = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`
);
var frag = (
  /* glsl */
  `
precision highp float;
uniform vec3 cTop, cHor, cBot;
uniform vec3 sunDir, sunCol, cloudA, cloudB, glowCol;
uniform float night, sunI, haze, stars, flood, time, cloudAmt;
uniform vec2 sunUV;
varying vec3 vWorld;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return s;
}
/* 非对称幂次渐变：地平线附近压得很薄，天顶蓝更纯净 */
vec3 skyGrad(float h){
  float hp = clamp(h, 0.0, 1.0);
  float t = pow(hp, 0.42);
  // 地平线一圈的薄暖带
  float band = exp(-hp * 16.0);
  vec3 c = mix(cHor, cTop, t);
  c = mix(c, cHor * 1.06, band * 0.45);
  return c;
}

void main(){
  vec3 d = normalize(vWorld);
  float h = d.y;
  vec3 col = h > 0.0
    ? skyGrad(h)
    : mix(cHor, cBot, pow(clamp(-h, 0.0, 1.0), 0.30));

  vec3 sd = normalize(sunDir);

  /* ── 太阳 ──
     注意：sunI 也用来驱动场景直射光（白天会上调），天空里的太阳光晕必须
     单独钳制，否则一提亮地面天空就整片过曝成白色。 */
  float sI = min(sunI, 2.2);
  float sdw = max(dot(d, sd), 0.0);
  float disk = smoothstep(0.99955, 0.99978, sdw);
  col += sunCol * disk * sI * 6.0;
  col += sunCol * pow(sdw, 260.0) * sI * 0.35;                 // 紧贴光晕
  col += sunCol * pow(sdw, 22.0) * sI * 0.10;                  // 中景散射
  col += sunCol * pow(sdw, 3.0) * sI * 0.018;

  /* ── 夜间月亮：反方向的小圆盘 ── */
  float mdw = max(dot(d, -sd), 0.0);
  col += vec3(0.82, 0.88, 1.0) * smoothstep(0.9992, 0.99965, mdw) * night * 0.85;
  col += vec3(0.55, 0.66, 0.92) * pow(mdw, 90.0) * night * 0.05;

  /* ── 地平线城市光晕（只在深夜出现；黄昏/白天由太阳光晕主导） ── */
  float glowAmt = clamp((night - 0.45) / 0.55, 0.0, 1.0);
  if (glowAmt > 0.01) {
    float glow = exp(-max(h, 0.0) * 13.0) * (1.0 - smoothstep(0.0, 0.30, h));
    col += glowCol * glow * glowAmt * (0.105 + 0.055 * vnoise(vec2(atan(d.z, d.x) * 22.0, h * 16.0)));
    /* 城市灯点：贴地平线的一圈散点（不越过天空中部） */
    float hz = smoothstep(-0.004, 0.002, h) * (1.0 - smoothstep(0.008, 0.030, h));
    if (hz > 0.01) {
      vec2 uv = vec2(atan(d.z, d.x) * 80.0, h * 900.0);
      vec2 cell = floor(uv);
      float r = hash(cell);
      float tw = 0.6 + 0.4 * sin(time * 0.7 + r * 60.0);
      float pt = smoothstep(0.93, 1.0, r) * tw;
      col += mix(vec3(1.0, 0.80, 0.52), vec3(0.72, 0.86, 1.0), hash(cell + 7.0)) * pt * hz * glowAmt * 0.75;
    }
  }

  /* ── 云（只在白天/黄昏明显） ── */
  if (h > -0.02 && cloudAmt > 0.01) {
    float t = time * 0.004;
    vec2 uv = d.xz / (abs(h) + 0.16) * 0.85 + vec2(t, t * 0.36);
    float c = fbm(uv * 1.15);
    c = smoothstep(0.52, 0.86, c) * smoothstep(0.0, 0.22, h);
    vec3 cc = mix(cloudB, cloudA, smoothstep(0.35, 0.85, fbm(uv * 1.15 + 3.0)));
    cc += sunCol * pow(sdw, 4.0) * 0.30 * sunI;
    cc *= 1.0 - night * 0.72;
    col = mix(col, cc, c * cloudAmt * 0.85);
  }

  /* ── 星空 ── */
  float starAmt = stars * clamp((night - 0.55) / 0.45, 0.0, 1.0);
  if (starAmt > 0.01 && h > 0.02) {
    vec2 sp = d.xz / (h + 0.34) * 120.0;
    vec2 cell = floor(sp);
    float s = hash(cell);
    float tw = 0.55 + 0.45 * sin(time * 1.7 + s * 55.0);
    float star = smoothstep(0.9974, 1.0, s) * tw;
    vec3 sc = mix(vec3(0.85, 0.9, 1.0), vec3(1.0, 0.92, 0.8), hash(cell + 3.0));
    col += sc * star * starAmt * smoothstep(0.02, 0.42, h) * 1.15;
  }

  /* 输出「线性 HDR」颜色，交给后期 ComposeShader 统一做 ACES + sRGB 编码。
     手写 sRGB 编码会导致天空被后处理当成线性再压一次，一提曝光就整片过曝。 */
  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
}`
);
var coneVert = (
  /* glsl */
  `
varying vec2 vUv; varying float vEdge;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vEdge = 1.0;
  gl_Position = projectionMatrix * mv;
}`
);
var coneFrag = (
  /* glsl */
  `
uniform vec3 color; uniform float intensity;
varying vec2 vUv;
void main(){
  float along = vUv.y;                              // 0 = 灯口, 1 = 地面
  float a = pow(1.0 - along, 1.25) * 0.55 * intensity;
  a *= smoothstep(0.0, 0.06, along);
  gl_FragColor = vec4(color, a);
}`
);
var poolVert = (
  /* glsl */
  `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
);
var poolFrag = (
  /* glsl */
  `
uniform vec3 color; uniform float intensity;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float a = pow(max(0.0, 1.0 - r), 2.2) * intensity;
  gl_FragColor = vec4(color, a * 0.85);
}`
);
function buildSky(scene) {
  const U = {
    cTop: { value: new THREE3.Color(PRESETS.night.skyTop) },
    cHor: { value: new THREE3.Color(PRESETS.night.skyHor) },
    cBot: { value: new THREE3.Color(PRESETS.night.skyBot) },
    sunDir: { value: new THREE3.Vector3(0.4, 0.3, 0.86).normalize() },
    sunCol: { value: new THREE3.Color(PRESETS.night.sun) },
    cloudA: { value: new THREE3.Color(PRESETS.night.cloudA) },
    cloudB: { value: new THREE3.Color(PRESETS.night.cloudB) },
    glowCol: { value: new THREE3.Color("#ffb46a") },
    night: { value: 1 },
    sunI: { value: 1 },
    haze: { value: 1 },
    stars: { value: 1 },
    flood: { value: 1 },
    time: { value: 0 },
    cloudAmt: { value: 0.62 },
    sunUV: { value: new THREE3.Vector2(0.5, 0.5) }
  };
  const domeMat = new THREE3.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: U,
    side: THREE3.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: true
  });
  const dome = new THREE3.Mesh(new THREE3.SphereGeometry(4200, 64, 40), domeMat);
  dome.name = "sky-dome";
  dome.renderOrder = -1e3;
  dome.frustumCulled = false;
  scene.add(dome);
  const hemi = new THREE3.HemisphereLight(5072016, 1316378, 0.6);
  hemi.name = "sky-hemi";
  scene.add(hemi);
  const ambient = new THREE3.AmbientLight(8952251, 0.18);
  ambient.name = "sky-ambient";
  scene.add(ambient);
  const sun = new THREE3.DirectionalLight(12834047, 0.2);
  sun.name = "sky-sun";
  sun.position.set(-380, 520, 420);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -320;
  sc.right = 320;
  sc.top = 320;
  sc.bottom = -320;
  sc.near = 60;
  sc.far = 2400;
  sun.shadow.bias = -4e-4;
  sun.shadow.normalBias = 1.2;
  sun.shadow.autoUpdate = true;
  scene.add(sun);
  scene.add(sun.target);
  const floods = [];
  LIGHT_RIGS.forEach((rig) => {
    const l = new THREE3.DirectionalLight(16774114, 0);
    l.position.copy(rig.pos).multiplyScalar(1);
    l.target.position.set(0, 0, 0);
    scene.add(l);
    scene.add(l.target);
    floods.push(l);
  });
  const top = new THREE3.DirectionalLight(16771532, 0);
  top.position.set(0, 220, 0);
  top.target.position.set(0, 0, 0);
  scene.add(top);
  scene.add(top.target);
  const coneGroup = new THREE3.Group();
  coneGroup.name = "sky-lightcones";
  scene.add(coneGroup);
  const cones = [];
  LIGHT_RIGS.forEach((rig) => {
    const topP = rig.pos.clone();
    const footP = new THREE3.Vector3(0, 0.02, 0);
    const len = topP.distanceTo(footP);
    const rTop = 7.5, rBot = 26;
    const g = new THREE3.CylinderGeometry(rTop, rBot, len, 22, 1, true);
    g.translate(0, -len / 2, 0);
    const mat = new THREE3.ShaderMaterial({
      vertexShader: coneVert,
      fragmentShader: coneFrag,
      uniforms: {
        color: { value: new THREE3.Color("#ffeccd") },
        intensity: { value: 0 }
      },
      transparent: true,
      depthWrite: false,
      side: THREE3.DoubleSide,
      blending: THREE3.AdditiveBlending,
      fog: false,
      toneMapped: false
    });
    const m = new THREE3.Mesh(g, mat);
    m.position.copy(topP);
    m.lookAt(footP);
    m.rotateX(-Math.PI / 2);
    m.frustumCulled = false;
    m.renderOrder = 8;
    coneGroup.add(m);
    cones.push(mat);
  });
  const poolGroup = new THREE3.Group();
  poolGroup.name = "sky-lightpools";
  scene.add(poolGroup);
  const pools = [];
  LIGHT_RIGS.forEach((rig) => {
    const g = new THREE3.PlaneGeometry(74, 60);
    g.rotateX(-Math.PI / 2);
    const mat = new THREE3.ShaderMaterial({
      vertexShader: poolVert,
      fragmentShader: poolFrag,
      uniforms: { color: { value: new THREE3.Color("#fff2dd") }, intensity: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE3.AdditiveBlending,
      fog: false,
      toneMapped: false
    });
    const m = new THREE3.Mesh(g, mat);
    const c = rig.pos.clone().setY(0);
    const k = 0.42;
    m.position.set(c.x * k, 0.045, c.z * k);
    m.renderOrder = 7;
    poolGroup.add(m);
    pools.push(mat);
  });
  const pitchGlowGeo = new THREE3.PlaneGeometry(150, 112);
  pitchGlowGeo.rotateX(-Math.PI / 2);
  const pitchGlowMat = new THREE3.ShaderMaterial({
    vertexShader: poolVert,
    fragmentShader: poolFrag,
    uniforms: { color: { value: new THREE3.Color("#fff4e4") }, intensity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE3.AdditiveBlending,
    fog: false,
    toneMapped: false
  });
  const pitchGlow = new THREE3.Mesh(pitchGlowGeo, pitchGlowMat);
  pitchGlow.position.y = 0.04;
  pitchGlow.renderOrder = 6;
  poolGroup.add(pitchGlow);
  const points = [];
  const PT_DEFS = [
    [0, 3, 196, 16767400, 190, 40],
    // 广场水景 / 大台阶
    [0, 4, 300, 16764826, 190, 34],
    // 南侧商业带
    [-215, 14, -34, 16773334, 140, 90],
    // 训练场
    [230, 6, 30, 16770754, 120, 26],
    // 公交 / 地铁接驳
    [232, 18, 232, 16772300, 130, 46],
    // 停车楼
    [-240, 12, 196, 16769724, 120, 30],
    // 西侧社区
    [0, 3, 0, 16773854, 160, 0.6]
    // 场地中心（与灯桥叠加的柔光）
  ];
  const addPoint = (x, y, z, color, dist, _i) => {
    const p = new THREE3.PointLight(color, 0, dist, 2);
    p.position.set(x, y, z);
    scene.add(p);
    points.push(p);
    return p;
  };
  PT_DEFS.forEach((d, i) => addPoint(d[0], d[1], d[2], d[3], d[4], i));
  let stageRef = null;
  let lampsRef = null;
  const api2 = {
    dome,
    U,
    hemi,
    ambient,
    sun,
    floods,
    top,
    cones,
    pools,
    points,
    coneGroup,
    poolGroup,
    rigs: LIGHT_RIGS,
    update(dt, t) {
      U.time.value = t;
      const nightF = clamp(preset.night ?? 0, 0, 1);
      U.cTop.value.set(preset.skyTop);
      U.cHor.value.set(preset.skyHor);
      U.cBot.value.set(preset.skyBot);
      U.sunCol.value.set(preset.sun);
      U.cloudA.value.set(preset.cloudA || "#ffffff");
      U.cloudB.value.set(preset.cloudB || "#cccccc");
      U.glowCol.value.set(preset.night > 0.5 ? "#f0c79a" : "#ffd2a0");
      U.haze.value = preset.haze ?? 1;
      U.night.value = nightF;
      U.stars.value = preset.stars;
      U.flood.value = preset.flood;
      U.cloudAmt.value = clamp(0.25 + (preset.haze ?? 1) * 0.55, 0, 0.95);
      const el = (preset.sunEl ?? 8) * Math.PI / 180;
      const az = (preset.sunAz ?? 0) * Math.PI / 180;
      const dir = new THREE3.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).normalize();
      U.sunDir.value.copy(dir);
      U.sunI.value = clamp(preset.sunI ?? 1, 0, 4);
      const sunI = preset.sunI ?? 1;
      hemi.color.set(preset.hemiSky);
      hemi.groundColor.set(preset.hemiGround);
      hemi.intensity = (preset.hemiI ?? 1) * (nightF > 0.5 ? 0.92 : 1);
      ambient.intensity = 0.06 + nightF * 0.16;
      sun.color.set(preset.sun);
      sun.intensity = sunI * (nightF > 0.6 ? 0.55 : 0.62);
      sun.position.copy(dir).multiplyScalar(1400);
      sun.castShadow = (preset.sunI ?? 0) > 0.5;
      const fi = preset.floodI ?? 0;
      for (let i = 0; i < floods.length; i++) {
        const l = floods[i];
        l.intensity = fi * 0.3;
        const rig = LIGHT_RIGS[i];
        l.position.copy(rig.pos);
        l.target.position.set(rig.pos.x * -0.18, 0, rig.pos.z * -0.18);
      }
      top.intensity = fi * 0.09;
      const coneI = clamp(fi / 2.2, 0, 1) * (0.35 + 0.65 * nightF);
      for (const m of cones) m.uniforms.intensity.value = coneI;
      for (const m of pools) m.uniforms.intensity.value = coneI * 0.9;
      pitchGlowMat.uniforms.intensity.value = coneI * 0.32;
      coneGroup.visible = coneI > 0.02;
      poolGroup.visible = coneI > 0.02;
      const ptI = clamp(fi / 2.2, 0, 1.4) * (0.3 + nightF);
      for (let i = 0; i < points.length; i++) {
        points[i].intensity = PT_DEFS[i][5] * ptI;
      }
      if (lampsRef) for (const sp of lampsRef) sp.intensity = (fi || 0) * 6;
      if (scene.fog) {
        scene.fog.color.set(preset.fog);
        scene.fog.density = preset.fogD;
      }
      if (stageRef && stageRef.renderer) {
        stageRef.renderer.toneMappingExposure = preset.exposure;
        stageRef.renderer.setClearColor(new THREE3.Color(preset.skyHor), 1);
      }
      applyEnvFromPreset(preset);
    }
  };
  api2.bindStage = (s) => {
    stageRef = s;
  };
  api2.bindLamps = (arr) => {
    lampsRef = arr;
    if (arr) arr.forEach((sp) => {
      sp.castShadow = false;
      sp.angle = 0.9;
      sp.penumbra = 0.6;
    });
  };
  return api2;
}

// src/scenes/arena.js
import * as THREE5 from "three";

// src/lib/seats.js
var SKIP_U = [[-0.0105, 0.0105], [0.4895, 0.5105]];
var inSkip = (u) => {
  const x = (u % 1 + 1) % 1;
  for (const [a, b] of SKIP_U) {
    const aa = (a % 1 + 1) % 1, bb = (b % 1 + 1) % 1;
    if (aa < bb) {
      if (x >= aa && x <= bb) return true;
    } else {
      if (x >= aa || x <= bb) return true;
    }
  }
  return false;
};
function perimAt(s) {
  const hx = HALF_X + s, hz = HALF_Z + s, r = hx * CORNER_F;
  return 4 * (hx - r) + 4 * (hz - r) + 2 * Math.PI * r;
}
function zoneSeats(perimeter) {
  return Math.floor((perimeter / ZONES - AISLE_W) / SEAT_PITCH);
}
var ZONE_NAMES = [
  "北 1",
  "北 2",
  "北 3",
  "北 4",
  "东北 1",
  "东北 2",
  "东 1",
  "东 2",
  "东 3",
  "东 4",
  "东南 1",
  "东南 2",
  "南 1",
  "南 2",
  "南 3",
  "南 4",
  "西南 1",
  "西南 2",
  "西 1",
  "西 2",
  "西 3",
  "西 4"
];
function* iterSeats(tiers, stride = 1) {
  const step2 = Math.max(1, stride | 0);
  for (let ti = 0; ti < tiers.length; ti++) {
    const t = tiers[ti];
    for (const row of t.rows) {
      const per = perimAt(row.sFront + 0.42);
      const perZone = zoneSeats(per);
      const zoneLen = per / ZONES;
      for (let z = 0; z < ZONES; z++) {
        const u0 = (z * zoneLen + AISLE_W * 0.5) / per;
        const du2 = perZone * SEAT_PITCH / per;
        for (let i = 0; i < perZone; i += step2) {
          const u = u0 + du2 * ((i + 0.5) / perZone);
          if (inSkip(u)) continue;
          yield { tier: t.id, tierIdx: ti, zone: z, row: row.k, u, s: row.sFront + 0.42, y: row.y, idx: i, perZone };
        }
      }
    }
  }
}
function seatModel() {
  const tiers = TIERS.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    s0: t.s0,
    endS: t.endS,
    y0: t.y0,
    endY: t.endY,
    cY: t.cY,
    cS0: t.cS0,
    cS1: t.cS1,
    rows: t.rows.map((r) => {
      const per = perimAt(r.sFront + 0.42);
      return { tier: t.id, k: r.k, sFront: r.sFront, y: r.y, perimeter: per, perZone: zoneSeats(per), n: 0, aisle: r.aisle };
    }),
    zones: [],
    total: 0
  }));
  for (const s of iterSeats(tiers)) {
    const t = tiers[s.tierIdx];
    t.rows[s.row].n++;
    t.total++;
  }
  for (const t of tiers) {
    const perZoneTotal = t.rows.map((r) => ({ k: r.k, n: r.n }));
    for (let z = 0; z < ZONES; z++) {
      let seats = 0;
      for (const r of t.rows) seats += Math.round(r.n / ZONES);
      t.zones.push({
        id: t.id + "-" + String(z + 1).padStart(2, "0"),
        tier: t.id,
        tierName: t.name,
        z,
        name: t.name + " · " + ZONE_NAMES[z],
        seats: Math.round(seats),
        u0: z / ZONES,
        u1: (z + 1) / ZONES
      });
    }
    const zsum = t.zones.reduce((a, x) => a + x.seats, 0);
    t.zones[0].seats += t.total - zsum;
  }
  const total = tiers.reduce((a, t) => a + t.total, 0);
  return {
    tiers,
    zones: tiers.flatMap((t) => t.zones),
    total,
    rows: tiers.reduce((a, t) => a + t.rows.length, 0),
    zonesPerTier: ZONES,
    seatPitch: SEAT_PITCH,
    aisleW: AISLE_W
  };
}
var MODEL = seatModel();
var WHEELCHAIR = ZONES * TIERS.length * 2;
function* seatInstances(model = MODEL, stride = 1) {
  yield* iterSeats(model.tiers, stride);
}
var PALETTE = [
  ["#1d4b57", "#215262", "#25596b", "#2a6174", "#2f6a7d"],
  // L1 深青
  ["#e7e3d8", "#ded9cc", "#d5cfc0", "#ccc6b6", "#c3bdac"],
  // L2 象牙
  ["#8f6a4d", "#977154", "#9f785b", "#a77f62", "#af8769"]
  // L3 赤陶
];
var ACCENT = ["#e8c07a", "#6fd3e0", "#f2e2b8"];
function seatColor(tierIdx, row, zone, i, perZone) {
  const pal = PALETTE[tierIdx] || PALETTE[0];
  if (row % 9 === 8 && (zone + tierIdx) % 3 !== 0) return ACCENT[(zone + tierIdx) % ACCENT.length];
  if (i === 0) return ACCENT[(zone + 1) % ACCENT.length];
  return pal[(zone + row) % pal.length];
}

// src/scenes/arena.js
init_core();

// src/lib/materials.js
init_core();
import * as THREE4 from "three";
function concreteMaps() {
  const bc = (ctx, w, h) => {
    ctx.fillStyle = "#cfc9bd";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26e3; i++) {
      const g = 190 + Math.random() * 50 | 0;
      ctx.fillStyle = `rgba(${g},${g - 4},${g - 10},${0.05 + Math.random() * 0.16})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
    }
    for (let k = 0; k <= 4; k++) {
      const y = k / 4 * h;
      ctx.fillStyle = "rgba(90,86,78,.30)";
      ctx.fillRect(0, y, w, 1.6);
      ctx.fillStyle = "rgba(255,255,255,.18)";
      ctx.fillRect(0, y + 1.6, w, 1);
    }
    for (let k = 0; k < 8; k++) for (let j = 0; j < 2; j++) {
      const x = (k + 0.5) / 8 * w, y = (j + 0.5) / 2 * h;
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(120,114,104,.55)";
      ctx.fill();
    }
  };
  const map = canvasTex(512, 512, bc, { repeat: [8, 8], aniso: 8 });
  const rough = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#b8b8b8";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4e3; i++) {
      const g = 150 + Math.random() * 90 | 0;
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
  }, { srgb: false, repeat: [8, 8] });
  return { map, rough };
}
function stoneMaps() {
  const map = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#e6dfd0";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.strokeStyle = `rgba(${170 + Math.random() * 60 | 0},${160 + Math.random() * 50 | 0},${140 + Math.random() * 40 | 0},.22)`;
      ctx.lineWidth = 0.7 + Math.random() * 1.6;
      const x = Math.random() * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 3, h * 0.3, x - 3, h * 0.7, x + 1, h);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(120,112,96,.35)";
    ctx.lineWidth = 1.4;
    for (let k = 1; k < 2; k++) {
      ctx.beginPath();
      ctx.moveTo(k * w / 2, 0);
      ctx.lineTo(k * w / 2, h);
      ctx.stroke();
    }
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(0, k * h / 4);
      ctx.lineTo(w, k * h / 4);
      ctx.stroke();
    }
  }, { repeat: [10, 6], aniso: 8 });
  return { map };
}
function aluMaps() {
  const map = canvasTex(512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#d6dae0");
    g.addColorStop(0.45, "#c3c9d1");
    g.addColorStop(0.5, "#b3bac3");
    g.addColorStop(0.55, "#c9cfd7");
    g.addColorStop(1, "#aeb6c0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.07})`;
      ctx.lineWidth = 0.6;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (Math.random() - 0.5) * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(70,76,84,.5)";
    for (let k = 0; k < 4; k++) ctx.fillRect(k * w / 4, 0, 1.6, h);
    ctx.fillRect(0, h / 2, w, 1.4);
  }, { repeat: [14, 3], aniso: 8 });
  return { map };
}
function bronzeMeshMaps() {
  const W = 256;
  const map = canvasTex(W, W, (ctx, w, h) => {
    ctx.fillStyle = "#8a7550";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#b99b6a";
    ctx.lineWidth = 2;
    for (let i = -w; i < w * 2; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i, h);
      ctx.lineTo(i + h, 0);
      ctx.stroke();
    }
  }, { repeat: [26, 8], aniso: 4 });
  const alphaMap = canvasTex(W, W, (ctx, w, h) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    for (let i = -w; i < w * 2; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i, h);
      ctx.lineTo(i + h, 0);
      ctx.stroke();
    }
  }, { srgb: false, repeat: [26, 8] });
  return { map, alphaMap };
}
function roofMaps() {
  const map = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#9aa2ab";
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) {
      const x0 = k * w / 4;
      const v = 148 + k * 37 % 26 - 13;
      ctx.fillStyle = `rgb(${v},${v + 6},${v + 14})`;
      ctx.fillRect(x0, 0, w / 4 - 2, h);
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.fillRect(x0, 0, 2, h);
      ctx.fillStyle = "rgba(30,36,44,.55)";
      ctx.fillRect(x0 + 2, 0, 2, h);
      ctx.fillStyle = "rgba(0,0,0,.18)";
      ctx.fillRect(x0 + w / 4 - 3, 0, 3, h);
    }
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(${90 + Math.random() * 60 | 0},${95 + Math.random() * 60 | 0},${100 + Math.random() * 60 | 0},.05)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 8, Math.random() * 2);
    }
  }, { repeat: [1, 1], wrap: THREE4.RepeatWrapping, aniso: 8 });
  return { map };
}
function tierMaps() {
  const map = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#a9a49a";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 12e3; i++) {
      const g = 140 + Math.random() * 70 | 0;
      ctx.fillStyle = `rgba(${g},${g},${g - 6},.10)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.fillStyle = "rgba(60,58,54,.22)";
    for (let k = 0; k < 4; k++) ctx.fillRect(0, k * h / 4, w, 2);
  }, { repeat: [18, 24], aniso: 8 });
  return { map };
}
function pitchMaps() {
  const W = 2048, H = 1330;
  const map = canvasTex(W, H, (ctx, w, h) => {
    const stripes = 22;
    for (let i = 0; i < stripes; i++) {
      const x0 = i / stripes * w;
      const light = i % 2 === 0;
      const g = ctx.createLinearGradient(x0, 0, x0 + w / stripes, 0);
      g.addColorStop(0, light ? "#3f7a3c" : "#356b34");
      g.addColorStop(1, light ? "#43804133" : "#326832");
      ctx.fillStyle = light ? "#3e783b" : "#356a34";
      ctx.fillRect(x0, 0, w / stripes + 1, h);
    }
    for (let i = 0; i < 9e4; i++) {
      const g = 40 + Math.random() * 70 | 0;
      ctx.fillStyle = `rgba(${g * 0.65 | 0},${g + 45},${g * 0.55 | 0},${0.05 + Math.random() * 0.13})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 3.5);
    }
    const cx = w / 2, cy = h / 2;
    const PXM = w / 111;
    const L = 105 * PXM, Wd = 68 * PXM;
    ctx.strokeStyle = "rgba(238,244,238,.92)";
    ctx.lineWidth = Math.max(2.5, PXM * 0.12);
    ctx.strokeRect(cx - Wd / 2, cy - L / 2, Wd, L);
    ctx.beginPath();
    ctx.moveTo(cx - Wd / 2, cy);
    ctx.lineTo(cx + Wd / 2, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 9.15 * PXM, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 0.35 * PXM, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(238,244,238,.92)";
    ctx.fill();
    for (const s of [-1, 1]) {
      const gy = cy + s * L / 2;
      const boxW = 40.32 * PXM, boxD = 16.5 * PXM;
      ctx.strokeRect(cx - boxW / 2, s > 0 ? gy - boxD : gy, boxW, boxD);
      const goalW = 18.32 * PXM, goalD = 5.5 * PXM;
      ctx.strokeRect(cx - goalW / 2, s > 0 ? gy - goalD : gy, goalW, goalD);
      const px = cx, py = gy - s * 11 * PXM;
      ctx.beginPath();
      ctx.arc(px, py, 0.3 * PXM, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, 9.15 * PXM, s > 0 ? Math.PI * 0.72 : Math.PI * 1.72, s > 0 ? Math.PI * 0.28 : Math.PI * 1.28);
      ctx.stroke();
    }
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + sx * Wd / 2, cy + sy * L / 2, 1 * PXM, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, { aniso: 16 });
  map.wrapS = map.wrapT = THREE4.ClampToEdgeWrapping;
  return { map };
}
function adBoardMaps() {
  const map = canvasTex(1024, 128, (ctx, w, h) => {
    const cols = ["#0a1a2a", "#0d2030", "#08161f", "#0b1c28"];
    ctx.fillStyle = cols[0];
    ctx.fillRect(0, 0, w, h);
    const words = ["TIDAL ARENA", "潮汐场 · 2026", "WORLD CUP", "MATCH DAY"];
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 4; i++) {
      const x = (i + 0.5) * w / 4;
      ctx.fillStyle = cols[i % cols.length];
      ctx.fillRect(i * w / 4, 0, w / 4, h);
      ctx.fillStyle = i % 2 ? "#6fd3e0" : "#f0cf8a";
      ctx.font = '600 34px Oswald, "Arial Narrow", sans-serif';
      ctx.fillText(words[i], x, h * 0.5);
      ctx.strokeStyle = "rgba(255,255,255,.18)";
      ctx.lineWidth = 2;
      ctx.strokeRect(i * w / 4 + 2, 2, w / 4 - 4, h - 4);
    }
  }, { wrap: THREE4.RepeatWrapping, aniso: 8 });
  return { map };
}
function scoreboardMap() {
  return canvasTex(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = "#05090d";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#0d3a44";
    ctx.fillRect(0, 0, w, h * 0.22);
    ctx.fillStyle = "#6fd3e0";
    ctx.font = "600 46px Oswald, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TIDAL ARENA · WORLD CUP 2026", w / 2, h * 0.15);
    ctx.fillStyle = "#e8c07a";
    ctx.font = "300 150px Oswald, sans-serif";
    ctx.fillText("2  :  1", w / 2, h * 0.55);
    ctx.fillStyle = "#cfe6ee";
    ctx.font = "300 40px Oswald, sans-serif";
    ctx.fillText("78:24", w / 2, h * 0.72);
    ctx.fillStyle = "#7e99a5";
    ctx.font = '300 28px "JetBrains Mono", monospace';
    ctx.fillText("ATT " + MODEL.total.toLocaleString("en-US"), w / 2, h * 0.88);
  }, { aniso: 8 });
}
function makeMaterials(renderer) {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const std = (o) => new THREE4.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.85 }, o));
  const CM = concreteMaps();
  CM.map.anisotropy = aniso;
  const SM = stoneMaps();
  SM.map.anisotropy = aniso;
  const AM = aluMaps();
  AM.map.anisotropy = aniso;
  const BM = bronzeMeshMaps();
  const RM2 = roofMaps();
  RM2.map.anisotropy = aniso;
  const TM = tierMaps();
  TM.map.anisotropy = aniso;
  const PM = pitchMaps();
  PM.map.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const AD = adBoardMaps();
  return {
    /* 清水混凝土 */
    concrete: std({ color: 14209734, map: CM.map, roughnessMap: CM.rough, roughness: 0.92, metalness: 0.02, envMapIntensity: 0.55 }),
    concreteDark: std({ color: 7236195, roughness: 0.94, metalness: 0.02 }),
    concreteLight: std({ color: 14999507, roughness: 0.9, metalness: 0.02 }),
    /* 石材 / 洞石 */
    stone: std({ color: 15261903, map: SM.map, roughness: 0.74, metalness: 0.02, envMapIntensity: 0.7 }),
    /* 铝板 */
    alu: std({ color: 13818079, map: AM.map, roughness: 0.38, metalness: 0.62, envMapIntensity: 1.15 }),
    aluDark: std({ color: 9147550, roughness: 0.46, metalness: 0.6, envMapIntensity: 1 }),
    aluLight: std({ color: 15133680, roughness: 0.3, metalness: 0.55, envMapIntensity: 1.3 }),
    /* 青铜网幕 */
    bronze: std({ color: 11570264, roughness: 0.42, metalness: 0.78, envMapIntensity: 1.15 }),
    bronzeMesh: std({
      color: 12622691,
      map: BM.map,
      alphaMap: BM.alphaMap,
      transparent: true,
      alphaTest: 0.42,
      side: THREE4.DoubleSide,
      roughness: 0.42,
      metalness: 0.72,
      envMapIntensity: 1.1
    }),
    /* 屋盖 */
    roofMetal: std({ color: 13028564, map: RM2.map, roughness: 0.52, metalness: 0.22, envMapIntensity: 0.75 }),
    roofSoffit: std({ color: 11121081, roughness: 0.64, metalness: 0.2, envMapIntensity: 0.6, side: THREE4.DoubleSide }),
    /* 钢构 */
    steel: std({ color: 11844804, roughness: 0.35, metalness: 0.88, envMapIntensity: 1.25 }),
    steelDark: std({ color: 5133660, roughness: 0.48, metalness: 0.8 }),
    /* 玻璃 */
    glass: new THREE4.MeshPhysicalMaterial({
      color: 10466500,
      roughness: 0.06,
      metalness: 0,
      transparent: true,
      opacity: 0.26,
      envMapIntensity: 1.9,
      side: THREE4.DoubleSide,
      depthWrite: false
    }),
    glassDark: new THREE4.MeshPhysicalMaterial({
      color: 2832710,
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.6,
      envMapIntensity: 1.3,
      side: THREE4.DoubleSide
    }),
    glassLite: new THREE4.MeshPhysicalMaterial({
      color: 13624042,
      roughness: 0.05,
      metalness: 0,
      transparent: true,
      opacity: 0.16,
      envMapIntensity: 2,
      side: THREE4.DoubleSide,
      depthWrite: false
    }),
    /* 看台踏板 */
    tier: std({ color: 11578016, map: TM.map, roughness: 0.88, metalness: 0.03, envMapIntensity: 0.5 }),
    /* 座椅（顶点色由实例材质控制） */
    seat: std({ color: 16777215, roughness: 0.58, metalness: 0.04, vertexColors: false, envMapIntensity: 0.55, side: THREE4.DoubleSide }),
    /* 场地 */
    pitch: std({ color: 16777215, map: PM.map, roughness: 0.96, metalness: 0, envMapIntensity: 0.22 }),
    line: new THREE4.MeshBasicMaterial({ color: 15922670, transparent: true, opacity: 0.92 }),
    /* 发光 */
    led: new THREE4.MeshBasicMaterial({ color: 16777215, toneMapped: false }),
    adBoard: new THREE4.MeshBasicMaterial({ map: AD.map, toneMapped: false }),
    scoreboard: new THREE4.MeshBasicMaterial({ map: null, toneMapped: false }),
    glow: new THREE4.MeshBasicMaterial({ color: 16773852, toneMapped: false }),
    glowCool: new THREE4.MeshBasicMaterial({ color: 14676991, toneMapped: false }),
    glowWarm: new THREE4.MeshBasicMaterial({ color: 16767400, toneMapped: false }),
    glowCyan: new THREE4.MeshBasicMaterial({ color: 7328736, toneMapped: false }),
    /* 金属栏杆 */
    rail: std({ color: 10134444, roughness: 0.28, metalness: 0.92, envMapIntensity: 1.35 }),
    /* 室内 */
    interior: std({ color: 14472390, roughness: 0.74, metalness: 0.04 }),
    interiorDark: std({ color: 3949128, roughness: 0.82 }),
    carpet: std({ color: 1784647, roughness: 0.95 }),
    wood: std({ color: 10121296, roughness: 0.66 }),
    grass: std({ color: 4160058, roughness: 0.95 }),
    /* 水体（广场） */
    water: new THREE4.MeshStandardMaterial({ color: 1325130, roughness: 0.06, metalness: 0.6, envMapIntensity: 1.6 })
  };
}

// src/scenes/arena.js
var Mesher = class {
  constructor(mats) {
    this.mats = mats;
    this.buckets = /* @__PURE__ */ new Map();
  }
  batch(k) {
    if (!this.buckets.has(k)) this.buckets.set(k, new GeomBatch());
    return this.buckets.get(k);
  }
  geo(k, g) {
    this.batch(k).add(g);
    return this;
  }
  box(k, p0, p1, w, h, up) {
    this.batch(k).box(p0, p1, w, h, up);
    return this;
  }
  quad(k, a, b, c, d, uvs) {
    this.batch(k).quad(a, b, c, d, uvs);
    return this;
  }
  flush(parent, prefix = "") {
    const out = [];
    for (const [k, b] of this.buckets) {
      const g = b.build();
      if (!g) continue;
      const m = new THREE5.Mesh(g, this.mats[k]);
      m.name = prefix + k;
      m.userData.matKey = k;
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      out.push(m);
    }
    this.buckets.clear();
    return out;
  }
};
var V = (x, y, z) => new THREE5.Vector3(x, y, z);
var RM = roofMod();
function tapered(batch, p0, p1, w0, w1, d0, d1, up) {
  const dir = p1.clone().sub(p0);
  const len = dir.length();
  if (len < 1e-4) return;
  dir.normalize();
  const u = (up || V(0, 1, 0)).clone();
  if (Math.abs(u.dot(dir)) > 0.97) u.set(1, 0, 0);
  const side = new THREE5.Vector3().crossVectors(dir, u).normalize();
  const upv = new THREE5.Vector3().crossVectors(side, dir).normalize();
  const corner = (p, w, d, sx, sy) => p.clone().addScaledVector(side, sx * w / 2).addScaledVector(upv, sy * d / 2);
  const A0 = corner(p0, w0, d0, -1, 1), B0 = corner(p0, w0, d0, 1, 1), C0 = corner(p0, w0, d0, 1, -1), D0 = corner(p0, w0, d0, -1, -1);
  const A1 = corner(p1, w1, d1, -1, 1), B1 = corner(p1, w1, d1, 1, 1), C1 = corner(p1, w1, d1, 1, -1), D1 = corner(p1, w1, d1, -1, -1);
  batch.quad(A0, B0, B1, A1);
  batch.quad(B0, C0, C1, B1);
  batch.quad(C0, D0, D1, C1);
  batch.quad(D0, A0, A1, D1);
  batch.quad(A1, B1, C1, D1);
  batch.quad(D0, C0, B0, A0);
}
function tierProfile(tier, bottomY) {
  const top = [{ s: tier.s0, y: tier.y0 }];
  for (const r of tier.rows) {
    top.push({ s: r.sFront, y: r.y }, { s: r.sBack, y: r.y }, { s: r.sBack, y: r.yBack });
  }
  const last = top[top.length - 1];
  const back = [
    { s: last.s, y: last.y },
    { s: last.s + 0.75, y: last.y },
    // 末排后平台
    { s: last.s + 0.75, y: bottomY },
    // 后端竖直落到底
    { s: tier.s0, y: bottomY },
    // 底面向内
    { s: tier.s0, y: tier.y0 }
  ];
  return dedupe(top.concat(back.slice(1)));
}
function dedupe(list) {
  const out = [];
  for (const p of list) {
    const l = out[out.length - 1];
    if (l && Math.abs(l.s - p.s) < 1e-5 && Math.abs(l.y - p.y) < 1e-5) continue;
    out.push(p);
  }
  return out;
}
function buildArena(scene, stage2) {
  const M = makeMaterials(stage2.renderer);
  const root = new THREE5.Group();
  root.name = "ARENA";
  scene.add(root);
  const groups = {};
  const G = (name) => {
    const g = new THREE5.Group();
    g.name = name;
    root.add(g);
    groups[name] = g;
    return g;
  };
  const gPitch = G("pitch"), gBowl = G("bowl"), gConc = G("concourse"), gSuite = G("suites"), gFacade = G("facade"), gStruct = G("structure"), gRoof = G("roof"), gInterior = G("interior"), gSeats = G("seats"), gGlow = G("glow");
  const ents = {};
  const ent = (name, obj, label, spec) => {
    ents[name] = { id: name, mesh: obj, parent: obj, label, spec };
    return obj;
  };
  const msP = new Mesher(M), msB = new Mesher(M), msC = new Mesher(M), msS = new Mesher(M), msF = new Mesher(M), msT = new Mesher(M), msR = new Mesher(M), msI = new Mesher(M), msG = new Mesher(M);
  buildPitch(gPitch, gGlow, msP, msG, M, stage2);
  msP.flush(gPitch, "pitch-");
  msG.flush(gGlow, "glow-");
  ent("pitch", gPitch, "比赛场地", "105 × 68 m · 天然草皮 · 无跑道");
  buildBowl(gBowl, msB, M);
  msB.flush(gBowl, "bowl-");
  ent("bowl", gBowl, "看台核心体", `3 层 ${MODEL.rows} 排 · 预制混凝土阶梯 · 视线 C 值 ≥ 60mm`);
  buildConcourse(gConc, msC, M);
  msC.flush(gConc, "conc-");
  ent("concourse", gConc, "看台环廊", "3 层连续环廊 · 净宽 8–13 m · 每 12 m 一柱");
  buildSuites(gSuite, msI, msG, M);
  msI.flush(gSuite, "suite-");
  msG.flush(gGlow, "glowB-");
  ent("suites", gSuite, "贵宾包厢层", "2 层包厢 · 面向场地 · 独立后走道");
  buildFacade(gFacade, msF, M);
  msF.flush(gFacade, "facade-");
  ent("facade", gFacade, "外立面", "石材基座 + 青铜网幕 + 铝质潮冠 · 4 主券洞 / 8 次门");
  buildStructure(gStruct, msT, M);
  msT.flush(gStruct, "struct-");
  ent("structure", gStruct, "结构系统", "8 潮柱 + 24 榀径向桁架 + 2 道环梁 + 檩条");
  const lamps = buildRoof(gRoof, msR, msG, M);
  msR.flush(gRoof, "roof-");
  msG.flush(gGlow, "glowR-");
  ent("roof", gRoof, "鞍面屋盖", `四边高四角低 · 悬挑 ${Math.round(GEO.roofRidgeS - GEO.roofInnerS)}m · 场地全开敞`);
  const seatRes = buildSeats(gSeats, M, stage2);
  ent("seats", gSeats, "座椅阵列", `${MODEL.total.toLocaleString()} 座 · 逐排逐区 · 20 区 / 层`);
  buildInterior(gInterior, msI, msG, M);
  msI.flush(gInterior, "int-");
  msG.flush(gGlow, "glowI-");
  ent("interior", gInterior, "室内空间", "入口大厅 / 环廊 / 包厢 / 更衣室 / 媒体中心");
  const lampLights = [];
  {
    for (let k = 0; k < 4; k++) {
      const i = Math.round(k * SEGS / 4);
      const p = pt(i, GEO.roofInnerS + 9, roofY(GEO.roofInnerS + 9, i) - 4.2);
      const sp = new THREE5.SpotLight(16774372, 0, 360, 0.92, 0.62, 1.2);
      sp.position.copy(p);
      sp.target.position.set(0, 0, 0);
      root.add(sp, sp.target);
      lampLights.push(sp);
    }
  }
  const api2 = {
    root,
    groups,
    ents,
    M,
    model: MODEL,
    lamps: lampLights,
    seatInst: seatRes,
    seatTotal: MODEL.total,
    ring: refRing(SEGS),
    TIERS,
    L1,
    L2,
    L3,
    GEO,
    BACK_S,
    BACK_Y,
    /* —— 供 UI / 游戏层调用的统一入口 —— */
    setVisible(id, v) {
      const e = ents[id];
      if (e) e.mesh.visible = !!v;
    },
    setSolo(id) {
      for (const k in ents) ents[k].mesh.visible = id === null || k === id;
    },
    focusOn(id) {
      const e = ents[id];
      if (!e) return null;
      const box = new THREE5.Box3().setFromObject(e.mesh);
      const c = box.getCenter(new THREE5.Vector3());
      const size = box.getSize(new THREE5.Vector3()).length();
      return { target: c, dist: Math.max(70, size * 1.1) };
    }
  };
  return api2;
}
function buildPitch(gPitch, gGlow, ms, msG, M, stage2) {
  const g = new THREE5.PlaneGeometry(111, 74, 1, 1);
  g.rotateX(-Math.PI / 2);
  const m = new THREE5.Mesh(g, M.pitch);
  m.name = "pitchSurface";
  m.receiveShadow = true;
  gPitch.add(m);
  ms.geo("concreteDark", sweepRing([
    { s: 0, y: -0.04 },
    { s: GEO.barrierS + 0.6, y: -0.04 },
    { s: GEO.barrierS + 0.6, y: -0.55 },
    { s: 0, y: -0.55 }
  ], { uScale: 0.03, vScale: 0.03 }));
  ms.geo("concreteLight", sweepRing([
    { s: GEO.barrierS, y: -0.1 },
    { s: GEO.barrierS, y: GEO.barrierH },
    { s: GEO.barrierS + 0.28, y: GEO.barrierH },
    { s: GEO.barrierS + 0.28, y: -0.1 }
  ], { uScale: 0.12, vScale: 0.12 }));
  ms.geo("rail", sweepRing([
    { s: GEO.barrierS - 0.1, y: GEO.barrierH + 0.02 },
    { s: GEO.barrierS + 0.38, y: GEO.barrierH + 0.02 },
    { s: GEO.barrierS + 0.38, y: GEO.barrierH + 0.1 },
    { s: GEO.barrierS - 0.1, y: GEO.barrierH + 0.1 }
  ], { uScale: 0.3, vScale: 0.3 }));
  const gaps = [[-0.012, 0.012], [0.238, 0.262], [0.488, 0.512], [0.738, 0.762]];
  for (const [a, b] of subtractWindows(1, gaps.map(([u0, u1]) => ({ u0, u1 })))) {
    const seg = Math.max(2, Math.round((b - a) * SEGS));
    const board = new THREE5.PlaneGeometry(1, 1);
    const inst = new THREE5.InstancedMesh(board, M.adBoard, seg);
    const d = new THREE5.Object3D();
    for (let k = 0; k < seg; k++) {
      const u = a + (b - a) * (k + 0.5) / seg;
      const i = Math.round(u * SEGS);
      const p = pt(i, GEO.boardS, 0.02);
      const q = pt(i + 1, GEO.boardS, 0.02);
      d.position.copy(p).setY(GEO.boardH / 2 + 0.02);
      d.lookAt(0, d.position.y, 0);
      d.scale.set(p.distanceTo(q) * 1.06, GEO.boardH, 1);
      d.updateMatrix();
      inst.setMatrixAt(k, d.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.frustumCulled = false;
    gPitch.add(inst);
  }
  for (const sz of [-1, 1]) {
    const gz = sz * (HALF_Z - 0.6);
    const post = (x) => {
      ms.box("aluLight", V(x, 0, gz), V(x, 2.44, gz), 0.12, 0.12);
    };
    post(-3.66);
    post(3.66);
    ms.box("aluLight", V(-3.72, 2.44, gz), V(3.72, 2.44, gz), 0.12, 0.12);
    const netMat = new THREE5.MeshBasicMaterial({ color: 14674158, transparent: true, opacity: 0.16, side: THREE5.DoubleSide, depthWrite: false });
    const back = new THREE5.Mesh(new THREE5.PlaneGeometry(7.32, 2.2), netMat);
    back.position.set(0, 1, gz + sz * 1.8);
    back.rotation.y = 0;
    gPitch.add(back);
    ms.box("aluLight", V(-3.66, 2.44, gz), V(-3.66, 1.2, gz + sz * 1.8), 0.1, 0.1);
    ms.box("aluLight", V(3.66, 2.44, gz), V(3.66, 1.2, gz + sz * 1.8), 0.1, 0.1);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    ms.box("aluLight", V(sx * HALF_X, 0, sz * HALF_Z), V(sx * HALF_X, 1.8, sz * HALF_Z), 0.07, 0.07);
  }
  for (let k = -1; k <= 1; k += 2) {
    const z0 = k * 8;
    ms.box("interiorDark", V(-HALF_X - 2.2, 0, z0 - 6), V(-HALF_X - 2.2, 0.45, z0 + 6), 3.6, 0.45);
    ms.box("glassLite", V(-HALF_X - 4, 2.2, z0 - 6), V(-HALF_X - 4, 2.2, z0 + 6), 0.16, 0.16);
    for (let b = -2; b <= 2; b++) {
      ms.box("aluDark", V(-HALF_X - 2.2, 0.45, z0 + b * 1.6), V(-HALF_X - 2.2, 1.1, z0 + b * 1.6), 1.1, 0.5);
    }
  }
  const sb = scoreboardMap();
  M.scoreboard.map = sb;
  M.scoreboard.needsUpdate = true;
  for (const sz of [-1, 1]) {
    const s = GEO.screenS;
    const seg = 2;
    for (let i = 0; i < seg; i++) {
      const u = sz > 0 ? 0.5 : 0;
      const p2 = pt(Math.round(u * SEGS) + (i - 0.5) * 3, s, GEO.screenY);
      const scr = new THREE5.Mesh(new THREE5.PlaneGeometry(GEO.screenW, GEO.screenH), M.scoreboard);
      scr.position.copy(p2);
      scr.lookAt(V(0, GEO.screenY, 0));
      scr.rotateY(Math.PI);
      gPitch.add(scr);
    }
    const p = pt(Math.round((sz > 0 ? 0.5 : 0) * SEGS), s, GEO.screenY);
    const frame = new THREE5.Mesh(new THREE5.BoxGeometry(GEO.screenW + 1.6, GEO.screenH + 1.6, 1), M.steelDark);
    frame.position.copy(p).setY(GEO.screenY);
    frame.lookAt(V(0, GEO.screenY, 0));
    gPitch.add(frame);
    for (const dx of [-1, 1]) {
      ms.box(
        "steelDark",
        V(p.x + dx * 6, GEO.screenY + GEO.screenH / 2, p.z),
        V(p.x + dx * 6, roofY(s, 0) - 1.4, p.z),
        0.35,
        0.35
      );
    }
  }
}
function buildBowl(gBowl, ms, M) {
  const bottoms = [GEO.groundY, L1.cY - 0.55, L2.cY - 0.55];
  const mouths = [
    { u0: -0.0105, u1: 0.0105 },
    { u0: 0.4895, u1: 0.5105 }
  ];
  TIERS.forEach((t, ti) => {
    const prof = tierProfile(t, bottoms[ti]);
    const opts = { uScale: 0.055, vScale: 0.055 };
    if (ti === 0) {
      const spans = subtractWindows(1, mouths);
      for (const [a, b] of spans) {
        ms.geo("tier", sweepRing(prof, { ...opts, uRange: [a, b], capEnds: true }));
      }
    } else {
      ms.geo("tier", sweepRing(prof, opts));
    }
    ms.geo("concrete", sweepRing([
      { s: t.endS + 0.7, y: t.endY - 0.2 },
      { s: t.endS + 0.7, y: t.endY + 1.05 },
      { s: t.endS + 1.15, y: t.endY + 1.05 },
      { s: t.endS + 1.15, y: t.endY - 0.2 }
    ], { uScale: 0.12, vScale: 0.12 }));
    const railH = 0.92;
    for (let z = 0; z < ZONES; z++) {
      const i = Math.round(z / ZONES * SEGS) % SEGS;
      for (const r of t.rows) {
        const y = r.y + railH;
        const p0 = pt(i, r.sFront + 0.05, y), p1 = pt(i, r.sBack + 0.05, y + 0);
        ms.box("rail", p0, p1, 0.055, 0.055);
      }
      for (let k = 0; k < t.rows.length; k += 4) {
        const r = t.rows[k];
        const p0 = pt(i, r.sFront + 0.1, r.y), p1 = pt(i, r.sFront + 0.1, r.y + railH);
        ms.box("rail", p0, p1, 0.06, 0.06);
      }
    }
    ms.geo("glass", sweepRing([
      { s: t.s0 - 0.02, y: t.y0 + 0.02 },
      { s: t.s0 - 0.02, y: t.y0 + 1.02 },
      { s: t.s0 + 0.02, y: t.y0 + 1.02 },
      { s: t.s0 + 0.02, y: t.y0 + 0.02 }
    ], { uScale: 0.3, vScale: 0.3 }));
    ms.geo("rail", sweepRing([
      { s: t.s0 - 0.06, y: t.y0 + 1.02 },
      { s: t.s0 + 0.06, y: t.y0 + 1.02 },
      { s: t.s0 + 0.06, y: t.y0 + 1.09 },
      { s: t.s0 - 0.06, y: t.y0 + 1.09 }
    ], { uScale: 0.3, vScale: 0.3 }));
    for (let z = 0; z < ZONES; z++) {
      const u = (z + 0.5) / ZONES;
      const w = segWindow(u, 62e-4);
      ms.geo("interiorDark", sweepRing([
        { s: t.endS + 0.68, y: t.endY - 1.1 },
        { s: t.endS + 0.68, y: t.endY + 0.95 },
        { s: t.endS + 0.76, y: t.endY + 0.95 },
        { s: t.endS + 0.76, y: t.endY - 1.1 }
      ], { uRange: [w.u0, w.u1], capEnds: true }));
      ms.geo("glowWarm", sweepRing([
        { s: t.endS + 0.7, y: t.endY + 0.9 },
        { s: t.endS + 0.7, y: t.endY + 0.98 },
        { s: t.endS + 0.75, y: t.endY + 0.98 },
        { s: t.endS + 0.75, y: t.endY + 0.9 }
      ], { uRange: [w.u0, w.u1] }));
    }
  });
  ms.geo("concreteDark", sweepRing([
    { s: L1.s0, y: GEO.groundY },
    { s: L1.endS + 0.7, y: GEO.groundY },
    { s: L1.endS + 0.7, y: GEO.groundY + 0.2 },
    { s: L1.s0, y: GEO.groundY + 0.2 }
  ], { uScale: 0.05, vScale: 0.05 }));
}
function buildConcourse(gConc, ms, M) {
  const floors = [
    { tier: L1, y: L1.cY, ceil: L1.cY + 5.4 },
    { tier: L2, y: L2.cY, ceil: L2.cY + 5.2 },
    { tier: L3, y: L3.cY, ceil: GEO.crownY - 1.2 }
  ];
  for (const f of floors) {
    const t = f.tier;
    const s0 = t.cS0 + 0.1, s1 = t.cS1;
    ms.geo("concrete", sweepRing([
      { s: s0, y: f.y },
      { s: s1, y: f.y },
      { s: s1, y: f.y - 0.55 },
      { s: s0, y: f.y - 0.55 }
    ], { uScale: 0.07, vScale: 0.07 }));
    ms.geo("concreteDark", sweepRing([
      { s: s0, y: f.ceil },
      { s: s1, y: f.ceil },
      { s: s1, y: f.ceil - 0.32 },
      { s: s0, y: f.ceil - 0.32 }
    ], { uScale: 0.07, vScale: 0.07 }));
    ms.geo("glass", sweepRing([
      { s: s0 + 0.02, y: f.y + 0.02 },
      { s: s0 + 0.02, y: f.y + 1.08 },
      { s: s0 + 0.07, y: f.y + 1.08 },
      { s: s0 + 0.07, y: f.y + 0.02 }
    ], { uScale: 0.3, vScale: 0.3 }));
    ms.geo("rail", sweepRing([
      { s: s0 - 0.02, y: f.y + 1.08 },
      { s: s0 + 0.12, y: f.y + 1.08 },
      { s: s0 + 0.12, y: f.y + 1.15 },
      { s: s0 - 0.02, y: f.y + 1.15 }
    ], { uScale: 0.3, vScale: 0.3 }));
    for (const i of every(12)) {
      const p0 = pt(i, s1 - 1.4, f.y - 0.55);
      const p1 = pt(i, s1 - 1.4, f.ceil);
      ms.box("concrete", p0, p1, 1, 1, V(1, 0, 0));
    }
    for (const i of every(8)) {
      const a = pt(i, s0 + 1, f.ceil - 0.42), b = pt(i + 6, s0 + 1, f.ceil - 0.42);
      ms.box("glow", a, b, 0.22, 0.1, V(0, 1, 0));
    }
    for (let k = 0; k < SEGS / 12; k++) {
      const i = k * 12 + 6;
      const a = pt(i - 3.4, s1 - 0.25, f.y), b = pt(i + 3.4, s1 - 0.25, f.y);
      ms.box("interior", a, b, 2.2, 3, V(0, 0, 1));
      const g0 = pt(i - 2.6, s1 - 1.15, f.y + 3.35), g1 = pt(i + 2.6, s1 - 1.15, f.y + 3.35);
      ms.box(i % 24 === 6 ? "glowCyan" : "glowWarm", g0, g1, 0.16, 0.35, V(0, 0, 1));
    }
  }
  ms.geo("steelDark", sweepRing([
    { s: L3.cS0 + 1, y: GEO.crownY - 1.6 },
    { s: L3.cS1 - 1, y: GEO.crownY - 1.6 },
    { s: L3.cS1 - 1, y: GEO.crownY - 2.4 },
    { s: L3.cS0 + 1, y: GEO.crownY - 2.4 }
  ], { uScale: 0.1, vScale: 0.1 }));
}
function buildSuites(gSuite, ms, msG, M) {
  const sF = GEO.suiteS;
  const sB = sF - GEO.suiteDepth;
  const walkS = sB - GEO.suiteWalk;
  for (let L = 0; L < 2; L++) {
    const y = GEO.suiteLevels[L];
    const H = GEO.suiteH;
    ms.geo("concrete", sweepRing([
      { s: walkS, y },
      { s: sF, y },
      { s: sF, y: y - 0.4 },
      { s: walkS, y: y - 0.4 }
    ], { uScale: 0.08, vScale: 0.08 }));
    ms.geo("interior", sweepRing([
      { s: sB, y: y + 0.05 },
      { s: sB + 0.28, y: y + 0.05 },
      { s: sB + 0.28, y: y + H },
      { s: sB, y: y + H }
    ], { uScale: 0.18, vScale: 0.18 }));
    for (const i of every(4)) {
      ms.box("interior", pt(i, sB + 0.4, y + 0.1), pt(i, sF - 0.2, y + 0.1), 0.22, H - 0.1, V(0, 1, 0));
    }
    ms.geo("glassDark", sweepRing([
      { s: sF - 0.05, y: y + 0.12 },
      { s: sF - 0.05, y: y + H - 0.24 },
      { s: sF + 0.02, y: y + H - 0.24 },
      { s: sF + 0.02, y: y + 0.12 }
    ], { uScale: 0.3, vScale: 0.3 }));
    for (const i of every(4)) {
      ms.box("aluDark", pt(i, sF, y + 0.12), pt(i, sF, y + H - 0.24), 0.14, 0.2);
    }
    ms.geo("aluDark", sweepRing([
      { s: sF - 0.1, y: y + H - 0.32 },
      { s: sF + 0.05, y: y + H - 0.32 },
      { s: sF + 0.05, y: y + H },
      { s: sF - 0.1, y: y + H }
    ], { uScale: 0.2, vScale: 0.2 }));
    ms.geo("concreteDark", sweepRing([
      { s: walkS, y: y + H },
      { s: sF, y: y + H },
      { s: sF, y: y + H - 0.3 },
      { s: walkS, y: y + H - 0.3 }
    ], { uScale: 0.08, vScale: 0.08 }));
    msG.geo("glowWarm", sweepRing([
      { s: sF - 0.55, y: y + H - 0.34 },
      { s: sF - 0.55, y: y + H - 0.42 },
      { s: sF - 0.75, y: y + H - 0.42 },
      { s: sF - 0.75, y: y + H - 0.34 }
    ], { uScale: 0.2, vScale: 0.2 }));
    ms.geo("rail", sweepRing([
      { s: walkS + 0.1, y: y + 0.9 },
      { s: walkS + 0.1, y: y + 0.98 },
      { s: walkS + 0.16, y: y + 0.98 },
      { s: walkS + 0.16, y: y + 0.9 }
    ], { uScale: 0.3, vScale: 0.3 }));
    msG.geo("glow", sweepRing([
      { s: walkS + 0.6, y: y + H - 0.36 },
      { s: walkS + 0.6, y: y + H - 0.44 },
      { s: walkS + 0.9, y: y + H - 0.44 },
      { s: walkS + 0.9, y: y + H - 0.36 }
    ], { uScale: 0.2, vScale: 0.2 }));
  }
}
function buildFacade(gFacade, ms, M) {
  const S2 = GEO.outerS, gY = GEO.groundY;
  const baseTop = GEO.outerBaseY, midTop = GEO.outerMidY, topY = GEO.outerTopY, crownY = GEO.crownY;
  const baseProf = [
    { s: S2 - 1.5, y: gY },
    { s: S2, y: gY },
    { s: S2, y: baseTop },
    { s: S2 - 1.5, y: baseTop }
  ];
  const openings = [
    ...PORTALS.map((u) => ({ u0: u - GEO.portalHalfU, u1: u + GEO.portalHalfU, h: GEO.portalH, main: true })),
    ...SUB_DOORS.map((u) => ({ u0: u - GEO.subHalfU, u1: u + GEO.subHalfU, h: GEO.subH, main: false }))
  ];
  for (const [a, b] of subtractWindows(1, openings)) {
    ms.geo("stone", sweepRing(baseProf, { uRange: [a, b], capEnds: true }));
  }
  for (const u of PORTALS) {
    const half = GEO.portalHalfU, H = GEO.portalH, R = GEO.portalRecess;
    [u - half, u + half].forEach((uu) => {
      ms.geo("stone", sweepRing([
        { s: S2 - R, y: gY },
        { s: S2 + 1.5, y: gY },
        { s: S2 + 1.5, y: H },
        { s: S2 - R, y: H }
      ], { uRange: [uu - 32e-4, uu + 32e-4], capEnds: true }));
    });
    ms.geo("concreteDark", sweepRing([
      { s: S2 - R, y: H },
      { s: S2 + 1.4, y: H },
      { s: S2 + 1.4, y: H - 0.9 },
      { s: S2 - R, y: H - 0.9 }
    ], { uRange: [u - half, u + half], capEnds: true }));
    ms.geo("glowWarm", sweepRing([
      { s: S2 - R + 1, y: H - 0.92 },
      { s: S2 - R + 1, y: H - 0.98 },
      { s: S2 - 1, y: H - 0.98 },
      { s: S2 - 1, y: H - 0.92 }
    ], { uRange: [u - half + 2e-3, u + half - 2e-3] }));
    ms.geo("stone", sweepRing([
      { s: S2 - R, y: 0 },
      { s: S2 + 6, y: 0 },
      { s: S2 + 6, y: -0.45 },
      { s: S2 - R, y: -0.45 }
    ], { uRange: [u - half - 6e-3, u + half + 6e-3], capEnds: true }));
    for (let k = 0; k < 3; k++) {
      ms.geo("stone", sweepRing([
        { s: S2 + 6.4 + k * 1.5, y: -0.15 * (k + 1) },
        { s: S2 + 7.6 + k * 1.5, y: -0.15 * (k + 1) },
        { s: S2 + 7.6 + k * 1.5, y: -0.15 * (k + 2) - 0.2 },
        { s: S2 + 6.4 + k * 1.5, y: -0.15 * (k + 2) - 0.2 }
      ], { uRange: [u - half - 8e-3, u + half + 8e-3], capEnds: true }));
    }
    ms.geo("alu", sweepRing([
      { s: S2 + 7.4, y: H + 1.6 },
      { s: S2 - 1, y: H + 1.6 },
      { s: S2 - 1, y: H + 1.1 },
      { s: S2 + 7.4, y: H + 1.1 }
    ], { uRange: [u - half - 4e-3, u + half + 4e-3], capEnds: true }));
    ms.geo("aluLight", sweepRing([
      { s: S2 + 7.4, y: H + 1.7 },
      { s: S2 + 7.4, y: H + 0.9 },
      { s: S2 + 7.8, y: H + 0.9 },
      { s: S2 + 7.8, y: H + 1.7 }
    ], { uRange: [u - half - 4e-3, u + half + 4e-3], capEnds: true }));
    for (let g = -3; g <= 3; g++) {
      const gu = u + g * (half * 0.235);
      ms.geo("glowWarm", sweepRing([
        { s: S2 - 2.2, y: 0.1 },
        { s: S2 - 2.2, y: 3.5 },
        { s: S2 - 2.32, y: 3.5 },
        { s: S2 - 2.32, y: 0.1 }
      ], { uRange: [gu - 55e-4, gu + 55e-4] }));
      ms.geo("steelDark", sweepRing([
        { s: S2 - 2.14, y: 3.5 },
        { s: S2 - 2.14, y: 3.62 },
        { s: S2 - 2.4, y: 3.62 },
        { s: S2 - 2.4, y: 3.5 }
      ], { uRange: [gu - 55e-4, gu + 55e-4] }));
    }
  }
  for (const u of SUB_DOORS) {
    const half = GEO.subHalfU, H = GEO.subH;
    [u - half, u + half].forEach((uu) => {
      ms.geo("stone", sweepRing([
        { s: S2 - 3, y: gY },
        { s: S2 + 1.2, y: gY },
        { s: S2 + 1.2, y: H },
        { s: S2 - 3, y: H }
      ], { uRange: [uu - 22e-4, uu + 22e-4], capEnds: true }));
    });
    ms.geo("concreteDark", sweepRing([
      { s: S2 - 3, y: H },
      { s: S2 + 1.1, y: H },
      { s: S2 + 1.1, y: H - 0.5 },
      { s: S2 - 3, y: H - 0.5 }
    ], { uRange: [u - half, u + half], capEnds: true }));
    ms.geo("glow", sweepRing([
      { s: S2 - 2.6, y: 0.2 },
      { s: S2 - 2.6, y: 3 },
      { s: S2 - 2.72, y: 3 },
      { s: S2 - 2.72, y: 0.2 }
    ], { uRange: [u - half * 0.8, u + half * 0.8] }));
    ms.geo("aluDark", sweepRing([
      { s: S2 + 3.4, y: H + 0.9 },
      { s: S2 - 0.4, y: H + 0.9 },
      { s: S2 - 0.4, y: H + 0.5 },
      { s: S2 + 3.4, y: H + 0.5 }
    ], { uRange: [u - half - 4e-3, u + half + 4e-3], capEnds: true }));
  }
  ms.geo("glassDark", sweepRing([
    { s: S2 - 0.75, y: baseTop },
    { s: S2 - 0.75, y: midTop },
    { s: S2 - 0.72, y: midTop },
    { s: S2 - 0.72, y: baseTop }
  ], { uScale: 0.14, vScale: 0.14 }));
  ms.geo("bronzeMesh", sweepRing([
    { s: S2 + 0.85, y: baseTop + 0.6 },
    { s: S2 + 0.85, y: midTop },
    { s: S2 + 0.88, y: midTop },
    { s: S2 + 0.88, y: baseTop + 0.6 }
  ], { uScale: 0.16, vScale: 0.2 }));
  for (const i of every(4)) {
    ms.box("bronze", pt(i, S2 + 0.55, baseTop + 0.5), pt(i, S2 + 0.55, midTop), 0.22, 0.75, V(1, 0, 0));
  }
  [baseTop + 1.2, baseTop + 6.4, midTop - 0.6].forEach((y, k) => {
    ms.geo("alu", sweepRing([
      { s: S2 + 1.5, y },
      { s: S2 - 0.2, y },
      { s: S2 - 0.2, y: y - 0.55 },
      { s: S2 + 1.5, y: y - 0.55 }
    ], { uScale: 0.14, vScale: 0.14 }));
    ms.geo("glow", sweepRing([
      { s: S2 + 1.4, y: y - 0.56 },
      { s: S2 + 1.4, y: y - 0.62 },
      { s: S2 + 0.1, y: y - 0.62 },
      { s: S2 + 0.1, y: y - 0.56 }
    ], { uScale: 0.2, vScale: 0.2 }));
  });
  ms.geo("alu", sweepRing([
    { s: S2 - 0.2, y: midTop },
    { s: S2 + 0.5, y: midTop },
    { s: S2 + 0.5, y: topY },
    { s: S2 - 0.2, y: topY }
  ], { uScale: 0.14, vScale: 0.14 }));
  for (const i of every(12)) {
    const w = segWindow(i / SEGS, 55e-4);
    ms.geo("glassDark", sweepRing([
      { s: S2 - 0.05, y: midTop + 0.4 },
      { s: S2 - 0.05, y: topY - 0.4 },
      { s: S2 - 0.02, y: topY - 0.4 },
      { s: S2 - 0.02, y: midTop + 0.4 }
    ], { uRange: [w.u0, w.u1], capEnds: true }));
  }
  const crownProf = [
    { s: S2 - 0.4, y: topY },
    { s: S2 + GEO.crownOut, y: topY + 0.5 },
    { s: S2 + GEO.crownOut, y: crownY - 0.9 },
    { s: S2 + GEO.crownOut - 0.7, y: crownY },
    { s: S2 - 0.4, y: crownY + 0.15 }
  ];
  ms.geo("aluLight", sweepRing(crownProf, { uScale: 0.1, vScale: 0.1 }));
  ms.geo("glowCyan", sweepRing([
    { s: S2 + GEO.crownOut - 1.2, y: topY + 0.42 },
    { s: S2 + GEO.crownOut - 1.2, y: topY + 0.34 },
    { s: S2 + 0.6, y: topY + 0.34 },
    { s: S2 + 0.6, y: topY + 0.42 }
  ], { uScale: 0.2, vScale: 0.2 }));
  for (const i of every(24)) {
    ms.box("aluDark", pt(i, S2 + 0.6, crownY - 1.2), pt(i, S2 + 0.6, gY + 0.4), 0.55, 0.55, V(1, 0, 0));
  }
}
function buildStructure(gStruct, ms, M) {
  const RI = GEO.roofInnerS, RS = GEO.roofRidgeS, RO = GEO.roofOuterS;
  const NSEG = 11;
  for (const i of every(GEO.trussStep)) {
    const top = [], bot = [];
    for (let k = 0; k < NSEG; k++) {
      const f = k / (NSEG - 1);
      const s = lerp(RI + 0.6, RO - 0.8, f);
      const yTop = roofY(s, i) - GEO.roofThick - 0.18;
      const depth = 2.4 + 2.9 * Math.sin(Math.PI * Math.pow(f, 0.72));
      top.push(pt(i, s, yTop));
      bot.push(pt(i, s, yTop - depth));
    }
    for (let k = 0; k < NSEG - 1; k++) {
      ms.box("steel", top[k], top[k + 1], 0.62, 0.62, V(0, 0, 1));
      ms.box("steel", bot[k], bot[k + 1], 0.54, 0.54, V(0, 0, 1));
      ms.box("steelDark", bot[k], top[k + 1], 0.38, 0.38, V(0, 0, 1));
      if (k < NSEG - 2) ms.box("steelDark", top[k], bot[k + 1], 0.34, 0.34, V(0, 0, 1));
      if (k % 2 === 1) ms.box("steelDark", top[k], bot[k], 0.3, 0.3, V(0, 0, 1));
    }
    ms.box("steel", top[0], bot[0], 0.5, 0.5, V(0, 0, 1));
  }
  const ringBeam = (s, yOff, hgt, wdt) => {
    const y = roofBaseY(s) + yOff;
    ms.geo("steel", sweepRing([
      { s: s - wdt, y },
      { s: s + wdt, y },
      { s: s + wdt, y: y - hgt },
      { s: s - wdt, y: y - hgt }
    ], { uScale: 0.1, vScale: 0.1, yMod: RM }));
  };
  ringBeam(RS, -1.5, 2.6, 1.5);
  ringBeam(RO - 1.6, -1.2, 2.2, 1.4);
  ringBeam(RI + 0.35, -1.1, 1.9, 0.9);
  for (const f of [0.22, 0.42, 0.62, 0.82]) {
    const s = lerp(RI, RO, f);
    const y = roofBaseY(s) - GEO.roofThick - 0.62;
    ms.geo("steelDark", sweepRing([
      { s: s - 0.26, y },
      { s: s + 0.26, y },
      { s: s + 0.26, y: y - 0.42 },
      { s: s - 0.26, y: y - 0.42 }
    ], { uScale: 0.14, vScale: 0.14, yMod: RM }));
  }
  for (let k = 0; k < 8; k++) {
    const i = k * SEGS / 8 % SEGS;
    const baseP = pt(i, GEO.mastS_base, GEO.mastBaseY);
    const topY = roofY(GEO.roofOuterS - 2.2, i) - 2;
    const topP = pt(i, GEO.mastS_top, topY);
    tapered(ms.batch("concrete"), baseP, baseP.clone().lerp(topP, 0.5), 3.4, 2.9, 2.9, 2.5);
    tapered(ms.batch("concrete"), baseP.clone().lerp(topP, 0.5), topP, 2.9, 2.2, 2.5, 1.9);
    ms.box("concreteDark", baseP.clone().setY(GEO.mastBaseY + 0.35), baseP.clone().setY(GEO.mastBaseY - 0.6), 5.4, 5.4);
    const fork = topP.clone().addScaledVector(topP.clone().sub(baseP).normalize(), 0.6);
    ms.box("steelDark", topP, fork, 2.8, 1.4, V(0, 0, 1));
    for (const sgn of [-1, 1]) {
      const off = new THREE5.Vector3().crossVectors(topP.clone().sub(baseP).normalize(), V(0, 1, 0)).normalize().multiplyScalar(sgn * 1.5);
      ms.box("steel", fork.clone().add(off), pt(i, GEO.roofOuterS - 1, topY + 1).add(off), 0.34, 0.34);
    }
    for (const sgn of [-1, 1]) {
      const j = (i + sgn * 10 + SEGS) % SEGS;
      const anchor = pt(j, GEO.roofRidgeS, roofY(GEO.roofRidgeS, j) - GEO.roofThick - 0.4);
      ms.box("steel", topP.clone().add(V(0, 1.2, 0)), anchor, 0.16, 0.16, V(0, 1, 0));
    }
    for (const sgn of [-1, 1]) {
      const mid = baseP.clone().lerp(topP, 0.5);
      const off = new THREE5.Vector3().crossVectors(topP.clone().sub(baseP).normalize(), V(0, 1, 0)).normalize().multiplyScalar(sgn * 1.55);
      ms.box("concreteDark", baseP.clone().add(off).setY(GEO.mastBaseY + 1.2), mid.clone().add(off), 0.35, 0.6);
    }
  }
  for (const i of every(16)) {
    const a = pt(i, L2.s0 + 0.5, L2.cY - 0.6);
    const b = pt(i, L1.endS + 0.4, L1.cY - 4.2);
    ms.box("steelDark", a, b, 0.55, 0.55, V(0, 0, 1));
    const c = pt(i, L3.s0 + 0.5, L3.cY - 0.6);
    const d = pt(i, L2.endS + 0.4, L2.cY - 4.2);
    ms.box("steelDark", c, d, 0.5, 0.5, V(0, 0, 1));
  }
  ms.geo("steelDark", sweepRing([
    { s: RS - 2.4, y: roofBaseY(RS) - 6.4 },
    { s: RS + 2.4, y: roofBaseY(RS) - 6.4 },
    { s: RS + 2.4, y: roofBaseY(RS) - 6.9 },
    { s: RS - 2.4, y: roofBaseY(RS) - 6.9 }
  ], { uScale: 0.06, vScale: 0.06, yMod: RM }));
  for (const i of every(12)) {
    ms.box("steelDark", pt(i, RS - 2.2, roofBaseY(RS) - 6.9), pt(i, RS + 2.2, roofBaseY(RS) - 6.9), 0.12, 0.12);
  }
}
function buildRoof(gRoof, ms, msG, M) {
  const RI = GEO.roofInnerS, RS = GEO.roofRidgeS, RO = GEO.roofOuterS;
  const topLine = [];
  const N = 14;
  for (let k = 0; k < N; k++) {
    const f = k / (N - 1);
    const s = lerp(RI, RO, f);
    topLine.push({ s, y: roofBaseY(s) });
  }
  ms.geo("roofMetal", plateRing(topLine, GEO.roofThick, -1, { uScale: 0.42, vScale: 0.24, yMod: RM }));
  ms.geo("aluLight", sweepRing([
    { s: RI - 0.22, y: roofBaseY(RI) + 1.55 },
    { s: RI + 0.55, y: roofBaseY(RI) + 1.55 },
    { s: RI + 0.55, y: roofBaseY(RI) - 0.35 },
    { s: RI - 0.22, y: roofBaseY(RI) - 0.35 }
  ], { uScale: 0.14, vScale: 0.14, yMod: RM }));
  ms.geo("roofSoffit", sweepRing([
    { s: RI - 0.22, y: roofBaseY(RI) - 1.55 },
    { s: RI + 1.4, y: roofBaseY(RI) - 1.55 },
    { s: RI + 1.4, y: roofBaseY(RI) - 2.15 },
    { s: RI - 0.22, y: roofBaseY(RI) - 2.15 }
  ], { uScale: 0.14, vScale: 0.14, yMod: RM }));
  msG.geo("glowCyan", sweepRing([
    { s: RI - 0.05, y: roofBaseY(RI) - 1.58 },
    { s: RI - 0.05, y: roofBaseY(RI) - 1.72 },
    { s: RI + 0.35, y: roofBaseY(RI) - 1.72 },
    { s: RI + 0.35, y: roofBaseY(RI) - 1.58 }
  ], { uScale: 0.25, vScale: 0.25, yMod: RM }));
  ms.geo("aluLight", sweepRing([
    { s: RO - 0.3, y: roofBaseY(RO) + 0.35 },
    { s: RO + 1.1, y: roofBaseY(RO) + 0.05 },
    { s: RO + 1.1, y: roofBaseY(RO) - 1.5 },
    { s: RO - 0.3, y: roofBaseY(RO) - 1.5 }
  ], { uScale: 0.12, vScale: 0.12, yMod: RM }));
  for (const i of every(2)) {
    const a = pt(i, RI, roofBaseY(RI) + 0.02);
    const b = pt(i, RO, roofBaseY(RO) + 0.02);
    const mid = pt(i, RS, roofBaseY(RS) + 0.02);
    ms.box("aluDark", a, mid, 0.16, 0.1, V(1, 0, 0));
    ms.box("aluDark", mid, b, 0.16, 0.1, V(1, 0, 0));
  }
  ms.geo("steelDark", sweepRing([
    { s: RO - 0.9, y: roofBaseY(RO) - 1.52 },
    { s: RO + 0.6, y: roofBaseY(RO) - 1.9 },
    { s: RO + 0.6, y: roofBaseY(RO) - 2.25 },
    { s: RO - 0.9, y: roofBaseY(RO) - 1.95 }
  ], { uScale: 0.1, vScale: 0.1, yMod: RM }));
  const lamps = [];
  for (let k = 0; k < 4; k++) {
    const i = Math.round(k * SEGS / 4) % SEGS;
    const s = RI + 8.5;
    const y = roofY(s, i) - 4;
    const c = pt(i, s, y);
    const dir = new THREE5.Vector3(-c.x, 0, -c.z).normalize();
    const side = new THREE5.Vector3(-dir.z, 0, dir.x);
    const halfLen = 11;
    ms.box("steelDark", c.clone().addScaledVector(side, -halfLen), c.clone().addScaledVector(side, halfLen), 2, 1.5, V(0, 1, 0));
    for (const sgn of [-1, 0, 1]) {
      const p = c.clone().addScaledVector(side, sgn * halfLen * 0.85);
      ms.box("steelDark", p, p.clone().setY(roofY(s, i) - GEO.roofThick - 0.4), 0.18, 0.18);
    }
    for (let r = 0; r < 2; r++) for (let m = -4; m <= 4; m++) {
      const p = c.clone().addScaledVector(side, m * 2.3).addScaledVector(dir, 1.05).setY(y - 0.55 + r * 0.55);
      msG.box("glow", p.clone().addScaledVector(side, 0.9), p.clone().addScaledVector(side, -0.9), 0.5, 0.28, V(0, 1, 0));
      lamps.push(p.clone());
    }
  }
  return lamps;
}
function seatGeom(hi) {
  const b = new GeomBatch();
  const W = hi ? 0.5 : 0.52, D = 0.46, SH = 0.44, BH = 0.58;
  const p = (x, y, z) => new THREE5.Vector3(x, y, z);
  const yS = SH, yB = SH + BH;
  b.quad(p(-W / 2, yS, -D / 2), p(W / 2, yS, -D / 2), p(W / 2, yS, D / 2), p(-W / 2, yS, D / 2));
  b.quad(p(-W / 2, 0, D / 2), p(W / 2, 0, D / 2), p(W / 2, yS, D / 2), p(-W / 2, yS, D / 2));
  b.quad(p(-W / 2, yS, -D / 2), p(W / 2, yS, -D / 2), p(W / 2, yB, -D / 2 - 0.05), p(-W / 2, yB, -D / 2 - 0.05));
  b.quad(p(-W / 2, yB, -D / 2 - 0.05), p(W / 2, yB, -D / 2 - 0.05), p(W / 2, yB, -D / 2 - 0.11), p(-W / 2, yB, -D / 2 - 0.11));
  if (hi) {
    b.quad(p(-W / 2, 0, -D / 2), p(-W / 2, 0, D / 2), p(-W / 2, yS, D / 2), p(-W / 2, yS, -D / 2));
    b.quad(p(W / 2, 0, -D / 2), p(W / 2, 0, D / 2), p(W / 2, yS, D / 2), p(W / 2, yS, -D / 2));
  }
  return b.build();
}
function buildSeats(group, M, stage2) {
  const geoLo = seatGeom(false), geoHi = seatGeom(true);
  const ring = refRing(SEGS);
  const dummy = new THREE5.Object3D();
  const TIER_COLORS = [13214047, 14673128, 11569810];
  const buckets = MODEL.tiers.map(() => []);
  const accent = [];
  const rowPerim = /* @__PURE__ */ new Map();
  for (const t of MODEL.tiers) for (const r of t.rows) rowPerim.set(t.id + ":" + r.k, r.perimeter);
  const stride = stage2 && stage2.lite ? Math.max(1, stage2.seatStride || 3) : 1;
  for (const s of seatInstances(MODEL, stride)) {
    const perim = rowPerim.get(s.tier + ":" + s.row) || 330;
    const fu = (s.u % 1 + 1) % 1 * (ring.total / perim) * SEGS;
    const fi = (fu % SEGS + SEGS) % SEGS;
    const i0 = Math.floor(fi) % SEGS, i1 = (i0 + 1) % SEGS, fr = fi - Math.floor(fi);
    let nx = ring.pts[i0].nx + (ring.pts[i1].nx - ring.pts[i0].nx) * fr;
    let nz = ring.pts[i0].nz + (ring.pts[i1].nz - ring.pts[i0].nz) * fr;
    const nl = Math.hypot(nx, nz) || 1;
    nx /= nl;
    nz /= nl;
    const hx = HALF_X + s.s, hz = HALF_Z + s.s;
    const t = boundaryT(hx, hz, hx * CORNER_F, nx, nz);
    dummy.position.set(nx * t, s.y, nz * t);
    dummy.rotation.set(0, Math.atan2(-nx, -nz), 0);
    dummy.scale.set(stride, 1, 1);
    dummy.updateMatrix();
    const mtx = dummy.matrix.clone();
    const hex = seatColor(s.tierIdx, s.row, s.zone, s.idx, MODEL.tiers[s.tierIdx].rows[0].perZone);
    if (ACCENT.includes(hex)) accent.push(mtx);
    else buckets[s.tierIdx].push(mtx);
  }
  const meshes = [];
  const mkInst = (mt, list, colorHex, name, hi) => {
    if (!list.length) return;
    const mat = M.seat.clone();
    mat.color = new THREE5.Color(colorHex);
    mat.emissive = new THREE5.Color(colorHex).multiplyScalar(0.16);
    mat.emissiveIntensity = 1;
    const inst = new THREE5.InstancedMesh(hi ? geoHi : geoLo, mat, list.length);
    inst.instanceMatrix.setUsage(THREE5.StaticDrawUsage);
    for (let i = 0; i < list.length; i++) inst.setMatrixAt(i, list[i]);
    inst.instanceMatrix.needsUpdate = true;
    inst.name = name;
    inst.castShadow = false;
    inst.receiveShadow = false;
    inst.computeBoundingSphere();
    group.add(inst);
    meshes.push(inst);
  };
  buckets.forEach((list, ti) => {
    const hi = [], lo = [];
    const firstRows = stride > 1 ? 0 : 8;
    for (let i = 0; i < list.length; i++) (i < firstRows * 200 ? hi : lo).push(list[i]);
    mkInst(hi, hi, TIER_COLORS[ti], "seats-" + MODEL.tiers[ti].id + "-hi", true);
    mkInst(lo, lo, TIER_COLORS[ti], "seats-" + MODEL.tiers[ti].id, false);
  });
  mkInst(null, accent, 15781770, "seats-accent", false);
  return { meshes, total: MODEL.total, stride };
}
function buildInterior(gInterior, ms, msG, M) {
  const S2 = GEO.outerS;
  const P3 = (i, s, y) => pt(i, s, y);
  const seg = (u) => Math.round(u * SEGS) % SEGS;
  const podY = 0, podH = 9.4;
  ms.geo("interior", sweepRing([
    { s: L1.endS + 1, y: podY },
    { s: S2 - 1.5, y: podY },
    { s: S2 - 1.5, y: podY - 0.35 },
    { s: L1.endS + 1, y: podY - 0.35 }
  ], { uScale: 0.05, vScale: 0.05 }));
  ms.geo("interiorDark", sweepRing([
    { s: L1.endS + 1.2, y: podH },
    { s: S2 - 1.5, y: podH },
    { s: S2 - 1.5, y: podH - 0.35 },
    { s: L1.endS + 1.2, y: podH - 0.35 }
  ], { uScale: 0.05, vScale: 0.05 }));
  for (const i of every(12)) {
    ms.box("concrete", P3(i, S2 - 4.2, podY), P3(i, S2 - 4.2, podH), 1, 1, V(1, 0, 0));
    ms.box("concrete", P3(i, L1.endS + 4, podY), P3(i, L1.endS + 4, podH), 0.9, 0.9, V(1, 0, 0));
  }
  for (const i of every(6)) {
    ms.box("glowCool", P3(i, S2 - 9, podH - 0.42), P3(i + 4, S2 - 9, podH - 0.42), 0.2, 0.1, V(0, 1, 0));
  }
  for (let k = 0; k < SEGS / 12; k++) {
    const i = k * 12 + 6;
    const w = k % 3 === 0 ? "interior" : "interiorDark";
    ms.box(w, P3(i - 4.2, S2 - 2.2, podY), P3(i + 4.2, S2 - 2.2, podY), 6, 4.2, V(0, 0, 1));
    ms.box("glowWarm", P3(i - 3.4, S2 - 5.4, 3.3), P3(i + 3.4, S2 - 5.4, 3.3), 0.16, 0.3, V(0, 0, 1));
  }
  for (const u of PORTALS) {
    const half = GEO.portalHalfU;
    const sIn = S2 - 26;
    ms.geo("stone", sweepRing([
      { s: sIn, y: 0.02 },
      { s: S2 - 1, y: 0.02 },
      { s: S2 - 1, y: -0.3 },
      { s: sIn, y: -0.3 }
    ], { uRange: [u - half - 8e-3, u + half + 8e-3], capEnds: true }));
    ms.geo("interiorDark", sweepRing([
      { s: sIn, y: 14 },
      { s: S2 - 1, y: 14 },
      { s: S2 - 1, y: 13.5 },
      { s: sIn, y: 13.5 }
    ], { uRange: [u - half - 8e-3, u + half + 8e-3], capEnds: true }));
    [u - half - 8e-3, u + half + 8e-3].forEach((uu) => {
      ms.geo("interior", sweepRing([
        { s: sIn, y: 0 },
        { s: S2 - 1, y: 0 },
        { s: S2 - 1, y: 14 },
        { s: sIn, y: 14 }
      ], { uRange: [uu - 16e-4, uu + 16e-4], capEnds: true }));
    });
    for (let r = 0; r < 3; r++) {
      msG.box("glow", P3(seg(u), sIn + 3 + r * 7, 13.4), P3(seg(u) + 2, sIn + 3 + r * 7, 13.4), 4.2, 0.12, V(0, 1, 0));
    }
    for (let k = -3; k <= 3; k++) {
      const i = seg(u) + k;
      ms.box("steelDark", P3(i, sIn + 9, 0.02), P3(i, sIn + 9, 1.3), 1, 0.36);
      ms.box("glowCyan", P3(i, sIn + 9, 1.3), P3(i, sIn + 9, 1.42), 0.9, 0.1);
    }
    ms.box("wood", P3(seg(u) - 3, sIn + 3, 0.02), P3(seg(u) + 3, sIn + 3, 0.02), 0.9, 1.1, V(0, 1, 0));
    ms.box("glowCool", P3(seg(u) - 5, sIn, 0.05), P3(seg(u) + 5, sIn, 7.5), 0.3, 0.3);
  }
  for (const u of PORTALS) {
    const i = seg(u);
    const sA = S2 - 20, sB = L1.cS1 - 2;
    const pA = P3(i + 2, sA, 0.2), pB = P3(i + 2, sB, L1.cY);
    const mid = pA.clone().lerp(pB, 0.5);
    ms.box("steelDark", pA, pB, 2.4, 0.4, V(0, 1, 0));
    ms.box("rail", pA.clone().setY(pA.y + 1), pB.clone().setY(pB.y + 1), 0.12, 0.12);
    ms.box("glassLite", pA.clone().setY(pA.y + 0.5), pB.clone().setY(pB.y + 0.5), 0.06, 1);
    ms.box("concreteDark", pA.clone().setY(0.1), pA.clone().setY(-1), 3.2, 3.2);
  }
  for (let k = 0; k < 8; k++) {
    const u = (k + 0.5) / 8;
    const i = seg(u);
    const s0 = L1.cS1 - 1.2, s1 = L1.cS1 + 3.4;
    const base = P3(i, s0, 0);
    const boxTop = P3(i, s1, L3.cY);
    ms.box("concrete", base.clone().setY(0), boxTop, 6.4, 6.4, V(0, 0, 1));
    for (let y = 0.6; y < L3.cY - 1; y += 1.15) {
      ms.box("concreteLight", P3(i, s0 + 0.3, y), P3(i, s1 - 0.3, y), 2.6, 0.16, V(0, 1, 0));
    }
    msG.box("glowWarm", base.clone().setY(2.4), base.clone().setY(2.5), 0.5, 0.5);
  }
  {
    const iN = 0;
    const zTunnel = GEO.barrierS;
    const sA = zTunnel - 3, sB = L1.endS + 6;
    ms.geo("carpet", sweepRing([
      { s: sA, y: -0.05 },
      { s: sB, y: -0.05 },
      { s: sB, y: -0.35 },
      { s: sA, y: -0.35 }
    ], { uRange: [-0.0105, 0.0105], capEnds: true }));
    [-0.0105, 0.0105].forEach((uu) => {
      ms.geo("interior", sweepRing([
        { s: sA, y: 0 },
        { s: sB, y: 0 },
        { s: sB, y: 3.2 },
        { s: sA, y: 3.2 }
      ], { uRange: [uu - 18e-4, uu + 18e-4], capEnds: true }));
    });
    ms.geo("interiorDark", sweepRing([
      { s: sA, y: 3.2 },
      { s: sB, y: 3.2 },
      { s: sB, y: 2.85 },
      { s: sA, y: 2.85 }
    ], { uRange: [-0.0105, 0.0105], capEnds: true }));
    for (let s = sA + 2; s < sB; s += 5) {
      msG.box("glow", P3(iN, s, 2.8), P3(iN + 2, s, 2.8), 1.6, 0.12, V(0, 1, 0));
    }
    for (const side of [-1, 1]) {
      const i = iN + side * 6;
      const c = P3(i, L1.endS + 16, 0);
      const rot = Math.atan2(c.x, c.z);
      const put = (w, h, d, x, y, z, mat) => {
        const g = new THREE5.BoxGeometry(w, h, d);
        const mtx = new THREE5.Matrix4().makeRotationY(rot);
        mtx.setPosition(c.clone().add(new THREE5.Vector3(x, y, z).applyAxisAngle(V(0, 1, 0), rot)));
        ms.batch(mat).add(g, mtx);
        g.dispose();
        return null;
      };
      put(15, 0.2, 11, 0, 0.1, 0, "interiorDark");
      put(15, 0.25, 11, 0, 3.6, 0, "interiorDark");
      put(15, 3.6, 0.25, 0, 1.8, -5.4, "interior");
      put(0.25, 3.6, 11, -7.4, 1.8, 0, "interior");
      put(0.25, 3.6, 11, 7.4, 1.8, 0, "interior");
      for (const rz of [-3.4, 3.4]) for (let m = -4; m <= 4; m++) {
        put(1.35, 2, 0.62, m * 1.55, 1, rz, "wood");
      }
      put(4.2, 2.4, 0.12, 0, 1.6, -5.1, "interiorDark");
      put(2, 0.75, 0.9, -2.4, 0.38, 0, "wood");
      put(2, 0.9, 1.6, 3.4, 0.45, 1.4, "steelDark");
      const lp = c.clone().setY(3.3);
      msG.box("glow", lp.clone().add(new THREE5.Vector3(-3, 0, 0)), lp.clone().add(new THREE5.Vector3(3, 0, 0)), 0.2, 0.1, V(0, 1, 0));
    }
  }
  {
    const i = seg(0.75);
    const c = P3(i, L1.endS + 14, 0);
    const rot = Math.atan2(c.x, c.z);
    const put = (w, h, d, x, y, z, mat) => {
      const g = new THREE5.BoxGeometry(w, h, d);
      const mtx = new THREE5.Matrix4().makeRotationY(rot);
      mtx.setPosition(c.clone().add(new THREE5.Vector3(x, y, z).applyAxisAngle(V(0, 1, 0), rot)));
      ms.batch(mat).add(g, mtx);
      g.dispose();
      return null;
    };
    put(30, 0.25, 20, 0, 0.12, 0, "interiorDark");
    put(30, 0.3, 20, 0, 8, 0, "interiorDark");
    put(30, 8, 0.3, 0, 4, -10, "interior");
    put(0.3, 8, 20, -15, 4, 0, "interior");
    put(0.3, 8, 20, 15, 4, 0, "interior");
    put(12, 1.1, 1.4, 0, 0.68, -6.4, "wood");
    put(10, 5, 0.25, 0, 3.4, -9.4, "glowCool");
    for (let r = 0; r < 5; r++) {
      put(24, 0.55, 1.1, 0, 0.28 + r * 0.32, -3 + r * 1.5, "interiorDark");
      for (let cc = -7; cc <= 7; cc++) {
        put(0.85, 0.72, 0.55, cc * 1.5, 0.4 + r * 0.32, -3 + r * 1.5, "interiorDark");
      }
    }
    for (let r = 0; r < 3; r++) {
      put(6, 0.1, 1.2, 0, 7.6, -6 + r * 3, "glow");
    }
  }
  {
    const i = seg(0.25);
    const c = P3(i, S2 - 12, 0);
    const rot = Math.atan2(c.x, c.z);
    const put = (w, h, d, x, y, z, mat) => {
      const g = new THREE5.BoxGeometry(w, h, d);
      const mtx = new THREE5.Matrix4().makeRotationY(rot);
      mtx.setPosition(c.clone().add(new THREE5.Vector3(x, y, z).applyAxisAngle(V(0, 1, 0), rot)));
      ms.batch(mat).add(g, mtx);
      g.dispose();
      return null;
    };
    put(22, 0.25, 16, 0, 6.6, 0, "interiorDark");
    put(22, 4.2, 0.3, 0, 2.1, -8, "interior");
    put(0.3, 4.2, 16, -11, 2.1, 0, "interior");
    put(0.3, 4.2, 16, 11, 2.1, 0, "interior");
    put(9, 1.1, 0.9, 0, 0.55, -2, "wood");
    for (let k = -1; k <= 1; k++) put(2.4, 0.7, 0.9, k * 4, 1.05, 2.4, "carpet");
    for (let k = -1; k <= 1; k++) put(6, 0.12, 0.55, 0, 4, k * 3, "glowWarm");
  }
}

// src/scenes/env.js
init_core();
import * as THREE7 from "three";

// src/lib/textures.js
import * as THREE6 from "three";
var CV = (w, h) => {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return c;
};
var TEX_SCALE = 1;
function setTextureScale(s) {
  TEX_SCALE = Math.min(1, Math.max(0.25, s || 1));
}
var SZ = (w) => Math.max(2, Math.round(w * TEX_SCALE));
var TEX = (cv, { srgb = true, wrap = THREE6.ClampToEdgeWrapping, aniso = 8 } = {}) => {
  const t = new THREE6.CanvasTexture(cv);
  t.colorSpace = srgb ? THREE6.SRGBColorSpace : THREE6.NoColorSpace;
  t.wrapS = t.wrapT = wrap;
  t.anisotropy = aniso;
  return t;
};
function rnd(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function plazaTexture() {
  const W = SZ(1024), H = SZ(512);
  const cv = CV(W, H), ctx = cv.getContext("2d");
  const R = rnd(7713);
  ctx.fillStyle = "#a9a49a";
  ctx.fillRect(0, 0, W, H);
  const cols = 8, rows = 4;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 * (W / cols / 2);
    for (let c = -1; c <= cols; c++) {
      const v = 158 + Math.floor(R() * 26);
      const warm = 8 + Math.floor(R() * 10);
      ctx.fillStyle = `rgb(${v + warm},${v + 2},${v - warm * 0.6})`;
      ctx.fillRect(c * W / cols + off + 1.2, r * H / rows + 1.2, W / cols - 2.4, H / rows - 2.4);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      for (let k = 0; k < 40; k++) {
        ctx.fillRect(c * W / cols + off + R() * (W / cols), r * H / rows + R() * (H / rows), 1.6, 1.6);
      }
    }
  }
  ctx.strokeStyle = "rgba(88,84,78,0.75)";
  ctx.lineWidth = 2.2;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * H / rows);
    ctx.lineTo(W, r * H / rows);
    ctx.stroke();
  }
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * W / cols, 0);
    ctx.lineTo(c * W / cols, H);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(120,116,108,0.55)";
  for (let c = 0; c < cols; c += 2) ctx.fillRect(c * W / cols, 0, 5, H);
  const t = TEX(cv, { wrap: THREE6.RepeatWrapping });
  t.anisotropy = 16;
  return t;
}
function asphaltTexture() {
  const W = SZ(512), H = SZ(512);
  const cv = CV(W, H), ctx = cv.getContext("2d");
  const R = rnd(3311);
  ctx.fillStyle = "#3b3d40";
  ctx.fillRect(0, 0, W, H);
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (R() - 0.5) * 22;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  const cx = W / 2;
  ctx.fillStyle = "rgba(226,206,120,0.92)";
  ctx.fillRect(cx - 7, 0, 4, H);
  ctx.fillRect(cx + 3, 0, 4, H);
  ctx.fillStyle = "rgba(232,234,236,0.8)";
  ctx.fillRect(W * 0.035, 0, 4, H);
  ctx.fillRect(W * 0.965 - 4, 0, 4, H);
  ctx.fillStyle = "rgba(232,234,236,0.62)";
  ctx.fillRect(cx - W * 0.25 - 2, 0, 3, H);
  ctx.fillRect(cx + W * 0.25 - 1, 0, 3, H);
  ctx.fillStyle = "rgba(232,234,236,0.55)";
  const dashW = 3;
  for (const fx of [0.035 + 0.115, 0.5 - 0.115, 0.5 + 0.115, 0.965 - 0.115]) {
    for (let y = 0; y < H; y += 128) ctx.fillRect(fx * W, y + 16, dashW, 56);
  }
  const t = TEX(cv, { wrap: THREE6.RepeatWrapping });
  t.anisotropy = 16;
  return t;
}
function grassTexture() {
  const W = SZ(512), H = SZ(512);
  const cv = CV(W, H), ctx = cv.getContext("2d");
  const R = rnd(9021);
  ctx.fillStyle = "#557a3e";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    const x = R() * W, y = R() * H, r = 30 + R() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const darker = R() > 0.5;
    g.addColorStop(0, darker ? "rgba(58,88,44,0.34)" : "rgba(112,148,74,0.30)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 9e3; i++) {
    const x = R() * W, y = R() * H;
    const l = 2 + R() * 5;
    ctx.strokeStyle = R() > 0.5 ? "rgba(126,164,84,0.30)" : "rgba(48,74,36,0.30)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (R() - 0.5) * 2, y - l);
    ctx.stroke();
  }
  const t = TEX(cv, { wrap: THREE6.RepeatWrapping });
  t.anisotropy = 16;
  return t;
}
function cityBlockTexture() {
  const W = SZ(512), H = SZ(512);
  const cv = CV(W, H), ctx = cv.getContext("2d");
  const R = rnd(4477);
  ctx.fillStyle = "#e9e6df";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(150,148,142,0.35)";
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = 0; x < W; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (R() > 0.82) continue;
    const x = c * 64 + 14, y = r * 64 + 14;
    ctx.fillStyle = R() > 0.35 ? "rgba(96,112,126,0.55)" : "rgba(140,152,164,0.32)";
    ctx.fillRect(x, y, 36, 30);
  }
  for (let r = 0; r < 8; r++) {
    ctx.fillStyle = "rgba(120,118,112,0.22)";
    ctx.fillRect(0, r * 64 + 56, W, 4);
  }
  const t = TEX(cv, { wrap: THREE6.RepeatWrapping });
  t.anisotropy = 8;
  return t;
}
function canopyTexture() {
  const W = SZ(256), H = SZ(256);
  const cv = CV(W, H), ctx = cv.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#c8ccd0");
  g.addColorStop(1, "#9aa1a8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(70,78,86,0.35)";
  for (let x = 0; x < W; x += 32) ctx.fillRect(x, 0, 3, H);
  const t = TEX(cv, { wrap: THREE6.RepeatWrapping });
  return t;
}

// src/scenes/env.js
var GY = GEO.groundY;
var TAU2 = Math.PI * 2;
var angOf = (u) => u * TAU2 - Math.PI / 2;
function rawS(x, z, pad) {
  const l = Math.hypot(x, z) || 1;
  const nx = x / l, nz = z / l;
  let t = l + (pad || 0);
  for (let i = 0; i < 8; i++) {
    const hx = HALF_X + t, hz = HALF_Z + t;
    t = boundaryT(hx, hz, hx * CORNER_F, nx, nz);
  }
  return t;
}
var wpt = (u, s, y) => {
  const a = angOf(u), c = Math.cos(a), n = Math.sin(a);
  const t = rawS(c, n, s);
  return new THREE7.Vector3(c * t, y, n * t);
};
var AXIS_CLEAR = 21.5;
var isOnAxis = (x, z) => Math.abs(x) < AXIS_CLEAR || Math.abs(z) < AXIS_CLEAR;
function rnd2(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var SITE = {
  training: [{ x: -242, z: -80 }, { x: -242, z: 80 }],
  transit: { x: 200, z: 0 },
  parking: { x: 218, z: 218 },
  retail: { x: 0, z: 260 },
  cityR0: 248,
  cityR1: 560,
  plazaR1: 300,
  pitch: { L: 105, W: 68 }
};
var BLK = 40;
var ROAD_W = 16;
var WALK_W = 5;
var B_CITY = 6.5;
var B_OUT = 9.4;
function buildEnv(scene, stage2) {
  const root = new THREE7.Group();
  root.name = "ENV";
  scene.add(root);
  const lite = !!(stage2 && stage2.lite);
  const TREE_CAP = lite ? 260 : 720;
  const TREE_TRIES = lite ? 320 : 900;
  const HEDGE_DIV = lite ? 2 : 1;
  const groups = {};
  const G = (n) => {
    const g = new THREE7.Group();
    g.name = n;
    root.add(g);
    groups[n] = g;
    return g;
  };
  const gPlaza = G("plaza"), gTraining = G("training"), gTransit = G("transit"), gParking = G("parking"), gLandscape = G("landscape"), gCity = G("city"), gProps = G("props");
  const ents = {};
  const ent = (id, mesh, parent, label, spec) => {
    ents[id] = { id, mesh, parent, label, spec };
    return ents[id];
  };
  const aniso = stage2 && stage2.renderer ? Math.min(8, stage2.renderer.capabilities.getMaxAnisotropy()) : 4;
  const tex = (t, rx, ry) => {
    t.anisotropy = aniso;
    if (rx) {
      t.wrapS = t.wrapT = THREE7.RepeatWrapping;
      t.repeat.set(rx, ry || rx);
    }
    return t;
  };
  const texPlaza = tex(plazaTexture());
  const texRoad = tex(asphaltTexture());
  const texGrass = tex(grassTexture(), 140, 140);
  const texPitch = tex(grassTexture(), 10, 7);
  const texCity = tex(cityBlockTexture());
  const texCanopy = tex(canopyTexture(), 8, 1);
  const texWalk = tex(plazaTexture(), 0.32, 0.32);
  const std = (o) => new THREE7.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.7 }, o));
  const M = {
    terrain: std({ color: 16777215, roughness: 0.97, metalness: 0, vertexColors: true }),
    plaza: std({ color: 16777215, map: texPlaza, roughness: 0.86, metalness: 0.02 }),
    plazaDark: std({ color: 9407363, roughness: 0.9 }),
    band: std({ color: 14275268, roughness: 0.82 }),
    stone: std({ color: 14998989, roughness: 0.86 }),
    stoneDark: std({ color: 10262155, roughness: 0.9 }),
    concrete: std({ color: 13617855, roughness: 0.9 }),
    concreteDark: std({ color: 7170660, roughness: 0.92 }),
    road: std({ color: 16777215, map: texRoad, roughness: 0.95, metalness: 0 }),
    line: new THREE7.MeshBasicMaterial({ color: 15127162, transparent: true, opacity: 0.55 }),
    walk: std({ color: 12368046, map: texWalk, roughness: 0.92 }),
    /* 街廓内部铺装：比人行道更中性，用来"填实"地块 */
    plot: std({ color: 11117979, map: texWalk, roughness: 0.94 }),
    kerb: std({ color: 12894131, roughness: 0.88 }),
    grass: std({ color: 16777215, map: texGrass, roughness: 0.96 }),
    hill: std({ color: 16777215, map: texPitch, roughness: 0.96, side: THREE7.DoubleSide }),
    pitchGrass: std({ color: 15134684, map: texPitch, roughness: 0.94 }),
    pitchLine: new THREE7.MeshBasicMaterial({ color: 15922926, transparent: true, opacity: 0.8, toneMapped: false }),
    trunk: std({ color: 5916469, roughness: 0.92 }),
    leaf: std({ color: 4945722, roughness: 0.86, flatShading: true }),
    leaf2: std({ color: 6787135, roughness: 0.86, flatShading: true }),
    hedge: std({ color: 4155956, roughness: 0.95 }),
    fence: new THREE7.MeshBasicMaterial({ color: 11187387, transparent: true, opacity: 0.16, side: THREE7.DoubleSide }),
    water: new THREE7.MeshStandardMaterial({ color: 3103598, roughness: 0.12, metalness: 0.7, envMapIntensity: 1.3 }),
    /* 城市肌理：半透明白体块（透明度 0.12–0.25，不抢主体） */
    massing: new THREE7.MeshStandardMaterial({
      color: 16054008,
      map: texCity,
      roughness: 0.72,
      metalness: 0.03,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE7.DoubleSide,
      envMapIntensity: 0.9
    }),
    massingRoof: new THREE7.MeshStandardMaterial({
      color: 15133422,
      roughness: 0.85,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      side: THREE7.DoubleSide
    }),
    canopy: std({ color: 16777215, map: texCanopy, roughness: 0.45, metalness: 0.55 }),
    metal: std({ color: 10003117, roughness: 0.42, metalness: 0.78 }),
    metalDark: std({ color: 5331555, roughness: 0.55, metalness: 0.6 }),
    glass: new THREE7.MeshPhysicalMaterial({ color: 10334916, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.3, envMapIntensity: 1.4, side: THREE7.DoubleSide }),
    glowWarm: new THREE7.MeshBasicMaterial({ color: 16767392, toneMapped: false }),
    glowCool: new THREE7.MeshBasicMaterial({ color: 12577013, toneMapped: false }),
    glowRed: new THREE7.MeshBasicMaterial({ color: 12863023, toneMapped: false }),
    screen: new THREE7.MeshBasicMaterial({ color: 5486287, toneMapped: false }),
    /* 车辆：4 色 × 1 个实例批次 */
    carA: std({ color: 15330285, roughness: 0.35, metalness: 0.3 }),
    carB: std({ color: 3754071, roughness: 0.4, metalness: 0.35 }),
    carC: std({ color: 11026479, roughness: 0.4, metalness: 0.3 }),
    carD: std({ color: 4877708, roughness: 0.4, metalness: 0.3 }),
    carGlass: std({ color: 1910835, roughness: 0.2, metalness: 0.4 })
  };
  const addBox = (b, cx, cy, cz, w, h, d, rotY = 0) => {
    const g = new THREE7.BoxGeometry(w, h, d);
    const m = new THREE7.Matrix4();
    if (rotY) m.makeRotationY(rotY);
    m.setPosition(cx, cy, cz);
    b.add(g, m);
    g.dispose();
  };
  const flush = (b, mat, parent, name) => {
    const g = b.build();
    if (!g) return null;
    const m = new THREE7.Mesh(g, mat);
    m.name = name || "env-batch";
    parent.add(m);
    return m;
  };
  const _d = new THREE7.Object3D();
  const matOf = (x, y, z, ry = 0, s = 1) => {
    _d.position.set(x, y, z);
    _d.rotation.set(0, ry, 0);
    _d.scale.setScalar(s);
    _d.updateMatrix();
    return _d.matrix.clone();
  };
  const IB = (geo, mat, opts = {}) => ({
    geo,
    mat,
    opts,
    mats: [],
    push(m) {
      this.mats.push(m);
      return this;
    },
    flush(parent, name) {
      if (!this.mats.length) return null;
      const im = new THREE7.InstancedMesh(this.geo, this.mat, this.mats.length);
      im.instanceMatrix.setUsage(THREE7.StaticDrawUsage);
      for (let i = 0; i < this.mats.length; i++) im.setMatrixAt(i, this.mats[i]);
      im.instanceMatrix.needsUpdate = true;
      im.name = name || "inst";
      im.castShadow = !!this.opts.shadow;
      im.receiveShadow = !!this.opts.recv;
      im.computeBoundingSphere();
      parent.add(im);
      return im;
    },
    get count() {
      return this.mats.length;
    }
  });
  function polarDisc(u0, u1, s0, s1, nu, mat, y, k, parent, vDiv = 2) {
    const pos = [], nor = [], uv = [], idx = [];
    const nv = vDiv;
    for (let i = 0; i <= nu; i++) {
      const u = lerp(u0, u1, i / nu);
      const a = angOf(u), ca = Math.cos(a), sa = Math.sin(a);
      for (let j = 0; j <= nv; j++) {
        const s = lerp(s0, s1, j / nv);
        const t = rawS(ca, sa, s);
        pos.push(ca * t, y, sa * t);
        nor.push(0, 1, 0);
        uv.push((u * 2 * (HALF_X + s) + s) * k, s * k);
      }
    }
    const row = nv + 1;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a0 = i * row + j, b0 = (i + 1) * row + j;
      idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
    }
    const g = new THREE7.BufferGeometry();
    g.setAttribute("position", new THREE7.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE7.Float32BufferAttribute(nor, 3));
    g.setAttribute("uv", new THREE7.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const m = new THREE7.Mesh(g, mat);
    m.receiveShadow = true;
    (parent || root).add(m);
    return m;
  }
  const P3 = (u, s, y) => wpt(u, s, y);
  {
    const S2 = 2e3, N = 40;
    const g = new THREE7.PlaneGeometry(S2, S2, N, N);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    const cPark = new THREE7.Color(9676417), cPark2 = new THREE7.Color(8558957);
    const cUrban = new THREE7.Color(10854806), cUrban2 = new THREE7.Color(9670794);
    const cRim = new THREE7.Color(11578530);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const rr = Math.hypot(x, z);
      let c;
      if (rr < 300) {
        c = cPark.clone().lerp(cPark2, clamp((rr - 120) / 180, 0, 1));
      } else if (rr < 380) {
        c = cRim.clone().lerp(cUrban, clamp((rr - 300) / 80, 0, 1));
      } else {
        c = cUrban.clone().lerp(cUrban2, clamp((rr - 380) / 480, 0, 1));
      }
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE7.BufferAttribute(col, 3));
    const m = new THREE7.Mesh(g, M.terrain);
    m.position.y = GY - 0.14;
    m.name = "env-terrain";
    m.receiveShadow = true;
    gLandscape.add(m);
    ent("ground", m, gLandscape, "场地大地与绿地", "总图 900×900m · 草地基底");
  }
  {
    const roadB = new GeomBatch(), walkB = new GeomBatch(), kerbB = new GeomBatch(), lineB = new GeomBatch();
    const N = 2 * B_OUT;
    const x0 = -B_OUT * BLK;
    for (let i = 0; i <= N; i++) {
      const c = x0 + i * BLK;
      const ext = N * BLK;
      addBox(roadB, 0, GY, c, ext * 2 + ROAD_W, 0.04, ROAD_W);
      addBox(roadB, c, GY, 0, ROAD_W, 0.04, ext * 2 + ROAD_W);
      for (let k = 0; k < N; k++) {
        const cc = x0 + (k + 0.5) * BLK;
        addBox(lineB, cc, GY + 0.05, c - 0.4, BLK - ROAD_W - 4, 0.012, 0.32);
        addBox(lineB, cc, GY + 0.05, c + 0.4, BLK - ROAD_W - 4, 0.012, 0.32);
        addBox(lineB, c - 0.4, GY + 0.05, cc, 0.32, 0.012, BLK - ROAD_W - 4);
        addBox(lineB, c + 0.4, GY + 0.05, cc, 0.32, 0.012, BLK - ROAD_W - 4);
      }
    }
    const plotB = new GeomBatch();
    for (let i = -B_CITY; i < B_CITY; i++) for (let j = -B_CITY; j < B_CITY; j++) {
      const cx = (i + 0.5) * BLK, cz = (j + 0.5) * BLK;
      const wOut = BLK / 2 - ROAD_W / 2 + WALK_W;
      if (rawS(cx, cz, 0) > 62) {
        addBox(plotB, cx, GY + 0.02, cz, wOut * 2, 0.06, wOut * 2);
      }
      addBox(walkB, cx, GY + 0.06, cz - wOut + WALK_W / 2, wOut * 2, 0.12, WALK_W);
      addBox(walkB, cx, GY + 0.06, cz + wOut - WALK_W / 2, wOut * 2, 0.12, WALK_W);
      addBox(walkB, cx - wOut + WALK_W / 2, GY + 0.06, cz, WALK_W, 0.12, wOut * 2 - WALK_W * 2);
      addBox(walkB, cx + wOut - WALK_W / 2, GY + 0.06, cz, WALK_W, 0.12, wOut * 2 - WALK_W * 2);
      addBox(kerbB, cx, GY + 0.11, cz - wOut, wOut * 2 + 0.4, 0.22, 0.4);
      addBox(kerbB, cx, GY + 0.11, cz + wOut, wOut * 2 + 0.4, 0.22, 0.4);
      addBox(kerbB, cx - wOut, GY + 0.11, cz, 0.4, 0.22, wOut * 2 - 0.4);
      addBox(kerbB, cx + wOut, GY + 0.11, cz, 0.4, 0.22, wOut * 2 - 0.4);
    }
    const rm = flush(roadB, M.road, gProps, "env-roads");
    const wm = flush(walkB, M.walk, gProps, "env-walkways");
    flush(kerbB, M.kerb, gProps, "env-kerbs");
    flush(lineB, M.line, gProps, "env-roadlines");
    const pm = flush(plotB, M.plot, gProps, "env-plots");
    if (pm) pm.receiveShadow = true;
    if (rm) rm.receiveShadow = true;
    if (wm) wm.receiveShadow = true;
    ent("roads", rm, gProps, "城市道路网", "40m 街廓 · 16m 双向车行道 + 5m 人行道");
  }
  const S_PLZ = rawS(0, 1, 4);
  const S_POD = S_PLZ + 42;
  const R_PLZ = 300;
  const RISE = 0.45;
  {
    for (let k = 0; k < 4; k++) {
      const u = k / 4;
      polarDisc(u - 0.083, u + 0.083, S_PLZ, R_PLZ, 30, M.plaza, GY + 0.05, 0.12, gPlaza, 3);
    }
    ent(
      "plaza",
      gPlaza.children[0],
      gPlaza,
      "中央球迷广场",
      "放射花岗岩铺装 · 4 条林荫大道 · 旗阵与水景"
    );
    const podB = new GeomBatch();
    for (let i = 0; i < 128; i++) {
      const u0 = i / 128, u1 = (i + 1) / 128;
      const q0 = P3(u0, S_PLZ, GY + RISE), q1 = P3(u0, S_POD, GY + RISE), q2 = P3(u1, S_POD, GY + RISE), q3 = P3(u1, S_PLZ, GY + RISE);
      podB.quad(q0, q3, q2, q1, [[0, 0], [1, 0], [1, 1], [0, 1]]);
      const b0 = P3(u0, S_POD, GY), b1 = P3(u1, S_POD, GY);
      podB.quad(b0, b1, q2, q1, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    }
    const pm = new THREE7.Mesh(podB.build(), M.stone);
    pm.name = "plaza-podium";
    pm.receiveShadow = true;
    gPlaza.add(pm);
    const bandB = new GeomBatch();
    for (let k = 0; k < 32; k++) {
      const u = k / 32, a = angOf(u);
      const t0 = rawS(Math.cos(a), Math.sin(a), S_PLZ + 2), t1 = rawS(Math.cos(a), Math.sin(a), S_POD - 2);
      const m = new THREE7.Matrix4().makeRotationY(-a + Math.PI / 2);
      m.setPosition(Math.cos(a) * (t0 + t1) / 2, GY + RISE + 0.012, Math.sin(a) * (t0 + t1) / 2);
      const g = new THREE7.BoxGeometry(0.55, 0.02, t1 - t0);
      bandB.add(g, m);
      g.dispose();
    }
    flush(bandB, M.plazaDark, gPlaza, "plaza-radialbands");
    const stepTopB = new GeomBatch(), stepRiseB = new GeomBatch();
    const STEPS = 5, TREAD3 = 1.9;
    for (let k = 0; k < 4; k++) {
      const uC = k / 4;
      const pu = 0.052;
      for (let s = 0; s < STEPS; s++) {
        const y = GY + RISE * (s + 1) / STEPS;
        const sIn = S_POD + (STEPS - 1 - s) * TREAD3;
        const sOut = sIn + TREAD3;
        const t0 = P3(uC - pu, sIn, y), t1 = P3(uC + pu, sIn, y), t2 = P3(uC + pu, sOut, y), t3 = P3(uC - pu, sOut, y);
        stepTopB.quad(t3, t2, t1, t0, [[0, 0], [1, 0], [1, 1], [0, 1]]);
        const yPrev = GY + RISE * s / STEPS;
        const r0 = P3(uC - pu, sIn, yPrev), r1 = P3(uC + pu, sIn, yPrev);
        stepRiseB.quad(r1, r0, t0, t1, [[0, 0], [1, 0], [1, 1], [0, 1]]);
      }
      for (const su of [-pu - 2e-3, pu]) {
        const a0 = P3(uC + su, S_POD, GY), a1 = P3(uC + su, S_POD + STEPS * TREAD3, GY);
        const m = new THREE7.Matrix4().lookAt(a0, a1, new THREE7.Vector3(0, 1, 0));
        m.setPosition(a0.x, GY + RISE + 0.3, a0.z);
        const g = new THREE7.BoxGeometry(0.6, 0.75, a0.distanceTo(a1));
        bandB.add(g, m);
        g.dispose();
      }
    }
    flush(stepTopB, M.stone, gPlaza, "plaza-grandstep-tread");
    flush(stepRiseB, M.stoneDark, gPlaza, "plaza-grandstep-riser");
    const waterB = new GeomBatch(), rimB = new GeomBatch();
    const poolAt = (x, z, w, d) => {
      addBox(rimB, x, GY + RISE + 0.16, z, w + 2.6, 0.42, d + 2.6);
      const pg = new THREE7.PlaneGeometry(w, d);
      pg.rotateX(-Math.PI / 2);
      const m = new THREE7.Matrix4();
      m.setPosition(x, GY + RISE + 0.34, z);
      waterB.add(pg, m);
      pg.dispose();
    };
    poolAt(-40, 196, 30, 13);
    poolAt(40, 196, 30, 13);
    addBox(rimB, 0, GY + RISE + 0.16, 236, 44, 0.42, 44);
    const circ = new THREE7.CircleGeometry(21, 56);
    circ.rotateX(-Math.PI / 2);
    const cm = new THREE7.Matrix4();
    cm.setPosition(0, GY + RISE + 0.34, 236);
    waterB.add(circ, cm);
    circ.dispose();
    flush(rimB, M.stone, gPlaza, "plaza-poolrim");
    const waterMesh = flush(waterB, M.water, gPlaza, "plaza-pools");
    ent("water", waterMesh, gPlaza, "中央水景", "2 片长池（30×13m）+ 圆形泉池（r=21m）");
    const poleB = new GeomBatch(), flagB = new GeomBatch(), baseB = new GeomBatch();
    const flagCols = [12863535, 2911656, 3112799, 13212238];
    const flagGeos = flagCols.map(() => new GeomBatch());
    const addPole = (x, y0, z, h, w, ci) => {
      addBox(poleB, x, y0 + h / 2, z, 0.3, h, 0.3);
      addBox(baseB, x, y0 + 0.22, z, 1.1, 0.44, 1.1);
      const fg = new THREE7.PlaneGeometry(w, w * 0.62);
      const m = new THREE7.Matrix4().makeRotationY(Math.PI / 4);
      m.setPosition(x + w * 0.5, y0 + h - w * 0.34, z);
      flagGeos[ci].add(fg, m);
      fg.dispose();
    };
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 6; i++) addPole(side * (24 + i * 12), GY, 262, 15 - i * 0.4, 3, (i + (side > 0 ? 1 : 0)) % 4);
    }
    for (let i = 0; i < 24; i++) {
      const p = P3(i / 24 + 0.0208, S_POD - 5, GY + RISE);
      addPole(p.x, GY + RISE, p.z, 13, 2.7, i % 4);
    }
    flush(poleB, M.metal, gPlaza, "plaza-flagpoles");
    flush(baseB, M.stone, gPlaza, "plaza-flagbases");
    const flagMeshes = [];
    flagGeos.forEach((b, i) => {
      const mm = flush(b, new THREE7.MeshStandardMaterial({
        color: flagCols[i],
        roughness: 0.9,
        side: THREE7.DoubleSide
      }), gPlaza, "plaza-flags-" + i);
      if (mm) flagMeshes.push(mm);
    });
    ent("flags", flagMeshes[0] || pm, gPlaza, "旗阵", "36 面赛事旗帜 · 南向大道两侧 + 基座台环列");
  }
  {
    const poleIB = IB(new THREE7.CylinderGeometry(0.28, 0.36, 1, 6), M.metalDark);
    SITE.training.forEach((t, ti) => {
      const g = new THREE7.PlaneGeometry(105, 68);
      g.rotateX(-Math.PI / 2);
      const m = new THREE7.Mesh(g, M.pitchGrass);
      m.position.set(t.x, GY + 0.06, t.z);
      gTraining.add(m);
      const lb = new GeomBatch();
      const L = 105, W = 68, lw = 0.14;
      addBox(lb, t.x, GY + 0.075, t.z - W / 2, L, 0.012, lw);
      addBox(lb, t.x, GY + 0.075, t.z + W / 2, L, 0.012, lw);
      addBox(lb, t.x - L / 2, GY + 0.075, t.z, lw, 0.012, W);
      addBox(lb, t.x + L / 2, GY + 0.075, t.z, lw, 0.012, W);
      addBox(lb, t.x, GY + 0.075, t.z, lw, 0.012, W);
      [[-1], [1]].forEach(([sg]) => {
        const bx = t.x + sg * (L / 2 - 16.5);
        addBox(lb, bx, GY + 0.075, t.z, lw, 0.012, 40.32);
        addBox(lb, bx + sg * 16.5, GY + 0.075, t.z, lw, 0.012, 40.32);
        addBox(lb, bx + sg * 8.25, GY + 0.075, t.z - 20.16, 16.5, 0.012, lw);
        addBox(lb, bx + sg * 8.25, GY + 0.075, t.z + 20.16, 16.5, 0.012, lw);
      });
      const ring = new THREE7.RingGeometry(9.05, 9.19, 48, 1);
      ring.rotateX(-Math.PI / 2);
      const rm2 = new THREE7.Matrix4();
      rm2.setPosition(t.x, GY + 0.075, t.z);
      lb.add(ring, rm2);
      ring.dispose();
      flush(lb, M.pitchLine, gTraining, "training-lines-" + ti);
      const fb = new GeomBatch(), postB = new GeomBatch();
      const FX = 62, FZ = 44, FH = 4.5;
      const face = (x, z, w, d) => {
        const pg = new THREE7.PlaneGeometry(w, FH);
        const mm = new THREE7.Matrix4();
        mm.setPosition(x, GY + FH / 2, z);
        fb.add(pg, mm);
        pg.dispose();
      };
      face(t.x, t.z - FZ, FX * 2, 0);
      face(t.x, t.z + FZ, FX * 2, 0);
      [[-FX], [FX]].forEach(([sg]) => {
        const pg = new THREE7.PlaneGeometry(FZ * 2, FH);
        const mm = new THREE7.Matrix4().makeRotationY(Math.PI / 2);
        mm.setPosition(t.x + sg, GY + FH / 2, t.z);
        fb.add(pg, mm);
        pg.dispose();
      });
      for (let x = -FX; x <= FX; x += 8) {
        addBox(postB, t.x + x, GY + FH / 2, t.z - FZ, 0.12, FH, 0.12);
        addBox(postB, t.x + x, GY + FH / 2, t.z + FZ, 0.12, FH, 0.12);
      }
      for (let z = -FZ; z <= FZ; z += 8) {
        addBox(postB, t.x - FX, GY + FH / 2, t.z + z, 0.12, FH, 0.12);
        addBox(postB, t.x + FX, GY + FH / 2, t.z + z, 0.12, FH, 0.12);
      }
      flush(fb, M.fence, gTraining, "training-fence-" + ti);
      flush(postB, M.metalDark, gTraining, "training-fenceposts-" + ti);
      const tb = new GeomBatch(), seatB = new GeomBatch();
      for (let r = 0; r < 4; r++) {
        const y = GY + 0.45 * (r + 1);
        addBox(tb, t.x - FX - 6 - r * 1.2, GY + 0.45 * (r + 1) / 2, t.z, 1.2, y - GY, 46);
        addBox(seatB, t.x - FX - 6 - r * 1.2, y + 0.06, t.z, 1.2, 0.12, 46);
      }
      flush(tb, M.concrete, gTraining, "training-stand-" + ti);
      flush(seatB, M.band, gTraining, "training-standseats-" + ti);
      const lampB = new GeomBatch(), headB = new GeomBatch();
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
        const px = t.x + sx * (FX + 10), pz = t.z + sz * (FZ + 10);
        addBox(lampB, px, GY + 13.5, pz, 0.5, 27, 0.5);
        addBox(headB, px, GY + 27.4, pz, 4.2, 1, 0.6, Math.atan2(t.x - px, t.z - pz));
      });
      flush(lampB, M.metalDark, gTraining, "training-lampmasts-" + ti);
      flush(headB, M.glowWarm, gTraining, "training-lampheads-" + ti);
    });
    ent(
      "training",
      gTraining.children[0],
      gTraining,
      "训练场",
      "2 × 105×68m 天然草 · 围网 / 简易看台 / 4 灯柱每块"
    );
    const cb = new GeomBatch();
    addBox(cb, -338, GY + 7, 0, 26, 14, 112);
    addBox(cb, -338, GY + 14.4, 0, 27, 0.8, 113);
    addBox(cb, -316, GY + 0.3, 0, 8, 0.6, 90);
    flush(cb, M.concrete, gTraining, "training-center");
    const gb = new GeomBatch();
    for (let z = -50; z <= 50; z += 5) addBox(gb, -325, GY + 3.4, z, 0.2, 6.4, 4.2);
    flush(gb, M.glass, gTraining, "training-center-glass");
  }
  {
    const cx = SITE.transit.x, cz = SITE.transit.z;
    const bb = new GeomBatch();
    addBox(bb, cx + 4, GY + 0.03, cz, 56, 0.08, 108);
    flush(bb, M.road, gTransit, "transit-roadway");
    const platB = new GeomBatch(), edgeB = new GeomBatch();
    [[-16], [18]].forEach(([dz]) => {
      addBox(platB, cx, GY + 0.13, cz + dz, 100, 0.26, 6);
      addBox(edgeB, cx, GY + 0.27, cz + dz - 2.85, 100, 0.04, 0.3);
    });
    flush(platB, M.concrete, gTransit, "transit-platforms");
    flush(edgeB, M.line, gTransit, "transit-platformedges");
    const canB = new GeomBatch(), postB = new GeomBatch(), glowB = new GeomBatch();
    [[-16], [18]].forEach(([dz]) => {
      for (let i = 0; i < 8; i++) {
        const x = cx - 48 + i * 13.7;
        const m = new THREE7.Matrix4().makeRotationZ(-0.09);
        m.setPosition(x, GY + 5.5, cz + dz);
        const g = new THREE7.BoxGeometry(13.7, 0.35, 13.5);
        canB.add(g, m);
        g.dispose();
        addBox(postB, x + 5.6, GY + 2.75, cz + dz, 0.34, 5.5, 0.34);
        addBox(glowB, x, GY + 5.1, cz + dz - 3, 12.4, 0.1, 0.5);
      }
    });
    flush(canB, M.canopy, gTransit, "transit-canopy");
    flush(postB, M.metal, gTransit, "transit-canopyposts");
    flush(glowB, M.glowWarm, gTransit, "transit-canopylights");
    const sb = new GeomBatch(), scrB = new GeomBatch();
    for (let i = 0; i < 6; i++) {
      const x = cx - 42 + i * 17;
      addBox(sb, x, GY + 2.2, cz - 4, 0.18, 4.4, 0.18);
      addBox(sb, x, GY + 4.2, cz - 4, 2.6, 1.5, 0.16);
    }
    addBox(sb, cx, GY + 3.6, cz + 40, 16, 1.1, 0.5);
    addBox(scrB, cx, GY + 4.6, cz + 40, 15, 2.6, 0.2);
    addBox(scrB, cx - 30, GY + 3.6, cz - 22, 9, 4.2, 0.24);
    flush(sb, M.metalDark, gTransit, "transit-signage");
    flush(scrB, M.screen, gTransit, "transit-screens");
    const mb = new GeomBatch(), grB = new GeomBatch();
    addBox(mb, cx + 42, GY + 3.6, cz, 20, 7.2, 26);
    addBox(mb, cx + 42, GY + 7.4, cz, 22, 0.6, 28);
    addBox(grB, cx + 32.2, GY + 3.4, cz, 0.2, 6.2, 16);
    flush(mb, M.massing, gTransit, "transit-metrobox");
    flush(grB, M.glass, gTransit, "transit-metroglass");
    const redB = new GeomBatch();
    [[-6, -8], [6, 8]].forEach(([dx, dz]) => addBox(redB, cx + 30, GY + 2.4, cz + dz, 1.6, 4.8, 1.6));
    flush(redB, M.glowRed, gTransit, "transit-metromarkers");
    const brB = new GeomBatch(), railB = new GeomBatch();
    addBox(brB, cx - 52, GY + 7.2, cz, 44, 0.7, 5.2);
    addBox(railB, cx - 52, GY + 8.4, cz - 2.5, 44, 1.6, 0.14);
    addBox(railB, cx - 52, GY + 8.4, cz + 2.5, 44, 1.6, 0.14);
    [[-30], [30]].forEach(([dx]) => addBox(brB, cx - 52 + dx, GY + 3.6, cz, 2.2, 7.2, 2.2));
    flush(brB, M.concrete, gTransit, "transit-footbridge");
    flush(railB, M.metal, gTransit, "transit-footbridge-rail");
    ent(
      "transit",
      gTransit.children[0],
      gTransit,
      "公交 / 地铁接驳",
      "2 条站台（100m 雨棚）+ 地铁站厅 + 人行天桥 + 导向屏"
    );
  }
  {
    const { x: cx, z: cz } = SITE.parking;
    const W = 112, D = 56, LV = 6, FH = 3.3;
    const slabB = new GeomBatch(), colB = new GeomBatch(), railB = new GeomBatch(), screenB = new GeomBatch(), rampB = new GeomBatch(), eqB = new GeomBatch(), stairB = new GeomBatch();
    const carIBs = [
      IB(new THREE7.BoxGeometry(4.4, 1.35, 1.85), M.carA),
      IB(new THREE7.BoxGeometry(4.4, 1.35, 1.85), M.carB),
      IB(new THREE7.BoxGeometry(4.4, 1.35, 1.85), M.carC),
      IB(new THREE7.BoxGeometry(4.4, 1.35, 1.85), M.carD)
    ];
    const R = rnd2(6612);
    for (let lv = 0; lv < LV; lv++) {
      const y = GY + lv * FH;
      addBox(slabB, cx, y + 0.15, cz, W, 0.3, D);
      for (let ix = -3; ix <= 3; ix++) for (let iz = -1; iz <= 1; iz++) {
        addBox(colB, cx + ix * 16, y + FH / 2, cz + iz * 24, 0.85, FH, 0.85);
      }
      for (let ix = -3; ix < 3; ix++) {
        const px = cx + ix * 16 + 8;
        addBox(railB, px, y + FH - 0.35, cz - D / 2, 16, 0.7, 0.3);
        addBox(railB, px, y + FH - 0.35, cz + D / 2, 16, 0.7, 0.3);
        addBox(railB, px, y + 0.28, cz - D / 2, 16, 0.5, 0.34);
        addBox(railB, px, y + 0.28, cz + D / 2, 16, 0.5, 0.34);
      }
      for (let iz = -1; iz < 1; iz++) {
        const pz = cz + iz * 24 + 12;
        addBox(railB, cx - W / 2, y + FH - 0.35, pz, 0.3, 0.7, 24);
        addBox(railB, cx + W / 2, y + FH - 0.35, pz, 0.3, 0.7, 24);
      }
      for (let ix = -9; ix <= 9; ix++) {
        addBox(screenB, cx + ix * 6, y + FH / 2, cz - D / 2 - 0.12, 0.22, FH - 0.4, 0.16);
      }
      for (let ix = -3; ix < 3; ix++) for (const sg of [-1, 1]) {
        for (let k = 0; k < 4; k++) {
          if (R() > 0.62) continue;
          const px = cx + ix * 16 + 2.2 + k * 3.6;
          const pz = cz + sg * (D / 2 - 3.2);
          carIBs[Math.floor(R() * 4)].push(matOf(px, y + 0.98, pz, 0, 1));
        }
      }
    }
    for (let lv = 0; lv < LV; lv++) {
      const y = GY + lv * FH;
      for (let k = 0; k < 18; k++) {
        const z0 = cz - D / 2 + k * (D / 18), z1 = z0 + D / 18;
        const yy = y + k / 18 * FH;
        const m = new THREE7.Matrix4().makeRotationX(Math.atan2(FH, D));
        m.setPosition(cx - W / 2 - 6.5, yy + 0.1, (z0 + z1) / 2);
        const g = new THREE7.BoxGeometry(9, 0.4, D / 18 + 0.6);
        rampB.add(g, m);
        g.dispose();
      }
      addBox(railB, cx - W / 2 - 11, y + 0.75, cz, 0.2, 1.5, D);
    }
    addBox(stairB, cx + W / 2 - 12, GY + LV * FH / 2, cz + D / 2 - 8, 14, LV * FH, 12);
    for (let i = 0; i < 14; i++) {
      const px = cx - 44 + i % 7 * 15, pz = cz - 14 + Math.floor(i / 7) * 24;
      addBox(eqB, px, GY + LV * FH + 1.1, pz, 7.5, 1.6, 4.5);
    }
    addBox(eqB, cx + 34, GY + LV * FH + 3.2, cz - 16, 6, 6, 6);
    for (let i = 0; i < 18; i++) {
      const px = cx - 46 + i % 9 * 11.5, pz = cz + 12 + Math.floor(i / 9) * 9;
      const m = new THREE7.Matrix4().makeRotationX(-0.32);
      m.setPosition(px, GY + LV * FH + 1.2, pz);
      const g = new THREE7.BoxGeometry(9, 0.12, 4.5);
      eqB.add(g, m);
      g.dispose();
    }
    flush(slabB, M.concrete, gParking, "parking-slabs");
    flush(colB, M.concreteDark, gParking, "parking-columns");
    flush(railB, M.concrete, gParking, "parking-parapets");
    flush(screenB, M.metal, gParking, "parking-louvers");
    flush(rampB, M.concrete, gParking, "parking-ramp");
    flush(stairB, M.concrete, gParking, "parking-core");
    flush(eqB, M.metalDark, gParking, "parking-rooftop");
    carIBs.forEach((ib, i) => ib.flush(gParking, "parking-cars-" + i));
    ent(
      "parking",
      gParking.children[0],
      gParking,
      "停车楼",
      "6 层 · 立面开洞 + 外挂坡道 · 约 900 车位（示意）"
    );
  }
  {
    const R = rnd2(2288);
    const wallB = new GeomBatch(), glassB = new GeomBatch(), canopyB = new GeomBatch(), tableB = new GeomBatch(), chairB = new GeomBatch(), signB = new GeomBatch();
    const N = 5;
    for (let i = 0; i < N; i++) {
      const px = -130 + i * 52 + (R() - 0.5) * 6;
      const pz = 300 + (R() - 0.5) * 14;
      const w = 40 + R() * 6, d = 26 + R() * 6;
      const h = [9.5, 13, 7, 13, 9.5][i];
      addBox(wallB, px, GY + h / 2, pz, w, h, d);
      addBox(glassB, px, GY + 2.4, pz - d / 2 - 0.05, w - 4, 4.4, 0.3);
      if (h > 8) addBox(glassB, px, GY + 6.6, pz - d / 2 - 0.05, w - 6, 3.2, 0.3);
      const m = new THREE7.Matrix4().makeRotationX(-0.05);
      m.setPosition(px, GY + 4.9, pz - d / 2 - 3.2);
      const cg = new THREE7.BoxGeometry(w - 2, 0.22, 6.4);
      canopyB.add(cg, m);
      cg.dispose();
      for (let k = -2; k <= 2; k++) addBox(canopyB, px + k * (w / 6), GY + 4.6, pz - d / 2 - 1.2, 0.18, 0.4, 1);
      addBox(wallB, px, GY + h + 0.5, pz, w - 1.2, 1, d - 1.2);
      addBox(signB, px, GY + h + 1.3, pz - d / 2, w * 0.5, 1.2, 0.3);
      for (let k = 0; k < 6; k++) {
        const tx = px - (w - 10) / 2 + k * (w - 10) / 5;
        const tz = pz - d / 2 - 5.6;
        addBox(tableB, tx, GY + 0.72, tz, 1.4, 0.1, 1.4);
        addBox(tableB, tx, GY + 0.36, tz, 0.16, 0.72, 0.16);
        for (let c = -1; c <= 1; c += 2) addBox(chairB, tx + c * 1.15, GY + 0.42, tz, 0.5, 0.84, 0.5);
      }
      for (let k = 0; k < 3; k++) {
        const tx = px - (w - 14) / 2 + k * (w - 14) / 2;
        addBox(canopyB, tx, GY + 2.6, pz - d / 2 - 5.6, 0.12, 2.6, 0.12);
        addBox(canopyB, tx, GY + 4, pz - d / 2 - 5.6, 5.4, 0.12, 5.4);
      }
    }
    flush(wallB, M.concrete, gProps, "retail-blocks");
    flush(glassB, M.glass, gProps, "retail-glass");
    flush(canopyB, M.canopy, gProps, "retail-canopies");
    flush(tableB, M.band, gProps, "retail-tables");
    flush(chairB, M.metalDark, gProps, "retail-chairs");
    flush(signB, M.glowWarm, gProps, "retail-signs");
    const wb = new GeomBatch();
    for (let i = 0; i < 4; i++) {
      const px = -300 + i % 2 * 46, pz = 250 + Math.floor(i / 2) * 44;
      addBox(wb, px, GY + 6, pz, 40, 12, 34);
      addBox(wb, px, GY + 12.2, pz, 41, 0.8, 35);
    }
    flush(wb, M.concrete, gProps, "west-blocks");
    ent(
      "retail",
      gProps.children[gProps.children.length - 2],
      gProps,
      "商业餐饮带",
      "5 栋 2–3 层街区 · 雨棚 + 外摆 · 首层餐饮"
    );
  }
  {
    const R = rnd2(20261018);
    const massB = new GeomBatch();
    const roofIB = IB(new THREE7.BoxGeometry(1, 1, 1), M.massingRoof);
    const eqIB = IB(new THREE7.BoxGeometry(1, 1, 1), M.massing);
    const edgePts = [];
    let count = 0;
    const reserved = /* @__PURE__ */ new Set();
    const key = (i, j) => i + "," + j;
    const blockAt = (x, z) => [Math.floor(x / BLK), Math.floor(z / BLK)];
    [SITE.training[0], SITE.training[1]].forEach((p) => {
      const [ci, cj] = blockAt(p.x, p.z);
      for (let i = -2; i <= 2; i++) for (let j = -3; j <= 3; j++) reserved.add(key(ci + i, cj + j));
    });
    {
      const [ci, cj] = blockAt(SITE.transit.x, SITE.transit.z);
      for (let i = -4; i <= 3; i++) for (let j = -2; j <= 2; j++) reserved.add(key(ci + i, cj + j));
    }
    {
      const [ci, cj] = blockAt(SITE.parking.x, SITE.parking.z);
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) reserved.add(key(ci + i, cj + j));
    }
    for (let i = -4; i <= 3; i++) for (let j = 6; j <= 9; j++) reserved.add(key(i, j));
    const quad = (P0, P1, P22, P32, col) => {
      const g = new THREE7.BufferGeometry();
      const ps = [...P0, ...P1, ...P22, ...P32];
      g.setAttribute("position", new THREE7.Float32BufferAttribute(ps, 3));
      const n = new THREE7.Vector3(...P1).sub(new THREE7.Vector3(...P0)).cross(new THREE7.Vector3(...P22).sub(new THREE7.Vector3(...P0))).normalize();
      g.setAttribute("normal", new THREE7.Float32BufferAttribute([...Array(4)].flatMap(() => [n.x, n.y, n.z]), 3));
      g.setAttribute("uv", new THREE7.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      massB.add(g, null);
      g.dispose();
    };
    const tower = (cx, cz, w, d, h, baseH) => {
      const y0 = GY + baseH;
      const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
      const y1 = y0 + h;
      quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
      quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
      quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
      quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
      const roofM = new THREE7.Matrix4().makeScale(w, 0.6, d);
      roofM.setPosition(cx, y1 - 0.3, cz);
      roofIB.push(roofM);
      const E = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
      for (let k = 0; k < 4; k++) {
        const a = E[k], b = E[(k + 1) % 4];
        edgePts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
        edgePts.push(a[0], y1, a[2], b[0], y1, b[2]);
        edgePts.push(a[0], a[1], a[2], a[0], y1, a[2]);
      }
      const n = 1 + Math.floor(R() * 2);
      for (let k = 0; k < n; k++) {
        const ew = w * (0.18 + R() * 0.2), ed = d * (0.18 + R() * 0.2), eh = 2 + R() * 4;
        eqIB.push(new THREE7.Matrix4().makeScale(ew, eh, ed).setPosition(
          cx + (R() - 0.5) * (w - ew) * 0.7,
          y1 + eh / 2,
          cz + (R() - 0.5) * (d - ed) * 0.7
        ));
      }
      if (h > 34 && R() > 0.45) {
        const tw = w * 0.62, td = d * 0.62, th = 6 + R() * 12;
        const ty1 = y1 + th;
        const X0 = cx - tw / 2, X1 = cx + tw / 2, Z0 = cz - td / 2, Z1 = cz + td / 2;
        quad([X0, y1, Z0], [X0, y1, Z1], [X0, ty1, Z1], [X0, ty1, Z0]);
        quad([X1, y1, Z1], [X1, y1, Z0], [X1, ty1, Z0], [X1, ty1, Z1]);
        quad([X1, y1, Z0], [X0, y1, Z0], [X0, ty1, Z0], [X1, ty1, Z0]);
        quad([X0, y1, Z1], [X1, y1, Z1], [X1, ty1, Z1], [X0, ty1, Z1]);
      }
      count++;
    };
    for (let i = -B_CITY; i < B_CITY; i++) for (let j = -B_CITY; j < B_CITY; j++) {
      const cx = (i + 0.5) * BLK, cz = (j + 0.5) * BLK;
      const r = Math.hypot(cx, cz);
      if (r < SITE.cityR0 || r > SITE.cityR1) continue;
      if (reserved.has(key(i, j))) continue;
      if (isOnAxis(cx, cz)) continue;
      if (rawS(cx, cz, 0) < 205) continue;
      const hgt = r < 330 ? 14 + R() * 20 : r < 430 ? 18 + R() * 34 : 20 + R() * 58;
      const w = 16 + R() * 12, d = 16 + R() * 12;
      if (R() < 0.08) {
        continue;
      }
      const bw = w + 3 + R() * 3, bd = d + 3 + R() * 3;
      tower(cx, cz, bw, bd, 3.6 + R() * 3.2, 0);
      tower(cx, cz, w, d, hgt, 6.5);
    }
    const mg = massB.build();
    if (mg) {
      const massMesh = new THREE7.Mesh(mg, M.massing);
      massMesh.name = "city-massing";
      massMesh.renderOrder = 2;
      gCity.add(massMesh);
      ent(
        "city",
        massMesh,
        gCity,
        "周边城市肌理",
        `${count} 座半透明白体块 · 沿 40m 街廓成街区 · 基座 + 退台 + 屋顶设备`
      );
    }
    roofIB.flush(gCity, "city-roofs");
    eqIB.flush(gCity, "city-rooftopequip");
    const eg = new THREE7.BufferGeometry();
    eg.setAttribute("position", new THREE7.Float32BufferAttribute(edgePts, 3));
    const em = new THREE7.LineSegments(eg, M.massingEdge);
    em.name = "city-edges";
    gCity.add(em);
  }
  let treeCount = 0, benchCount = 0, lampCount = 0;
  {
    const R = rnd2(31415);
    const trunkGeo = new THREE7.CylinderGeometry(0.16, 0.3, 1, 5);
    trunkGeo.translate(0, 0.5, 0);
    const crownGeo = new THREE7.IcosahedronGeometry(1, 0);
    const trunkIB = IB(trunkGeo, M.trunk);
    const leafA = IB(crownGeo, M.leaf);
    const leafB = IB(crownGeo, M.leaf2);
    const treePos = [];
    const addTree = (x, z, h, cr) => {
      const y0 = GY + 0.02;
      trunkIB.push(new THREE7.Matrix4().makeScale(1, h * 0.62, 1).setPosition(x, y0, z));
      const cr2 = cr * (0.86 + R() * 0.28);
      const m = new THREE7.Matrix4().makeScale(cr, cr2, cr).setPosition(x, y0 + h * 0.66 + cr2 * 0.4, z);
      (R() > 0.45 ? leafA : leafB).push(m);
      treePos.push([x, z]);
    };
    for (let k = 0; k < 4; k++) {
      const u = k / 4;
      for (const side of [-1, 1]) {
        for (let s = S_POD + 25; s < R_PLZ + 200; s += 12) {
          const su = 26 / (2 * Math.PI * (HALF_X + s));
          const p = P3(u + side * su, s, 0);
          if (Math.abs(p.x) < 30 && Math.abs(p.z) < 30) continue;
          addTree(p.x, p.z, 11 + R() * 3, 3.4 + R() * 1.1);
        }
      }
    }
    for (let i = 0; i < 44; i++) {
      const p = P3(i / 44, R_PLZ + 12, 0);
      if (isOnAxis(p.x, p.z)) continue;
      addTree(p.x, p.z, 12 + R() * 3, 3.8);
    }
    for (let i = -B_CITY; i < B_CITY; i++) for (let j = -B_CITY; j < B_CITY; j++) {
      const cx = (i + 0.5) * BLK, cz = (j + 0.5) * BLK;
      const r = Math.hypot(cx, cz);
      if (r < SITE.cityR0 - 40 || r > SITE.cityR1 + 40) continue;
      if (isOnAxis(cx, cz)) continue;
      if (rawS(cx, cz, 0) < 250) continue;
      const corners = [[-17, -17], [17, -17], [-17, 17], [17, 17]];
      for (const [dx, dz] of corners) {
        if (R() > 0.55) continue;
        const x = cx + dx, z = cz + dz;
        if (isOnAxis(x, z)) continue;
        addTree(x, z, 10 + R() * 4, 3.1 + R() * 1);
      }
    }
    for (let i = 0; i < TREE_TRIES && treePos.length < TREE_CAP; i++) {
      const a = R() * TAU2, rr = 330 + R() * 220;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (isOnAxis(x, z) || rawS(x, z, 0) < 260) continue;
      if (Math.hypot(x, z) < SITE.cityR0) continue;
      if (R() > 0.5) continue;
      addTree(x, z, 9 + R() * 6, 2.9 + R() * 1.6);
    }
    SITE.training.forEach((t) => {
      for (let i = 0; i < 16; i++) {
        const x = t.x + (R() - 0.5) * 150, z = t.z + (R() - 0.5) * 130;
        if (Math.abs(x - t.x) < 66 && Math.abs(z - t.z) < 48) continue;
        if (Math.abs(x) < 60) continue;
        addTree(x, z, 10 + R() * 4, 3.3);
      }
    });
    const trunkMesh = trunkIB.flush(gLandscape, "landscape-trunks");
    const leafMeshA = leafA.flush(gLandscape, "landscape-canopy-a");
    leafB.flush(gLandscape, "landscape-canopy-b");
    treeCount = treePos.length;
    const hedgeB = new GeomBatch();
    const HEDGE_N = Math.floor(96 / HEDGE_DIV);
    for (let i = 0; i < HEDGE_N; i++) {
      const u = i / HEDGE_N;
      const p = P3(u, R_PLZ + 4, 0);
      if (isOnAxis(p.x, p.z)) continue;
      const a = angOf(u);
      addBox(hedgeB, p.x, GY + 0.55, p.z, 10, 1.1, 1.3, -a + Math.PI / 2);
    }
    for (let k = 0; k < 4; k++) {
      const u = k / 4;
      for (const side of [-1, 1]) {
        for (let s = S_POD + 6; s < R_PLZ + 160; s += 10) {
          const su = 18 / (2 * Math.PI * (HALF_X + s));
          const p = P3(u + side * su, s, 0);
          if (Math.abs(p.x) < 26 && Math.abs(p.z) < 26) continue;
          addBox(hedgeB, p.x, GY + 0.4, p.z, 9, 0.8, 1.1, -angOf(u + side * su) + Math.PI / 2);
        }
      }
    }
    const hm = flush(hedgeB, M.hedge, gLandscape, "landscape-hedges");
    const hillGeo = new THREE7.SphereGeometry(1, 16, 10, 0, TAU2, 0, Math.PI / 2);
    const hills = [];
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU2 + 0.26;
      const rr = 340 + i % 2 * 30;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (isOnAxis(x, z)) continue;
      const m = new THREE7.Matrix4().makeScale(46 + i % 3 * 12, 4.5 + i % 2 * 2.2, 34 + i % 2 * 10);
      m.setPosition(x, GY, z);
      hills.push(m);
    }
    const hillIB = IB(hillGeo, M.hill, { recv: true });
    hills.forEach((m) => hillIB.push(m));
    hillIB.flush(gLandscape, "landscape-hills");
    const benchGeo = new THREE7.BoxGeometry(2.4, 0.16, 0.62);
    const benchLegGeo = new THREE7.BoxGeometry(0.14, 0.42, 0.56);
    const bIB = IB(benchGeo, M.band);
    const blIB = IB(benchLegGeo, M.metalDark);
    let benchN = 0;
    for (let i = 0; i < 64; i++) {
      const u = i / 64;
      const p = P3(u, S_POD - 8, GY + RISE);
      const a = angOf(u);
      const ry = -a + Math.PI / 2;
      bIB.push(matOf(p.x, GY + RISE + 0.5, p.z, ry, 1));
      blIB.push(matOf(p.x + Math.cos(a) * 0.2, GY + RISE + 0.21, p.z + Math.sin(a) * 0.2, ry, 1));
      blIB.push(matOf(p.x - Math.cos(a) * 0.2, GY + RISE + 0.21, p.z - Math.sin(a) * 0.2, ry, 1));
      benchN++;
    }
    for (let k = 0; k < 4; k++) {
      const u = k / 4;
      for (let s = S_POD + 30; s < R_PLZ + 120; s += 22) {
        for (const side of [-1, 1]) {
          const su = 20 / (2 * Math.PI * (HALF_X + s));
          const p = P3(u + side * su, s, 0);
          if (Math.abs(p.x) < 26 && Math.abs(p.z) < 26) continue;
          bIB.push(matOf(p.x, GY + 0.5, p.z, -angOf(u), 1));
          blIB.push(matOf(p.x, GY + 0.2, p.z, -angOf(u), 1));
          benchN++;
        }
      }
    }
    bIB.flush(gProps, "props-benches");
    blIB.flush(gProps, "props-benchlegs");
    benchCount = benchN;
    const lampPoleGeo = new THREE7.CylinderGeometry(0.13, 0.19, 12, 6);
    lampPoleGeo.translate(0, 6, 0);
    const lampHeadGeo = new THREE7.BoxGeometry(2.2, 0.22, 0.8);
    const headIB = IB(lampHeadGeo, M.glowWarm);
    const poleIB = IB(lampPoleGeo, M.metalDark);
    let lampN = 0;
    for (let i = 0; i < 36; i++) {
      const p = P3(i / 36 + 7e-3, R_PLZ + 8, 0);
      if (isOnAxis(p.x, p.z)) continue;
      poleIB.push(matOf(p.x, GY, p.z, 0, 1));
      headIB.push(matOf(p.x, GY + 12.05, p.z, -angOf(i / 36) + Math.PI / 2, 1));
      lampN++;
    }
    for (let k = 0; k < 4; k++) {
      const u = k / 4;
      for (let s = S_POD + 20; s < R_PLZ + 180; s += 34) {
        for (const side of [-1, 1]) {
          const su = 22 / (2 * Math.PI * (HALF_X + s));
          const p = P3(u + side * su, s, 0);
          if (Math.abs(p.x) < 26 && Math.abs(p.z) < 26) continue;
          poleIB.push(matOf(p.x, GY, p.z, 0, 1));
          headIB.push(matOf(p.x, GY + 12.05, p.z, -angOf(u + side * su), 1));
          lampN++;
        }
      }
    }
    SITE.training.forEach((t) => {
      for (let i = 0; i < 6; i++) {
        const x = t.x + (i % 3 - 1) * 64, z = t.z + (i < 3 ? -60 : 60);
        poleIB.push(matOf(x, GY, z, 0, 0.66));
        headIB.push(matOf(x, GY + 8.05, z, 0, 0.8));
        lampN++;
      }
    });
    poleIB.flush(gProps, "props-lamppoles");
    headIB.flush(gProps, "props-lampheads");
    lampCount = lampN;
    const update = (dt, t) => {
      const night = window.__app && window.__app.preset ? window.__app.preset.night : 1;
      M.glowWarm.color.setRGB(1, lerp(0.42, 0.85, night), lerp(0.24, 0.62, night));
      M.glowCool.color.setRGB(lerp(0.78, 0.75, night), lerp(0.9, 0.91, night), 0.96);
      M.massing.opacity = lerp(0.24, 0.17, night);
      M.massingRoof.opacity = lerp(0.16, 0.11, night);
    };
    ent(
      "trees",
      trunkMesh,
      gLandscape,
      "乔木景观",
      `${treeCount} 棵乔木（树干 + 树冠两级实例化）· 成排列植`
    );
    if (hm) ent("hedges", hm, gLandscape, "绿篱", "广场外缘 + 大道两侧修剪绿篱");
    ent("benches", gProps.children.find((c) => c.name === "props-benches"), gProps, "休憩座椅", `${benchCount} 组`);
    ent(
      "lamps",
      gProps.children.find((c) => c.name === "props-lampheads"),
      gProps,
      "路灯",
      `${lampCount} 盏灯杆（夜间自发光灯头）`
    );
    return { root, groups, update, ents };
  }
}

// src/lib/postfx.js
init_core();
import * as THREE8 from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
var ComposeShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    exposure: { value: 1 },
    vignette: { value: 1 },
    grain: { value: 0.016 },
    ca: { value: 7e-4 },
    flash: { value: 0 },
    flashColor: { value: new THREE8.Color("#ffffff") },
    res: { value: new THREE8.Vector2(1, 1) },
    sat: { value: 1.05 },
    contrast: { value: 1.025 },
    lift: { value: 0 }
  },
  vertexShader: (
    /* glsl */
    `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
  ),
  fragmentShader: (
    /* glsl */
    `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float time, exposure, vignette, grain, ca, flash, sat, contrast, lift;
    uniform vec3 flashColor;
    uniform vec2 res;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec2 d = uv - 0.5;
      float r2 = dot(d, d);
      /* 色差：只在边缘轻微分离 */
      vec2 off = d * ca * (0.35 + r2 * 2.2);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;
      col *= exposure;
      col = (col - 0.5) * contrast + 0.5 + lift;
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(lum), col, sat);
      /* 暗角 */
      float v = smoothstep(1.26, 0.30, length(d) * 1.02);
      col *= mix(1.0, v, vignette * 0.55);
      /* 胶片颗粒：暗部更明显，亮部不脏 */
      float g = hash(vUv * res + vec2(time * 61.0, time * 37.0)) - 0.5;
      col += g * grain * (1.0 - smoothstep(0.55, 1.0, lum));
      /* 闪白 */
      col = mix(col, flashColor, clamp(flash, 0.0, 1.0));
      gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
    }`
  )
};
var OutlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    tMask: { value: null },
    res: { value: new THREE8.Vector2(1, 1) },
    color: { value: new THREE8.Color("#7fe2ef") },
    strength: { value: 0 }
  },
  vertexShader: (
    /* glsl */
    `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`
  ),
  fragmentShader: (
    /* glsl */
    `
    precision highp float;
    uniform sampler2D tDiffuse, tMask;
    uniform vec2 res;
    uniform vec3 color;
    uniform float strength;
    varying vec2 vUv;
    float m(vec2 uv){ return step(0.02, texture2D(tMask, clamp(uv, 0.002, 0.998)).a); }
    void main(){
      vec3 src = texture2D(tDiffuse, vUv).rgb;
      if (strength <= 0.001) { gl_FragColor = vec4(src, 1.0); return; }
      vec2 px = 1.6 / res;
      float c = m(vUv);
      float n = 0.0;
      n += m(vUv + vec2(px.x, 0.0)); n += m(vUv - vec2(px.x, 0.0));
      n += m(vUv + vec2(0.0, px.y)); n += m(vUv - vec2(0.0, px.y));
      n += m(vUv + px); n += m(vUv - px);
      n += m(vUv + vec2(px.x, -px.y)); n += m(vUv + vec2(-px.x, px.y));
      /* 轮廓：边界内外都描一圈，外侧略淡 */
      float edge = clamp(abs(n - c * 8.0) * 0.5, 0.0, 1.0);
      float inside = c * step(0.5, n) * 0.30;
      vec3 outc = mix(src, color, clamp((edge * 0.5 + inside) * strength, 0.0, 0.70));
      gl_FragColor = vec4(outc, 1.0);
    }`
  )
};
function buildPostFX(stage2) {
  const r = stage2.renderer;
  const w = window.innerWidth, h = window.innerHeight;
  const composer = new EffectComposer(r);
  composer.setPixelRatio(stage2.pr);
  composer.setSize(w, h);
  const maskScale = 0.5;
  const rtMask = new THREE8.WebGLRenderTarget(
    Math.max(4, Math.round(w * stage2.pr * maskScale)),
    Math.max(4, Math.round(h * stage2.pr * maskScale)),
    { minFilter: THREE8.LinearFilter, magFilter: THREE8.LinearFilter }
  );
  rtMask.texture.generateMipmaps = false;
  const maskScene = new THREE8.Scene();
  const maskMat = new THREE8.MeshBasicMaterial({
    color: 16777215,
    toneMapped: false,
    side: THREE8.DoubleSide
  });
  const maskCam = new THREE8.PerspectiveCamera();
  composer.addPass(new RenderPass(stage2.scene, stage2.camera));
  const outlinePass = new ShaderPass(OutlineShader);
  outlinePass.uniforms.tMask.value = rtMask.texture;
  outlinePass.renderToScreen = false;
  composer.addPass(outlinePass);
  const bloom = new UnrealBloomPass(new THREE8.Vector2(w * 0.5, h * 0.5), 0.62, 0.66, 0.86);
  composer.addPass(bloom);
  const compose = new ShaderPass(ComposeShader);
  compose.renderToScreen = true;
  compose.uniforms.res.value.set(w, h);
  composer.addPass(compose);
  const outline = { obj: null, strength: 0, target: 0 };
  const api2 = {
    composer,
    bloom,
    compose,
    outlinePass,
    draftMode: false,
    draftCam: null,
    bloomEnabled: true,
    perfMode: false,
    outlinePending: false,
    exposureBoost: 1,
    quality: "high",
    outline: null,
    _flash: 0,
    /* 选中构件描边（传 null 取消） */
    setOutline(obj) {
      outline.obj = obj || null;
      api2.outline = obj || null;
      outline.target = obj ? 1 : 0;
      api2.outlinePending = !!obj;
      if (!obj) {
        outline.strength = 0;
        outlinePass.uniforms.strength.value = 0;
      }
    },
    /* 省电模式：关泛光整条 mip 链 + 关颗粒/色差（每帧全屏逐像素计算，核显上是真金白银）。
       关掉泛光后画面整体偏暗，顺手补一点曝光，让「轻量」不等于「发灰」。 */
    setPerfMode(on) {
      api2.perfMode = !!on;
      api2.bloomEnabled = !api2.perfMode;
      bloom.enabled = !api2.perfMode;
      compose.uniforms.grain.value = api2.perfMode ? 0 : 0.016;
      compose.uniforms.ca.value = api2.perfMode ? 0 : 7e-4;
      api2.exposureBoost = api2.perfMode ? 1.14 : 1;
      if (api2.perfMode) api2.setQuality(stage2.quality || "high");
      else api2.resize();
      return api2;
    },
    /* 统一的尺寸同步：所有 renderTarget / uniform 都在这里对齐，避免手写重复 */
    resize() {
      const W = window.innerWidth, H = window.innerHeight;
      composer.setPixelRatio(stage2.pr);
      composer.setSize(W, H);
      bloom.resolution.set(W * 0.5, H * 0.5);
      compose.uniforms.res.value.set(W, H);
      outlinePass.uniforms.res.value.set(W, H);
      rtMask.setSize(
        Math.max(4, Math.round(W * stage2.pr * maskScale)),
        Math.max(4, Math.round(H * stage2.pr * maskScale))
      );
    },
    setQuality(level) {
      const q = level || stage2.quality || "high";
      api2.quality = q;
      const low = q === "low";
      if (!api2.perfMode || low) {
        api2.bloomEnabled = !low;
        bloom.enabled = !low;
      }
      const grainOn = !api2.perfMode && !low;
      compose.uniforms.grain.value = grainOn ? q === "mid" ? 0.011 : 0.016 : 0;
      compose.uniforms.ca.value = grainOn ? q === "mid" ? 5e-4 : 7e-4 : 0;
      stage2.onResize && stage2.onResize();
      return api2;
    },
    setDraft(on) {
      api2.draftMode = !!on;
      const sc = stage2.scene;
      if (on) {
        if (sc.background == null) sc.background = new THREE8.Color("#0d141c");
        if (sc.fog) {
          sc._fog = sc.fog;
          sc.fog = null;
        }
      } else if (sc._fog) {
        sc.fog = sc._fog;
        sc._fog = null;
        sc.background = null;
      }
    },
    setDraftCamera(cam) {
      api2.draftCam = cam;
    },
    flash(color = "#ffffff", amt = 0.5) {
      compose.uniforms.flashColor.value.set(color);
      api2._flash = amt;
    },
    render(dt, t) {
      dt = Math.min(dt || 0.016, 0.12);
      compose.uniforms.time.value = t;
      compose.uniforms.exposure.value = preset.exposure * api2.exposureBoost;
      if (bloom.enabled) {
        const night = preset.night;
        bloom.strength = 0.14 + night * 0.54;
        bloom.radius = 0.55 + night * 0.1;
        bloom.threshold = 0.94 - night * 0.2;
      }
      if (api2._flash > 1e-3) {
        api2._flash *= Math.pow(16e-4, dt);
        compose.uniforms.flash.value = api2._flash;
      } else compose.uniforms.flash.value = 0;
      outline.strength += (outline.target - outline.strength) * Math.min(1, dt * 9);
      if (outline.strength < 4e-3) outline.strength = 0;
      outlinePass.uniforms.strength.value = outline.strength * 0.9;
      if (api2.draftMode && api2.draftCam) {
        r.setRenderTarget(null);
        r.clear();
        r.render(stage2.scene, api2.draftCam);
        return;
      }
      if (api2.quality === "low") {
        r.setRenderTarget(null);
        r.clear();
        r.render(stage2.scene, stage2.camera);
        return;
      }
      if (outline.obj && (outline.strength > 0.01 || api2.outlinePending)) {
        renderMask();
        api2.outlinePending = false;
      }
      composer.render(dt);
    }
  };
  function renderMask() {
    const cam = stage2.camera;
    maskCam.position.copy(cam.position);
    maskCam.quaternion.copy(cam.quaternion);
    maskCam.fov = cam.fov;
    maskCam.aspect = cam.aspect;
    maskCam.near = cam.near;
    maskCam.far = cam.far;
    maskCam.updateProjectionMatrix();
    maskCam.updateMatrixWorld();
    maskScene.overrideMaterial = maskMat;
    const added = [];
    outline.obj.updateMatrixWorld(true);
    outline.obj.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.__maskParent = o.parent;
      added.push(o);
    });
    for (const o of added) maskScene.add(o);
    r.setRenderTarget(rtMask);
    r.setClearColor(0, 0);
    r.clear(true, true, true);
    r.render(maskScene, maskCam);
    r.setRenderTarget(null);
    r.setClearColor(new THREE8.Color(658706), 1);
    for (const o of added) {
      if (o.userData.__maskParent) {
        o.userData.__maskParent.add(o);
        o.userData.__maskParent = null;
      } else maskScene.remove(o);
    }
    maskScene.overrideMaterial = null;
  }
  stage2.onResize = () => api2.resize();
  stage2.onResize();
  api2.setQuality(stage2.quality || "high");
  return api2;
}

// src/lib/orbit.js
init_core();
import * as THREE9 from "three";
var EL_MIN = -0.3;
var EL_MAX = 1.5;
var _v = new THREE9.Vector3();
var _w = new THREE9.Vector3();
var _ray = new THREE9.Raycaster();
var _ndc = new THREE9.Vector2();
var TAU3 = Math.PI * 2;
var wrapPi = (a) => {
  a = ((a + Math.PI) % TAU3 + TAU3) % TAU3 - Math.PI;
  return a;
};
var OrbitRig = class {
  constructor(camera, canvas) {
    this.cam = camera;
    this.el = canvas;
    this.target = new THREE9.Vector3(0, 16, 0);
    this.tTarget = new THREE9.Vector3(0, 16, 0);
    this.dist = 460;
    this.tDist = 460;
    this.az = 0.42;
    this.tAz = 0.42;
    this.elv = 0.28;
    this.tElv = 0.28;
    this.minDist = 6;
    this.maxDist = 1900;
    this.enabled = true;
    this.vAz = 0;
    this.vEl = 0;
    this.dragging = 0;
    this.auto = null;
    this.onFocus = null;
    this.picked = [];
    this._shot = null;
    this._ptrs = /* @__PURE__ */ new Map();
    this._pinch = 0;
    this._lastMoveT = 0;
    this._dpr = 1;
    this._bind();
  }
  /* ─────────────────────── 输入 ─────────────────────── */
  _bind() {
    const el = this.el;
    const down = (e) => {
      if (!this.enabled) return;
      this._ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
      if (this._ptrs.size === 1) {
        this.dragging = e.button === 2 || e.button === 1 ? 2 : 1;
        this.vAz = 0;
        this.vEl = 0;
        this._move = { x: e.clientX, y: e.clientY };
        el.style.cursor = this.dragging === 2 ? "move" : "grabbing";
        this.stopAuto();
      } else if (this._ptrs.size === 2) {
        const [a, b] = [...this._ptrs.values()];
        this._pinch = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        this._mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        this.dragging = 3;
        this.vAz = 0;
        this.vEl = 0;
      }
    };
    const move = (e) => {
      const rec = this._ptrs.get(e.pointerId);
      if (!rec) return;
      rec.x = e.clientX;
      rec.y = e.clientY;
      if (!this.enabled) return;
      if (this.dragging === 3 && this._ptrs.size >= 2) {
        const [a, b] = [...this._ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (this._pinch) {
          const f = this._pinch / d;
          this.tDist = clamp(this.tDist * Math.pow(f, 0.9), this.minDist, this.maxDist);
        }
        this._pinch = d;
        if (this._mid) this._pan(mx - this._mid.x, my - this._mid.y);
        this._mid = { x: mx, y: my };
        this.stopAuto();
        return;
      }
      if (!this.dragging) return;
      const dx = e.clientX - this._move.x;
      const dy = e.clientY - this._move.y;
      this._move = { x: e.clientX, y: e.clientY };
      const now2 = performance.now();
      this._lastMoveT = now2;
      if (this.dragging === 1) this._rotate(dx, dy, e.shiftKey);
      else if (this.dragging === 2) {
        this._panSh(dx, dy);
        this.stopAuto();
      }
    };
    const up = (e) => {
      this._ptrs.delete(e.pointerId);
      if (this._ptrs.size === 0) {
        if (this.dragging === 1 && performance.now() - this._lastMoveT > 90) {
          this.vAz = 0;
          this.vEl = 0;
        }
        this.dragging = 0;
        this._pinch = 0;
        el.style.cursor = "grab";
      } else if (this._ptrs.size === 1) {
        this.dragging = 1;
        const [a] = [...this._ptrs.values()];
        this._move = { x: a.x, y: a.y };
        this._pinch = 0;
      }
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("wheel", (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const f = Math.exp(d * 12e-4);
      const before = this.tDist;
      this.tDist = clamp(this.tDist * f, this.minDist, this.maxDist);
      if (e.clientX != null && Math.abs(this.tDist - before) > 1e-3) {
        const k = this._cursorParallax(e.clientX, e.clientY);
        this.tTarget.addScaledVector(k, (this.tDist - before) * 0.42);
      }
      this.stopAuto();
    }, { passive: false });
    let lastTap = 0, lastX = 0, lastY = 0;
    el.addEventListener("pointerup", (e) => {
      if (!this.enabled || e.button !== 0) return;
      const now2 = performance.now();
      if (now2 - lastTap < 300 && Math.hypot(e.clientX - lastX, e.clientY - lastY) < 14) {
        this._dblTap(e.clientX, e.clientY);
        lastTap = 0;
      } else {
        lastTap = now2;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    });
    el.style.cursor = "grab";
    el.style.touchAction = "none";
  }
  /* 光标方向的视平面偏移（单位向量），用于推拉锚点 */
  _cursorParallax(cx, cy) {
    const w = this.el.clientWidth || window.innerWidth;
    const h = this.el.clientHeight || window.innerHeight;
    const nx = cx / w * 2 - 1, ny = -(cy / h) * 2 + 1;
    const right = new THREE9.Vector3().setFromMatrixColumn(this.cam.matrixWorld, 0);
    const up = new THREE9.Vector3().setFromMatrixColumn(this.cam.matrixWorld, 1);
    return right.multiplyScalar(nx).addScaledVector(up, ny);
  }
  _rotate(dx, dy, slow) {
    const sp = slow ? 16e-4 : 4e-3;
    const prevAz = this.tAz, prevEl = this.tElv;
    this.tAz -= dx * sp;
    this.tElv = clamp(this.tElv + dy * sp * 0.85, EL_MIN, EL_MAX);
    this.vAz = -(this.tAz - prevAz);
    this.vEl = this.tElv - prevEl;
    this.stopAuto();
  }
  _pan(dx, dy) {
    const s = this.dist * 17e-4;
    const right = _v.setFromMatrixColumn(this.cam.matrixWorld, 0).clone();
    const upv = _w.setFromMatrixColumn(this.cam.matrixWorld, 1).clone();
    this.tTarget.addScaledVector(right, -dx * s).addScaledVector(upv, dy * s);
  }
  _panSh(dx, dy) {
    this._pan(dx, dy);
  }
  /* ─────────────────────── 对外 API ─────────────────────── */
  set(o = {}) {
    if (o.target) {
      const t = o.target;
      if (t.isVector3) this.tTarget.copy(t);
      else this.tTarget.set(t[0] ?? this.tTarget.x, t[1] ?? this.tTarget.y, t[2] ?? this.tTarget.z);
    }
    if (o.dist != null) this.tDist = clamp(o.dist, this.minDist, this.maxDist);
    if (o.az != null) this.tAz = o.az;
    if (o.el != null) this.tElv = clamp(o.el, EL_MIN, EL_MAX);
    if (o.elv != null) this.tElv = clamp(o.elv, EL_MIN, EL_MAX);
    if (o.snap) {
      this.target.copy(this.tTarget);
      this.dist = this.tDist;
      this.az = this.tAz;
      this.elv = this.tElv;
      this.vAz = 0;
      this.vEl = 0;
      this.apply();
    }
    return this;
  }
  snapTo(o = {}) {
    return this.set(Object.assign({ snap: true }, o));
  }
  /* 当前机位（{target,dist,az,el} 副本），由 apply() 每帧写回 */
  get shot() {
    return this._shot;
  }
  /* 对焦到世界坐标点：保持当前方位，推进到 dist */
  focusOn(pt3, dist = 90) {
    const p = pt3 && pt3.isVector3 ? pt3 : new THREE9.Vector3(pt3[0], pt3[1], pt3[2]);
    this.stopAuto();
    this.tTarget.copy(p);
    this.tDist = clamp(dist, this.minDist, this.maxDist);
    this.tElv = clamp(this.tElv || 0.26, 0.1, 0.95);
    return this;
  }
  /* 双击 / 触屏双击 / 选卡对焦：射线拾取 → 打到谁就对焦谁 */
  _dblTap(cx, cy) {
    const roots = this.picked && this.picked.length ? this.picked : window.__app && window.__app.stage ? [window.__app.stage.scene] : [];
    if (!roots.length) return;
    const w = this.el.clientWidth || window.innerWidth;
    const h = this.el.clientHeight || window.innerHeight;
    _ndc.set(cx / w * 2 - 1, -(cy / h) * 2 + 1);
    const cam = window.__app && window.__app.stage ? window.__app.stage.camera : this.cam;
    _ray.setFromCamera(_ndc, cam);
    let hit = null;
    for (const r2 of roots) {
      const hs = _ray.intersectObject(r2, true);
      for (const h2 of hs) {
        if (!h2.object.isMesh || !h2.object.visible) continue;
        if (!isShown(h2.object)) continue;
        if (!hit || h2.distance < hit.distance) hit = h2;
      }
    }
    if (!hit) {
      this.focusOn(new THREE9.Vector3(0, 18, 0), 560);
      this.onFocus && this.onFocus(null);
      return;
    }
    let root = hit.object;
    const arenaRoot = window.__app && window.__app.arena ? window.__app.arena.root : null;
    if (arenaRoot) {
      let p = hit.object;
      while (p && p !== arenaRoot && p.parent !== arenaRoot) p = p.parent;
      if (p) root = p;
    }
    const box = new THREE9.Box3().setFromObject(root);
    const c = box.getCenter(new THREE9.Vector3());
    const r = Math.max(box.getSize(new THREE9.Vector3()).length() * 0.5, 1);
    this.focusOn(c, Math.max(r * 1.9, 24));
    this.onFocus && this.onFocus(hit.object);
  }
  /* ─────────────────────── 自动导览 ─────────────────────── */
  startAuto(seq, sec = 8) {
    if (!seq || !seq.length) return;
    let bi = 0, bd = Infinity;
    seq.forEach((s, i) => {
      const d = Math.hypot(
        (s.target?.[0] ?? 0) - this.tTarget.x,
        (s.target?.[1] ?? 0) - this.tTarget.y,
        (s.target?.[2] ?? 0) - this.tTarget.z
      ) + Math.abs((s.dist ?? 400) - this.tDist) * 0.35;
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    this.auto = { on: true, seq, i: bi, t: 0, hold: Math.max(1.2, (sec || 8) * 0.35), move: Math.max(1.4, (sec || 8) * 0.65), phase: "hold", from: null, to: null };
  }
  stopAuto() {
    if (this.auto) this.auto = null;
  }
  get autoActive() {
    return !!(this.auto && this.auto.on);
  }
  _autoStep(a, shot) {
    a.from = {
      target: this.tTarget.clone(),
      dist: this.tDist,
      az: this.tAz,
      el: this.tElv
    };
    const tg = shot.target || [0, 0, 0];
    a.to = {
      target: new THREE9.Vector3(tg[0] ?? tg.x, tg[1] ?? tg.y, tg[2] ?? tg.z),
      dist: clamp(shot.dist ?? 400, this.minDist, this.maxDist),
      az: shot.az ?? 0,
      el: clamp(shot.el ?? shot.elv ?? 0.3, EL_MIN, EL_MAX)
    };
    a.to.az = a.from.az + wrapPi(a.to.az - a.from.az);
    a.from.logD = Math.log(Math.max(1, a.from.dist));
    a.to.logD = Math.log(Math.max(1, a.to.dist));
    a.phase = "move";
    a.t = 0;
  }
  /* ─────────────────────── 每帧 ─────────────────────── */
  update(dt) {
    dt = Math.min(dt || 0.016, 0.1);
    const a = this.auto;
    if (a && a.on) {
      a.t += dt;
      if (a.phase === "hold") {
        if (a.t > a.hold) this._autoStep(a, a.seq[a.i] || a.seq[0]);
      } else {
        const k2 = smooth(clamp(a.t / a.move, 0, 1));
        this.tTarget.lerpVectors(a.from.target, a.to.target, k2);
        this.tDist = Math.exp(lerp(a.from.logD, a.to.logD, k2));
        this.tAz = lerp(a.from.az, a.to.az, k2);
        this.tElv = lerp(a.from.el, a.to.el, k2);
        if (k2 >= 1) {
          a.phase = "hold";
          a.t = 0;
          a.i = (a.i + 1) % a.seq.length;
        }
      }
    }
    if (!this.dragging && !this.autoActive && (Math.abs(this.vAz) > 1e-5 || Math.abs(this.vEl) > 1e-5)) {
      this.tAz += this.vAz * 60 * dt;
      this.tElv = clamp(this.tElv + this.vEl * 60 * dt, EL_MIN, EL_MAX);
      const damp = Math.pow(16e-4, dt);
      this.vAz *= damp;
      this.vEl *= damp;
      if (Math.abs(this.vAz) < 1e-5) this.vAz = 0;
      if (Math.abs(this.vEl) < 1e-5) this.vEl = 0;
    }
    const k = 1 - Math.exp(-dt * 6.4);
    const kt = 1 - Math.exp(-dt * 5.2);
    this.target.lerp(this.tTarget, kt);
    this.dist = lerp(this.dist, this.tDist, k);
    this.az = lerp(this.az, this.tAz, k);
    this.elv = lerp(this.elv, this.tElv, k);
    this.apply();
  }
  apply() {
    const c = this.target;
    const ce = Math.cos(this.elv), se = Math.sin(this.elv);
    const x = c.x + Math.cos(this.az) * ce * this.dist;
    const z = c.z + Math.sin(this.az) * ce * this.dist;
    const y = c.y + se * this.dist;
    this.cam.position.set(x, Math.max(0.7, y), z);
    if (Math.abs(ce * this.dist) < 0.02) this.cam.position.x += 0.02;
    this.cam.lookAt(c);
    this.cam.updateMatrixWorld();
    this._shot = {
      target: this.tTarget.clone(),
      dist: this.tDist,
      az: this.tAz,
      el: this.tElv
    };
  }
};
function isShown(o) {
  let p = o;
  while (p) {
    if (!p.visible) return false;
    p = p.parent;
  }
  return true;
}

// src/lib/walk.js
init_core();
import * as THREE10 from "three";
var EYE = 1.68;
var RADIUS = 0.34;
var STEP_UP = 0.62;
var TRANS_T = 0.6;
var RING = refRing(SEGS);
var TOTAL = RING.total;
var REF = RING.pts.map((p) => ({
  nx: p.nx,
  nz: p.nz,
  u: p.u,
  /* 该方向的单位切向（u 增大的方向） */
  tx: -p.nz,
  tz: p.nx
}));
function bt(h, ex, ez) {
  const hx = HALF_X + h, hz = HALF_Z + h, r = hx * CORNER_F;
  const ax = hx - r, az = hz - r;
  const a = Math.abs(ex), c = Math.abs(ez);
  const te = Math.min(a > 1e-9 ? ax / a : Infinity, c > 1e-9 ? az / c : Infinity);
  if (Math.abs(ex) * te <= ax + 1e-6 && Math.abs(ez) * te <= az + 1e-6) return te;
  const bq = ax * a + az * c, aq = a * a + c * c, cq = ax * ax + az * az - r * r;
  return (bq + Math.sqrt(Math.max(0, bq * bq - aq * cq))) / aq;
}
function locate(x, z) {
  const r = Math.hypot(x, z);
  if (r < 1e-6) return { s: -HALF_X, i: 0, u: 0 };
  let bi = 0, bd = Infinity;
  let dx = 0, dz = 0, nx = 1, nz = 0;
  for (let i = 0; i < SEGS; i++) {
    const p = REF[i];
    const t = bt(0, p.nx, p.nz);
    const proj = x * p.nx + z * p.nz;
    const lat = Math.abs(x * p.tx + z * p.tz) * (t < HALF_Z ? 0.9 : 1.2);
    const d = Math.abs(r - proj) + lat * 0.55;
    if (d < bd) {
      bd = d;
      bi = i;
      dx = x;
      dz = z;
      nx = p.nx;
      nz = p.nz;
    }
  }
  const ex = r > 1e-6 ? dx / r : nx, ez = r > 1e-6 ? dz / r : nz;
  let lo = -HALF_X + 0.01, hi = 320;
  for (let k = 0; k < 26; k++) {
    const mid = (lo + hi) * 0.5;
    const tt = bt(mid, ex, ez);
    if (tt < r) lo = mid;
    else hi = mid;
  }
  return { s: (lo + hi) * 0.5, i: bi, u: REF[bi].u };
}
var PORTAL_HALF_M = (GEO.portalHalfU ?? 0.03) * TOTAL;
function inPortalWorld(x, z) {
  if (x == null || z == null) return false;
  return Math.min(Math.abs(x), Math.abs(z)) < PORTAL_HALF_M;
}
function groundAtS(s, x, z) {
  const OUT = GEO.outerS, GY2 = GEO.groundY;
  if (s < L1.s0) return GY2;
  for (let t = 0; t < TIERS.length; t++) {
    const T = TIERS[t];
    if (s >= T.s0 && s < T.endS) {
      const rows = T.rows;
      for (let k = 0; k < rows.length; k++) {
        const r = rows[k];
        if (s < r.sBack) return r.y;
      }
      const last = rows[rows.length - 1];
      return last.yBack != null ? last.yBack : T.endY;
    }
    if (s >= T.cS0 && s < T.cS1) {
      if (t === TIERS.length - 1 && inPortalWorld(x, z)) return 0;
      return T.cY;
    }
    if (s >= T.endS && s < T.cS0) return T.cY;
  }
  if (s >= L3.cS1 && s <= OUT) return 0;
  return 0;
}
function standOK(y) {
  return y < 30;
}
function buildRoute() {
  const O = GEO.outerS;
  const V2 = (x, y, z) => new THREE10.Vector3(x, y, z);
  return [
    /* 广场：绕到南侧主入口 */
    { p: V2(0, GEO.groundY, O + 46), look: V2(0, 8, O + 10), name: "球迷广场" },
    { p: V2(0, GEO.groundY, O + 14), look: V2(0, 6, 0), name: "南门主轴" },
    /* 穿过券洞进入门厅（门洞 u=0.5 在 +z 边中点） */
    { p: V2(0, 0, O - 3), look: V2(14, 0, O - 14), name: "南入口门厅" },
    { p: V2(14, 0, O - 8), look: V2(14, 3, 0), name: "服务环" },
    /* 次入口（u=0.375 在西南角）穿出到广场，再沿外墙绕到西侧 */
    { p: V2(-21.6, GEO.groundY, O + 3), look: V2(-34, 1, O + 16), name: "次入口内廊" },
    { p: V2(-40, GEO.groundY, O - 18), look: V2(-46, 2, 40), name: "西侧广场" },
    /* 走上看台 L1 前排 → 逐排抬升 → 环廊 */
    { p: V2(-60, L1.y0 + 0.6, 40), look: V2(-34, 4, 10), name: "下层看台" },
    { p: V2(-58, L1.cY, 34), look: V2(-20, 6, 0), name: "一层环廊" },
    /* 包厢层外廊（L2 环廊） */
    { p: V2(-48, L2.cY, 44), look: V2(-10, 8, 0), name: "包厢层外廊" },
    /* 三层环廊 */
    { p: V2(0, L3.cY, 96), look: V2(0, 4, 0), name: "上层环廊" },
    /* 回到场地边 */
    { p: V2(0, GEO.groundY, 40), look: V2(0, 1, 0), name: "球员通道口" },
    { p: V2(0, GEO.groundY, 8), look: V2(0, 2, -40), name: "中圈" },
    { p: V2(0, GEO.groundY, -34), look: V2(0, 2, -50), name: "北侧通道" }
  ];
}
var Walk = class {
  constructor(stage2, arena) {
    this.stage = stage2;
    this.arena = arena;
    this.active = false;
    this.yaw = Math.PI;
    this.pitch = 0;
    this.pos = new THREE10.Vector3(0, GEO.groundY + EYE, 200);
    this.vel = new THREE10.Vector2();
    this.keys = /* @__PURE__ */ new Set();
    this.speed = 4.6;
    this.runSpeed = 9.4;
    this.bob = 0;
    this.pointerLocked = false;
    this.sensitivity = 21e-4;
    this.auto = false;
    this.route = buildRoute();
    this.seg = 0;
    this.segT = 0;
    this.trans = null;
    this._enter = new THREE10.Vector3();
    this._enterVel = new THREE10.Vector3();
    this._onExit = null;
    this.onExitKey = null;
    this._bind();
  }
  /* ─────────── 输入绑定 ─────────── */
  _bind() {
    const el = this.stage.canvas;
    window.addEventListener("keydown", (e) => {
      if (!this.active) return;
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      this.keys.add(e.code);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
      if (e.code === "KeyR") this.toggleAuto(true);
      if (e.code === "Tab") {
        e.preventDefault();
        this.toggleAuto();
      }
    }, true);
    window.addEventListener("keydown", (e) => {
      if (!this.active || e.code !== "Escape" && e.key !== "Escape") return;
      this.keys.clear();
      e.preventDefault();
      e.stopPropagation();
      this._requestExit();
    }, true);
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    el.addEventListener("pointerdown", (e) => {
      if (!this.active) return;
      this._downAt = { x: e.clientX, y: e.clientY };
      this._wantLock = true;
      try {
        const pr = el.requestPointerLock && el.requestPointerLock();
        if (pr && pr.catch) pr.catch(() => {
          this._wantLock = false;
        });
      } catch (err) {
        this._wantLock = false;
      }
    });
    document.addEventListener("pointerlockchange", () => {
      const locked = document.pointerLockElement === el;
      if (!locked && this.pointerLocked && this.active && !this._exiting) this._exitByEsc();
      this.pointerLocked = locked;
    });
    window.addEventListener("mousemove", (e) => {
      if (!this.active) return;
      const locked = document.pointerLockElement === el;
      if (!locked) {
        if (!this._dragLook) return;
        this._look(e.movementX || 0, e.movementY || 0);
        return;
      }
      this._look(e.movementX || 0, e.movementY || 0);
    });
    el.addEventListener("pointerdown", (e) => {
      if (this.active && e.pointerType === "touch") this._dragLook = true;
    }, { capture: true });
    window.addEventListener("pointerup", () => {
      this._dragLook = false;
    });
    document.addEventListener("pointerlockerror", () => {
      this._wantLock = false;
    });
  }
  _look(dx, dy) {
    if (this.auto) this.toggleAuto(false);
    this.yaw -= dx * this.sensitivity;
    this.pitch = clamp(this.pitch - dy * this.sensitivity, -1.3, 1.3);
  }
  /* ─────────── 生命周期 ─────────── */
  /* ui.js 会调用 walk.start(new Vector3(0,2,200))；传入点视为"落点" */
  start(pt3) {
    const cam = this.stage.camera;
    const from = cam.position.clone();
    const fromDir = new THREE10.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    if (pt3) {
      const lc = locate(pt3.x, pt3.z);
      const g = groundAtS(lc.s, pt3.x, pt3.z);
      this.pos.set(pt3.x, Math.max(pt3.y ?? g + EYE, g + EYE), pt3.z);
    } else {
      const lc = locate(this.pos.x, this.pos.z);
      const g = groundAtS(lc.s, this.pos.x, this.pos.z);
      this.pos.y = Math.max(this.pos.y, g + EYE);
    }
    const toC = new THREE10.Vector3(-this.pos.x, 0, -this.pos.z);
    if (toC.length() > 4) {
      this.yaw = Math.atan2(toC.x, toC.z);
      this.pitch = -0.02;
    }
    this.active = true;
    this.auto = false;
    this.vel.set(0, 0);
    this.seg = 0;
    this.segT = 0;
    this.trans = {
      t: 0,
      dur: TRANS_T,
      mode: "in",
      p0: from,
      d0: fromDir,
      p1: this.pos.clone(),
      yaw1: this.yaw,
      pitch1: this.pitch
    };
    this.yaw0 = Math.atan2(fromDir.x, fromDir.z);
    this.pitch0 = Math.asin(clamp(fromDir.y, -1, 1));
    cam.position.copy(from);
    this._wantLock = false;
  }
  stop() {
    if (!this.active) return;
    const cam = this.stage.camera;
    const from = cam.position.clone();
    const dir = new THREE10.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    this.active = false;
    this.auto = false;
    this._exiting = true;
    setTimeout(() => {
      this._exiting = false;
    }, 220);
    this.trans = { t: 0, dur: TRANS_T, mode: "out", p0: from, p1: from.clone(), d0: dir.clone() };
    const exit = cam.position.clone().addScaledVector(dir, 3).setY(Math.max(cam.position.y + 1, 6));
    this.trans.p1 = exit;
    this._wantLock = false;
    if (document.pointerLockElement) document.exitPointerLock();
  }
  exit() {
    this.stop();
  }
  /* 指针锁定态按 Esc（浏览器先解锁）：通知 ui 复位按钮/提示/HUD 状态 */
  _exitByEsc() {
    this.stop();
    this._requestExit();
  }
  /* 统一退出出口：优先交回 ui.js（toggleWalk 负责按钮/样式/提示复位），
     没有 ui 钩子时自己 stop() */
  _requestExit() {
    if (this._exiting) return;
    this._exiting = true;
    setTimeout(() => {
      this._exiting = false;
    }, 260);
    if (typeof this.onExitKey === "function") this.onExitKey();
    else this.stop();
  }
  /* 自动 / 手动切换 */
  toggleAuto(force) {
    const on = force == null ? !this.auto : !!force;
    this.auto = on;
    if (on) this._snapAutoToNearest();
  }
  /* 找路线上离当前位置最近的点，从那里开始巡游 */
  _snapAutoToNearest() {
    let bi = 0, bd = Infinity, bt22 = 0;
    const R = this.route;
    for (let i = 0; i < R.length; i++) {
      const a = R[i].p, b = R[(i + 1) % R.length].p;
      const ab = b.clone().sub(a);
      const len2 = ab.lengthSq() || 1;
      let t = clamp(this.pos.clone().sub(a).dot(ab) / len2, 0, 1);
      const d = a.clone().addScaledVector(ab, t).distanceTo(this.pos);
      if (d < bd) {
        bd = d;
        bi = i;
        bt22 = t;
      }
    }
    this.seg = bi;
    this.segT = bt22;
  }
  /* ─────────── 碰撞 ─────────── */
  /* 返回 {x, z, blocked}：沿墙面滑动，不允许穿墙 */
  _resolve(nx, nz, curY) {
    const OUT = GEO.outerS;
    let x = nx, z = nz;
    const loc = locate(x, z);
    const gHere = groundAtS(loc.s, x, z);
    const wallS = OUT - RADIUS * 0.6;
    const curLoc = locate(this.pos.x, this.pos.z);
    if (loc.s > wallS && curLoc.s <= wallS) {
      if (!inPortalWorld(x, z) || Math.abs(gHere - groundAtS(curLoc.s, this.pos.x, this.pos.z)) > 6.5) {
        const ref = REF[loc.i];
        const proj = x * ref.nx + z * ref.nz;
        const t = bt(wallS, ref.nx, ref.nz);
        const excess = proj - t;
        if (excess > 0) {
          x -= ref.nx * excess;
          z -= ref.nz * excess;
        }
      }
    }
    const loc2 = locate(x, z);
    if (curLoc.s > wallS && loc2.s <= wallS) {
      if (!inPortalWorld(this.pos.x, this.pos.z) || Math.abs(groundAtS(loc2.s, x, z) - groundAtS(curLoc.s, this.pos.x, this.pos.z)) > 6.5) {
        const ref = REF[curLoc.i];
        const proj = x * ref.nx + z * ref.nz;
        const t = bt(wallS - 0.02, ref.nx, ref.nz);
        const lack = t - proj;
        if (lack > 0) {
          x += ref.nx * lack;
          z += ref.nz * lack;
        }
      }
    }
    return { x, z };
  }
  /* 台阶级差：太高就不能上（相当于"护栏"），太陡自动抬升 */
  groundAt(x, z) {
    const l = locate(x, z);
    return groundAtS(l.s, x, z);
  }
  /* ─────────── 每帧 ─────────── */
  update(dt) {
    const cam = this.stage.camera;
    dt = Math.min(dt || 0.016, 0.1);
    if (!this.active) {
      const tr2 = this.trans;
      if (tr2 && tr2.mode === "out") {
        tr2.t += dt;
        const k = smooth(clamp(tr2.t / tr2.dur, 0, 1));
        cam.position.lerpVectors(tr2.p0, tr2.p1, k);
        const look2 = cam.position.clone().add(new THREE10.Vector3(0, 0, -1).applyQuaternion(cam.quaternion));
        cam.lookAt(look2);
        if (k >= 1) {
          this.trans = null;
          this._onExit && this._onExit();
        }
      }
      return;
    }
    if (this.auto) {
      this._autoStep(dt);
    } else {
      this._manualStep(dt);
    }
    const tr = this.trans;
    let camPos, camQuat;
    if (tr && tr.mode === "in") {
      tr.t += dt;
      const k = smooth(clamp(tr.t / tr.dur, 0, 1));
      this.pos.lerpVectors(tr.p0, tr.p1, k);
      camPos = this.pos;
      const yaw = lerpAngle(this.yaw0, tr.yaw1, k);
      const pitch = lerp(this.pitch0, tr.pitch1, k);
      if (k >= 1) {
        this.trans = null;
      }
      this._eyeOverride = { yaw, pitch };
    } else this._eyeOverride = null;
    const lc = locate(this.pos.x, this.pos.z);
    const g = groundAtS(lc.s, this.pos.x, this.pos.z);
    const bobY = Math.sin(this.bob) * 0.022;
    const targetY = g + EYE + bobY;
    if (this.trans && this.trans.mode === "in") {
    } else {
      this.pos.y = lerp(this.pos.y, targetY, 1 - Math.exp(-dt * 16));
      if (this.pos.y < g + EYE - 0.02) this.pos.y = g + EYE;
    }
    cam.position.copy(this.pos);
    const look = new THREE10.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    cam.lookAt(this.pos.clone().add(look));
  }
  _manualStep(dt) {
    const k = this.keys;
    let fx = 0, fz = 0;
    if (k.has("KeyW") || k.has("ArrowUp")) fz += 1;
    if (k.has("KeyS") || k.has("ArrowDown")) fz -= 1;
    if (k.has("KeyA") || k.has("ArrowLeft")) fx -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) fx += 1;
    const run = k.has("ShiftLeft") || k.has("ShiftRight");
    const len = Math.hypot(fx, fz);
    const sp = run ? this.runSpeed : this.speed;
    let vx = 0, vz = 0;
    if (len > 0) {
      fx /= len;
      fz /= len;
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      vx = (fz * sy + fx * cy) * sp;
      vz = (fz * cy - fx * sy) * sp;
    }
    const acc = len > 0 ? 14 : 16;
    this.vel.x = lerp(this.vel.x, vx, 1 - Math.exp(-dt * acc));
    this.vel.y = lerp(this.vel.y, vz, 1 - Math.exp(-dt * acc));
    const v = Math.hypot(this.vel.x, this.vel.y);
    if (v < 0.02) {
      this.vel.set(0, 0);
      return;
    }
    const steps2 = Math.max(1, Math.ceil(v * dt / 0.25));
    const h = dt / steps2;
    for (let i = 0; i < steps2; i++) {
      const nx = this.pos.x + this.vel.x * h;
      const nz = this.pos.z + this.vel.y * h;
      const cur = locate(this.pos.x, this.pos.z);
      const curG = groundAtS(cur.s, this.pos.x, this.pos.z);
      const next = locate(nx, nz);
      const nextG = groundAtS(next.s, nx, nz);
      if (nextG - curG > STEP_UP && !standOK(nextG)) {
        const ref = REF[cur.i];
        const along = this.vel.x * ref.tx + this.vel.y * ref.tz;
        const sx = this.pos.x + ref.tx * along * h;
        const sz = this.pos.z + ref.tz * along * h;
        const s2 = locate(sx, sz);
        if (groundAtS(s2.s, sx, sz) - curG <= STEP_UP) {
          const rr2 = this._resolve(sx, sz, curG);
          this.pos.x = rr2.x;
          this.pos.z = rr2.z;
        }
        continue;
      }
      const rr = this._resolve(nx, nz, curG);
      const fin = locate(rr.x, rr.z);
      if (groundAtS(fin.s, rr.x, rr.z) - curG > STEP_UP) continue;
      this.pos.x = rr.x;
      this.pos.z = rr.z;
    }
    this.bob += dt * (run ? 13.5 : 8.4);
    const r = Math.hypot(this.pos.x, this.pos.z);
    const RMAX = GEO.outerS + 190;
    if (r > RMAX) {
      this.pos.x *= RMAX / r;
      this.pos.z *= RMAX / r;
    }
  }
  _autoStep(dt) {
    const R = this.route;
    const A = R[this.seg], B = R[(this.seg + 1) % R.length];
    const target = B.p.clone();
    const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
    const horiz = Math.hypot(dx, dz);
    const sp = 6.2;
    if (horiz < 0.6) {
      this.segT = 0;
      this.seg = (this.seg + 1) % R.length;
      this.onRouteNode && this.onRouteNode(R[this.seg]);
    } else {
      const step2 = Math.min(sp * dt, horiz);
      const nx = this.pos.x + dx / horiz * step2;
      const nz = this.pos.z + dz / horiz * step2;
      const cur = locate(this.pos.x, this.pos.z);
      const curG = groundAtS(cur.s, this.pos.x, this.pos.z);
      const nl = locate(nx, nz);
      const nextG = groundAtS(nl.s, nx, nz);
      if (nextG - curG <= STEP_UP) {
        const rr = this._resolve(nx, nz, curG);
        this.pos.x = rr.x;
        this.pos.z = rr.z;
      } else {
        this.seg = (this.seg + 1) % R.length;
        this.onRouteNode && this.onRouteNode(R[this.seg]);
      }
      this.bob += dt * 7.2;
    }
    const look = A.look.clone().lerp(B.look, clamp(horiz / 20, 0, 1));
    const dir = look.clone().sub(this.pos);
    const wantYaw = Math.atan2(dir.x, dir.z);
    const wantPitch = Math.asin(clamp(dir.y / (dir.length() || 1), -1, 1));
    this.yaw = lerpAngle(this.yaw, wantYaw, 1 - Math.exp(-dt * 2.6));
    this.pitch = lerp(this.pitch, wantPitch, 1 - Math.exp(-dt * 2.4));
  }
  /* 小地图用：当前所在设施名 */
  get zoneName() {
    const s = locate(this.pos.x, this.pos.z).s;
    if (s < L1.s0) return "比赛场地";
    for (const T of TIERS) {
      if (s >= T.s0 && s < T.endS) return T.name;
      if (s >= T.cS0 && s < T.cS1) return T.name.replace("看台", "") + "环廊";
    }
    return "场馆外环";
  }
};
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// src/lib/draft.js
import * as THREE11 from "three";
var DraftViews = class {
  constructor(stage2, arena) {
    this.stage = stage2;
    this.arena = arena;
    const EX = HALF_X + GEO.roofOuterS + 14;
    const EZ = HALF_Z + GEO.roofOuterS + 14;
    const EY = GEO.crownY + 8;
    this.env = { EX, EZ, EY };
    this.center = new THREE11.Vector3(0, EY * 0.3, 0);
    const mk = (pos, up, near, far) => {
      const c = new THREE11.OrthographicCamera(-1, 1, 1, -1, near, far);
      c.position.copy(pos);
      c.up.copy(up);
      c.lookAt(this.center);
      c.updateMatrixWorld();
      return c;
    };
    const D = Math.max(EX, EZ) * 3 + 400;
    this.cams = {
      plan: mk(new THREE11.Vector3(0, EY + D, 1e-3), new THREE11.Vector3(0, 0, -1), 1, D * 2),
      front: mk(new THREE11.Vector3(0, EY * 0.5, EZ + D), new THREE11.Vector3(0, 1, 0), 1, D * 2),
      left: mk(new THREE11.Vector3(EX + D, EY * 0.5, 0), new THREE11.Vector3(0, 1, 0), 1, D * 2),
      section: mk(new THREE11.Vector3(0, EY * 0.5, EZ + D), new THREE11.Vector3(0, 1, 0), 1, D * 2)
    };
    this.fit();
    window.addEventListener("resize", () => this.fit());
  }
  fit() {
    const a = window.innerWidth / window.innerHeight;
    const { EX, EZ, EY } = this.env;
    const dims = {
      plan: [EX * 2.05, EZ * 2.05],
      front: [EX * 2.02, EY * 0.86],
      left: [EZ * 2.02, EY * 0.86],
      section: [EX * 2.02, EY * 0.86]
    };
    for (const key of Object.keys(this.cams)) {
      const c = this.cams[key];
      let [w, h] = dims[key];
      const ar = w / h;
      if (ar > a) {
        c.left = -w / 2;
        c.right = w / 2;
        c.top = w / 2 / a;
        c.bottom = -w / 2 / a;
      } else {
        c.left = -h * a / 2;
        c.right = h * a / 2;
        c.top = h / 2;
        c.bottom = -h / 2;
      }
      c.updateProjectionMatrix();
    }
  }
  get(name) {
    return this.cams[name] || this.cams.plan;
  }
};

// src/lib/modes.js
init_core();
import * as THREE12 from "three";
var xrayVert = (
  /* glsl */
  `
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
}`
);
var xrayFrag = (
  /* glsl */
  `
uniform vec3 base; uniform vec3 rim; uniform float opacity; uniform float scan;
varying vec3 vN; varying vec3 vV; varying vec3 vW;
void main(){
  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  f = pow(clamp(f, 0.0, 1.0), 1.9);
  /* 横向扫描带：让 X 光有"读数"感而非纯玻璃 */
  float band = smoothstep(0.90, 1.0, sin(vW.y * 2.6 - scan * 3.0) * 0.5 + 0.5);
  vec3 c = mix(base, rim, f) + rim * band * 0.30;
  gl_FragColor = vec4(c, (0.045 + f * 0.80 + band * 0.05) * opacity);
}`
);
var WHITE_A = new THREE12.MeshStandardMaterial({
  color: 15987438,
  roughness: 0.9,
  metalness: 0,
  envMapIntensity: 0.62
});
var WHITE_B = new THREE12.MeshStandardMaterial({
  color: 15132128,
  roughness: 0.9,
  metalness: 0,
  envMapIntensity: 0.55,
  side: THREE12.DoubleSide
});
var BG = {
  material: new THREE12.Color(658706),
  white: new THREE12.Color(2105894),
  xray: new THREE12.Color(263948)
};
var EXPLODE_ORDER = ["roof", "structure", "facade", "suites", "concourse", "bowl", "seats", "interior", "pitch"];
var ModeController = class {
  constructor({ arena, stage: stage2 }) {
    this.arena = arena;
    this.stage = stage2;
    this.mode = "material";
    this.explode = 0;
    this.explodeT = 0;
    this.section = { on: false, normal: new THREE12.Vector3(0, 0, -1), cut: 0 };
    this.fx = null;
    this.highlight = null;
    this._saved = /* @__PURE__ */ new Map();
    this._savedRender = /* @__PURE__ */ new Map();
    this.xrayMat = new THREE12.ShaderMaterial({
      vertexShader: xrayVert,
      fragmentShader: xrayFrag,
      uniforms: { base: { value: new THREE12.Color("#123a52") }, rim: { value: new THREE12.Color("#6fe6ff") }, opacity: { value: 1 }, scan: { value: 0 } },
      transparent: true,
      depthWrite: false,
      side: THREE12.DoubleSide,
      blending: THREE12.AdditiveBlending
    });
    this._ghost = /* @__PURE__ */ new Map();
    this._dsMat = /* @__PURE__ */ new Map();
    this._clipCapture = /* @__PURE__ */ new Map();
    const r = stage2.renderer;
    r.localClippingEnabled = true;
    this.clipPlane = new THREE12.Plane(new THREE12.Vector3(0, 0, -1), 0);
    this._fill = null;
    this._buildSectionFills();
    this.explodeRefs = this._buildExplodeRefs();
    this.layerState = {};
    this._applyMaterialMode();
  }
  /* ══════════════ 材质三态 ══════════════ */
  setMode(m) {
    if (m !== "material" && m !== "white" && m !== "xray") return;
    this.mode = m;
    this._restoreMaterials();
    this._applyMaterialMode();
    const fx = this.fx;
    if (fx) {
      if (m === "material") {
        fx.bloomEnabled = true;
        fx.exposureBoost = 1;
      } else {
        fx.bloomEnabled = false;
        fx.exposureBoost = m === "xray" ? 0.78 : 0.86;
      }
    }
    const r = this.stage.renderer;
    r.setClearColor(BG[m], 1);
    const sc = this.stage.scene;
    if (sc.fog) {
      sc.fog.color.copy(m === "material" ? new THREE12.Color(659224) : BG[m]);
      sc.fog.density = m === "xray" ? 18e-5 : 46e-5;
    }
  }
  _applyMaterialMode() {
    const root = this.arena.root;
    if (this.mode === "material") return;
    const m = this.mode;
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      this._saved.set(o, o.material);
      if (!this._savedRender.has(o)) this._savedRender.set(o, o.renderOrder);
      if (m === "white") {
        const isDS = [].concat(o.material).some((mm) => mm && mm.side === THREE12.DoubleSide);
        o.material = isDS ? WHITE_B : WHITE_A;
      } else {
        const tri = o.geometry ? o.geometry.index ? o.geometry.index.count / 3 : 0 : 0;
        if (tri > 4e4) return;
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
    this._clearGhosts();
  }
  /* 材质副本（双面 / 半透明）统一克隆，可重复使用 */
  _cloneFor(orig, key, patch) {
    let map = this._ghost;
    if (key === "ds") map = this._dsMat;
    if (map.has(orig)) return map.get(orig);
    const c = orig.clone();
    if (patch) Object.assign(c, patch);
    c.userData.__src = orig;
    map.set(orig, c);
    return c;
  }
  _clearGhosts() {
    for (const map of [this._ghost, this._dsMat]) {
      for (const m of map.values()) {
        m.dispose && m.dispose();
      }
      map.clear();
    }
  }
  /* ══════════════ 爆炸（真实分层装配） ══════════════ */
  _buildExplodeRefs() {
    const G = this.arena.groups || {};
    const defs = {
      roof: { amt: 132, alpha: 0.55, dir: "y" },
      structure: { amt: 128, alpha: 0, dir: "y" },
      facade: { amt: 74, alpha: 0.62, radial: 1, lift: 6 },
      suites: { amt: 26, alpha: 0.34, radial: 1, lift: 4 },
      concourse: { amt: 34, alpha: 0.3, dir: "y" },
      bowl: { amt: 22, alpha: 0.26, dir: "y" },
      interior: { amt: 16, alpha: 0.2, dir: "y" },
      seats: { amt: 46, alpha: 0, radial: 1, lift: 12 },
      pitch: { amt: 22, alpha: 0, dir: "down" }
    };
    const refs = [];
    EXPLODE_ORDER.forEach((k, idx) => {
      const obj = G[k];
      if (!obj) return;
      const d = defs[k] || { amt: 20, alpha: 0.2, dir: "y" };
      refs.push({
        key: k,
        obj,
        idx,
        basePos: obj.position.clone(),
        scale: obj.scale.clone(),
        ...d
      });
    });
    return refs;
  }
  /* 兼容两种入参：0–1 或 0–100（ui.js 传 0–1，键盘/脚本可能传百分数） */
  setExplode(v) {
    v = +v || 0;
    this.explodeT = clamp(v > 1 ? v / 100 : v, 0, 1);
  }
  set explodePercent(v) {
    this.setExplode(v);
  }
  get explodePercent() {
    return this.explodeT * 100;
  }
  _applyExplode() {
    const e = easeInOut(this.explode);
    for (const r of this.explodeRefs) {
      const o = r.obj;
      o.position.copy(r.basePos);
      o.scale.copy(r.scale);
      if (e < 1e-4) continue;
      if (r.radial) {
        const k = 1 + e * (r.amt / 106);
        o.scale.set(k, 1, k);
        if (r.lift) o.position.y = r.basePos.y + e * r.lift;
      } else if (r.dir === "down") {
        o.position.y = r.basePos.y - e * r.amt;
      } else {
        o.position.y = r.basePos.y + e * r.amt;
      }
    }
    for (const r of this.explodeRefs) {
      const a = r.alpha * clamp((this.explode - 0.1) / 0.5, 0, 1);
      this._setGhost(r.obj, a);
    }
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
      if (alpha <= 4e-3) {
        if (o.userData.__ghostOn) {
          o.material = o.userData.__ghostOn;
          o.userData.__ghostOn = null;
          o.userData.__gKey = 0;
        }
        return;
      }
      const orig = o.userData.__ghostOn || o.material;
      if (!orig || orig.isShaderMaterial) return;
      if (this.mode !== "material") return;
      if ([].concat(orig).length > 1) return;
      const key = Math.round(clamp(alpha, 0, 1) * 40);
      if (o.userData.__gKey === key) return;
      const src = orig.userData && orig.userData.__src ? orig.userData.__src : orig;
      const mapKey = src.uuid + "@" + key;
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
  setSectionPosition(cut) {
    this.setSection(this.section.on, null, cut);
  }
  _applySection() {
    const r = this.stage.renderer;
    const s = this.section;
    if (this.section.on) {
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
        if (o.userData.__ds) continue;
        const src = [].concat(orig);
        const mats = src.map((m) => {
          if (!m || m.isShaderMaterial) return m;
          const key = m.uuid + ":ds";
          let c = this._dsMat.get(key);
          if (!c) {
            c = m.clone();
            c.side = THREE12.DoubleSide;
            c.transparent = !!m.transparent;
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
    const g = new THREE12.PlaneGeometry(760, 520);
    const mat = new THREE12.MeshBasicMaterial({
      color: 2304563,
      side: THREE12.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      depthTest: true,
      toneMapped: true
    });
    const mesh = new THREE12.Mesh(g, mat);
    mesh.name = "SECTION_FILL";
    mesh.renderOrder = 60;
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    const grp = new THREE12.Group();
    grp.name = "SECTION_FILL";
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
    const p = n.clone().multiplyScalar(-c).addScaledVector(n, -0.6);
    const q = new THREE12.Quaternion().setFromUnitVectors(new THREE12.Vector3(0, 0, 1), n);
    for (const m of [f.planeA, f.planeB]) {
      m.position.copy(p);
      m.quaternion.copy(q);
      m.updateMatrix();
      m.updateMatrixWorld(true);
    }
  }
  _ghostSection(on) {
    if (!on) this._clipCapture.clear();
  }
  /* ══════════════ 图层 ══════════════ */
  setLayer(id, visible, solo) {
    const groups = this.arena.groups || {};
    const alias = {
      roofSoffit: "roof",
      ringBeam: "roof",
      truss: "roof",
      trusses: "structure",
      structureRoof: "structure",
      seat: "seats",
      massing: "seats",
      suite: "suites"
    };
    const key = alias[id] || id;
    if (solo !== void 0 && solo !== null) {
      for (const k of Object.keys(groups)) {
        if (!groups[k]) continue;
        groups[k].visible = !!solo ? k === key : true;
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
    if (this.mode === "xray") this.xrayMat.uniforms.scan.value += dt * 0.35;
    if (this.section.on) {
      this.clipPlane.constant = this.section.cut;
      this._updateFillPlane();
    }
  }
};

// src/ui.js
init_core();
import * as THREE13 from "three";
var $ = (s, r = document) => r.querySelector(s);
var $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
var now = () => performance.now();
var store = {
  get(k, d) {
    try {
      const v = localStorage.getItem("tidal." + k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem("tidal." + k, JSON.stringify(v));
    } catch (e) {
    }
  }
};
var SHOTS = [
  { id: "hero", name: "鸟瞰", key: "1", target: [0, 14, 0], dist: 520, az: -1.32, el: 0.4 },
  { id: "north", name: "北向", key: "2", target: [0, 20, 0], dist: 420, az: Math.PI / 2, el: 0.2 },
  { id: "plaza", name: "广场", key: "3", target: [0, 8, 120], dist: 190, az: 1.62, el: 0.13 },
  { id: "inside", name: "场内", key: "4", target: [0, 4, 0], dist: 128, az: 1.1, el: 0.1 },
  { id: "roof", name: "屋盖", key: "5", target: [0, 48, 0], dist: 300, az: 0.42, el: 0.3 },
  { id: "corner", name: "角部", key: "6", target: [76, 26, 76], dist: 210, az: 0.82, el: 0.26 },
  { id: "detail", name: "细部", key: "7", target: [42, 12, 30], dist: 52, az: 0.9, el: 0.14 }
];
var INTRO = { target: new THREE13.Vector3(0, 20, 6), dist: 430, az: -1.16, el: 0.3 };
var LAYERS = [
  { id: "roof", name: "悬挑屋盖", color: "#b9c2cc" },
  { id: "structure", name: "结构骨架", color: "#8e99a6" },
  { id: "bowl", name: "看台核心体", color: "#c9a15f" },
  { id: "seats", name: "座椅阵列", color: "#d8b478" },
  { id: "concourse", name: "看台环廊", color: "#8fb6c4" },
  { id: "facade", name: "外立面", color: "#e0d8c8" },
  { id: "interior", name: "室内空间", color: "#a68fc4" },
  { id: "pitch", name: "比赛场地", color: "#5fbf8a" },
  { id: "glow", name: "灯带光效", color: "#6fd3e0" },
  { id: "site", name: "周边配套", color: "#7d8b78" }
];
var QUESTS = [
  { id: "q1", ico: "探索", name: "抵达球迷广场南入口", score: 20, desc: "进入漫游后走向南侧广场主轴" },
  { id: "q2", ico: "探索", name: "穿过入口门厅进入场馆", score: 20, desc: "经主入口券洞进入门厅" },
  { id: "q3", ico: "容量", name: "阅读三次看台容量分布", score: 30, desc: "点击容量仪表的层条与分区格" },
  { id: "q4", ico: "疏散", name: "完成一次 8 万人疏散演练", score: 30, desc: "疏散面板点击开始演练" },
  { id: "q5", ico: "建造", name: "拖动建造时间轴走完 5 阶段", score: 30, desc: "建造面板滑杆由 0 推到 100%" },
  { id: "q6", ico: "摄影", name: "在照片模式保存一张照片", score: 40, desc: "C 进入照片模式后保存 PNG" }
];
var BUILD = [
  { at: 0, name: "01 基础与场地", desc: "场地平整、环形挡墙与混凝土基座浇筑" },
  { at: 20, name: "02 看台与环廊", desc: "三层预制看台阶梯与环形楼板逐层吊装" },
  { at: 45, name: "03 屋盖与结构", desc: "八根潮柱落位，径向桁架悬挑合拢" },
  { at: 70, name: "04 立面与室内", desc: "潮线幕墙、灯带与室内大厅、包厢封闭" },
  { at: 92, name: "05 竣工", desc: "场地草坪、LED 广告板与灯桥调试完毕" }
];
function buildUI(ctx) {
  const { arena, sky, fx, orbit, walk, draft, stage: stage2, modes, env } = ctx;
  const reduceSys = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const S2 = {
    view: "persp",
    mat: "material",
    env: "night",
    exploded: 0,
    section: false,
    secPos: 0,
    walk: false,
    tour: false,
    story: false,
    photo: false,
    photoHide: false,
    score: 0,
    level: 1,
    xpMax: 120,
    quests: QUESTS.map((q) => ({ ...q, done: false })),
    badgesFound: 0,
    badgesTotal: 5,
    flow: { on: false, paused: false, mode: "heat", t: 0, out: 0, done: false, score: 0 },
    build: { v: 100, playing: false, phase: 4 },
    layer: {},
    solo: null,
    mobile: false,
    drawer: null,
    brief: false,
    sound: store.get("sound", false),
    reduceMotion: store.get("reduceMotion", reduceSys),
    quality: "high",
    autoQuality: store.get("autoQuality", true),
    hover: null,
    sel: null,
    mmT: 0,
    hudT: 0,
    hud2T: 0,
    capShown: 0,
    gq: { tier: 0, zone: 0 },
    qualityChecks: 0
  };
  LAYERS.forEach((L) => S2.layer[L.id] = { on: true, solo: false });
  if (S2.reduceMotion) document.body.classList.add("reduce-motion");
  function setText(el, v) {
    if (!el) return false;
    const s = String(v);
    if (el._v === s) return false;
    el._v = s;
    el.textContent = s;
    return true;
  }
  function setHTML(el, v) {
    if (!el) return false;
    if (el._h === v) return false;
    el._h = v;
    el.innerHTML = v;
    return true;
  }
  function setAttr(el, k, v) {
    if (!el) return;
    const key = "_a_" + k;
    if (el[key] === v) return;
    el[key] = v;
    el.setAttribute(k, v);
  }
  function setOn(el, on, cls = "on") {
    if (!el) return;
    el.classList.toggle(cls, !!on);
    if (el.hasAttribute("aria-pressed")) setAttr(el, "aria-pressed", on ? "true" : "false");
  }
  const liveEl = $("#srLive");
  let liveLast = "";
  function say(msg) {
    if (!liveEl || !msg || msg === liveLast) return;
    liveLast = msg;
    liveEl.textContent = msg;
  }
  const motionOK = () => !S2.reduceMotion && !document.body.classList.contains("reduce-motion");
  function game() {
    const g = window.__game;
    return g && Array.isArray(g.missions) ? g : null;
  }
  function unlocked(key) {
    const g = window.__game;
    if (!g) return true;
    if (typeof g.unlocked === "function") {
      try {
        return !!g.unlocked(key);
      } catch (e) {
        return true;
      }
    }
    return true;
  }
  const BADGE_DEFS = [
    { id: "b1", name: "南入口徽章", pos: [0, 2.2, GEO.outerS + 22], desc: "球迷广场主轴" },
    { id: "b2", name: "一层环廊徽章", pos: [0, 14.4, GEO.outerS - 46], desc: "一层环廊" },
    { id: "b3", name: "场地中圈徽章", pos: [0, 1.9, 0], desc: "场地中圈" },
    { id: "b4", name: "包厢层徽章", pos: [0, 26.2, 62], desc: "贵宾包厢层" },
    { id: "b5", name: "屋盖桁架徽章", pos: [0, 60, -40], desc: "屋盖结构" }
  ];
  const badgeGroup = new THREE13.Group();
  badgeGroup.name = "BADGES";
  stage2.scene.add(badgeGroup);
  const badgeGeo = new THREE13.OctahedronGeometry(0.55, 0);
  const badgeMat = new THREE13.MeshBasicMaterial({ color: 16765562, transparent: true, opacity: 0.95, toneMapped: false });
  const ringGeo = new THREE13.TorusGeometry(1, 0.045, 6, 40);
  const badgeMap = /* @__PURE__ */ new Map();
  BADGE_DEFS.forEach((b) => {
    const g = new THREE13.Group();
    g.add(new THREE13.Mesh(badgeGeo, badgeMat));
    const ring = new THREE13.Mesh(ringGeo, badgeMat);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    g.position.set(...b.pos);
    g.userData = b;
    badgeGroup.add(g);
    badgeMap.set(b.id, { def: b, obj: g, taken: false });
  });
  function badgeSource() {
    const ext = window.__badges;
    if (ext && Array.isArray(ext.list) && ext.list.length) {
      return ext.list.map((b) => ({
        id: b.id,
        name: b.name,
        desc: b.desc || "",
        zone: b.zone || "",
        obj: b.obj || null,
        pos: b.obj && b.obj.position ? b.obj.position.toArray() : b.pos || [0, 0, 0],
        taken: !!b.taken
      }));
    }
    return Array.from(badgeMap.values()).map((b) => ({
      id: b.def.id,
      name: b.def.name,
      desc: b.def.desc || "",
      zone: "",
      obj: b.obj,
      pos: b.obj.position.toArray(),
      taken: b.taken
    }));
  }
  const gameOwnsBadges = () => {
    const ext = window.__badges;
    return !!(ext && Array.isArray(ext.list) && ext.list.length);
  };
  const questList = $("#questList");
  const badgeRow = $("#badgeRow");
  function renderQuests(items) {
    questList.innerHTML = "";
    items.forEach((q, i) => {
      const d = document.createElement("div");
      const active = !q.done && items.findIndex((x) => !x.done) === i;
      d.className = "q" + (q.done ? " done" : active ? " active" : "");
      d.setAttribute("role", q.done ? "listitem" : "listitem");
      d.setAttribute("aria-label", `${q.done ? "已完成" : "未完成"}：${q.name}`);
      d.innerHTML = `<i class="bx" aria-hidden="true">✓</i><span class="tx">${q.name}</span><b class="rl">+${q.reward ?? q.score}</b>`;
      questList.appendChild(d);
    });
  }
  syncQuestsFromGame(true);
  function syncQuestsFromGame(force) {
    const g = game();
    if (g) {
      S2.quests = g.missions.map((m) => ({
        id: m.id,
        name: m.name,
        desc: m.desc,
        score: m.reward || 0,
        reward: m.reward,
        done: !!m.done
      }));
      S2.score = g.xp || 0;
      S2.level = g.level || 1;
    }
    renderQuests(S2.quests);
    updateQuestStats();
    if (badgeRow && !badgeRow.children.length) {
      for (let i = 0; i < 5; i++) badgeRow.appendChild(document.createElement("i"));
    }
    syncBadgeRow();
  }
  function updateQuestStats() {
    const done = S2.quests.filter((q) => q.done).length;
    const total = S2.quests.length || 6;
    const pct = total ? done / total : 0;
    setText($("#questPct"), `${done}/${total}`);
    $("#ringArc") && $("#ringArc").style.setProperty("stroke-dashoffset", String(157.1 * (1 - pct)));
    setHTML($("#ringNum"), `${Math.round(pct * 100)}<em>%</em>`);
    setHTML($("#qDone"), `${done}<em>/${total} 完成</em>`);
    const next = S2.quests.find((q) => !q.done);
    setText($("#qNext"), next ? "下一目标：" + next.name : "全部任务已完成 ✦");
  }
  function syncXPFromGame() {
    const g = game();
    if (!g) return;
    setXP(g.xp || 0, g.level || 1);
  }
  function setXP(score, level) {
    S2.score = score;
    S2.level = level;
    const lv = Math.max(1, level);
    const xpMax = 120;
    const inLv = clamp(score - (lv - 1) * 120, 0, 120);
    setText($("#lvNum"), lv);
    setHTML($("#xpVal"), String(Math.round(inLv)));
    setText($("#xpMax"), String(xpMax));
    setText($("#xpPct"), Math.round(inLv / xpMax * 100) + "%");
    const fill = $("#xpFill");
    if (fill) fill.style.width = inLv / xpMax * 100 + "%";
  }
  function syncBadgeRow() {
    if (!badgeRow) return;
    const taken = badgeSource().filter((b) => b.taken).length;
    S2.badgesFound = taken;
    Array.from(badgeRow.children).forEach((el, i) => el.classList.toggle("on", i < S2.badgesFound));
    badgeRow.setAttribute("aria-label", `建筑徽章 ${S2.badgesFound}/${S2.badgesTotal}`);
  }
  const codexList = $("#codexList");
  const codexBox = $("#codexBox");
  const codexCount = $("#cxCount");
  const codexLock = $("#cxLock");
  let codexBuilt = false;
  function syncCodex() {
    const ins = window.__insights;
    if (!ins || !codexList) return;
    const open = unlocked("codex");
    if (codexBox) codexBox.classList.toggle("locked", !open);
    if (!codexBuilt) {
      codexList.innerHTML = "";
      ins.list.forEach((d, i) => {
        const row = document.createElement("div");
        row.className = "cxi";
        row.dataset.id = d.id;
        row.innerHTML = `<span class="n">${String(i + 1).padStart(2, "0")}</span>
          <span class="b"><span class="t">${d.name}<em>${d.zone}</em></span>
          <span class="f">${d.fact}</span></span>`;
        codexList.appendChild(row);
      });
      codexBuilt = true;
    }
    ins.list.forEach((d, i) => {
      const row = codexList.children[i];
      if (!row) return;
      row.classList.toggle("got", open && !!d.got);
      row.classList.toggle("found", !open && !!d.got);
    });
    if (codexCount) setText(codexCount, `${ins.found}/${ins.total}`);
    if (codexLock) {
      const g = game();
      setText(codexLock, open ? "" : `达到 Lv.5 解锁图鉴讲解 · 当前 Lv.${g?.level ?? 1} · 已收录 ${ins.found}/${ins.total}（每处 +16 积分）`);
    }
  }
  document.addEventListener("insight:found", () => syncCodex());
  document.addEventListener("game:changed", () => syncCodex());
  function addScore(n, why) {
    const g = game();
    if (g && g.addXP) {
      g.addXP(n);
      const xp = g.xp || 0;
      if ((g.level || 1) > S2.level) showLevelUp(g.level);
      setXP(xp, g.level || 1);
      return;
    }
    S2.score += n;
    const lv = 1 + Math.floor(S2.score / 120);
    if (lv > S2.level) {
      S2.level = lv;
      showLevelUp(lv, why);
    }
    setXP(S2.score, S2.level);
  }
  function completeQuest(id) {
    const g = game();
    if (g && g.complete) {
      g.complete(id);
      return;
    }
    const q = S2.quests.find((x) => x.id === id);
    if (!q || q.done) return;
    q.done = true;
    renderQuests(S2.quests);
    updateQuestStats();
    toast("任务完成", q.name + ` · +${q.score} 积分`, "gold");
    say("任务完成：" + q.name);
    addScore(q.score, "完成探索任务");
  }
  function showLevelUp(lv, why) {
    const el = $("#levelUp");
    if (!el) return;
    setText($("#luLv"), lv);
    el.classList.add("on");
    toast("等级提升", `已升至 Lv.${lv} · ${why || "探索者"}`, "gold");
    say(`等级提升到 ${lv} 级`);
    if (fx && fx.flash && motionOK()) fx.flash("#f0d9ae", 0.25);
    setTimeout(() => el.classList.remove("on"), 2200);
  }
  function toast(title, body, kind = "gold") {
    const wrap = $("#toastWrap");
    if (!wrap) return;
    const el = document.createElement("div");
    const k = kind === "·" ? "plain" : kind === "✦" ? "gold" : kind || "gold";
    el.className = "toast " + (k === "plain" || k === "gold" || k === "green" || k === "red" ? k : "gold");
    el.setAttribute("role", "status");
    const icon = k === "plain" ? "▸" : k === "green" ? "✦" : "✦";
    el.innerHTML = `<span class="ti" aria-hidden="true">${icon}</span>
      <span class="tt"><b></b>${body ? "<span></span>" : ""}</span>`;
    el.querySelector("b").textContent = title;
    if (body) el.querySelector(".tt span").textContent = body;
    wrap.appendChild(el);
    while (wrap.children.length > 3) wrap.firstChild.remove();
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 420);
    }, 3200);
  }
  const capTotal = MODEL.total;
  setText($("#roSeat"), fmt(capTotal));
  $("#roSeat") && $("#roSeat").classList.add("hot");
  setText($("#roTier"), MODEL.tiers.length);
  setText($("#roZone"), MODEL.zones.length);
  setText($("#roRow"), MODEL.rows);
  setText($("#capNum"), fmt(capTotal));
  setText($("#capSub"), `${MODEL.tiers.length} 层看台 · ${MODEL.rows} 排 · ${ZONES} 区/层`);
  setText($("#abRows"), `三层看台 ${MODEL.rows} 排 + 3 层环廊 + 包厢层，屋盖径向桁架悬挑`);
  setText($("#abSeat"), `观众席 ${fmt(capTotal)} 座，逐排逐区精确统计（MODEL 同源）`);
  setText($("#flLeft"), fmt(capTotal));
  setText($("#cxWheel"), 120);
  setText($("#cxVip"), 768);
  setText($("#cxPress"), 320);
  const tierBars = $("#tierBars");
  const maxTier = Math.max(...MODEL.tiers.map((t) => t.total));
  MODEL.tiers.forEach((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tb";
    b.setAttribute("aria-label", `${t.name} 座位数 ${fmt(t.total)}，点击定位`);
    b.innerHTML = `<span class="nm">${t.name}</span>
      <span class="bar"><i style="background:linear-gradient(90deg,${t.color},${t.color}88)"></i></span>
      <span class="vl">${fmt(t.total)}</span>`;
    tierBars.appendChild(b);
    requestAnimationFrame(() => {
      b.querySelector("i").style.width = t.total / maxTier * 100 + "%";
    });
    b.addEventListener("click", () => focusTier(t));
  });
  const czGrid = $("#czGrid");
  const czCells = [];
  MODEL.tiers.forEach((t) => {
    t.zones.forEach((z) => {
      const c = document.createElement("button");
      c.type = "button";
      c.className = "cz";
      const k = z.seats / 1400;
      c.style.background = `rgba(232,192,122,${(0.1 + clamp(k, 0, 1) * 0.62).toFixed(3)})`;
      c.setAttribute("aria-label", `${z.name}：${fmt(z.seats)} 座`);
      c.title = `${z.name}：${fmt(z.seats)} 座`;
      c.addEventListener("click", () => {
        czCells.forEach((x) => x.classList.remove("on"));
        c.classList.add("on");
        focusZone(z);
        readCapacity();
      });
      czGrid.appendChild(c);
      czCells.push(c);
    });
  });
  function rollCap(from, to, dur = 900) {
    const el = $("#capNum");
    if (!el) return;
    if (!motionOK() || !S2.capAnim) {
      setText(el, fmt(to));
      return;
    }
    const t0 = now();
    S2.capAnim = false;
    const step2 = () => {
      const k = clamp((now() - t0) / dur, 0, 1);
      setText(el, fmt(Math.round(lerp(from, to, easeInOut(k)))));
      if (k < 1) requestAnimationFrame(step2);
    };
    requestAnimationFrame(step2);
  }
  function focusTier(t) {
    stopWalk();
    orbit.set({ target: new THREE13.Vector3(0, t.y0 + (t.endY - t.y0) * 0.5, 0), dist: 300 + (t.s0 + t.endS) / 2 * 1.2, el: 0.34 });
    goShot(null);
    toast(t.name, `${fmt(t.total)} 座 · ${t.rows.length} 排 × ${ZONES} 区`, "plain");
    readCapacity();
  }
  function focusZone(z) {
    stopWalk();
    const a = (z.u0 + z.u1) / 2 * Math.PI * 2 - Math.PI / 2;
    const t = MODEL.tiers.find((x) => x.id === z.tier);
    const rr = 34 + (t.s0 + t.endS) / 2;
    goShot(null);
    orbit.set({
      target: new THREE13.Vector3(Math.cos(a) * rr * 0.55, (t.y0 + t.endY) / 2, Math.sin(a) * rr * 0.55),
      dist: 200,
      az: a + Math.PI,
      el: 0.3
    });
    toast(z.name, `${fmt(z.seats)} 座 · 每排 ${Math.floor(z.seats / Math.max(1, t.rows.length))} 席`, "plain");
    say(`${z.name} ${fmt(z.seats)} 座`);
  }
  function readCapacity() {
    const key = S2.gq.tier + ":" + S2.gq.zone;
    if (S2._lastCap === key) return;
    S2._lastCap = key;
    S2._capReads = (S2._capReads || 0) + 1;
    if (S2._capReads >= 3) completeQuest("q3");
  }
  const rowTable = $("#rowTable");
  const btnRows = $("#btnRows");
  btnRows.addEventListener("click", () => {
    const open = rowTable.hidden;
    rowTable.hidden = !open;
    setAttr(btnRows, "aria-expanded", open ? "true" : "false");
    setText(btnRows, open ? "收起逐排表 ▴" : "展开逐排表 ▾");
    if (open && !rowTable._built) {
      rowTable._built = true;
      let html = '<div class="rt-scroll"><table class="rt-table"><thead><tr><th>排号</th><th>每区</th><th>该排</th><th>前缘 s</th><th>标高</th></tr></thead><tbody>';
      MODEL.tiers.forEach((t) => {
        html += `<tr class="tierhead"><td colspan="5">${t.name} · ${t.rows.length} 排 · ${fmt(t.total)} 座</td></tr>`;
        t.rows.forEach((r) => {
          html += `<tr><td>R${String(r.k + 1).padStart(2, "0")}</td><td>${r.perZone}</td><td>${fmt(r.n)}</td><td>${r.sFront.toFixed(2)}</td><td${r.aisle ? ' class="ai"' : ""}>${r.y.toFixed(2)}${r.aisle ? " ·走道" : ""}</td></tr>`;
        });
      });
      html += "</tbody></table></div>";
      rowTable.innerHTML = html;
    }
  });
  const flowBtn = $("#btnFlow");
  const flowPause = $("#btnFlowPause");
  const flowReset = $("#btnFlowReset");
  const heat = new THREE13.Group();
  heat.name = "FLOW";
  heat.visible = false;
  stage2.scene.add(heat);
  const heatMeshes = [];
  let heatBuilt = false;
  function buildHeat() {
    if (heatBuilt) return;
    heatBuilt = true;
    const N = 96;
    MODEL.tiers.forEach((t) => {
      const rows = t.rows.length;
      const pos = [], col = [], idx = [];
      for (let i = 0; i <= N; i++) for (let r = 0; r < rows; r++) {
        const row = t.rows[r];
        const u = i / N;
        const a = u * Math.PI * 2 - Math.PI / 2;
        const rr = 34 + row.sFront + 0.4;
        pos.push(Math.cos(a) * (rr + 1), row.y + 1, Math.sin(a) * (rr + 1));
        col.push(1, 0.45, 0.28);
      }
      for (let i = 0; i < N; i++) for (let r = 0; r < rows - 1; r++) {
        const a0 = i * rows + r, a1 = (i + 1) * rows + r;
        idx.push(a0, a1, a0 + 1, a0 + 1, a1, a1 + 1);
      }
      const g = new THREE13.BufferGeometry();
      g.setAttribute("position", new THREE13.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE13.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      const m = new THREE13.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        side: THREE13.DoubleSide,
        depthWrite: false,
        toneMapped: false
      });
      const mesh = new THREE13.Mesh(g, m);
      heat.add(mesh);
      heatMeshes.push(mesh);
    });
  }
  function evacApi() {
    const e = window.__evac;
    return e && typeof e === "object" ? e : null;
  }
  function flowState() {
    const e = evacApi();
    if (e) {
      return {
        out: e.evacuated || 0,
        total: e.total || capTotal,
        t: e.elapsed || 0,
        run: !!e.running,
        paused: !!e.paused,
        done: !!e.done || e.evacuated >= (e.total || capTotal) && !!e.elapsed,
        score: e.score
      };
    }
    return {
      out: S2.flow.out,
      total: capTotal,
      t: S2.flow.t,
      run: S2.flow.on,
      paused: S2.flow.paused,
      done: S2.flow.done,
      score: S2.flow.score
    };
  }
  function startFlow() {
    const e = evacApi();
    if (e && typeof e.start === "function") {
      e.start();
      toast("疏散演练开始", "点击出口调度 · 12 组人力 · 150 秒时限", "plain");
      return;
    }
    if (e) {
      e.running = true;
      e.paused = false;
      return;
    }
    if (S2.flow.done || !S2.flow.t) {
      S2.flow.t = 0;
      S2.flow.out = 0;
      S2.flow.done = false;
      S2.flow.score = 0;
    }
    S2.flow.on = true;
    S2.flow.paused = false;
    buildHeat();
    setFlowMode();
    toast("疏散演练开始", "按 60 分区 / 12 个出口模拟人流", "plain");
    say("疏散演练开始");
  }
  function pauseFlow() {
    const e = evacApi();
    if (e && typeof e.pause === "function") {
      e.pause();
      return;
    }
    if (e) {
      e.paused = !e.paused;
      return;
    }
    S2.flow.paused = !S2.flow.paused;
    setText($("#flowPct"), S2.flow.paused ? "已暂停" : "进行中");
  }
  function resetFlow() {
    const e = evacApi();
    if (e && typeof e.reset === "function") {
      e.reset();
      return;
    }
    if (e) {
      e.running = false;
      e.elapsed = 0;
      e.evacuated = 0;
      e.done = false;
      return;
    }
    S2.flow.on = false;
    S2.flow.paused = false;
    S2.flow.t = 0;
    S2.flow.out = 0;
    S2.flow.done = false;
    S2.flow.score = 0;
    heatMeshes.forEach((m) => m.material.opacity = 0);
  }
  function setFlowMode() {
    const heatOn = S2.flow.mode === "heat";
    setOn($("#btnFlowMode"), heatOn);
    heat.visible = heatOn;
    if (heatOn && S2.flow.t > 0) buildHeat();
  }
  const exitGrid = $("#exitGrid");
  const quadRow = $("#quadRow");
  const teamFill = $("#teamFill");
  const teamTxt = $("#teamTxt");
  const bcLeft = $("#bcLeft");
  const flowGrade = $("#flowGrade");
  const flowFin = $("#flowFin");
  const X_SHORT = { P1: "北门", P2: "东门", P3: "南门", P4: "西门" };
  const xBtns = /* @__PURE__ */ new Map();
  const quadBars = [];
  function buildDispatch(exits) {
    if (!exitGrid || !exits || !exits.length) return;
    if (xBtns.size === exits.length) return;
    exitGrid.innerHTML = "";
    xBtns.clear();
    exits.forEach((e) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "xbtn" + (e.kind === "main" ? " main" : "");
      b.dataset.exit = e.id;
      const label = X_SHORT[e.id] || "次门 " + e.id.replace("S", "");
      b.innerHTML = `<i class="xd" aria-hidden="true"></i><span class="xn">${label}</span><span class="xs">${e.cost} 组</span>`;
      b.title = `${e.name} · 需 ${e.cost} 组人力 · 通过能力 ${e.cap} 人/秒`;
      b.setAttribute("aria-label", b.title);
      b.addEventListener("click", () => {
        const api2 = evacApi();
        if (api2 && api2.toggleExit) api2.toggleExit(e.id);
        else toast("调度台未就绪", "游戏层加载完成后可用", "plain");
      });
      exitGrid.appendChild(b);
      xBtns.set(e.id, b);
    });
    if (quadRow && !quadBars.length) {
      quadRow.innerHTML = "";
      ["北", "东", "南", "西"].forEach((n) => {
        const d = document.createElement("div");
        d.className = "quad";
        d.innerHTML = `<span class="ql">${n}</span><span class="qb"><i></i></span>`;
        quadRow.appendChild(d);
        quadBars.push(d.querySelector("i"));
      });
    }
  }
  function syncDispatch() {
    const e = evacApi();
    if (!e || !e.exits || !e.exits.length) return;
    buildDispatch(e.exits);
    const ex = e.exits;
    ex.forEach((x) => {
      const b = xBtns.get(x.id);
      if (!b) return;
      const swapping = x.swapT > 0;
      b.classList.toggle("on", x.open && !swapping);
      b.classList.toggle("hot", x.open && x.cong > 0.66);
      b.classList.toggle("swap", swapping);
      b.disabled = !x.open && e.teams + x.cost > e.teamMax;
      const s = b.querySelector(".xs");
      if (s) s.textContent = swapping ? `调配 ${Math.ceil(x.swapT)}s` : x.open ? `排队 ${Math.round(x.wait)}s` : `${x.cost} 组人力`;
      b.setAttribute("aria-pressed", x.open ? "true" : "false");
    });
    if (teamFill) teamFill.style.width = (e.teams / Math.max(1, e.teamMax) * 100).toFixed(0) + "%";
    if (teamTxt) setText(teamTxt, `${e.teams}/${e.teamMax}`);
    const tm = teamFill && teamFill.parentElement;
    if (tm) tm.classList.toggle("full", e.teams >= e.teamMax);
    if (bcLeft) setText(bcLeft, String(e.broadcastLeft));
    const bb = $("#btnBroadcast");
    if (bb) {
      bb.disabled = e.broadcastLeft <= 0 || !unlocked("broadcast");
      bb.title = unlocked("broadcast") ? "对最拥堵分区临时疏导（限 3 次）" : "达到 Lv.4 解锁「应急广播」";
    }
    if (flowGrade) setText(flowGrade, "评级 " + (e.grade || "—"));
    if (flowFin) setText(flowFin, e.finishReason ? `${e.finishReason} · 峰值拥堵 ${Math.round((e.peak || 0) * 100)}%` : "");
    const q = [0, 0, 0, 0];
    ex.forEach((x) => {
      const qi = Math.round(x.u * 4) % 4;
      q[qi] += x.open ? x.load : 0;
    });
    const mx = Math.max(1, ...q);
    for (let i = 0; i < 4; i++) {
      const bar = quadBars[i];
      if (!bar) continue;
      const v = q[i] / mx;
      bar.style.width = (v * 100).toFixed(0) + "%";
      bar.style.background = v > 0.66 ? "#e2603f" : v > 0.33 ? "#e0a94b" : "#5fbf8a";
    }
  }
  const bbBtn = $("#btnBroadcast");
  bbBtn && bbBtn.addEventListener("click", () => {
    if (!unlocked("broadcast")) {
      toast("应急广播未解锁", "达到 Lv.4 解锁「应急广播」", "plain");
      return;
    }
    const api2 = evacApi();
    if (!api2 || !api2.broadcast) {
      toast("调度台未就绪", "游戏层加载完成后可用", "plain");
      return;
    }
    api2.broadcast();
  });
  document.addEventListener("evac:changed", () => {
    syncDispatch();
  });
  flowBtn.addEventListener("click", () => {
    const st = flowState();
    if (st.run && !st.paused) pauseFlow();
    else startFlow();
  });
  flowPause && flowBtn;
  flowPause.addEventListener("click", () => pauseFlow());
  flowReset.addEventListener("click", () => {
    resetFlow();
    toast("演练已重置", "全部观众回到初始分布", "plain");
  });
  $("#btnFlowMode").addEventListener("click", () => {
    S2.flow.mode = S2.flow.mode === "heat" ? "none" : "heat";
    setFlowMode();
  });
  $("#btnFlowView").addEventListener("click", (e) => {
    const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
    setOn(e.currentTarget, on);
    if (on) {
      goShot(null);
      setView("plan");
    } else setView("persp");
  });
  function updateFlow(dt) {
    const st = flowState();
    const e = evacApi();
    if (!e) {
      if (S2.flow.on && !S2.flow.paused) {
        S2.flow.t += dt;
        const T = 46;
        const p = clamp(S2.flow.t / T, 0, 1);
        S2.flow.out = Math.floor(capTotal * easeInOut(p));
        if (p >= 1) {
          S2.flow.on = false;
          S2.flow.done = true;
          S2.flow.score = Math.max(60, Math.round(100 - S2.flow.t * 0.4));
          completeQuest("q4");
          toast("疏散完成", `${fmt(capTotal)} 人 · 用时 ${Math.floor(S2.flow.t)}″ · 评分 ${S2.flow.score}`, "green");
          say("疏散演练完成");
        }
      }
      if (!S2.flow.on && S2.flow.t > 0 && !S2.flow.done) {
      }
    } else if (e.done && !S2.flow.done) {
      S2.flow.done = true;
      completeQuest("q4");
      toast("疏散完成", `${fmt(e.evacuated || capTotal)} 人 · 评分 ${e.score ?? "—"}`, "green");
    }
    if (heatMeshes.length) {
      const active = st.run || st.t > 0;
      const p = clamp(st.out / Math.max(1, st.total), 0, 1);
      const target = active ? 0.42 : 0;
      heatMeshes.forEach((m) => {
        m.material.opacity = lerp(m.material.opacity, target, Math.min(1, dt * 2.2));
      });
      if (active && S2.flow.mode === "heat") {
        const col = new THREE13.Color();
        heatMeshes.forEach((m, ti) => {
          const attr = m.geometry.getAttribute("color");
          const rows = MODEL.tiers[ti].rows.length;
          const N = 96;
          for (let i = 0; i <= N; i++) {
            const u = i / N;
            const ee = clamp(p * 1.35 - Math.abs(u - 0.5) * 0.35, 0, 1);
            col.setHSL(0.02 + ee * 0.3, 0.82, 0.55);
            for (let r = 0; r < rows; r++) {
              const k = i * rows + r;
              attr.setXYZ(k, col.r, col.g, col.b);
            }
          }
          attr.needsUpdate = true;
        });
      }
    }
  }
  const perspCam = stage2.camera;
  function setMat(m) {
    S2.mat = m;
    modes.setMode(m);
    $$("#segMat button").forEach((b) => {
      const on = b.dataset.mat === m;
      b.classList.toggle("on", on);
      setAttr(b, "aria-pressed", on ? "true" : "false");
    });
    setText($("#matName"), { material: "材质", white: "白模", xray: "X 光" }[m] || "材质");
    say("表达方式：" + ({ material: "材质渲染", white: "白模", xray: "X 光" }[m] || m));
  }
  function setExplode(v) {
    const val = clamp(v, 0, 1);
    S2.exploded = val;
    modes.setExplode(val);
    const pct = Math.round(val * 100);
    const rg = $("#rgExplode");
    if (rg && +rg.value !== pct) rg.value = pct;
    setText($("#exVal"), pct + "%");
  }
  function setSection(on, cut) {
    S2.section = !!on;
    if (cut != null) S2.secPos = cut;
    modes.setSection(S2.section, new THREE13.Vector3(0, 0, -1), S2.secPos);
    setOn($("#btnSecToggle"), S2.section);
    setText($("#btnSecToggle"), S2.section ? "关闭剖切（X）" : "开启剖切（X）");
    const rg = $("#rgSection");
    if (rg && +rg.value !== S2.secPos) rg.value = S2.secPos;
    setText($("#secVal"), String(Math.round(S2.secPos)));
  }
  const AUTO_HIDE = { plan: ["roof"], front: [], left: [], section: [] };
  function lyOn(id) {
    const st = S2.layer[id];
    return st ? st.on : true;
  }
  function setView(v, byUser = true) {
    S2.view = v;
    const key = { persp: "persp", plan: "plan", front: "front", left: "left", section: "section", pitch: "persp" }[v] || "persp";
    if (key === "persp") {
      stage2.camera = perspCam;
      fx.setDraft(false);
    } else {
      stage2.camera = draft.get(key);
      draft.fit();
      fx.setDraft(true);
      fx.setDraftCamera(stage2.camera);
    }
    $$("#gridView button").forEach((b) => {
      const on = b.dataset.view === v;
      b.classList.toggle("on", on);
      setAttr(b, "aria-pressed", on ? "true" : "false");
    });
    if (byUser) orbit.enabled = key === "persp";
    const hide = AUTO_HIDE[v] || [];
    const roofG = arena.groups.roof;
    if (roofG && S2.layer.roof) {
      const anySolo = Object.values(S2.layer).some((x) => x.solo);
      const roofVis = anySolo ? S2.layer.roof.solo : S2.layer.roof.on;
      roofG.visible = key === "persp" ? roofVis : !hide.includes("roof") && roofVis;
    }
    say("相机视图：" + ({ persp: "透视", plan: "俯视", front: "正立", left: "侧立", section: "剖面", pitch: "场内" }[v] || v));
  }
  $("#segMat").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    setMat(b.dataset.mat);
  });
  $("#gridView").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    goShot(null);
    setView(b.dataset.view);
    if (b.dataset.view === "section") setSection(true);
  });
  $("#rgExplode").addEventListener("input", (e) => setExplode(+e.target.value / 100));
  $("#rgSection").addEventListener("input", (e) => setSection(S2.section, +e.target.value));
  $("#btnSecToggle").addEventListener("click", () => setSection(!S2.section));
  const layerList = $("#layerList");
  function buildLayers() {
    layerList.innerHTML = "";
    LAYERS.forEach((L) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ly on";
      b.dataset.id = L.id;
      b.setAttribute("aria-pressed", "true");
      b.setAttribute("aria-label", `图层 ${L.name}，点击显隐，双击孤立`);
      b.innerHTML = `<i class="sw" style="background:${L.color}" aria-hidden="true"></i><span class="nm">${L.name}</span><i class="eyes" aria-hidden="true"></i>`;
      b.addEventListener("click", () => {
        const st = S2.layer[L.id];
        st.on = !st.on;
        applyLayers();
        say(`${L.name} ${st.on ? "显示" : "隐藏"}`);
      });
      b.addEventListener("dblclick", () => {
        const anySolo = Object.values(S2.layer).some((x) => x.solo);
        Object.keys(S2.layer).forEach((k) => S2.layer[k].solo = anySolo ? false : k === L.id);
        applyLayers();
        toast(anySolo ? "退出孤立" : "孤立查看", anySolo ? "恢复全部图层" : L.name, "plain");
      });
      b.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        S2.layer[L.id].on = false;
        applyLayers();
        toast("已隐藏图层", L.name, "plain");
      });
      layerList.appendChild(b);
    });
  }
  function applyLayers() {
    const anySolo = Object.values(S2.layer).some((x) => x.solo);
    let onCount = 0;
    LAYERS.forEach((L) => {
      const st = S2.layer[L.id];
      const vis = anySolo ? st.solo : st.on;
      if (vis) onCount++;
      const g = arena.groups && arena.groups[L.id];
      if (g) g.visible = vis;
      if (L.id === "structure" && arena.groups && !arena.groups.structure && arena.groups.roof) {
      }
      const el = layerList.querySelector(`.ly[data-id="${L.id}"]`);
      if (el) {
        el.classList.toggle("on", st.on);
        el.classList.toggle("off", !st.on);
        el.classList.toggle("solo", !!st.solo);
        setAttr(el, "aria-pressed", vis ? "true" : "false");
      }
    });
    setText($("#layerCount"), `${onCount}/${LAYERS.length}`);
    if (env && env.root) env.root.visible = (anySolo ? S2.layer.site.solo : S2.layer.site.on) !== false;
  }
  function setLayer(id, v, solo) {
    if (!S2.layer[id]) S2.layer[id] = { on: true, solo: false };
    if (solo != null) S2.layer[id].solo = !!solo;
    else S2.layer[id].on = !!v;
    applyLayers();
  }
  const rgBuild = $("#rgBuild");
  const buildStageEl = $("#buildStage");
  function buildApi() {
    const b = window.__build;
    return b && typeof b.setPhase === "function" ? b : null;
  }
  function applyBuild(v, silent) {
    S2.build.v = clamp(v, 0, 100);
    const p = S2.build.v / 100;
    const b = buildApi();
    if (b) {
      try {
        b.setPhase(p * 5);
      } catch (e) {
      }
    } else {
      modes.setExplode(1 - p);
      setExplode(1 - p);
    }
    let ph = 0;
    for (let i = 0; i < BUILD.length; i++) if (S2.build.v >= BUILD[i].at) ph = i;
    S2.build.phase = ph;
    Array.from(buildStageEl.children).forEach((el, i) => {
      el.classList.toggle("on", i === ph);
      setAttr(el, "aria-pressed", i === ph ? "true" : "false");
    });
    setText($("#buildVal"), Math.round(S2.build.v) + "%");
    setText($("#buildPct"), (ph === BUILD.length - 1 ? "竣工 " : "施工中 ") + Math.round(S2.build.v) + "%");
    setText($("#buildDesc"), BUILD[ph].name + " · " + BUILD[ph].desc);
    if (rgBuild && +rgBuild.value !== Math.round(S2.build.v)) rgBuild.value = Math.round(S2.build.v);
    if (!silent) {
      if (S2.build.v > 0) S2._buildMoved = true;
      if (S2._buildMoved && S2.build.v >= 99) completeQuest("q5");
    }
  }
  rgBuild.addEventListener("input", (e) => {
    S2.build.playing = false;
    setOn($("#btnBuildPlay"), false);
    applyBuild(+e.target.value);
  });
  buildStageEl.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-phase]");
    if (!b) return;
    const i = +b.dataset.phase;
    S2.build.playing = false;
    setOn($("#btnBuildPlay"), false);
    applyBuild(i === 0 ? 0 : BUILD[i].at + 8);
  });
  $("#btnBuildPlay").addEventListener("click", () => {
    S2.build.playing = !S2.build.playing;
    setOn($("#btnBuildPlay"), S2.build.playing);
    setText($("#btnBuildPlay"), S2.build.playing ? "❚❚ 暂停建造动画" : "▶ 播放建造动画");
    if (S2.build.playing && S2.build.v >= 99) applyBuild(0);
  });
  const shotList = $("#shotList");
  function buildShots(container) {
    container.innerHTML = "";
    SHOTS.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sh";
      b.dataset.id = s.id;
      b.setAttribute("aria-label", `机位 ${s.name}（快捷键 ${s.key}）`);
      b.innerHTML = `<b>${s.key}</b>${s.name}`;
      b.addEventListener("click", () => goShot(s.id));
      container.appendChild(b);
    });
  }
  buildShots(shotList);
  const sheet = document.createElement("div");
  sheet.className = "shotsheet";
  sheet.id = "shotSheet";
  sheet.setAttribute("aria-label", "机位选择");
  const sheetShots = document.createElement("div");
  sheetShots.className = "shots";
  sheetShots.style.cssText = "flex-wrap:wrap;justify-content:center;overflow:visible";
  buildShots(sheetShots);
  const sheetModes = document.createElement("div");
  sheetModes.className = "modes";
  sheetModes.innerHTML = `
    <button class="btn" data-mode="tour">导览</button>
    <button class="btn" data-mode="walk">漫游</button>
    <button class="btn" data-mode="story">建造逻辑</button>
    <button class="btn" data-mode="photo">照片</button>
    <button class="btn" data-mode="reset">复位</button>`;
  sheet.appendChild(sheetShots);
  sheet.appendChild(sheetModes);
  $("#hud").appendChild(sheet);
  sheetModes.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-mode]");
    if (!b) return;
    const m = b.dataset.mode;
    if (m === "tour") toggleTour();
    if (m === "walk") toggleWalk();
    if (m === "story") toggleStory();
    if (m === "photo") photoMode(true);
    if (m === "reset") resetAll();
    sheet.classList.remove("on");
  });
  const mask = document.createElement("div");
  mask.className = "pmask";
  $("#hud").appendChild(mask);
  mask.addEventListener("click", () => openPanel(null));
  function goShot(id) {
    if (!id) {
      $$(".sh").forEach((e) => {
        e.classList.remove("on");
        setAttr(e, "aria-pressed", "false");
      });
      return;
    }
    const s = SHOTS.find((x) => x.id === id);
    if (!s) return;
    stopWalk();
    setView(id === "hero" ? "persp" : id, false);
    orbit.stopAuto();
    S2.tour = false;
    setOn($("#btnTour"), false);
    orbit.set({ target: new THREE13.Vector3(...s.target), dist: s.dist, az: s.az, el: s.el });
    $$(".sh").forEach((e) => {
      const on = e.dataset.id === id;
      e.classList.toggle("on", on);
      setAttr(e, "aria-pressed", on ? "true" : "false");
    });
    say("机位：" + s.name);
  }
  function syncDay() {
    const d = window.__day;
    const btn = $("#btnMatch");
    const nm = $("#matchName");
    const tm = $("#matchTime");
    const dot = $("#matchDot");
    if (!d || !btn) return;
    const e = d.progress;
    btn.hidden = false;
    if (nm) setText(nm, e.name);
    if (tm) setText(tm, String((d.days || 0) + 1).padStart(2, "0"));
    if (dot) dot.style.background = e.accent;
    btn.style.setProperty("--match-accent", e.accent);
    setAttr(btn, "data-tip", `${e.en} · ${e.tip}　（点击进入下一时段）`);
    btn.classList.toggle("live", e.phase === "kickoff");
  }
  document.addEventListener("day:phase", syncDay);
  let dayBtnBound = false;
  function bindDay() {
    if (dayBtnBound) return;
    const btn = $("#btnMatch");
    if (!btn) return;
    dayBtnBound = true;
    btn.addEventListener("click", () => {
      const d = window.__day;
      if (!d) return;
      const from = d.progress;
      d.next(false);
      const to = d.progress;
      toast(`时段推进：${from.name} → ${to.name}`, to.tip, to.phase === "kickoff" ? "gold" : "plain");
    });
    syncDay();
  }
  let envTarget = "night";
  function setEnv(k) {
    if (!PRESETS[k]) return;
    S2.env = k;
    envTarget = k;
    setText($("#envName"), PRESETS[k].name);
    const dot = $("#envDot");
    if (dot) dot.className = "dot " + (k === "day" ? "day" : k === "dusk" ? "dusk" : "");
    setAttr($("#btnEnv"), "aria-label", "切换昼夜照明，当前" + PRESETS[k].name);
    say("照明：" + PRESETS[k].name);
  }
  function tickEnv(dt) {
    const target = PRESETS[envTarget];
    let maxd = 0;
    for (const k of Object.keys(target)) {
      const b = target[k];
      if (typeof b === "number") maxd = Math.max(maxd, Math.abs(b - preset[k]));
    }
    if (maxd < 1e-3) {
      lerpPreset(target, 1);
      return;
    }
    lerpPreset(target, Math.min(1, dt * 1.6));
  }
  function startWalk() {
    S2.walk = true;
    walk.start(new THREE13.Vector3(0, 2, 200));
    walk.yaw = Math.PI;
    walk.pitch = 0.02;
    orbit.enabled = false;
    $("#walkHint").classList.remove("hidden");
    setOn($("#btnWalk"), true);
    document.body.classList.add("walking");
    if (S2.mobile) showTouchLook(true);
    toast("进入漫游模式", S2.mobile ? "左侧摇杆移动 · 右侧拖动转头" : "W A S D 行走 · Shift 加速 · 鼠标转头", "plain");
    say("进入第一人称漫游");
  }
  function stopWalk() {
    if (!S2.walk) return;
    S2.walk = false;
    walk.stop();
    orbit.enabled = true;
    orbit.tTarget.set(0, 14, 0);
    orbit.tDist = 520;
    orbit.tAz = -1.32;
    orbit.tElv = 0.4;
    $("#walkHint").classList.add("hidden");
    setOn($("#btnWalk"), false);
    document.body.classList.remove("walking");
    showTouchLook(false);
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function toggleWalk() {
    S2.walk ? stopWalk() : startWalk();
  }
  walk.onExitKey = () => {
    if (S2.walk) stopWalk();
    else document.body.classList.remove("walking");
  };
  const joy = $("#joy"), joyKnob = $("#joyKnob"), touchLook = $("#touchLook");
  function showTouchLook(on) {
    if (!joy) return;
    const touch = (navigator.maxTouchPoints || 0) > 0;
    joy.hidden = !(on && touch);
    if (touchLook) touchLook.hidden = !(on && touch);
  }
  let joyVec = { x: 0, y: 0 };
  if (joy) {
    let activeId = null;
    const R = 34;
    const setJoy = (dx, dy) => {
      const len = Math.hypot(dx, dy);
      const k = len > R ? R / len : 1;
      joyKnob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
      joyVec.x = dx * k / R;
      joyVec.y = dy * k / R;
    };
    const c = () => {
      const r = joy.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    joy.addEventListener("pointerdown", (e) => {
      activeId = e.pointerId;
      joy.setPointerCapture(e.pointerId);
      const p = c();
      setJoy(e.clientX - p.x, e.clientY - p.y);
    });
    joy.addEventListener("pointermove", (e) => {
      if (activeId !== e.pointerId) return;
      const p = c();
      setJoy(e.clientX - p.x, e.clientY - p.y);
    });
    const end = (e) => {
      if (activeId !== e.pointerId) return;
      activeId = null;
      setJoy(0, 0);
    };
    joy.addEventListener("pointerup", end);
    joy.addEventListener("pointercancel", end);
  }
  if (touchLook) {
    let lookId = null, lx = 0, ly = 0;
    touchLook.addEventListener("pointerdown", (e) => {
      if (e.target !== touchLook) return;
      lookId = e.pointerId;
      lx = e.clientX;
      ly = e.clientY;
      touchLook.setPointerCapture(e.pointerId);
    });
    touchLook.addEventListener("pointermove", (e) => {
      if (lookId !== e.pointerId) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      if (walk && walk.active) {
        walk.yaw -= dx * 42e-4;
        walk.pitch = clamp(walk.pitch - dy * 42e-4, -1.35, 1.35);
        walk.touring = false;
      }
    });
    const endLook = (e) => {
      if (lookId === e.pointerId) lookId = null;
    };
    touchLook.addEventListener("pointerup", endLook);
    touchLook.addEventListener("pointercancel", endLook);
  }
  function applyJoy(dt) {
    if (!S2.walk || !joy || joy.hidden) return;
    if (Math.hypot(joyVec.x, joyVec.y) < 0.12) return;
    const sp = 9.5 * dt;
    const fz = -joyVec.y, fx2 = joyVec.x;
    const sinY = Math.sin(walk.yaw), cosY = Math.cos(walk.yaw);
    walk.pos.x += (fz * sinY + fx2 * cosY) * sp;
    walk.pos.z += (fz * cosY - fx2 * sinY) * sp;
    walk.touring = false;
  }
  function toggleTour() {
    S2.tour = !S2.tour;
    setOn($("#btnTour"), S2.tour);
    const sb = sheetModes.querySelector('[data-mode="tour"]');
    sb && sb.classList.toggle("on", S2.tour);
    if (S2.tour) {
      stopWalk();
      orbit.startAuto(SHOTS.map((s) => ({ target: s.target, dist: s.dist, az: s.az, el: s.el })), 7.5);
      toast("自动导览", "镜头将依次巡游 7 个机位", "plain");
      say("自动导览开始");
    } else orbit.stopAuto();
  }
  function toggleStory() {
    S2.story = !S2.story;
    setOn($("#btnStory"), S2.story);
    const sb = sheetModes.querySelector('[data-mode="story"]');
    sb && sb.classList.toggle("on", S2.story);
    if (S2.story) {
      stopWalk();
      S2.storyT = 0;
      buildStageEl.querySelector('[data-phase="0"]').click();
      rgBuild.value = 0;
      applyBuild(0, true);
      orbit.set({ target: new THREE13.Vector3(0, 26, 0), dist: 620, az: -1.15, el: 0.34 });
      toast("建造逻辑演示", "按施工顺序逐层归位", "plain");
    } else {
      S2.build.playing = false;
      setOn($("#btnBuildPlay"), false);
      applyBuild(100);
    }
  }
  function resetAll() {
    stopWalk();
    S2.tour = false;
    S2.story = false;
    S2.photoHide = false;
    document.body.classList.remove("photo-hide", "photo");
    $("#photoBar").hidden = true;
    setOn($("#btnTour"), false);
    setOn($("#btnStory"), false);
    setOn($("#btnPhoto"), false);
    $$(".pmode-on").forEach((e) => e.classList.remove("pmode-on"));
    orbit.stopAuto();
    setExplode(0);
    setSection(false);
    setView("persp");
    setEnv("night");
    setMat("material");
    LAYERS.forEach((L) => {
      S2.layer[L.id] = { on: true, solo: false };
    });
    applyLayers();
    applyBuild(100, true);
    clearSel();
    goShot("hero");
    toast("已复位", "相机 / 表达 / 图层 / 建造 全部回到初始状态", "plain");
    say("已复位全部视图");
  }
  $("#btnWalk").addEventListener("click", toggleWalk);
  $("#btnTour").addEventListener("click", toggleTour);
  $("#btnStory").addEventListener("click", toggleStory);
  $("#btnReset").addEventListener("click", resetAll);
  $("#btnEnv").addEventListener("click", () => {
    const order = ["night", "dusk", "day"];
    const next = order[(order.indexOf(S2.env) + 1) % order.length];
    if (next === "dusk" && !unlocked("dusk")) {
      toast("黄昏模式未解锁", "达到 Lv.2 解锁「黄昏模式」", "plain");
      return;
    }
    setEnv(next);
    toast("照明切换", PRESETS[next].name + " · " + PRESETS[next].en, "plain");
  });
  function openSheet(id, on) {
    const el = $(id);
    if (!el) return;
    el.classList.toggle("on", on);
    setAttr(el, "aria-hidden", on ? "false" : "true");
    if (on) {
      const a = document.activeElement;
      S2.prevFocus = a && a !== document.body ? a : null;
      const f = Array.from(el.querySelectorAll("button, input, [tabindex]")).find((b) => b.offsetParent !== null);
      if (f) f.focus({ preventScroll: true });
    } else if (S2.prevFocus && S2.prevFocus.offsetParent !== null && S2.prevFocus.focus) {
      S2.prevFocus.focus({ preventScroll: true });
    }
  }
  function closeSheets() {
    const any = $("#help").classList.contains("on") || $("#settings").classList.contains("on");
    if (!any) return false;
    openSheet("#help", false);
    openSheet("#settings", false);
    return true;
  }
  $("#btnHelp").addEventListener("click", () => openSheet("#help", true));
  $("#helpClose").addEventListener("click", () => openSheet("#help", false));
  $("#help").addEventListener("click", (e) => {
    if (e.target.id === "help") openSheet("#help", false);
  });
  $("#btnSettings").addEventListener("click", () => openSheet("#settings", true));
  $("#setClose").addEventListener("click", () => openSheet("#settings", false));
  $("#settings").addEventListener("click", (e) => {
    if (e.target.id === "settings") openSheet("#settings", false);
  });
  setText($("#setSysMotion"), reduceSys ? "已启用" : "未开启");
  function setQuality(q) {
    S2.quality = q;
    $$("#segQuality button").forEach((b) => {
      const on = b.dataset.q === q;
      b.classList.toggle("on", on);
      setAttr(b, "aria-pressed", on ? "true" : "false");
    });
    if (stage2) stage2.quality = q;
    if (ctx.fx && ctx.fx.setQuality) {
      try {
        ctx.fx.setQuality(q);
      } catch (e) {
      }
    }
    if (!(ctx.fx && ctx.fx.setQuality) && stage2 && stage2.renderer) {
      const maxDpr = q === "low" ? 1 : q === "mid" ? 1.5 : 2;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      stage2.renderer.setPixelRatio(dpr);
      if (stage2.camera) {
        stage2.camera.aspect = window.innerWidth / window.innerHeight;
        stage2.camera.updateProjectionMatrix();
      }
    }
    store.set("quality", q);
    say("画质：" + ({ low: "低", mid: "中", high: "高" }[q] || q));
  }
  $("#segQuality").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-q]");
    if (b) setQuality(b.dataset.q);
  });
  function setSound(on) {
    S2.sound = !!on;
    setOn($("#btnSound"), S2.sound);
    setAttr($("#btnSound"), "aria-pressed", S2.sound ? "true" : "false");
    const tg = $("#tgSound");
    if (tg) {
      tg.classList.toggle("on", S2.sound);
      setAttr(tg, "aria-checked", S2.sound ? "true" : "false");
    }
    store.set("sound", S2.sound);
    say("环境音效" + (S2.sound ? "已开启" : "已关闭"));
  }
  $("#btnSound").addEventListener("click", () => {
    setSound(!S2.sound);
    toast("环境音效", S2.sound ? "已开启（演示占位）" : "已静音", "plain");
  });
  $("#tgSound").addEventListener("click", () => setSound(!S2.sound));
  function setReduceMotion(on) {
    S2.reduceMotion = !!on;
    document.body.classList.toggle("reduce-motion", S2.reduceMotion);
    const tg = $("#tgMotion");
    if (tg) {
      tg.classList.toggle("on", S2.reduceMotion);
      setAttr(tg, "aria-checked", S2.reduceMotion ? "true" : "false");
    }
    store.set("reduceMotion", S2.reduceMotion);
    say("减少动态" + (S2.reduceMotion ? "已开启" : "已关闭"));
  }
  $("#tgMotion").addEventListener("click", () => setReduceMotion(!S2.reduceMotion));
  $("#tgQualityAuto").addEventListener("click", (e) => {
    S2.autoQuality = !S2.autoQuality;
    e.currentTarget.classList.toggle("on", S2.autoQuality);
    setAttr(e.currentTarget, "aria-checked", S2.autoQuality ? "true" : "false");
    store.set("autoQuality", S2.autoQuality);
  });
  if (S2.reduceMotion) setReduceMotion(true);
  setSound(S2.sound);
  S2.autoQuality = store.get("autoQuality", true);
  $("#tgQualityAuto") && $("#tgQualityAuto").classList.toggle("on", S2.autoQuality);
  function setPerfMode2(on) {
    const perf = !!on;
    S2.perf = perf;
    const tg = $("#tgPerf");
    if (tg) {
      tg.classList.toggle("on", perf);
      setAttr(tg, "aria-checked", perf ? "true" : "false");
    }
    store.set("perf", perf);
    if (window.__setPerfMode) window.__setPerfMode(perf);
    say(perf ? "已开启省电模式（分辨率减半 / 关泛光）" : "已关闭省电模式");
  }
  S2.perf = !!(stage2 && stage2.perf);
  {
    const tg0 = $("#tgPerf");
    if (tg0) {
      tg0.classList.toggle("on", S2.perf);
      setAttr(tg0, "aria-checked", S2.perf ? "true" : "false");
    }
  }
  $("#tgPerf") && $("#tgPerf").addEventListener("click", () => setPerfMode2(!S2.perf));
  S2.lite = !!(stage2 && stage2.lite);
  {
    const tl = $("#tgLite");
    if (tl) {
      tl.classList.toggle("on", S2.lite);
      setAttr(tl, "aria-checked", S2.lite ? "true" : "false");
    }
  }
  $("#tgLite") && $("#tgLite").addEventListener("click", () => {
    const next = !S2.lite;
    S2.lite = next;
    const tl = $("#tgLite");
    if (tl) {
      tl.classList.toggle("on", next);
      setAttr(tl, "aria-checked", next ? "true" : "false");
    }
    if (window.__setLiteMode) window.__setLiteMode(next);
    toast(
      next ? "已开启轻量模式" : "已关闭轻量模式",
      next ? "坐席与绿化减量、关泛光，刷新后完全生效" : "恢复完整细节，刷新后生效",
      "plain"
    );
    say(next ? "轻量模式已开启（刷新后完全生效）" : "轻量模式已关闭（刷新后生效）");
  });
  function setPanelOpen(panel, open) {
    panel.dataset.open = open ? "1" : "0";
    const ph = panel.querySelector(".ph");
    if (ph) setAttr(ph, "aria-expanded", open ? "true" : "false");
    if (!open === false) {
    }
    store.set("panel." + panel.id, open);
  }
  $$(".panel").forEach((panel) => {
    const ph = panel.querySelector(".ph");
    const saved = store.get("panel." + panel.id, null);
    setPanelOpen(panel, saved == null ? true : !!saved);
    ph && ph.addEventListener("click", () => setPanelOpen(panel, panel.dataset.open !== "1"));
  });
  function buildScenChips() {
    const box = $("#scenChips");
    const e = window.__evac;
    if (!box || !e || !Array.isArray(e.scenarios)) return;
    box.innerHTML = "";
    e.scenarios.forEach((sc) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "scenchip";
      b.style.setProperty("--scen-accent", sc.accent || "#6fd3e0");
      b.dataset.scen = sc.id;
      b.textContent = sc.name;
      b.setAttribute("aria-pressed", sc.id === e.scenarioId ? "true" : "false");
      b.setAttribute("aria-label", `${sc.name} 工况：${sc.brief}`);
      b.addEventListener("click", () => {
        if (e.running) {
          toast("请先重置演练", "演练进行中不能切换工况", "plain");
          return;
        }
        e.reset(sc.id);
        syncFlowMeta();
        toast(`工况：${sc.name}`, sc.brief, "plain");
      });
      box.appendChild(b);
    });
  }
  function syncFlowMeta() {
    const e = window.__evac;
    if (!e) return;
    $$("#scenChips .scenchip").forEach((c) => setAttr(c, "aria-pressed", c.dataset.scen === e.scenarioId ? "true" : "false"));
    setText($("#scenBrief"), e.scenarioBrief || "");
    setText($("#flTeams"), `${e.teams}/${e.teamMax}`);
    setText($("#flLimit"), Math.round(e.limit) + "″");
    setText($("#flBc"), String(e.broadcastLeft ?? 0));
    setText($("#flGrade"), e.done ? e.grade : "—");
    setText($("#flScenario"), e.scenarioLabel || "");
  }
  function buildContestPanel() {
    const medals = $("#contestMedals");
    const grid = $("#stampGrid");
    const items = $("#dailyItems");
    if (medals && !medals.children.length) {
      ["evac", "photo", "overall"].forEach((id) => {
        const d = document.createElement("div");
        d.className = "medal";
        d.dataset.id = id;
        d.setAttribute("role", "listitem");
        d.innerHTML = "<b></b><em>—</em><span></span>";
        medals.appendChild(d);
      });
    }
    const st = window.__stamps;
    if (grid && st && !grid.children.length) {
      st.list.forEach((s) => {
        const d = document.createElement("div");
        d.className = "stamp";
        d.dataset.id = s.id;
        d.setAttribute("role", "listitem");
        d.title = s.desc;
        d.innerHTML = `<b>${s.name}</b><span class="en"></span>`;
        d.querySelector(".en").textContent = s.en;
        grid.appendChild(d);
      });
    }
    const daily = window.__daily;
    if (items && daily && daily.today && !items.children.length) {
      daily.today.items.forEach((it) => {
        const li = document.createElement("li");
        li.className = "dailyitem";
        li.dataset.id = it.id;
        li.innerHTML = '<i aria-hidden="true">○</i><span></span>';
        li.querySelector("span").textContent = it.name;
        items.appendChild(li);
      });
    }
    syncContest();
  }
  function syncContest() {
    const C = window.__contest;
    const D = window.__daily;
    const S22 = window.__stamps;
    if (C) {
      const m = C.medal();
      $$("#contestMedals .medal").forEach((el) => {
        const r = m.find((x) => x.id === el.dataset.id);
        if (!r) return;
        el.classList.toggle("got", !!r.got);
        setText(el.querySelector("em"), r.label);
        setText(el.querySelector("b"), r.name);
        setText(el.querySelector("span"), r.hint);
      });
      setText($("#contestPct"), `${m.filter((x) => x.got).length}/3`);
    }
    if (D) {
      const p = D.progress();
      setText($("#dailyDate"), `${p.date} 今日挑战`);
      setText($("#dailyPct"), `${p.finished}/${p.total}`);
      $$("#dailyItems .dailyitem").forEach((el) => {
        const it = p.items.find((x) => x.id === el.dataset.id);
        if (!it) return;
        el.classList.toggle("done", !!it.done);
        setText(el.querySelector("i"), it.done ? "✓" : "○");
      });
    }
    if (S22) {
      $$("#stampGrid .stamp").forEach((el) => el.classList.toggle("got", S22.has(el.dataset.id)));
      setText($("#stampHelp"), `${S22.help}（已获 ${S22.found}/${S22.total}）`);
    }
    syncFlowMeta();
  }
  try {
    document.addEventListener("contest:changed", () => syncContest());
    document.addEventListener("stamps:changed", () => syncContest());
    document.addEventListener("evac:changed", () => syncFlowMeta());
  } catch (e) {
  }
  const SIDE = { quest: "left", cap: "left", flow: "left", view: "right", layer: "right", build: "right", contest: "right" };
  const PANEL_ID = { quest: "#pQuest", cap: "#pCap", flow: "#pFlow", view: "#pView", layer: "#pLayer", build: "#pBuild", contest: "#pContest" };
  function isDesktopWide() {
    return window.innerWidth >= 1280;
  }
  function openPanel(name) {
    if (name === "help") {
      openSheet("#help", true);
      return;
    }
    if (name === "settings") {
      openSheet("#settings", true);
      return;
    }
    const prev = S2.drawer;
    S2.drawer = name || null;
    const colL = $("#colLeft"), colR = $("#colRight");
    const railL = $("#railLeft"), railR = $("#railRight");
    const openLeft = name && SIDE[name] === "left";
    const openRight = name && SIDE[name] === "right";
    if (isDesktopWide()) {
      if (name) {
        const p = $(PANEL_ID[name]);
        if (p) {
          setPanelOpen(p, true);
          p.scrollIntoView({ block: "nearest", behavior: motionOK() ? "smooth" : "auto" });
          p.style.transition = "box-shadow .3s";
          p.style.boxShadow = "0 0 0 1px rgba(232,192,122,.55), 0 10px 30px rgba(0,0,0,.28)";
          setTimeout(() => {
            p.style.boxShadow = "";
          }, 900);
        }
      }
      $$(".ritem").forEach((b) => b.classList.toggle("active", b.dataset.panel === name));
      return;
    }
    colL.classList.toggle("open", !!openLeft);
    colR.classList.toggle("open", !!openRight);
    mask.classList.toggle("on", !!(openLeft || openRight));
    railL.classList.toggle("open", !!openLeft);
    railR.classList.toggle("open", !!openRight);
    $$(".ritem").forEach((b) => {
      const on = b.dataset.panel === name;
      b.classList.toggle("active", on);
      setAttr(b, "aria-expanded", on ? "true" : "false");
    });
    if (name) {
      const p = $(PANEL_ID[name]);
      if (p) {
        setPanelOpen(p, true);
      }
      say("打开面板：" + (p ? p.dataset.title : name));
    } else if (prev) {
      say("关闭面板");
    }
  }
  $("#railLeft").addEventListener("click", (e) => {
    const b = e.target.closest(".ritem");
    if (!b) return;
    openPanel(S2.drawer === b.dataset.panel ? null : b.dataset.panel);
  });
  $("#railRight").addEventListener("click", (e) => {
    const b = e.target.closest(".ritem");
    if (!b) return;
    openPanel(S2.drawer === b.dataset.panel ? null : b.dataset.panel);
  });
  $("#mBtnShots").addEventListener("click", () => sheet.classList.toggle("on"));
  $("#mBtnQuest").addEventListener("click", () => openPanel(S2.drawer === "quest" ? null : "quest"));
  $("#mBtnCap").addEventListener("click", () => openPanel(S2.drawer === "cap" ? null : "cap"));
  $("#mBtnFlow").addEventListener("click", () => openPanel(S2.drawer === "flow" ? null : "flow"));
  $("#mBtnView").addEventListener("click", () => openPanel(S2.drawer === "view" ? null : "view"));
  $("#mBtnLayer").addEventListener("click", () => openPanel(S2.drawer === "layer" ? null : "layer"));
  $("#mBtnWalk").addEventListener("click", toggleWalk);
  const hintCard = $("#hintCard");
  const ray = new THREE13.Raycaster();
  const ndc = new THREE13.Vector2();
  const tip = $("#hoverTip");
  function entIdAt(clientX, clientY) {
    if (!arena || !arena.ents) return null;
    const cam = stage2.camera;
    const rect = stage2.canvas.getBoundingClientRect();
    ndc.x = (clientX - rect.left) / rect.width * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(ndc, cam);
    const targets = [];
    if (arena.root) targets.push(arena.root);
    if (env && env.root) targets.push(env.root);
    if (!targets.length) return null;
    const hits = ray.intersectObjects(targets, true);
    for (const h of hits) {
      if (!h.object.isMesh && !h.object.isInstancedMesh) continue;
      if (!h.object.visible) continue;
      const id = findEnt(h.object);
      if (id) return { id, point: h.point };
    }
    return null;
  }
  function findEnt(o) {
    let p = o, first = null;
    while (p) {
      if (p.userData && p.userData.ent && arena.ents[p.userData.ent]) return p.userData.ent;
      if (p.name && arena.ents[p.name]) {
        if (!first) first = p.name;
      }
      p = p.parent;
    }
    for (const [k, e] of Object.entries(arena.ents)) {
      if (e.mesh && e.mesh.isObject3D && isAncestor(e.mesh, o)) return k;
    }
    for (const [k, e] of Object.entries(arena.ents)) {
      if (!e.parent) continue;
      if (isAncestor(e.parent, o)) return k;
    }
    return first;
  }
  function isAncestor(a, b) {
    let p = b;
    while (p) {
      if (p === a) return true;
      p = p.parent;
    }
    return false;
  }
  function showSel(id, sx, sy) {
    if (!id) {
      clearSel();
      return;
    }
    const e = arena.ents[id] || {};
    S2.sel = id;
    setText($("#hcTitle"), e.label || id);
    setText($("#hcSpec"), e.spec || "构件图层 · " + id);
    const grp = S2.layer[id] ? id : (LAYERS.find((L) => arena.groups && arena.groups[L.id] === e.parent) || {}).id;
    setHTML(
      $("#hcData"),
      `<span>构件 ID</span><i>${id}</i><span>所属图层</span><i>${grp || "—"}</i><span>构件类型</span><i>${e.mesh && e.mesh.isInstancedMesh ? "实例化阵列" : e.mesh && e.mesh.isMesh ? "网格实体" : "组件"}</i><span>可见</span><i>${e.hidden ? "隐藏" : "显示"}</i>`
    );
    hintCard.hidden = false;
    hintCard.classList.add("on");
    const w = hintCard.offsetWidth || 264;
    const rect = stage2.canvas.getBoundingClientRect();
    const x = clamp(sx - rect.left + 16, 8, window.innerWidth - w - 8);
    const y = clamp(sy - rect.top + 14, 8, window.innerHeight - hintCard.offsetHeight - 8);
    hintCard.style.left = x + "px";
    hintCard.style.top = y + "px";
    say((e.label || id) + "：" + (e.spec || ""));
  }
  function clearSel() {
    S2.sel = null;
    hintCard.hidden = true;
    hintCard.classList.remove("on");
  }
  $("#hcClose").addEventListener("click", clearSel);
  function focusSel() {
    const id = S2.sel;
    if (!id) return;
    if (typeof arena.focusOn === "function") {
      try {
        arena.focusOn(id);
      } catch (e) {
      }
    } else if (arena.ents[id] && arena.ents[id].mesh) {
      const b = new THREE13.Box3().setFromObject(arena.ents[id].mesh);
      if (!b.isEmpty()) {
        const c = b.getCenter(new THREE13.Vector3());
        const r = b.getSize(new THREE13.Vector3()).length() * 1.25;
        orbit.set({ target: c, dist: clamp(r, 20, 1400), el: 0.34 });
      }
    }
    say("对焦：" + (arena.ents[id] && arena.ents[id].label || id));
  }
  function hideSel() {
    const id = S2.sel;
    if (!id) return;
    if (typeof arena.setVisible === "function") {
      try {
        arena.setVisible(id, false);
      } catch (e) {
      }
    } else if (arena.ents[id] && arena.ents[id].mesh) arena.ents[id].mesh.visible = false;
    if (S2.layer[id]) {
      S2.layer[id].on = false;
      applyLayers();
    }
    toast("已隐藏构件", arena.ents[id] && arena.ents[id].label || id, "plain");
    clearSel();
  }
  function soloSel() {
    const id = S2.sel;
    if (!id) return;
    if (typeof arena.setSolo === "function") {
      try {
        arena.setSolo(id);
      } catch (e) {
      }
    }
    const any = Object.values(S2.layer).some((x) => x.solo);
    if (S2.layer[id]) {
      const on = !any;
      Object.keys(S2.layer).forEach((k) => S2.layer[k].solo = on && k === id);
      applyLayers();
    }
    toast(any ? "退出孤立" : "孤立查看", arena.ents[id] && arena.ents[id].label || id, "plain");
  }
  $("#hcFocus").addEventListener("click", focusSel);
  $("#hcHide").addEventListener("click", hideSel);
  $("#hcSolo").addEventListener("click", soloSel);
  let downAt = 0, downX = 0, downY = 0;
  stage2.canvas.addEventListener("pointerdown", (e) => {
    downAt = now();
    downX = e.clientX;
    downY = e.clientY;
  });
  stage2.canvas.addEventListener("pointermove", (e) => {
    if (S2.walk) return;
    if (now() - S2._hoverT < 90) return;
    S2._hoverT = now();
    const r = entIdAt(e.clientX, e.clientY);
    if (r) {
      const meta = arena.ents[r.id] || {};
      setHTML(tip, "");
      tip.innerHTML = "";
      const b = document.createElement("b");
      b.textContent = meta.label || r.id;
      const s = document.createElement("span");
      s.textContent = meta.spec || "";
      tip.append(b, s);
      tip.classList.add("on");
      tip.style.left = Math.min(e.clientX + 14, window.innerWidth - 250) + "px";
      tip.style.top = Math.min(e.clientY + 16, window.innerHeight - 60) + "px";
      S2.hover = r.id;
    } else {
      tip.classList.remove("on");
      S2.hover = null;
    }
  });
  stage2.canvas.addEventListener("pointerleave", () => tip.classList.remove("on"));
  stage2.canvas.addEventListener("pointerup", (e) => {
    if (now() - downAt > 320) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
    if (S2.walk) return;
    if (e.button === 2) {
      const r2 = entIdAt(e.clientX, e.clientY);
      if (r2) {
        S2.sel = r2.id;
        hideSel();
      }
      return;
    }
    const r = entIdAt(e.clientX, e.clientY);
    if (r) showSel(r.id, e.clientX, e.clientY);
    else clearSel();
  });
  stage2.canvas.addEventListener("dblclick", (e) => {
    if (S2.walk) return;
    const r = entIdAt(e.clientX, e.clientY);
    if (r) {
      showSel(r.id, e.clientX, e.clientY);
      soloSel();
    }
  });
  stage2.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  const mm = $("#mm");
  const mctx = mm ? mm.getContext("2d") : null;
  function playerPose() {
    const w = window.__walk;
    if (w && w.pos) return { pos: w.pos, yaw: w.yaw || 0, active: true };
    if (walk && walk.active) return { pos: walk.pos, yaw: walk.yaw || 0, active: true };
    if (walk && walk.pos) return { pos: walk.pos, yaw: walk.yaw || 0, active: false };
    const c = stage2.camera;
    return { pos: c.position, yaw: Math.atan2(c.position.x - orbit.target.x, c.position.z - orbit.target.z), active: false };
  }
  function drawMinimap() {
    if (!mctx) return;
    S2.mmCount = (S2.mmCount || 0) + 1;
    const W = mm.width, H = mm.height, cx = W / 2, cy = H / 2;
    const scale = W / 2 / 132;
    mctx.clearRect(0, 0, W, H);
    mctx.fillStyle = "rgba(8,13,19,0.5)";
    mctx.beginPath();
    mctx.arc(cx, cy, W / 2 - 1.5, 0, Math.PI * 2);
    mctx.fill();
    const rings = [GEO.outerS, TIERS[0].cS1, TIERS[0].s0, TIERS[1].s0, TIERS[2].s0];
    rings.forEach((s, i) => {
      mctx.beginPath();
      mctx.ellipse(cx, cy, (34 + s) * scale, (52.5 + s) * scale, 0, 0, Math.PI * 2);
      mctx.strokeStyle = i === 0 ? "rgba(232,192,122,.45)" : "rgba(160,180,200,.2)";
      mctx.lineWidth = i === 0 ? 1.2 : 0.8;
      mctx.stroke();
    });
    TIERS.forEach((t, i) => {
      mctx.beginPath();
      mctx.ellipse(cx, cy, (34 + t.endS) * scale, (52.5 + t.endS) * scale, 0, 0, Math.PI * 2);
      mctx.ellipse(cx, cy, (34 + t.s0) * scale, (52.5 + t.s0) * scale, 0, 0, Math.PI * 2);
      mctx.fillStyle = ["rgba(201,161,95,.20)", "rgba(143,182,196,.16)", "rgba(183,160,196,.14)"][i];
      mctx.fill("evenodd");
    });
    mctx.fillStyle = "rgba(74,124,63,.62)";
    mctx.fillRect(cx - 34 * scale, cy - 52.5 * scale, 68 * scale, 105 * scale);
    mctx.strokeStyle = "rgba(235,245,235,.6)";
    mctx.lineWidth = 0.9;
    mctx.strokeRect(cx - 34 * scale, cy - 52.5 * scale, 68 * scale, 105 * scale);
    mctx.beginPath();
    mctx.arc(cx, cy, 9.15 * scale, 0, Math.PI * 2);
    mctx.stroke();
    mctx.beginPath();
    mctx.moveTo(cx - 34 * scale, cy);
    mctx.lineTo(cx + 34 * scale, cy);
    mctx.stroke();
    [0, 0.25, 0.5, 0.75].forEach((u) => {
      const a = u * Math.PI * 2 - Math.PI / 2;
      const px2 = cx + Math.cos(a) * (34 + GEO.outerS) * scale;
      const py2 = cy + Math.sin(a) * (52.5 + GEO.outerS) * scale;
      mctx.beginPath();
      mctx.arc(px2, py2, 2, 0, Math.PI * 2);
      mctx.fillStyle = "rgba(232,192,122,.85)";
      mctx.fill();
    });
    const pts = badgeSource().map((b) => ({ p: b.pos, taken: b.taken }));
    pts.forEach((b) => {
      if (b.taken) return;
      const x = cx + b.p[0] * scale, y = cy + b.p[2] * scale;
      mctx.beginPath();
      mctx.arc(x, y, 2.6, 0, Math.PI * 2);
      mctx.fillStyle = "#ffd27a";
      mctx.fill();
      mctx.beginPath();
      mctx.arc(x, y, 5.4, 0, Math.PI * 2);
      mctx.strokeStyle = "rgba(255,210,122,.4)";
      mctx.lineWidth = 0.8;
      mctx.stroke();
    });
    const ov = window.__objectives;
    if (ov && ov.target) {
      const tp = ov.target;
      const x = cx + tp.x * scale, y = cy + tp.z * scale;
      mctx.save();
      mctx.translate(x, y);
      mctx.rotate(Math.PI / 4);
      mctx.fillStyle = "#6fd3e0";
      mctx.fillRect(-3.2, -3.2, 6.4, 6.4);
      mctx.restore();
      mctx.beginPath();
      mctx.arc(x, y, 8.5, 0, Math.PI * 2);
      mctx.strokeStyle = "rgba(111,211,224,.85)";
      mctx.lineWidth = 1.2;
      mctx.stroke();
    }
    const pp = playerPose();
    const px = clamp(cx + pp.pos.x * scale, 4, W - 4);
    const py = clamp(cy + pp.pos.z * scale, 4, H - 4);
    if (pp.active) {
      mctx.save();
      mctx.translate(px, py);
      mctx.beginPath();
      mctx.moveTo(0, 0);
      const ang = Math.PI / 2 - pp.yaw;
      mctx.arc(0, 0, 20, ang - 0.42, ang + 0.42);
      mctx.closePath();
      mctx.fillStyle = "rgba(111,211,224,.16)";
      mctx.fill();
      mctx.rotate(ang);
      mctx.beginPath();
      mctx.moveTo(0, -6);
      mctx.lineTo(4.4, 4.6);
      mctx.lineTo(0, 2.2);
      mctx.lineTo(-4.4, 4.6);
      mctx.closePath();
      mctx.fillStyle = "#6fd3e0";
      mctx.fill();
      mctx.restore();
    } else {
      mctx.fillStyle = "rgba(232,192,122,.9)";
      mctx.fillRect(px - 2.5, py - 2.5, 5, 5);
      mctx.strokeStyle = "rgba(232,192,122,.35)";
      mctx.beginPath();
      mctx.moveTo(px, py);
      mctx.lineTo(cx + orbit.target.x * scale, cy + orbit.target.z * scale);
      mctx.stroke();
    }
    mctx.fillStyle = "rgba(200,214,228,.6)";
    mctx.font = '8px "JetBrains Mono",monospace';
    mctx.textAlign = "center";
    mctx.fillText("N", cx, 10);
  }
  function updateGuide() {
    const gName = $("#gName"), gDist = $("#gDist"), gArrow = $("#gArrow");
    if (!gName) return;
    const from = walk && walk.active && walk.pos ? walk.pos : stage2.camera ? stage2.camera.position : orbit.target;
    const ov = window.__objectives;
    if (ov && ov.target && ov.current) {
      const cur = ov.current;
      const tp = ov.target;
      const d = Math.hypot(tp.x - from.x, tp.y - from.y, tp.z - from.z);
      setText(gName, cur.name || "下一目标");
      setText(gDist, d > 999 ? (d / 1e3).toFixed(2) + " km" : Math.round(d) + " m");
      const cam2 = stage2.camera;
      const dirCam2 = new THREE13.Vector3(0, 0, -1).applyQuaternion(cam2.quaternion);
      const dirTo2 = new THREE13.Vector3(tp.x - from.x, 0, tp.z - from.z);
      const ang2 = Math.atan2(dirTo2.x, dirTo2.z) - Math.atan2(dirCam2.x, dirCam2.z);
      gArrow && (gArrow.style.transform = `rotate(${-ang2 * 180 / Math.PI}deg)`);
      return;
    }
    let best = null, bd = Infinity;
    badgeSource().forEach((b) => {
      if (b.taken || !b.obj) return;
      const d = from.distanceTo(b.obj.position);
      if (d < bd) {
        bd = d;
        best = b;
      }
    });
    const todo = S2.quests.find((q) => !q.done);
    if (!best) {
      setText(gName, todo ? todo.name : "全部徽章已收集");
      setText(gDist, todo ? "按任务前往" : "✓");
      return;
    }
    setText(gName, best.name);
    setText(gDist, bd > 999 ? (bd / 1e3).toFixed(2) + " km" : bd.toFixed(0) + " m");
    const cam = stage2.camera;
    const dirCam = new THREE13.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const dirTo = best.obj.position.clone().sub(from);
    const ang = Math.atan2(dirTo.x, dirTo.z) - Math.atan2(dirCam.x, dirCam.z);
    gArrow && (gArrow.style.transform = `rotate(${-ang * 180 / Math.PI}deg)`);
  }
  function tickCollect(dt, t) {
    if (!gameOwnsBadges()) {
      const from = walk && walk.active ? walk.pos : stage2.camera.position;
      badgeMap.forEach((b) => {
        if (b.taken) return;
        b.obj.rotation.y += dt * 0.9;
        b.obj.position.y = b.def.pos[1] + Math.sin(t * 1.4 + b.def.pos[0]) * 0.18;
        b.obj.scale.setScalar(1 + Math.sin(t * 2.2) * 0.06);
        const d = from.distanceTo(b.obj.position);
        if (d < 14) {
          b.taken = true;
          b.obj.visible = false;
          addScore(24, "收集徽章");
          if (fx && fx.flash && motionOK()) fx.flash("#ffd27a", 0.18);
          syncBadgeRow();
          toast("收集到建筑徽章", `${b.def.name} · ${b.def.desc}（${S2.badgesFound}/${S2.badgesTotal}）`, "gold");
          say("收集徽章：" + b.def.name);
        }
      });
    }
    const n = badgeSource().filter((b) => b.taken).length;
    if (n !== S2.badgesFound) {
      S2.badgesFound = n;
      syncBadgeRow();
    }
  }
  const photoBar = $("#photoBar");
  function photoMode(on) {
    S2.photo = !!on;
    document.body.classList.toggle("photo", S2.photo);
    photoBar.hidden = !S2.photo;
    setOn($("#btnPhoto"), S2.photo);
    const sb = sheetModes.querySelector('[data-mode="photo"]');
    sb && sb.classList.toggle("on", S2.photo);
    if (S2.photo) {
      openPanel(null);
      sheet.classList.remove("on");
      toast("照片模式", "调整曝光/焦距后点击「保存 PNG」", "plain");
      say("进入照片模式");
      const f = $("#rgExposure");
      f && f.focus({ preventScroll: true });
    } else {
      S2.photoHide = false;
      document.body.classList.remove("photo-hide");
      setOn($("#btnPhotoHide"), false);
      applyFilter("none");
      say("退出照片模式");
    }
  }
  $("#btnPhoto").addEventListener("click", () => photoMode(!S2.photo));
  $("#btnPhotoExit").addEventListener("click", () => photoMode(false));
  function applyFilter(f) {
    S2.filter = f;
    document.body.classList.forEach((c) => {
      if (c.startsWith("photo-filter-")) document.body.classList.remove(c);
    });
    if (f !== "none") document.body.classList.add("photo-filter-" + f);
    $$("#pFilters button").forEach((b) => {
      const on = b.dataset.filter === f;
      b.classList.toggle("on", on);
      setAttr(b, "aria-pressed", on ? "true" : "false");
    });
  }
  $("#pFilters").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-filter]");
    if (!b) return;
    const f = b.dataset.filter;
    if (f !== "none" && !unlocked("film")) {
      toast("胶片滤镜未解锁", "达到 Lv.3 解锁「胶片滤镜」与构图评分", "plain");
      return;
    }
    applyFilter(f);
  });
  $("#rgExposure").addEventListener("input", (e) => {
    const v = +e.target.value;
    setText($("#expoVal"), v.toFixed(1));
    if (fx) fx.exposureBoost = 1 + v;
  });
  $("#rgFocal").addEventListener("input", (e) => {
    const f = +e.target.value;
    setText($("#focalVal"), f + "mm");
    const cam = stage2.camera;
    if (cam && cam.isPerspectiveCamera) {
      if (S2._fov0 == null) S2._fov0 = cam.fov;
      cam.fov = clamp(S2._fov0, 20, 70);
      cam.updateProjectionMatrix();
      orbit.tDist = clamp(orbit.tDist * (f > 42 ? 1.008 : 0.992), orbit.minDist, orbit.maxDist);
    }
  });
  $("#rgAperture").addEventListener("input", (e) => {
    const v = +e.target.value;
    setText($("#apertureVal"), "f/" + (v < 10 ? v.toFixed(1) : Math.round(v)));
    if (fx && fx.bloom) fx.bloom.strength = clamp(0.9 / Math.sqrt(v), 0.1, 0.9);
  });
  $("#btnPhotoHide").addEventListener("click", () => {
    S2.photoHide = !S2.photoHide;
    document.body.classList.toggle("photo-hide", S2.photoHide);
    setOn($("#btnPhotoHide"), S2.photoHide);
  });
  $("#btnSnap").addEventListener("click", () => {
    try {
      stage2.renderer.render(stage2.scene, stage2.camera);
      const url = stage2.canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `tidal-arena-${Date.now()}.png`;
      a.click();
      toast("照片已保存", "PNG 已下载到本地", "green");
      say("照片已保存");
      completeQuest("q6");
    } catch (e) {
      toast("保存失败", String(e && e.message || e), "red");
    }
  });
  function setMobile(on) {
    S2.mobile = !!on;
    document.body.classList.toggle("is-mobile", S2.mobile);
    if (!S2.mobile) {
      openPanel(null);
      sheet.classList.remove("on");
      if (S2.walk) showTouchLook(false);
    }
  }
  function getLayout() {
    const w = window.innerWidth;
    const colL = $("#colLeft"), colR = $("#colRight");
    const viz = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 1 && r.height > 1 && cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.05;
    };
    return {
      mode: w >= 1280 ? "three-col" : w >= 768 ? "rail" : "mobile",
      width: w,
      height: window.innerHeight,
      leftRail: viz($("#railLeft")),
      rightRail: viz($("#railRight")),
      leftCol: viz(colL),
      rightCol: viz(colR),
      drawer: S2.drawer,
      leftDrawerOpen: colL ? colL.classList.contains("open") : false,
      rightDrawerOpen: colR ? colR.classList.contains("open") : false,
      bottomBar: viz($(".bottom")),
      mobileBar: viz($("#mobBar")),
      minimap: viz($(".mmwrap")),
      photo: S2.photo,
      mobile: S2.mobile,
      panels: $$(".panel").filter(viz).map((p) => p.id),
      photoBar: viz(photoBar)
    };
  }
  window.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
      if (e.code === "Escape") t.blur();
      return;
    }
    if (t && t.closest && t.closest(".sheet.on")) {
      if (e.code === "Escape") closeSheets();
      return;
    }
    const k = e.code;
    if (k === "KeyN") $("#btnEnv").click();
    if (k === "KeyM") {
      const o = ["material", "white", "xray"];
      setMat(o[(o.indexOf(S2.mat) + 1) % 3]);
    }
    if (k === "KeyE") setExplode(S2.exploded < 0.5 ? 1 : 0);
    if (k === "KeyX") setSection(!S2.section);
    if (k === "KeyV") {
      goShot(null);
      setView("plan");
    }
    if (k === "KeyH") openSheet("#help", !$("#help").classList.contains("on"));
    if (k === "KeyB") toggleBrief();
    if (k === "KeyP") toggleTour();
    if (k === "KeyC") photoMode(!S2.photo);
    if (k === "KeyF") {
      if (S2.walk) stopWalk();
      else if (S2.sel) focusSel();
      else startWalk();
    }
    if (k === "Escape") {
      if (S2.brief) toggleBrief(false);
      else if (S2.drawer) openPanel(null);
      else if (sheet.classList.contains("on")) sheet.classList.remove("on");
      else if (S2.walk) stopWalk();
      else if (S2.photo && !S2.photoHide) photoMode(false);
      else {
        closeSheets();
        clearSel();
      }
    }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= SHOTS.length) goShot(SHOTS[n - 1].id);
  });
  let lastW = 0;
  function onResize() {
    const w = window.innerWidth;
    if (w === lastW) return;
    const crossed = lastW < 1280 && w >= 1280 || lastW >= 1280 && w < 1280 || lastW < 768 && w >= 768 || lastW >= 768 && w < 768;
    lastW = w;
    if (crossed) {
      const colL = $("#colLeft"), colR = $("#colRight");
      colL.classList.remove("open");
      colR.classList.remove("open");
      mask.classList.remove("on");
      S2.drawer = null;
      $$(".ritem").forEach((b) => {
        b.classList.remove("active");
        setAttr(b, "aria-expanded", "false");
      });
    }
    setMobile(w < 768);
    setTimeout(() => {
      drawMinimap();
    }, 60);
  }
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", () => setTimeout(onResize, 200));
  const roFps = $("#roFps"), roDist = $("#roDist");
  function updateReadout(fps) {
    const f = Math.round(fps);
    setText(roFps, f);
    if (roFps) {
      const cl = f >= 50 ? "" : f >= 35 ? "warn" : "bad";
      if (roFps._cl !== cl) {
        roFps._cl = cl;
        roFps.className = cl;
      }
    }
    if (S2.walk || walk && walk.active) setText(roDist, Math.round(stage2.camera.position.y) + "m↑");
    else setText(roDist, Math.round(orbit.dist) + "m");
  }
  function updateHud2() {
    drawMinimap();
    updateGuide();
    const st = flowState();
    const p = clamp(st.out / Math.max(1, st.total), 0, 1);
    setText($("#flOut"), fmt(st.out));
    setText($("#flLeft"), fmt(Math.max(0, st.total - st.out)));
    const mm2 = Math.floor(st.t / 60), ss = Math.floor(st.t % 60);
    setText($("#flTime"), `${mm2}:${String(ss).padStart(2, "0")}`);
    const fill = $("#flowFill");
    if (fill) fill.style.width = (p * 100).toFixed(1) + "%";
    const bar = $("#flowBar");
    if (bar) setAttr(bar, "aria-valuenow", Math.round(p * 100));
    setText($("#flowPct"), st.done ? "疏散完成" : st.run ? st.paused ? "已暂停" : "进行中 " + Math.round(p * 100) + "%" : st.t > 0 ? "暂停中" : "待启动");
    setText($("#flScore"), st.score != null ? "评分 " + st.score : st.done ? "评分 —" : "评分 —");
    setOn(flowBtn, st.run && !st.paused);
    setText(flowBtn, st.run && !st.paused ? "暂停演练" : st.done ? "重新演练" : st.t > 0 ? "继续演练" : "开始演练");
    if (flowPause) flowPause.disabled = !st.run;
    syncDispatch();
    const pose = playerPose();
    let yawDeg = pose.active ? -pose.yaw * 180 / Math.PI : Math.atan2(stage2.camera.position.x - orbit.target.x, stage2.camera.position.z - orbit.target.z) * 180 / Math.PI;
    yawDeg = (yawDeg % 360 + 360) % 360;
    const dial = $("#compassDial");
    if (dial) dial.style.transform = `rotate(${-yawDeg.toFixed(0)}deg)`;
    setText($("#mmPos"), `X ${pose.pos.x.toFixed(0)} · Z ${pose.pos.z.toFixed(0)}`);
    setText($("#mmYaw"), String(Math.round(yawDeg)).padStart(3, "0") + "°");
    setText($("#mmState"), S2.walk ? "漫游" : S2.view === "persp" ? "俯瞰" : "二维");
    if (S2.sel && !hintCard.hidden) {
      const e = arena.ents && arena.ents[S2.sel];
      if (e) setHTML(
        $("#hcData"),
        `<span>构件 ID</span><i>${S2.sel}</i><span>所属图层</span><i>${S2.layer[S2.sel] ? S2.sel : "—"}</i><span>构件类型</span><i>${e.mesh && e.mesh.isInstancedMesh ? "实例化阵列" : e.mesh && e.mesh.isMesh ? "网格实体" : "组件"}</i><span>可见</span><i>${e.mesh && e.mesh.visible === false || e.hidden ? "隐藏" : "显示"}</i>`
      );
    }
  }
  function update(dt, t, fps) {
    if (S2.autoQuality && !S2._qBusy && !(stage2 && (stage2.lite || stage2.perf))) {
      S2._qSample = (S2._qSample || 0) + dt;
      if (S2._qSample > 2.5) {
        S2._qSample = 0;
        S2._slow = fps < 38 ? (S2._slow || 0) + 1 : 0;
        if (S2._slow >= 3 && S2.quality !== "low") {
          S2._slow = 0;
          setQuality(S2.quality === "high" ? "mid" : "low");
          toast("已自动降低画质", "性能自适应：优先保证流畅", "plain");
        }
      }
    }
    tickEnv(dt);
    tickCollect(dt, t);
    applyJoy(dt);
    updateFlow(dt);
    if (S2.build.playing) {
      const nv = S2.build.v + dt * 14;
      applyBuild(nv >= 100 ? 100 : nv, nv < 100);
      if (nv >= 100) {
        S2.build.playing = false;
        setOn($("#btnBuildPlay"), false);
        setText($("#btnBuildPlay"), "▶ 播放建造动画");
        toast("建造完成", "五阶段施工动画结束", "green");
      }
    }
    if (S2.story) {
      S2.storyT = (S2.storyT || 0) + dt;
      if (S2.storyT > 9) {
        toggleStory();
      }
    }
    S2.hudT += dt;
    S2.hud2T += dt;
    S2.mmT += dt;
    if (S2.hudT >= 0.1) {
      S2.hudT = 0;
      updateReadout(fps);
    }
    if (S2.hud2T >= 0.1) {
      S2.hud2T = 0;
      updateHud2();
    }
    if (S2.photo && unlocked("film")) {
      S2.psT = (S2.psT || 0) + dt;
      if (S2.psT > 0.3) {
        S2.psT = 0;
        try {
          const sc = window.__photo && window.__photo.score && window.__photo.score();
          if (sc) {
            setText($("#psVal"), String(sc.total));
            setText($("#psGrade"), "评级 " + sc.grade);
            setText($("#psBest"), "最高 " + (window.__photo.best || 0));
          }
        } catch (e) {
        }
      }
    }
    if (fx && fx.exposureBoost != null && S2.photo && S2.photoHide) {
    }
  }
  const briefEl = $("#briefing");
  function syncBriefObj() {
    const ov = window.__objectives;
    const cur = ov && ov.current;
    const q0 = S2.quests.find((q) => !q.done);
    const name = cur && cur.name || q0 && q0.name || "探索潮汐场";
    const desc = cur && cur.desc || q0 && q0.desc || "按 F 进入第一人称漫游，跟着光柱走";
    setText($("#briefObj"), name);
    setText($("#briefDesc"), desc);
  }
  function toggleBrief(on) {
    if (!briefEl) return false;
    const want = on === void 0 ? !S2.brief : !!on;
    S2.brief = want;
    briefEl.hidden = !want;
    if (want) {
      syncBriefObj();
      const b = $("#briefGo");
      b && b.focus({ preventScroll: true });
    }
    return want;
  }
  if (briefEl) {
    $("#briefGo") && $("#briefGo").addEventListener("click", () => {
      toggleBrief(false);
      if (!S2.walk) startWalk();
      else toast("已在漫游中", "跟着青色光柱前往当前目标", "plain");
    });
    $("#briefSkip") && $("#briefSkip").addEventListener("click", () => {
      toggleBrief(false);
      toast("已跳过简报", "按 B 可随时重新打开任务简报", "plain");
    });
    briefEl.addEventListener("click", (e) => {
      if (e.target === briefEl) toggleBrief(false);
    });
    $("#btnBrief") && $("#btnBrief").addEventListener("click", () => toggleBrief());
  }
  document.addEventListener("objective:changed", () => {
    if (S2.brief) syncBriefObj();
  });
  function postBoot() {
    bindDay();
    buildScenChips();
    buildContestPanel();
    document.addEventListener("game:ready", () => {
      buildScenChips();
      buildContestPanel();
    });
    ["game:changed", "insight:found", "stamps:changed"].forEach((ev) => {
      document.addEventListener(ev, () => syncContest());
    });
    setXP(S2.score, S2.level);
    onResize();
    drawMinimap();
    applyLayers();
    applyBuild(100, true);
    S2.capAnim = true;
    rollCap(0, capTotal, 1100);
    if (S2.quality) setQuality(stage2 && stage2.quality ? stage2.quality : S2.quality);
    setTimeout(() => {
      const mobile = window.innerWidth < 768;
      toast("欢迎来到潮汐场", mobile ? "点底部按钮打开面板 · 右下角「漫游」进入场内" : "按 F 漫游 · P 导览 · H 说明 · C 照片模式", "gold");
    }, 700);
    let seen = false;
    try {
      seen = localStorage.getItem("tidal_brief_seen") === "1";
    } catch (e) {
    }
    if (!seen) {
      setTimeout(() => {
        toggleBrief(true);
        try {
          localStorage.setItem("tidal_brief_seen", "1");
        } catch (e) {
        }
      }, 620);
    }
    document.addEventListener("game:changed", () => {
      syncQuestsFromGame();
      syncXPFromGame();
    });
    document.addEventListener("game:mission", (e) => {
      const d = e.detail || {};
      if (d.name) {
        toast("任务完成", `${d.name}${d.reward ? " · +" + d.reward + " 积分" : ""}`, "gold");
        say("任务完成：" + d.name);
      }
    });
    document.addEventListener("game:levelup", (e) => {
      const d = e.detail || {};
      showLevelUp(d && d.level || S2.level + 1);
      const un = d && d.unlocks || [];
      if (un.length) {
        setTimeout(() => {
          un.forEach((u) => {
            toast("解锁新能力", `${u.name} · ${u.desc || ""}`, "gold");
            say("解锁：" + u.name);
          });
        }, 900);
      }
    });
    drawMinimap();
  }
  syncQuestsFromGame();
  setXP(S2.score, S2.level);
  applyLayers();
  setEnv("night");
  setExplode(0);
  applyBuild(100, true);
  setFlowMode();
  setMobile(window.innerWidth < 768);
  lastW = window.innerWidth;
  if (window.innerWidth < 1280) {
  }
  return {
    /* ── 既有契约（只增不减） ── */
    update,
    toast,
    INTRO,
    goShot,
    setEnv,
    postBoot,
    S: S2,
    setMat,
    setExplode,
    setSection,
    /* ── 本轮新增 ── */
    setLayer,
    openPanel,
    setMobile,
    photoMode,
    getLayout,
    toggleBrief,
    syncBriefObj,
    /* ── v4 新增 ── */
    syncContest,
    syncFlowMeta,
    buildContestPanel,
    buildScenChips,
    syncDay,
    /* ── 内部复用 ── */
    setView,
    startWalk,
    stopWalk,
    completeQuest,
    addScore,
    drawMinimap,
    applyLayers,
    setQuality,
    setReduceMotion,
    applyBuild,
    startFlow,
    resetFlow,
    focusSel
  };
}

// src/game/init.js
var init_exports = {};
__export(init_exports, {
  default: () => init_default,
  init: () => init
});
init_state();
async function init(app) {
  const A = window.__app || app || {};
  let game = null;
  try {
    game = window.__game && window.__game.__isGame ? window.__game : createGame();
  } catch (e) {
    try {
      console.warn("[game] state 初始化失败", e);
    } catch (_) {
    }
  }
  let world = null;
  try {
    world = await initWorld(A);
  } catch (e) {
    try {
      console.warn("[game] world 初始化失败", e);
    } catch (_) {
    }
    try {
      window.__gameError = String(e && e.message || e);
    } catch (_) {
    }
  }
  return world || { game, missions: MISSIONS, ready: !!world };
}
var init_default = init;

// src/app.js
var $2 = (s) => document.querySelector(s);
var loader = $2("#loader");
var ldFill = $2("#ldFill");
var ldStep = $2("#ldStep");
var steps = [
  ["正在初始化渲染管线…", 6],
  ["构建环境光照与天穹…", 14],
  ["生成坐席几何（逐排逐区）…", 30],
  ["浇筑看台与环廊结构…", 50],
  ["安装悬挑屋盖与桁架…", 66],
  ["装配外立面与檐口…", 78],
  ["布置场地、灯光与室内…", 88],
  ["铺设周边城市肌理…", 95],
  ["编译着色器…", 100]
];
var stepIdx = 0;
async function step(label, pct) {
  ldStep.textContent = label;
  ldFill.style.width = (pct ?? steps[stepIdx][1]) + "%";
  await sleep(16);
}
async function boot() {
  try {
    let frame = function() {
      requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.1);
      t += dt;
      acc += dt;
      frames++;
      if (acc >= 0.5) {
        const f = frames / acc;
        fps = f;
        window.__fps = f;
        fnLog(f);
        acc = 0;
        frames = 0;
      }
      if (walk.active) walk.update(dt);
      else orbit.update(dt);
      modes.update(dt);
      sky.update(dt, t);
      ui.update(dt, t, fps);
      env.update && env.update(dt, t);
      fx.render(dt, t);
      const info = stage.renderer.info;
      const tri = info.render.triangles, calls = info.render.calls;
      const meshes = info.memory.geometries, texes = info.memory.textures;
      info.autoReset = false;
      info.reset();
      window.__stats = {
        fps,
        tris: tri,
        calls,
        meshes,
        textures: texes,
        seats: arena.seatTotal,
        cam: stage.camera.position.toArray().map((v) => +v.toFixed(1))
      };
    }, fnLog = function(f) {
      perf.history.push(f);
      if (perf.history.length > 8) perf.history.shift();
      if (perf.level >= 2) return;
      if (f < 38) perf.slow++;
      else perf.slow = Math.max(0, perf.slow - 0.6);
      if (perf.slow > 4) {
        perf.slow = 0;
        perf.level++;
        if (perf.level === 1) {
          stage.quality = "mid";
          resize();
          fx.bloom.enabled = !(stage.perf || stage.lite);
          ui.toast("已自动降低渲染分辨率", "性能自适应：保持流畅优先", "plain");
        } else if (perf.level === 2) {
          stage.quality = "low";
          stage.perf = true;
          resize();
          fx.bloom.enabled = false;
          ui.toast("已切换到性能模式", "关闭泛光 / 降低采样", "plain");
        }
      }
    };
    initRenderer($2("#gl"));
    stage.quality = detectQuality();
    stage.perf = detectPerfMode();
    stage.lite = detectLiteMode();
    if (stage.lite) stage.perf = true;
    setTextureScale(stage.lite ? 0.5 : 1);
    resize();
    let forceSW = false;
    try {
      forceSW = sessionStorage.getItem("tidal_force_sw") === "1";
    } catch (e) {
    }
    if (stage.software && NO_SOFTWARE && !forceSW) {
      showSoftwareWarning(stage.softwareInfo);
      return;
    }
    await step(steps[stepIdx][0], steps[stepIdx][1]);
    stepIdx++;
    buildEnvironment();
    await step(steps[stepIdx][0], steps[stepIdx][1]);
    stepIdx++;
    const sky = buildSky(stage.scene);
    sky.bindStage(stage);
    await step(steps[stepIdx][0], steps[stepIdx][1]);
    stepIdx++;
    await sleep(30);
    const arena = buildArena(stage.scene, stage);
    sky.bindLamps(arena.lamps);
    await step(steps[stepIdx][0], steps[stepIdx][1]);
    stepIdx++;
    await sleep(16);
    await step(steps[stepIdx][0], steps[stepIdx][1]);
    stepIdx++;
    sky.update(0, 0);
    await step(steps[stepIdx][0], steps[stepIdx][1]);
    stepIdx++;
    const env = buildEnv(stage.scene, stage);
    if (env && env.ents) {
      for (const k in env.ents) if (!arena.ents[k]) arena.ents[k] = env.ents[k];
    }
    await step(steps[stepIdx][0], steps[stepIdx][1]);
    stepIdx++;
    const fx = buildPostFX(stage);
    if (stage.perf || stage.lite) {
      fx.setPerfMode && fx.setPerfMode(true);
      stage.renderer.shadowMap.enabled = false;
    }
    const orbit = new OrbitRig(stage.camera, stage.canvas);
    const walk = new Walk(stage, arena);
    const draft = new DraftViews(stage, arena);
    const modes = new ModeController({ arena, stage });
    modes.fx = fx;
    await step(steps[stepIdx][0], steps[stepIdx][1]);
    stepIdx++;
    stage.renderer.compile(stage.scene, stage.camera);
    const ui = buildUI({ arena, env, sky, fx, orbit, walk, draft, stage, modes });
    const gameBoot = Promise.resolve(init_exports);
    const clock = new THREE23.Clock();
    let t = 0, acc = 0, frames = 0, fps = 60;
    const perf = { slow: 0, level: 0, history: [] };
    window.__fps = 60;
    window.__stats = {};
    stage.onContextLost = () => {
      ldStep.textContent = "显卡上下文已丢失，请刷新页面";
      loader.classList.remove("off");
      ldStep.style.color = "#e2603f";
    };
    ldStep.textContent = "就绪";
    await sleep(120);
    loader.classList.add("off");
    $2("#hud").classList.add("on");
    orbit.snapTo(ui.INTRO);
    ui.postBoot && ui.postBoot();
    requestAnimationFrame(frame);
    window.__app = { arena, env, sky, fx, orbit, walk, draft, modes, ui, stage, preset };
    window.__THREE = THREE23;
    window.__ready = true;
    bindPerfKeys();
    watchPerf();
    try {
      const g = await gameBoot;
      if (g) await g.init(window.__app);
    } catch (e) {
      console.warn("[game] 初始化跳过：", e);
      window.__gameError = String(e && e.message || e);
    }
  } catch (e) {
    console.error(e);
    window.__bootError = String(e && e.stack || e);
    ldStep.textContent = "启动失败：" + (e && e.message);
    ldStep.style.color = "#e2603f";
  }
}
function detectQuality() {
  try {
    if (localStorage.getItem("tidal_lowq") === "1") return "low";
  } catch (e) {
  }
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const small = Math.min(window.innerWidth, window.innerHeight) < 620;
  if (mobile || small) return "low";
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  if (mem <= 4 || cores <= 4) return "mid";
  return "high";
}
function detectPerfMode() {
  const q = new URLSearchParams(location.search);
  const qv = q.get("perf");
  if (qv === "1" || qv === "0") return qv === "1";
  try {
    const saved = localStorage.getItem("tidal_perf");
    if (saved === "1" || saved === "0") return saved === "1";
    if (localStorage.getItem("tidal_perf_last") === "slow") return true;
  } catch (e) {
  }
  try {
    const b = navigator.getBattery ? navigator.getBattery() : null;
    if (navigator.connection && /(^|-)(2g|3g)$/.test(navigator.connection.effectiveType || "")) return true;
  } catch (e) {
  }
  const mem = navigator.deviceMemory || 8;
  if (mem <= 4) return true;
  return false;
}
function detectLiteMode() {
  const q = new URLSearchParams(location.search);
  if (q.get("full") === "1") return false;
  const qv = q.get("lite");
  if (qv === "1") return true;
  if (qv === "0") return false;
  try {
    const saved = localStorage.getItem("tidal_lite");
    if (saved === "1" || saved === "0") return saved === "1";
  } catch (e) {
  }
  const gpu = (stage.softwareInfo || "").toLowerCase();
  const strong = /(nvidia|geforce|rtx|gtx|radeon rx|apple m\d|adreno 7|mali-g7)/.test(gpu);
  if (strong && !stage.software) return false;
  return true;
}
function setLiteMode(on) {
  try {
    localStorage.setItem("tidal_lite", on ? "1" : "0");
  } catch (e) {
  }
  const A = window.__app;
  if (A) {
    A.stage.lite = !!on;
    A.stage.perf = !!on || A.stage.perf;
    resize();
    if (A.fx && A.fx.setPerfMode) A.fx.setPerfMode(!!on || A.stage.perf);
    if (on) A.stage.renderer.shadowMap.enabled = false;
  }
  return true;
}
window.__setLiteMode = setLiteMode;
function setPerfMode(on) {
  const A = window.__app;
  if (!A) return false;
  const perf = !!on;
  A.stage.perf = perf;
  if (!perf) A.stage.lite = false;
  resize();
  if (A.fx && A.fx.setPerfMode) A.fx.setPerfMode(perf);
  A.stage.renderer.shadowMap.enabled = !perf;
  try {
    localStorage.setItem("tidal_perf", perf ? "1" : "0");
  } catch (e) {
  }
  return true;
}
window.__setPerfMode = setPerfMode;
function showPerfHud(show = true) {
  let el = document.getElementById("perfhud");
  if (!show) {
    if (el) el.remove();
    return null;
  }
  if (!el) {
    el = document.createElement("div");
    el.id = "perfhud";
    el.style.cssText = [
      "position:fixed",
      "right:12px",
      "bottom:12px",
      "z-index:99999",
      "padding:10px 12px",
      "border-radius:10px",
      "pointer-events:none",
      "background:rgba(6,10,16,.86)",
      "border:1px solid rgba(127,226,239,.35)",
      "color:#cfe9f2",
      "font:12px/1.55 ui-monospace,Consolas,monospace",
      "white-space:pre",
      "backdrop-filter:blur(6px)"
    ].join(";");
    document.body.appendChild(el);
  }
  const tick = () => {
    if (!document.body.contains(el)) return;
    const A = window.__app;
    if (!A) {
      el.textContent = "等待启动…";
      setTimeout(tick, 400);
      return;
    }
    const s = window.__stats || {};
    const pr = A.stage.pr, W = A.stage.W, H = A.stage.H;
    const px = Math.round(W * pr) + "×" + Math.round(H * pr);
    el.textContent = [
      "帧率      " + (s.fps ? s.fps.toFixed(1) : "—") + " fps" + (s.fps && s.fps < 45 ? "   ← 偏慢" : ""),
      "GPU       " + (A.stage.softwareInfo || "未知") + (A.stage.software ? "  ← 软渲染！" : ""),
      "像素比    " + pr.toFixed(2) + "  (" + px + ")",
      "预算      " + (A.stage.perf ? "省电 1.3M" : "高性能 2.6M") + "  档位 " + A.stage.quality,
      "绘制      " + (s.calls || 0) + " call / " + ((s.tris || 0) / 1e6).toFixed(2) + "M 三角面",
      "省电模式  " + (A.stage.perf ? "开（Shift+P 关闭）" : "关（Shift+P 开启）")
    ].join("\n");
    setTimeout(tick, 300);
  };
  tick();
  return el;
}
window.__perfShow = showPerfHud;
function watchPerf() {
  let slowRounds = 0;
  const iv = setInterval(() => {
    const s = window.__stats || {};
    if (!s.fps) return;
    slowRounds = s.fps < 40 ? slowRounds + 1 : 0;
    if (slowRounds >= 12) {
      clearInterval(iv);
      try {
        localStorage.setItem("tidal_perf_last", "slow");
      } catch (e) {
      }
      const A = window.__app;
      if (A && !A.stage.perf && A.ui && A.ui.toast) {
        A.ui.toast("检测到持续掉帧", "按 Shift+P 或打开设置 → 性能，切到省电模式可明显提速", "plain");
      }
    }
  }, 1e3);
  return iv;
}
function bindPerfKeys() {
  window.addEventListener("keydown", (e) => {
    if (e.key !== "P" || !e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const on = !document.getElementById("perfhud");
    showPerfHud(on);
  });
}
function showSoftwareWarning(glName) {
  const box = document.createElement("div");
  box.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:99999",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "background:#070b11",
    "color:#d8e6ee",
    'font:14px/1.8 system-ui,"Segoe UI",sans-serif',
    "padding:24px"
  ].join(";");
  box.innerHTML = `
    <div style="max-width:560px">
      <h2 style="margin:0 0 12px;font-size:19px;color:#e8c07a">当前浏览器没有启用显卡加速</h2>
      <p style="margin:0 0 10px">检测到的图形后端是<b>软件渲染</b>（${glName || "SwiftShader"}），
      这个三维场景在软件渲染下只有个位数帧率，不是程序卡死。</p>
      <p style="margin:0 0 10px">按下面的顺序处理，通常第 1 条就能解决：</p>
      <ol style="margin:0 0 14px;padding-left:20px">
        <li>Chrome 地址栏输入 <b>chrome://settings/system</b>，确认"使用图形加速功能"已开启，然后重启浏览器</li>
        <li>笔记本插上电源（省电模式会让浏览器退到核显甚至软渲染）</li>
        <li>地址栏打开 <b>chrome://gpu</b>，看 WebGL2 是否为 Hardware accelerated</li>
      </ol>
      <button id="swForce" style="padding:8px 16px;border-radius:8px;border:1px solid #7fe2ef;background:transparent;color:#7fe2ef;cursor:pointer;font:inherit">仍然进入（会很卡）</button>
    </div>`;
  document.body.appendChild(box);
  const btn = box.querySelector("#swForce");
  btn.addEventListener("click", () => {
    box.remove();
    try {
      sessionStorage.setItem("tidal_force_sw", "1");
    } catch (e) {
    }
    location.reload();
  });
}
boot();
