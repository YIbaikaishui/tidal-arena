/* ═══════════════════════════════════════════════════════════════════════
   postfx.js — 后期处理管线
     RenderPass(场景) → 描边合成(高亮蒙版邻域) → Bloom(自适应) → 合成
   · Bloom 阈值/强度随昼夜自适应；曝光、暗角、轻色差、胶片颗粒、闪白
   · 选中构件描边：把选中对象画到一张半分辨率蒙版（覆盖材质白色），
     后期用 3×3 邻域差画外轮廓；不侵入主渲染的模板状态
   · setQuality('low'|'mid'|'high')：low 直出（无后期、关 bloom）
   · 保留 API：render / flash / setDraft / setDraftCamera / bloomEnabled / exposureBoost
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { preset } from './core.js';

/* ══════════════ 合成着色器 ══════════════ */
const ComposeShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    exposure: { value: 1 },
    vignette: { value: 1 },
    grain: { value: 0.016 },
    ca: { value: 0.0007 },
    flash: { value: 0 },
    flashColor: { value: new THREE.Color('#ffffff') },
    res: { value: new THREE.Vector2(1, 1) },
    sat: { value: 1.05 },
    contrast: { value: 1.025 },
    lift: { value: 0.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
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
    }`,
};

/* ══════════════ 描边合成（蒙版邻域） ══════════════ */
const OutlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    tMask: { value: null },
    res: { value: new THREE.Vector2(1, 1) },
    color: { value: new THREE.Color('#7fe2ef') },
    strength: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
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
    }`,
};

export function buildPostFX(stage) {
  const r = stage.renderer;
  const w = window.innerWidth, h = window.innerHeight;
  const composer = new EffectComposer(r);
  composer.setPixelRatio(stage.pr);
  composer.setSize(w, h);

  /* 高亮蒙版：半分辨率，够用且便宜 */
  const maskScale = 0.5;
  const rtMask = new THREE.WebGLRenderTarget(
    Math.max(4, Math.round(w * stage.pr * maskScale)),
    Math.max(4, Math.round(h * stage.pr * maskScale)),
    { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }
  );
  rtMask.texture.generateMipmaps = false;
  const maskScene = new THREE.Scene();
  const maskMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, toneMapped: false, side: THREE.DoubleSide,
  });
  const maskCam = new THREE.PerspectiveCamera();

  composer.addPass(new RenderPass(stage.scene, stage.camera));
  const outlinePass = new ShaderPass(OutlineShader);
  outlinePass.uniforms.tMask.value = rtMask.texture;
  outlinePass.renderToScreen = false;
  composer.addPass(outlinePass);
  /* bloom 用半分辨率：视觉几乎无差别，mip 链的采样量降到 1/4 */
  const bloom = new UnrealBloomPass(new THREE.Vector2(w * 0.5, h * 0.5), 0.62, 0.66, 0.86);
  composer.addPass(bloom);
  const compose = new ShaderPass(ComposeShader);
  compose.renderToScreen = true;
  compose.uniforms.res.value.set(w, h);
  composer.addPass(compose);

  const outline = { obj: null, strength: 0, target: 0 };

  const api = {
    composer, bloom, compose, outlinePass,
    draftMode: false,
    draftCam: null,
    bloomEnabled: true,
    perfMode: false,
    outlinePending: false,
    exposureBoost: 1.0,
    quality: 'high',
    outline: null,
    _flash: 0,

    /* 选中构件描边（传 null 取消） */
    setOutline(obj) {
      outline.obj = obj || null;
      api.outline = obj || null;
      outline.target = obj ? 1 : 0;
      api.outlinePending = !!obj;     /* 下一帧一定要画一次蒙版 */
      if (!obj) { outline.strength = 0; outlinePass.uniforms.strength.value = 0; }
    },

    /* 省电模式：关泛光整条 mip 链 + 关颗粒/色差（每帧全屏逐像素计算，核显上是真金白银）。
       关掉泛光后画面整体偏暗，顺手补一点曝光，让「轻量」不等于「发灰」。 */
    setPerfMode(on) {
      api.perfMode = !!on;
      api.bloomEnabled = !api.perfMode;
      bloom.enabled = !api.perfMode;
      compose.uniforms.grain.value = api.perfMode ? 0 : 0.016;
      compose.uniforms.ca.value = api.perfMode ? 0 : 0.0007;
      api.exposureBoost = api.perfMode ? 1.14 : 1.0;
      if (api.perfMode) api.setQuality(stage.quality || 'high');
      else api.resize();
      return api;
    },

    /* 统一的尺寸同步：所有 renderTarget / uniform 都在这里对齐，避免手写重复 */
    resize() {
      const W = window.innerWidth, H = window.innerHeight;
      composer.setPixelRatio(stage.pr);
      composer.setSize(W, H);
      bloom.resolution.set(W * 0.5, H * 0.5);
      compose.uniforms.res.value.set(W, H);
      outlinePass.uniforms.res.value.set(W, H);
      rtMask.setSize(
        Math.max(4, Math.round(W * stage.pr * maskScale)),
        Math.max(4, Math.round(H * stage.pr * maskScale))
      );
    },

    setQuality(level) {
      const q = level || stage.quality || 'high';
      api.quality = q;
      const low = q === 'low';
      if (!api.perfMode || low) {
        api.bloomEnabled = !low;
        bloom.enabled = !low;
      }
      const grainOn = !api.perfMode && !low;
      compose.uniforms.grain.value = grainOn ? (q === 'mid' ? 0.011 : 0.016) : 0.0;
      compose.uniforms.ca.value = grainOn ? (q === 'mid' ? 0.0005 : 0.0007) : 0.0;
      stage.onResize && stage.onResize();
      return api;
    },

    setDraft(on) {
      api.draftMode = !!on;
      const sc = stage.scene;
      if (on) {
        if (sc.background == null) sc.background = new THREE.Color('#0d141c');
        if (sc.fog) { sc._fog = sc.fog; sc.fog = null; }
      } else if (sc._fog) {
        sc.fog = sc._fog; sc._fog = null;
        sc.background = null;
      }
    },
    setDraftCamera(cam) { api.draftCam = cam; },

    flash(color = '#ffffff', amt = 0.5) {
      compose.uniforms.flashColor.value.set(color);
      api._flash = amt;
    },

    render(dt, t) {
      dt = Math.min(dt || 0.016, 0.12);
      compose.uniforms.time.value = t;
      compose.uniforms.exposure.value = preset.exposure * api.exposureBoost;
      /* Bloom 随昼夜自适应 */
      if (bloom.enabled) {
        const night = preset.night;
        bloom.strength = 0.14 + night * 0.54;
        bloom.radius = 0.55 + night * 0.10;
        bloom.threshold = 0.94 - night * 0.20;
      }
      /* 闪白衰减 */
      if (api._flash > 0.001) {
        api._flash *= Math.pow(0.0016, dt);
        compose.uniforms.flash.value = api._flash;
      } else compose.uniforms.flash.value = 0;

      /* 描边强度缓动 */
      outline.strength += (outline.target - outline.strength) * Math.min(1, dt * 9);
      if (outline.strength < 0.004) outline.strength = 0;
      outlinePass.uniforms.strength.value = outline.strength * 0.9;

      /* 二维正交视图：直出 */
      if (api.draftMode && api.draftCam) {
        r.setRenderTarget(null);
        r.clear();
        r.render(stage.scene, api.draftCam);
        return;
      }
      /* 低画质：直出主相机（无后期） */
      if (api.quality === 'low') {
        r.setRenderTarget(null);
        r.clear();
        r.render(stage.scene, stage.camera);
        return;
      }
      /* 高亮蒙版：把选中对象单独画一遍（覆盖材质），供描边 pass 采样。
         只有选中的那一棵子树在画，所以平时是 0 成本；这里额外加个「刚选中必然画一次」，
         防止选中瞬间 strength 还是 0 导致第一帧没有轮廓。 */
      if (outline.obj && (outline.strength > 0.01 || api.outlinePending)) {
        renderMask();
        api.outlinePending = false;
      }
      composer.render(dt);
    },
  };

  function renderMask() {
    const cam = stage.camera;
    maskCam.position.copy(cam.position);
    maskCam.quaternion.copy(cam.quaternion);
    maskCam.fov = cam.fov; maskCam.aspect = cam.aspect;
    maskCam.near = cam.near; maskCam.far = cam.far;
    maskCam.updateProjectionMatrix();
    maskCam.updateMatrixWorld();
    maskScene.overrideMaterial = maskMat;
    /* 把选中子树临时挪进蒙版场景渲染（渲染后归位，主场景状态不受影响） */
    const added = [];
    outline.obj.updateMatrixWorld(true);
    outline.obj.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.__maskParent = o.parent;
      added.push(o);
    });
    for (const o of added) maskScene.add(o);
    r.setRenderTarget(rtMask);
    r.setClearColor(0x000000, 0);
    r.clear(true, true, true);
    r.render(maskScene, maskCam);
    r.setRenderTarget(null);
    r.setClearColor(new THREE.Color(0x0a0d12), 1);
    for (const o of added) {
      if (o.userData.__maskParent) { o.userData.__maskParent.add(o); o.userData.__maskParent = null; }
      else maskScene.remove(o);
    }
    maskScene.overrideMaterial = null;
  }

  stage.onResize = () => api.resize();
  stage.onResize();
  api.setQuality(stage.quality || 'high');
  return api;
}
