/* ═══════════════════════════════════════════════════════════════════════
   badges.js — 5 枚可收集建筑徽章（SPEC 3.5 / 验收 16）
   位置：球迷广场 (0,2,190) / 门厅 (0,4,118) / 二层环廊 (0,28,84)
         包厢层 (0,32,74) / 屋盖下弦 (0,44,66)
   表现：发光八面体 + 光晕 sprite + 上下浮动；玩家 3m 内自动收集
   · v4：收集状态写入 window.__caps（存档能力层），刷新后已收集的徽章**不会复活**
     —— v3 只存了 id，taken 没存，导致刷新后能反复刷分（见 docs/PLAYBOOK-v4.md A4）
   对外：window.__badges = { list, nearest, update, group, restore }
   全部依赖 window.__app 防御性读取，缺项即降级，不抛错。
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { GEO, SEGS, L1, L2 } from '../world/sections.js';
import { pt } from '../world/rings.js';
import * as caps from './caps.js';

/* 环向取点：u=0 → +z 北门主轴；u=0.5 → -z 南侧 */
const P = (u, s, y) => pt(Math.round(u * SEGS) % SEGS, s, y);
const PICK_R = 4.5;

const DEFS = [
  {
    id: 'b1', name: '广场徽章', zone: '球迷广场', desc: '主轴尽端 · 6 万 m² 广场',
    pos: P(0, GEO.outerS + 16, GEO.groundY + 1.5).toArray(), color: 0xffd27a,
  },
  {
    id: 'b2', name: '门厅徽章', zone: '入口大厅', desc: '24m 券洞 · 检票门厅',
    pos: P(0, GEO.outerS - 3, 1.6).toArray(), color: 0x9fe6ff,
  },
  {
    id: 'b3', name: '一层环廊徽章', zone: '一层环廊', desc: '净宽 13m · 南侧环廊',
    pos: P(0.5, (L1.cS0 + L1.cS1) / 2, L1.cY + 1.5).toArray(), color: 0xffb0c4,
  },
  {
    id: 'b4', name: '二层环廊徽章', zone: '二层环廊', desc: '净宽 11m · 全场俯瞰',
    pos: P(0, (L2.cS0 + L2.cS1) / 2, L2.cY + 1.5).toArray(), color: 0xd7b6ff,
  },
  {
    id: 'b5', name: '冠军徽章', zone: '场地中圈', desc: '105×68m 天然草 · 中圈',
    pos: [0, GEO.groundY + 1.8, 0], color: 0x8ff0c8,
  },
];

/* 程序化光晕贴图 */
function haloTexture() {
  try {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const rg = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    rg.addColorStop(0, 'rgba(255,255,255,0.95)');
    rg.addColorStop(0.22, 'rgba(255,255,255,0.40)');
    rg.addColorStop(0.58, 'rgba(255,255,255,0.10)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  } catch (e) { return null; }
}

export function createBadges(app) {
  const A = window.__app || app || {};
  const stage = A.stage || {};
  const scene = stage.scene;
  if (!scene) return null;
  const container = A.arena?.root || scene;

  const group = new THREE.Group();
  group.name = 'GAME_BADGES';
  container.add(group);

  /* 关掉旧 UI 里同名图层的徽章，避免两套重复 */
  try {
    const legacy = scene.getObjectByName('BADGES');
    if (legacy && legacy !== group) legacy.visible = false;
  } catch (e) { /* 忽略 */ }

  const halo = haloTexture();
  const geo = (() => {
    const g = new THREE.OctahedronGeometry(0.62, 0);
    g.scale(1, 1, 1);
    return g;
  })();
  const ringGeo = new THREE.TorusGeometry(1.05, 0.035, 6, 40);
  const list = [];

  DEFS.forEach((d) => {
    const node = new THREE.Group();
    node.name = 'badge-' + d.id;
    node.position.set(d.pos[0], d.pos[1], d.pos[2]);

    const core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: d.color, transparent: true, opacity: 0.95, toneMapped: false,
    }));
    node.add(core);

    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: d.color, transparent: true, opacity: 0.55, toneMapped: false,
    }));
    ring.rotation.x = Math.PI / 2;
    node.add(ring);

    if (halo) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: halo, color: d.color, transparent: true, opacity: 0.75,
        depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
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
    const cam = stage.camera;
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
      if (d < bd) { bd = d; best = { ...b, dist: bd }; }
    }
    nearestCache = best;
    return best;
  }

  function toastAll() {
    try {
      const n = list.filter((b) => b.taken).length;
      const row = document.getElementById('badgeRow');
      if (row) {
        Array.from(row.children).forEach((el, i) => el.classList.toggle('on', i < n));
        row.setAttribute('aria-label', `建筑徽章 ${n}/${list.length}`);
      }
    } catch (e) { /* DOM 缺项忽略 */ }
  }

  function collect(b) {
    if (b.taken) return;
    b.taken = true;
    b.obj.visible = false;
    try { caps.add('badgesTaken', b.id); } catch (e) { /* 忽略 */ }
    try {
      window.__game?.awardBadge?.(b.id);
      A.ui?.toast?.('收集到建筑徽章', `${b.name} · ${b.desc}`, 'gold');
      window.__audio?.sfx?.('badge');
    } catch (e) { /* 忽略 */ }
    toastAll();
  }

  /* 从存档回灌：已收集的徽章必须保持隐藏（否则刷新即可无限刷分） */
  function restore() {
    let n = 0;
    try {
      const got = new Set(caps.hasAll('badgesTaken'));
      for (const b of list) {
        if (!got.has(b.id)) continue;
        b.taken = true;
        b.obj.visible = false;
        n++;
      }
    } catch (e) { /* 忽略 */ }
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
    for (const b of list) { b.taken = false; b.obj.visible = true; }
    try {
      for (const b of list) {
        const arr = caps.get('badgesTaken');
        const i = Array.isArray(arr) ? arr.indexOf(b.id) : -1;
        if (i >= 0) arr.splice(i, 1);
      }
      caps.save();
    } catch (e) { /* 忽略 */ }
    toastAll();
  }
  /* 重置进度（window.__game.reset → game:reset）时，世界里的徽章必须回来 */
  try { document.addEventListener('game:reset', () => { for (const b of list) { b.taken = false; b.obj.visible = true; } toastAll(); }); } catch (e) { /* 忽略 */ }

  const api = { list, nearest: nearest(), update, reset, restore, group };
  /* nearest 用 getter 形式，随时反映当前玩家位置 */
  Object.defineProperty(api, 'nearest', { get: nearest, configurable: true });
  window.__badges = api;
  restore();
  return api;
}

export default createBadges;
