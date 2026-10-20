/* ═══════════════════════════════════════════════════════════════════════
   walk.js — 第一人称漫游（游戏化探索）
   · WASD / 方向键移动，Shift 奔跑，鼠标（指针锁定）转头，Esc 退出
   · 真实地面高度：场地 → 每排踏步（按排号线性抬升）→ 环廊楼面 → 门厅地坪
   · 碰撞：用"环向净距 s + 标高"在剖面里做约束
       - 外墙只在 4 个主券洞（u = 0/.25/.5/.75 ± portalHalfU）开口处可通过
       - 看台后墙 / 包厢玻璃 / 看台栏板 一律不可穿；走到台阶前自动抬升
   · R 自动巡游（广场→门厅→环廊→包厢→上层→看台→场地→球员通道，循环）
   · Tab 手动 / 自动切换
   · 进入与退出各有 0.6s 平滑过渡
   导出契约（SPEC 3.6 / 小地图）：active / pos / yaw / pitch / update(dt) / start(vec3) / stop()
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { clamp, lerp, smooth } from './core.js';
import { TIERS, GEO, L1, L2, L3, HALF_X, HALF_Z, SEGS, CORNER_F } from './sections.js';
import { refRing, boundaryT } from './rings.js';

const EYE = 1.68;                 // 眼高
const RADIUS = 0.34;              // 身体半径（碰撞）
const STEP_UP = 0.62;             // 自动上台阶的最大高差
const TRANS_T = 0.6;              // 进/出场过渡时长
const DOOR_U = [0.0, 0.25, 0.5, 0.75];

/* ══════════════ 环向参考 ══════════════ */
const RING = refRing(SEGS);
const TOTAL = RING.total;
const REF = RING.pts.map((p) => ({
  nx: p.nx, nz: p.nz, u: p.u,
  /* 该方向的单位切向（u 增大的方向） */
  tx: -p.nz, tz: p.nx,
}));

/* 圆角矩形边界距离（自缓存，避免每帧重复算 r 的正弦） */
function bt(h, ex, ez) {
  const hx = HALF_X + h, hz = HALF_Z + h, r = hx * CORNER_F;
  const ax = hx - r, az = hz - r;
  const a = Math.abs(ex), c = Math.abs(ez);
  const te = Math.min(a > 1e-9 ? ax / a : Infinity, c > 1e-9 ? az / c : Infinity);
  if (Math.abs(ex) * te <= ax + 1e-6 && Math.abs(ez) * te <= az + 1e-6) return te;
  const bq = ax * a + az * c, aq = a * a + c * c, cq = ax * ax + az * az - r * r;
  return (bq + Math.sqrt(Math.max(0, bq * bq - aq * cq))) / aq;
}

/* 世界坐标 → 环向剖面坐标 {s, i, u}（核心工具，modes/小地图也可用） */
export function locate(x, z) {
  const r = Math.hypot(x, z);
  if (r < 1e-6) return { s: -HALF_X, i: 0, u: 0 };
  let bi = 0, bd = Infinity;
  let dx = 0, dz = 0, nx = 1, nz = 0;
  for (let i = 0; i < SEGS; i++) {
    const p = REF[i];
    const t = bt(0, p.nx, p.nz);          // 方向 p 与场地产界交于 t*p
    /* 粗略：用投影距离 + 横向偏移 */
    const proj = x * p.nx + z * p.nz;
    const lat = Math.abs(x * p.tx + z * p.tz) * (t < HALF_Z ? 0.9 : 1.2);
    const d = Math.abs(r - proj) + lat * 0.55;
    if (d < bd) { bd = d; bi = i; dx = x; dz = z; nx = p.nx; nz = p.nz; }
  }
  const ex = r > 1e-6 ? dx / r : nx, ez = r > 1e-6 ? dz / r : nz;
  /* 在选中方向上，求与参考环共形的圆角矩形边界距离 */
  let lo = -HALF_X + 0.01, hi = 320;
  for (let k = 0; k < 26; k++) {
    const mid = (lo + hi) * 0.5;
    const tt = bt(mid, ex, ez);
    if (tt < r) lo = mid; else hi = mid;
  }
  return { s: (lo + hi) * 0.5, i: bi, u: REF[bi].u };
}

/* 环向参考（供 modes.js / 小地图复用） */
export function ringAt(u) {
  const f = ((((u % 1) + 1) % 1) * SEGS);
  return REF[Math.floor(f) % SEGS];
}
export { REF, TOTAL, bt as boundaryDist };

/* ══════════════ 地面高度 ══════════════ */
/* 主券洞的世界净宽：u 归一化周长 × portalHalfU（周长约 325m → 半宽约 9.8m）
   注意：不能用 locate() 返回的 u 做开口判定——它被量化到 192 段（约 1.7m），
   偏离主轴 2m 就会判成"不在券洞里"，门厅会只剩一条缝。 */
const PORTAL_HALF_M = (GEO.portalHalfU ?? 0.030) * TOTAL;
/* 点是否落在某个主券洞的开口内（按到最近主轴的世界距离判定） */
function inPortalWorld(x, z) {
  if (x == null || z == null) return false;
  return Math.min(Math.abs(x), Math.abs(z)) < PORTAL_HALF_M;
}

export function groundAtS(s, x, z) {
  const OUT = GEO.outerS, GY = GEO.groundY;
  if (s < L1.s0) return GY;                                        // 场地与场边硬地（-1.2）
  for (let t = 0; t < TIERS.length; t++) {
    const T = TIERS[t];
    if (s >= T.s0 && s < T.endS) {
      /* 每排踏步：按排号找当前排，落在该排踏面 */
      const rows = T.rows;
      for (let k = 0; k < rows.length; k++) {
        const r = rows[k];
        if (s < r.sBack) return r.y;
      }
      const last = rows[rows.length - 1];
      return last.yBack != null ? last.yBack : T.endY;
    }
    if (s >= T.cS0 && s < T.cS1) {
      /* 顶层环廊下方是贯通到地面的门厅空腔：只有 4 个主券洞的轴线上才有地面，
         其它位置是看台后墙（实心，不可通行）。
         不这样建模的话，穿墙判定会用"地面高差 42m"把玩家挡在主入口外。 */
      if (t === TIERS.length - 1 && inPortalWorld(x, z)) return 0;
      return T.cY;                                                // 环廊楼面
    }
    if (s >= T.endS && s < T.cS0) return T.cY;                     // 看台后墙带
  }
  if (s >= L3.cS1 && s <= OUT) return 0;                           // 三层环廊外带 → 门厅地坪
  return 0;
}

/* 允许站立的高度区间（用于防穿层） */
function standOK(y) { return y < 30; }

/* 券洞开口判定已改为世界坐标版（见 inPortalWorld）：locate() 的 u 被量化到 192 段，
   偏离主轴 2m 就会误判，u 版本（inPortal）不再使用。 */

/* ══════════════ 巡游路线 ══════════════ */
function buildRoute() {
  const O = GEO.outerS;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  return [
    /* 广场：绕到南侧主入口 */
    { p: V(0, GEO.groundY, O + 46), look: V(0, 8, O + 10), name: '球迷广场' },
    { p: V(0, GEO.groundY, O + 14), look: V(0, 6, 0), name: '南门主轴' },
    /* 穿过券洞进入门厅（门洞 u=0.5 在 +z 边中点） */
    { p: V(0, 0, O - 3), look: V(14, 0, O - 14), name: '南入口门厅' },
    { p: V(14, 0, O - 8), look: V(14, 3, 0), name: '服务环' },
    /* 次入口（u=0.375 在西南角）穿出到广场，再沿外墙绕到西侧 */
    { p: V(-21.6, GEO.groundY, O + 3), look: V(-34, 1, O + 16), name: '次入口内廊' },
    { p: V(-40, GEO.groundY, O - 18), look: V(-46, 2, 40), name: '西侧广场' },
    /* 走上看台 L1 前排 → 逐排抬升 → 环廊 */
    { p: V(-60, L1.y0 + 0.6, 40), look: V(-34, 4, 10), name: '下层看台' },
    { p: V(-58, L1.cY, 34), look: V(-20, 6, 0), name: '一层环廊' },
    /* 包厢层外廊（L2 环廊） */
    { p: V(-48, L2.cY, 44), look: V(-10, 8, 0), name: '包厢层外廊' },
    /* 三层环廊 */
    { p: V(0, L3.cY, 96), look: V(0, 4, 0), name: '上层环廊' },
    /* 回到场地边 */
    { p: V(0, GEO.groundY, 40), look: V(0, 1, 0), name: '球员通道口' },
    { p: V(0, GEO.groundY, 8), look: V(0, 2, -40), name: '中圈' },
    { p: V(0, GEO.groundY, -34), look: V(0, 2, -50), name: '北侧通道' },
  ];
}

/* ══════════════ Walk ══════════════ */
export class Walk {
  constructor(stage, arena) {
    this.stage = stage;
    this.arena = arena;
    this.active = false;
    this.yaw = Math.PI; this.pitch = 0;
    this.pos = new THREE.Vector3(0, GEO.groundY + EYE, 200);
    this.vel = new THREE.Vector2();
    this.keys = new Set();
    this.speed = 4.6;               // 步行速度 m/s
    this.runSpeed = 9.4;
    this.bob = 0;
    this.pointerLocked = false;
    this.sensitivity = 0.0021;
    this.auto = false;              // 自动巡游
    this.route = buildRoute();
    this.seg = 0;                   // 当前路段起点
    this.segT = 0;
    this.trans = null;              // 进出场过渡
    this._enter = new THREE.Vector3();
    this._enterVel = new THREE.Vector3();
    this._onExit = null;
    this.onExitKey = null;          // ui.js 松绑：Esc → ui.toggleWalk(false)
    this._bind();
  }

  /* ─────────── 输入绑定 ─────────── */
  _bind() {
    const el = this.stage.canvas;
    window.addEventListener('keydown', (e) => {
      if (!this.active) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      this.keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'KeyR') this.toggleAuto(true);
      if (e.code === 'Tab') { e.preventDefault(); this.toggleAuto(); }
    }, true);
    /* Esc 退出：捕获阶段优先于 ui.js 的冒泡监听，
       统一走 ui.js 的 toggleWalk（它负责按钮/行走样式/提示复位），保证状态单一真源 */
    window.addEventListener('keydown', (e) => {
      if (!this.active || (e.code !== 'Escape' && e.key !== 'Escape')) return;
      this.keys.clear();
      e.preventDefault();
      e.stopPropagation();
      this._requestExit();
    }, true);
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    /* 点击画布锁定鼠标 */
    el.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      this._downAt = { x: e.clientX, y: e.clientY };
      this._wantLock = true;
      try {
        const pr = el.requestPointerLock && el.requestPointerLock();
        if (pr && pr.catch) pr.catch(() => { this._wantLock = false; });
      } catch (err) { this._wantLock = false; }
    });
    /* 指针锁定状态 */
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === el;
      /* 用户在锁定态按 Esc：浏览器先解锁，这里同步退出漫游（ui.js 内部状态也要复位） */
      if (!locked && this.pointerLocked && this.active && !this._exiting) this._exitByEsc();
      this.pointerLocked = locked;
    });
    /* 转头 */
    window.addEventListener('mousemove', (e) => {
      if (!this.active) return;
      const locked = document.pointerLockElement === el;
      if (!locked) {
        /* 未锁定时的拖动转头兜底（触屏/浏览器拦截 pointerlock 时仍可用） */
        if (!this._dragLook) return;
        this._look(e.movementX || 0, e.movementY || 0);
        return;
      }
      this._look(e.movementX || 0, e.movementY || 0);
    });
    el.addEventListener('pointerdown', (e) => { if (this.active && e.pointerType === 'touch') this._dragLook = true; }, { capture: true });
    window.addEventListener('pointerup', () => { this._dragLook = false; });
    /* 指针锁定时若用户按 Esc，浏览器会先解锁，这里同样视为退出 */
    document.addEventListener('pointerlockerror', () => { this._wantLock = false; });
  }

  _look(dx, dy) {
    if (this.auto) this.toggleAuto(false);
    this.yaw -= dx * this.sensitivity;
    this.pitch = clamp(this.pitch - dy * this.sensitivity, -1.30, 1.30);
  }

  /* ─────────── 生命周期 ─────────── */
  /* ui.js 会调用 walk.start(new Vector3(0,2,200))；传入点视为"落点" */
  start(pt) {
    const cam = this.stage.camera;
    const from = cam.position.clone();
    const fromDir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    if (pt) {
      const lc = locate(pt.x, pt.z);
      const g = groundAtS(lc.s, pt.x, pt.z);
      this.pos.set(pt.x, Math.max(pt.y ?? g + EYE, g + EYE), pt.z);
    } else {
      const lc = locate(this.pos.x, this.pos.z);
      const g = groundAtS(lc.s, this.pos.x, this.pos.z);
      this.pos.y = Math.max(this.pos.y, g + EYE);
    }
    /* 朝向：默认朝场地中心；若相机本身在近处则沿用相机朝向 */
    const toC = new THREE.Vector3(-this.pos.x, 0, -this.pos.z);
    if (toC.length() > 4) { this.yaw = Math.atan2(toC.x, toC.z); this.pitch = -0.02; }
    this.active = true;
    this.auto = false;
    this.vel.set(0, 0);
    this.seg = 0; this.segT = 0;
    /* 0.6s 过渡：从当前相机平滑推到人眼点 */
    this.trans = {
      t: 0, dur: TRANS_T, mode: 'in',
      p0: from, d0: fromDir,
      p1: this.pos.clone(),
      yaw1: this.yaw, pitch1: this.pitch,
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
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    this.active = false;
    this.auto = false;
    this._exiting = true;
    setTimeout(() => { this._exiting = false; }, 220);
    /* 退出过渡：把相机交给 0.6s 平滑，再由 orbit 接管（orbit 有阻尼，二者叠加为连续） */
    this.trans = { t: 0, dur: TRANS_T, mode: 'out', p0: from, p1: from.clone(), d0: dir.clone() };
    const exit = cam.position.clone().addScaledVector(dir, 3).setY(Math.max(cam.position.y + 1, 6));
    this.trans.p1 = exit;
    this._wantLock = false;
    if (document.pointerLockElement) document.exitPointerLock();
  }
  exit() { this.stop(); }

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
    setTimeout(() => { this._exiting = false; }, 260);
    if (typeof this.onExitKey === 'function') this.onExitKey();
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
    let bi = 0, bd = Infinity, bt2 = 0;
    const R = this.route;
    for (let i = 0; i < R.length; i++) {
      const a = R[i].p, b = R[(i + 1) % R.length].p;
      const ab = b.clone().sub(a);
      const len2 = ab.lengthSq() || 1;
      let t = clamp(this.pos.clone().sub(a).dot(ab) / len2, 0, 1);
      const d = a.clone().addScaledVector(ab, t).distanceTo(this.pos);
      if (d < bd) { bd = d; bi = i; bt2 = t; }
    }
    this.seg = bi; this.segT = bt2;
  }

  /* ─────────── 碰撞 ─────────── */
  /* 返回 {x, z, blocked}：沿墙面滑动，不允许穿墙 */
  _resolve(nx, nz, curY) {
    const OUT = GEO.outerS;
    let x = nx, z = nz;
    const loc = locate(x, z);
    const gHere = groundAtS(loc.s, x, z);
    /* 外墙 / 看台后墙：只在券洞处允许跨过立面线 */
    const wallS = OUT - RADIUS * 0.6;
    const curLoc = locate(this.pos.x, this.pos.z);
    if (loc.s > wallS && curLoc.s <= wallS) {
      if (!inPortalWorld(x, z) || Math.abs(gHere - (groundAtS(curLoc.s, this.pos.x, this.pos.z))) > 6.5) {
        /* 抵住立面：沿着墙切向滑动 */
        const ref = REF[loc.i];
        const proj = x * ref.nx + z * ref.nz;
        const t = bt(wallS, ref.nx, ref.nz);
        const excess = proj - t;
        if (excess > 0) { x -= ref.nx * excess; z -= ref.nz * excess; }
      }
    }
    /* 由外向内穿回（反向）同样需要券洞 */
    const loc2 = locate(x, z);
    if (curLoc.s > wallS && loc2.s <= wallS) {
      if (!inPortalWorld(this.pos.x, this.pos.z) || Math.abs(groundAtS(loc2.s, x, z) - groundAtS(curLoc.s, this.pos.x, this.pos.z)) > 6.5) {
        const ref = REF[curLoc.i];
        const proj = x * ref.nx + z * ref.nz;
        const t = bt(wallS - 0.02, ref.nx, ref.nz);
        const lack = t - proj;
        if (lack > 0) { x += ref.nx * lack; z += ref.nz * lack; }
      }
    }
    return { x, z };
  }

  /* 台阶级差：太高就不能上（相当于"护栏"），太陡自动抬升 */
  groundAt(x, z) { const l = locate(x, z); return groundAtS(l.s, x, z); }

  /* ─────────── 每帧 ─────────── */
  update(dt) {
    const cam = this.stage.camera;
    dt = Math.min(dt || 0.016, 0.1);

    if (!this.active) {
      /* 退出过渡 */
      const tr = this.trans;
      if (tr && tr.mode === 'out') {
        tr.t += dt;
        const k = smooth(clamp(tr.t / tr.dur, 0, 1));
        cam.position.lerpVectors(tr.p0, tr.p1, k);
        const look = cam.position.clone().add(new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion));
        cam.lookAt(look);
        if (k >= 1) { this.trans = null; this._onExit && this._onExit(); }
      }
      return;
    }

    /* ── 自动巡游 ── */
    if (this.auto) {
      this._autoStep(dt);
    } else {
      this._manualStep(dt);
    }

    /* ── 进入过渡：把相机从起始位插值到人眼 ── */
    const tr = this.trans;
    let camPos, camQuat;
    if (tr && tr.mode === 'in') {
      tr.t += dt;
      const k = smooth(clamp(tr.t / tr.dur, 0, 1));
      this.pos.lerpVectors(tr.p0, tr.p1, k);
      camPos = this.pos;
      const yaw = lerpAngle(this.yaw0, tr.yaw1, k);
      const pitch = lerp(this.pitch0, tr.pitch1, k);
      if (k >= 1) { this.trans = null; }
      this._eyeOverride = { yaw, pitch };
    } else this._eyeOverride = null;

    /* ── 落地：y 跟随地面（不得低于地面 + 眼高） ── */
    const lc = locate(this.pos.x, this.pos.z);
    const g = groundAtS(lc.s, this.pos.x, this.pos.z);
    const bobY = Math.sin(this.bob) * 0.022;
    const targetY = g + EYE + bobY;
    if (this.trans && this.trans.mode === 'in') {
      /* 过渡中不改 y，过渡结束时统一落地 */
    } else {
      this.pos.y = lerp(this.pos.y, targetY, 1 - Math.exp(-dt * 16));
      if (this.pos.y < g + EYE - 0.02) this.pos.y = g + EYE;
    }

    cam.position.copy(this.pos);
    const look = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    cam.lookAt(this.pos.clone().add(look));
  }

  _manualStep(dt) {
    const k = this.keys;
    let fx = 0, fz = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) fz += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) fz -= 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) fx -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) fx += 1;
    const run = k.has('ShiftLeft') || k.has('ShiftRight');
    const len = Math.hypot(fx, fz);
    const sp = run ? this.runSpeed : this.speed;
    let vx = 0, vz = 0;
    if (len > 0) {
      fx /= len; fz /= len;
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
      vx = (fz * sy + fx * cy) * sp;
      vz = (fz * cy - fx * sy) * sp;
    }
    const acc = len > 0 ? 14 : 16;
    this.vel.x = lerp(this.vel.x, vx, 1 - Math.exp(-dt * acc));
    this.vel.y = lerp(this.vel.y, vz, 1 - Math.exp(-dt * acc));
    const v = Math.hypot(this.vel.x, this.vel.y);
    if (v < 0.02) { this.vel.set(0, 0); return; }

    /* 子步长移动 + 碰撞（每步 ≤ 0.25m，避免高速穿墙） */
    const steps = Math.max(1, Math.ceil((v * dt) / 0.25));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const nx = this.pos.x + this.vel.x * h;
      const nz = this.pos.z + this.vel.y * h;
      const cur = locate(this.pos.x, this.pos.z);
      const curG = groundAtS(cur.s, this.pos.x, this.pos.z);
      const next = locate(nx, nz);
      const nextG = groundAtS(next.s, nx, nz);
      /* 台阶：允许上升 ≤ STEP_UP 与任意下降；超过就当作墙（横向滑动） */
      if (nextG - curG > STEP_UP && !standOK(nextG)) {
        /* 尝试沿切向滑动 */
        const ref = REF[cur.i];
        const along = this.vel.x * ref.tx + this.vel.y * ref.tz;
        const sx = this.pos.x + ref.tx * along * h;
        const sz = this.pos.z + ref.tz * along * h;
        const s2 = locate(sx, sz);
        if (groundAtS(s2.s, sx, sz) - curG <= STEP_UP) {
          const rr = this._resolve(sx, sz, curG);
          this.pos.x = rr.x; this.pos.z = rr.z;
        }
        continue;
      }
      const rr = this._resolve(nx, nz, curG);
      /* 最终校验：高度突变则回退 */
      const fin = locate(rr.x, rr.z);
      if (groundAtS(fin.s, rr.x, rr.z) - curG > STEP_UP) continue;
      this.pos.x = rr.x; this.pos.z = rr.z;
    }
    this.bob += dt * (run ? 13.5 : 8.4);
    /* 世界边界 */
    const r = Math.hypot(this.pos.x, this.pos.z);
    const RMAX = GEO.outerS + 190;
    if (r > RMAX) { this.pos.x *= RMAX / r; this.pos.z *= RMAX / r; }
  }

  _autoStep(dt) {
    const R = this.route;
    const A = R[this.seg], B = R[(this.seg + 1) % R.length];
    /* 按真实路径速度推进：先水平移动，y 由地面高度决定 */
    const target = B.p.clone();
    const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
    const horiz = Math.hypot(dx, dz);
    const sp = 6.2;
    if (horiz < 0.6) {
      this.segT = 0;
      this.seg = (this.seg + 1) % R.length;
      this.onRouteNode && this.onRouteNode(R[this.seg]);
    } else {
      const step = Math.min(sp * dt, horiz);
      const nx = this.pos.x + (dx / horiz) * step;
      const nz = this.pos.z + (dz / horiz) * step;
      const cur = locate(this.pos.x, this.pos.z);
      const curG = groundAtS(cur.s, this.pos.x, this.pos.z);
      const nl = locate(nx, nz);
      const nextG = groundAtS(nl.s, nx, nz);
      if (nextG - curG <= STEP_UP) {
        const rr = this._resolve(nx, nz, curG);
        this.pos.x = rr.x; this.pos.z = rr.z;
      } else {
        /* 被挡（正面撞台阶/墙）：自动切换到下一点，巡游不卡住 */
        this.seg = (this.seg + 1) % R.length;
        this.onRouteNode && this.onRouteNode(R[this.seg]);
      }
      this.bob += dt * 7.2;
    }
    /* 看向下一个看点 */
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
    if (s < L1.s0) return '比赛场地';
    for (const T of TIERS) {
      if (s >= T.s0 && s < T.endS) return T.name;
      if (s >= T.cS0 && s < T.cS1) return T.name.replace('看台', '') + '环廊';
    }
    return '场馆外环';
  }
}

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
