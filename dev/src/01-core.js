// ===================== CORE: constantes, estado, movimento =====================
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function mulberry(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const GW = 13, GH = 11, N = GW * GH;
const EMPTY = 0, PILLAR = 1, BLOCK = 2, SOLID = 3, BURN = 4;
const GCH = '.#xSb';
const DX = [0, -1, 0, 1], DY = [1, 0, -1, 0]; // 0 baixo, 1 esquerda, 2 cima, 3 direita
const idx = (x, y) => y * GW + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH;
const SPAWNS = [[0, 0], [12, 10], [12, 0], [0, 10], [6, 0], [6, 10]], NS = 6;
const ROUND_T = 120, SHRINK_AT = 60, WINS = 2, FUSE = 2.5;

const CHARS = [
  { name: 'Kaio', tag: 'Bomba remota', desc: 'Planta uma bomba extra e detona na hora que quiser.', btn: 'REMOTA', col: '#ff7a1a', cd: 4, k: 0 },
  { name: 'Luna', tag: 'Arremesso', desc: 'Lança a bomba por cima dos blocos, três casas à frente.', btn: 'LANÇAR', col: '#12b5a4', cd: 5, k: 1 },
  { name: 'Zeca', tag: 'Arrancada', desc: 'Dispara pelo corredor, atravessa bombas e fica invulnerável.', btn: 'DASH', col: '#7c4dff', cd: 5, k: 2 },
  { name: 'Dudu', tag: 'Chute', desc: 'Chuta bombas ao encostar e dispara uma bomba rasteira.', btn: 'CHUTE', col: '#ffd400', cd: 3.5, k: 3 },
  { name: 'Bia', tag: 'Bomba de gelo', desc: 'Arremessa uma bomba de gelo que congela quem estiver na explosão.', btn: 'GELO', col: '#4fc3ff', cd: 7, k: 4 },
  { name: 'Téo', tag: 'Escudo', desc: 'Ergue um escudo por 3 segundos que aguenta uma explosão.', btn: 'ESCUDO', col: '#8f9bb3', cd: 9, k: 5 },
  { name: 'Nina', tag: 'Teleporte', desc: 'Some e reaparece até três casas à frente, atravessando blocos.', btn: 'SUMIR', col: '#c2185b', cd: 6, k: 6 },
  { name: 'Rex', tag: 'Soco', desc: 'Dá um soco na bomba à frente e ela voa por cima dos blocos.', btn: 'SOCO', col: '#ff9f43', cd: 4, k: 7 },
];
const NCH = CHARS.length;
const SLOTCOL = ['#ff4d4d', '#3db8ff', '#ffd23d', '#5dea8c', '#c77dff', '#ff9f43'];
const MAPS = ['Clássico', 'Praia', 'Jardim', 'Deserto', 'Castelo'];
const NMAP = MAPS.length;
const PU_NAMES = ['+1 bomba', '+1 fogo', 'Velocidade', 'Escudo', 'Chute', 'Fogo perfurante', 'Luva de arremesso', 'Caveira: maldição!', 'Soco', 'Bombas de gelo'];
const DIFFS = ['Fácil', 'Normal', 'Difícil'];
const EMOTES = ['👍', '😂', '😱', '💣'];

function mapTiles(m) {
  const t = { conv: [], spk: [], tele: [], slow: [], convAt: new Int8Array(N).fill(-1), spkAt: new Uint8Array(N), teleTo: new Int16Array(N).fill(-1), slowAt: new Uint8Array(N), special: new Uint8Array(N) };
  if (m === 1) t.slow = [[6, 3], [6, 4], [6, 5], [6, 6], [6, 7], [4, 4], [5, 4], [7, 4], [8, 4], [4, 6], [5, 6], [7, 6], [8, 6]];
  if (m === 2) t.tele = [[2, 2, 10, 8], [10, 2, 2, 8]];
  if (m === 3) t.slow = [[4, 2], [8, 2], [2, 4], [10, 4], [2, 6], [10, 6], [4, 8], [8, 8], [6, 4], [6, 6], [4, 5], [8, 5]];
  if (m === 4) t.spk = [[2, 2], [10, 2], [2, 8], [10, 8], [6, 4], [6, 6]];
  for (const c of t.conv) { t.convAt[idx(c[0], c[1])] = c[2]; t.special[idx(c[0], c[1])] = 1; }
  for (const c of t.spk) { t.spkAt[idx(c[0], c[1])] = 1; t.special[idx(c[0], c[1])] = 1; }
  for (const c of t.slow) { t.slowAt[idx(c[0], c[1])] = 1; t.special[idx(c[0], c[1])] = 1; }
  for (const c of t.tele) { const a = idx(c[0], c[1]), b = idx(c[2], c[3]); t.teleTo[a] = b; t.teleTo[b] = a; t.special[a] = t.special[b] = 1; }
  return t;
}
const SPK_P = 4.4;
const spikePhase = (x, y, el) => (el + ((x + y) & 1) * 2.2) % SPK_P;
function spikeState(x, y, el) { const c = spikePhase(x, y, el); return c < 2.8 ? 0 : c < 3.5 ? 1 : 2; }
function spikeEta(x, y, el) { const c = spikePhase(x, y, el); return c < 2.8 ? 2.8 - c : 0; }

function spiralOrder() {
  const o = []; let x0 = 0, y0 = 0, x1 = GW - 1, y1 = GH - 1;
  while (x0 <= x1 && y0 <= y1) {
    for (let x = x0; x <= x1; x++) o.push(idx(x, y0));
    for (let y = y0 + 1; y <= y1; y++) o.push(idx(x1, y));
    if (y1 > y0) for (let x = x1 - 1; x >= x0; x--) o.push(idx(x, y1));
    if (x1 > x0) for (let y = y1 - 1; y > y0; y--) o.push(idx(x0, y));
    x0++; y0++; x1--; y1--;
  }
  return o;
}
const SPIRAL = spiralOrder();

// Estado do mundo (o anfitrião escreve direto; convidados preenchem a partir do snapshot)
const V = { ph: 'idle', rnd: 0, epoch: 0, map: 0, t: ROUND_T, el: 0, c: 0, grid: new Uint8Array(N), slots: [], bombs: [], flames: [], pus: [], tiles: mapTiles(0), ld: null, wn: WINS, pz: false, teams: false, revOn: false, win: -1, mwin: -1, sh: 0, diff: 1 };
function mkSlot(i) { return { i, k: '-', peer: null, nm: '', ch: i, w: 0, al: 0, x: SPAWNS[i][0], y: SPAWNS[i][1], d: 0, m: 0, maxB: 1, range: 2, spd: 0, shield: 0, kick: 0, pierce: 0, inv: 0, cd: 0, glove: 0, stun: 0, away: 0, _stunT: 0, curse: 0, punch: 0, ice: 0, rev: 0, _curT: 0, _shT: 0, _revT: 0, _curX: 0, tsh: 0, e: [0, 0], dashT: 0, dashDir: 0, tl: 0, lim: 0, _cdT: 0, _invT: 0, _lastQ: 0, _eSeq: 0, bot: null }; }
V.slots = [0, 1, 2, 3, 4, 5].map(mkSlot);

function bombAtCell(x, y, except) { for (const b of V.bombs) if (b !== except && !b.fly && Math.round(b.x) === x && Math.round(b.y) === y) return b; return null; }
function solidCell(x, y) { return !inb(x, y) || V.grid[idx(x, y)] !== EMPTY; }
function blockedFor(p, x, y, thru) {
  if (solidCell(x, y)) return true;
  if (thru) return false;
  if (!bombAtCell(x, y)) return false;
  return !(Math.round(p.x) === x && Math.round(p.y) === y);
}
const speedOf = p => (3.3 + 0.45 * (p.spd || 0)) * (p.curse === 1 ? 0.5 : p.curse === 2 ? 1.9 : 1);
const teamOf = i => V.teams ? (i & 1) : i;
const TEAMCOL = ['#ff4d4d', '#3db8ff'], TEAMNAME = ['Time Vermelho', 'Time Azul'];
const colOf = i => V.teams ? TEAMCOL[i & 1] : SLOTCOL[i];
// teleporte: casa livre mais distante (até 3) na direção do olhar, atravessando blocos
function blinkTarget(x, y, dir) { for (let k = 3; k >= 1; k--) { const tx = x + DX[dir] * k, ty = y + DY[dir] * k; if (inb(tx, ty) && V.grid[idx(tx, ty)] === EMPTY && !bombAtCell(tx, ty)) return [tx, ty]; } return null; }
// vingança: quem foi eliminado anda pela borda da arena
function perimStart(p) { const x = clamp(Math.round(p.x), 0, GW - 1), y = clamp(Math.round(p.y), 0, GH - 1), d = [y + 1, GH - y, x + 1, GW - x], m = Math.min(d[0], d[1], d[2], d[3]); if (m === d[0]) { p.x = x; p.y = -1; } else if (m === d[1]) { p.x = x; p.y = GH; } else if (m === d[2]) { p.x = -1; p.y = y; } else { p.x = GW; p.y = y; } p.d = perimDir(p); p.m = 0; }
function perimDir(p) { return p.y <= -1 ? 0 : p.y >= GH ? 2 : p.x <= -1 ? 3 : 1; }
function perimMove(p, ix, iy, dt) {
  const sp = 5.5 * dt, onH = p.y <= -1 || p.y >= GH, onV = p.x <= -1 || p.x >= GW; let mv = 0;
  if (onH && Math.abs(ix) > 0.3) { const nx = clamp(p.x + Math.sign(ix) * sp, -1, GW); mv = Math.abs(nx - p.x); p.x = nx; p.y = p.y <= -1 ? -1 : GH; }
  else if (onV && Math.abs(iy) > 0.3) { const ny = clamp(p.y + Math.sign(iy) * sp, -1, GH); mv = Math.abs(ny - p.y); p.y = ny; p.x = p.x <= -1 ? -1 : GW; }
  p.m = mv > 1e-4 ? 1 : 0; p.d = perimDir(p);
}

// Move em corredores (estilo clássico), com ajuda automática nas curvas.
function stepMove(p, dir, dist, thru) {
  const hz = (dir === 1 || dir === 3), sg = (dir === 0 || dir === 3) ? 1 : -1;
  const A = () => hz ? p.x : p.y, O = () => hz ? p.y : p.x;
  const setA = v => { if (hz) p.x = v; else p.y = v; }, setO = v => { if (hz) p.y = v; else p.x = v; };
  const blk = (a, o) => hz ? blockedFor(p, a, o, thru) : blockedFor(p, o, a, thru);
  const start = dist; let hit = null;
  let ro = Math.round(O()); const off = O() - ro;
  if (Math.abs(off) > 1e-3) {
    const ca = Math.round(A()), r2 = ro + (off > 0 ? 1 : -1);
    let tgt;
    if (!blk(ca + sg, ro)) tgt = ro; else if (!blk(ca + sg, r2) && !blk(ca, r2)) tgt = r2; else return { moved: 0, hit: null };
    const d = tgt - O(), m = Math.min(dist, Math.abs(d));
    setO(O() + Math.sign(d) * m); dist -= m;
    if (Math.abs(tgt - O()) > 1e-3) return { moved: start - dist, hit: null };
    setO(tgt); ro = tgt;
  } else setO(ro);
  let guard = 0;
  while (dist > 1e-5 && guard++ < 8) {
    const a = A(), ca = Math.round(a), rel = (a - ca) * sg;
    if (rel < -1e-5) { const m = Math.min(dist, -rel); setA(a + sg * m); dist -= m; continue; }
    if (blk(ca + sg, ro)) { hit = hz ? bombAtCell(ca + sg, ro) : bombAtCell(ro, ca + sg); break; }
    const m = Math.min(dist, 0.5 - rel + 1e-3); setA(a + sg * m); dist -= m;
  }
  return { moved: start - dist, hit };
}

// signed sideways slide needed before the player can step in `dir` from here (null = that lane is closed)
function turnSlide(p, dir) {
  const hz = dir === 1 || dir === 3, o = hz ? p.y : p.x, ro = Math.round(o), a = Math.round(hz ? p.x : p.y) + ((dir === 0 || dir === 3) ? 1 : -1);
  return (hz ? blockedFor(p, a, ro, false) : blockedFor(p, ro, a, false)) ? null : ro - o;
}
function cellOf(p) { return idx(clamp(Math.round(p.x), 0, GW - 1), clamp(Math.round(p.y), 0, GH - 1)); }

function updateMover(p, ix, iy, dt) {
  const res = { hit: null, tele: 0 };
  if (p.dashT > 0) {
    p.dashT -= dt; const r = stepMove(p, p.dashDir, 15 * dt, true); p.d = p.dashDir; p.m = 1;
    if (r.moved < 1e-4) p.dashT = 0;
  } else {
    const ax = Math.abs(ix), ay = Math.abs(iy); let moved = 0;
    if (ax > 0.25 || ay > 0.25) {
      const c = p.m ? p.d : -1, cH = c === 1 || c === 3, hdir = ix > 0 ? 3 : 1, vdir = iy > 0 ? 0 : 2;
      let hz = ax > ay * 1.25 ? true : ay > ax * 1.25 ? false : (p.d === 1 || p.d === 3);
      // thumb still includes the direction we are moving in (diagonal-ish): never ping-pong between the two axes
      if (ax > 0.3 && ay > 0.3 && c >= 0 && (c === hdir || c === vdir)) {
        const ts = turnSlide(p, cH ? vdir : hdir), back = ts === null ? 9 : Math.max(0, -ts * ((c === 0 || c === 3) ? 1 : -1));
        if (p.tc > 0) hz = cH;                                                          // just turned: commit for 0.3 cells
        else if (ax <= ay * 1.25 && ay <= ax * 1.25) hz = ts !== null && Math.abs(ts) <= 0.2 ? !cH : cH; // true diagonal: take the next opening
        else if (hz !== cH && back > 0.25) hz = cH;                                      // never slide back more than 0.25 to un-turn
      }
      const d1 = hz ? (ix > 0 ? 3 : 1) : (iy > 0 ? 0 : 2);
      const d2 = hz ? (ay > 0.3 ? (iy > 0 ? 0 : 2) : -1) : (ax > 0.3 ? (ix > 0 ? 3 : 1) : -1);
      let sp = speedOf(p); if (V.tiles.slowAt[cellOf(p)]) sp *= 0.55;
      let dist = sp * dt; if (p.lim > 0) dist = Math.min(dist, p.lim);
      const r = stepMove(p, d1, dist, false); p.d = d1; moved = r.moved; res.hit = r.hit;
      if (moved < 1e-4 && d2 >= 0) { const r2 = stepMove(p, d2, dist, false); if (r2.moved > 1e-4) { moved = r2.moved; p.d = d2; res.hit = null; } }
      // curva antecipada: se a direção pedida ainda está bloqueada, segue na anterior até a abertura
      if (moved < 1e-4 && !r.hit && !(p.lim > 0) && p.pd >= 0 && p.pd !== d1 && ((p.pd ^ d1) & 1) && p.pdT > 0) { const r3 = stepMove(p, p.pd, dist, false); if (r3.moved > 1e-4) { moved = r3.moved; p.d = p.pd; } }
      else if (moved > 1e-4) { p.pd = p.d; p.pdT = 0.45; }
      if (moved > 1e-4) { const o = (p.d === 1 || p.d === 3) ? p.y : p.x; if ((c >= 0 && ((p.d ^ c) & 1)) || Math.abs(o - Math.round(o)) > 1e-3) p.tc = 0.3; else if (p.tc > 0) p.tc -= moved; } else p.tc = 0;
      if (p.pdT > 0) p.pdT -= dt;
    } else if (p.pdT > 0) p.pdT -= 4 * dt; // stick released: the turn buffer dies in ~0.11 s instead of living forever
    p.m = moved > 1e-4 ? 1 : 0;
  }
  const cd = V.tiles.convAt[cellOf(p)];
  if (cd >= 0) stepMove(p, cd, 1.5 * dt, false);
  const c2 = cellOf(p), to = V.tiles.teleTo[c2];
  if (to >= 0) {
    if (!p.tl && V.grid[to] === EMPTY) { const cx = c2 % GW, cy = (c2 / GW) | 0; if (Math.abs(p.x - cx) < 0.2 && Math.abs(p.y - cy) < 0.2) { p.x = to % GW; p.y = (to / GW) | 0; p.tl = 1; res.tele = 1; } }
  } else p.tl = 0;
  return res;
}
