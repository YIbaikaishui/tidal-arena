/* ═══════════════════════════════════════════════════════════════════════
   materials.js — 材质库与程序化纹理（建筑本体专用）
   所有纹理都用 canvas 现场生成，不依赖任何外部资源。
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { canvasTex } from './core.js';
import { MODEL } from './seats.js';

/* ── 清水混凝土（横向模板缝 + 轻微斑驳） ── */
export function concreteMaps() {
  const bc = (ctx, w, h) => {
    ctx.fillStyle = '#cfc9bd'; ctx.fillRect(0, 0, w, h);
    // 细骨料噪点
    for (let i = 0; i < 26000; i++) {
      const g = 190 + Math.random() * 50 | 0;
      ctx.fillStyle = `rgba(${g},${g - 4},${g - 10},${0.05 + Math.random() * 0.16})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
    }
    // 模板拼缝（每 1/4 高度一道）
    for (let k = 0; k <= 4; k++) {
      const y = (k / 4) * h;
      ctx.fillStyle = 'rgba(90,86,78,.30)'; ctx.fillRect(0, y, w, 1.6);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, y + 1.6, w, 1);
    }
    // 对拉螺栓孔
    for (let k = 0; k < 8; k++) for (let j = 0; j < 2; j++) {
      const x = (k + 0.5) / 8 * w, y = (j + 0.5) / 2 * h;
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,114,104,.55)'; ctx.fill();
    }
  };
  const map = canvasTex(512, 512, bc, { repeat: [8, 8], aniso: 8 });
  const rough = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#b8b8b8'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) {
      const g = 150 + Math.random() * 90 | 0;
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
  }, { srgb: false, repeat: [8, 8] });
  return { map, rough };
}

/* ── 石材（洞石：竖向细纹 + 分格缝） ── */
export function stoneMaps() {
  const map = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#e6dfd0'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.strokeStyle = `rgba(${170 + Math.random() * 60 | 0},${160 + Math.random() * 50 | 0},${140 + Math.random() * 40 | 0},.22)`;
      ctx.lineWidth = 0.7 + Math.random() * 1.6;
      const x = Math.random() * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 3, h * 0.3, x - 3, h * 0.7, x + 1, h); ctx.stroke();
    }
    // 石材分格（每 1/2 竖缝 + 每 1/4 横缝）
    ctx.strokeStyle = 'rgba(120,112,96,.35)'; ctx.lineWidth = 1.4;
    for (let k = 1; k < 2; k++) { ctx.beginPath(); ctx.moveTo(k * w / 2, 0); ctx.lineTo(k * w / 2, h); ctx.stroke(); }
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(0, k * h / 4); ctx.lineTo(w, k * h / 4); ctx.stroke(); }
  }, { repeat: [10, 6], aniso: 8 });
  return { map };
}

/* ── 阳极氧化铝板（竖向分格 + 拉丝） ── */
export function aluMaps() {
  const map = canvasTex(512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#d6dae0'); g.addColorStop(0.45, '#c3c9d1'); g.addColorStop(0.5, '#b3bac3');
    g.addColorStop(0.55, '#c9cfd7'); g.addColorStop(1, '#aeb6c0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.07})`;
      ctx.lineWidth = 0.6;
      const y = Math.random() * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + (Math.random() - 0.5) * 2); ctx.stroke();
    }
    // 板缝
    ctx.fillStyle = 'rgba(70,76,84,.5)';
    for (let k = 0; k < 4; k++) ctx.fillRect(k * w / 4, 0, 1.6, h);
    ctx.fillRect(0, h / 2, w, 1.4);
  }, { repeat: [14, 3], aniso: 8 });
  return { map };
}

/* ── 青铜色金属网幕（斜向网格，带镂空 alphaMap） ── */
export function bronzeMeshMaps() {
  const W = 256;
  const map = canvasTex(W, W, (ctx, w, h) => {
    ctx.fillStyle = '#8a7550'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#b99b6a'; ctx.lineWidth = 2;
    for (let i = -w; i < w * 2; i += 12) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i, h); ctx.lineTo(i + h, 0); ctx.stroke();
    }
  }, { repeat: [26, 8], aniso: 4 });
  const alphaMap = canvasTex(W, W, (ctx, w, h) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.0;
    for (let i = -w; i < w * 2; i += 12) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i, h); ctx.lineTo(i + h, 0); ctx.stroke();
    }
  }, { srgb: false, repeat: [26, 8] });
  return { map, alphaMap };
}

/* ── 屋面直立锁边（沿环向分板 + 细微高差） ── */
export function roofMaps() {
  const map = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#9aa2ab'; ctx.fillRect(0, 0, w, h);
    // 每个色带是一块板
    for (let k = 0; k < 4; k++) {
      const x0 = k * w / 4;
      const v = 148 + ((k * 37) % 26) - 13;
      ctx.fillStyle = `rgb(${v},${v + 6},${v + 14})`;
      ctx.fillRect(x0, 0, w / 4 - 2, h);
      // 锁边（左侧立边高光 + 阴影）
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x0, 0, 2, h);
      ctx.fillStyle = 'rgba(30,36,44,.55)'; ctx.fillRect(x0 + 2, 0, 2, h);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x0 + w / 4 - 3, 0, 3, h);
    }
    // 细微污渍
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(${90 + Math.random() * 60 | 0},${95 + Math.random() * 60 | 0},${100 + Math.random() * 60 | 0},.05)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 8, Math.random() * 2);
    }
  }, { repeat: [1, 1], wrap: THREE.RepeatWrapping, aniso: 8 });
  return { map };
}

/* ── 看台踏板（混凝土 + 踏步阴影） ── */
export function tierMaps() {
  const map = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#a9a49a'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 12000; i++) {
      const g = 140 + Math.random() * 70 | 0;
      ctx.fillStyle = `rgba(${g},${g},${g - 6},.10)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.fillStyle = 'rgba(60,58,54,.22)';
    for (let k = 0; k < 4; k++) ctx.fillRect(0, k * h / 4, w, 2);
  }, { repeat: [18, 24], aniso: 8 });
  return { map };
}

/* ── 草皮（割草条纹 + 球门区纹理 + 场地线） ── */
export function pitchMaps() {
  const W = 2048, H = 1330;
  const map = canvasTex(W, H, (ctx, w, h) => {
    // 割草条纹（沿长轴 z）
    const stripes = 22;
    for (let i = 0; i < stripes; i++) {
      const x0 = (i / stripes) * w;
      const light = i % 2 === 0;
      const g = ctx.createLinearGradient(x0, 0, x0 + w / stripes, 0);
      g.addColorStop(0, light ? '#3f7a3c' : '#356b34');
      g.addColorStop(1, light ? '#43804133' : '#326832');
      ctx.fillStyle = light ? '#3e783b' : '#356a34';
      ctx.fillRect(x0, 0, w / stripes + 1, h);
    }
    // 草叶噪点
    for (let i = 0; i < 90000; i++) {
      const g = 40 + Math.random() * 70 | 0;
      ctx.fillStyle = `rgba(${g * 0.65 | 0},${g + 45},${g * 0.55 | 0},${0.05 + Math.random() * 0.13})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 3.5);
    }
    // 场地线（105×68 → 全画布留 3m 边）
    const cx = w / 2, cy = h / 2;
    const PXM = w / 111;              // 每米像素（含 3m 边距）
    const L = 105 * PXM, Wd = 68 * PXM;
    ctx.strokeStyle = 'rgba(238,244,238,.92)'; ctx.lineWidth = Math.max(2.5, PXM * 0.12);
    ctx.strokeRect(cx - Wd / 2, cy - L / 2, Wd, L);
    // 中线 + 中圈
    ctx.beginPath(); ctx.moveTo(cx - Wd / 2, cy); ctx.lineTo(cx + Wd / 2, cy); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 9.15 * PXM, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 0.35 * PXM, 0, Math.PI * 2); ctx.fillStyle = 'rgba(238,244,238,.92)'; ctx.fill();
    // 两端禁区 / 球门区 / 点球点 / 弧线
    for (const s of [-1, 1]) {
      const gy = cy + s * L / 2;
      const boxW = 40.32 * PXM, boxD = 16.5 * PXM;
      ctx.strokeRect(cx - boxW / 2, s > 0 ? gy - boxD : gy, boxW, boxD);
      const goalW = 18.32 * PXM, goalD = 5.5 * PXM;
      ctx.strokeRect(cx - goalW / 2, s > 0 ? gy - goalD : gy, goalW, goalD);
      const px = cx, py = gy - s * 11 * PXM;
      ctx.beginPath(); ctx.arc(px, py, 0.3 * PXM, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.arc(px, py, 9.15 * PXM, s > 0 ? Math.PI * 0.72 : Math.PI * 1.72, s > 0 ? Math.PI * 0.28 : Math.PI * 1.28);
      ctx.stroke();
    }
    // 角弧
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + sx * Wd / 2, cy + sy * L / 2, 1.0 * PXM, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, { aniso: 16 });
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  return { map };
}

/* ── LED 广告板内容（循环 8 幅） ── */
export function adBoardMaps() {
  const map = canvasTex(1024, 128, (ctx, w, h) => {
    const cols = ['#0a1a2a', '#0d2030', '#08161f', '#0b1c28'];
    ctx.fillStyle = cols[0]; ctx.fillRect(0, 0, w, h);
    const words = ['TIDAL ARENA', '潮汐场 · 2026', 'WORLD CUP', 'MATCH DAY'];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < 4; i++) {
      const x = (i + 0.5) * w / 4;
      ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(i * w / 4, 0, w / 4, h);
      ctx.fillStyle = i % 2 ? '#6fd3e0' : '#f0cf8a';
      ctx.font = '600 34px Oswald, "Arial Narrow", sans-serif';
      ctx.fillText(words[i], x, h * 0.5);
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2;
      ctx.strokeRect(i * w / 4 + 2, 2, w / 4 - 4, h - 4);
    }
  }, { wrap: THREE.RepeatWrapping, aniso: 8 });
  return { map };
}

/* ── 大屏（比分牌） ── */
export function scoreboardMap() {
  return canvasTex(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#05090d'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0d3a44'; ctx.fillRect(0, 0, w, h * 0.22);
    ctx.fillStyle = '#6fd3e0'; ctx.font = '600 46px Oswald, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('TIDAL ARENA · WORLD CUP 2026', w / 2, h * 0.15);
    ctx.fillStyle = '#e8c07a'; ctx.font = '300 150px Oswald, sans-serif';
    ctx.fillText('2  :  1', w / 2, h * 0.55);
    ctx.fillStyle = '#cfe6ee'; ctx.font = '300 40px Oswald, sans-serif';
    ctx.fillText('78:24', w / 2, h * 0.72);
    ctx.fillStyle = '#7e99a5'; ctx.font = '300 28px "JetBrains Mono", monospace';
    ctx.fillText('ATT ' + MODEL.total.toLocaleString('en-US'), w / 2, h * 0.88);
  }, { aniso: 8 });
}

/* ══════════════ 材质库 ══════════════ */
export function makeMaterials(renderer) {
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.85 }, o));
  const CM = concreteMaps(); CM.map.anisotropy = aniso;
  const SM = stoneMaps(); SM.map.anisotropy = aniso;
  const AM = aluMaps(); AM.map.anisotropy = aniso;
  const BM = bronzeMeshMaps();
  const RM = roofMaps(); RM.map.anisotropy = aniso;
  const TM = tierMaps(); TM.map.anisotropy = aniso;
  const PM = pitchMaps(); PM.map.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const AD = adBoardMaps();

  return {
    /* 清水混凝土 */
    concrete: std({ color: 0xd8d2c6, map: CM.map, roughnessMap: CM.rough, roughness: 0.92, metalness: 0.02, envMapIntensity: 0.55 }),
    concreteDark: std({ color: 0x6e6a63, roughness: 0.94, metalness: 0.02 }),
    concreteLight: std({ color: 0xe4dfd3, roughness: 0.9, metalness: 0.02 }),
    /* 石材 / 洞石 */
    stone: std({ color: 0xe8e0cf, map: SM.map, roughness: 0.74, metalness: 0.02, envMapIntensity: 0.7 }),
    /* 铝板 */
    alu: std({ color: 0xd2d8df, map: AM.map, roughness: 0.38, metalness: 0.62, envMapIntensity: 1.15 }),
    aluDark: std({ color: 0x8b949e, roughness: 0.46, metalness: 0.6, envMapIntensity: 1.0 }),
    aluLight: std({ color: 0xe6ebf0, roughness: 0.3, metalness: 0.55, envMapIntensity: 1.3 }),
    /* 青铜网幕 */
    bronze: std({ color: 0xb08c58, roughness: 0.42, metalness: 0.78, envMapIntensity: 1.15 }),
    bronzeMesh: std({
      color: 0xc09b63, map: BM.map, alphaMap: BM.alphaMap, transparent: true,
      alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.42, metalness: 0.72, envMapIntensity: 1.1,
    }),
    /* 屋盖 */
    roofMetal: std({ color: 0xc6ccd4, map: RM.map, roughness: 0.52, metalness: 0.22, envMapIntensity: 0.75 }),
    roofSoffit: std({ color: 0xa9b1b9, roughness: 0.64, metalness: 0.20, envMapIntensity: 0.6, side: THREE.DoubleSide }),
    /* 钢构 */
    steel: std({ color: 0xb4bcc4, roughness: 0.35, metalness: 0.88, envMapIntensity: 1.25 }),
    steelDark: std({ color: 0x4e555c, roughness: 0.48, metalness: 0.8 }),
    /* 玻璃 */
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x9fb4c4, roughness: 0.06, metalness: 0.0, transparent: true, opacity: 0.26,
      envMapIntensity: 1.9, side: THREE.DoubleSide, depthWrite: false,
    }),
    glassDark: new THREE.MeshPhysicalMaterial({
      color: 0x2b3946, roughness: 0.1, metalness: 0.15, transparent: true, opacity: 0.6,
      envMapIntensity: 1.3, side: THREE.DoubleSide,
    }),
    glassLite: new THREE.MeshPhysicalMaterial({
      color: 0xcfe2ea, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16,
      envMapIntensity: 2.0, side: THREE.DoubleSide, depthWrite: false,
    }),
    /* 看台踏板 */
    tier: std({ color: 0xb0aaa0, map: TM.map, roughness: 0.88, metalness: 0.03, envMapIntensity: 0.5 }),
    /* 座椅（顶点色由实例材质控制） */
    seat: std({ color: 0xffffff, roughness: 0.58, metalness: 0.04, vertexColors: false, envMapIntensity: 0.55, side: THREE.DoubleSide }),
    /* 场地 */
    pitch: std({ color: 0xffffff, map: PM.map, roughness: 0.96, metalness: 0, envMapIntensity: 0.22 }),
    line: new THREE.MeshBasicMaterial({ color: 0xf2f5ee, transparent: true, opacity: 0.92 }),
    /* 发光 */
    led: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    adBoard: new THREE.MeshBasicMaterial({ map: AD.map, toneMapped: false }),
    scoreboard: new THREE.MeshBasicMaterial({ map: null, toneMapped: false }),
    glow: new THREE.MeshBasicMaterial({ color: 0xfff2dc, toneMapped: false }),
    glowCool: new THREE.MeshBasicMaterial({ color: 0xdff3ff, toneMapped: false }),
    glowWarm: new THREE.MeshBasicMaterial({ color: 0xffd9a8, toneMapped: false }),
    glowCyan: new THREE.MeshBasicMaterial({ color: 0x6fd3e0, toneMapped: false }),
    /* 金属栏杆 */
    rail: std({ color: 0x9aa3ac, roughness: 0.28, metalness: 0.92, envMapIntensity: 1.35 }),
    /* 室内 */
    interior: std({ color: 0xdcd4c6, roughness: 0.74, metalness: 0.04 }),
    interiorDark: std({ color: 0x3c4248, roughness: 0.82 }),
    carpet: std({ color: 0x1b3b47, roughness: 0.95 }),
    wood: std({ color: 0x9a7050, roughness: 0.66 }),
    grass: std({ color: 0x3f7a3a, roughness: 0.95 }),
    /* 水体（广场） */
    water: new THREE.MeshStandardMaterial({ color: 0x14384a, roughness: 0.06, metalness: 0.6, envMapIntensity: 1.6 }),
  };
}
