/* ═══════════════════════════════════════════════════════════════════════
   orbit.js — 阻尼环绕相机（OrbitRig）
   · 左键拖动 = 旋转；中键/右键拖动 = 平移；滚轮 = 推拉（光标处为锚点）
   · 触屏：单指旋转 · 双指捏合缩放 + 双指拖动平移
   · 松手带惯性（按屏幕方向而不是包围角速度滑，避免翻转）
   · 双击对焦（射线拾取 → focusOn）
   · 自动导览 startAuto(list, sec)：多机位平滑串联，首尾闭合
   对外契约（SPEC 3.6）：update(dt) / set({target,dist,az,el}) / snapTo(pose)
   / enabled / dist / target / startAuto / stopAuto / tTarget / tDist / tAz / tElv
   新增：focusOn(vec3, dist) / onFocus 钩子（供 modes.js 高亮）
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { clamp, lerp, smooth } from './core.js';

const EL_MIN = -0.30;
const EL_MAX = 1.50;
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();

const TAU = Math.PI * 2;
const wrapPi = (a) => {
  a = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a;
};

export class OrbitRig {
  constructor(camera, canvas) {
    this.cam = camera;
    this.el = canvas;
    /* 当前值 / 目标值 */
    this.target = new THREE.Vector3(0, 16, 0);
    this.tTarget = new THREE.Vector3(0, 16, 0);
    this.dist = 460; this.tDist = 460;
    this.az = 0.42; this.tAz = 0.42;
    this.elv = 0.28; this.tElv = 0.28;
    this.minDist = 6; this.maxDist = 1900;
    this.enabled = true;
    /* 阻尼/惯性 */
    this.vAz = 0; this.vEl = 0;              // 惯性（已换算成"屏幕移动量"）
    this.dragging = 0;                        // 0=无 1=旋转 2=平移
    this.auto = null;
    this.onFocus = null;                      // (obj3d|null) => void
    this.picked = [];                         // 射线拾取的根对象（app 未注入时用 scene）
    this._shot = null;                        // 当前机位（{target,dist,az,el} 副本）
    this._ptrs = new Map();                   // pointerId -> {x,y,type}
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
        this.dragging = (e.button === 2 || e.button === 1) ? 2 : 1;
        this.vAz = 0; this.vEl = 0;
        this._move = { x: e.clientX, y: e.clientY };
        el.style.cursor = this.dragging === 2 ? 'move' : 'grabbing';
        this.stopAuto();
      } else if (this._ptrs.size === 2) {
        /* 双指：记录初始间距与中点 */
        const [a, b] = [...this._ptrs.values()];
        this._pinch = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        this._mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        this.dragging = 3;
        this.vAz = 0; this.vEl = 0;
      }
    };
    const move = (e) => {
      const rec = this._ptrs.get(e.pointerId);
      if (!rec) return;
      rec.x = e.clientX; rec.y = e.clientY;
      if (!this.enabled) return;
      if (this.dragging === 3 && this._ptrs.size >= 2) {
        const [a, b] = [...this._ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        /* 捏合缩放 */
        if (this._pinch) {
          const f = this._pinch / d;
          this.tDist = clamp(this.tDist * Math.pow(f, 0.9), this.minDist, this.maxDist);
        }
        this._pinch = d;
        /* 双指拖动 = 平移 */
        if (this._mid) this._pan(mx - this._mid.x, my - this._mid.y);
        this._mid = { x: mx, y: my };
        this.stopAuto();
        return;
      }
      if (!this.dragging) return;
      const dx = e.clientX - this._move.x;
      const dy = e.clientY - this._move.y;
      this._move = { x: e.clientX, y: e.clientY };
      const now = performance.now();
      this._lastMoveT = now;
      if (this.dragging === 1) this._rotate(dx, dy, e.shiftKey);
      else if (this.dragging === 2) { this._panSh(dx, dy); this.stopAuto(); }
    };
    const up = (e) => {
      this._ptrs.delete(e.pointerId);
      if (this._ptrs.size === 0) {
        if (this.dragging === 1 && performance.now() - this._lastMoveT > 90) { this.vAz = 0; this.vEl = 0; }
        this.dragging = 0;
        this._pinch = 0;
        el.style.cursor = 'grab';
      } else if (this._ptrs.size === 1) {
        this.dragging = 1;
        const [a] = [...this._ptrs.values()];
        this._move = { x: a.x, y: a.y };
        this._pinch = 0;
      }
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      /* 平滑推拉：向远离相机方向（deltaY<0）拉近 */
      const f = Math.exp(d * 0.0012);
      const before = this.tDist;
      this.tDist = clamp(this.tDist * f, this.minDist, this.maxDist);
      /* 光标锚点：把目标点沿视线朝光标方向微移，缩放读数更像专业相机 */
      if (e.clientX != null && Math.abs(this.tDist - before) > 1e-3) {
        const k = this._cursorParallax(e.clientX, e.clientY);
        this.tTarget.addScaledVector(k, (this.tDist - before) * 0.42);
      }
      this.stopAuto();
    }, { passive: false });
    /* 双击对焦 */
    let lastTap = 0, lastX = 0, lastY = 0;
    el.addEventListener('pointerup', (e) => {
      if (!this.enabled || e.button !== 0) return;
      const now = performance.now();
      if (now - lastTap < 300 && Math.hypot(e.clientX - lastX, e.clientY - lastY) < 14) {
        this._dblTap(e.clientX, e.clientY);
        lastTap = 0;
      } else { lastTap = now; lastX = e.clientX; lastY = e.clientY; }
    });
    el.style.cursor = 'grab';
    el.style.touchAction = 'none';
  }

  /* 光标方向的视平面偏移（单位向量），用于推拉锚点 */
  _cursorParallax(cx, cy) {
    const w = this.el.clientWidth || window.innerWidth;
    const h = this.el.clientHeight || window.innerHeight;
    const nx = (cx / w) * 2 - 1, ny = -(cy / h) * 2 + 1;
    const right = new THREE.Vector3().setFromMatrixColumn(this.cam.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.cam.matrixWorld, 1);
    return right.multiplyScalar(nx).addScaledVector(up, ny);
  }

  _rotate(dx, dy, slow) {
    const sp = (slow ? 0.0016 : 0.0040);
    const prevAz = this.tAz, prevEl = this.tElv;
    this.tAz -= dx * sp;
    this.tElv = clamp(this.tElv + dy * sp * 0.85, EL_MIN, EL_MAX);
    /* 惯性记录"屏幕方向"：up 时按当前阈值还原 */
    this.vAz = -(this.tAz - prevAz);
    this.vEl = (this.tElv - prevEl);
    this.stopAuto();
  }

  _pan(dx, dy) {
    /* 平移量按距离缩放（近处细、远处粗） */
    const s = this.dist * 0.0017;
    const right = _v.setFromMatrixColumn(this.cam.matrixWorld, 0).clone();
    const upv = _w.setFromMatrixColumn(this.cam.matrixWorld, 1).clone();
    this.tTarget.addScaledVector(right, -dx * s).addScaledVector(upv, dy * s);
  }
  _panSh(dx, dy) { this._pan(dx, dy); }

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
      this.target.copy(this.tTarget); this.dist = this.tDist;
      this.az = this.tAz; this.elv = this.tElv;
      this.vAz = 0; this.vEl = 0;
      this.apply();
    }
    return this;
  }
  snapTo(o = {}) { return this.set(Object.assign({ snap: true }, o)); }

  /* 当前机位（{target,dist,az,el} 副本），由 apply() 每帧写回 */
  get shot() { return this._shot; }

  /* 对焦到世界坐标点：保持当前方位，推进到 dist */
  focusOn(pt, dist = 90) {
    const p = pt && pt.isVector3 ? pt : new THREE.Vector3(pt[0], pt[1], pt[2]);
    this.stopAuto();
    this.tTarget.copy(p);
    this.tDist = clamp(dist, this.minDist, this.maxDist);
    /* 俯仰不低于 0.12，避免对焦到顶面时钻进构件 */
    this.tElv = clamp(this.tElv || 0.26, 0.10, 0.95);
    return this;
  }

  /* 双击 / 触屏双击 / 选卡对焦：射线拾取 → 打到谁就对焦谁 */
  _dblTap(cx, cy) {
    const roots = (this.picked && this.picked.length)
      ? this.picked
      : (window.__app && window.__app.stage ? [window.__app.stage.scene] : []);
    if (!roots.length) return;
    const w = this.el.clientWidth || window.innerWidth;
    const h = this.el.clientHeight || window.innerHeight;
    _ndc.set((cx / w) * 2 - 1, -(cy / h) * 2 + 1);
    const cam = (window.__app && window.__app.stage) ? window.__app.stage.camera : this.cam;
    _ray.setFromCamera(_ndc, cam);
    let hit = null;
    for (const r of roots) {
      const hs = _ray.intersectObject(r, true);
      for (const h2 of hs) {
        if (!h2.object.isMesh || !h2.object.visible) continue;
        if (!isShown(h2.object)) continue;
        if (!hit || h2.distance < hit.distance) hit = h2;
      }
    }
    if (!hit) {
      /* 空处双击 = 回到全景 */
      this.focusOn(new THREE.Vector3(0, 18, 0), 560);
      this.onFocus && this.onFocus(null);
      return;
    }
    /* 找到拾取对象所属的"构件族"（顶层 group） */
    let root = hit.object;
    const arenaRoot = window.__app && window.__app.arena ? window.__app.arena.root : null;
    if (arenaRoot) {
      let p = hit.object;
      while (p && p !== arenaRoot && p.parent !== arenaRoot) p = p.parent;
      if (p) root = p;
    }
    const box = new THREE.Box3().setFromObject(root);
    const c = box.getCenter(new THREE.Vector3());
    const r = Math.max(box.getSize(new THREE.Vector3()).length() * 0.5, 1);
    this.focusOn(c, Math.max(r * 1.9, 24));
    this.onFocus && this.onFocus(hit.object);
  }

  /* ─────────────────────── 自动导览 ─────────────────────── */
  startAuto(seq, sec = 8) {
    if (!seq || !seq.length) return;
    /* 从未派生的序列里取最近的一个作为起点，衔接自然 */
    let bi = 0, bd = Infinity;
    seq.forEach((s, i) => {
      const d = Math.hypot((s.target?.[0] ?? 0) - this.tTarget.x, (s.target?.[1] ?? 0) - this.tTarget.y,
        (s.target?.[2] ?? 0) - this.tTarget.z) + Math.abs((s.dist ?? 400) - this.tDist) * 0.35;
      if (d < bd) { bd = d; bi = i; }
    });
    this.auto = { on: true, seq, i: bi, t: 0, hold: Math.max(1.2, (sec || 8) * 0.35), move: Math.max(1.4, (sec || 8) * 0.65), phase: 'hold', from: null, to: null };
  }
  stopAuto() { if (this.auto) this.auto = null; }
  get autoActive() { return !!(this.auto && this.auto.on); }

  _autoStep(a, shot) {
    a.from = {
      target: this.tTarget.clone(), dist: this.tDist,
      az: this.tAz, el: this.tElv,
    };
    const tg = shot.target || [0, 0, 0];
    a.to = {
      target: new THREE.Vector3(tg[0] ?? tg.x, tg[1] ?? tg.y, tg[2] ?? tg.z),
      dist: clamp(shot.dist ?? 400, this.minDist, this.maxDist),
      az: shot.az ?? 0,
      el: clamp(shot.el ?? shot.elv ?? 0.3, EL_MIN, EL_MAX),
    };
    /* 包围角取最短 */
    a.to.az = a.from.az + wrapPi(a.to.az - a.from.az);
    /* 景别：距离用对数插值（视觉推拉更匀） */
    a.from.logD = Math.log(Math.max(1, a.from.dist));
    a.to.logD = Math.log(Math.max(1, a.to.dist));
    a.phase = 'move'; a.t = 0;
  }

  /* ─────────────────────── 每帧 ─────────────────────── */
  update(dt) {
    dt = Math.min(dt || 0.016, 0.1);
    const a = this.auto;
    if (a && a.on) {
      a.t += dt;
      if (a.phase === 'hold') {
        if (a.t > a.hold) this._autoStep(a, a.seq[a.i] || a.seq[0]);
      } else {
        const k = smooth(clamp(a.t / a.move, 0, 1));
        this.tTarget.lerpVectors(a.from.target, a.to.target, k);
        this.tDist = Math.exp(lerp(a.from.logD, a.to.logD, k));
        this.tAz = lerp(a.from.az, a.to.az, k);
        this.tElv = lerp(a.from.el, a.to.el, k);
        if (k >= 1) {
          a.phase = 'hold'; a.t = 0;
          a.i = (a.i + 1) % a.seq.length;
        }
      }
    }
    /* 惯性：松手后继续滑一段（指数衰减） */
    if (!this.dragging && !this.autoActive && (Math.abs(this.vAz) > 1e-5 || Math.abs(this.vEl) > 1e-5)) {
      this.tAz += this.vAz * 60 * dt;
      this.tElv = clamp(this.tElv + this.vEl * 60 * dt, EL_MIN, EL_MAX);
      const damp = Math.pow(0.0016, dt);
      this.vAz *= damp; this.vEl *= damp;
      if (Math.abs(this.vAz) < 1e-5) this.vAz = 0;
      if (Math.abs(this.vEl) < 1e-5) this.vEl = 0;
    }
    /* 阻尼跟随 */
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
    /* 目标点在相机正上方/正下方时退化：给一点偏移 */
    if (Math.abs(ce * this.dist) < 0.02) this.cam.position.x += 0.02;
    this.cam.lookAt(c);
    this.cam.updateMatrixWorld();
    /* 记录当前机位（供外部读回） */
    this._shot = {
      target: this.tTarget.clone(), dist: this.tDist,
      az: this.tAz, el: this.tElv,
    };
  }
}

/* 判断对象本身与所有祖先都可见（射线拾取用于双击对焦时跳过隐藏图层） */
function isShown(o) {
  let p = o;
  while (p) { if (!p.visible) return false; p = p.parent; }
  return true;
}
