/* ═══════════════════════════════════════════════════════════════════════
   env.js v2 — 场所与环境（总平面 900×900m）
   尺度真源：sections.js（看台外皮 s≈105 → 主馆外轮廓 ≈279×315m）。
   分区（俯视；+z 为南、+x 为东）：
     · 中央球迷广场：主馆外 3m 起，放射铺装 + 中央水景 + 旗阵 + 大台阶 + 基座台
     · 4 条 30m 宽林荫大道（沿 ±x / ±z 轴）接城市路网
     · 西侧 2 块 105×68 训练场（围网 / 简易看台 / 4 灯柱）
     · 东侧 公交 + 地铁接驳（站台 / 雨棚 / 导向牌 / 车行道）
     · 东南 6 层停车楼（坡道可见 / 立面开洞 / 屋顶设备）
     · 南侧 商业餐饮带（2-3 层带雨棚街区 + 外摆）
     · 周边城市：半透明白色体块（基座 / 退台 / 屋顶设备），沿路网成街廓
   性能：重复构件全部 GeomBatch 合批 / InstancedMesh；静态面默认不投影不接收阴影。
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { GeomBatch, clamp, lerp } from '../lib/core.js';
import { GEO, HALF_X, HALF_Z, CORNER_F } from '../lib/sections.js';
import { boundaryT } from '../lib/rings.js';
import * as TX from '../lib/textures.js';

const GY = GEO.groundY;                       // -1.2
const TAU = Math.PI * 2;

/* 环向极坐标：u=0 在 +z 边中点，沿 +x 方向递增（与 arena/rings.js 一致） */
const angOf = (u) => u * TAU - Math.PI / 2;

/* 圆角矩形轮廓到场地边界的净距 s（迭代求出外轮廓极径） */
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
const wpt = (u, s, y) => {
  const a = angOf(u), c = Math.cos(a), n = Math.sin(a);
  const t = rawS(c, n, s);
  return new THREE.Vector3(c * t, y, n * t);
};

/* 4 条林荫大道的绿化/人行道侧边偏移：30m 车行道 + 2×6m 绿化带 */
const AXIS_CLEAR = 21.5;
const isOnAxis = (x, z) => Math.abs(x) < AXIS_CLEAR || Math.abs(z) < AXIS_CLEAR;

/* 确定性随机（每次刷新布置一致） */
function rnd(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ══════════════ 总平面数据（渲染与自测脚本共用） ══════════════ */
export const SITE = {
  training: [{ x: -242, z: -80 }, { x: -242, z: 80 }],
  transit: { x: 200, z: 0 },
  parking: { x: 218, z: 218 },
  retail: { x: 0, z: 260 },
  cityR0: 248, cityR1: 560,
  plazaR1: 300,
  pitch: { L: 105, W: 68 },
};

/* 路网：40 个 40m 街廓（970×970m），16m 车行道 + 5m 人行道 */
const BLK = 40, ROAD_W = 16, WALK_W = 5;
const B_RC = 3, B_CITY = 6.5, B_OUT = 9.4;        // 街廓索引半径（近景 / 城市体块 / 地面铺装）

export function buildEnv(scene, stage) {
  const root = new THREE.Group(); root.name = 'ENV';
  scene.add(root);

  const groups = {};
  const G = (n) => {
    const g = new THREE.Group(); g.name = n; root.add(g); groups[n] = g; return g;
  };
  const gPlaza = G('plaza'), gTraining = G('training'), gTransit = G('transit'),
    gParking = G('parking'), gLandscape = G('landscape'), gCity = G('city'), gProps = G('props');

  const ents = {};
  const ent = (id, mesh, parent, label, spec) => {
    ents[id] = { id, mesh, parent, label, spec };
    return ents[id];
  };

  /* ══════════════════════════════════════════════════════════════════════
     材质与纹理
     ══════════════════════════════════════════════════════════════════════ */
  const aniso = stage && stage.renderer ? Math.min(8, stage.renderer.capabilities.getMaxAnisotropy()) : 4;
  const tex = (t, rx, ry) => {
    t.anisotropy = aniso;
    if (rx) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry || rx); }
    return t;
  };
  const texPlaza = tex(TX.plazaTexture());
  const texRoad = tex(TX.asphaltTexture());
  const texGrass = tex(TX.grassTexture(), 140, 140);
  const texPitch = tex(TX.grassTexture(), 10, 7);
  const texCity = tex(TX.cityBlockTexture());
  const texCanopy = tex(TX.canopyTexture(), 8, 1);
  const texWalk = tex(TX.plazaTexture(), 0.32, 0.32);

  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.7 }, o));
  const M = {
    terrain: std({ color: 0xffffff, roughness: 0.97, metalness: 0, vertexColors: true }),
    plaza: std({ color: 0xffffff, map: texPlaza, roughness: 0.86, metalness: 0.02 }),
    plazaDark: std({ color: 0x8f8b83, roughness: 0.9 }),
    band: std({ color: 0xd9d2c4, roughness: 0.82 }),
    stone: std({ color: 0xe4ddcd, roughness: 0.86 }),
    stoneDark: std({ color: 0x9c968b, roughness: 0.9 }),
    concrete: std({ color: 0xcfcabf, roughness: 0.9 }),
    concreteDark: std({ color: 0x6d6a64, roughness: 0.92 }),
    road: std({ color: 0xffffff, map: texRoad, roughness: 0.95, metalness: 0.0 }),
    line: new THREE.MeshBasicMaterial({ color: 0xe6d27a, transparent: true, opacity: 0.55 }),
    walk: std({ color: 0xbcb8ae, map: texWalk, roughness: 0.92 }),
    /* 街廓内部铺装：比人行道更中性，用来"填实"地块 */
    plot: std({ color: 0xa9a59b, map: texWalk, roughness: 0.94 }),
    kerb: std({ color: 0xc4bfb3, roughness: 0.88 }),
    grass: std({ color: 0xffffff, map: texGrass, roughness: 0.96 }),
    hill: std({ color: 0xffffff, map: texPitch, roughness: 0.96, side: THREE.DoubleSide }),
    pitchGrass: std({ color: 0xe6efdc, map: texPitch, roughness: 0.94 }),
    pitchLine: new THREE.MeshBasicMaterial({ color: 0xf2f6ee, transparent: true, opacity: 0.8, toneMapped: false }),
    trunk: std({ color: 0x5a4735, roughness: 0.92 }),
    leaf: std({ color: 0x4b773a, roughness: 0.86, flatShading: true }),
    leaf2: std({ color: 0x67903f, roughness: 0.86, flatShading: true }),
    hedge: std({ color: 0x3f6a34, roughness: 0.95 }),
    fence: new THREE.MeshBasicMaterial({ color: 0xaab4bb, transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
    water: new THREE.MeshStandardMaterial({ color: 0x2f5b6e, roughness: 0.12, metalness: 0.7, envMapIntensity: 1.3 }),
    /* 城市肌理：半透明白体块（透明度 0.12–0.25，不抢主体） */
    massing: new THREE.MeshStandardMaterial({
      color: 0xf4f6f8, map: texCity, roughness: 0.72, metalness: 0.03,
      transparent: true, opacity: 0.20, depthWrite: false, side: THREE.DoubleSide,
      envMapIntensity: 0.9,
    }),
    massingRoof: new THREE.MeshStandardMaterial({
      color: 0xe6eaee, roughness: 0.85, transparent: true, opacity: 0.13,
      depthWrite: false, side: THREE.DoubleSide,
    }),
    canopy: std({ color: 0xffffff, map: texCanopy, roughness: 0.45, metalness: 0.55 }),
    metal: std({ color: 0x98a2ad, roughness: 0.42, metalness: 0.78 }),
    metalDark: std({ color: 0x515a63, roughness: 0.55, metalness: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x9db2c4, roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.3, envMapIntensity: 1.4, side: THREE.DoubleSide }),
    glowWarm: new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false }),
    glowCool: new THREE.MeshBasicMaterial({ color: 0xbfe8f5, toneMapped: false }),
    glowRed: new THREE.MeshBasicMaterial({ color: 0xc4462f, toneMapped: false }),
    screen: new THREE.MeshBasicMaterial({ color: 0x53b6cf, toneMapped: false }),
    /* 车辆：4 色 × 1 个实例批次 */
    carA: std({ color: 0xe9ebed, roughness: 0.35, metalness: 0.3 }),
    carB: std({ color: 0x394857, roughness: 0.4, metalness: 0.35 }),
    carC: std({ color: 0xa8402f, roughness: 0.4, metalness: 0.3 }),
    carD: std({ color: 0x4a6d8c, roughness: 0.4, metalness: 0.3 }),
    carGlass: std({ color: 0x1d2833, roughness: 0.2, metalness: 0.4 }),
  };

  /* ══════════════════════════════════════════════════════════════════════
     工具：合批 / 实例化 / 极坐标盘
     ══════════════════════════════════════════════════════════════════════ */
  const addBox = (b, cx, cy, cz, w, h, d, rotY = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Matrix4();
    if (rotY) m.makeRotationY(rotY);
    m.setPosition(cx, cy, cz);
    b.add(g, m);
    g.dispose();
  };
  const flush = (b, mat, parent, name) => {
    const g = b.build();
    if (!g) return null;
    const m = new THREE.Mesh(g, mat);
    m.name = name || 'env-batch';
    parent.add(m);
    return m;
  };
  const _d = new THREE.Object3D();
  const matOf = (x, y, z, ry = 0, s = 1) => {
    _d.position.set(x, y, z);
    _d.rotation.set(0, ry, 0);
    _d.scale.setScalar(s);
    _d.updateMatrix();
    return _d.matrix.clone();
  };
  const IB = (geo, mat, opts = {}) => ({
    geo, mat, opts, mats: [],
    push(m) { this.mats.push(m); return this; },
    flush(parent, name) {
      if (!this.mats.length) return null;
      const im = new THREE.InstancedMesh(this.geo, this.mat, this.mats.length);
      im.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      for (let i = 0; i < this.mats.length; i++) im.setMatrixAt(i, this.mats[i]);
      im.instanceMatrix.needsUpdate = true;
      im.name = name || 'inst';
      im.castShadow = !!this.opts.shadow;
      im.receiveShadow = !!this.opts.recv;
      im.computeBoundingSphere();
      parent.add(im);
      return im;
    },
    get count() { return this.mats.length; },
  });

  /* 极坐标盘（环带 / 扇形）：u 沿环向、s 沿径向，uv 按米制映射 */
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
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    (parent || root).add(m);
    return m;
  }
  const P = (u, s, y) => wpt(u, s, y);

  /* ══════════════════════════════════════════════════════════════════════
     0. 大地：草地基底（顶点色区分场内 / 广场 / 城市）
     ══════════════════════════════════════════════════════════════════════ */
  {
    const S = 2000, N = 40;
    const g = new THREE.PlaneGeometry(S, S, N, N);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    /* 分区着色：球场外一圈是公园/绿地，城市环以外是"建成区地面"（暖灰），
       只用绿色会被读成大片草地空洞。 */
    const cPark = new THREE.Color(0x93a681), cPark2 = new THREE.Color(0x82996d);
    const cUrban = new THREE.Color(0xa5a196), cUrban2 = new THREE.Color(0x93908a);
    const cRim = new THREE.Color(0xb0aca2);
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
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, M.terrain);
    m.position.y = GY - 0.14; m.name = 'env-terrain';
    m.receiveShadow = true;
    gLandscape.add(m);
    ent('ground', m, gLandscape, '场地大地与绿地', '总图 900×900m · 草地基底');
  }

  /* ══════════════════════════════════════════════════════════════════════
     1. 道路网：40×40 街廓，16m 车行道 + 5m 人行道 + 路缘石 + 中心线
     ══════════════════════════════════════════════════════════════════════ */
  {
    const roadB = new GeomBatch(), walkB = new GeomBatch(),
      kerbB = new GeomBatch(), lineB = new GeomBatch();
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
      const wOut = BLK / 2 - ROAD_W / 2 + WALK_W;    // 17
      /* 地块铺装：把街廓内部整体填平，避免"空地块"读感 */
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
    const rm = flush(roadB, M.road, gProps, 'env-roads');
    const wm = flush(walkB, M.walk, gProps, 'env-walkways');
    flush(kerbB, M.kerb, gProps, 'env-kerbs');
    flush(lineB, M.line, gProps, 'env-roadlines');
    const pm = flush(plotB, M.plot, gProps, 'env-plots');
    if (pm) pm.receiveShadow = true;
    if (rm) rm.receiveShadow = true;
    if (wm) wm.receiveShadow = true;
    ent('roads', rm, gProps, '城市道路网', '40m 街廓 · 16m 双向车行道 + 5m 人行道');
  }

  /* ══════════════════════════════════════════════════════════════════════
     2. 中央球迷广场：放射铺装 / 基座台 / 大台阶 / 水景 / 旗阵 / 弧形行道树
     ══════════════════════════════════════════════════════════════════════ */
  const S_PLZ = rawS(0, 1, 4);            // 广场内边界（主馆外 4m）
  const S_POD = S_PLZ + 42;               // 基座台外缘（≈152m）
  const R_PLZ = 300;                      // 广场外缘净距
  const RISE = 0.45;                      // 广场基座台高
  {
    /* 4 条大道正对的扇形铺装（±30°） */
    for (let k = 0; k < 4; k++) {
      const u = k / 4;
      polarDisc(u - 0.083, u + 0.083, S_PLZ, R_PLZ, 30, M.plaza, GY + 0.05, 0.12, gPlaza, 3);
    }
    ent('plaza', gPlaza.children[0], gPlaza, '中央球迷广场',
      '放射花岗岩铺装 · 4 条林荫大道 · 旗阵与水景');

    /* 主馆一圈的连续基座台（高 0.45m，广场高于地面读作基座） */
    const podB = new GeomBatch();
    for (let i = 0; i < 128; i++) {
      const u0 = i / 128, u1 = (i + 1) / 128;
      const q0 = P(u0, S_PLZ, GY + RISE), q1 = P(u0, S_POD, GY + RISE),
        q2 = P(u1, S_POD, GY + RISE), q3 = P(u1, S_PLZ, GY + RISE);
      podB.quad(q0, q3, q2, q1, [[0, 0], [1, 0], [1, 1], [0, 1]]);
      const b0 = P(u0, S_POD, GY), b1 = P(u1, S_POD, GY);
      podB.quad(b0, b1, q2, q1, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    }
    const pm = new THREE.Mesh(podB.build(), M.stone);
    pm.name = 'plaza-podium'; pm.receiveShadow = true;
    gPlaza.add(pm);

    /* 基座台顶：放射分格带 */
    const bandB = new GeomBatch();
    for (let k = 0; k < 32; k++) {
      const u = k / 32, a = angOf(u);
      const t0 = rawS(Math.cos(a), Math.sin(a), S_PLZ + 2), t1 = rawS(Math.cos(a), Math.sin(a), S_POD - 2);
      const m = new THREE.Matrix4().makeRotationY(-a + Math.PI / 2);
      m.setPosition(Math.cos(a) * (t0 + t1) / 2, GY + RISE + 0.012, Math.sin(a) * (t0 + t1) / 2);
      const g = new THREE.BoxGeometry(0.55, 0.02, t1 - t0);
      bandB.add(g, m); g.dispose();
    }
    flush(bandB, M.plazaDark, gPlaza, 'plaza-radialbands');

    /* 大台阶：4 条大道正对处，5 级从地面 GY 上到 GY+RISE */
    const stepTopB = new GeomBatch(), stepRiseB = new GeomBatch();
    const STEPS = 5, TREAD = 1.9;
    for (let k = 0; k < 4; k++) {
      const uC = k / 4;
      const pu = 0.052;
      for (let s = 0; s < STEPS; s++) {
        const y = GY + RISE * (s + 1) / STEPS;
        const sIn = S_POD + (STEPS - 1 - s) * TREAD;
        const sOut = sIn + TREAD;
        // 踏面（薄板）
        const t0 = P(uC - pu, sIn, y), t1 = P(uC + pu, sIn, y),
          t2 = P(uC + pu, sOut, y), t3 = P(uC - pu, sOut, y);
        stepTopB.quad(t3, t2, t1, t0, [[0, 0], [1, 0], [1, 1], [0, 1]]);
        // 踢面
        const yPrev = GY + RISE * s / STEPS;
        const r0 = P(uC - pu, sIn, yPrev), r1 = P(uC + pu, sIn, yPrev);
        stepRiseB.quad(r1, r0, t0, t1, [[0, 0], [1, 0], [1, 1], [0, 1]]);
      }
      // 台阶两侧矮墙
      for (const su of [-pu - 0.002, pu]) {
        const a0 = P(uC + su, S_POD, GY), a1 = P(uC + su, S_POD + STEPS * TREAD, GY);
        const m = new THREE.Matrix4().lookAt(a0, a1, new THREE.Vector3(0, 1, 0));
        m.setPosition(a0.x, GY + RISE + 0.3, a0.z);
        const g = new THREE.BoxGeometry(0.6, 0.75, a0.distanceTo(a1));
        bandB.add(g, m); g.dispose();
      }
    }
    flush(stepTopB, M.stone, gPlaza, 'plaza-grandstep-tread');
    flush(stepRiseB, M.stoneDark, gPlaza, 'plaza-grandstep-riser');

    /* 中央水景：南向大道旁 2 片长池 + 居中圆形泉池 */
    const waterB = new GeomBatch(), rimB = new GeomBatch();
    const poolAt = (x, z, w, d) => {
      addBox(rimB, x, GY + RISE + 0.16, z, w + 2.6, 0.42, d + 2.6);
      const pg = new THREE.PlaneGeometry(w, d); pg.rotateX(-Math.PI / 2);
      const m = new THREE.Matrix4(); m.setPosition(x, GY + RISE + 0.34, z);
      waterB.add(pg, m); pg.dispose();
    };
    poolAt(-40, 196, 30, 13);
    poolAt(40, 196, 30, 13);
    addBox(rimB, 0, GY + RISE + 0.16, 236, 44, 0.42, 44);
    const circ = new THREE.CircleGeometry(21, 56); circ.rotateX(-Math.PI / 2);
    const cm = new THREE.Matrix4(); cm.setPosition(0, GY + RISE + 0.34, 236);
    waterB.add(circ, cm); circ.dispose();
    flush(rimB, M.stone, gPlaza, 'plaza-poolrim');
    const waterMesh = flush(waterB, M.water, gPlaza, 'plaza-pools');
    ent('water', waterMesh, gPlaza, '中央水景', '2 片长池（30×13m）+ 圆形泉池（r=21m）');

    /* 旗阵：南向大道两侧各 6 根 + 基座台环列 24 根 */
    const poleB = new GeomBatch(), flagB = new GeomBatch(), baseB = new GeomBatch();
    const flagCols = [0xc4482f, 0x2c6da8, 0x2f7f5f, 0xc99a4e];
    const flagGeos = flagCols.map(() => new GeomBatch());
    const addPole = (x, y0, z, h, w, ci) => {
      addBox(poleB, x, y0 + h / 2, z, 0.3, h, 0.3);
      addBox(baseB, x, y0 + 0.22, z, 1.1, 0.44, 1.1);
      const fg = new THREE.PlaneGeometry(w, w * 0.62);
      const m = new THREE.Matrix4().makeRotationY(Math.PI / 4);
      m.setPosition(x + w * 0.5, y0 + h - w * 0.34, z);
      flagGeos[ci].add(fg, m); fg.dispose();
    };
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 6; i++) addPole(side * (24 + i * 12), GY, 262, 15 - i * 0.4, 3.0, (i + (side > 0 ? 1 : 0)) % 4);
    }
    for (let i = 0; i < 24; i++) {
      const p = P(i / 24 + 0.0208, S_POD - 5, GY + RISE);
      addPole(p.x, GY + RISE, p.z, 13, 2.7, i % 4);
    }
    flush(poleB, M.metal, gPlaza, 'plaza-flagpoles');
    flush(baseB, M.stone, gPlaza, 'plaza-flagbases');
    const flagMeshes = [];
    flagGeos.forEach((b, i) => {
      const mm = flush(b, new THREE.MeshStandardMaterial({
        color: flagCols[i], roughness: 0.9, side: THREE.DoubleSide,
      }), gPlaza, 'plaza-flags-' + i);
      if (mm) flagMeshes.push(mm);
    });
    ent('flags', flagMeshes[0] || pm, gPlaza, '旗阵', '36 面赛事旗帜 · 南向大道两侧 + 基座台环列');
  }

  /* ══════════════════════════════════════════════════════════════════════
     3. 西侧训练场：2 块 105×68（围网 + 简易看台 + 4 灯柱/块）+ 训练中心
     ══════════════════════════════════════════════════════════════════════ */
  {
    const poleIB = IB(new THREE.CylinderGeometry(0.28, 0.36, 1, 6), M.metalDark);
    SITE.training.forEach((t, ti) => {
      // 场地
      const g = new THREE.PlaneGeometry(105, 68);
      g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, M.pitchGrass);
      m.position.set(t.x, GY + 0.06, t.z);
      gTraining.add(m);
      // 标线（外框 + 中线 + 中圈 + 两端禁区，用细条带合批）
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
      // 中圈
      const ring = new THREE.RingGeometry(9.05, 9.19, 48, 1);
      ring.rotateX(-Math.PI / 2);
      const rm2 = new THREE.Matrix4(); rm2.setPosition(t.x, GY + 0.075, t.z);
      lb.add(ring, rm2); ring.dispose();
      flush(lb, M.pitchLine, gTraining, 'training-lines-' + ti);

      // 围网（高 4.5m，半透明网面 + 立柱 + 横杆）
      const fb = new GeomBatch(), postB = new GeomBatch();
      const FX = 62, FZ = 44, FH = 4.5;
      const face = (x, z, w, d) => {
        const pg = new THREE.PlaneGeometry(w, FH);
        const mm = new THREE.Matrix4();
        mm.setPosition(x, GY + FH / 2, z);
        fb.add(pg, mm); pg.dispose();
      };
      face(t.x, t.z - FZ, FX * 2, 0);
      face(t.x, t.z + FZ, FX * 2, 0);
      // 侧网旋转 90°
      [[-FX], [FX]].forEach(([sg]) => {
        const pg = new THREE.PlaneGeometry(FZ * 2, FH);
        const mm = new THREE.Matrix4().makeRotationY(Math.PI / 2);
        mm.setPosition(t.x + sg, GY + FH / 2, t.z);
        fb.add(pg, mm); pg.dispose();
      });
      for (let x = -FX; x <= FX; x += 8) {
        addBox(postB, t.x + x, GY + FH / 2, t.z - FZ, 0.12, FH, 0.12);
        addBox(postB, t.x + x, GY + FH / 2, t.z + FZ, 0.12, FH, 0.12);
      }
      for (let z = -FZ; z <= FZ; z += 8) {
        addBox(postB, t.x - FX, GY + FH / 2, t.z + z, 0.12, FH, 0.12);
        addBox(postB, t.x + FX, GY + FH / 2, t.z + z, 0.12, FH, 0.12);
      }
      flush(fb, M.fence, gTraining, 'training-fence-' + ti);
      flush(postB, M.metalDark, gTraining, 'training-fenceposts-' + ti);

      // 简易看台（西侧 3 级台阶座）
      const tb = new GeomBatch(), seatB = new GeomBatch();
      for (let r = 0; r < 4; r++) {
        const y = GY + 0.45 * (r + 1);
        addBox(tb, t.x - FX - 6 - r * 1.2, GY + 0.45 * (r + 1) / 2, t.z, 1.2, y - GY, 46);
        addBox(seatB, t.x - FX - 6 - r * 1.2, y + 0.06, t.z, 1.2, 0.12, 46);
      }
      flush(tb, M.concrete, gTraining, 'training-stand-' + ti);
      flush(seatB, M.band, gTraining, 'training-standseats-' + ti);

      // 4 根灯柱（27m 高，顶部 6 组投光灯）
      const lampB = new GeomBatch(), headB = new GeomBatch();
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
        const px = t.x + sx * (FX + 10), pz = t.z + sz * (FZ + 10);
        addBox(lampB, px, GY + 13.5, pz, 0.5, 27, 0.5);
        addBox(headB, px, GY + 27.4, pz, 4.2, 1.0, 0.6, Math.atan2(t.x - px, t.z - pz));
      });
      flush(lampB, M.metalDark, gTraining, 'training-lampmasts-' + ti);
      flush(headB, M.glowWarm, gTraining, 'training-lampheads-' + ti);
    });
    ent('training', gTraining.children[0], gTraining, '训练场',
      '2 × 105×68m 天然草 · 围网 / 简易看台 / 4 灯柱每块');

    /* 训练中心（一层白色体块 + 雨棚） */
    const cb = new GeomBatch();
    addBox(cb, -338, GY + 7, 0, 26, 14, 112);
    addBox(cb, -338, GY + 14.4, 0, 27, 0.8, 113);
    addBox(cb, -316, GY + 0.3, 0, 8, 0.6, 90);
    flush(cb, M.concrete, gTraining, 'training-center');
    const gb = new GeomBatch();
    for (let z = -50; z <= 50; z += 5) addBox(gb, -325, GY + 3.4, z, 0.2, 6.4, 4.2);
    flush(gb, M.glass, gTraining, 'training-center-glass');
  }

  /* ══════════════════════════════════════════════════════════════════════
     4. 东侧 公交 + 地铁接驳：站台 / 雨棚 / 导向牌 / 车行道 / 人行天桥
     ══════════════════════════════════════════════════════════════════════ */
  {
    const cx = SITE.transit.x, cz = SITE.transit.z;
    // 车行湾（铺装）
    const bb = new GeomBatch();
    addBox(bb, cx + 4, GY + 0.03, cz, 56, 0.08, 108);
    flush(bb, M.road, gTransit, 'transit-roadway');

    // 2 条站台（长 96m，高 0.25）
    const platB = new GeomBatch(), edgeB = new GeomBatch();
    [[-16], [18]].forEach(([dz]) => {
      addBox(platB, cx, GY + 0.13, cz + dz, 100, 0.26, 6);
      addBox(edgeB, cx, GY + 0.27, cz + dz - 2.85, 100, 0.04, 0.3);
    });
    flush(platB, M.concrete, gTransit, 'transit-platforms');
    flush(edgeB, M.line, gTransit, 'transit-platformedges');

    // 雨棚（连续折板 + 落柱）
    const canB = new GeomBatch(), postB = new GeomBatch(), glowB = new GeomBatch();
    [[-16], [18]].forEach(([dz]) => {
      for (let i = 0; i < 8; i++) {
        const x = cx - 48 + i * 13.7;
        const m = new THREE.Matrix4().makeRotationZ(-0.09);
        m.setPosition(x, GY + 5.5, cz + dz);
        const g = new THREE.BoxGeometry(13.7, 0.35, 13.5);
        canB.add(g, m); g.dispose();
        addBox(postB, x + 5.6, GY + 2.75, cz + dz, 0.34, 5.5, 0.34);
        addBox(glowB, x, GY + 5.1, cz + dz - 3, 12.4, 0.1, 0.5);
      }
    });
    flush(canB, M.canopy, gTransit, 'transit-canopy');
    flush(postB, M.metal, gTransit, 'transit-canopyposts');
    flush(glowB, M.glowWarm, gTransit, 'transit-canopylights');

    // 导向牌 + 信息屏 + 站名牌
    const sb = new GeomBatch(), scrB = new GeomBatch();
    for (let i = 0; i < 6; i++) {
      const x = cx - 42 + i * 17;
      addBox(sb, x, GY + 2.2, cz - 4, 0.18, 4.4, 0.18);
      addBox(sb, x, GY + 4.2, cz - 4, 2.6, 1.5, 0.16);
    }
    addBox(sb, cx, GY + 3.6, cz + 40, 16, 1.1, 0.5);
    addBox(scrB, cx, GY + 4.6, cz + 40, 15, 2.6, 0.2);
    addBox(scrB, cx - 30, GY + 3.6, cz - 22, 9, 4.2, 0.24);
    flush(sb, M.metalDark, gTransit, 'transit-signage');
    flush(scrB, M.screen, gTransit, 'transit-screens');

    // 地铁站出入口（玻璃盒 + 扶梯口 + 站厅体块）
    const mb = new GeomBatch(), grB = new GeomBatch();
    addBox(mb, cx + 42, GY + 3.6, cz, 20, 7.2, 26);
    addBox(mb, cx + 42, GY + 7.4, cz, 22, 0.6, 28);
    addBox(grB, cx + 32.2, GY + 3.4, cz, 0.2, 6.2, 16);
    flush(mb, M.massing, gTransit, 'transit-metrobox');
    flush(grB, M.glass, gTransit, 'transit-metroglass');
    // 出入口红色标识柱
    const redB = new GeomBatch();
    [[-6, -8], [6, 8]].forEach(([dx, dz]) => addBox(redB, cx + 30, GY + 2.4, cz + dz, 1.6, 4.8, 1.6));
    flush(redB, M.glowRed, gTransit, 'transit-metromarkers');

    // 人行天桥（跨大道，接东门）
    const brB = new GeomBatch(), railB = new GeomBatch();
    addBox(brB, cx - 52, GY + 7.2, cz, 44, 0.7, 5.2);
    addBox(railB, cx - 52, GY + 8.4, cz - 2.5, 44, 1.6, 0.14);
    addBox(railB, cx - 52, GY + 8.4, cz + 2.5, 44, 1.6, 0.14);
    [[-30], [30]].forEach(([dx]) => addBox(brB, cx - 52 + dx, GY + 3.6, cz, 2.2, 7.2, 2.2));
    flush(brB, M.concrete, gTransit, 'transit-footbridge');
    flush(railB, M.metal, gTransit, 'transit-footbridge-rail');

    ent('transit', gTransit.children[0], gTransit, '公交 / 地铁接驳',
      '2 条站台（100m 雨棚）+ 地铁站厅 + 人行天桥 + 导向屏');
  }

  /* ══════════════════════════════════════════════════════════════════════
     5. 东南 6 层停车楼：坡道可见 / 立面开洞 / 屋顶设备
     ══════════════════════════════════════════════════════════════════════ */
  {
    const { x: cx, z: cz } = SITE.parking;
    const W = 112, D = 56, LV = 6, FH = 3.3;
    const slabB = new GeomBatch(), colB = new GeomBatch(), railB = new GeomBatch(),
      screenB = new GeomBatch(), rampB = new GeomBatch(), eqB = new GeomBatch(), stairB = new GeomBatch();
    const carIBs = [IB(new THREE.BoxGeometry(4.4, 1.35, 1.85), M.carA),
      IB(new THREE.BoxGeometry(4.4, 1.35, 1.85), M.carB),
      IB(new THREE.BoxGeometry(4.4, 1.35, 1.85), M.carC),
      IB(new THREE.BoxGeometry(4.4, 1.35, 1.85), M.carD)];
    const R = rnd(6612);
    for (let lv = 0; lv < LV; lv++) {
      const y = GY + lv * FH;
      addBox(slabB, cx, y + 0.15, cz, W, 0.3, D);
      // 柱网
      for (let ix = -3; ix <= 3; ix++) for (let iz = -1; iz <= 1; iz++) {
        addBox(colB, cx + ix * 16, y + FH / 2, cz + iz * 24, 0.85, FH, 0.85);
      }
      // 立面开洞：每个开间顶部一条栏板 + 下沿一条梁（中间是洞口）
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
      // 竖向格栅（读作立面肌理）
      for (let ix = -9; ix <= 9; ix++) {
        addBox(screenB, cx + ix * 6, y + FH / 2, cz - D / 2 - 0.12, 0.22, FH - 0.4, 0.16);
      }
      // 停车位 + 车辆（4 色实例）
      for (let ix = -3; ix < 3; ix++) for (const sg of [-1, 1]) {
        for (let k = 0; k < 4; k++) {
          if (R() > 0.62) continue;
          const px = cx + ix * 16 + 2.2 + k * 3.6;
          const pz = cz + sg * (D / 2 - 3.2);
          carIBs[Math.floor(R() * 4)].push(matOf(px, y + 0.98, pz, 0, 1));
        }
      }
    }
    // 外圈坡道（沿西侧长边的螺旋坡道：每层半圈）
    for (let lv = 0; lv < LV; lv++) {
      const y = GY + lv * FH;
      for (let k = 0; k < 18; k++) {
        const z0 = cz - D / 2 + k * (D / 18), z1 = z0 + D / 18;
        const yy = y + (k / 18) * FH;
        const m = new THREE.Matrix4().makeRotationX(Math.atan2(FH, D));
        m.setPosition(cx - W / 2 - 6.5, yy + 0.1, (z0 + z1) / 2);
        const g = new THREE.BoxGeometry(9, 0.4, D / 18 + 0.6);
        rampB.add(g, m); g.dispose();
      }
      addBox(railB, cx - W / 2 - 11, y + 0.75, cz, 0.2, 1.5, D);
    }
    // 核心筒（电梯 + 楼梯）
    addBox(stairB, cx + W / 2 - 12, GY + LV * FH / 2, cz + D / 2 - 8, 14, LV * FH, 12);
    // 屋顶设备（空调机组 / 水箱 / 光伏阵列）
    for (let i = 0; i < 14; i++) {
      const px = cx - 44 + (i % 7) * 15, pz = cz - 14 + Math.floor(i / 7) * 24;
      addBox(eqB, px, GY + LV * FH + 1.1, pz, 7.5, 1.6, 4.5);
    }
    addBox(eqB, cx + 34, GY + LV * FH + 3.2, cz - 16, 6, 6, 6);
    // 太阳能板（倾斜）
    for (let i = 0; i < 18; i++) {
      const px = cx - 46 + (i % 9) * 11.5, pz = cz + 12 + Math.floor(i / 9) * 9;
      const m = new THREE.Matrix4().makeRotationX(-0.32);
      m.setPosition(px, GY + LV * FH + 1.2, pz);
      const g = new THREE.BoxGeometry(9, 0.12, 4.5);
      eqB.add(g, m); g.dispose();
    }
    flush(slabB, M.concrete, gParking, 'parking-slabs');
    flush(colB, M.concreteDark, gParking, 'parking-columns');
    flush(railB, M.concrete, gParking, 'parking-parapets');
    flush(screenB, M.metal, gParking, 'parking-louvers');
    flush(rampB, M.concrete, gParking, 'parking-ramp');
    flush(stairB, M.concrete, gParking, 'parking-core');
    flush(eqB, M.metalDark, gParking, 'parking-rooftop');
    carIBs.forEach((ib, i) => ib.flush(gParking, 'parking-cars-' + i));
    ent('parking', gParking.children[0], gParking, '停车楼',
      '6 层 · 立面开洞 + 外挂坡道 · 约 900 车位（示意）');
  }

  /* ══════════════════════════════════════════════════════════════════════
     6. 南侧商业餐饮带：2-3 层带雨棚街区 + 外摆
     ══════════════════════════════════════════════════════════════════════ */
  {
    const R = rnd(2288);
    const wallB = new GeomBatch(), glassB = new GeomBatch(), canopyB = new GeomBatch(),
      tableB = new GeomBatch(), chairB = new GeomBatch(), signB = new GeomBatch();
    const N = 5;
    for (let i = 0; i < N; i++) {
      const px = -130 + i * 52 + (R() - 0.5) * 6;
      const pz = 300 + (R() - 0.5) * 14;
      const w = 40 + R() * 6, d = 26 + R() * 6;
      const h = [9.5, 13.0, 7.0, 13.0, 9.5][i];
      // 主体
      addBox(wallB, px, GY + h / 2, pz, w, h, d);
      // 底层玻璃（面向广场一侧，内缩 0.4m）
      addBox(glassB, px, GY + 2.4, pz - d / 2 - 0.05, w - 4, 4.4, 0.3);
      // 二/三层玻璃带
      if (h > 8) addBox(glassB, px, GY + 6.6, pz - d / 2 - 0.05, w - 6, 3.2, 0.3);
      // 雨棚（面向广场 + 沿街）
      const m = new THREE.Matrix4().makeRotationX(-0.05);
      m.setPosition(px, GY + 4.9, pz - d / 2 - 3.2);
      const cg = new THREE.BoxGeometry(w - 2, 0.22, 6.4);
      canopyB.add(cg, m); cg.dispose();
      for (let k = -2; k <= 2; k++) addBox(canopyB, px + k * (w / 6), GY + 4.6, pz - d / 2 - 1.2, 0.18, 0.4, 1.0);
      // 屋面女儿墙 + 屋顶设备
      addBox(wallB, px, GY + h + 0.5, pz, w - 1.2, 1.0, d - 1.2);
      addBox(signB, px, GY + h + 1.3, pz - d / 2, w * 0.5, 1.2, 0.3);
      // 外摆：桌椅（每栋 6 组）
      for (let k = 0; k < 6; k++) {
        const tx = px - (w - 10) / 2 + k * (w - 10) / 5;
        const tz = pz - d / 2 - 5.6;
        addBox(tableB, tx, GY + 0.72, tz, 1.4, 0.1, 1.4);
        addBox(tableB, tx, GY + 0.36, tz, 0.16, 0.72, 0.16);
        for (let c = -1; c <= 1; c += 2) addBox(chairB, tx + c * 1.15, GY + 0.42, tz, 0.5, 0.84, 0.5);
      }
      // 遮阳伞
      for (let k = 0; k < 3; k++) {
        const tx = px - (w - 14) / 2 + k * (w - 14) / 2;
        addBox(canopyB, tx, GY + 2.6, pz - d / 2 - 5.6, 0.12, 2.6, 0.12);
        addBox(canopyB, tx, GY + 4.0, pz - d / 2 - 5.6, 5.4, 0.12, 5.4);
      }
    }
    flush(wallB, M.concrete, gProps, 'retail-blocks');
    flush(glassB, M.glass, gProps, 'retail-glass');
    flush(canopyB, M.canopy, gProps, 'retail-canopies');
    flush(tableB, M.band, gProps, 'retail-tables');
    flush(chairB, M.metalDark, gProps, 'retail-chairs');
    flush(signB, M.glowWarm, gProps, 'retail-signs');

    /* 西侧社区街区（4 栋 3 层，体量更小） */
    const wb = new GeomBatch();
    for (let i = 0; i < 4; i++) {
      const px = -300 + (i % 2) * 46, pz = 250 + Math.floor(i / 2) * 44;
      addBox(wb, px, GY + 6.0, pz, 40, 12, 34);
      addBox(wb, px, GY + 12.2, pz, 41, 0.8, 35);
    }
    flush(wb, M.concrete, gProps, 'west-blocks');
    ent('retail', gProps.children[gProps.children.length - 2], gProps, '商业餐饮带',
      '5 栋 2–3 层街区 · 雨棚 + 外摆 · 首层餐饮');
  }

  /* ══════════════════════════════════════════════════════════════════════
     7. 周边城市肌理：半透明白色体块，沿街廓有序排布（基座 / 退台 / 屋顶设备）
     ══════════════════════════════════════════════════════════════════════ */
  {
    const R = rnd(20261018);
    const massB = new GeomBatch();
    const roofIB = IB(new THREE.BoxGeometry(1, 1, 1), M.massingRoof);
    const eqIB = IB(new THREE.BoxGeometry(1, 1, 1), M.massing);
    const edgePts = [];
    let count = 0;

    /* 街廓占用标记（reserved：近主馆的设施街区） */
    const reserved = new Set();
    const key = (i, j) => i + ',' + j;
    const blockAt = (x, z) => [Math.floor(x / BLK), Math.floor(z / BLK)];
    // 训练场 / 训练中心（西侧）
    [SITE.training[0], SITE.training[1]].forEach((p) => {
      const [ci, cj] = blockAt(p.x, p.z);
      for (let i = -2; i <= 2; i++) for (let j = -3; j <= 3; j++) reserved.add(key(ci + i, cj + j));
    });
    // 公交/地铁接驳（东侧）
    {
      const [ci, cj] = blockAt(SITE.transit.x, SITE.transit.z);
      for (let i = -4; i <= 3; i++) for (let j = -2; j <= 2; j++) reserved.add(key(ci + i, cj + j));
    }
    // 停车楼（东南）
    {
      const [ci, cj] = blockAt(SITE.parking.x, SITE.parking.z);
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) reserved.add(key(ci + i, cj + j));
    }
    // 商业餐饮带 + 西侧社区（南）
    for (let i = -4; i <= 3; i++) for (let j = 6; j <= 9; j++) reserved.add(key(i, j));

    const quad = (P0, P1, P2, P3, col) => {
      const g = new THREE.BufferGeometry();
      const ps = [...P0, ...P1, ...P2, ...P3];
      g.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3));
      const n = new THREE.Vector3(...P1).sub(new THREE.Vector3(...P0))
        .cross(new THREE.Vector3(...P2).sub(new THREE.Vector3(...P0))).normalize();
      g.setAttribute('normal', new THREE.Float32BufferAttribute([...Array(4)].flatMap(() => [n.x, n.y, n.z]), 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      massB.add(g, null); g.dispose();
    };
    const tower = (cx, cz, w, d, h, baseH) => {
      const y0 = GY + baseH;
      const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
      const y1 = y0 + h;
      // 4 个立面
      quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
      quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
      quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
      quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
      // 屋面（半透明白，压低亮度）
      const roofM = new THREE.Matrix4().makeScale(w, 0.6, d);
      roofM.setPosition(cx, y1 - 0.3, cz);
      roofIB.push(roofM);
      // 轮廓线
      const E = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
      for (let k = 0; k < 4; k++) {
        const a = E[k], b = E[(k + 1) % 4];
        edgePts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
        edgePts.push(a[0], y1, a[2], b[0], y1, b[2]);
        edgePts.push(a[0], a[1], a[2], a[0], y1, a[2]);
      }
      // 屋顶设备（1-2 个）
      const n = 1 + Math.floor(R() * 2);
      for (let k = 0; k < n; k++) {
        const ew = w * (0.18 + R() * 0.2), ed = d * (0.18 + R() * 0.2), eh = 2 + R() * 4;
        eqIB.push(new THREE.Matrix4().makeScale(ew, eh, ed).setPosition(
          cx + (R() - 0.5) * (w - ew) * 0.7, y1 + eh / 2, cz + (R() - 0.5) * (d - ed) * 0.7));
      }
      // 退台：高层顶部收进一层
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
      if (rawS(cx, cz, 0) < 205) continue;                 // 广场铺装内不建
      const hgt = r < 330 ? 14 + R() * 20 : r < 430 ? 18 + R() * 34 : 20 + R() * 58;
      const w = 16 + R() * 12, d = 16 + R() * 12;
      if (R() < 0.08) {
        // 空地块：小公园（草坪 + 几棵树，交给景观）
        continue;
      }
      // 基座（1-2 层，略大）
      const bw = w + 3 + R() * 3, bd = d + 3 + R() * 3;
      tower(cx, cz, bw, bd, 3.6 + R() * 3.2, 0);
      // 塔身
      tower(cx, cz, w, d, hgt, 6.5);
    }

    const mg = massB.build();
    if (mg) {
      const massMesh = new THREE.Mesh(mg, M.massing);
      massMesh.name = 'city-massing';
      massMesh.renderOrder = 2;
      gCity.add(massMesh);
      ent('city', massMesh, gCity, '周边城市肌理',
        `${count} 座半透明白体块 · 沿 40m 街廓成街区 · 基座 + 退台 + 屋顶设备`);
    }
    roofIB.flush(gCity, 'city-roofs');
    eqIB.flush(gCity, 'city-rooftopequip');
    // 轮廓线
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.Float32BufferAttribute(edgePts, 3));
    const em = new THREE.LineSegments(eg, M.massingEdge);
    em.name = 'city-edges';
    gCity.add(em);
  }

  /* ══════════════════════════════════════════════════════════════════════
     8. 景观：乔木（≥400 棵，树干 + 树冠两级 InstancedMesh）/ 绿篱 / 草坡 /
        座椅 / 路灯（自发光面片 + 少量真实点光在 sky.js）
     ══════════════════════════════════════════════════════════════════════ */
  let treeCount = 0, benchCount = 0, lampCount = 0;
  {
    const R = rnd(31415);
    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.30, 1, 5);
    trunkGeo.translate(0, 0.5, 0);
    const crownGeo = new THREE.IcosahedronGeometry(1, 0);
    const trunkIB = IB(trunkGeo, M.trunk);
    const leafA = IB(crownGeo, M.leaf);
    const leafB = IB(crownGeo, M.leaf2);
    const treePos = [];
    const addTree = (x, z, h, cr) => {
      const y0 = GY + 0.02;
      trunkIB.push(new THREE.Matrix4().makeScale(1, h * 0.62, 1).setPosition(x, y0, z));
      const cr2 = cr * (0.86 + R() * 0.28);
      const m = new THREE.Matrix4().makeScale(cr, cr2, cr)
        .setPosition(x, y0 + h * 0.66 + cr2 * 0.4, z);
      (R() > 0.45 ? leafA : leafB).push(m);
      treePos.push([x, z]);
    };

    /* a) 4 条大道两侧的林荫树列（双排，间距 12m） */
    for (let k = 0; k < 4; k++) {
      const u = k / 4;
      for (const side of [-1, 1]) {
        for (let s = S_POD + 25; s < R_PLZ + 200; s += 12) {
          const su = 26 / (2 * Math.PI * (HALF_X + s));      // 26m 弧长 → u 偏移
          const p = P(u + side * su, s, 0);
          if (Math.abs(p.x) < 30 && Math.abs(p.z) < 30) continue;
          addTree(p.x, p.z, 11 + R() * 3, 3.4 + R() * 1.1);
        }
      }
    }
    /* b) 广场外缘的环形林荫（r≈300 一圈，间距 14m） */
    for (let i = 0; i < 44; i++) {
      const p = P(i / 44, R_PLZ + 12, 0);
      if (isOnAxis(p.x, p.z)) continue;
      addTree(p.x, p.z, 12 + R() * 3, 3.8);
    }
    /* c) 城市绿廊：街廓四角的行道树 */
    for (let i = -B_CITY; i < B_CITY; i++) for (let j = -B_CITY; j < B_CITY; j++) {
      const cx = (i + 0.5) * BLK, cz = (j + 0.5) * BLK;
      const r = Math.hypot(cx, cz);
      if (r < SITE.cityR0 - 40 || r > SITE.cityR1 + 40) continue;
      if (isOnAxis(cx, cz)) continue;
      if (rawS(cx, cz, 0) < 250) continue;
      // 街区四角的行道树
      const corners = [[-17, -17], [17, -17], [-17, 17], [17, 17]];
      for (const [dx, dz] of corners) {
        if (R() > 0.55) continue;
        const x = cx + dx, z = cz + dz;
        if (isOnAxis(x, z)) continue;
        addTree(x, z, 10 + R() * 4, 3.1 + R() * 1.0);
      }
    }
    /* d) 绿地公园（广场与城市之间的绿环，随机成组） */
    for (let i = 0; i < 900 && treePos.length < 720; i++) {
      const a = R() * TAU, rr = 330 + R() * 220;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (isOnAxis(x, z) || rawS(x, z, 0) < 260) continue;
      if (Math.hypot(x, z) < SITE.cityR0) continue;
      if (R() > 0.5) continue;
      addTree(x, z, 9 + R() * 6, 2.9 + R() * 1.6);
    }
    /* e) 训练场之间与西侧绿化带 */
    SITE.training.forEach((t) => {
      for (let i = 0; i < 16; i++) {
        const x = t.x + (R() - 0.5) * 150, z = t.z + (R() - 0.5) * 130;
        if (Math.abs(x - t.x) < 66 && Math.abs(z - t.z) < 48) continue;
        if (Math.abs(x) < 60) continue;
        addTree(x, z, 10 + R() * 4, 3.3);
      }
    });

    const trunkMesh = trunkIB.flush(gLandscape, 'landscape-trunks');
    const leafMeshA = leafA.flush(gLandscape, 'landscape-canopy-a');
    leafB.flush(gLandscape, 'landscape-canopy-b');
    treeCount = treePos.length;

    /* 绿篱：沿广场外缘与大道两侧（合批） */
    const hedgeB = new GeomBatch();
    for (let i = 0; i < 96; i++) {
      const u = i / 96;
      const p = P(u, R_PLZ + 4, 0);
      if (isOnAxis(p.x, p.z)) continue;
      const a = angOf(u);
      addBox(hedgeB, p.x, GY + 0.55, p.z, 10, 1.1, 1.3, -a + Math.PI / 2);
    }
    for (let k = 0; k < 4; k++) {
      const u = k / 4;
      for (const side of [-1, 1]) {
        for (let s = S_POD + 6; s < R_PLZ + 160; s += 10) {
          const su = 18 / (2 * Math.PI * (HALF_X + s));
          const p = P(u + side * su, s, 0);
          if (Math.abs(p.x) < 26 && Math.abs(p.z) < 26) continue;
          addBox(hedgeB, p.x, GY + 0.4, p.z, 9, 0.8, 1.1, -angOf(u + side * su) + Math.PI / 2);
        }
      }
    }
    const hm = flush(hedgeB, M.hedge, gLandscape, 'landscape-hedges');

    /* 草坡：主馆四周缓坡土丘（用球冠压扁） */
    const hillGeo = new THREE.SphereGeometry(1, 16, 10, 0, TAU, 0, Math.PI / 2);
    const hills = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.26;
      const rr = 340 + (i % 2) * 30;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (isOnAxis(x, z)) continue;
      const m = new THREE.Matrix4().makeScale(46 + (i % 3) * 12, 4.5 + (i % 2) * 2.2, 34 + (i % 2) * 10);
      m.setPosition(x, GY, z);
      hills.push(m);
    }
    const hillIB = IB(hillGeo, M.hill, { recv: true });
    hills.forEach((m) => hillIB.push(m));
    hillIB.flush(gLandscape, 'landscape-hills');

    /* 休憩座椅：广场基座台顶环列 + 大道两侧 */
    const benchGeo = new THREE.BoxGeometry(2.4, 0.16, 0.62);
    const benchLegGeo = new THREE.BoxGeometry(0.14, 0.42, 0.56);
    const bIB = IB(benchGeo, M.band);
    const blIB = IB(benchLegGeo, M.metalDark);
    let benchN = 0;
    for (let i = 0; i < 64; i++) {
      const u = i / 64;
      const p = P(u, S_POD - 8, GY + RISE);
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
          const p = P(u + side * su, s, 0);
          if (Math.abs(p.x) < 26 && Math.abs(p.z) < 26) continue;
          bIB.push(matOf(p.x, GY + 0.5, p.z, -angOf(u), 1));
          blIB.push(matOf(p.x, GY + 0.2, p.z, -angOf(u), 1));
          benchN++;
        }
      }
    }
    bIB.flush(gProps, 'props-benches');
    blIB.flush(gProps, 'props-benchlegs');
    benchCount = benchN;

    /* 路灯：杆 + 灯臂 + 自发光灯头（夜间点亮），12m 高 */
    const lampPoleGeo = new THREE.CylinderGeometry(0.13, 0.19, 12, 6);
    lampPoleGeo.translate(0, 6, 0);
    const lampHeadGeo = new THREE.BoxGeometry(2.2, 0.22, 0.8);
    const headIB = IB(lampHeadGeo, M.glowWarm);
    const poleIB = IB(lampPoleGeo, M.metalDark);
    let lampN = 0;
    // 广场外环灯
    for (let i = 0; i < 36; i++) {
      const p = P(i / 36 + 0.007, R_PLZ + 8, 0);
      if (isOnAxis(p.x, p.z)) continue;
      poleIB.push(matOf(p.x, GY, p.z, 0, 1));
      headIB.push(matOf(p.x, GY + 12.05, p.z, -angOf(i / 36) + Math.PI / 2, 1));
      lampN++;
    }
    // 大道灯（交错双排）
    for (let k = 0; k < 4; k++) {
      const u = k / 4;
      for (let s = S_POD + 20; s < R_PLZ + 180; s += 34) {
        for (const side of [-1, 1]) {
          const su = 22 / (2 * Math.PI * (HALF_X + s));
          const p = P(u + side * su, s, 0);
          if (Math.abs(p.x) < 26 && Math.abs(p.z) < 26) continue;
          poleIB.push(matOf(p.x, GY, p.z, 0, 1));
          headIB.push(matOf(p.x, GY + 12.05, p.z, -angOf(u + side * su), 1));
          lampN++;
        }
      }
    }
    // 训练场灯（低杆 8m）+ 停车楼周边
    SITE.training.forEach((t) => {
      for (let i = 0; i < 6; i++) {
        const x = t.x + (i % 3 - 1) * 64, z = t.z + (i < 3 ? -60 : 60);
        poleIB.push(matOf(x, GY, z, 0, 0.66));
        headIB.push(matOf(x, GY + 8.05, z, 0, 0.8));
        lampN++;
      }
    });
    poleIB.flush(gProps, 'props-lamppoles');
    headIB.flush(gProps, 'props-lampheads');
    lampCount = lampN;

    /* 更新：夜间自发光强度 / 城市体块透明度（材质颜色随昼夜变化） */
    const update = (dt, t) => {
      const night = (window.__app && window.__app.preset) ? window.__app.preset.night : 1;
      M.glowWarm.color.setRGB(1.0, lerp(0.42, 0.85, night), lerp(0.24, 0.62, night));
      M.glowCool.color.setRGB(lerp(0.78, 0.75, night), lerp(0.90, 0.91, night), 0.96);
      M.massing.opacity = lerp(0.24, 0.17, night);
      M.massingRoof.opacity = lerp(0.16, 0.11, night);
    };

    ent('trees', trunkMesh, gLandscape, '乔木景观',
      `${treeCount} 棵乔木（树干 + 树冠两级实例化）· 成排列植`);
    if (hm) ent('hedges', hm, gLandscape, '绿篱', '广场外缘 + 大道两侧修剪绿篱');
    ent('benches', gProps.children.find((c) => c.name === 'props-benches'), gProps, '休憩座椅', `${benchCount} 组`);
    ent('lamps', gProps.children.find((c) => c.name === 'props-lampheads'), gProps, '路灯',
      `${lampCount} 盏灯杆（夜间自发光灯头）`);

    return { root, groups, update, ents };
  }
}
