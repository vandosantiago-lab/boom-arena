// ===================== ÁUDIO =====================
const Au = {
  ctx: null, on: true, vib: true, master: null, noise: null, lastBoom: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => { }); return; }
    try { const AC = window.AudioContext || window.webkitAudioContext; this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination); const n = this.ctx.sampleRate, b = this.ctx.createBuffer(1, n, n), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noise = b; } catch (e) { this.ctx = null; }
  },
  tone(f0, f1, dur, type, vol, delay = 0) { const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02); },
  nz(dur, f0, f1, vol, delay = 0) { const c = this.ctx, t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; f.type = 'lowpass'; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random() * 0.4, dur + 0.05); },
  play(name, v = 1) {
    if (!this.on || !this.ctx || Game.mode === 'attract') return;
    try {
      if (name === 'boom') { const n = performance.now(); if (n - this.lastBoom < 50) return; this.lastBoom = n; this.nz(0.7, 2400, 90, 0.9 * v); this.tone(120, 36, 0.5, 'sine', 0.9 * v); }
      else if (name === 'place') this.tone(210, 110, 0.09, 'triangle', 0.35 * v);
      else if (name === 'pick') { this.tone(660, 990, 0.09, 'square', 0.16 * v); this.tone(990, 1480, 0.12, 'square', 0.16 * v, 0.08); }
      else if (name === 'die') { this.tone(520, 70, 0.6, 'sawtooth', 0.28 * v); this.nz(0.3, 1800, 200, 0.3 * v); }
      else if (name === 'beep') this.tone(520, 520, 0.14, 'square', 0.2 * v);
      else if (name === 'go') this.tone(880, 1040, 0.35, 'square', 0.24 * v);
      else if (name === 'win') [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.22, 'square', 0.2 * v, i * 0.13));
      else if (name === 'lose') [392, 330, 262].forEach((f, i) => this.tone(f, f * 0.97, 0.26, 'triangle', 0.25 * v, i * 0.17));
      else if (name === 'abil') { this.nz(0.22, 600, 4200, 0.3 * v); this.tone(300, 720, 0.16, 'triangle', 0.2 * v); }
      else if (name === 'tele') this.tone(300, 1500, 0.25, 'sine', 0.3 * v);
      else if (name === 'thud') this.tone(90, 40, 0.18, 'sine', 0.7 * v);
      else if (name === 'click') this.tone(700, 500, 0.05, 'square', 0.12 * v);
      else if (name === 'emo') this.tone(880, 1320, 0.1, 'sine', 0.2 * v);
      else if (name === 'crack') { if (this.gate('crack', 70)) return; this.nz(0.16, 3200, 500, 0.32 * v); this.tone(180, 70, 0.1, 'square', 0.12 * v); }
      else if (name === 'spark') { if (this.gate('spark', 120)) return; this.tone(1320, 1980, 0.08, 'sine', 0.14 * v); this.tone(1980, 2640, 0.1, 'sine', 0.1 * v, 0.06); }
      else if (name === 'clang') { this.tone(1240, 1180, 0.3, 'square', 0.13 * v); this.tone(1870, 1800, 0.25, 'square', 0.09 * v); this.nz(0.08, 6000, 2000, 0.2 * v); }
      else if (name === 'kick') { if (this.gate('kick', 120)) return; this.tone(160, 55, 0.12, 'sine', 0.6 * v); this.nz(0.05, 2500, 800, 0.25 * v); }
      else if (name === 'whoosh') { this.nz(0.32, 500, 3800, 0.3 * v); this.tone(420, 880, 0.3, 'sine', 0.1 * v); }
      else if (name === 'shing') { if (this.gate('shing', 400)) return; this.nz(0.14, 9000, 3000, 0.16 * v); this.tone(2400, 1500, 0.12, 'sawtooth', 0.05 * v); }
      else if (name === 'alarm') [0, 0.32, 0.64].forEach(d => { this.tone(880, 880, 0.15, 'square', 0.2 * v, d); this.tone(660, 660, 0.15, 'square', 0.2 * v, d + 0.16); });
      else if (name === 'step') this.nz(0.035, 900, 300, 0.07 * v);
      else if (name === 'tick') this.tone(1500, 1500, 0.03, 'square', 0.08 * v);
    } catch (e) { }
  },
  gate(k, ms) { const n = performance.now(), g = this._g || (this._g = {}); if (n - (g[k] || 0) < ms) return true; g[k] = n; return false; },
  buzz(ms) { if (!this.vib) return; try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { } },
};

// Música: trilha chiptune original, gerada na hora
const Mu = {
  on: true, playing: false, timer: 0, next: 0, step: 0, g: null,
  LEAD: [76, 79, 84, 79, 76, 79, 84, 0, 74, 79, 83, 79, 74, 79, 83, 0, 72, 76, 81, 76, 72, 76, 81, 79, 77, 81, 84, 81, 79, 77, 76, 74, 76, 0, 76, 79, 84, 0, 79, 76, 74, 0, 74, 79, 83, 0, 79, 74, 77, 81, 84, 89, 88, 84, 81, 77, 79, 83, 86, 91, 0, 86, 83, 79],
  BASS: [48, 43, 45, 41, 48, 43, 41, 43],
  f: m => 440 * Math.pow(2, (m - 69) / 12),
  start() { if (this.playing || !Au.ctx) return; if (!this.g) { this.g = Au.ctx.createGain(); this.g.gain.value = 0.55; this.g.connect(Au.master); } this.playing = true; this.next = Au.ctx.currentTime + 0.08; this.step = 0; this.timer = setInterval(() => this.tick(), 70); },
  stop() { if (!this.playing) return; this.playing = false; clearInterval(this.timer); },
  voice(type, freq, t, dur, vol) { const c = Au.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(this.g); o.start(t); o.stop(t + dur + 0.02); },
  tick() {
    const c = Au.ctx; if (!c || c.state !== 'running') return;
    const d = 60 / ((V.ph === 'play' && V.t <= SHRINK_AT) ? 184 : 148) / 2;
    if (this.next < c.currentTime) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.25) {
      const i = this.step, t = this.next, l = this.LEAD[i], b = this.BASS[i >> 3];
      if (l) this.voice('square', this.f(l), t, d * 0.92, 0.05);
      this.voice('triangle', this.f(b + (i & 1 ? 12 : 0)), t, d * 0.9, 0.13);
      if (i & 1) { const s = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(); s.buffer = Au.noise; hp.type = 'highpass'; hp.frequency.value = 6000; g.gain.setValueAtTime(0.035, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); s.connect(hp); hp.connect(g); g.connect(this.g); s.start(t, Math.random() * 0.5, 0.06); }
      this.next += d; this.step = (i + 1) % 64;
    }
  },
};

// ===================== REDE (salas em tempo real) =====================
const ART_URL = 'https://claude.ai/artifact/C2d8SVBCHgbuGeJdBjc5Zd';
const HOSTED = /*__HOSTED__*/false;
const Net = { room: null, ready: false, chan: null, code: '', myPeer: null, myI: -1, n: 0, lastN: -1, sendT: 0, q: [], qseq: 0, em: [0, 0], lostT: 0, jt: 0, ackEp: -1, lastSent: '', lastSentT: 0, opt: null };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cleanName = n => String(n == null ? '' : n).replace(/[<>&"'`\u0000-\u001f]/g, '').trim().slice(0, 12) || 'Jogador';

async function netInit() {
  if (HOSTED) { Net.room = {}; Net.ready = true; UI.netReady(); return; }
  let c = null; for (let i = 0; i < 50 && !(c = window.claude); i++) await sleep(100);
  try { Net.room = c && c.use ? (await c.use('room')) || null : null; } catch (e) { Net.room = null; }
  Net.ready = true; UI.netReady();
}

function artUrl() { return HOSTED ? location.href.split('#')[0] : ART_URL; }
function peerChan(code, asHost) {
  return new Promise(res => {
    const hid = 'boomarena3d-' + code.toLowerCase(), opts = window.__peerOpts || {}; let done = false;
    let peer; try { peer = asHost ? new Peer(hid, opts) : new Peer(opts); } catch (e) { return res(null); }
    const others = new Map(), rx = new Map(); let mine = {}, conns = [], hc = null, myId = null, hostRx = 0, timer = 0;
    const finish = v => { if (!done) { done = true; res(v); } };
    const flush = () => {
      if (asHost) { const all = {}; all[myId] = mine; for (const [k, v] of others) all[k] = v; for (const c of conns) if (c.open) { try { c.send({ t: 'all', all }); } catch (e) { } } }
      else if (hc && hc.open) { try { hc.send({ t: 'p', p: mine }); } catch (e) { } }
    };
    const chan = {
      presence(p) { const n = Object.assign({}, mine); for (const k in p) { if (p[k] === null) delete n[k]; else n[k] = p[k]; } mine = n; flush(); return Promise.resolve(); },
      peers() { const a = [{ peer: myId, isMe: true, sameTab: true, presence: mine }]; for (const [k, v] of others) a.push({ peer: k, isMe: false, sameTab: false, presence: v }); return a; },
      leave() { clearInterval(timer); try { peer.destroy(); } catch (e) { } return Promise.resolve(); },
    };
    timer = setInterval(() => {
      const now = performance.now();
      if (asHost) { for (const c of conns.slice()) if (now - (rx.get(c.peer) || now) > 9000) { others.delete(c.peer); rx.delete(c.peer); conns = conns.filter(x => x !== c); try { c.close(); } catch (e) { } } flush(); }
      else { if (hostRx && now - hostRx > 7000) others.clear(); flush(); }
    }, 1000);
    peer.on('open', id => {
      myId = id; if (asHost) return finish(chan);
      hc = peer.connect(hid, { serialization: 'json', reliable: true });
      hc.on('open', () => { hostRx = performance.now(); flush(); finish(chan); });
      hc.on('data', d => { hostRx = performance.now(); if (d && d.t === 'all' && d.all) { others.clear(); for (const k in d.all) if (k !== myId) others.set(k, d.all[k]); } });
      hc.on('close', () => others.clear()); hc.on('error', () => { });
    });
    peer.on('connection', c => {
      if (!asHost) return; conns.push(c); rx.set(c.peer, performance.now());
      c.on('data', d => { rx.set(c.peer, performance.now()); if (d && d.t === 'p' && d.p && typeof d.p === 'object') others.set(c.peer, d.p); });
      const drop = () => { others.delete(c.peer); rx.delete(c.peer); conns = conns.filter(x => x !== c); }; c.on('close', drop); c.on('error', drop);
    });
    peer.on('error', e => { Net.lastErr = e && e.type; if (!done) { clearInterval(timer); try { peer.destroy(); } catch (x) { } finish(null); } });
    peer.on('disconnected', () => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) { } });
    setTimeout(() => { if (!done) { Net.lastErr = 'timeout'; clearInterval(timer); try { peer.destroy(); } catch (e) { } finish(null); } }, 14000);
  });
}
async function openChan(code, asHost) {
  if (HOSTED) return peerChan(code, asHost);
  const R = Net.room; if (!R) return null;
  let nr = null; try { nr = await R.join('boom-' + code.toLowerCase()); } catch (e) { nr = null; }
  if (nr) return { presence: p => nr.presence(p).catch(() => { }), peers: () => nr.peers(), leave: () => nr.leave().catch(() => { }) };
  try { await R.presence({ bc: code }); } catch (e) { return null; }
  return { presence: p => R.presence(p).catch(() => { }), peers: () => R.peers().filter(x => x.presence && x.presence.bc === code), leave: () => R.presence({ bc: null, g: null, p: null, q: null, nm: null, ch: null, host: null, jt: null, r: null, e: null, v: null }).catch(() => { }) };
}
function findSelf() { if (!Net.chan) return; for (const p of Net.chan.peers()) if (p.isMe && p.sameTab) { Net.myPeer = p.peer; return; } }
function netLeave() { if (Net.chan) { try { Net.chan.leave(); } catch (e) { } } Net.chan = null; Net.code = ''; Net.myI = -1; Net.lastN = -1; Net.q = []; Net.lastSent = ''; }

function snap() {
  let gr = ''; for (let i = 0; i < N; i++) gr += GCH[V.grid[i]];
  const R = Math.round;
  return {
    n: ++Net.n, ph: V.ph, rnd: V.rnd, ep: V.epoch, map: V.map, t: R(V.t * 10), el: R(V.el * 10), c: V.c | 0, win: V.win, mw: V.mwin, sh: V.sh, ld: V.ld ? [R(V.ld[0] * 10) / 10, R(V.ld[1] * 10) / 10] : 0, df: V.diff, o: [Game.opt.map, Game.opt.bots, Game.opt.size, Game.opt.time, V.wn], gr,
    s: V.slots.map(s => [s.k, s.peer || 0, s.nm, s.ch, s.w, s.al, R(s.x * 100), R(s.y * 100), s.d, s.m, s.maxB, s.range, s.spd, s.shield, s.kick, s.pierce, s.inv, R(s.cd * 10), s.e[0], s.e[1], s.dash ? 1 : 0]),
    b: V.bombs.map(b => [b.id, R(b.x * 100), R(b.y * 100), b.o, R(b.fuse * 10), b.type, b.fly ? [b.fly.fx, b.fly.fy, R(b.fly.p * 100)] : 0]),
    f: V.flames.map(f => [f.id, R(f.ttl * 100), f.x, f.y, f.cells.map(c => String.fromCharCode(97 + c[0], 97 + c[1])).join('')]),
    p: V.pus.map(p => [p.x, p.y, p.type]),
  };
}
function applySnap(g) {
  V.ph = String(g.ph); V.rnd = g.rnd | 0; V.t = g.t / 10; V.el = g.el / 10; V.c = g.c | 0; V.win = g.win | 0; V.mwin = g.mw | 0; V.sh = g.sh | 0; V.ld = Array.isArray(g.ld) ? [+g.ld[0], +g.ld[1]] : null; V.diff = clamp(g.df | 0, 0, 2); Net.opt = Array.isArray(g.o) ? g.o : null; if (Net.opt) V.wn = clamp(Net.opt[4] | 0 || WINS, 1, 9);
  if ((g.map | 0) !== V.map || !V.tiles) { V.map = clamp(g.map | 0, 0, NMAP - 1); V.tiles = mapTiles(V.map); }
  const gr = String(g.gr); for (let i = 0; i < N; i++) { const k = GCH.indexOf(gr[i]); V.grid[i] = k < 0 ? 0 : k; }
  for (let i = 0; i < 4; i++) {
    const a = g.s && g.s[i], s = V.slots[i]; if (!Array.isArray(a)) { s.k = '-'; continue; }
    s.k = a[0] === 'h' || a[0] === 'b' ? a[0] : '-'; s.peer = a[1] || null; s.nm = cleanName(a[2]); s.ch = clamp(a[3] | 0, 0, NCH - 1); s.w = a[4] | 0; s.al = a[5] ? 1 : 0; s.x = a[6] / 100; s.y = a[7] / 100; s.d = a[8] & 3; s.m = a[9] ? 1 : 0;
    s.maxB = a[10] | 0; s.range = a[11] | 0; s.spd = a[12] | 0; s.shield = a[13] | 0; s.kick = a[14] | 0; s.pierce = a[15] | 0; s.inv = a[16] | 0; s.cd = a[17] / 10; s.e = [a[18] | 0, a[19] | 0]; s.dash = a[20] | 0;
  }
  V.bombs = (g.b || []).map(b => ({ id: b[0], x: b[1] / 100, y: b[2] / 100, o: b[3], fuse: b[4] / 10, type: b[5], range: 2, pierce: 0, sl: -1, fly: b[6] ? { fx: b[6][0], fy: b[6][1], p: b[6][2] / 100 } : null }));
  V.flames = (g.f || []).map(f => { const cells = [], s = String(f[4]); for (let i = 0; i + 1 < s.length; i += 2) cells.push([s.charCodeAt(i) - 97, s.charCodeAt(i + 1) - 97]); return { id: f[0], ttl: f[1] / 100, x: f[2], y: f[3], cells }; });
  V.pus = (g.p || []).map(p => ({ x: p[0], y: p[1], type: p[2] }));
  Net.myI = Net.myPeer ? V.slots.findIndex(s => s.k === 'h' && s.peer === Net.myPeer) : -1;
  if ((g.ep | 0) !== V.epoch) {
    V.epoch = g.ep | 0; const m = Game.me, i = Net.myI;
    if (i >= 0) { m.x = SPAWNS[i][0]; m.y = SPAWNS[i][1]; m.d = 0; m.m = 0; m.dashT = 0; m.tl = 0; }
    Net.ackEp = V.epoch; Net.q = [];
  }
}

function netClientPoll(dt) {
  const peers = Net.chan.peers(); let host = null;
  for (const p of peers) { if (p.isMe && p.sameTab) { Net.myPeer = p.peer; continue; } const pr = p.presence; if (pr && pr.host && pr.g && (!host || (+pr.jt || 0) < (+host.presence.jt || 0))) host = p; }
  if (!host) { if (!Net.lostT) Net.lostT = performance.now(); else if (performance.now() - Net.lostT > 5000) { netLeave(); goHome('O anfitrião saiu da sala.'); } return; }
  Net.lostT = 0;
  const g = host.presence.g;
  if (g.n !== Net.lastN) { Net.lastN = g.n; try { applySnap(g); } catch (e) { } }
  for (const s of V.slots) {
    if (s.k !== 'h' || !s.peer || s.peer === Net.myPeer || !s.al) continue;
    const pp = peers.find(q => q.peer === s.peer), pr = pp && pp.presence;
    if (pr && pr.r === V.epoch && Array.isArray(pr.p)) { s.x = clamp(pr.p[0] / 100, 0, GW - 1); s.y = clamp(pr.p[1] / 100, 0, GH - 1); s.d = pr.p[2] & 3; s.m = pr.p[3] ? 1 : 0; s.dash = pr.p[4] ? 1 : 0; }
  }
}
function netClientSend(dt) {
  Net.sendT -= dt; Net.lastSentT += dt; if (Net.sendT > 0) return; Net.sendT = 1 / 15;
  const m = Game.me, o = { v: 1, p: [Math.round(m.x * 100), Math.round(m.y * 100), m.d, m.m, m.dashT > 0 ? 1 : 0], r: Net.ackEp, q: Net.q, e: Net.em, nm: Game.name, ch: Game.ch, jt: Net.jt };
  const js = JSON.stringify(o); if (js === Net.lastSent && Net.lastSentT < 1) return; Net.lastSent = js; Net.lastSentT = 0; Net.chan.presence(o);
}
function netHostPoll() {
  const peers = Net.chan.peers();
  for (const s of V.slots) {
    if (s.i === 0 || s.k !== 'h') continue;
    const pp = peers.find(q => q.peer === s.peer), pr = pp && pp.presence;
    if (!pp) { if (!s._gone) s._gone = performance.now(); if (performance.now() - s._gone > 5000) { s.k = 'b'; s.peer = null; s.nm = (s.nm + ' (bot)').slice(0, 18); s.bot = { t: 0, path: [], goal: -1 }; s.dash = 0; s.dashT = 0; } continue; }
    s._gone = 0; if (!pr) continue;
    if (pr.r !== V.epoch) { s._ack = -1; continue; }
    const q = Array.isArray(pr.q) ? pr.q : [];
    if (s._ack !== V.epoch) { s._ack = V.epoch; s._lastQ = 0; s._eSeq = -1; for (const e of q) if (Array.isArray(e) && e[0] > s._lastQ) s._lastQ = e[0]; }
    if (s.al && Array.isArray(pr.p)) { const x = pr.p[0] / 100, y = pr.p[1] / 100; if (x >= 0 && y >= 0 && x <= GW - 1 && y <= GH - 1) { s.x = x; s.y = y; } s.d = pr.p[2] & 3; s.m = pr.p[3] ? 1 : 0; s.dash = pr.p[4] ? 1 : 0; }
    for (const e of q) if (Array.isArray(e) && e[0] > s._lastQ) { s._lastQ = e[0]; if (e[1] === 'b') reqBomb(s.i, e[2], e[3]); else reqAbility(s.i, e[1] === 'p' ? 'p' : 'a', e[2], e[3], e[4] | 0); }
    if (Array.isArray(pr.e) && pr.e[0] !== s._eSeq) { if (s._eSeq !== undefined && s._eSeq !== -1) s.e = [s.e[0] + 1, pr.e[1] & 3]; s._eSeq = pr.e[0]; }
  }
}
function netHostSend(dt) {
  Net.sendT -= dt; if (Net.sendT > 0) return; Net.sendT = V.ph === 'lobby' || V.ph === 'mend' ? 0.2 : 1 / 15;
  const g = snap(); if (JSON.stringify(g).length > 3500) g.f = g.f.slice(-3);
  Net.chan.presence({ g });
}
