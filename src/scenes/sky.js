/* ═══════════════════════════════════════════════════════════════════════
   sky.js v2 — 天穹 / 光照 / 比赛灯光
   · 程序化天空 Shader：天顶渐变 + 太阳/月亮 + 云 + 星 + 地平线光晕（昼/夜/黄昏连续插值）
   · 半球光 + 环境光 + 平行光（投影）+ 8 个夜间点光（灯桥/广场/城市）
   · 4 组灯桥的可见光锥（additive 锥面）+ 草皮上的亮斑
   · 全部昼夜数值从 core.js 的 preset 读取（1.2s 缓动由 ui.js 完成）
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { PRESETS, preset, applyEnvFromPreset, clamp, lerp } from '../lib/core.js';
import { GEO, SEGS, roofY } from '../lib/sections.js';
import { refRing, radialPoint } from '../lib/rings.js';

/* 灯桥位置（arena.js 在屋盖内檐下挂 4 组泛光灯，u = k/4 + 0.125）
   u=0 在 +z 边中点，u 沿环向递增 → 0.125 是 +z/+x 角部，以此类推四个角 */
export const LIGHT_RIGS = [0.125, 0.375, 0.625, 0.875].map((u) => {
  const idx = Math.round(u * SEGS) % SEGS;
  const p = radialPoint(refRing(SEGS).pts[idx], GEO.roofInnerS + 3.0, 0);
  const y = roofY(GEO.roofInnerS + 3.0, idx) - 3.4;
  return { u, idx, pos: new THREE.Vector3(p.x, y, p.z) };
});

const vert = /* glsl */`
varying vec3 vWorld;
void main(){
  /* 天空球跟随相机（在 JS 里每帧 copy 相机位置），这里传"世界方向"
     而不是世界坐标：片元里 normalize 后才能得到真正的视线方向。
     用 position（球面局部坐标，球心在原点、半径 4200）即可。 */
  vWorld = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const frag = /* glsl */`
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
}`;

/* 光柱：沿锥体母线的加法混合带（中心浓、边缘淡、底部淡出，避免硬接地） */
const coneVert = /* glsl */`
varying vec2 vUv; varying float vEdge;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vEdge = 1.0;
  gl_Position = projectionMatrix * mv;
}`;
const coneFrag = /* glsl */`
uniform vec3 color; uniform float intensity;
varying vec2 vUv;
void main(){
  float along = vUv.y;                              // 0 = 灯口, 1 = 地面
  float a = pow(1.0 - along, 1.25) * 0.55 * intensity;
  a *= smoothstep(0.0, 0.06, along);
  gl_FragColor = vec4(color, a);
}`;

/* 草皮亮斑：椭圆径向渐变（4 组灯桥各照一片） */
const poolVert = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const poolFrag = /* glsl */`
uniform vec3 color; uniform float intensity;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float a = pow(max(0.0, 1.0 - r), 2.2) * intensity;
  gl_FragColor = vec4(color, a * 0.85);
}`;

export function buildSky(scene) {
  const U = {
    cTop: { value: new THREE.Color(PRESETS.night.skyTop) },
    cHor: { value: new THREE.Color(PRESETS.night.skyHor) },
    cBot: { value: new THREE.Color(PRESETS.night.skyBot) },
    sunDir: { value: new THREE.Vector3(0.4, 0.3, 0.86).normalize() },
    sunCol: { value: new THREE.Color(PRESETS.night.sun) },
    cloudA: { value: new THREE.Color(PRESETS.night.cloudA) },
    cloudB: { value: new THREE.Color(PRESETS.night.cloudB) },
    glowCol: { value: new THREE.Color('#ffb46a') },
    night: { value: 1 }, sunI: { value: 1 }, haze: { value: 1 },
    stars: { value: 1 }, flood: { value: 1 }, time: { value: 0 }, cloudAmt: { value: 0.62 },
    sunUV: { value: new THREE.Vector2(0.5, 0.5) },
  };
  const domeMat = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, uniforms: U,
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: true,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4200, 64, 40), domeMat);
  dome.name = 'sky-dome';
  dome.renderOrder = -1000;
  dome.frustumCulled = false;
  scene.add(dome);

  /* ── 灯光 ── */
  const hemi = new THREE.HemisphereLight(0x4d6490, 0x14161a, 0.6);
  hemi.name = 'sky-hemi';
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0x8899bb, 0.18);
  ambient.name = 'sky-ambient';
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xc3d4ff, 0.2);
  sun.name = 'sky-sun';
  sun.position.set(-380, 520, 420);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -320; sc.right = 320; sc.top = 320; sc.bottom = -320; sc.near = 60; sc.far = 2400;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 1.2;
  sun.shadow.autoUpdate = true;
  scene.add(sun);
  scene.add(sun.target);

  /* 4 组灯桥方向光（夜间开启，模拟内檐灯桥的成组投光） */
  const floods = [];
  LIGHT_RIGS.forEach((rig) => {
    const l = new THREE.DirectionalLight(0xfff3e2, 0);
    l.position.copy(rig.pos).multiplyScalar(1.0);
    l.target.position.set(0, 0, 0);
    scene.add(l); scene.add(l.target);
    floods.push(l);
  });
  /* 场地补光（让草皮在夜赛里也读得出层次） */
  const top = new THREE.DirectionalLight(0xffe9cc, 0);
  top.position.set(0, 220, 0); top.target.position.set(0, 0, 0);
  scene.add(top); scene.add(top.target);

  /* ── 灯桥可见光锥 ── */
  const coneGroup = new THREE.Group();
  coneGroup.name = 'sky-lightcones';
  scene.add(coneGroup);
  const cones = [];
  LIGHT_RIGS.forEach((rig) => {
    const topP = rig.pos.clone();
    const footP = new THREE.Vector3(0, 0.02, 0);
    const len = topP.distanceTo(footP);
    // 锥体：上口小、下口大（向场地中心散开）
    const rTop = 7.5, rBot = 26.0;
    const g = new THREE.CylinderGeometry(rTop, rBot, len, 22, 1, true);
    g.translate(0, -len / 2, 0);
    const mat = new THREE.ShaderMaterial({
      vertexShader: coneVert, fragmentShader: coneFrag,
      uniforms: {
        color: { value: new THREE.Color('#ffeccd') },
        intensity: { value: 0 },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, fog: false, toneMapped: false,
    });
    const m = new THREE.Mesh(g, mat);
    m.position.copy(topP);
    m.lookAt(footP);
    m.rotateX(-Math.PI / 2);      // cylinder 轴向 = -Y → 对准 footP
    m.frustumCulled = false;
    m.renderOrder = 8;
    coneGroup.add(m);
    cones.push(mat);
  });

  /* ── 草皮上的亮斑（4 组灯桥各一片，中心偏场地中心外侧） ── */
  const poolGroup = new THREE.Group();
  poolGroup.name = 'sky-lightpools';
  scene.add(poolGroup);
  const pools = [];
  LIGHT_RIGS.forEach((rig) => {
    const g = new THREE.PlaneGeometry(74, 60);
    g.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: poolVert, fragmentShader: poolFrag,
      uniforms: { color: { value: new THREE.Color('#fff2dd') }, intensity: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      fog: false, toneMapped: false,
    });
    const m = new THREE.Mesh(g, mat);
    const c = rig.pos.clone().setY(0);
    const k = 0.42;                          // 亮斑中心向场地中心收
    m.position.set(c.x * k, 0.045, c.z * k);
    m.renderOrder = 7;
    poolGroup.add(m);
    pools.push(mat);
  });
  /* 草皮整体的柔光罩（让 4 片亮斑之间也有过渡） */
  const pitchGlowGeo = new THREE.PlaneGeometry(150, 112);
  pitchGlowGeo.rotateX(-Math.PI / 2);
  const pitchGlowMat = new THREE.ShaderMaterial({
    vertexShader: poolVert, fragmentShader: poolFrag,
    uniforms: { color: { value: new THREE.Color('#fff4e4') }, intensity: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    fog: false, toneMapped: false,
  });
  const pitchGlow = new THREE.Mesh(pitchGlowGeo, pitchGlowMat);
  pitchGlow.position.y = 0.04;
  pitchGlow.renderOrder = 6;
  poolGroup.add(pitchGlow);

  /* ── 夜间点光（≤8 个真实 PointLight） ── */
  const points = [];
  const PT_DEFS = [
    [0, 3, 196, 0xffd9a8, 190, 40],        // 广场水景 / 大台阶
    [0, 4, 300, 0xffcf9a, 190, 34],        // 南侧商业带
    [-215, 14, -34, 0xfff0d6, 140, 90],    // 训练场
    [230, 6, 30, 0xffe6c2, 120, 26],       // 公交 / 地铁接驳
    [232, 18, 232, 0xffeccc, 130, 46],     // 停车楼
    [-240, 12, 196, 0xffe2bc, 120, 30],    // 西侧社区
    [0, 3, 0, 0xfff2de, 160, 0.6],         // 场地中心（与灯桥叠加的柔光）
  ];
  const addPoint = (x, y, z, color, dist, _i) => {
    const p = new THREE.PointLight(color, 0, dist, 2);
    p.position.set(x, y, z);
    scene.add(p);
    points.push(p);
    return p;
  };
  PT_DEFS.forEach((d, i) => addPoint(d[0], d[1], d[2], d[3], d[4], i));

  let stageRef = null;
  let lampsRef = null;

  const api = {
    dome, U, hemi, ambient, sun, floods, top,
    cones, pools, points, coneGroup, poolGroup, rigs: LIGHT_RIGS,
    update(dt, t) {
      U.time.value = t;

      /* ── 颜色 / 强度（全部来自 preset，昼夜平滑） ── */
      const nightF = clamp(preset.night ?? 0, 0, 1);
      U.cTop.value.set(preset.skyTop);
      U.cHor.value.set(preset.skyHor);
      U.cBot.value.set(preset.skyBot);
      U.sunCol.value.set(preset.sun);
      U.cloudA.value.set(preset.cloudA || '#ffffff');
      U.cloudB.value.set(preset.cloudB || '#cccccc');
      U.glowCol.value.set(preset.night > 0.5 ? '#f0c79a' : '#ffd2a0');
      U.haze.value = preset.haze ?? 1;
      U.night.value = nightF;
      U.stars.value = preset.stars;
      U.flood.value = preset.flood;
      U.cloudAmt.value = clamp(0.25 + (preset.haze ?? 1) * 0.55, 0, 0.95);

      /* 太阳方向：仰角越低越偏暖（日出日落） */
      const el = (preset.sunEl ?? 8) * Math.PI / 180;
      const az = (preset.sunAz ?? 0) * Math.PI / 180;
      const dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).normalize();
      U.sunDir.value.copy(dir);
      U.sunI.value = clamp(preset.sunI ?? 1, 0, 4);

      /* 日光/月光：白天用太阳，夜里几乎归零（夜景由灯桥与灯带主导） */
      const sunI = preset.sunI ?? 1;
      hemi.color.set(preset.hemiSky);
      hemi.groundColor.set(preset.hemiGround);
      hemi.intensity = (preset.hemiI ?? 1) * (nightF > 0.5 ? 0.92 : 1.0);
      ambient.intensity = 0.06 + nightF * 0.16;

      sun.color.set(preset.sun);
      sun.intensity = sunI * (nightF > 0.6 ? 0.55 : 0.62);
      sun.position.copy(dir).multiplyScalar(1400);
      sun.castShadow = (preset.sunI ?? 0) > 0.5;

      const fi = preset.floodI ?? 0;
      for (let i = 0; i < floods.length; i++) {
        const l = floods[i];
        l.intensity = fi * 0.30;
        /* 每组灯桥的投光方向略微错开（对准场地另一侧半场），让四角各有侧重 */
        const rig = LIGHT_RIGS[i];
        l.position.copy(rig.pos);
        l.target.position.set(rig.pos.x * -0.18, 0, rig.pos.z * -0.18);
      }
      top.intensity = fi * 0.09;

      /* 灯桥光锥 / 亮斑 */
      const coneI = clamp(fi / 2.2, 0, 1) * (0.35 + 0.65 * nightF);
      for (const m of cones) m.uniforms.intensity.value = coneI;
      for (const m of pools) m.uniforms.intensity.value = coneI * 0.9;
      pitchGlowMat.uniforms.intensity.value = coneI * 0.32;
      coneGroup.visible = coneI > 0.02;
      poolGroup.visible = coneI > 0.02;

      /* 点光（≤8） */
      const ptI = clamp(fi / 2.2, 0, 1.4) * (0.3 + nightF);
      for (let i = 0; i < points.length; i++) {
        points[i].intensity = PT_DEFS[i][5] * ptI;
      }

      /* 场地 SpotLight（arena.lamps 由 bindLamps 提供） */
      if (lampsRef) for (const sp of lampsRef) sp.intensity = (fi || 0) * 6.0;

      /* 雾 / 曝光 / IBL */
      if (scene.fog) {
        scene.fog.color.set(preset.fog);
        scene.fog.density = preset.fogD;
      }
      if (stageRef && stageRef.renderer) {
        stageRef.renderer.toneMappingExposure = preset.exposure;
        stageRef.renderer.setClearColor(new THREE.Color(preset.skyHor), 1);
      }
      applyEnvFromPreset(preset);
    },
  };
  api.bindStage = (s) => { stageRef = s; };
  api.bindLamps = (arr) => {
    lampsRef = arr;
    /* 让场地聚光灯真正投影到草皮（每帧重算太贵，只在绑定时打开） */
    if (arr) arr.forEach((sp) => { sp.castShadow = false; sp.angle = 0.9; sp.penumbra = 0.6; });
  };
  return api;
}
