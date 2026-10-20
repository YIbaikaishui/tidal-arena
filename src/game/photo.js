/* ═══════════════════════════════════════════════════════════════════════
   photo.js — 照片模式（SPEC 3.5 / 验收 19）
   · enter() 隐藏 HUD（body.photo）并显示 #photoBar；exit() 还原
   · shot() 用 stage.renderer.domElement.toDataURL('image/png') 触发下载
   · 曝光 / 焦距为可选增强（无 fx 时静默降级）
   对外：window.__photo = {enter, exit, shot, ...}
   依赖 window.__app 防御性读取，任何缺项均不抛错（测试里只验证不报错）。
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export function createPhoto(app) {
  const A = window.__app || app || {};
  const stage = A.stage || {};
  const S = { on: false, exposure: 0, focal: 42, aperture: 8, filter: 'none', shots: 0, best: 0 };

  function rerender() {
    try {
      const r = stage.renderer;
      if (r && stage.scene && stage.camera) r.render(stage.scene, stage.camera);
    } catch (e) { /* 忽略 */ }
  }

  function enter() {
    S.on = true;
    try {
      document.body.classList.add('photo');
      document.body.classList.remove('photo-hide');
      const bar = document.getElementById('photoBar');
      if (bar) bar.hidden = false;
    } catch (e) { /* 忽略 */ }
    try { A.ui?.openPanel?.(null); } catch (e) { /* 忽略 */ }
    try { window.__game?.setMode?.('photo'); } catch (e) { /* 忽略 */ }
    return S.on;
  }

  function exit() {
    S.on = false;
    try {
      document.body.classList.remove('photo');
      document.body.classList.remove('photo-hide');
      const bar = document.getElementById('photoBar');
      if (bar) bar.hidden = true;
    } catch (e) { /* 忽略 */ }
    try { window.__game?.setMode?.('explore'); } catch (e) { /* 忽略 */ }
    return S.on;
  }

  /* 曝光 -1.2..1.2：叠加在 toneMappingExposure 上 */
  function setExposure(v) {
    S.exposure = clamp(+v || 0, -1.2, 1.2);
    const r = stage.renderer;
    if (r) {
      if (S._baseExp == null) S._baseExp = r.toneMappingExposure;
      r.toneMappingExposure = Math.max(0.05, S._baseExp * Math.pow(2, S.exposure));
    }
    return S.exposure;
  }
  function setFocal(v) {
    S.focal = clamp(+v || 42, 18, 85);
    const cam = stage.camera;
    if (cam && cam.isPerspectiveCamera) {
      cam.fov = clamp(2 * Math.atan(18 / S.focal) * 180 / Math.PI, 8, 90);
      cam.updateProjectionMatrix();
    }
    return S.focal;
  }
  function setFilter(name) {
    S.filter = String(name || 'none');
    try {
      ['warm', 'mono', 'cyan'].forEach((f) => {
        document.body.classList.toggle('photo-filter-' + f, f === S.filter);
      });
    } catch (e) { /* 忽略 */ }
    return S.filter;
  }

  /* 截图：先补一帧，再 toDataURL；随后触发下载 */
  function shot() {
    const out = { ok: false, len: 0, name: '' };
    try {
      rerender();
      const r = stage.renderer;
      const cv = r && r.domElement;
      if (!cv || typeof cv.toDataURL !== 'function') {
        out.error = 'no-canvas';
        return out;
      }
      let url = '';
      try { url = cv.toDataURL('image/png'); } catch (e) {
        out.error = String(e && e.message || e);
        return out;
      }
      if (!url || url.length < 64) { out.error = 'empty'; return out; }
      out.ok = true;
      out.len = url.length;
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      out.name = `tidal-arena-${ts}.png`;
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = out.name;
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { try { a.remove(); } catch (e) { /* 忽略 */ } }, 0);
      } catch (e) { out.download = false; }
      S.shots += 1;
      try {
        if (window.__game?.stats) window.__game.stats.photos = S.shots;
        window.__audio?.sfx?.('shutter');
      } catch (e) { /* 忽略 */ }
      /* 构图评分：记录最好成绩并给奖励（v4：接入三表 + 时段加成） */
      try {
        const sc = score();
        if (sc) {
          out.score = sc;
          const mul = (() => { try { return (window.__day && window.__day.photoMods().scoreMul) || 1; } catch (e) { return 1; } })();
          const final = Math.min(100, Math.round(sc.total * mul));
          if (final > (S.best || 0)) S.best = final;
          try { window.__contest?.submitPhoto?.(final); } catch (e) { /* 忽略 */ }
          if (final >= 88) {
            window.__game?.addXP?.(20, '优秀构图');
            A.ui?.toast?.('S 级构图', `${final} 分 · 评级 ${sc.grade}${mul > 1 ? ` · 黄金时段 ×${mul}` : ''} · +20 积分`, 'gold');
          } else {
            A.ui?.toast?.('已保存', `${final} 分 · 评级 ${sc.grade}${mul > 1 ? ` · 黄金时段 ×${mul}` : ''}`, 'plain');
          }
        }
      } catch (e) { /* 评分失败不影响截图 */ }
      out.dataUrl = url;
    } catch (e) {
      out.error = String(e && e.message || e);
    }
    return out;
  }

  /* ═══════════════════════════════════════════════════════════════════
     构图评分：给照片模式一个"目标"，而不只是自由沙盒
     四项各 25 分 —— 主体三分位 / 水平姿态 / 曝光 / 视角高度
     ═══════════════════════════════════════════════════════════════════ */
  const SUBJECT = { x: 0, y: 22, z: 0 };   /* 场馆主体中心（屋盖中部） */
  function score() {
    const cam = stage.camera;
    if (!cam || !cam.isPerspectiveCamera) return null;
    const v = new THREE.Vector3(SUBJECT.x, SUBJECT.y, SUBJECT.z);
    /* ① 主体落在三分点上（30） */
    const p = v.clone().project(cam);
    const inFrame = Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05 && p.z < 1;
    const rx = (p.x + 1) / 2, ry = 1 - (p.y + 1) / 2;   /* 屏幕比例 0..1 */
    const thirds = [1 / 3, 2 / 3];
    const nearThirds = (v2, arr) => Math.min(...arr.map((t) => Math.abs(v2 - t)));
    const d3 = Math.hypot(nearThirds(rx, thirds) * 1.2, nearThirds(ry, thirds) * 0.9);
    const comp = inFrame ? 30 * (1 - d3 / 0.55) : 0;

    /* ② 水平姿态（20）：相机有没有歪 */
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
    const tilt = Math.acos(Math.min(1, Math.abs(up.y)));
    const level = Math.max(0, 20 * (1 - tilt / 0.15));

    /* ③ 曝光（20） */
    const r = stage.renderer;
    const exp = r ? r.toneMappingExposure : 1;
    const eErr = Math.abs(Math.log2(Math.max(0.05, exp)));
    const expo = Math.max(0, 20 * (1 - eErr / 1.2));

    /* ④ 视角高度（30）：25–120m 最佳，俯瞰与贴地都扣分 */
    const h = cam.position.y;
    let hScore;
    if (h >= 25 && h <= 120) hScore = 30;
    else if (h > 120) hScore = Math.max(0, 30 - (h - 120) * 0.2);
    else hScore = Math.max(0, 30 - (25 - h) * 0.4);

    const total = Math.round(comp + level + expo + hScore);
    const items = [
      { k: '构图三分位', v: Math.round(comp), max: 30 },
      { k: '水平姿态', v: Math.round(level), max: 20 },
      { k: '曝光', v: Math.round(expo), max: 20 },
      { k: '视角高度', v: Math.round(hScore), max: 30 },
    ];
    const grade = total >= 88 ? 'S' : total >= 78 ? 'A' : total >= 66 ? 'B' : total >= 50 ? 'C' : 'D';
    return { total, grade, items, inFrame };
  }

  /* 兼容 HUD 的键盘/按钮路径 */
  const api = {
    enter, exit, shot, setExposure, setFocal, setFilter, rerender, score,
    get on() { return S.on; },
    get shots() { return S.shots; },
    get exposure() { return S.exposure; },
    get focal() { return S.focal; },
    get filter() { return S.filter; },
    get best() { return S.best; },
  };
  window.__photo = api;
  return api;
}

export default createPhoto;
