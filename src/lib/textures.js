/* ═══════════════════════════════════════════════════════════════════════
   textures.js — 程序化纹理（全部离线用 Canvas 画，零外部资源）
   v2：新增广场花岗岩放射铺装 / 沥青（带车道线）/ 草地 / 城市地块（含窗格）；
       全部用确定性伪随机（mulberry），同一个 seed 每次刷新图案一致。
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const CV = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};
const TEX = (cv, { srgb = true, wrap = THREE.ClampToEdgeWrapping, aniso = 8 } = {}) => {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = wrap;
  t.anisotropy = aniso;
  return t;
};
/* 确定性随机（纹理必须可复现，否则每次刷新噪点位置都变） */
function rnd(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ══════════════ 草皮：割草条纹 + 场地标线 ══════════════ */
export function pitchTexture() {
  const W = 2048, H = 1400;
  const cv = CV(W, H), ctx = cv.getContext('2d');
  const R = rnd(20260611);
  const padX = 6, padZ = 6;
  const wx = 105 + padX * 2, wz = 68 + padZ * 2;
  const px = (x) => (x + 105 / 2 + padX) / wx * W;
  const pz = (z) => (z + 68 / 2 + padZ) / wz * H;
  const sx = (m) => m / wx * W;
  const sz = (m) => m / wz * H;

  // 底色
  ctx.fillStyle = '#3f6b33';
  ctx.fillRect(0, 0, W, H);
  // 割草条纹（南北向 6m 一条，交错明暗）
  const stripe = 5.4;
  for (let i = 0; i * stripe < 105; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(px(-52.5 + i * stripe), pz(-34), sx(stripe), sz(68));
  }
  // 细颗粒噪点（草纹理）
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (R() - 0.5) * 16;
    d[i] += n; d[i + 1] += n * 1.15; d[i + 2] += n * 0.7;
  }
  ctx.putImageData(img, 0, 0);
  // 场外环绕（草皮以外的区域）
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.rect(px(-52.5), pz(-34), sx(105), sz(68));
  ctx.fillStyle = '#3a5f30';
  ctx.fill('evenodd');
  ctx.restore();

  // 标线
  ctx.strokeStyle = 'rgba(246,250,242,0.93)';
  ctx.lineWidth = Math.max(2, sx(0.12));
  ctx.lineCap = 'round';
  const L = 105, Wd = 68;
  ctx.strokeRect(px(-L / 2), pz(-Wd / 2), sx(L), sz(Wd));
  // 中线 + 中圈
  ctx.beginPath(); ctx.moveTo(px(0), pz(-Wd / 2)); ctx.lineTo(px(0), pz(Wd / 2)); ctx.stroke();
  ctx.beginPath(); ctx.arc(px(0), pz(0), sx(9.15), 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(px(0), pz(0), sx(0.22), 0, Math.PI * 2); ctx.fillStyle = 'rgba(246,250,242,0.93)'; ctx.fill();
  // 禁区 / 小禁区 / 点球点 / 弧线（两端）
  const pen = (sign) => {
    const bx = sign * L / 2;
    const penD = 16.5, penW = 40.32, goalD = 5.5, goalW = 18.32;
    ctx.strokeRect(px(bx - sign * penD), pz(-penW / 2), sx(penD), sz(penW));
    ctx.strokeRect(px(bx - sign * goalD), pz(-goalW / 2), sx(goalD), sz(goalW));
    const pxSpot = px(bx - sign * 11);
    ctx.beginPath(); ctx.arc(pxSpot, pz(0), sx(0.2), 0, Math.PI * 2); ctx.fill();
    const a0 = sign > 0 ? Math.PI * 0.72 : Math.PI * 1.28;
    const a1 = sign > 0 ? Math.PI * 1.28 : Math.PI * 1.72;
    ctx.beginPath(); ctx.arc(pxSpot, pz(0), sx(9.15 * 0.72), Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
  };
  pen(1); pen(-1);
  // 角球弧
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([ax, az]) => {
    const cx = px(ax * L / 2), cz = pz(az * Wd / 2);
    ctx.beginPath(); ctx.arc(cx, cz, sx(1.0), 0, Math.PI * 2); ctx.stroke();
  });
  const t = TEX(cv, { wrap: THREE.ClampToEdgeWrapping });
  t.anisotropy = 16;
  return t;
}

/* ══════════════ LED 广告板 ══════════════ */
export function adBoardTexture() {
  const W = 2048, H = 96;
  const cv = CV(W, H), ctx = cv.getContext('2d');
  ctx.fillStyle = '#0a0c10'; ctx.fillRect(0, 0, W, H);
  const brands = ['TIDAL ARENA', 'WORLD CUP 2026', '潮汐场', 'LIVE', 'FIFA WORLD CUP', 'TIDAL'];
  const cw = W / brands.length;
  brands.forEach((b, i) => {
    ctx.save();
    ctx.fillStyle = i % 2 ? '#0e141c' : '#101a26';
    ctx.fillRect(i * cw, 0, cw, H);
    ctx.fillStyle = i % 3 === 0 ? '#c9a15f' : '#8fd0d8';
    ctx.font = `600 ${Math.round(H * 0.44)}px Oswald, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b, i * cw + cw / 2, H * 0.52);
    ctx.restore();
  });
  const t = TEX(cv, { wrap: THREE.RepeatWrapping });
  return t;
}

/* ══════════════ 现场大屏 ══════════════ */
export function screenTexture() {
  const W = 1024, H = 512;
  const cv = CV(W, H), ctx = cv.getContext('2d');
  const draw = (state = {}) => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#08131f'); g.addColorStop(1, '#04090f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#1c3348'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c9a15f'; ctx.font = '300 30px Oswald, sans-serif';
    ctx.fillText(state.comp || 'FIFA WORLD CUP 2026', W / 2, 46);
    ctx.fillStyle = '#eef2f6'; ctx.font = '600 132px Oswald, sans-serif';
    ctx.fillText(String(state.hs ?? 1), W * 0.30, 200);
    ctx.fillText(String(state.as ?? 0), W * 0.70, 200);
    ctx.fillStyle = '#6d7a88'; ctx.font = '300 64px Oswald, sans-serif';
    ctx.fillText(':', W * 0.5, 196);
    ctx.fillStyle = '#9aa8b6'; ctx.font = '400 30px Oswald, sans-serif';
    ctx.fillText(state.home || '潮汐 FC', W * 0.30, 268);
    ctx.fillText(state.away || '北境联', W * 0.70, 268);
    ctx.fillStyle = '#c9a15f'; ctx.font = '400 34px JBMono, monospace';
    ctx.fillText(state.clock || "12'", W * 0.5, 272);
    ctx.fillStyle = '#22303c'; ctx.fillRect(0, 316, W, 2);
    ctx.fillStyle = '#7d8a97'; ctx.font = '400 24px JBMono, monospace';
    ctx.textAlign = 'left'; ctx.fillText('ATT ' + (state.att || '80,184'), 40, 356);
    ctx.textAlign = 'center'; ctx.fillText('TIDAL ARENA · 潮汐场', W / 2, 356);
    ctx.textAlign = 'right'; ctx.fillText('LIVE', W - 40, 356);
    // 时间轴
    ctx.fillStyle = '#16212c'; ctx.fillRect(0, 396, W, 86);
    ctx.fillStyle = '#8fd0d8'; ctx.fillRect(0, 396, W * (state.prog || 0.35), 86);
    ctx.textAlign = 'center'; ctx.fillStyle = '#0a1018'; ctx.font = '600 30px Oswald, sans-serif';
    ctx.fillText(state.status || 'GROUP STAGE · MATCH 1', W / 2, 440);
  };
  draw();
  const t = TEX(cv);
  t.redraw = draw;
  return t;
}

/* ══════════════ 石材 / 铝板 / 混凝土（法向 + 色） ══════════════ */
function noiseFill(ctx, W, H, amp, base) {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amp;
    d[i] = clamp255(d[i] + n); d[i + 1] = clamp255(d[i + 1] + n); d[i + 2] = clamp255(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
}
const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

export function stoneTextures() {
  const W = 512, H = 512;
  const cv = CV(W, H), ctx = cv.getContext('2d');
  ctx.fillStyle = '#e8e1d3'; ctx.fillRect(0, 0, W, H);
  // 石材分缝
  const rows = 8, cols = 4;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = c * W / cols + (r % 2 ? W / cols / 2 : 0);
    ctx.fillStyle = `rgba(${190 + Math.random() * 30},${182 + Math.random() * 30},${166 + Math.random() * 28},0.5)`;
    ctx.fillRect(x, r * H / rows, W / cols - 2, H / rows - 2);
  }
  ctx.strokeStyle = 'rgba(120,110,95,0.35)'; ctx.lineWidth = 2;
  for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * H / rows); ctx.lineTo(W, r * H / rows); ctx.stroke(); }
  for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * W / cols, 0); ctx.lineTo(c * W / cols, H); ctx.stroke(); }
  noiseFill(ctx, W, H, 22);
  return TEX(cv, { wrap: THREE.RepeatWrapping });
}

export function aluTextures() {
  const W = 128, H = 512;
  const cv = CV(W, H), ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#8b959f'); g.addColorStop(0.35, '#dfe6ec');
  g.addColorStop(0.5, '#f2f6f9'); g.addColorStop(0.68, '#c6ced6');
  g.addColorStop(1, '#7f8993');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // 铝肋分缝
  ctx.fillStyle = 'rgba(60,70,80,0.5)';
  for (let y = 0; y < H; y += 16) ctx.fillRect(0, y, W, 1.5);
  return TEX(cv, { wrap: THREE.RepeatWrapping });
}

export function concreteTexture() {
  const W = 256, H = 256;
  const cv = CV(W, H), ctx = cv.getContext('2d');
  ctx.fillStyle = '#b5afa4'; ctx.fillRect(0, 0, W, H);
  noiseFill(ctx, W, H, 30);
  ctx.strokeStyle = 'rgba(120,114,105,0.25)'; ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath(); ctx.moveTo(Math.random() * W, 0); ctx.lineTo(Math.random() * W, H); ctx.stroke();
  }
  return TEX(cv, { wrap: THREE.RepeatWrapping });
}

/* ══════════════ 立面夜景窗光（用于夜里外立面透光） ══════════════ */
export function facadeNightTexture() {
  const W = 1024, H = 512;
  const cv = CV(W, H), ctx = cv.getContext('2d');
  ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
  // 环廊长窗的光带
  const bands = [
    { y: 0.18, h: 0.10, c: '#ffd9a0' },
    { y: 0.36, h: 0.07, c: '#ffcf90' },
    { y: 0.55, h: 0.09, c: '#ffe3b8' },
    { y: 0.74, h: 0.06, c: '#ffd0a0' },
  ];
  bands.forEach((b) => {
    const gy = b.y * H, gh = b.h * H;
    ctx.fillStyle = b.c;
    for (let x = 0; x < W; x += 22) {
      if (Math.random() > 0.12) ctx.fillRect(x + 2, gy, 16, gh * (0.7 + Math.random() * 0.3));
    }
  });
  return TEX(cv, { wrap: THREE.RepeatWrapping });
}

/* ═══════════════════════════════════════════════════════════════════════
   以下为 site（场所与环境）新增纹理。全部 return THREE.Texture。
   ═══════════════════════════════════════════════════════════════════════ */

/* ══════════════ 广场花岗岩放射铺装（极坐标：u = 环向/8.5m，v = 径向/8.5m） ══════════════ */
export function plazaTexture() {
  const W = 1024, H = 512;
  const cv = CV(W, H), ctx = cv.getContext('2d');
  const R = rnd(7713);
  // 两种暖灰花岗岩
  ctx.fillStyle = '#a9a49a'; ctx.fillRect(0, 0, W, H);
  const cols = 8, rows = 4;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (W / cols / 2);
    for (let c = -1; c <= cols; c++) {
      const v = 158 + Math.floor(R() * 26);
      const warm = 8 + Math.floor(R() * 10);
      ctx.fillStyle = `rgb(${v + warm},${v + 2},${v - warm * 0.6})`;
      ctx.fillRect(c * W / cols + off + 1.2, r * H / rows + 1.2, W / cols - 2.4, H / rows - 2.4);
      // 石板内细颗粒
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let k = 0; k < 40; k++) {
        ctx.fillRect(c * W / cols + off + R() * (W / cols), r * H / rows + R() * (H / rows), 1.6, 1.6);
      }
    }
  }
  // 分缝
  ctx.strokeStyle = 'rgba(88,84,78,0.75)'; ctx.lineWidth = 2.2;
  for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * H / rows); ctx.lineTo(W, r * H / rows); ctx.stroke(); }
  for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * W / cols, 0); ctx.lineTo(c * W / cols, H); ctx.stroke(); }
  // 深色分格带（每 2 列一条，形成放射韵律）
  ctx.fillStyle = 'rgba(120,116,108,0.55)';
  for (let c = 0; c < cols; c += 2) ctx.fillRect(c * W / cols, 0, 5, H);
  const t = TEX(cv, { wrap: THREE.RepeatWrapping });
  t.anisotropy = 16;
  return t;
}

/* ══════════════ 沥青 + 车道线（u = 横向 /26m，v = 纵向 /40m） ══════════════ */
export function asphaltTexture() {
  const W = 512, H = 512;
  const cv = CV(W, H), ctx = cv.getContext('2d');
  const R = rnd(3311);
  ctx.fillStyle = '#3b3d40'; ctx.fillRect(0, 0, W, H);
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (R() - 0.5) * 22;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  // 车道线（横向坐标）：中间双黄线 + 两侧白色边线 + 白色车道虚线
  const cx = W / 2;
  ctx.fillStyle = 'rgba(226,206,120,0.92)';
  ctx.fillRect(cx - 7, 0, 4, H); ctx.fillRect(cx + 3, 0, 4, H);
  ctx.fillStyle = 'rgba(232,234,236,0.8)';
  ctx.fillRect(W * 0.035, 0, 4, H); ctx.fillRect(W * 0.965 - 4, 0, 4, H);
  ctx.fillStyle = 'rgba(232,234,236,0.62)';
  ctx.fillRect(cx - W * 0.25 - 2, 0, 3, H); ctx.fillRect(cx + W * 0.25 - 1, 0, 3, H);
  // 纵向车道分隔虚线（两段一周期）
  ctx.fillStyle = 'rgba(232,234,236,0.55)';
  const dashW = 3;
  for (const fx of [0.035 + 0.115, 0.5 - 0.115, 0.5 + 0.115, 0.965 - 0.115]) {
    for (let y = 0; y < H; y += 128) ctx.fillRect(fx * W, y + 16, dashW, 56);
  }
  const t = TEX(cv, { wrap: THREE.RepeatWrapping });
  t.anisotropy = 16;
  return t;
}

/* ══════════════ 草地 / 草坪（细腻斑驳，用于绿地和草坡） ══════════════ */
export function grassTexture() {
  const W = 512, H = 512;
  const cv = CV(W, H), ctx = cv.getContext('2d');
  const R = rnd(9021);
  ctx.fillStyle = '#557a3e'; ctx.fillRect(0, 0, W, H);
  // 大尺度色斑（维护差异）
  for (let i = 0; i < 90; i++) {
    const x = R() * W, y = R() * H, r = 30 + R() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const darker = R() > 0.5;
    g.addColorStop(0, darker ? 'rgba(58,88,44,0.34)' : 'rgba(112,148,74,0.30)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // 草叶细纹
  for (let i = 0; i < 9000; i++) {
    const x = R() * W, y = R() * H;
    const l = 2 + R() * 5;
    ctx.strokeStyle = R() > 0.5 ? 'rgba(126,164,84,0.30)' : 'rgba(48,74,36,0.30)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (R() - 0.5) * 2, y - l); ctx.stroke();
  }
  const t = TEX(cv, { wrap: THREE.RepeatWrapping });
  t.anisotropy = 16;
  return t;
}

/* ══════════════ 周边城市地块纹理（含窗格，夜间读作城市肌理） ══════════════ */
export function cityBlockTexture() {
  const W = 512, H = 512;
  const cv = CV(W, H), ctx = cv.getContext('2d');
  const R = rnd(4477);
  ctx.fillStyle = '#e9e6df'; ctx.fillRect(0, 0, W, H);
  // 细密石材/预制板分缝
  ctx.strokeStyle = 'rgba(150,148,142,0.35)'; ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  // 窗格：每 64×64 一格窗，随机开合
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (R() > 0.82) continue;
    const x = c * 64 + 14, y = r * 64 + 14;
    ctx.fillStyle = R() > 0.35 ? 'rgba(96,112,126,0.55)' : 'rgba(140,152,164,0.32)';
    ctx.fillRect(x, y, 36, 30);
  }
  // 顶部横向阴影（层间线脚）
  for (let r = 0; r < 8; r++) {
    ctx.fillStyle = 'rgba(120,118,112,0.22)';
    ctx.fillRect(0, r * 64 + 56, W, 4);
  }
  const t = TEX(cv, { wrap: THREE.RepeatWrapping });
  t.anisotropy = 8;
  return t;
}

/* ══════════════ 雨棚折板（站台/商业带用，带肋） ══════════════ */
export function canopyTexture() {
  const W = 256, H = 256;
  const cv = CV(W, H), ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#c8ccd0'); g.addColorStop(1, '#9aa1a8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(70,78,86,0.35)';
  for (let x = 0; x < W; x += 32) ctx.fillRect(x, 0, 3, H);
  const t = TEX(cv, { wrap: THREE.RepeatWrapping });
  return t;
}
