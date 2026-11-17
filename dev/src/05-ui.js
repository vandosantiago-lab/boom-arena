// ===================== JOGO, ENTRADA E INTERFACE =====================
const Game = { mode: 'attract', me: { x: 0, y: 0, d: 0, m: 0, dashT: 0, dashDir: 0, tl: 0, lim: 0, spd: 0 }, name: 'Jogador', ch: 0, opt: { map: -1, bots: 2, size: 4, time: 120, wins: 2, shuf: 0, teams: 0, rev: 0 }, joy: 0, sens: 1, rank: {}, cam: 0, dashLock: 0, kickT: 0, qLock: false, fpsT: 0, fpsN: 0 };
const In = { x: 0, y: 0, bomb: false, abil: false, keys: {}, jid: null, jon: false, ox: 0, oy: 0, jx: 0, jy: 0 };
const UI = { ph: '', ep: -1, phT: 0, c: -1, labs: [], sig: {}, bannerT: 0, toastT: 0, cdWas: 0 };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const show = (id, on) => $(id).classList.toggle('hide', !on);

const isSim = () => Game.mode !== 'client';
function myIdx() { if (Game.mode === 'attract') return -1; if (Game.mode === 'client') return Net.myI; return V.slots[0].k === 'h' ? 0 : -1; }
function rpos(i) { if (Game.mode === 'client' && i === Net.myI) { const m = Game.me; m.dash = m.dashT > 0 ? 1 : 0; return m; } return V.slots[i]; }

function request(type, cx, cy, dir) {
  if (isSim()) return type === 'v' ? reqRevenge(0, cx, cy) : type === 'b' ? reqBomb(0, cx, cy) : reqAbility(0, type, cx, cy, dir);
  Net.q.push([++Net.qseq, type, cx, cy, dir | 0]); if (Net.q.length > 5) Net.q.shift(); return true;
}
function localUpdate(dt) {
  const mi = myIdx(); if (mi < 0) return;
  const s = V.slots[mi], p = rpos(mi);
  if (s.al) p.rv = 0;
  if (V.ph === 'play' && !s.al && s.rev && !V.pz && !Net.frozen) {   // vingança: anda pela borda e arremessa
    let ix = In.x, iy = In.y; if (!In.jon) { const k = In.keys; ix = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0); iy = (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0); }
    if (!p.rv) { perimStart(p); p.rv = 1; toast('Vingança: ande pela borda e arremesse bombas!', 2600); }
    perimMove(p, ix, iy, dt);
    if (In.bomb) { In.bomb = false; if (s.cd <= 0.05) request('v', Math.round(p.x), Math.round(p.y), p.d); }
    In.abil = false; return;
  }
  if (V.ph !== 'play' || !s.al || V.pz || s.stun || Net.frozen) { p.m = 0; p.dashT = 0; p.pdT = 0; p.tc = 0; In.bomb = In.abil = false; return; }
  if (Game.mode === 'client') { p.spd = s.spd; p.curse = s.curse; }
  let ix = In.x, iy = In.y;
  if (!In.jon) { const k = In.keys; ix = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0); iy = (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0); }
  const r = updateMover(p, ix, iy, dt);
  if (p.m) { Game.stepT = (Game.stepT || 0) - dt; if (Game.stepT <= 0) { Game.stepT = 0.26; Au.play('step'); } }
  const cx = Math.round(p.x), cy = Math.round(p.y);
  Game.kickT -= dt;
  if (r.hit && (s.kick || CHARS[s.ch].k === 3) && Game.kickT <= 0) { Game.kickT = 0.25; request('p', cx, cy, p.d); Au.play('place', 0.8); }
  if (In.bomb) { In.bomb = false; request('b', cx, cy, p.d); }
  if (In.abil) {
    In.abil = false;
    if (CHARS[s.ch].k === 6) { if (s.cd <= 0.05 && performance.now() > Game.dashLock) { const tg = blinkTarget(cx, cy, p.d); if (tg) { Game.dashLock = performance.now() + 900; if (request('a', cx, cy, p.d) !== false) { p.x = tg[0]; p.y = tg[1]; p.pdT = 0; Au.play('tele', 0.7); } } } }
    else if (CHARS[s.ch].k === 2) { if (s.cd <= 0.05 && performance.now() > Game.dashLock) { Game.dashLock = performance.now() + 900; if (request('a', cx, cy, p.d) !== false) { p.dashT = 0.2; p.dashDir = p.d; } } }
    else request('a', cx, cy, p.d);
  }
}

// ---------- fluxo ----------
function clearWorld() { for (const s of V.slots) { s.al = 0; s.w = 0; } V.bombs.length = 0; V.flames.length = 0; V.pus.length = 0; V.win = -1; V.mwin = -1; }
function startAttract() { Game.mode = 'attract'; for (const s of V.slots) { s.k = 'b'; s.peer = null; s.ch = s.i; s.nm = CHARS[s.i].name; } simSetupMatch(-1, 1); }
function goHome(msg) { netLeave(); startAttract(); G.inGame = false; fitCamera(); show('home', true); show('lobby', false); show('hud', false); show('end', false); show('banner', false); show('settings', false); if (msg) toast(msg); }
function goSolo() { Game.mode = 'solo'; if (Game.opt.bots < 1) Game.opt.bots = 2; clearWorld(); V.ph = 'lobby'; }
async function createRoom() {
  if (!Net.room) return toast('Multiplayer indisponível nesta visualização.');
  busy(true);
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code = ''; for (let i = 0; i < 4; i++) code += A[(Math.random() * A.length) | 0];
  const ch = await openChan(code, true); busy(false);
  if (!ch) return toast('Não foi possível criar a sala agora. Confira a internet e tente de novo.');
  Net.chan = ch; Net.code = code; Net.jt = Date.now(); Net.n = 0; Net.sendT = 0;
  ch.presence({ v: 1, host: 1, nm: Game.name, ch: Game.ch, jt: Net.jt, pid: Net.gid });
  Game.mode = 'host'; clearWorld(); V.ph = 'lobby';
}
async function joinRoom(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 4) return toast('Digite o código de 4 caracteres.');
  if (!Net.room) return toast('Multiplayer indisponível nesta visualização.');
  busy(true);
  const ch = await openChan(code, false);
  if (!ch) { busy(false); return toast(Net.lastErr === 'peer-unavailable' ? 'Sala não encontrada. Confira o código.' : 'Não foi possível conectar agora. Confira a internet e tente de novo.'); }
  Net.jt = Date.now(); Net.ackEp = -1; Net.em = [0, 0]; Net.q = [];
  ch.presence({ v: 1, nm: Game.name, ch: Game.ch, jt: Net.jt, r: -1, pid: Net.gid });
  let ok = false;
  for (let i = 0; i < 22 && !ok; i++) { await sleep(200); for (const p of ch.peers()) if (!(p.isMe && p.sameTab) && p.presence && p.presence.host && p.presence.g) ok = true; }
  busy(false);
  if (!ok) { ch.leave(); return toast('Sala não encontrada. Confira o código.'); }
  Net.chan = ch; Net.code = code; Net.lastN = -1; Net.lostT = 0; Net.myI = -1; V.epoch = -1; clearWorld(); V.ph = 'lobby'; Game.mode = 'client';
}
function startMatch() {
  if (V.slots.filter(s => s.k !== '-').length < 2) return toast('É preciso pelo menos 2 participantes.');
  for (const s of V.slots) { s._ack = -1; s.away = 0; }
  simSetupMatch(Game.opt.map, Math.max(0, Game.opt.bots - 1), Game.opt.time, Game.opt.wins, Game.opt.shuf, Game.opt.teams, Game.opt.rev);
}
function lobbyBuild() {
  const hs = [{ peer: Net.gid, nm: Game.name, ch: Game.ch, jt: -1 }];
  if (Game.mode === 'host') { for (const p of Net.chan.peers()) { if (p.isMe && p.sameTab) continue; const pr = p.presence; if (!pr || pr.v !== 1 || pr.host || p.stale) continue; hs.push({ peer: pidOf(p), nm: cleanName(pr.nm), ch: clamp(pr.ch | 0, 0, NCH - 1), jt: +pr.jt || 0 }); } hs.sort((a, b) => a.jt - b.jt); }
  const size = clamp(Game.opt.size | 0, 2, NS), used = hs.slice(0, size).map(h => h.ch), free = CHARS.map((c, i) => i).filter(c => !used.includes(c)); let fi = 0;
  for (let i = 0; i < NS; i++) {
    const s = V.slots[i], h = i < size ? hs[i] : null;
    if (h) { s.k = 'h'; s.peer = h.peer; s.nm = h.nm; s.ch = h.ch; }
    else if (i < size && Game.opt.bots > 0) { s.k = 'b'; s.peer = null; s.ch = free.length ? free[fi++ % free.length] : i; s.nm = 'Bot ' + CHARS[s.ch].name; }
    else { s.k = '-'; s.peer = null; s.nm = ''; }
    s.al = 0;
  }
}

// ---------- ranking da sala (torneio) ----------
function rankUpdate() {
  const win = V.mwin >= 0 ? V.slots[V.mwin] : null;
  for (const s of V.slots) { if (s.k === '-') continue; const key = s.k === 'h' ? 'h:' + s.peer : 'b:' + s.nm, r = Game.rank[key] || (Game.rank[key] = { nm: s.nm, ch: s.ch, mw: 0, rw: 0, mp: 0 }); r.nm = s.nm; r.ch = s.ch; r.mp++; r.rw += s.w; if (win && (s === win || (V.teams && teamOf(s.i) === teamOf(win.i)))) r.mw++; }
}
function rankList() { return Object.values(Game.rank).sort((a, b) => b.mw - a.mw || b.rw - a.rw).slice(0, 8).map(r => [r.nm, r.ch, r.mw, r.rw, r.mp]); }
function rankHtml() {
  const L = isSim() ? rankList() : (Net.rk || []); if (!L.length) return '';
  return '<div class="rank"><span>Ranking da sala</span>' + L.map((r, i) => `<div><b>${i + 1}º</b>${avatar(clamp(r[1] | 0, 0, NCH - 1), 'transparent', 'sm')}<em>${esc(cleanName(r[0]))}</em><u>${r[2] | 0} ${(r[2] | 0) === 1 ? 'partida ganha' : 'partidas ganhas'} · ${r[3] | 0} rodadas</u></div>`).join('') + '</div>';
}

// ---------- eventos do jogo ----------
function distToMe(x, y) { const i = myIdx(); if (i < 0) return 99; const p = rpos(i); return Math.abs(p.x - x) + Math.abs(p.y - y); }
function onBoom(f) { const d = distToMe(f.x, f.y); Au.play('boom', clamp(1.1 - d * 0.06, 0.35, 1)); if (d < 5 && Game.mode !== 'attract') Au.buzz(d < 2.5 ? 70 : 35); }
function onPickup(i, type) { if (i === myIdx()) { Au.play('pick'); toast(PU_NAMES[type], 900); Au.buzz(20); } }
function onDeath(i) { G.hs = 0.16; G.shake = Math.max(G.shake, 0.4); const fl = $('flash'); if (fl) { fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on'); } Au.play('die'); if (i === myIdx()) Au.buzz([120, 60, 180]); }
function emote(id) { Au.play('emo'); const i = myIdx(); if (i < 0) return; if (isSim()) { const s = V.slots[i]; s.e = [s.e[0] + 1, id]; } else { Net.em = [Net.em[0] + 1, id]; const s = V.slots[i]; G.eSeen[i] = s.e[0]; G.emoT[i] = 2.4; UI.labs[i].textContent = EMOTES[id]; UI.labs[i].className = 'lab emo'; } }

function togglePause() { const i = myIdx(); if (i < 0) return; if (isSim()) simTogglePause(i); else { Net.q.push([++Net.qseq, 'z', 0, 0, 0]); if (Net.q.length > 5) Net.q.shift(); } }

// ---------- tela cheia ----------
function toggleFull() {
  const d = document, el = d.documentElement, cur = d.fullscreenElement || d.webkitFullscreenElement;
  try {
    if (cur) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return toast('No iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início" para jogar em tela cheia.', 6000);
    const p = req.call(el, { navigationUI: 'hide' });
    if (p && p.then) p.then(() => { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(() => toast('Este navegador não liberou a tela cheia.'));
  } catch (e) { toast('Este navegador não liberou a tela cheia.'); }
}

// ---------- interface ----------
let toastTimer = 0, bannerTimer = 0;
function toast(msg, ms = 2600) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms); }
function banner(msg, ms = 900, small = '') { const b = $('banner'); b.innerHTML = `<b>${esc(msg)}</b>${small ? `<span>${esc(small)}</span>` : ''}`; show('banner', true); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); clearTimeout(bannerTimer); bannerTimer = setTimeout(() => show('banner', false), ms); }
function busy(on) { for (const id of ['b-solo', 'b-create', 'b-join', 'b-go']) $(id).disabled = on; }
function avatar(ch, col, cls = '') { const src = G.portraits[ch]; return `<span class="av ${cls}" style="border-color:${col};background:${CHARS[ch].col}">${src ? `<img src="${src}" alt="">` : esc(CHARS[ch].name[0])}</span>`; }

UI.init = function () {
  const L = $('labels'); for (let i = 0; i < NS; i++) { const d = document.createElement('div'); d.className = 'lab'; d.style.display = 'none'; d.style.color = colOf(i); L.appendChild(d); UI.labs.push(d); }
  try { Game.name = cleanName(localStorage.getItem('boom.nm') || 'Jogador'); Game.ch = clamp(parseInt(localStorage.getItem('boom.ch')) || 0, 0, NCH - 1); Au.on = localStorage.getItem('boom.snd') !== '0'; Au.vib = localStorage.getItem('boom.vib') !== '0'; Mu.on = localStorage.getItem('boom.mus') !== '0'; Game.cam = clamp(parseInt(localStorage.getItem('boom.cam')) || 0, 0, 2); Game.joy = clamp(parseInt(localStorage.getItem('boom.joy2')) || 0, 0, 1); { const sv = parseInt(localStorage.getItem('boom.sens2')); Game.sens = clamp(isNaN(sv) ? 1 : sv, 0, 2); } } catch (e) { }
  $('nm').value = Game.name === 'Jogador' ? '' : Game.name;
  $('nm').addEventListener('input', () => { Game.name = cleanName($('nm').value); try { localStorage.setItem('boom.nm', Game.name); } catch (e) { } });
  UI.renderChars();
  const tap = (id, fn) => $(id).addEventListener('click', e => { Au.init(); Au.play('click'); fn(e); });
  tap('b-solo', () => goSolo());
  tap('b-create', () => createRoom());
  tap('b-join', () => { show('joinbox', $('joinbox').classList.contains('hide')); $('code').focus(); });
  tap('b-go', () => joinRoom($('code').value));
  $('code').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom($('code').value); });
  tap('b-full', () => toggleFull());
  tap('b-how', () => show('how', true)); tap('b-howx', () => show('how', false));
  tap('b-start', () => startMatch());
  tap('b-leave', () => goHome());
  tap('b-pause', () => togglePause()); tap('b-resume', () => togglePause());
  tap('b-set', () => { UI.renderSettings(); show('settings', true); });
  tap('b-again', () => { if (isSim()) { clearWorld(); V.ph = 'lobby'; } });
  tap('b-exit', () => goHome());
  $('bt-bomb').innerHTML = `<img src="${G.icons[0]}" alt="">`;
  $('how-list').innerHTML = [0, 1, 2, 3, 4, 5, 6, 8, 9, 7].map((t, j) => `<div class="pu"><img src="${G.icons[t]}" style="background:${PU_BG[t]}" alt=""><span>${['Mais uma bomba ao mesmo tempo', 'Explosão alcança mais longe', 'Você anda mais rápido', 'Aguenta uma explosão', 'Chuta bombas ao encostar nelas', 'Explosão atravessa blocos', 'Aperte bomba de novo em cima dela para arremessar', 'Aperte bomba de frente para uma bomba e ela voa longe', 'Suas próximas 2 bombas congelam em vez de explodir', 'Maldição por 10 segundos; passa para quem você encostar'][j]}</span></div>`).join('');
  // controles
  const jz = $('joyzone'), joy = $('joy'), knob = $('joyk');
  const hasTouch = 'ontouchstart' in window, RS = [28, 21, 16], DS = [6, 5, 4];
  // direção sai do ângulo do dedo em relação ao centro; responde a partir de poucos pixels
  const jset = (x, y) => { const R = RS[Game.sens], DEAD = In.fix ? DS[Game.sens] + 3 : DS[Game.sens]; let dx = x - In.ox, dy = y - In.oy; const m = Math.hypot(dx, dy); if (m > R) { if (!In.fix) { In.ox += dx * (1 - R / m); In.oy += dy * (1 - R / m); joy.style.left = In.ox + 'px'; joy.style.top = In.oy + 'px'; } dx *= R / m; dy *= R / m; } const k = 40 / R; knob.style.transform = `translate(calc(-50% + ${dx * k}px),calc(-50% + ${dy * k}px))`; if (m > DEAD) { In.x = dx / Math.min(m, R); In.y = dy / Math.min(m, R); } else In.x = In.y = 0; };
  // tocar em cima do direcional parado usa o centro dele (responde na hora, como um controle físico); tocar longe cria o direcional sob o dedo
  const jstart = (id, x, y) => { Au.init(); let cx = x, cy = y, fix = false; if (!In.jon) { const r = joy.getBoundingClientRect(), bx = r.left + r.width / 2, by = r.top + r.height / 2; fix = Game.joy === 1; if (fix) { cx = bx; cy = by; } } In.jid = id; In.jon = true; In.fix = fix; In.ox = cx; In.oy = cy; In.x = In.y = 0; joy.style.left = cx + 'px'; joy.style.top = cy + 'px'; joy.classList.add('on'); knob.style.transform = 'translate(-50%,-50%)'; if (fix) jset(x, y); };
  const jend = () => { In.jon = false; In.fix = false; In.jid = null; In.x = In.y = 0; joy.classList.remove('on'); joy.style.left = ''; joy.style.top = ''; knob.style.transform = ''; };
  // toque (iPhone e Android): eventos de toque diretos, os mais confiáveis
  const held = e => In.jon && [...e.touches].some(t => t.identifier === In.jid);
  // a 2nd finger in the zone must not steal the stick from a finger that is still down
  jz.addEventListener('touchstart', e => { e.preventDefault(); if (held(e)) return; const t = e.changedTouches[0]; if (t) jstart(t.identifier, t.clientX, t.clientY); }, { passive: false });
  // a finger that is still down after jend() (HUD hidden, blur, rotation) takes the stick back as soon as it moves
  jz.addEventListener('touchmove', e => { e.preventDefault(); if (!In.jon) { const t = e.changedTouches[0]; if (t && !$('controls').classList.contains('hide')) jstart(t.identifier, t.clientX, t.clientY); return; } for (const t of e.changedTouches) if (t.identifier === In.jid) jset(t.clientX, t.clientY); }, { passive: false });
  const tend = e => { if (!In.jon) return; for (const t of e.changedTouches) if (t.identifier === In.jid) jend(); };
  jz.addEventListener('touchend', tend); jz.addEventListener('touchcancel', tend);
  // safety net: if the stick's finger is no longer on the screen (lost touchend), release it on the next touch event anywhere
  const sane = e => { if (In.jon && typeof In.jid === 'number' && ![...e.touches].some(t => t.identifier === In.jid)) jend(); };
  for (const t of ['touchstart', 'touchend', 'touchcancel']) document.addEventListener(t, sane, { capture: true, passive: true });
  // mouse (computador)
  const isT = e => hasTouch && e.pointerType === 'touch';
  jz.addEventListener('pointerdown', e => { if (isT(e)) return; jstart('m' + e.pointerId, e.clientX, e.clientY); try { jz.setPointerCapture(e.pointerId); } catch (x) { } e.preventDefault(); });
  jz.addEventListener('pointermove', e => { if (isT(e) || !In.jon || In.jid !== 'm' + e.pointerId) return; jset(e.clientX, e.clientY); });
  const pend = e => { if (isT(e) || In.jid !== 'm' + e.pointerId) return; jend(); };
  addEventListener('pointerup', pend); addEventListener('pointercancel', pend);
  document.addEventListener('visibilitychange', () => { if (document.hidden) jend(); });
  UI.jend = jend;
  const press = (id, fn) => $(id).addEventListener('pointerdown', e => { Au.init(); fn(); e.preventDefault(); });
  press('bt-bomb', () => { In.bomb = true; }); press('bt-ab', () => { In.abil = true; });
  press('bt-emo', () => show('emos', $('emos').classList.contains('hide')));
  $('emos').innerHTML = EMOTES.map((e, i) => `<button data-e="${i}">${e}</button>`).join('');
  $('emos').addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (!b) return; emote(+b.dataset.e); show('emos', false); e.preventDefault(); });
  addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; In.keys[e.code] = true; if (e.code === 'Space') { In.bomb = true; e.preventDefault(); } if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') In.abil = true; if (e.code === 'KeyP' || e.code === 'Escape') togglePause(); if (e.code.startsWith('Digit')) { const n = +e.code.slice(5); if (n >= 1 && n <= 4) emote(n - 1); } if (e.code.startsWith('Arrow')) e.preventDefault(); if (!Au.ctx) Au.init(); });
  addEventListener('keyup', e => { In.keys[e.code] = false; });
  addEventListener('blur', () => { In.keys = {}; jend(); });
  addEventListener('pagehide', jend); addEventListener('orientationchange', jend);
  document.addEventListener('contextmenu', e => e.preventDefault());
  for (const t of ['touchend', 'click']) document.addEventListener(t, () => Au.init(), { passive: true });
  const m = /^#sala-([a-z0-9]{4})$/i.exec(location.hash || ''); if (m) { $('code').value = m[1].toUpperCase(); show('joinbox', true); }
};
UI.netReady = function () { const ok = !!Net.room; $('b-create').disabled = !ok; $('b-join').disabled = !ok; $('netmsg').textContent = ok ? 'Multiplayer: crie uma sala e passe o código ou o QR para até 3 pessoas.' : 'Multiplayer indisponível nesta visualização — o modo solo funciona normalmente.'; };
UI.renderChars = function () {
  $('chars').innerHTML = CHARS.map((c, i) => `<button class="ch${i === Game.ch ? ' sel' : ''}" data-c="${i}" style="--c:${c.col}">${G.portraits[i] ? `<img src="${G.portraits[i]}" alt="">` : ''}<b>${c.name}</b><i>${c.tag}</i></button>`).join('');
  $('chdesc').textContent = CHARS[Game.ch].desc;
  if (!UI.charsBound) { UI.charsBound = true; $('chars').addEventListener('click', e => { const b = e.target.closest('.ch'); if (!b) return; Au.init(); Au.play('click'); UI.pickChar(+b.dataset.c); }); }
};
UI.pickChar = function (c) { Game.ch = c; try { localStorage.setItem('boom.ch', c); } catch (e) { } UI.renderChars(); if (Game.mode === 'host' && Net.chan) Net.chan.presence({ ch: c, nm: Game.name }); };
UI.renderSettings = function () {
  const row = (label, opts, cur, key) => `<div class="srow"><span>${label}</span><div class="chips">${opts.map((o, i) => `<button class="chip${i === cur ? ' sel' : ''}" data-k="${key}" data-v="${i}">${o}</button>`).join('')}</div></div>`;
  $('set-body').innerHTML = row('Gráficos', ['Leve', 'Médio', 'Máximo'], G.q, 'q') + row('Direcional', ['Solto', 'Fixo'], Game.joy, 'joy') + row('Sensibilidade', ['Baixa', 'Média', 'Alta'], Game.sens, 'sens') + row('Câmera', ['Automática', 'Arena inteira', 'Aproximada'], Game.cam, 'cam') + row('Som', ['Desligado', 'Ligado'], Au.on ? 1 : 0, 'snd') + row('Música', ['Desligada', 'Ligada'], Mu.on ? 1 : 0, 'mus') + row('Vibração', ['Desligada', 'Ligada'], Au.vib ? 1 : 0, 'vib') + `<button class="btn" id="set-full">Tela cheia</button><button class="btn" id="set-quit">Sair da partida</button><button class="btn pri" id="set-close">Voltar ao jogo</button>`;
  if (!UI.setBound) {
    UI.setBound = true; $('set-body').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; Au.init(); Au.play('click');
      if (b.id === 'set-close') return show('settings', false); if (b.id === 'set-quit') return goHome(); if (b.id === 'set-full') return toggleFull();
      const k = b.dataset.k, v = +b.dataset.v; const save = (n, x) => { try { localStorage.setItem(n, x); } catch (e) { } };
      if (k === 'q') { Game.qLock = true; setQuality(v); save('boom.q', v); } if (k === 'snd') { Au.on = !!v; save('boom.snd', v); } if (k === 'mus') { Mu.on = !!v; save('boom.mus', v); } if (k === 'cam') { Game.cam = v; save('boom.cam', v); } if (k === 'joy') { Game.joy = v; save('boom.joy2', v); } if (k === 'sens') { Game.sens = v; save('boom.sens2', v); } if (k === 'vib') { Au.vib = !!v; save('boom.vib', v); if (v) Au.buzz(40); }
      UI.renderSettings();
    });
  }
};
UI.renderLobby = function () {
  const host = isSim(), online = Game.mode !== 'solo', mi = myIdx(), opt = host ? [Game.opt.map, Game.opt.bots, Game.opt.size, Game.opt.time, Game.opt.wins, Game.opt.shuf, Game.opt.teams, Game.opt.rev] : (Net.opt || [-1, 0, 4, 120, 2, 0, 0, 0]), size = clamp(opt[2] | 0 || 4, 2, NS);
  if (isSim()) V.teams = !!Game.opt.teams;
  const sig = JSON.stringify([Game.mode, Net.code, mi, opt, Game.ch, MD.ver, isSim() ? rankList() : Net.rk, V.slots.map(s => [s.k, s.nm, s.ch, s.peer])]); if (sig === UI.sig.lobby) return; UI.sig.lobby = sig;
  $('lb-head').innerHTML = online ? `<div class="code"><small>CÓDIGO DA SALA</small><b>${esc(Net.code)}</b><button class="link" id="b-copy">Copiar código</button></div><canvas id="qr" width="132" height="132" class="hide"></canvas>` : `<div class="code"><small>MODO</small><b class="solo">Solo</b></div>`;
  $('lb-hint').textContent = online ? (HOSTED ? 'Os outros apontam a câmera do celular para o QR, ou abrem este mesmo link, tocam em "Entrar em sala" e digitam o código.' : 'Os outros jogadores abrem este mesmo jogo, tocam em "Entrar em sala" e digitam o código.') : 'Você contra os bots. Escolha o mapa e a dificuldade.';
  $('lb-slots').innerHTML = V.slots.slice(0, size).map((s, i) => s.k === '-' ? `<div class="slot empty"><span class="dot" style="background:${colOf(i)}"></span><em>Vaga livre</em></div>` : `<div class="slot"><span class="dot" style="background:${colOf(i)}"></span>${avatar(s.ch, colOf(i))}<div><b>${esc(s.nm)}</b><i>${CHARS[s.ch].name} · ${CHARS[s.ch].tag}</i></div>${i === mi ? '<u>Você</u>' : s.k === 'b' ? '<u>Bot</u>' : i === 0 ? '<u>Anfitrião</u>' : ''}</div>`).join('');
  const chips = (key, names, cur, first) => names.map((n, i) => `<button class="chip${i + first === cur ? ' sel' : ''}" data-k="${key}" data-v="${i + first}" ${host ? '' : 'disabled'}>${n}</button>`).join('');
  const vchips = (key, list, cur) => list.map(q => `<button class="chip${q[0] === cur ? ' sel' : ''}" data-k="${key}" data-v="${q[0]}" ${host ? '' : 'disabled'}>${q[1]}</button>`).join('');
  $('lb-opts').innerHTML = `<div class="srow"><span>Seu personagem · ${CHARS[Game.ch].name} · ${CHARS[Game.ch].tag}</span><div class="chips avs">${CHARS.map((c, i) => `<button class="chip av-chip${i === Game.ch ? ' sel' : ''}" data-k="ch" data-v="${i}">${avatar(i, i === Game.ch ? '#fff' : 'transparent', 'sm')}</button>`).join('')}</div></div>
   <div class="srow"><span>Jogadores</span><div class="chips seg">${chips('size', ['2', '3', '4', '5', '6'], size, 2)}</div></div>
   <div class="srow"><span>Modo de jogo</span><div class="chips seg">${vchips('teams', [[0, 'Todos contra todos'], [1, 'Times (vermelho x azul)']], opt[6] | 0)}</div></div>
   <div class="srow"><span>Vingança dos eliminados</span><div class="chips seg">${vchips('rev', [[0, 'Desligada'], [1, 'Ligada']], opt[7] | 0)}</div></div>
   <div class="srow"><span>Posição inicial</span><div class="chips seg">${vchips('shuf', [[0, 'Fixa'], [1, 'Embaralhada a cada rodada']], opt[5] | 0)}</div></div>
   <div class="srow"><span>Tempo de cada rodada</span><div class="chips seg">${vchips('time', [[120, '2 min'], [180, '3 min'], [300, '5 min'], [480, '8 min']], opt[3] || 120)}</div></div>
   <div class="srow"><span>Rodadas · vence quem ganhar</span><div class="chips seg">${vchips('wins', [[1, '1'], [2, '2'], [3, '3'], [5, '5']], opt[4] || 2)}</div></div>
   <div class="srow"><span>Mapa</span><div class="chips">${chips('map', ['Sorteio', ...MAPS], opt[0], -1)}</div></div>
   <div class="srow"><span>Bots</span><div class="chips seg">${chips('bots', online ? ['Sem bots', ...DIFFS] : DIFFS, opt[1], online ? 0 : 1)}</div></div>`;
  $('lb-rank').innerHTML = rankHtml();
  const n = V.slots.filter(s => s.k !== '-').length;
  $('b-start').classList.toggle('hide', !host); $('b-start').disabled = n < 2;
  $('lb-wait').textContent = host ? (n < 2 ? 'Aguardando mais jogadores ou ative os bots.' : '') : (mi < 0 ? 'Sala cheia ou partida em andamento — aguarde uma vaga.' : 'Aguardando o anfitrião começar…');
  if (online) {
    $('b-copy').onclick = () => { try { navigator.clipboard.writeText(Net.code).then(() => toast('Código copiado'), () => toast('Código: ' + Net.code)); } catch (e) { toast('Código: ' + Net.code); } };
    if (artUrl()) { try { const q = qrcode(0, 'M'); q.addData(artUrl() + '#sala-' + Net.code.toLowerCase()); q.make(); const cvs = $('qr'), x = cvs.getContext('2d'), nn = q.getModuleCount(), sz = Math.floor(124 / nn), off = (132 - sz * nn) / 2; x.fillStyle = '#fff'; x.fillRect(0, 0, 132, 132); x.fillStyle = '#000'; for (let r = 0; r < nn; r++) for (let c = 0; c < nn; c++) if (q.isDark(r, c)) x.fillRect(off + c * sz, off + r * sz, sz, sz); cvs.classList.remove('hide'); } catch (e) { } }
  }
  if (!UI.lobbyBound) {
    UI.lobbyBound = true; $('lb-opts').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return; Au.init(); Au.play('click'); const k = b.dataset.k, v = +b.dataset.v;
      if (k === 'ch') UI.pickChar(v); else if (isSim()) Game.opt[k] = v; UI.sig.lobby = '';
    });
  }
};
UI.renderEnd = function () {
  const w = V.mwin >= 0 ? V.slots[V.mwin] : null, mi = myIdx();
  $('end-top').innerHTML = w ? `${avatar(w.ch, colOf(w.i), 'big')}<h2>${V.teams ? TEAMNAME[w.i & 1] : esc(w.nm)} venceu a partida!</h2><p>${V.teams ? (mi >= 0 && teamOf(mi) === teamOf(w.i) ? 'Seu time é o campeão da arena.' : 'Campeões da arena.') : w.i === mi ? 'Você é o campeão da arena.' : 'Campeão da arena com ' + CHARS[w.ch].name + '.'}</p>` : `<h2>Empate!</h2><p>Ninguém levou a melhor desta vez.</p>`;
  $('end-list').innerHTML = V.slots.filter(s => s.k !== '-').sort((a, b) => b.w - a.w).map(s => `<div class="slot"><span class="dot" style="background:${colOf(s.i)}"></span>${avatar(s.ch, colOf(s.i))}<div><b>${esc(s.nm)}</b><i>${CHARS[s.ch].name}</i></div><u>${s.w} ${s.w === 1 ? 'vitória' : 'vitórias'}</u></div>`).join('');
  $('end-rank').innerHTML = rankHtml();
  $('b-again').classList.toggle('hide', !isSim()); $('end-wait').textContent = isSim() ? '' : 'Aguardando o anfitrião…';
};
UI.onPhase = function () {
  if (Game.mode === 'attract') return;
  const ph = V.ph, inGame = ph === 'count' || ph === 'play' || ph === 'rend';
  show('home', false); show('lobby', ph === 'lobby'); show('hud', inGame); show('end', ph === 'mend'); if (!inGame) { show('banner', false); show('settings', false); show('emos', false); }
  if (G.inGame !== inGame) { G.inGame = inGame; fitCamera(); }
  if (ph === 'lobby') UI.sig.lobby = '';
  if (ph === 'count') { UI.c = -1; UI.sig.chips = ''; UI.sig.stats = ''; }
  if (ph === 'play') { banner('VAI!', 700); Au.play('go'); }
  if (ph === 'rend') { const w = V.win >= 0 ? V.slots[V.win] : null, mi = myIdx(); const mine = w && (w.i === mi || (V.teams && mi >= 0 && teamOf(mi) === teamOf(w.i))); banner(w ? (V.teams ? TEAMNAME[w.i & 1] + ' venceu a rodada!' : w.i === mi ? 'Você venceu a rodada!' : w.nm + ' venceu a rodada!') : 'Empate!', 3600, 'Rodada ' + V.rnd); Au.play(mine ? 'win' : 'lose'); }
  if (ph === 'mend') { UI.renderEnd(); Au.play(V.mwin === myIdx() ? 'win' : 'lose'); }
};
UI.tick = function (dt) {
  UI.phT += dt;
  if (V.ph !== UI.ph || V.epoch !== UI.ep || Game.mode !== UI.mode) { UI.ph = V.ph; UI.ep = V.epoch; UI.mode = Game.mode; UI.phT = 0; UI.onPhase(); }
  if (Game.mode !== 'attract' && (V.ph === 'count' || V.ph === 'play') && Mu.on && Au.on && !document.hidden && !V.pz) Mu.start(); else Mu.stop();
  if (Game.mode === 'attract') return;
  if (V.ph === 'lobby') return UI.renderLobby();
  if (V.ph === 'count' && V.c !== UI.c) { UI.c = V.c; banner(String(V.c), 950, 'Rodada ' + V.rnd + ' · ' + MAPS[V.map]); Au.play('beep'); }
  { const pz = V.pz && G.inGame; if (pz !== UI.pzWas) { UI.pzWas = pz; show('pause', pz); if (pz) { const w = V.slots[V.pzBy | 0]; $('pz-who').textContent = w && w.k === 'h' ? (V.pzBy === myIdx() ? 'Você pausou a partida.' : w.nm + ' pausou a partida.') : ''; } } }
  if (!G.inGame) return;
  const hurry = V.ph === 'play' && V.t <= SHRINK_AT; if (hurry && !UI.hurry) { banner('DEPRESSA!', 1400, 'A arena está fechando'); Au.play('alarm'); } UI.hurry = hurry;
  if (V.ph === 'play' && V.t <= 10) { const sec = Math.ceil(V.t); if (sec !== UI.lastSec) { UI.lastSec = sec; Au.play('tick'); } }
  const mi = myIdx(), s = mi >= 0 ? V.slots[mi] : null;
  const tt = Math.ceil(V.t), ts = Math.floor(tt / 60) + ':' + String(tt % 60).padStart(2, '0');
  if (ts !== UI.sig.tm) { UI.sig.tm = ts; $('tm').textContent = ts; $('clock').classList.toggle('hot', V.t <= SHRINK_AT); $('rd').textContent = V.t <= SHRINK_AT ? 'A arena está fechando!' : 'Rodada ' + V.rnd; }
  const cs = V.wn + (V.teams ? 't' : 'f') + MD.ver + JSON.stringify(V.slots.map(q => [q.k, q.ch, q.w, q.al, q.nm]));
  if (cs !== UI.sig.chips) { UI.sig.chips = cs; $('chips').classList.toggle('many', V.slots.filter(q => q.k !== '-').length > 4); $('chips').innerHTML = V.slots.map((q, i) => q.k === '-' ? '' : `<div class="pchip${q.al ? '' : ' dead'}${i === mi ? ' me' : ''}">${avatar(q.ch, colOf(i), 'sm')}<span>${V.wn > 3 ? q.w + '/' + V.wn : '●'.repeat(q.w) + '○'.repeat(Math.max(0, V.wn - q.w))}</span></div>`).join(''); }
  const spec = !s || (!s.al && !s.rev); { const rv = !!(s && !s.al && s.rev); if (rv !== UI.revWas) { UI.revWas = rv; $('bt-ab').style.visibility = rv ? 'hidden' : ''; } }
  if (spec !== UI.specWas) { UI.specWas = spec; fitCamera(); }
  show('controls', !spec); show('spec', spec && V.ph === 'play'); if (spec) { if (In.jon) UI.jend(); $('spec').textContent = s ? 'Você foi eliminado — assistindo ao resto da rodada' : 'Assistindo — você entra na próxima partida'; }
  if (s) {
    const st = [s.maxB, s.range, s.spd, s.shield, s.kick || CHARS[s.ch].k === 3 ? 1 : 0, s.pierce, s.glove, s.punch, s.ice, s.curse].join();
    if (st !== UI.sig.stats) { UI.sig.stats = st; const it = (t, v) => `<span><img src="${G.icons[t]}" alt="">${v}</span>`; $('stats').innerHTML = it(0, s.maxB) + it(1, s.range) + it(2, s.spd) + (s.shield ? it(3, '') : '') + (s.kick || CHARS[s.ch].k === 3 ? it(4, '') : '') + (s.pierce ? it(5, '') : '') + (s.glove ? it(6, '') : '') + (s.punch ? it(8, '') : '') + (s.ice ? it(9, s.ice) : '') + (s.curse ? it(7, '') : ''); }
    const remote = CHARS[s.ch].k === 0 && V.bombs.some(b => b.o === mi && b.type === 1), label = remote ? 'DETONAR' : CHARS[s.ch].btn;
    if (label !== UI.sig.ab) { UI.sig.ab = label; $('ab-l').textContent = label; $('bt-ab').style.setProperty('--c', CHARS[s.ch].col); $('bt-ab').classList.toggle('arm', remote); }
    const p = clamp(s.cd / CHARS[s.ch].cd, 0, 1); $('bt-ab').style.setProperty('--p', (p * 100).toFixed(0) + '%'); $('bt-ab').classList.toggle('cool', p > 0.01 && !remote);
    if (s.cd > 0.05 && UI.cdWas <= 0.05) Au.play('abil'); UI.cdWas = s.cd;
  }
};

function autoQuality(dt) {
  if (Game.qLock || G.q === 0 || V.ph !== 'play' || document.hidden) { Game.fpsT = 0; Game.fpsN = 0; return; }
  Game.fpsT += dt; Game.fpsN++;
  if (Game.fpsT >= 3) { const fps = Game.fpsN / Game.fpsT; Game.fpsT = 0; Game.fpsN = 0; if (fps < 27) { setQuality(G.q - 1); if (Game.mode !== 'attract') toast('Gráficos ajustados para manter o jogo fluido.'); } }
}

// ---------- laço principal ----------
let lastT = performance.now();
function step(dt) {
  if (Game.mode === 'client') { netClientPoll(dt); if (Game.mode !== 'client') return; localUpdate(dt); netClientSend(dt); }
  else {
    if (V.ph === 'lobby') lobbyBuild(); else if (Game.mode === 'host') netHostPoll();
    localUpdate(dt);
    const ts = (Game.mode !== 'attract' && V.ph === 'play' && !V.slots.some(s => s.k === 'h' && s.al)) ? 3 : 1;
    for (let i = 0; i < ts; i++) simTick(dt);
    for (const s of V.slots) if (s.i === 0 || s.k !== 'h') s.dash = s.dashT > 0 ? 1 : 0;
    if (Game.mode === 'attract' && V.ph === 'mend') startAttract();
    if (Game.mode === 'host' && Net.chan) netHostSend(dt);
  }
  UI.tick(dt);
}
function frame(now) {
  requestAnimationFrame(frame);
  const real = Math.min(0.14, Math.max(0.001, (now - lastT) / 1000)); lastT = now; G.time += real;
  try {
    const t0 = performance.now(), n = Math.ceil(real / 0.035); for (let i = 0; i < n; i++) step(real / n);
    G.fx = (V.ph === 'rend' && UI.phT < 1.5 && Game.mode !== 'attract') ? 0.3 : 1; if (G.hs > 0) { G.hs -= real; G.fx = Math.min(G.fx, 0.12); }
    const t1 = performance.now(); gfxSync(real); camUpdate(real); autoQuality(real); const t2 = performance.now(); gfxRender();
    const pf = G.prof; pf[0] += t1 - t0; pf[1] += t2 - t1; pf[2] += performance.now() - t2; pf[3]++;
  } catch (e) { if (!window.__boomErr) { window.__boomErr = String(e && e.stack || e); console.error(e); } }
}
const BUILD = '/*__BUILD__*/';
// versão web: confere se há versão mais nova publicada (apps salvos na tela inicial guardam cópia antiga)
if (HOSTED) { try { fetch('version.txt?t=' + Date.now(), { cache: 'no-store' }).then(r => r.ok ? r.text() : '').then(v => { v = (v || '').trim(); if (v && v !== BUILD && !location.search.includes('v=' + v)) location.replace(location.pathname + '?v=' + v + location.hash); }).catch(() => { }); } catch (e) { } }
try {
  gfxInit(); UI.init(); startAttract(); netInit(); loadModels();
  { const el = $('ver'); if (el) el.textContent = 'versão ' + BUILD; }
  $('c').addEventListener('webglcontextlost', e => { e.preventDefault(); try { localStorage.setItem('boom.q', '0'); } catch (x) { } $('loaderr').classList.remove('hide'); $('loaderr').firstElementChild.innerHTML = '<h2>O vídeo do aparelho foi reiniciado</h2><p>Abra a página de novo para continuar. Os gráficos voltarão no modo leve.</p>'; });
  window.__boomReady = true; window.__boom = { V, G, Game, Net, Sim, In, UI };
  requestAnimationFrame(frame);
} catch (e) { window.__boomErr = String(e && e.stack || e); console.error(e); }
