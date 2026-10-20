/* ═══════════════════════════════════════════════════════════════════════
   ui.js — HUD / 前端界面（游戏级）
   · 三档响应式：≥1280 三栏 ｜ 768–1280 图标轨道 + 抽屉 ｜ <768 移动端
   · 面板：任务 / 容量仪表 / 疏散 / 表达与相机 / 构件图层 / 建造时间轴
   · 新增：小地图 + 罗盘、构件信息卡、照片模式、帮助、设置、Toast/升级动画
   · 性能：HUD 文本 100ms 节流 + 只写变化项；小地图 15fps
   · 无障碍：aria-label / role / tabindex / focus-visible / aria-live /
             prefers-reduced-motion
   · 数据源优先读 window.__evac / window.__build / window.__walk /
             window.__badges / window.__game，缺失时本地演示
   ═══════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { fmt, clamp, lerp, PRESETS, preset, lerpPreset, easeInOut } from './lib/core.js';
import { MODEL } from './lib/seats.js';
import { ZONES, GEO, TIERS } from './lib/sections.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const now = () => performance.now();
const store = {
  get(k, d) { try { const v = localStorage.getItem('tidal.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('tidal.' + k, JSON.stringify(v)); } catch (e) { /* 隐私模式忽略 */ } },
};

/* ══════════════ 机位表（13 键：透视/俯视/正立/侧立/剖面/场内/其余） ══════════════ */
const SHOTS = [
  { id: 'hero', name: '鸟瞰', key: '1', target: [0, 14, 0], dist: 520, az: -1.32, el: 0.40 },
  { id: 'north', name: '北向', key: '2', target: [0, 20, 0], dist: 420, az: Math.PI / 2, el: 0.20 },
  { id: 'plaza', name: '广场', key: '3', target: [0, 8, 120], dist: 190, az: 1.62, el: 0.13 },
  { id: 'inside', name: '场内', key: '4', target: [0, 4, 0], dist: 128, az: 1.1, el: 0.10 },
  { id: 'roof', name: '屋盖', key: '5', target: [0, 48, 0], dist: 300, az: 0.42, el: 0.30 },
  { id: 'corner', name: '角部', key: '6', target: [76, 26, 76], dist: 210, az: 0.82, el: 0.26 },
  { id: 'detail', name: '细部', key: '7', target: [42, 12, 30], dist: 52, az: 0.90, el: 0.14 },
];
const INTRO = { target: new THREE.Vector3(0, 20, 6), dist: 430, az: -1.16, el: 0.30 };

/* ══════════════ 构件图层（映射到 arena.groups） ══════════════ */
const LAYERS = [
  { id: 'roof', name: '悬挑屋盖', color: '#b9c2cc' },
  { id: 'structure', name: '结构骨架', color: '#8e99a6' },
  { id: 'bowl', name: '看台核心体', color: '#c9a15f' },
  { id: 'seats', name: '座椅阵列', color: '#d8b478' },
  { id: 'concourse', name: '看台环廊', color: '#8fb6c4' },
  { id: 'facade', name: '外立面', color: '#e0d8c8' },
  { id: 'interior', name: '室内空间', color: '#a68fc4' },
  { id: 'pitch', name: '比赛场地', color: '#5fbf8a' },
  { id: 'glow', name: '灯带光效', color: '#6fd3e0' },
  { id: 'site', name: '周边配套', color: '#7d8b78' },
];

/* ══════════════ 任务（6 项，对应 SPEC 16） ══════════════ */
const QUESTS = [
  { id: 'q1', ico: '探索', name: '抵达球迷广场南入口', score: 20, desc: '进入漫游后走向南侧广场主轴' },
  { id: 'q2', ico: '探索', name: '穿过入口门厅进入场馆', score: 20, desc: '经主入口券洞进入门厅' },
  { id: 'q3', ico: '容量', name: '阅读三次看台容量分布', score: 30, desc: '点击容量仪表的层条与分区格' },
  { id: 'q4', ico: '疏散', name: '完成一次 8 万人疏散演练', score: 30, desc: '疏散面板点击开始演练' },
  { id: 'q5', ico: '建造', name: '拖动建造时间轴走完 5 阶段', score: 30, desc: '建造面板滑杆由 0 推到 100%' },
  { id: 'q6', ico: '摄影', name: '在照片模式保存一张照片', score: 40, desc: 'C 进入照片模式后保存 PNG' },
];

/* ══════════════ 建造 5 阶段（时间轴 0–100） ══════════════ */
const BUILD = [
  { at: 0, name: '01 基础与场地', desc: '场地平整、环形挡墙与混凝土基座浇筑' },
  { at: 20, name: '02 看台与环廊', desc: '三层预制看台阶梯与环形楼板逐层吊装' },
  { at: 45, name: '03 屋盖与结构', desc: '八根潮柱落位，径向桁架悬挑合拢' },
  { at: 70, name: '04 立面与室内', desc: '潮线幕墙、灯带与室内大厅、包厢封闭' },
  { at: 92, name: '05 竣工', desc: '场地草坪、LED 广告板与灯桥调试完毕' },
];

export function buildUI(ctx) {
  const { arena, sky, fx, orbit, walk, draft, stage, modes, env } = ctx;
  const reduceSys = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ══════════ 状态 ══════════ */
  const S = {
    view: 'persp', mat: 'material', env: 'night',
    exploded: 0, section: false, secPos: 0,
    walk: false, tour: false, story: false, photo: false, photoHide: false,
    score: 0, level: 1, xpMax: 120,
    quests: QUESTS.map((q) => ({ ...q, done: false })),
    badgesFound: 0, badgesTotal: 5,
    flow: { on: false, paused: false, mode: 'heat', t: 0, out: 0, done: false, score: 0 },
    build: { v: 100, playing: false, phase: 4 },
    layer: {},
    solo: null,
    mobile: false, drawer: null, brief: false,
    sound: store.get('sound', false),
    reduceMotion: store.get('reduceMotion', reduceSys),
    quality: 'high', autoQuality: store.get('autoQuality', true),
    hover: null,
    sel: null,
    mmT: 0, hudT: 0, hud2T: 0,
    capShown: 0,
    gq: { tier: 0, zone: 0 },
    qualityChecks: 0,
  };
  /* 默认分层全部可见 */
  LAYERS.forEach((L) => (S.layer[L.id] = { on: true, solo: false }));
  if (S.reduceMotion) document.body.classList.add('reduce-motion');

  /* ══════════ 小工具 ══════════════ */
  function setText(el, v) {
    if (!el) return false;
    const s = String(v);
    if (el._v === s) return false;
    el._v = s; el.textContent = s;
    return true;
  }
  function setHTML(el, v) {
    if (!el) return false;
    if (el._h === v) return false;
    el._h = v; el.innerHTML = v;
    return true;
  }
  function setAttr(el, k, v) {
    if (!el) return;
    const key = '_a_' + k;
    if (el[key] === v) return;
    el[key] = v; el.setAttribute(k, v);
  }
  function setOn(el, on, cls = 'on') {
    if (!el) return;
    el.classList.toggle(cls, !!on);
    if (el.hasAttribute('aria-pressed')) setAttr(el, 'aria-pressed', on ? 'true' : 'false');
  }
  const liveEl = $('#srLive');
  let liveLast = '';
  function say(msg) {
    if (!liveEl || !msg || msg === liveLast) return;
    liveLast = msg;
    liveEl.textContent = msg;
  }
  const motionOK = () => !S.reduceMotion && !document.body.classList.contains('reduce-motion');

  /* ══════════ 游戏层：window.__game 优先 ══════════════ */
  function game() { const g = window.__game; return (g && Array.isArray(g.missions)) ? g : null; }
  /* 等级解锁查询（游戏层不可用时不做限制） */
  function unlocked(key) {
    const g = window.__game;
    if (!g) return true;
    if (typeof g.unlocked === 'function') { try { return !!g.unlocked(key); } catch (e) { return true; } }
    return true;
  }

  /* ══════════ 徽章 3D（降级集：游戏层未就绪时自己顶上） ══════════
     正常运行时 src/game/badges.js 是徽章唯一真源，本地这组会被隐藏；
     HUD / 小地图 / 指引箭头统一从 badgeSource() 取数，避免两套打架。 */
  const BADGE_DEFS = [
    { id: 'b1', name: '南入口徽章', pos: [0, 2.2, GEO.outerS + 22], desc: '球迷广场主轴' },
    { id: 'b2', name: '一层环廊徽章', pos: [0, 14.4, GEO.outerS - 46], desc: '一层环廊' },
    { id: 'b3', name: '场地中圈徽章', pos: [0, 1.9, 0], desc: '场地中圈' },
    { id: 'b4', name: '包厢层徽章', pos: [0, 26.2, 62], desc: '贵宾包厢层' },
    { id: 'b5', name: '屋盖桁架徽章', pos: [0, 60, -40], desc: '屋盖结构' },
  ];
  const badgeGroup = new THREE.Group();
  badgeGroup.name = 'BADGES';
  stage.scene.add(badgeGroup);
  const badgeGeo = new THREE.OctahedronGeometry(0.55, 0);
  const badgeMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.95, toneMapped: false });
  const ringGeo = new THREE.TorusGeometry(1.0, 0.045, 6, 40);
  const badgeMap = new Map();
  BADGE_DEFS.forEach((b) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(badgeGeo, badgeMat));
    const ring = new THREE.Mesh(ringGeo, badgeMat);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    g.position.set(...b.pos);
    g.userData = b;
    badgeGroup.add(g);
    badgeMap.set(b.id, { def: b, obj: g, taken: false });
  });
  /* 徽章数据源：游戏层优先（唯一真源），否则本地降级集 */
  function badgeSource() {
    const ext = window.__badges;
    if (ext && Array.isArray(ext.list) && ext.list.length) {
      return ext.list.map((b) => ({
        id: b.id, name: b.name, desc: b.desc || '', zone: b.zone || '',
        obj: b.obj || null,
        pos: (b.obj && b.obj.position) ? b.obj.position.toArray() : (b.pos || [0, 0, 0]),
        taken: !!b.taken,
      }));
    }
    return Array.from(badgeMap.values()).map((b) => ({
      id: b.def.id, name: b.def.name, desc: b.def.desc || '', zone: '',
      obj: b.obj, pos: b.obj.position.toArray(), taken: b.taken,
    }));
  }
  /* 游戏层是否已接管徽章（接管后本地不再重复收集 / 计分） */
  const gameOwnsBadges = () => {
    const ext = window.__badges;
    return !!(ext && Array.isArray(ext.list) && ext.list.length);
  };

  /* ══════════ ① 任务面板 ══════════════ */
  const questList = $('#questList');
  const badgeRow = $('#badgeRow');
  function renderQuests(items) {
    questList.innerHTML = '';
    items.forEach((q, i) => {
      const d = document.createElement('div');
      const active = !q.done && items.findIndex((x) => !x.done) === i;
      d.className = 'q' + (q.done ? ' done' : active ? ' active' : '');
      d.setAttribute('role', q.done ? 'listitem' : 'listitem');
      d.setAttribute('aria-label', `${q.done ? '已完成' : '未完成'}：${q.name}`);
      d.innerHTML = `<i class="bx" aria-hidden="true">✓</i><span class="tx">${q.name}</span><b class="rl">+${q.reward ?? q.score}</b>`;
      questList.appendChild(d);
    });
  }
  syncQuestsFromGame(true);

  function syncQuestsFromGame(force) {
    const g = game();
    if (g) {
      S.quests = g.missions.map((m) => ({
        id: m.id, name: m.name, desc: m.desc, score: m.reward || 0, reward: m.reward, done: !!m.done,
      }));
      S.score = g.xp || 0;
      S.level = g.level || 1;
    }
    renderQuests(S.quests);
    updateQuestStats();
    if (badgeRow && !badgeRow.children.length) {
      for (let i = 0; i < 5; i++) badgeRow.appendChild(document.createElement('i'));
    }
    syncBadgeRow();
  }

  function updateQuestStats() {
    const done = S.quests.filter((q) => q.done).length;
    const total = S.quests.length || 6;
    const pct = total ? done / total : 0;
    setText($('#questPct'), `${done}/${total}`);
    $('#ringArc') && $('#ringArc').style.setProperty('stroke-dashoffset', String(157.1 * (1 - pct)));
    setHTML($('#ringNum'), `${Math.round(pct * 100)}<em>%</em>`);
    setHTML($('#qDone'), `${done}<em>/${total} 完成</em>`);
    const next = S.quests.find((q) => !q.done);
    setText($('#qNext'), next ? '下一目标：' + next.name : '全部任务已完成 ✦');
  }

  /* 等级/积分以游戏层为真源：徽章、洞察、任务、演练等任何来源的加成，
     都必须立刻反映到 HUD 的等级环与积分条上（否则成长循环没有反馈）。 */
  function syncXPFromGame() {
    const g = game();
    if (!g) return;
    setXP(g.xp || 0, g.level || 1);
  }

  function setXP(score, level) {
    S.score = score; S.level = level;
    const lv = Math.max(1, level);
    const xpMax = 120;
    const inLv = clamp(score - (lv - 1) * 120, 0, 120);
    setText($('#lvNum'), lv);
    setHTML($('#xpVal'), String(Math.round(inLv)));
    setText($('#xpMax'), String(xpMax));
    setText($('#xpPct'), Math.round(inLv / xpMax * 100) + '%');
    const fill = $('#xpFill');
    if (fill) fill.style.width = (inLv / xpMax * 100) + '%';
  }

  function syncBadgeRow() {
    if (!badgeRow) return;
    const taken = badgeSource().filter((b) => b.taken).length;
    S.badgesFound = taken;
    Array.from(badgeRow.children).forEach((el, i) => el.classList.toggle('on', i < S.badgesFound));
    badgeRow.setAttribute('aria-label', `建筑徽章 ${S.badgesFound}/${S.badgesTotal}`);
  }

  /* ══════════ 建筑洞察图鉴（Lv.5） ══════════ */
  const codexList = $('#codexList');
  const codexBox = $('#codexBox');
  const codexCount = $('#cxCount');
  const codexLock = $('#cxLock');
  let codexBuilt = false;
  function syncCodex() {
    const ins = window.__insights;
    if (!ins || !codexList) return;
    const open = unlocked('codex');
    if (codexBox) codexBox.classList.toggle('locked', !open);
    if (!codexBuilt) {
      codexList.innerHTML = '';
      ins.list.forEach((d, i) => {
        const row = document.createElement('div');
        row.className = 'cxi';
        row.dataset.id = d.id;
        row.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span>
          <span class="b"><span class="t">${d.name}<em>${d.zone}</em></span>
          <span class="f">${d.fact}</span></span>`;
        codexList.appendChild(row);
      });
      codexBuilt = true;
    }
    ins.list.forEach((d, i) => {
      const row = codexList.children[i];
      if (!row) return;
      /* 解锁后：已收录的条目展开设计讲解；未解锁：只标记"已找到"，讲解留白 */
      row.classList.toggle('got', open && !!d.got);
      row.classList.toggle('found', !open && !!d.got);
    });
    if (codexCount) setText(codexCount, `${ins.found}/${ins.total}`);
    if (codexLock) {
      const g = game();
      setText(codexLock, open ? ''
        : `达到 Lv.5 解锁图鉴讲解 · 当前 Lv.${g?.level ?? 1} · 已收录 ${ins.found}/${ins.total}（每处 +16 积分）`);
    }
  }
  document.addEventListener('insight:found', () => syncCodex());
  document.addEventListener('game:changed', () => syncCodex());

  function addScore(n, why) {
    const g = game();
    if (g && g.addXP) {
      g.addXP(n);
      const xp = g.xp || 0;
      if ((g.level || 1) > S.level) showLevelUp(g.level);
      setXP(xp, g.level || 1);
      return;
    }
    S.score += n;
    const lv = 1 + Math.floor(S.score / 120);
    if (lv > S.level) { S.level = lv; showLevelUp(lv, why); }
    setXP(S.score, S.level);
  }
  function completeQuest(id) {
    const g = game();
    if (g && g.complete) { g.complete(id); return; }
    const q = S.quests.find((x) => x.id === id);
    if (!q || q.done) return;
    q.done = true;
    renderQuests(S.quests);
    updateQuestStats();
    toast('任务完成', q.name + ` · +${q.score} 积分`, 'gold');
    say('任务完成：' + q.name);
    addScore(q.score, '完成探索任务');
  }

  function showLevelUp(lv, why) {
    const el = $('#levelUp');
    if (!el) return;
    setText($('#luLv'), lv);
    el.classList.add('on');
    toast('等级提升', `已升至 Lv.${lv} · ${why || '探索者'}`, 'gold');
    say(`等级提升到 ${lv} 级`);
    if (fx && fx.flash && motionOK()) fx.flash('#f0d9ae', 0.25);
    setTimeout(() => el.classList.remove('on'), 2200);
  }

  /* ══════════ toast（DOM + aria-live） ══════════════ */
  function toast(title, body, kind = 'gold') {
    const wrap = $('#toastWrap');
    if (!wrap) return;
    const el = document.createElement('div');
    const k = kind === '·' ? 'plain' : (kind === '✦' ? 'gold' : kind || 'gold');
    el.className = 'toast ' + (k === 'plain' || k === 'gold' || k === 'green' || k === 'red' ? k : 'gold');
    el.setAttribute('role', 'status');
    const icon = k === 'plain' ? '▸' : k === 'green' ? '✦' : '✦';
    el.innerHTML = `<span class="ti" aria-hidden="true">${icon}</span>
      <span class="tt"><b></b>${body ? '<span></span>' : ''}</span>`;
    el.querySelector('b').textContent = title;
    if (body) el.querySelector('.tt span').textContent = body;
    wrap.appendChild(el);
    while (wrap.children.length > 3) wrap.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 420); }, 3200);
  }

  /* ══════════ ② 容量仪表 ══════════════ */
  const capTotal = MODEL.total;
  setText($('#roSeat'), fmt(capTotal));
  $('#roSeat') && $('#roSeat').classList.add('hot');
  setText($('#roTier'), MODEL.tiers.length);
  setText($('#roZone'), MODEL.zones.length);
  setText($('#roRow'), MODEL.rows);
  setText($('#capNum'), fmt(capTotal));
  setText($('#capSub'), `${MODEL.tiers.length} 层看台 · ${MODEL.rows} 排 · ${ZONES} 区/层`);
  setText($('#abRows'), `三层看台 ${MODEL.rows} 排 + 3 层环廊 + 包厢层，屋盖径向桁架悬挑`);
  setText($('#abSeat'), `观众席 ${fmt(capTotal)} 座，逐排逐区精确统计（MODEL 同源）`);
  setText($('#flLeft'), fmt(capTotal));
  setText($('#cxWheel'), 120);
  setText($('#cxVip'), 768);
  setText($('#cxPress'), 320);

  const tierBars = $('#tierBars');
  const maxTier = Math.max(...MODEL.tiers.map((t) => t.total));
  MODEL.tiers.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tb';
    b.setAttribute('aria-label', `${t.name} 座位数 ${fmt(t.total)}，点击定位`);
    b.innerHTML = `<span class="nm">${t.name}</span>
      <span class="bar"><i style="background:linear-gradient(90deg,${t.color},${t.color}88)"></i></span>
      <span class="vl">${fmt(t.total)}</span>`;
    tierBars.appendChild(b);
    requestAnimationFrame(() => { b.querySelector('i').style.width = (t.total / maxTier * 100) + '%'; });
    b.addEventListener('click', () => focusTier(t));
  });

  const czGrid = $('#czGrid');
  const czCells = [];
  MODEL.tiers.forEach((t) => {
    t.zones.forEach((z) => {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'cz';
      const k = z.seats / 1400;
      c.style.background = `rgba(232,192,122,${(0.10 + clamp(k, 0, 1) * 0.62).toFixed(3)})`;
      c.setAttribute('aria-label', `${z.name}：${fmt(z.seats)} 座`);
      c.title = `${z.name}：${fmt(z.seats)} 座`;
      c.addEventListener('click', () => {
        czCells.forEach((x) => x.classList.remove('on'));
        c.classList.add('on');
        focusZone(z);
        readCapacity();
      });
      czGrid.appendChild(c);
      czCells.push(c);
    });
  });

  /* 大数字滚动 */
  function rollCap(from, to, dur = 900) {
    const el = $('#capNum');
    if (!el) return;
    if (!motionOK() || !S.capAnim) { setText(el, fmt(to)); return; }
    const t0 = now();
    S.capAnim = false;
    const step = () => {
      const k = clamp((now() - t0) / dur, 0, 1);
      setText(el, fmt(Math.round(lerp(from, to, easeInOut(k)))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function focusTier(t) {
    stopWalk();
    orbit.set({ target: new THREE.Vector3(0, t.y0 + (t.endY - t.y0) * 0.5, 0), dist: 300 + (t.s0 + t.endS) / 2 * 1.2, el: 0.34 });
    goShot(null);
    toast(t.name, `${fmt(t.total)} 座 · ${t.rows.length} 排 × ${ZONES} 区`, 'plain');
    readCapacity();
  }
  function focusZone(z) {
    stopWalk();
    const a = (z.u0 + z.u1) / 2 * Math.PI * 2 - Math.PI / 2;
    const t = MODEL.tiers.find((x) => x.id === z.tier);
    const rr = 34 + (t.s0 + t.endS) / 2;
    goShot(null);
    orbit.set({
      target: new THREE.Vector3(Math.cos(a) * rr * 0.55, (t.y0 + t.endY) / 2, Math.sin(a) * rr * 0.55),
      dist: 200, az: a + Math.PI, el: 0.30,
    });
    toast(z.name, `${fmt(z.seats)} 座 · 每排 ${Math.floor(z.seats / Math.max(1, t.rows.length))} 席`, 'plain');
    say(`${z.name} ${fmt(z.seats)} 座`);
  }

  /* 容量阅读计数（任务 q3） */
  function readCapacity() {
    const key = S.gq.tier + ':' + S.gq.zone;
    if (S._lastCap === key) return;
    S._lastCap = key;
    S._capReads = (S._capReads || 0) + 1;
    if (S._capReads >= 3) completeQuest('q3');
  }

  /* 逐排表 */
  const rowTable = $('#rowTable');
  const btnRows = $('#btnRows');
  btnRows.addEventListener('click', () => {
    const open = rowTable.hidden;
    rowTable.hidden = !open;
    setAttr(btnRows, 'aria-expanded', open ? 'true' : 'false');
    setText(btnRows, open ? '收起逐排表 ▴' : '展开逐排表 ▾');
    if (open && !rowTable._built) {
      rowTable._built = true;
      let html = '<div class="rt-scroll"><table class="rt-table"><thead><tr><th>排号</th><th>每区</th><th>该排</th><th>前缘 s</th><th>标高</th></tr></thead><tbody>';
      MODEL.tiers.forEach((t) => {
        html += `<tr class="tierhead"><td colspan="5">${t.name} · ${t.rows.length} 排 · ${fmt(t.total)} 座</td></tr>`;
        t.rows.forEach((r) => {
          html += `<tr><td>R${String(r.k + 1).padStart(2, '0')}</td><td>${r.perZone}</td>`
            + `<td>${fmt(r.n)}</td><td>${r.sFront.toFixed(2)}</td>`
            + `<td${r.aisle ? ' class="ai"' : ''}>${r.y.toFixed(2)}${r.aisle ? ' ·走道' : ''}</td></tr>`;
        });
      });
      html += '</tbody></table></div>';
      rowTable.innerHTML = html;
    }
  });

  /* ══════════ ③ 疏散（数据源 window.__evac） ══════════════ */
  const flowBtn = $('#btnFlow');
  const flowPause = $('#btnFlowPause');
  const flowReset = $('#btnFlowReset');
  const heat = new THREE.Group();
  heat.name = 'FLOW';
  heat.visible = false;
  stage.scene.add(heat);
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
        pos.push(Math.cos(a) * (rr + 1), row.y + 1.0, Math.sin(a) * (rr + 1));
        col.push(1, 0.45, 0.28);
      }
      for (let i = 0; i < N; i++) for (let r = 0; r < rows - 1; r++) {
        const a0 = i * rows + r, a1 = (i + 1) * rows + r;
        idx.push(a0, a1, a0 + 1, a0 + 1, a1, a1 + 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      const m = new THREE.MeshBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0,
        side: THREE.DoubleSide, depthWrite: false, toneMapped: false,
      });
      const mesh = new THREE.Mesh(g, m);
      heat.add(mesh);
      heatMeshes.push(mesh);
    });
  }

  function evacApi() { const e = window.__evac; return (e && typeof e === 'object') ? e : null; }

  function flowState() {
    const e = evacApi();
    if (e) {
      return {
        out: e.evacuated || 0,
        total: e.total || capTotal,
        t: e.elapsed || 0,
        run: !!e.running,
        paused: !!e.paused,
        done: !!e.done || (e.evacuated >= (e.total || capTotal) && !!e.elapsed),
        score: e.score,
      };
    }
    return {
      out: S.flow.out, total: capTotal, t: S.flow.t,
      run: S.flow.on, paused: S.flow.paused, done: S.flow.done, score: S.flow.score,
    };
  }
  function startFlow() {
    const e = evacApi();
    if (e && typeof e.start === 'function') { e.start(); toast('疏散演练开始', '点击出口调度 · 12 组人力 · 150 秒时限', 'plain'); return; }
    if (e) { e.running = true; e.paused = false; return; }
    if (S.flow.done || !S.flow.t) { S.flow.t = 0; S.flow.out = 0; S.flow.done = false; S.flow.score = 0; }
    S.flow.on = true; S.flow.paused = false;
    buildHeat();
    setFlowMode();
    toast('疏散演练开始', '按 60 分区 / 12 个出口模拟人流', 'plain');
    say('疏散演练开始');
  }
  function pauseFlow() {
    const e = evacApi();
    if (e && typeof e.pause === 'function') { e.pause(); return; }
    if (e) { e.paused = !e.paused; return; }
    S.flow.paused = !S.flow.paused;
    setText($('#flowPct'), S.flow.paused ? '已暂停' : '进行中');
  }
  function resetFlow() {
    const e = evacApi();
    if (e && typeof e.reset === 'function') { e.reset(); return; }
    if (e) { e.running = false; e.elapsed = 0; e.evacuated = 0; e.done = false; return; }
    S.flow.on = false; S.flow.paused = false; S.flow.t = 0; S.flow.out = 0; S.flow.done = false; S.flow.score = 0;
    heatMeshes.forEach((m) => (m.material.opacity = 0));
  }
  function setFlowMode() {
    const heatOn = S.flow.mode === 'heat';
    setOn($('#btnFlowMode'), heatOn);
    heat.visible = heatOn;
    if (heatOn && S.flow.t > 0) buildHeat();
  }

  /* ══════════ 潮汐调度台（出口 / 人力 / 广播） ══════════ */
  const exitGrid = $('#exitGrid');
  const quadRow = $('#quadRow');
  const teamFill = $('#teamFill');
  const teamTxt = $('#teamTxt');
  const bcLeft = $('#bcLeft');
  const flowGrade = $('#flowGrade');
  const flowFin = $('#flowFin');
  const X_SHORT = { P1: '北门', P2: '东门', P3: '南门', P4: '西门' };
  const xBtns = new Map();
  const quadBars = [];

  function buildDispatch(exits) {
    if (!exitGrid || !exits || !exits.length) return;
    if (xBtns.size === exits.length) return;
    exitGrid.innerHTML = '';
    xBtns.clear();
    exits.forEach((e) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'xbtn' + (e.kind === 'main' ? ' main' : '');
      b.dataset.exit = e.id;
      const label = X_SHORT[e.id] || ('次门 ' + e.id.replace('S', ''));
      b.innerHTML = `<i class="xd" aria-hidden="true"></i><span class="xn">${label}</span><span class="xs">${e.cost} 组</span>`;
      b.title = `${e.name} · 需 ${e.cost} 组人力 · 通过能力 ${e.cap} 人/秒`;
      b.setAttribute('aria-label', b.title);
      b.addEventListener('click', () => {
        const api = evacApi();
        if (api && api.toggleExit) api.toggleExit(e.id);
        else toast('调度台未就绪', '游戏层加载完成后可用', 'plain');
      });
      exitGrid.appendChild(b);
      xBtns.set(e.id, b);
    });
    if (quadRow && !quadBars.length) {
      quadRow.innerHTML = '';
      ['北', '东', '南', '西'].forEach((n) => {
        const d = document.createElement('div');
        d.className = 'quad';
        d.innerHTML = `<span class="ql">${n}</span><span class="qb"><i></i></span>`;
        quadRow.appendChild(d);
        quadBars.push(d.querySelector('i'));
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
      b.classList.toggle('on', x.open && !swapping);
      b.classList.toggle('hot', x.open && x.cong > 0.66);
      b.classList.toggle('swap', swapping);
      b.disabled = !x.open && (e.teams + x.cost) > e.teamMax;
      const s = b.querySelector('.xs');
      if (s) s.textContent = swapping ? `调配 ${Math.ceil(x.swapT)}s`
        : x.open ? `排队 ${Math.round(x.wait)}s` : `${x.cost} 组人力`;
      b.setAttribute('aria-pressed', x.open ? 'true' : 'false');
    });
    if (teamFill) teamFill.style.width = ((e.teams / Math.max(1, e.teamMax)) * 100).toFixed(0) + '%';
    if (teamTxt) setText(teamTxt, `${e.teams}/${e.teamMax}`);
    const tm = teamFill && teamFill.parentElement;
    if (tm) tm.classList.toggle('full', e.teams >= e.teamMax);
    if (bcLeft) setText(bcLeft, String(e.broadcastLeft));
    const bb = $('#btnBroadcast');
    if (bb) {
      bb.disabled = e.broadcastLeft <= 0 || !unlocked('broadcast');
      bb.title = unlocked('broadcast') ? '对最拥堵分区临时疏导（限 3 次）' : '达到 Lv.4 解锁「应急广播」';
    }
    if (flowGrade) setText(flowGrade, '评级 ' + (e.grade || '—'));
    if (flowFin) setText(flowFin, e.finishReason ? `${e.finishReason} · 峰值拥堵 ${Math.round((e.peak || 0) * 100)}%` : '');
    /* 四向压力：按出口所在象限汇总负载 */
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
      bar.style.width = (v * 100).toFixed(0) + '%';
      bar.style.background = v > 0.66 ? '#e2603f' : v > 0.33 ? '#e0a94b' : '#5fbf8a';
    }
  }
  const bbBtn = $('#btnBroadcast');
  bbBtn && bbBtn.addEventListener('click', () => {
    if (!unlocked('broadcast')) {
      toast('应急广播未解锁', '达到 Lv.4 解锁「应急广播」', 'plain');
      return;
    }
    const api = evacApi();
    if (!api || !api.broadcast) { toast('调度台未就绪', '游戏层加载完成后可用', 'plain'); return; }
    api.broadcast();
  });
  document.addEventListener('evac:changed', () => { syncDispatch(); });

  flowBtn.addEventListener('click', () => {
    const st = flowState();
    if (st.run && !st.paused) pauseFlow(); else startFlow();
  });
  flowPause && flowBtn;   /* 暂停按钮与主按钮同义（下） */
  flowPause.addEventListener('click', () => pauseFlow());
  flowReset.addEventListener('click', () => {
    resetFlow();
    toast('演练已重置', '全部观众回到初始分布', 'plain');
  });
  $('#btnFlowMode').addEventListener('click', () => {
    S.flow.mode = S.flow.mode === 'heat' ? 'none' : 'heat';
    setFlowMode();
  });
  $('#btnFlowView').addEventListener('click', (e) => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    setOn(e.currentTarget, on);
    if (on) { goShot(null); setView('plan'); }
    else setView('persp');
  });

  function updateFlow(dt) {
    const st = flowState();
    const e = evacApi();
    if (!e) {
      if (S.flow.on && !S.flow.paused) {
        S.flow.t += dt;
        const T = 46;
        const p = clamp(S.flow.t / T, 0, 1);
        S.flow.out = Math.floor(capTotal * easeInOut(p));
        if (p >= 1) {
          S.flow.on = false; S.flow.done = true;
          S.flow.score = Math.max(60, Math.round(100 - S.flow.t * 0.4));
          completeQuest('q4');
          toast('疏散完成', `${fmt(capTotal)} 人 · 用时 ${Math.floor(S.flow.t)}″ · 评分 ${S.flow.score}`, 'green');
          say('疏散演练完成');
        }
      }
      if (!S.flow.on && S.flow.t > 0 && !S.flow.done) { /* 暂停态 */ }
    } else if (e.done && !S.flow.done) {
      S.flow.done = true;
      completeQuest('q4');
      toast('疏散完成', `${fmt(e.evacuated || capTotal)} 人 · 评分 ${e.score ?? '—'}`, 'green');
    }
    /* 热力环带透明度 + 颜色 */
    if (heatMeshes.length) {
      const active = st.run || st.t > 0;
      const p = clamp(st.out / Math.max(1, st.total), 0, 1);
      const target = active ? 0.42 : 0;
      heatMeshes.forEach((m) => {
        m.material.opacity = lerp(m.material.opacity, target, Math.min(1, dt * 2.2));
      });
      if (active && S.flow.mode === 'heat') {
        const col = new THREE.Color();
        heatMeshes.forEach((m, ti) => {
          const attr = m.geometry.getAttribute('color');
          const rows = MODEL.tiers[ti].rows.length;
          const N = 96;
          for (let i = 0; i <= N; i++) {
            const u = i / N;
            const ee = clamp(p * 1.35 - Math.abs(u - 0.5) * 0.35, 0, 1);
            col.setHSL(0.02 + ee * 0.30, 0.82, 0.55);
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

  /* ══════════ 右栏：表达方式 ══════════════ */
  const perspCam = stage.camera;
  function setMat(m) {
    S.mat = m;
    modes.setMode(m);
    $$('#segMat button').forEach((b) => {
      const on = b.dataset.mat === m;
      b.classList.toggle('on', on);
      setAttr(b, 'aria-pressed', on ? 'true' : 'false');
    });
    setText($('#matName'), { material: '材质', white: '白模', xray: 'X 光' }[m] || '材质');
    say('表达方式：' + ({ material: '材质渲染', white: '白模', xray: 'X 光' }[m] || m));
  }
  function setExplode(v) {
    const val = clamp(v, 0, 1);
    S.exploded = val;
    modes.setExplode(val);
    const pct = Math.round(val * 100);
    const rg = $('#rgExplode');
    if (rg && +rg.value !== pct) rg.value = pct;
    setText($('#exVal'), pct + '%');
  }
  function setSection(on, cut) {
    S.section = !!on;
    if (cut != null) S.secPos = cut;
    modes.setSection(S.section, new THREE.Vector3(0, 0, -1), S.secPos);
    setOn($('#btnSecToggle'), S.section);
    setText($('#btnSecToggle'), S.section ? '关闭剖切（X）' : '开启剖切（X）');
    const rg = $('#rgSection');
    if (rg && +rg.value !== S.secPos) rg.value = S.secPos;
    setText($('#secVal'), String(Math.round(S.secPos)));
  }

  const AUTO_HIDE = { plan: ['roof'], front: [], left: [], section: [] };
  function lyOn(id) { const st = S.layer[id]; return st ? st.on : true; }
  function setView(v, byUser = true) {
    S.view = v;
    const key = { persp: 'persp', plan: 'plan', front: 'front', left: 'left', section: 'section', pitch: 'persp' }[v] || 'persp';
    if (key === 'persp') {
      stage.camera = perspCam;
      fx.setDraft(false);
    } else {
      stage.camera = draft.get(key);
      draft.fit();
      fx.setDraft(true);
      fx.setDraftCamera(stage.camera);
    }
    $$('#gridView button').forEach((b) => {
      const on = b.dataset.view === v;
      b.classList.toggle('on', on);
      setAttr(b, 'aria-pressed', on ? 'true' : 'false');
    });
    if (byUser) orbit.enabled = key === 'persp';
    const hide = AUTO_HIDE[v] || [];
    const roofG = arena.groups.roof;
    if (roofG && S.layer.roof) {
      const anySolo = Object.values(S.layer).some((x) => x.solo);
      const roofVis = anySolo ? S.layer.roof.solo : S.layer.roof.on;
      roofG.visible = key === 'persp' ? roofVis : (!hide.includes('roof') && roofVis);
    }
    say('相机视图：' + ({ persp: '透视', plan: '俯视', front: '正立', left: '侧立', section: '剖面', pitch: '场内' }[v] || v));
  }

  $('#segMat').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    setMat(b.dataset.mat);
  });
  $('#gridView').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    goShot(null);
    setView(b.dataset.view);
    if (b.dataset.view === 'section') setSection(true);
  });
  $('#rgExplode').addEventListener('input', (e) => setExplode(+e.target.value / 100));
  $('#rgSection').addEventListener('input', (e) => setSection(S.section, +e.target.value));
  $('#btnSecToggle').addEventListener('click', () => setSection(!S.section));

  /* ══════════ 图层 ══════════════ */
  const layerList = $('#layerList');
  function buildLayers() {
    layerList.innerHTML = '';
    LAYERS.forEach((L) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ly on';
      b.dataset.id = L.id;
      b.setAttribute('aria-pressed', 'true');
      b.setAttribute('aria-label', `图层 ${L.name}，点击显隐，双击孤立`);
      b.innerHTML = `<i class="sw" style="background:${L.color}" aria-hidden="true"></i><span class="nm">${L.name}</span><i class="eyes" aria-hidden="true"></i>`;
      b.addEventListener('click', () => {
        const st = S.layer[L.id];
        st.on = !st.on;
        applyLayers();
        say(`${L.name} ${st.on ? '显示' : '隐藏'}`);
      });
      b.addEventListener('dblclick', () => {
        const anySolo = Object.values(S.layer).some((x) => x.solo);
        Object.keys(S.layer).forEach((k) => (S.layer[k].solo = anySolo ? false : k === L.id));
        applyLayers();
        toast(anySolo ? '退出孤立' : '孤立查看', anySolo ? '恢复全部图层' : L.name, 'plain');
      });
      b.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        S.layer[L.id].on = false;
        applyLayers();
        toast('已隐藏图层', L.name, 'plain');
      });
      layerList.appendChild(b);
    });
  }
  function applyLayers() {
    const anySolo = Object.values(S.layer).some((x) => x.solo);
    let onCount = 0;
    LAYERS.forEach((L) => {
      const st = S.layer[L.id];
      const vis = anySolo ? st.solo : st.on;
      if (vis) onCount++;
      /* 未建好的图层（arena.groups 暂时缺失）也不能让 UI 报错 */
      const g = arena.groups && arena.groups[L.id];
      if (g) g.visible = vis;
      if (L.id === 'structure' && arena.groups && !arena.groups.structure && arena.groups.roof) {
        /* 兼容：结构族未独立时跟随屋盖可见性 */
      }
      const el = layerList.querySelector(`.ly[data-id="${L.id}"]`);
      if (el) {
        el.classList.toggle('on', st.on);
        el.classList.toggle('off', !st.on);
        el.classList.toggle('solo', !!st.solo);
        setAttr(el, 'aria-pressed', vis ? 'true' : 'false');
      }
    });
    setText($('#layerCount'), `${onCount}/${LAYERS.length}`);
    /* 环境（周边配套）走 env.root */
    if (env && env.root) env.root.visible = (anySolo ? S.layer.site.solo : S.layer.site.on) !== false;
  }
  function setLayer(id, v, solo) {
    if (!S.layer[id]) S.layer[id] = { on: true, solo: false };
    if (solo != null) S.layer[id].solo = !!solo;
    else S.layer[id].on = !!v;
    applyLayers();
  }

  /* ══════════ 建造时间轴 ══════════════ */
  const rgBuild = $('#rgBuild');
  const buildStageEl = $('#buildStage');
  function buildApi() { const b = window.__build; return (b && typeof b.setPhase === 'function') ? b : null; }
  function applyBuild(v, silent) {
    S.build.v = clamp(v, 0, 100);
    const p = S.build.v / 100;
    /* 委托游戏层：setPhase(t)，t 为 0..5 的阶段进度 */
    const b = buildApi();
    if (b) { try { b.setPhase(p * 5); } catch (e) { /* noop */ } }
    else {
      /* 本地演示：用爆炸分解逆向表达施工顺序 */
      modes.setExplode(1 - p);
      setExplode(1 - p);
    }
    let ph = 0;
    for (let i = 0; i < BUILD.length; i++) if (S.build.v >= BUILD[i].at) ph = i;
    S.build.phase = ph;
    Array.from(buildStageEl.children).forEach((el, i) => {
      el.classList.toggle('on', i === ph);
      setAttr(el, 'aria-pressed', i === ph ? 'true' : 'false');
    });
    setText($('#buildVal'), Math.round(S.build.v) + '%');
    setText($('#buildPct'), (ph === BUILD.length - 1 ? '竣工 ' : '施工中 ') + Math.round(S.build.v) + '%');
    setText($('#buildDesc'), BUILD[ph].name + ' · ' + BUILD[ph].desc);
    if (rgBuild && +rgBuild.value !== Math.round(S.build.v)) rgBuild.value = Math.round(S.build.v);
    if (!silent) {
      if (S.build.v > 0) S._buildMoved = true;
      if (S._buildMoved && S.build.v >= 99) completeQuest('q5');
    }
  }
  rgBuild.addEventListener('input', (e) => {
    S.build.playing = false;
    setOn($('#btnBuildPlay'), false);
    applyBuild(+e.target.value);
  });
  buildStageEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-phase]');
    if (!b) return;
    const i = +b.dataset.phase;
    S.build.playing = false;
    setOn($('#btnBuildPlay'), false);
    applyBuild(i === 0 ? 0 : BUILD[i].at + 8);
  });
  $('#btnBuildPlay').addEventListener('click', () => {
    S.build.playing = !S.build.playing;
    setOn($('#btnBuildPlay'), S.build.playing);
    setText($('#btnBuildPlay'), S.build.playing ? '❚❚ 暂停建造动画' : '▶ 播放建造动画');
    if (S.build.playing && S.build.v >= 99) applyBuild(0);
  });

  /* ══════════ 底栏机位 + 模式 ══════════════ */
  const shotList = $('#shotList');
  function buildShots(container) {
    container.innerHTML = '';
    SHOTS.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sh';
      b.dataset.id = s.id;
      b.setAttribute('aria-label', `机位 ${s.name}（快捷键 ${s.key}）`);
      b.innerHTML = `<b>${s.key}</b>${s.name}`;
      b.addEventListener('click', () => goShot(s.id));
      container.appendChild(b);
    });
  }
  buildShots(shotList);
  /* 移动端机位 sheet（复用同一批按钮语义） */
  const sheet = document.createElement('div');
  sheet.className = 'shotsheet';
  sheet.id = 'shotSheet';
  sheet.setAttribute('aria-label', '机位选择');
  const sheetShots = document.createElement('div');
  sheetShots.className = 'shots';
  sheetShots.style.cssText = 'flex-wrap:wrap;justify-content:center;overflow:visible';
  buildShots(sheetShots);
  const sheetModes = document.createElement('div');
  sheetModes.className = 'modes';
  sheetModes.innerHTML = `
    <button class="btn" data-mode="tour">导览</button>
    <button class="btn" data-mode="walk">漫游</button>
    <button class="btn" data-mode="story">建造逻辑</button>
    <button class="btn" data-mode="photo">照片</button>
    <button class="btn" data-mode="reset">复位</button>`;
  sheet.appendChild(sheetShots);
  sheet.appendChild(sheetModes);
  $('#hud').appendChild(sheet);
  sheetModes.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mode]');
    if (!b) return;
    const m = b.dataset.mode;
    if (m === 'tour') toggleTour();
    if (m === 'walk') toggleWalk();
    if (m === 'story') toggleStory();
    if (m === 'photo') photoMode(true);
    if (m === 'reset') resetAll();
    sheet.classList.remove('on');
  });

  /* 移动端抽屉遮罩 */
  const mask = document.createElement('div');
  mask.className = 'pmask';
  $('#hud').appendChild(mask);
  mask.addEventListener('click', () => openPanel(null));

  function goShot(id) {
    if (!id) {
      $$('.sh').forEach((e) => { e.classList.remove('on'); setAttr(e, 'aria-pressed', 'false'); });
      return;
    }
    const s = SHOTS.find((x) => x.id === id);
    if (!s) return;
    stopWalk();
    setView(id === 'hero' ? 'persp' : id, false);
    orbit.stopAuto();
    S.tour = false; setOn($('#btnTour'), false);
    orbit.set({ target: new THREE.Vector3(...s.target), dist: s.dist, az: s.az, el: s.el });
    $$('.sh').forEach((e) => {
      const on = e.dataset.id === id;
      e.classList.toggle('on', on);
      setAttr(e, 'aria-pressed', on ? 'true' : 'false');
    });
    say('机位：' + s.name);
  }

  /* ══════════ 比赛日时段（v4） ══════════════
     照明由 window.__day 驱动；这里只负责把时段状态显示出来 + 提供"下一时段"入口。
     点它会推进一个时段（赛前→开赛→中场→赛后→新的一天），
     这样三套照明就从"皮肤"变成了关卡节奏。 */
  function syncDay() {
    const d = window.__day;
    const btn = $('#btnMatch');
    const nm = $('#matchName');
    const tm = $('#matchTime');
    const dot = $('#matchDot');
    if (!d || !btn) return;
    const e = d.progress;
    btn.hidden = false;
    if (nm) setText(nm, e.name);
    if (tm) setText(tm, String((d.days || 0) + 1).padStart(2, '0'));
    if (dot) dot.style.background = e.accent;
    btn.style.setProperty('--match-accent', e.accent);
    setAttr(btn, 'data-tip', `${e.en} · ${e.tip}　（点击进入下一时段）`);
    btn.classList.toggle('live', e.phase === 'kickoff');
  }
  document.addEventListener('day:phase', syncDay);
  let dayBtnBound = false;
  function bindDay() {
    if (dayBtnBound) return;
    const btn = $('#btnMatch');
    if (!btn) return;
    dayBtnBound = true;
    btn.addEventListener('click', () => {
      const d = window.__day;
      if (!d) return;
      const from = d.progress;
      d.next(false);
      const to = d.progress;
      toast(`时段推进：${from.name} → ${to.name}`, to.tip, to.phase === 'kickoff' ? 'gold' : 'plain');
    });
    syncDay();
  }

  /* ══════════ 昼夜 ══════════════ */
  let envTarget = 'night';
  function setEnv(k) {
    if (!PRESETS[k]) return;
    S.env = k; envTarget = k;
    setText($('#envName'), PRESETS[k].name);
    const dot = $('#envDot');
    if (dot) dot.className = 'dot ' + (k === 'day' ? 'day' : k === 'dusk' ? 'dusk' : '');
    setAttr($('#btnEnv'), 'aria-label', '切换昼夜照明，当前' + PRESETS[k].name);
    say('照明：' + PRESETS[k].name);
  }
  function tickEnv(dt) {
    const target = PRESETS[envTarget];
    let maxd = 0;
    for (const k of Object.keys(target)) {
      const b = target[k];
      if (typeof b === 'number') maxd = Math.max(maxd, Math.abs(b - preset[k]));
    }
    if (maxd < 1e-3) { lerpPreset(target, 1); return; }
    lerpPreset(target, Math.min(1, dt * 1.6));
  }

  /* ══════════ 漫游 ══════════════ */
  function startWalk() {
    S.walk = true;
    walk.start(new THREE.Vector3(0, 2.0, 200));
    walk.yaw = Math.PI; walk.pitch = 0.02;
    orbit.enabled = false;
    $('#walkHint').classList.remove('hidden');
    setOn($('#btnWalk'), true);
    document.body.classList.add('walking');
    if (S.mobile) showTouchLook(true);
    toast('进入漫游模式', S.mobile ? '左侧摇杆移动 · 右侧拖动转头' : 'W A S D 行走 · Shift 加速 · 鼠标转头', 'plain');
    say('进入第一人称漫游');
  }
  function stopWalk() {
    if (!S.walk) return;
    S.walk = false;
    walk.stop();
    orbit.enabled = true;
    orbit.tTarget.set(0, 14, 0); orbit.tDist = 520; orbit.tAz = -1.32; orbit.tElv = 0.4;
    $('#walkHint').classList.add('hidden');
    setOn($('#btnWalk'), false);
    document.body.classList.remove('walking');
    showTouchLook(false);
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function toggleWalk() { S.walk ? stopWalk() : startWalk(); }
  /* walk.js 在指针锁定态按 Esc / 自动漫游结束时，通过这个钩子请求退出；
     必须交回 stopWalk，否则 body.walking / 按钮状态会残留。 */
  walk.onExitKey = () => { if (S.walk) stopWalk(); else document.body.classList.remove('walking'); };

  /* 触屏摇杆 + 拖动转头 */
  const joy = $('#joy'), joyKnob = $('#joyKnob'), touchLook = $('#touchLook');
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
      joyVec.x = (dx * k) / R; joyVec.y = (dy * k) / R;
    };
    const c = () => { const r = joy.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    joy.addEventListener('pointerdown', (e) => {
      activeId = e.pointerId; joy.setPointerCapture(e.pointerId);
      const p = c(); setJoy(e.clientX - p.x, e.clientY - p.y);
    });
    joy.addEventListener('pointermove', (e) => {
      if (activeId !== e.pointerId) return;
      const p = c(); setJoy(e.clientX - p.x, e.clientY - p.y);
    });
    const end = (e) => {
      if (activeId !== e.pointerId) return;
      activeId = null; setJoy(0, 0);
    };
    joy.addEventListener('pointerup', end);
    joy.addEventListener('pointercancel', end);
  }
  if (touchLook) {
    let lookId = null, lx = 0, ly = 0;
    touchLook.addEventListener('pointerdown', (e) => {
      if (e.target !== touchLook) return;
      lookId = e.pointerId; lx = e.clientX; ly = e.clientY;
      touchLook.setPointerCapture(e.pointerId);
    });
    touchLook.addEventListener('pointermove', (e) => {
      if (lookId !== e.pointerId) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      if (walk && walk.active) {
        walk.yaw -= dx * 0.0042;
        walk.pitch = clamp(walk.pitch - dy * 0.0042, -1.35, 1.35);
        walk.touring = false;
      }
    });
    const endLook = (e) => { if (lookId === e.pointerId) lookId = null; };
    touchLook.addEventListener('pointerup', endLook);
    touchLook.addEventListener('pointercancel', endLook);
  }
  function applyJoy(dt) {
    if (!S.walk || !joy || joy.hidden) return;
    if (Math.hypot(joyVec.x, joyVec.y) < 0.12) return;
    const sp = 9.5 * dt;
    const fz = -joyVec.y, fx = joyVec.x;
    const sinY = Math.sin(walk.yaw), cosY = Math.cos(walk.yaw);
    walk.pos.x += (fz * sinY + fx * cosY) * sp;
    walk.pos.z += (fz * cosY - fx * sinY) * sp;
    walk.touring = false;
  }

  /* ══════════ 导览 / 建造逻辑 / 复位 ══════════════ */
  function toggleTour() {
    S.tour = !S.tour;
    setOn($('#btnTour'), S.tour);
    const sb = sheetModes.querySelector('[data-mode="tour"]');
    sb && sb.classList.toggle('on', S.tour);
    if (S.tour) {
      stopWalk();
      orbit.startAuto(SHOTS.map((s) => ({ target: s.target, dist: s.dist, az: s.az, el: s.el })), 7.5);
      toast('自动导览', '镜头将依次巡游 7 个机位', 'plain');
      say('自动导览开始');
    } else orbit.stopAuto();
  }
  function toggleStory() {
    S.story = !S.story;
    setOn($('#btnStory'), S.story);
    const sb = sheetModes.querySelector('[data-mode="story"]');
    sb && sb.classList.toggle('on', S.story);
    if (S.story) {
      stopWalk();
      S.storyT = 0;
      buildStageEl.querySelector('[data-phase="0"]').click();
      rgBuild.value = 0;
      applyBuild(0, true);
      orbit.set({ target: new THREE.Vector3(0, 26, 0), dist: 620, az: -1.15, el: 0.34 });
      toast('建造逻辑演示', '按施工顺序逐层归位', 'plain');
    } else {
      S.build.playing = false;
      setOn($('#btnBuildPlay'), false);
      applyBuild(100);
    }
  }
  function resetAll() {
    stopWalk();
    S.tour = false; S.story = false; S.photoHide = false;
    document.body.classList.remove('photo-hide', 'photo');
    $('#photoBar').hidden = true;
    setOn($('#btnTour'), false); setOn($('#btnStory'), false); setOn($('#btnPhoto'), false);
    $$('.pmode-on').forEach((e) => e.classList.remove('pmode-on'));
    orbit.stopAuto();
    setExplode(0);
    setSection(false);
    setView('persp');
    setEnv('night');
    setMat('material');
    LAYERS.forEach((L) => { S.layer[L.id] = { on: true, solo: false }; });
    applyLayers();
    applyBuild(100, true);
    clearSel();
    goShot('hero');
    toast('已复位', '相机 / 表达 / 图层 / 建造 全部回到初始状态', 'plain');
    say('已复位全部视图');
  }

  $('#btnWalk').addEventListener('click', toggleWalk);
  $('#btnTour').addEventListener('click', toggleTour);
  $('#btnStory').addEventListener('click', toggleStory);
  $('#btnReset').addEventListener('click', resetAll);
  $('#btnEnv').addEventListener('click', () => {
    const order = ['night', 'dusk', 'day'];
    const next = order[(order.indexOf(S.env) + 1) % order.length];
    /* 黄昏模式需 Lv.2 解锁 */
    if (next === 'dusk' && !unlocked('dusk')) {
      toast('黄昏模式未解锁', '达到 Lv.2 解锁「黄昏模式」', 'plain');
      return;
    }
    setEnv(next);
    toast('照明切换', PRESETS[next].name + ' · ' + PRESETS[next].en, 'plain');
  });

  /* ══════════ 帮助 / 设置 ══════════════ */
  function openSheet(id, on) {
    const el = $(id);
    if (!el) return;
    el.classList.toggle('on', on);
    setAttr(el, 'aria-hidden', on ? 'false' : 'true');
    /* 只处理真实可见且存在的焦点，避免隐藏元素抢焦点 */
    if (on) {
      const a = document.activeElement;
      S.prevFocus = (a && a !== document.body) ? a : null;
      const f = Array.from(el.querySelectorAll('button, input, [tabindex]'))
        .find((b) => b.offsetParent !== null);
      if (f) f.focus({ preventScroll: true });
    } else if (S.prevFocus && S.prevFocus.offsetParent !== null && S.prevFocus.focus) {
      S.prevFocus.focus({ preventScroll: true });
    }
  }
  /* 浮层关闭函数：仅在浮层可见时调用，避免无谓的焦点迁移 */
  function closeSheets() {
    const any = $('#help').classList.contains('on') || $('#settings').classList.contains('on');
    if (!any) return false;
    openSheet('#help', false);
    openSheet('#settings', false);
    return true;
  }
  $('#btnHelp').addEventListener('click', () => openSheet('#help', true));
  $('#helpClose').addEventListener('click', () => openSheet('#help', false));
  $('#help').addEventListener('click', (e) => { if (e.target.id === 'help') openSheet('#help', false); });
  $('#btnSettings').addEventListener('click', () => openSheet('#settings', true));
  $('#setClose').addEventListener('click', () => openSheet('#settings', false));
  $('#settings').addEventListener('click', (e) => { if (e.target.id === 'settings') openSheet('#settings', false); });
  setText($('#setSysMotion'), reduceSys ? '已启用' : '未开启');

  /* 画质 */
  function setQuality(q) {
    S.quality = q;
    $$('#segQuality button').forEach((b) => {
      const on = b.dataset.q === q;
      b.classList.toggle('on', on);
      setAttr(b, 'aria-pressed', on ? 'true' : 'false');
    });
    if (stage) stage.quality = q;
    if (ctx.fx && ctx.fx.setQuality) { try { ctx.fx.setQuality(q); } catch (e) { /* noop */ } }
    /* 兜底：直接调像素比（core.resize 读 stage.quality），不越界改他人文件 */
    if (!(ctx.fx && ctx.fx.setQuality) && stage && stage.renderer) {
      const maxDpr = q === 'low' ? 1.0 : q === 'mid' ? 1.5 : 2.0;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      stage.renderer.setPixelRatio(dpr);
      if (stage.camera) { stage.camera.aspect = window.innerWidth / window.innerHeight; stage.camera.updateProjectionMatrix(); }
    }
    store.set('quality', q);
    say('画质：' + ({ low: '低', mid: '中', high: '高' }[q] || q));
  }
  $('#segQuality').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-q]');
    if (b) setQuality(b.dataset.q);
  });

  /* 音效（占位：无音频资源，仅记录状态） */
  function setSound(on) {
    S.sound = !!on;
    setOn($('#btnSound'), S.sound);
    setAttr($('#btnSound'), 'aria-pressed', S.sound ? 'true' : 'false');
    const tg = $('#tgSound');
    if (tg) { tg.classList.toggle('on', S.sound); setAttr(tg, 'aria-checked', S.sound ? 'true' : 'false'); }
    store.set('sound', S.sound);
    say('环境音效' + (S.sound ? '已开启' : '已关闭'));
  }
  $('#btnSound').addEventListener('click', () => {
    setSound(!S.sound);
    toast('环境音效', S.sound ? '已开启（演示占位）' : '已静音', 'plain');
  });
  $('#tgSound').addEventListener('click', () => setSound(!S.sound));

  /* 减少动态 */
  function setReduceMotion(on) {
    S.reduceMotion = !!on;
    document.body.classList.toggle('reduce-motion', S.reduceMotion);
    const tg = $('#tgMotion');
    if (tg) { tg.classList.toggle('on', S.reduceMotion); setAttr(tg, 'aria-checked', S.reduceMotion ? 'true' : 'false'); }
    store.set('reduceMotion', S.reduceMotion);
    say('减少动态' + (S.reduceMotion ? '已开启' : '已关闭'));
  }
  $('#tgMotion').addEventListener('click', () => setReduceMotion(!S.reduceMotion));
  $('#tgQualityAuto').addEventListener('click', (e) => {
    S.autoQuality = !S.autoQuality;
    e.currentTarget.classList.toggle('on', S.autoQuality);
    setAttr(e.currentTarget, 'aria-checked', S.autoQuality ? 'true' : 'false');
    store.set('autoQuality', S.autoQuality);
  });
  if (S.reduceMotion) setReduceMotion(true);
  setSound(S.sound);
  S.autoQuality = store.get('autoQuality', true);
  $('#tgQualityAuto') && $('#tgQualityAuto').classList.toggle('on', S.autoQuality);

  /* 省电模式：真正生效的是 stage.perf + fx.setPerfMode + 关阴影，见 app.js 的 setPerfMode */
  function setPerfMode(on) {
    const perf = !!on;
    S.perf = perf;
    const tg = $('#tgPerf');
    if (tg) { tg.classList.toggle('on', perf); setAttr(tg, 'aria-checked', perf ? 'true' : 'false'); }
    store.set('perf', perf);
    if (window.__setPerfMode) window.__setPerfMode(perf);
    say(perf ? '已开启省电模式（分辨率减半 / 关泛光）' : '已关闭省电模式');
  }
  /* 启动时的初始状态由 app.js 的 detectPerfMode 决定，这里只把开关同步过来 */
  S.perf = !!(stage && stage.perf);
  {
    const tg0 = $('#tgPerf');
    if (tg0) { tg0.classList.toggle('on', S.perf); setAttr(tg0, 'aria-checked', S.perf ? 'true' : 'false'); }
  }
  $('#tgPerf') && $('#tgPerf').addEventListener('click', () => setPerfMode(!S.perf));

  /* ══════════ 面板折叠 / 抽屉 ══════════════ */
  function setPanelOpen(panel, open) {
    panel.dataset.open = open ? '1' : '0';
    const ph = panel.querySelector('.ph');
    if (ph) setAttr(ph, 'aria-expanded', open ? 'true' : 'false');
    if (!open === false) { /* noop */ }
    store.set('panel.' + panel.id, open);
  }
  $$('.panel').forEach((panel) => {
    const ph = panel.querySelector('.ph');
    const saved = store.get('panel.' + panel.id, null);
    setPanelOpen(panel, saved == null ? true : !!saved);
    ph && ph.addEventListener('click', () => setPanelOpen(panel, panel.dataset.open !== '1'));
  });

  /* ══════════ v4 新面板：疏散工况 / 三表 / 每日挑战 / 印章 ══════════ */
  function buildScenChips() {
    const box = $('#scenChips');
    const e = window.__evac;
    if (!box || !e || !Array.isArray(e.scenarios)) return;
    box.innerHTML = '';
    e.scenarios.forEach((sc) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'scenchip';
      b.style.setProperty('--scen-accent', sc.accent || '#6fd3e0');
      b.dataset.scen = sc.id;
      b.textContent = sc.name;
      b.setAttribute('aria-pressed', sc.id === e.scenarioId ? 'true' : 'false');
      b.setAttribute('aria-label', `${sc.name} 工况：${sc.brief}`);
      b.addEventListener('click', () => {
        if (e.running) { toast('请先重置演练', '演练进行中不能切换工况', 'plain'); return; }
        e.reset(sc.id);
        syncFlowMeta();
        toast(`工况：${sc.name}`, sc.brief, 'plain');
      });
      box.appendChild(b);
    });
  }
  function syncFlowMeta() {
    const e = window.__evac;
    if (!e) return;
    $$('#scenChips .scenchip').forEach((c) => setAttr(c, 'aria-pressed', c.dataset.scen === e.scenarioId ? 'true' : 'false'));
    setText($('#scenBrief'), e.scenarioBrief || '');
    setText($('#flTeams'), `${e.teams}/${e.teamMax}`);
    setText($('#flLimit'), Math.round(e.limit) + '″');
    setText($('#flBc'), String(e.broadcastLeft ?? 0));
    setText($('#flGrade'), e.done ? e.grade : '—');
    setText($('#flScenario'), e.scenarioLabel || '');
  }

  function buildContestPanel() {
    const medals = $('#contestMedals');
    const grid = $('#stampGrid');
    const items = $('#dailyItems');
    if (medals && !medals.children.length) {
      ['evac', 'photo', 'overall'].forEach((id) => {
        const d = document.createElement('div');
        d.className = 'medal';
        d.dataset.id = id;
        d.setAttribute('role', 'listitem');
        d.innerHTML = '<b></b><em>—</em><span></span>';
        medals.appendChild(d);
      });
    }
    const st = window.__stamps;
    if (grid && st && !grid.children.length) {
      st.list.forEach((s) => {
        const d = document.createElement('div');
        d.className = 'stamp';
        d.dataset.id = s.id;
        d.setAttribute('role', 'listitem');
        d.title = s.desc;
        d.innerHTML = `<b>${s.name}</b><span class="en"></span>`;
        d.querySelector('.en').textContent = s.en;
        grid.appendChild(d);
      });
    }
    const daily = window.__daily;
    if (items && daily && daily.today && !items.children.length) {
      daily.today.items.forEach((it) => {
        const li = document.createElement('li');
        li.className = 'dailyitem';
        li.dataset.id = it.id;
        li.innerHTML = '<i aria-hidden="true">○</i><span></span>';
        li.querySelector('span').textContent = it.name;
        items.appendChild(li);
      });
    }
    syncContest();
  }

  function syncContest() {
    const C = window.__contest;
    const D = window.__daily;
    const S2 = window.__stamps;
    if (C) {
      const m = C.medal();
      $$('#contestMedals .medal').forEach((el) => {
        const r = m.find((x) => x.id === el.dataset.id);
        if (!r) return;
        el.classList.toggle('got', !!r.got);
        setText(el.querySelector('em'), r.label);
        setText(el.querySelector('b'), r.name);
        setText(el.querySelector('span'), r.hint);
      });
      setText($('#contestPct'), `${m.filter((x) => x.got).length}/3`);
    }
    if (D) {
      const p = D.progress();
      setText($('#dailyDate'), `${p.date} 今日挑战`);
      setText($('#dailyPct'), `${p.finished}/${p.total}`);
      $$('#dailyItems .dailyitem').forEach((el) => {
        const it = p.items.find((x) => x.id === el.dataset.id);
        if (!it) return;
        el.classList.toggle('done', !!it.done);
        setText(el.querySelector('i'), it.done ? '✓' : '○');
      });
    }
    if (S2) {
      $$('#stampGrid .stamp').forEach((el) => el.classList.toggle('got', S2.has(el.dataset.id)));
      setText($('#stampHelp'), `${S2.help}（已获 ${S2.found}/${S2.total}）`);
    }
    syncFlowMeta();
  }
  try {
    document.addEventListener('contest:changed', () => syncContest());
    document.addEventListener('stamps:changed', () => syncContest());
    document.addEventListener('evac:changed', () => syncFlowMeta());
  } catch (e) { /* 忽略 */ }

  const SIDE = { quest: 'left', cap: 'left', flow: 'left', view: 'right', layer: 'right', build: 'right', contest: 'right' };
  const PANEL_ID = { quest: '#pQuest', cap: '#pCap', flow: '#pFlow', view: '#pView', layer: '#pLayer', build: '#pBuild', contest: '#pContest' };

  function isDesktopWide() { return window.innerWidth >= 1280; }
  function openPanel(name) {
    /* name: 'quest'|'cap'|'flow'|'view'|'layer'|'build'|'help'|'settings'|null */
    if (name === 'help') { openSheet('#help', true); return; }
    if (name === 'settings') { openSheet('#settings', true); return; }
    const prev = S.drawer;
    S.drawer = name || null;
    const colL = $('#colLeft'), colR = $('#colRight');
    const railL = $('#railLeft'), railR = $('#railRight');
    const openLeft = name && SIDE[name] === 'left';
    const openRight = name && SIDE[name] === 'right';

    if (isDesktopWide()) {
      /* 桌面：只滚动定位 + 高亮，不改变布局 */
      if (name) {
        const p = $(PANEL_ID[name]);
        if (p) {
          setPanelOpen(p, true);
          p.scrollIntoView({ block: 'nearest', behavior: motionOK() ? 'smooth' : 'auto' });
          p.style.transition = 'box-shadow .3s';
          p.style.boxShadow = '0 0 0 1px rgba(232,192,122,.55), 0 10px 30px rgba(0,0,0,.28)';
          setTimeout(() => { p.style.boxShadow = ''; }, 900);
        }
      }
      $$('.ritem').forEach((b) => b.classList.toggle('active', b.dataset.panel === name));
      return;
    }

    /* 窄屏：抽屉 */
    colL.classList.toggle('open', !!openLeft);
    colR.classList.toggle('open', !!openRight);
    mask.classList.toggle('on', !!(openLeft || openRight));
    railL.classList.toggle('open', !!openLeft);
    railR.classList.toggle('open', !!openRight);
    $$('.ritem').forEach((b) => {
      const on = b.dataset.panel === name;
      b.classList.toggle('active', on);
      setAttr(b, 'aria-expanded', on ? 'true' : 'false');
    });
    if (name) {
      const p = $(PANEL_ID[name]);
      if (p) { setPanelOpen(p, true); }
      say('打开面板：' + (p ? p.dataset.title : name));
    } else if (prev) {
      say('关闭面板');
    }
  }
  $('#railLeft').addEventListener('click', (e) => {
    const b = e.target.closest('.ritem');
    if (!b) return;
    openPanel(S.drawer === b.dataset.panel ? null : b.dataset.panel);
  });
  $('#railRight').addEventListener('click', (e) => {
    const b = e.target.closest('.ritem');
    if (!b) return;
    openPanel(S.drawer === b.dataset.panel ? null : b.dataset.panel);
  });

  /* 移动端底部栏 */
  $('#mBtnShots').addEventListener('click', () => sheet.classList.toggle('on'));
  $('#mBtnQuest').addEventListener('click', () => openPanel(S.drawer === 'quest' ? null : 'quest'));
  $('#mBtnCap').addEventListener('click', () => openPanel(S.drawer === 'cap' ? null : 'cap'));
  $('#mBtnFlow').addEventListener('click', () => openPanel(S.drawer === 'flow' ? null : 'flow'));
  $('#mBtnView').addEventListener('click', () => openPanel(S.drawer === 'view' ? null : 'view'));
  $('#mBtnLayer').addEventListener('click', () => openPanel(S.drawer === 'layer' ? null : 'layer'));
  $('#mBtnWalk').addEventListener('click', toggleWalk);

  /* ══════════ 构件信息卡 ══════════════ */
  const hintCard = $('#hintCard');
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tip = $('#hoverTip');

  function entIdAt(clientX, clientY) {
    if (!arena || !arena.ents) return null;
    const cam = stage.camera;
    const rect = stage.canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
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
    /* 1) 名称直接命中 */
    let p = o, first = null;
    while (p) {
      if (p.userData && p.userData.ent && arena.ents[p.userData.ent]) return p.userData.ent;
      if (p.name && arena.ents[p.name]) { if (!first) first = p.name; }
      p = p.parent;
    }
    /* 2) 一级族（落在 arena.root 下的分组） */
    for (const [k, e] of Object.entries(arena.ents)) {
      if (e.mesh && e.mesh.isObject3D && isAncestor(e.mesh, o)) return k;
    }
    /* 3) 用 parent 名映射 */
    for (const [k, e] of Object.entries(arena.ents)) {
      if (!e.parent) continue;
      if (isAncestor(e.parent, o)) return k;
    }
    return first;
  }
  function isAncestor(a, b) { let p = b; while (p) { if (p === a) return true; p = p.parent; } return false; }

  function showSel(id, sx, sy) {
    if (!id) { clearSel(); return; }
    const e = arena.ents[id] || {};
    S.sel = id;
    setText($('#hcTitle'), e.label || id);
    setText($('#hcSpec'), e.spec || '构件图层 · ' + id);
    const grp = S.layer[id] ? id : (LAYERS.find((L) => arena.groups && arena.groups[L.id] === e.parent) || {}).id;
    setHTML($('#hcData'),
      `<span>构件 ID</span><i>${id}</i>`
      + `<span>所属图层</span><i>${grp || '—'}</i>`
      + `<span>构件类型</span><i>${e.mesh && e.mesh.isInstancedMesh ? '实例化阵列' : (e.mesh && e.mesh.isMesh ? '网格实体' : '组件')}</i>`
      + `<span>可见</span><i>${e.hidden ? '隐藏' : '显示'}</i>`);
    hintCard.hidden = false;
    hintCard.classList.add('on');
    const w = hintCard.offsetWidth || 264;
    const rect = stage.canvas.getBoundingClientRect();
    const x = clamp(sx - rect.left + 16, 8, window.innerWidth - w - 8);
    const y = clamp(sy - rect.top + 14, 8, window.innerHeight - hintCard.offsetHeight - 8);
    hintCard.style.left = x + 'px';
    hintCard.style.top = y + 'px';
    say((e.label || id) + '：' + (e.spec || ''));
  }
  function clearSel() {
    S.sel = null;
    hintCard.hidden = true;
    hintCard.classList.remove('on');
  }
  $('#hcClose').addEventListener('click', clearSel);
  function focusSel() {
    const id = S.sel;
    if (!id) return;
    if (typeof arena.focusOn === 'function') { try { arena.focusOn(id); } catch (e) { /* noop */ } }
    else if (arena.ents[id] && arena.ents[id].mesh) {
      const b = new THREE.Box3().setFromObject(arena.ents[id].mesh);
      if (!b.isEmpty()) {
        const c = b.getCenter(new THREE.Vector3());
        const r = b.getSize(new THREE.Vector3()).length() * 1.25;
        orbit.set({ target: c, dist: clamp(r, 20, 1400), el: 0.34 });
      }
    }
    say('对焦：' + ((arena.ents[id] && arena.ents[id].label) || id));
  }
  function hideSel() {
    const id = S.sel;
    if (!id) return;
    if (typeof arena.setVisible === 'function') { try { arena.setVisible(id, false); } catch (e) { /* noop */ } }
    else if (arena.ents[id] && arena.ents[id].mesh) arena.ents[id].mesh.visible = false;
    if (S.layer[id]) { S.layer[id].on = false; applyLayers(); }
    toast('已隐藏构件', (arena.ents[id] && arena.ents[id].label) || id, 'plain');
    clearSel();
  }
  function soloSel() {
    const id = S.sel;
    if (!id) return;
    if (typeof arena.setSolo === 'function') { try { arena.setSolo(id); } catch (e) { /* noop */ } }
    const any = Object.values(S.layer).some((x) => x.solo);
    if (S.layer[id]) {
      const on = !any;
      Object.keys(S.layer).forEach((k) => (S.layer[k].solo = on && k === id));
      applyLayers();
    }
    toast(any ? '退出孤立' : '孤立查看', (arena.ents[id] && arena.ents[id].label) || id, 'plain');
  }
  $('#hcFocus').addEventListener('click', focusSel);
  $('#hcHide').addEventListener('click', hideSel);
  $('#hcSolo').addEventListener('click', soloSel);

  /* 指针：悬停提示 / 单击选中 / 双击孤立 / 右键隐藏 / 拖拽不误触 */
  let downAt = 0, downX = 0, downY = 0;
  stage.canvas.addEventListener('pointerdown', (e) => { downAt = now(); downX = e.clientX; downY = e.clientY; });
  stage.canvas.addEventListener('pointermove', (e) => {
    if (S.walk) return;
    if (now() - S._hoverT < 90) return;
    S._hoverT = now();
    const r = entIdAt(e.clientX, e.clientY);
    if (r) {
      const meta = arena.ents[r.id] || {};
      setHTML(tip, '');
      tip.innerHTML = '';
      const b = document.createElement('b'); b.textContent = meta.label || r.id;
      const s = document.createElement('span'); s.textContent = meta.spec || '';
      tip.append(b, s);
      tip.classList.add('on');
      tip.style.left = Math.min(e.clientX + 14, window.innerWidth - 250) + 'px';
      tip.style.top = Math.min(e.clientY + 16, window.innerHeight - 60) + 'px';
      S.hover = r.id;
    } else { tip.classList.remove('on'); S.hover = null; }
  });
  stage.canvas.addEventListener('pointerleave', () => tip.classList.remove('on'));
  stage.canvas.addEventListener('pointerup', (e) => {
    if (now() - downAt > 320) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
    if (S.walk) return;
    if (e.button === 2) {
      const r = entIdAt(e.clientX, e.clientY);
      if (r) { S.sel = r.id; hideSel(); }
      return;
    }
    const r = entIdAt(e.clientX, e.clientY);
    if (r) showSel(r.id, e.clientX, e.clientY);
    else clearSel();
  });
  stage.canvas.addEventListener('dblclick', (e) => {
    if (S.walk) return;
    const r = entIdAt(e.clientX, e.clientY);
    if (r) { showSel(r.id, e.clientX, e.clientY); soloSel(); }
  });
  stage.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ══════════ 小地图 / 罗盘（15fps） ══════════════ */
  const mm = $('#mm');
  const mctx = mm ? mm.getContext('2d') : null;
  function playerPose() {
    const w = window.__walk;
    if (w && w.pos) return { pos: w.pos, yaw: w.yaw || 0, active: true };
    if (walk && walk.active) return { pos: walk.pos, yaw: walk.yaw || 0, active: true };
    if (walk && walk.pos) return { pos: walk.pos, yaw: walk.yaw || 0, active: false };
    const c = stage.camera;
    return { pos: c.position, yaw: Math.atan2(c.position.x - orbit.target.x, c.position.z - orbit.target.z), active: false };
  }
  function drawMinimap() {
    if (!mctx) return;
    S.mmCount = (S.mmCount || 0) + 1;
    const W = mm.width, H = mm.height, cx = W / 2, cy = H / 2;
    const scale = W / 2 / 132;
    mctx.clearRect(0, 0, W, H);
    /* 底圈 */
    mctx.fillStyle = 'rgba(8,13,19,0.5)';
    mctx.beginPath(); mctx.arc(cx, cy, W / 2 - 1.5, 0, Math.PI * 2); mctx.fill();
    /* 看台环 */
    const rings = [GEO.outerS, TIERS[0].cS1, TIERS[0].s0, TIERS[1].s0, TIERS[2].s0];
    rings.forEach((s, i) => {
      mctx.beginPath();
      mctx.ellipse(cx, cy, (34 + s) * scale, (52.5 + s) * scale, 0, 0, Math.PI * 2);
      mctx.strokeStyle = i === 0 ? 'rgba(232,192,122,.45)' : 'rgba(160,180,200,.2)';
      mctx.lineWidth = i === 0 ? 1.2 : 0.8;
      mctx.stroke();
    });
    /* 看台厚度：三层以极细环带填充 */
    TIERS.forEach((t, i) => {
      mctx.beginPath();
      mctx.ellipse(cx, cy, (34 + t.endS) * scale, (52.5 + t.endS) * scale, 0, 0, Math.PI * 2);
      mctx.ellipse(cx, cy, (34 + t.s0) * scale, (52.5 + t.s0) * scale, 0, 0, Math.PI * 2);
      mctx.fillStyle = ['rgba(201,161,95,.20)', 'rgba(143,182,196,.16)', 'rgba(183,160,196,.14)'][i];
      mctx.fill('evenodd');
    });
    /* 场地 */
    mctx.fillStyle = 'rgba(74,124,63,.62)';
    mctx.fillRect(cx - 34 * scale, cy - 52.5 * scale, 68 * scale, 105 * scale);
    mctx.strokeStyle = 'rgba(235,245,235,.6)'; mctx.lineWidth = 0.9;
    mctx.strokeRect(cx - 34 * scale, cy - 52.5 * scale, 68 * scale, 105 * scale);
    mctx.beginPath(); mctx.arc(cx, cy, 9.15 * scale, 0, Math.PI * 2); mctx.stroke();
    mctx.beginPath(); mctx.moveTo(cx - 34 * scale, cy); mctx.lineTo(cx + 34 * scale, cy); mctx.stroke();
    /* 主入口券洞 */
    [0, 0.25, 0.5, 0.75].forEach((u) => {
      const a = u * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(a) * (34 + GEO.outerS) * scale;
      const py = cy + Math.sin(a) * (52.5 + GEO.outerS) * scale;
      mctx.beginPath(); mctx.arc(px, py, 2, 0, Math.PI * 2);
      mctx.fillStyle = 'rgba(232,192,122,.85)'; mctx.fill();
    });
    /* 徽章 / 任务点 */
    const pts = badgeSource().map((b) => ({ p: b.pos, taken: b.taken }));
    pts.forEach((b) => {
      if (b.taken) return;
      const x = cx + b.p[0] * scale, y = cy + b.p[2] * scale;
      mctx.beginPath(); mctx.arc(x, y, 2.6, 0, Math.PI * 2);
      mctx.fillStyle = '#ffd27a'; mctx.fill();
      mctx.beginPath(); mctx.arc(x, y, 5.4, 0, Math.PI * 2);
      mctx.strokeStyle = 'rgba(255,210,122,.4)'; mctx.lineWidth = 0.8; mctx.stroke();
    });
    /* 当前目标（光柱位置）——最高优先级，永远显示 */
    const ov = window.__objectives;
    if (ov && ov.target) {
      const tp = ov.target;
      const x = cx + tp.x * scale, y = cy + tp.z * scale;
      mctx.save();
      mctx.translate(x, y);
      mctx.rotate(Math.PI / 4);
      mctx.fillStyle = '#6fd3e0';
      mctx.fillRect(-3.2, -3.2, 6.4, 6.4);
      mctx.restore();
      mctx.beginPath(); mctx.arc(x, y, 8.5, 0, Math.PI * 2);
      mctx.strokeStyle = 'rgba(111,211,224,.85)'; mctx.lineWidth = 1.2; mctx.stroke();
    }
    /* 玩家 / 相机 */
    const pp = playerPose();
    const px = clamp(cx + pp.pos.x * scale, 4, W - 4);
    const py = clamp(cy + pp.pos.z * scale, 4, H - 4);
    if (pp.active) {
      mctx.save(); mctx.translate(px, py);
      /* 视野扇形（yaw=0 朝 +z 即地图下方） */
      mctx.beginPath(); mctx.moveTo(0, 0);
      const ang = Math.PI / 2 - pp.yaw;
      mctx.arc(0, 0, 20, ang - 0.42, ang + 0.42);
      mctx.closePath();
      mctx.fillStyle = 'rgba(111,211,224,.16)'; mctx.fill();
      mctx.rotate(ang);
      mctx.beginPath(); mctx.moveTo(0, -6); mctx.lineTo(4.4, 4.6); mctx.lineTo(0, 2.2); mctx.lineTo(-4.4, 4.6);
      mctx.closePath(); mctx.fillStyle = '#6fd3e0'; mctx.fill();
      mctx.restore();
    } else {
      /* 俯瞰：用小方块表示相机位置 */
      mctx.fillStyle = 'rgba(232,192,122,.9)';
      mctx.fillRect(px - 2.5, py - 2.5, 5, 5);
      mctx.strokeStyle = 'rgba(232,192,122,.35)';
      mctx.beginPath(); mctx.moveTo(px, py);
      mctx.lineTo(cx + orbit.target.x * scale, cy + orbit.target.z * scale);
      mctx.stroke();
    }
    /* 指北 */
    mctx.fillStyle = 'rgba(200,214,228,.6)';
    mctx.font = '8px "JetBrains Mono",monospace';
    mctx.textAlign = 'center'; mctx.fillText('N', cx, 10);
  }

  /* ══════════ 指引箭头（指向当前任务目标，其次最近徽章） ══════════════ */
  function updateGuide() {
    const gName = $('#gName'), gDist = $('#gDist'), gArrow = $('#gArrow');
    if (!gName) return;
    const from = (walk && walk.active && walk.pos) ? walk.pos : (stage.camera ? stage.camera.position : orbit.target);

    /* ① 优先：任务系统的当前目标（3D 光柱位置） */
    const ov = window.__objectives;
    if (ov && ov.target && ov.current) {
      const cur = ov.current;
      const tp = ov.target;
      const d = Math.hypot(tp.x - from.x, tp.y - from.y, tp.z - from.z);
      setText(gName, cur.name || '下一目标');
      setText(gDist, d > 999 ? (d / 1000).toFixed(2) + ' km' : Math.round(d) + ' m');
      const cam = stage.camera;
      const dirCam = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      const dirTo = new THREE.Vector3(tp.x - from.x, 0, tp.z - from.z);
      const ang = Math.atan2(dirTo.x, dirTo.z) - Math.atan2(dirCam.x, dirCam.z);
      gArrow && (gArrow.style.transform = `rotate(${-ang * 180 / Math.PI}deg)`);
      return;
    }

    /* ② 降级：最近的未收集徽章 */
    let best = null, bd = Infinity;
    badgeSource().forEach((b) => {
      if (b.taken || !b.obj) return;
      const d = from.distanceTo(b.obj.position);
      if (d < bd) { bd = d; best = b; }
    });
    const todo = S.quests.find((q) => !q.done);
    if (!best) {
      setText(gName, todo ? todo.name : '全部徽章已收集');
      setText(gDist, todo ? '按任务前往' : '✓');
      return;
    }
    setText(gName, best.name);
    setText(gDist, bd > 999 ? (bd / 1000).toFixed(2) + ' km' : bd.toFixed(0) + ' m');
    const cam = stage.camera;
    const dirCam = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const dirTo = best.obj.position.clone().sub(from);
    const ang = Math.atan2(dirTo.x, dirTo.z) - Math.atan2(dirCam.x, dirCam.z);
    gArrow && (gArrow.style.transform = `rotate(${-ang * 180 / Math.PI}deg)`);
  }

  /* ══════════ 徽章收集 / 任务判定 ══════════════
     游戏层接管徽章时，这里只做 UI 同步；否则用本地降级集自收。 */
  function tickCollect(dt, t) {
    if (!gameOwnsBadges()) {
      const from = (walk && walk.active) ? walk.pos : stage.camera.position;
      badgeMap.forEach((b) => {
        if (b.taken) return;
        b.obj.rotation.y += dt * 0.9;
        b.obj.position.y = b.def.pos[1] + Math.sin(t * 1.4 + b.def.pos[0]) * 0.18;
        b.obj.scale.setScalar(1 + Math.sin(t * 2.2) * 0.06);
        const d = from.distanceTo(b.obj.position);
        if (d < 14) {
          b.taken = true;
          b.obj.visible = false;
          addScore(24, '收集徽章');
          if (fx && fx.flash && motionOK()) fx.flash('#ffd27a', 0.18);
          syncBadgeRow();
          toast('收集到建筑徽章', `${b.def.name} · ${b.def.desc}（${S.badgesFound}/${S.badgesTotal}）`, 'gold');
          say('收集徽章：' + b.def.name);
        }
      });
    }
    /* 与游戏层保持一致：徽章计数变化时刷新 */
    const n = badgeSource().filter((b) => b.taken).length;
    if (n !== S.badgesFound) { S.badgesFound = n; syncBadgeRow(); }
  }

  /* ══════════ 照片模式 ══════════════ */
  const photoBar = $('#photoBar');
  function photoMode(on) {
    S.photo = !!on;
    document.body.classList.toggle('photo', S.photo);
    photoBar.hidden = !S.photo;
    setOn($('#btnPhoto'), S.photo);
    const sb = sheetModes.querySelector('[data-mode="photo"]');
    sb && sb.classList.toggle('on', S.photo);
    if (S.photo) {
      openPanel(null);
      sheet.classList.remove('on');
      toast('照片模式', '调整曝光/焦距后点击「保存 PNG」', 'plain');
      say('进入照片模式');
      const f = $('#rgExposure'); f && f.focus({ preventScroll: true });
    } else {
      S.photoHide = false;
      document.body.classList.remove('photo-hide');
      setOn($('#btnPhotoHide'), false);
      applyFilter('none');
      say('退出照片模式');
    }
  }
  $('#btnPhoto').addEventListener('click', () => photoMode(!S.photo));
  $('#btnPhotoExit').addEventListener('click', () => photoMode(false));
  function applyFilter(f) {
    S.filter = f;
    document.body.classList.forEach((c) => { if (c.startsWith('photo-filter-')) document.body.classList.remove(c); });
    if (f !== 'none') document.body.classList.add('photo-filter-' + f);
    $$('#pFilters button').forEach((b) => {
      const on = b.dataset.filter === f;
      b.classList.toggle('on', on);
      setAttr(b, 'aria-pressed', on ? 'true' : 'false');
    });
  }
  $('#pFilters').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-filter]');
    if (!b) return;
    const f = b.dataset.filter;
    /* 胶片滤镜需 Lv.3 解锁 */
    if (f !== 'none' && !unlocked('film')) {
      toast('胶片滤镜未解锁', '达到 Lv.3 解锁「胶片滤镜」与构图评分', 'plain');
      return;
    }
    applyFilter(f);
  });
  $('#rgExposure').addEventListener('input', (e) => {
    const v = +e.target.value;
    setText($('#expoVal'), v.toFixed(1));
    if (fx) fx.exposureBoost = 1 + v;
  });
  $('#rgFocal').addEventListener('input', (e) => {
    const f = +e.target.value;
    setText($('#focalVal'), f + 'mm');
    const cam = stage.camera;
    if (cam && cam.isPerspectiveCamera) {
      if (S._fov0 == null) S._fov0 = cam.fov;
      cam.fov = clamp(S._fov0, 20, 70);
      cam.updateProjectionMatrix();
      /* 用 dist 模拟长焦压缩 */
      orbit.tDist = clamp(orbit.tDist * (f > 42 ? 1.008 : 0.992), orbit.minDist, orbit.maxDist);
    }
  });
  $('#rgAperture').addEventListener('input', (e) => {
    const v = +e.target.value;
    setText($('#apertureVal'), 'f/' + (v < 10 ? v.toFixed(1) : Math.round(v)));
    if (fx && fx.bloom) fx.bloom.strength = clamp(0.9 / Math.sqrt(v), 0.1, 0.9);
  });
  $('#btnPhotoHide').addEventListener('click', () => {
    S.photoHide = !S.photoHide;
    document.body.classList.toggle('photo-hide', S.photoHide);
    setOn($('#btnPhotoHide'), S.photoHide);
  });
  $('#btnSnap').addEventListener('click', () => {
    try {
      stage.renderer.render(stage.scene, stage.camera);
      const url = stage.canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `tidal-arena-${Date.now()}.png`;
      a.click();
      toast('照片已保存', 'PNG 已下载到本地', 'green');
      say('照片已保存');
      completeQuest('q6');
    } catch (e) {
      toast('保存失败', String(e && e.message || e), 'red');
    }
  });

  /* ══════════ setMobile ══════════════ */
  function setMobile(on) {
    S.mobile = !!on;
    document.body.classList.toggle('is-mobile', S.mobile);
    if (!S.mobile) {
      openPanel(null);
      sheet.classList.remove('on');
      if (S.walk) showTouchLook(false);
    }
  }
  function getLayout() {
    const w = window.innerWidth;
    const colL = $('#colLeft'), colR = $('#colRight');
    const viz = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 1 && r.height > 1 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05;
    };
    return {
      mode: w >= 1280 ? 'three-col' : w >= 768 ? 'rail' : 'mobile',
      width: w, height: window.innerHeight,
      leftRail: viz($('#railLeft')), rightRail: viz($('#railRight')),
      leftCol: viz(colL), rightCol: viz(colR),
      drawer: S.drawer,
      leftDrawerOpen: colL ? colL.classList.contains('open') : false,
      rightDrawerOpen: colR ? colR.classList.contains('open') : false,
      bottomBar: viz($('.bottom')),
      mobileBar: viz($('#mobBar')),
      minimap: viz($('.mmwrap')),
      photo: S.photo, mobile: S.mobile,
      panels: $$('.panel').filter(viz).map((p) => p.id),
      photoBar: viz(photoBar),
    };
  }

  /* ══════════ 键盘 ══════════════ */
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
      if (e.code === 'Escape') t.blur();
      return;
    }
    if (t && t.closest && t.closest('.sheet.on')) {
      if (e.code === 'Escape') closeSheets();
      return;
    }
    const k = e.code;
    if (k === 'KeyN') $('#btnEnv').click();
    if (k === 'KeyM') { const o = ['material', 'white', 'xray']; setMat(o[(o.indexOf(S.mat) + 1) % 3]); }
    if (k === 'KeyE') setExplode(S.exploded < 0.5 ? 1 : 0);
    if (k === 'KeyX') setSection(!S.section);
    if (k === 'KeyV') { goShot(null); setView('plan'); }
    if (k === 'KeyH') openSheet('#help', !$('#help').classList.contains('on'));
    if (k === 'KeyB') toggleBrief();
    if (k === 'KeyP') toggleTour();
    if (k === 'KeyC') photoMode(!S.photo);
    if (k === 'KeyF') { if (S.walk) stopWalk(); else if (S.sel) focusSel(); else startWalk(); }
    if (k === 'Escape') {
      if (S.brief) toggleBrief(false);
      else if (S.drawer) openPanel(null);
      else if (sheet.classList.contains('on')) sheet.classList.remove('on');
      else if (S.walk) stopWalk();
      else if (S.photo && !S.photoHide) photoMode(false);
      else { closeSheets(); clearSel(); }
    }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= SHOTS.length) goShot(SHOTS[n - 1].id);
  });

  /* ══════════ 尺寸变化 ══════════════ */
  let lastW = 0;
  function onResize() {
    const w = window.innerWidth;
    if (w === lastW) return;
    const crossed = (lastW < 1280 && w >= 1280) || (lastW >= 1280 && w < 1280) || (lastW < 768 && w >= 768) || (lastW >= 768 && w < 768);
    lastW = w;
    if (crossed) {
      /* 跨档：关闭抽屉，重置为默认布局 */
      const colL = $('#colLeft'), colR = $('#colRight');
      colL.classList.remove('open'); colR.classList.remove('open');
      mask.classList.remove('on');
      S.drawer = null;
      $$('.ritem').forEach((b) => { b.classList.remove('active'); setAttr(b, 'aria-expanded', 'false'); });
    }
    setMobile(w < 768);
    setTimeout(() => { drawMinimap(); }, 60);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 200));

  /* ══════════ 每帧 / 节流更新 ══════════════ */
  const roFps = $('#roFps'), roDist = $('#roDist');
  function updateReadout(fps) {
    /* 只写变化项；100ms 节流 */
    const f = Math.round(fps);
    setText(roFps, f);
    if (roFps) {
      const cl = f >= 50 ? '' : f >= 35 ? 'warn' : 'bad';
      if (roFps._cl !== cl) { roFps._cl = cl; roFps.className = cl; }
    }
    if (S.walk || (walk && walk.active)) setText(roDist, Math.round(stage.camera.position.y) + 'm↑');
    else setText(roDist, Math.round(orbit.dist) + 'm');
  }
  function updateHud2() {
    /* 10Hz：疏散 / 建造 / 小地图 */
    drawMinimap();
    updateGuide();
    /* 疏散读数 */
    const st = flowState();
    const p = clamp(st.out / Math.max(1, st.total), 0, 1);
    setText($('#flOut'), fmt(st.out));
    setText($('#flLeft'), fmt(Math.max(0, st.total - st.out)));
    const mm = Math.floor(st.t / 60), ss = Math.floor(st.t % 60);
    setText($('#flTime'), `${mm}:${String(ss).padStart(2, '0')}`);
    const fill = $('#flowFill');
    if (fill) fill.style.width = (p * 100).toFixed(1) + '%';
    const bar = $('#flowBar');
    if (bar) setAttr(bar, 'aria-valuenow', Math.round(p * 100));
    setText($('#flowPct'), st.done ? '疏散完成' : st.run ? (st.paused ? '已暂停' : '进行中 ' + Math.round(p * 100) + '%') : (st.t > 0 ? '暂停中' : '待启动'));
    setText($('#flScore'), st.score != null ? '评分 ' + st.score : (st.done ? '评分 —' : '评分 —'));
    setOn(flowBtn, st.run && !st.paused);
    setText(flowBtn, st.run && !st.paused ? '暂停演练' : (st.done ? '重新演练' : (st.t > 0 ? '继续演练' : '开始演练')));
    if (flowPause) flowPause.disabled = !st.run;
    syncDispatch();
    /* 罗盘 + 玩家坐标 */
    const pose = playerPose();
    let yawDeg = pose.active ? (-pose.yaw * 180 / Math.PI) : (Math.atan2(stage.camera.position.x - orbit.target.x, stage.camera.position.z - orbit.target.z) * 180 / Math.PI);
    yawDeg = ((yawDeg % 360) + 360) % 360;
    const dial = $('#compassDial');
    if (dial) dial.style.transform = `rotate(${-yawDeg.toFixed(0)}deg)`;
    setText($('#mmPos'), `X ${pose.pos.x.toFixed(0)} · Z ${pose.pos.z.toFixed(0)}`);
    setText($('#mmYaw'), String(Math.round(yawDeg)).padStart(3, '0') + '°');
    setText($('#mmState'), S.walk ? '漫游' : (S.view === 'persp' ? '俯瞰' : '二维'));
    /* 选中构件信息卡跟随 */
    if (S.sel && !hintCard.hidden) {
      const e = arena.ents && arena.ents[S.sel];
      if (e) setHTML($('#hcData'),
        `<span>构件 ID</span><i>${S.sel}</i>`
        + `<span>所属图层</span><i>${S.layer[S.sel] ? S.sel : '—'}</i>`
        + `<span>构件类型</span><i>${e.mesh && e.mesh.isInstancedMesh ? '实例化阵列' : (e.mesh && e.mesh.isMesh ? '网格实体' : '组件')}</i>`
        + `<span>可见</span><i>${(e.mesh && e.mesh.visible === false) || e.hidden ? '隐藏' : '显示'}</i>`);
    }
  }

  function update(dt, t, fps) {
    /* 低帧率自适应（可关闭） */
    if (S.autoQuality && !S._qBusy) {
      S._qSample = (S._qSample || 0) + dt;
      if (S._qSample > 2.5) {
        S._qSample = 0;
        S._slow = fps < 38 ? (S._slow || 0) + 1 : 0;
        if (S._slow >= 3 && S.quality !== 'low') {
          S._slow = 0;
          setQuality(S.quality === 'high' ? 'mid' : 'low');
          toast('已自动降低画质', '性能自适应：优先保证流畅', 'plain');
        }
      }
    }
    tickEnv(dt);
    tickCollect(dt, t);
    applyJoy(dt);
    updateFlow(dt);
    if (S.build.playing) {
      const nv = S.build.v + dt * 14;
      applyBuild(nv >= 100 ? 100 : nv, nv < 100);
      if (nv >= 100) { S.build.playing = false; setOn($('#btnBuildPlay'), false); setText($('#btnBuildPlay'), '▶ 播放建造动画'); toast('建造完成', '五阶段施工动画结束', 'green'); }
    }
    if (S.story) {
      S.storyT = (S.storyT || 0) + dt;
      if (S.storyT > 9) { toggleStory(); }
    }
    S.hudT += dt; S.hud2T += dt; S.mmT += dt;
    if (S.hudT >= 0.1) { S.hudT = 0; updateReadout(fps); }
    if (S.hud2T >= 0.1) { S.hud2T = 0; updateHud2(); }
    /* 照片模式：实时构图评分（Lv.3 解锁） */
    if (S.photo && unlocked('film')) {
      S.psT = (S.psT || 0) + dt;
      if (S.psT > 0.3) {
        S.psT = 0;
        try {
          const sc = window.__photo && window.__photo.score && window.__photo.score();
          if (sc) {
            setText($('#psVal'), String(sc.total));
            setText($('#psGrade'), '评级 ' + sc.grade);
            setText($('#psBest'), '最高 ' + (window.__photo.best || 0));
          }
        } catch (e) { /* 评分失败不阻塞 */ }
      }
    }
    if (fx && fx.exposureBoost != null && S.photo && S.photoHide) { /* 保持照片曝光 */ }
    /* 移动端：拖拽面板下拉关闭（上滑手势） */
  }

  /* ══════════ postBoot ══════════════ */
  /* ══════════ 开场任务简报 ══════════ */
  const briefEl = $('#briefing');
  function syncBriefObj() {
    const ov = window.__objectives;
    const cur = ov && ov.current;
    const q0 = S.quests.find((q) => !q.done);
    const name = (cur && cur.name) || (q0 && q0.name) || '探索潮汐场';
    const desc = (cur && cur.desc) || (q0 && q0.desc) || '按 F 进入第一人称漫游，跟着光柱走';
    setText($('#briefObj'), name);
    setText($('#briefDesc'), desc);
  }
  function toggleBrief(on) {
    if (!briefEl) return false;
    const want = (on === undefined) ? !S.brief : !!on;
    S.brief = want;
    briefEl.hidden = !want;
    if (want) {
      syncBriefObj();
      const b = $('#briefGo'); b && b.focus({ preventScroll: true });
    }
    return want;
  }
  if (briefEl) {
    $('#briefGo') && $('#briefGo').addEventListener('click', () => {
      toggleBrief(false);
      if (!S.walk) startWalk();
      else toast('已在漫游中', '跟着青色光柱前往当前目标', 'plain');
    });
    $('#briefSkip') && $('#briefSkip').addEventListener('click', () => {
      toggleBrief(false);
      toast('已跳过简报', '按 B 可随时重新打开任务简报', 'plain');
    });
    briefEl.addEventListener('click', (e) => { if (e.target === briefEl) toggleBrief(false); });
    $('#btnBrief') && $('#btnBrief').addEventListener('click', () => toggleBrief());
  }
  document.addEventListener('objective:changed', () => { if (S.brief) syncBriefObj(); });

  function postBoot() {
    bindDay();
    buildScenChips();
    buildContestPanel();
    /* 世界层通常晚于 UI 就绪（initWorld 延迟导入），等它就绪再填一次 */
    document.addEventListener('game:ready', () => { buildScenChips(); buildContestPanel(); });
    ['game:changed', 'insight:found', 'stamps:changed'].forEach((ev) => {
      document.addEventListener(ev, () => syncContest());
    });
    setXP(S.score, S.level);
    onResize();
    drawMinimap();
    applyLayers();
    applyBuild(100, true);
    S.capAnim = true;
    rollCap(0, capTotal, 1100);
    if (S.quality) setQuality(stage && stage.quality ? stage.quality : S.quality);
    setTimeout(() => {
      const mobile = window.innerWidth < 768;
      toast('欢迎来到潮汐场', mobile ? '点底部按钮打开面板 · 右下角「漫游」进入场内' : '按 F 漫游 · P 导览 · H 说明 · C 照片模式', 'gold');
    }, 700);
    /* 首次进入：弹出任务简报（可跳过，按 B 重开） */
    let seen = false;
    try { seen = localStorage.getItem('tidal_brief_seen') === '1'; } catch (e) { /* 隐私模式 */ }
    if (!seen) {
      setTimeout(() => {
        toggleBrief(true);
        try { localStorage.setItem('tidal_brief_seen', '1'); } catch (e) { /* 忽略 */ }
      }, 620);
    }
    /* 游戏层事件（T3）：任务/等级变化时同步任务面板 */
    document.addEventListener('game:changed', () => { syncQuestsFromGame(); syncXPFromGame(); });
    document.addEventListener('game:mission', (e) => {
      const d = e.detail || {};
      if (d.name) { toast('任务完成', `${d.name}${d.reward ? ' · +' + d.reward + ' 积分' : ''}`, 'gold'); say('任务完成：' + d.name); }
    });
    document.addEventListener('game:levelup', (e) => {
      const d = e.detail || {};
      showLevelUp((d && d.level) || S.level + 1);
      const un = (d && d.unlocks) || [];
      if (un.length) {
        setTimeout(() => {
          un.forEach((u) => {
            toast('解锁新能力', `${u.name} · ${u.desc || ''}`, 'gold');
            say('解锁：' + u.name);
          });
        }, 900);
      }
    });
    drawMinimap();
  }

  /* 初始化一次 */
  syncQuestsFromGame();
  setXP(S.score, S.level);
  applyLayers();
  setEnv('night');
  setExplode(0);
  applyBuild(100, true);
  setFlowMode();
  setMobile(window.innerWidth < 768);
  lastW = window.innerWidth;
  if (window.innerWidth < 1280) { /* 抽屉默认关闭 */ }

  return {
    /* ── 既有契约（只增不减） ── */
    update, toast, INTRO, goShot, setEnv, postBoot, S,
    setMat, setExplode, setSection,
    /* ── 本轮新增 ── */
    setLayer, openPanel, setMobile, photoMode, getLayout, toggleBrief, syncBriefObj,
    /* ── v4 新增 ── */
    syncContest, syncFlowMeta, buildContestPanel, buildScenChips, syncDay,
    /* ── 内部复用 ── */
    setView, startWalk, stopWalk, completeQuest, addScore, drawMinimap, applyLayers,
    setQuality, setReduceMotion, applyBuild, startFlow, resetFlow, focusSel,
  };
}
