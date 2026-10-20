/* ═══════════════════════════════════════════════════════════════════════
   audio.js — 纯 WebAudio 程序化环境音（SPEC 3.5）
   · 默认关闭；enable() 才创建 AudioContext（需用户手势）
   · 8 万人场馆底噪（粉红噪声 + 低通 + 慢速涌动）+ 偶发哨声 + 提示音
   · 无外部音频资源，全部由噪声缓冲与振荡器合成
   对外：window.__audio = {enable, disable, enabled, sfx, setVolume}
   任何浏览器不支持 / 被拒绝时静默降级，绝不抛错。
   ═══════════════════════════════════════════════════════════════════════ */

export function createAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  const S = { enabled: false, ctx: null, master: null, volume: 0.55, nodes: [], timer: 0, ready: false };

  function noiseBuffer(ctx, seconds = 4) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      /* 简易粉红化（一阶低通混合） */
      last = last * 0.94 + white * 0.06;
      d[i] = last * 3.2 + white * 0.06;
    }
    /* 首尾淡入淡出，避免循环爆音 */
    const fade = Math.min(2000, Math.floor(len / 10));
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[i] *= k;
      d[len - 1 - i] *= k;
    }
    return buf;
  }

  function buildCrowd(ctx, dest) {
    const buf = noiseBuffer(ctx, 5);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 620;
    lp.Q.value = 0.6;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500;
    bp.Q.value = 0.7;

    const g = ctx.createGain();
    g.gain.value = 0.5;

    /* 慢速涌动：LFO 调制低通频率，模拟人浪起伏 */
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const depth = ctx.createGain();
    depth.gain.value = 220;
    lfo.connect(depth).connect(lp.frequency);

    src.connect(lp).connect(g).connect(dest);
    src.connect(bp);
    bp.connect(dest);
    lfo.start(0);
    src.start(0);
    return [src, lfo, g];
  }

  function ctxOk() {
    if (!AC) return null;
    if (!S.ctx) {
      try {
        S.ctx = new AC();
        S.master = S.ctx.createGain();
        S.master.gain.value = 0;
        S.master.connect(S.ctx.destination);
      } catch (e) { S.ctx = null; return null; }
    }
    return S.ctx;
  }

  function enable() {
    const ctx = ctxOk();
    if (!ctx) return false;
    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch (e) { /* 忽略 */ }
    if (!S.ready) {
      try {
        S.nodes = buildCrowd(ctx, S.master || ctx.destination);
        S.ready = true;
      } catch (e) { S.nodes = []; }
      /* 偶发哨声 / 欢呼脉冲 */
      try {
        S.timer = setInterval(() => {
          if (!S.enabled) return;
          const r = Math.random();
          if (r < 0.45) sfx('whistle'); else if (r < 0.8) sfx('roar');
        }, 9000);
      } catch (e) { /* 忽略 */ }
    }
    S.enabled = true;
    try {
      S.master.gain.cancelScheduledValues(S.ctx.currentTime);
      S.master.gain.setTargetAtTime(S.volume, S.ctx.currentTime, 0.6);
    } catch (e) { /* 忽略 */ }
    /* 同步 HUD 的喇叭按钮状态 */
    try {
      const btn = document.getElementById('btnSound');
      if (btn) { btn.setAttribute('aria-pressed', 'true'); }
      const tg = document.getElementById('tgSound');
      if (tg) { tg.setAttribute('aria-checked', 'true'); }
    } catch (e) { /* 忽略 */ }
    return true;
  }

  function disable() {
    S.enabled = false;
    try {
      if (S.ctx && S.master) {
        S.master.gain.cancelScheduledValues(S.ctx.currentTime);
        S.master.gain.setTargetAtTime(0, S.ctx.currentTime, 0.35);
      }
      if (S.ctx && S.ctx.state === 'running') S.ctx.suspend().catch(() => {});
    } catch (e) { /* 忽略 */ }
    try { clearInterval(S.timer); S.timer = 0; } catch (e) { /* 忽略 */ }
    try {
      const btn = document.getElementById('btnSound');
      if (btn) btn.setAttribute('aria-pressed', 'false');
      const tg = document.getElementById('tgSound');
      if (tg) tg.setAttribute('aria-checked', 'false');
    } catch (e) { /* 忽略 */ }
    return false;
  }

  function toggle() { return S.enabled ? disable() : enable(); }
  function setVolume(v) { S.volume = Math.max(0, Math.min(1, +v || 0)); if (S.enabled) enable(); return S.volume; }

  /* ── 程序化音效 ── */
  function sfx(kind = 'click') {
    if (!S.enabled) return false;
    const ctx = S.ctx;
    if (!ctx) return false;
    const t0 = ctx.currentTime;
    try {
      if (kind === 'badge' || kind === 'levelup') {
        const notes = kind === 'badge' ? [880, 1174.7, 1568] : [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = f;
          const at = t0 + i * (kind === 'badge' ? 0.075 : 0.1);
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
          o.connect(g).connect(S.master);
          o.start(at); o.stop(at + 0.55);
        });
        return true;
      }
      if (kind === 'whistle' || kind === 'roar') {
        const len = kind === 'whistle' ? 0.35 : 1.2;
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = kind === 'whistle' ? 2600 : 900;
        f.Q.value = kind === 'whistle' ? 8 : 1.2;
        const g = ctx.createGain();
        g.gain.value = kind === 'whistle' ? 0.1 : 0.3;
        src.connect(f).connect(g).connect(S.master);
        src.start(t0);
        return true;
      }
      /* 默认：短促点击 */
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = 420;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      o.connect(g).connect(S.master);
      o.start(t0); o.stop(t0 + 0.18);
    } catch (e) { return false; }
    return true;
  }

  const api = {
    enable, disable, toggle, sfx, setVolume,
    get enabled() { return S.enabled; },
    get volume() { return S.volume; },
    get supported() { return !!AC; },
  };
  window.__audio = api;
  return api;
}

export default createAudio;
