// ===================== SIMULAÇÃO (anfitrião / solo) =====================
const Sim = { time: 0, nextId: 1, burn: new Map(), walls: new Map(), flameGrid: new Uint8Array(N), phT: 0, shT: 0, endT: 0, mapChoice: -1, order: [0, 1, 2, 3], BG: new Uint8Array(N) };

function rollPU() { const r = Math.random() * 100; return r < 24 ? 0 : r < 48 ? 1 : r < 62 ? 2 : r < 69 ? 3 : r < 76 ? 4 : r < 82 ? 5 : r < 88 ? 6 : r < 93 ? 7 : r < 97 ? 8 : 9; }

function genGrid() {
  const g = V.grid, keep = new Uint8Array(N);
  for (const s of SPAWNS) for (const d of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = s[0] + d[0], y = s[1] + d[1]; if (inb(x, y)) keep[idx(x, y)] = 1; }
  for (const t of V.tiles.tele) for (const k of [0, 2]) for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (Math.abs(x - t[k]) + Math.abs(y - t[k + 1]) <= 2) keep[idx(x, y)] = 1;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const c = idx(x, y);
    if ((x & 1) && (y & 1)) g[c] = PILLAR;
    else if (keep[c] || V.tiles.special[c]) g[c] = EMPTY;
    else g[c] = Math.random() < 0.8 ? BLOCK : EMPTY;
  }
}

function simSetupMatch(mapChoice, diff, time, wins, shuf, teams, rev) {
  Sim.shuf = !!shuf; V.teams = !!teams; V.revOn = !!rev;
  Sim.rt = clamp(time | 0 || ROUND_T, 60, 600); V.wn = clamp(wins | 0 || WINS, 1, 9);
  Sim.mapChoice = mapChoice; V.diff = diff;
  Sim.order = [0].concat([1, 2, 3, 4].sort(() => Math.random() - 0.5));
  V.rnd = 0; V.mwin = -1;
  for (const s of V.slots) { s.w = 0; s.e = [0, 0]; }
  simStartRound();
}

function simStartRound() {
  V.rnd++; V.epoch++;
  V.map = Sim.mapChoice >= 0 ? Sim.mapChoice : Sim.order[(V.rnd - 1) % NMAP];
  V.tiles = mapTiles(V.map);
  genGrid();
  V.bombs.length = 0; V.flames.length = 0; V.pus.length = 0; Sim.burn.clear(); Sim.walls.clear(); Sim.flameGrid.fill(0);
  const act = V.slots.filter(s => s.k !== '-'), sp = Sim.shuf ? [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5) : null; V.pz = false;
  for (const s of V.slots) {
    const q = SPAWNS[sp && s.k !== '-' ? sp[act.indexOf(s)] : s.i];
    s.al = s.k !== '-' ? 1 : 0; s.x = q[0]; s.y = q[1]; s.d = 0; s.m = 0; s.glove = 0; s.stun = 0; s._stunT = 0; s.curse = 0; s.punch = 0; s.ice = 0; s.rev = 0; s._curT = 0; s._shT = 0; s._revT = 0; s._curX = 0; s.tsh = 0; s.rv = 0;
    s.maxB = 1; s.range = 2; s.spd = 0; s.shield = 0; s.kick = 0; s.pierce = 0; s.inv = 0; s.cd = 0;
    s._cdT = 0; s._invT = 0; s.dashT = 0; s.tl = 0; s.lim = 0;
    s.bot = s.k === 'b' ? { t: Math.random() * 0.4, path: [], goal: -1 } : null;
  }
  V.t = Sim.rt || ROUND_T; V.el = 0; V.sh = 0; V.win = -1; V.ld = null;
  V.ph = 'count'; Sim.phT = 3; V.c = 3; Sim.shT = 0; Sim.endT = 0;
}

function burnBlock(c) { const wl = Sim.walls.delete(c); V.grid[c] = BURN; Sim.burn.set(c, { t: 0.62, pu: !wl && Math.random() < 0.36 ? rollPU() : -1 }); }   // muro do poder não solta item
function blastCells(cx, cy, range, pierce, apply) {
  const out = [[cx, cy]];
  for (let d = 0; d < 4; d++) for (let i = 1; i <= range; i++) {
    const x = cx + DX[d] * i, y = cy + DY[d] * i; if (!inb(x, y)) break;
    const c = idx(x, y), g = V.grid[c];
    if (g === PILLAR || g === SOLID) break;
    if (g === BLOCK || g === BURN) {
      if (apply && g === BLOCK) burnBlock(c);
      out.push([x, y]); if (!pierce) break; else continue;
    }
    out.push([x, y]);
    if (apply) {
      for (const b of V.bombs) if (!b.fly && Math.round(b.x) === x && Math.round(b.y) === y && b.fuse > 0.08) b.fuse = 0.08;
      for (let k = V.pus.length - 1; k >= 0; k--) { const p = V.pus[k]; if (p.x === x && p.y === y && !(p.fresh > 0)) V.pus.splice(k, 1); }
    }
  }
  return out;
}

function explode(b) {
  const i = V.bombs.indexOf(b); if (i >= 0) V.bombs.splice(i, 1);
  if (b.type === 1 && V.slots[b.o]) V.slots[b.o]._cdT = Math.max(V.slots[b.o]._cdT, Sim.time + CHARS[0].cd);
  const cx = clamp(Math.round(b.x), 0, GW - 1), cy = clamp(Math.round(b.y), 0, GH - 1);
  if (b.type === 2) {   // bomba de gelo: congela, não destrói nem mata
    const ic = blastCells(cx, cy, b.range, false, false); V.flames.push({ id: Sim.nextId++, x: cx, y: cy, cells: ic, ttl: 0.5, ice: 1 });
    for (const s of V.slots) if (s.al && Sim.time >= s._invT && ic.some(q => q[0] === Math.round(s.x) && q[1] === Math.round(s.y))) { s._stunT = Sim.time + 2.2; s.dashT = 0; s.m = 0; }
    return;
  }
  const cells = blastCells(cx, cy, b.range, b.pierce, true);
  if (b.type === 4) for (const e of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {   // megabomba: pega também as diagonais
    const x = cx + e[0], y = cy + e[1]; if (!inb(x, y)) continue; const c = idx(x, y), g = V.grid[c]; if (g === PILLAR || g === SOLID) continue;
    if (g === BLOCK) burnBlock(c);
    else if (g === EMPTY) { for (const o of V.bombs) if (!o.fly && Math.round(o.x) === x && Math.round(o.y) === y && o.fuse > 0.08) o.fuse = 0.08; for (let k = V.pus.length - 1; k >= 0; k--) { const p = V.pus[k]; if (p.x === x && p.y === y && !(p.fresh > 0)) V.pus.splice(k, 1); } }
    V.flames.push({ id: Sim.nextId++, x, y, cells: [[x, y]], ttl: 0.3 }); Sim.flameGrid[c] = 1;
  }
  V.flames.push({ id: Sim.nextId++, x: cx, y: cy, cells, ttl: 0.6 });
  for (const c of cells) Sim.flameGrid[idx(c[0], c[1])] = 1;
}

function playerAtCell(x, y) { for (const s of V.slots) if (s.al && Math.round(s.x) === x && Math.round(s.y) === y) return s; return null; }

function slideBomb(b, dir, spd, dt) {
  const hz = (dir === 1 || dir === 3), sg = (dir === 0 || dir === 3) ? 1 : -1;
  if (hz) b.y = Math.round(b.y); else b.x = Math.round(b.x);
  let dist = spd * dt, guard = 0;
  while (dist > 1e-5 && guard++ < 6) {
    const a = hz ? b.x : b.y, ca = Math.round(a), rel = (a - ca) * sg;
    if (rel < -1e-5) { const m = Math.min(dist, -rel); if (hz) b.x += sg * m; else b.y += sg * m; dist -= m; continue; }
    const nx = hz ? ca + sg : Math.round(b.x), ny = hz ? Math.round(b.y) : ca + sg;
    if (solidCell(nx, ny) || bombAtCell(nx, ny, b) || playerAtCell(nx, ny)) { if (hz) b.x = ca; else b.y = ca; return false; }
    const m = Math.min(dist, 0.5 - rel + 1e-3); if (hz) b.x += sg * m; else b.y += sg * m; dist -= m;
  }
  return true;
}

function tickBombs(dt) {
  for (const b of V.bombs.slice()) {
    if (!V.bombs.includes(b)) continue;
    if (b.fly) {
      b.fly.p += dt / 0.55;
      if (b.fly.p >= 1) { b.fly = null; { const hit = playerAtCell(b.x, b.y); if (hit && Sim.time >= hit._invT) { hit._stunT = Sim.time + 0.9; hit.dashT = 0; hit.m = 0; if (b.type !== 1) b.fuse = Math.max(b.fuse, 2.1); } } if (V.grid[idx(b.x, b.y)] !== EMPTY || Sim.flameGrid[idx(b.x, b.y)] || bombAtCell(b.x, b.y, b)) b.fuse = 0; }
      else continue;
    }
    if (b.sl >= 0) { if (!slideBomb(b, b.sl, b.slSpd, dt)) b.sl = -1; }
    else { const cd = V.tiles.convAt[idx(clamp(Math.round(b.x), 0, GW - 1), clamp(Math.round(b.y), 0, GH - 1))]; if (cd >= 0) slideBomb(b, cd, 1.5, dt); }
    b.fuse -= dt;
    if (b.fuse > 0.08 && Sim.flameGrid[idx(clamp(Math.round(b.x), 0, GW - 1), clamp(Math.round(b.y), 0, GH - 1))]) b.fuse = 0.08;
    if (b.fuse <= 0) explode(b);
  }
}

function ownBombs(i) { let n = 0; for (const b of V.bombs) if (b.o === i && b.type === 0) n++; return n; }
function punchBomb(b, dir) { if (!b || b.fly) return false; const bx = Math.round(b.x), by = Math.round(b.y), L = findLanding(bx, by, dir); if (!L) return false; b.fly = { fx: bx, fy: by, p: 0 }; b.x = L[0]; b.y = L[1]; b.sl = -1; return true; }
function mkBomb(i, x, y, type, fuse) { const s = V.slots[i]; const b = { id: Sim.nextId++, x, y, o: i, fuse, range: s.range, pierce: s.pierce, type, sl: -1, slSpd: 0, fly: null }; V.bombs.push(b); return b; }

function reqBomb(i, cx, cy) {
  const s = V.slots[i]; if (V.ph !== 'play' || !s || !s.al) return false;
  cx |= 0; cy |= 0; if (!inb(cx, cy) || Math.abs(cx - s.x) > 1.6 || Math.abs(cy - s.y) > 1.6) return false;
  if (s.stun) return false;
  { const ob = bombAtCell(cx, cy); if (ob && s.glove && ob.type === 0 && !ob.fly && Math.round(s.x) === cx && Math.round(s.y) === cy) { const L = findLanding(cx, cy, s.d); if (!L) return false; ob.fly = { fx: cx, fy: cy, p: 0 }; ob.x = L[0]; ob.y = L[1]; ob.sl = -1; return true; } }
  if (s.punch) { const pb = bombAtCell(cx + DX[s.d], cy + DY[s.d]); if (pb && !pb.fly && !bombAtCell(cx, cy)) return punchBomb(pb, s.d); }
  if (s.curse === 3) return false;
  if (V.grid[idx(cx, cy)] !== EMPTY || bombAtCell(cx, cy)) return false;
  if (s.ice > 0) { s.ice--; mkBomb(i, cx, cy, 2, FUSE); return true; }
  if (ownBombs(i) >= s.maxB) return false;
  mkBomb(i, cx, cy, 0, FUSE); return true;
}
function reqRevenge(i, x, y) {
  const s = V.slots[i]; if (V.ph !== 'play' || !s || s.al || !s.rev || Sim.time < s._revT) return false;
  x |= 0; y |= 0; if (!((x === -1 || x === GW) !== (y === -1 || y === GH))) return false; if (x < -1 || x > GW || y < -1 || y > GH) return false;
  const dir = y === -1 ? 0 : y === GH ? 2 : x === -1 ? 3 : 1, L = findLanding(x, y, dir); if (!L) return false;
  const b = mkBomb(i, L[0], L[1], 0, FUSE); b.fly = { fx: x, fy: y, p: 0 }; s._revT = Sim.time + 4; return true;
}

function kickBomb(b, dir) { if (!b || b.fly) return false; b.sl = dir; b.slSpd = 8; return true; }

function findLanding(cx, cy, dir) {
  const ok = k => { const x = cx + DX[dir] * k, y = cy + DY[dir] * k; return inb(x, y) && V.grid[idx(x, y)] === EMPTY && !bombAtCell(x, y) ? [x, y] : null; };
  for (let k = 3; k <= 5; k++) { const r = ok(k); if (r) return r; if (!inb(cx + DX[dir] * k, cy + DY[dir] * k)) break; }
  for (let k = 2; k >= 1; k--) { const r = ok(k); if (r) return r; }
  return null;
}

function reqAbility(i, type, cx, cy, dir) {
  const s = V.slots[i]; if (V.ph !== 'play' || !s || !s.al || s.stun) return false;
  cx |= 0; cy |= 0; dir = dir & 3; if (!inb(cx, cy) || Math.abs(cx - s.x) > 1.6 || Math.abs(cy - s.y) > 1.6) return false;
  const ch = CHARS[s.ch].k;
  if (type === 'p') { if (!(s.kick || ch === 3)) return false; return kickBomb(bombAtCell(cx + DX[dir], cy + DY[dir]), dir); }
  if (ch === 0) {
    const rb = V.bombs.find(b => b.o === i && b.type === 1);
    if (rb) { if (rb.fly) return false; rb.fuse = 0; s._cdT = Sim.time + CHARS[0].cd; return true; }
    if (Sim.time < s._cdT || V.grid[idx(cx, cy)] !== EMPTY || bombAtCell(cx, cy)) return false;
    mkBomb(i, cx, cy, 1, 7); return true;
  }
  if (Sim.time < s._cdT) return false;
  if (ch === 1) {
    if (ownBombs(i) >= s.maxB) return false;
    const L = findLanding(cx, cy, dir); if (!L) return false;
    const b = mkBomb(i, L[0], L[1], 0, FUSE); b.fly = { fx: cx, fy: cy, p: 0 };
    s._cdT = Sim.time + CHARS[1].cd; return true;
  }
  if (ch === 2) { s._invT = Math.max(s._invT, Sim.time + 0.5); s._cdT = Sim.time + CHARS[2].cd; return true; }
  if (ch === 3) {
    const ax = cx + DX[dir], ay = cy + DY[dir]; const b = bombAtCell(ax, ay);
    if (b) kickBomb(b, dir);
    else if (!solidCell(ax, ay) && !playerAtCell(ax, ay) && ownBombs(i) < s.maxB) { const nb = mkBomb(i, ax, ay, 0, FUSE); nb.sl = dir; nb.slSpd = 8; }
    else return false;
    s._cdT = Sim.time + CHARS[3].cd; return true;
  }
  const cd = CHARS[s.ch].cd;
  if (ch === 4) { const L = findLanding(cx, cy, dir); if (!L) return false; const b = mkBomb(i, L[0], L[1], 2, 0.9); b.fly = { fx: cx, fy: cy, p: 0 }; s._cdT = Sim.time + cd; return true; }
  if (ch === 5) { s.shield = 1; s.tsh = 1; s._shT = Sim.time + 3; s._cdT = Sim.time + cd; return true; }
  if (ch === 6) { s._invT = Math.max(s._invT, Sim.time + 0.4); s._cdT = Sim.time + cd; return true; }
  if (ch === 7) {
    const ax = cx + DX[dir], ay = cy + DY[dir]; let b = bombAtCell(ax, ay);
    if (!b) { if (solidCell(ax, ay) || playerAtCell(ax, ay) || ownBombs(i) >= s.maxB) return false; b = mkBomb(i, ax, ay, 0, FUSE); }
    if (!punchBomb(b, dir)) return false; s._cdT = Sim.time + cd; return true;
  }
  if (ch === 8 || ch === 10) {   // mina invisível / megabomba: bomba extra na própria casa
    const ty = ch === 8 ? 3 : 4; if (V.grid[idx(cx, cy)] !== EMPTY || bombAtCell(cx, cy) || V.bombs.some(b => b.o === i && b.type === ty)) return false;
    mkBomb(i, cx, cy, ty, ch === 8 ? FUSE * 1.4 : FUSE); s._cdT = Sim.time + cd; return true;
  }
  if (ch === 9) {   // muro temporário na casa à frente
    const ax = cx + DX[dir], ay = cy + DY[dir]; if (!inb(ax, ay)) return false; const c = idx(ax, ay);
    if (V.grid[c] !== EMPTY || bombAtCell(ax, ay) || playerAtCell(ax, ay) || Sim.flameGrid[c]) return false;
    for (let k = V.pus.length - 1; k >= 0; k--) if (V.pus[k].x === ax && V.pus[k].y === ay) return false;
    V.grid[c] = BLOCK; Sim.walls.set(c, Sim.time + 5); s._cdT = Sim.time + cd; return true;
  }
  if (ch === 11) {   // terremoto: atordoa os adversários colados
    for (const o of V.slots) if (o.al && o.i !== i && teamOf(o.i) !== teamOf(i) && Sim.time >= o._invT && Math.abs(o.x - s.x) <= 1.6 && Math.abs(o.y - s.y) <= 1.6) { o._stunT = Sim.time + 1.3; o.dashT = 0; o.m = 0; }
    s._cdT = Sim.time + cd; return true;
  }
  return false;
}

function applyPU(s, t) {
  if (t === 0) s.maxB = Math.min(6, s.maxB + 1); else if (t === 1) s.range = Math.min(7, s.range + 1);
  else if (t === 2) s.spd = Math.min(4, s.spd + 1); else if (t === 3) s.shield = 1; else if (t === 4) s.kick = 1; else if (t === 5) s.pierce = 1; else if (t === 6) s.glove = 1; else if (t === 7) { s.curse = 1 + ((Math.random() * 4) | 0); s._curT = Sim.time + 10; s._curX = Sim.time + 1; } else if (t === 8) s.punch = 1; else s.ice = Math.min(4, s.ice + 2);
}
function killSlot(s) { s.al = 0; s.m = 0; s.dashT = 0; s.curse = 0; s.stun = 0; V.ld = [s.x, s.y]; if (V.revOn && s.k === 'h' && s.i === 0 && typeof Game !== 'undefined' && Game.mode !== 'client') { perimStart(s); s.rv = 1; } s._revT = Sim.time + 1.5; }

function endRound(w) {
  V.win = w ? w.i : -1;
  if (w) { for (const o of V.slots) if (o.k !== '-' && o !== w && V.teams && teamOf(o.i) === teamOf(w.i)) o.w++; w.w++; if (w.w >= V.wn) V.mwin = w.i; }
  if (V.mwin < 0 && V.rnd >= V.wn * 4) { const o = V.slots.filter(s => s.k !== '-').sort((a, b) => b.w - a.w); V.mwin = (o.length > 1 && o[0].w === o[1].w) ? -2 : o[0].i; }
  V.ph = 'rend'; Sim.phT = 4.2;
}

function simTogglePause(i) { if (V.ph !== 'play' && V.ph !== 'count') return; const n = performance.now(); if (n - (Sim.pzAt || 0) < 400) return; Sim.pzAt = n; V.pz = !V.pz; V.pzBy = i; }
function simTick(dt) {
  if (V.pz) return;
  Sim.time += dt;
  if (V.ph === 'count') { Sim.phT -= dt; V.c = Math.max(1, Math.ceil(Sim.phT)); if (Sim.phT <= 0) V.ph = 'play'; return; }
  if (V.ph === 'rend') {
    Sim.phT -= dt;
    for (let i = V.flames.length - 1; i >= 0; i--) { V.flames[i].ttl -= dt; if (V.flames[i].ttl <= 0) V.flames.splice(i, 1); }
    tickBurn(dt);
    if (Sim.phT <= 0) { if (V.mwin !== -1) { V.ph = 'mend'; if (typeof rankUpdate === 'function') rankUpdate(); } else simStartRound(); }
    return;
  }
  if (V.ph !== 'play') return;
  V.t = Math.max(0, V.t - dt); V.el += dt;
  for (const s of V.slots) { s.cd = Math.max(0, s._cdT - Sim.time); s.inv = Sim.time < s._invT ? 1 : 0; s.stun = Sim.time < s._stunT ? 1 : 0; if (s.al && s.k === 'b') { if (s.stun) s.m = 0; else botUpdate(s, dt); } }
  tickBombs(dt);
  for (let i = V.flames.length - 1; i >= 0; i--) { V.flames[i].ttl -= dt; if (V.flames[i].ttl <= 0) V.flames.splice(i, 1); }
  Sim.flameGrid.fill(0); for (const f of V.flames) if (!f.ice) for (const c of f.cells) Sim.flameGrid[idx(c[0], c[1])] = 1;
  tickBurn(dt);
  for (const p of V.pus) if (p.fresh > 0) p.fresh -= dt;
  // encolhimento da arena
  if (V.t <= SHRINK_AT && V.slots.filter(s => s.k !== '-' && s.al).length > 1) {
    Sim.shT -= dt;
    while (Sim.shT <= 0 && V.sh < N) {
      const c = SPIRAL[V.sh++]; if (V.grid[c] === PILLAR) continue;
      V.grid[c] = SOLID; Sim.burn.delete(c); Sim.shT += 0.36;
      const x = c % GW, y = (c / GW) | 0;
      for (let k = V.pus.length - 1; k >= 0; k--) if (V.pus[k].x === x && V.pus[k].y === y) V.pus.splice(k, 1);
      for (const b of V.bombs) if (!b.fly && Math.round(b.x) === x && Math.round(b.y) === y) b.fuse = 0;
    }
  }
  for (const s of V.slots) {
    s.rev = (!s.al && V.revOn && s.k === 'h' && V.t > SHRINK_AT) ? 1 : 0; if (s.rev) s.cd = Math.max(0, s._revT - Sim.time);
    if (!s.al) continue;
    const cx = clamp(Math.round(s.x), 0, GW - 1), cy = clamp(Math.round(s.y), 0, GH - 1), c = idx(cx, cy);
    if (s.curse) {
      if (Sim.time > s._curT) s.curse = 0;
      else { if (s.curse === 4 && Sim.time > (s._autoT || 0)) { s._autoT = Sim.time + 0.45; reqBomb(s.i, cx, cy); }
        if (Sim.time > s._curX) for (const o of V.slots) if (o !== s && o.al && !o.curse && Sim.time > o._curX && Math.round(o.x) === cx && Math.round(o.y) === cy) { o.curse = s.curse; o._curT = s._curT; o._curX = Sim.time + 1.5; s.curse = 0; s._curX = Sim.time + 1.5; break; } }
    }
    if (s.tsh && Sim.time > s._shT) { s.tsh = 0; s.shield = 0; }
    for (let k = V.pus.length - 1; k >= 0; k--) { const p = V.pus[k]; if (p.x === cx && p.y === cy) { applyPU(s, p.type); V.pus.splice(k, 1); } }
    if (V.grid[c] === SOLID) { killSlot(s); continue; }
    const lethal = Sim.flameGrid[c] || (V.tiles.spkAt[c] && spikeState(cx, cy, V.el) === 2);
    if (lethal && Sim.time >= s._invT) { if (s.shield) { s.shield = 0; s.tsh = 0; s._invT = Sim.time + 1.6; } else killSlot(s); }
  }
  const alive = V.slots.filter(s => s.k !== '-' && s.al);
  if (new Set(alive.map(s => teamOf(s.i))).size <= 1) { Sim.endT += dt; if (Sim.endT > 0.25) endRound(alive[0] || null); } else Sim.endT = 0;
}

function tickBurn(dt) {
  for (const [c, t] of Sim.walls) { if (V.grid[c] !== BLOCK) Sim.walls.delete(c); else if (Sim.time >= t) burnBlock(c); }
  for (const [c, o] of Sim.burn) {
    o.t -= dt;
    if (o.t <= 0) { if (V.grid[c] === BURN) { V.grid[c] = EMPTY; if (o.pu >= 0) V.pus.push({ x: c % GW, y: (c / GW) | 0, type: o.pu, fresh: 0.35 }); } Sim.burn.delete(c); }
  }
}

// ---------------- Bots ----------------
function dangerMap(extra, me) {
  const D = new Float32Array(N).fill(Infinity), BG = Sim.BG; BG.fill(0);
  const L = [];
  for (const b of V.bombs) {
    const x = clamp(Math.round(b.x), 0, GW - 1), y = clamp(Math.round(b.y), 0, GH - 1);
    if (!b.fly) BG[idx(x, y)] = 1;
    if (!b.fly && b.sl < 0 && V.tiles.convAt[idx(x, y)] >= 0) {
      let px = x, py = y, n = Math.round(Math.min(b.fuse, 3) * 1.5);
      while (n-- > 0) { const d = V.tiles.convAt[idx(px, py)]; if (d < 0) break; const nx = px + DX[d], ny = py + DY[d]; if (solidCell(nx, ny) || bombAtCell(nx, ny, b)) break; px = nx; py = ny; L.push({ x: px, y: py, f: b.fuse, r: b.range, p: b.pierce }); }
    }
    L.push({ x, y, f: b.type === 1 ? Math.min(b.fuse, b.o === me ? 1.5 : 1.0) : b.fuse + (b.fly ? (1 - b.fly.p) * 0.55 : 0), r: b.range, p: b.pierce });
  }
  if (extra) L.push(extra);
  const cs = L.map(b => blastCells(b.x, b.y, b.r, b.p, false));
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i < L.length; i++) for (let j = 0; j < L.length; j++)
    if (i !== j && L[j].f > L[i].f + 0.05 && cs[i].some(q => q[0] === L[j].x && q[1] === L[j].y)) L[j].f = L[i].f + 0.05;
  for (let i = 0; i < L.length; i++) for (const q of cs[i]) { const c = idx(q[0], q[1]); if (L[i].f < D[c]) D[c] = L[i].f; }
  for (let c = 0; c < N; c++) if (Sim.flameGrid[c]) D[c] = 0;
  for (const s of V.tiles.spk) { const c = idx(s[0], s[1]), ph = spikePhase(s[0], s[1], V.el), e = ph < 3.5 ? 3.5 - ph : 0; if (e < 1.6) D[c] = Math.min(D[c], e); }
  if (V.t <= SHRINK_AT + 3) { let k = 0, t = Math.max(0, V.t - SHRINK_AT) + Math.max(0, Sim.shT); for (let j = V.sh; j < N && k < 6; j++) { const c = SPIRAL[j]; if (V.grid[c] === PILLAR) continue; D[c] = Math.min(D[c], t + 0.36 * k); k++; } }
  return D;
}

function bfs(sx, sy, D, sp, mg) {
  if (mg === undefined) mg = 0.4;
  const dist = new Int16Array(N).fill(-1), prev = new Int16Array(N).fill(-1), q = [idx(sx, sy)]; dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], x = c % GW, y = (c / GW) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d], ny = y + DY[d]; if (!inb(nx, ny)) continue; const n = idx(nx, ny);
      if (dist[n] >= 0 || V.grid[n] !== EMPTY || Sim.BG[n]) continue;
      const arr = (dist[c] + 1) / sp;
      if (D[n] !== Infinity && D[n] <= arr + mg) continue;
      dist[n] = dist[c] + 1; prev[n] = c; q.push(n);
    }
  }
  return { dist, prev };
}
function pathFrom(R, c0, c) { const p = []; while (c !== c0 && c >= 0) { p.unshift([c % GW, (c / GW) | 0]); c = R.prev[c]; } return p; }
function nearestSafe(R, D) { let best = -1, bd = 1e9; for (let c = 0; c < N; c++) if (R.dist[c] >= 0 && D[c] === Infinity && R.dist[c] < bd) { bd = R.dist[c]; best = c; } return best; }

function botTryBomb(s, remote) {
  const cx = Math.round(s.x), cy = Math.round(s.y), sp = speedOf(s), c0 = idx(cx, cy);
  const f = remote ? 1.5 : FUSE;
  const D2 = dangerMap({ x: cx, y: cy, f, r: s.range, p: s.pierce }, s.i), R2 = bfs(cx, cy, D2, sp), esc = nearestSafe(R2, D2);
  if (esc < 0 || R2.dist[esc] / sp > f - 0.55) return false;
  const ok = remote ? reqAbility(s.i, 'a', cx, cy, s.d) : reqBomb(s.i, cx, cy);
  if (ok) { s.bot.path = pathFrom(R2, c0, esc); s.bot.goal = esc; }
  return ok;
}

function botPlan(s) {
  const b = s.bot, me = s.i, cx = Math.round(s.x), cy = Math.round(s.y), c0 = idx(cx, cy), sp = speedOf(s);
  let D, R;
  const enemies = V.slots.filter(o => o.al && o.i !== me && teamOf(o.i) !== teamOf(me));
  const hitsEnemy = cells => { for (const q of cells) for (const e of enemies) if (Math.round(e.x) === q[0] && Math.round(e.y) === q[1]) return true; return false; };
  const skill = V.diff > 0 || Math.random() < 0.3;
  // habilidades
  if (CHARS[s.ch].k === 0) {
    const rb = V.bombs.find(q => q.o === me && q.type === 1);
    if (rb && !rb.fly) {
      const cells = blastCells(Math.round(rb.x), Math.round(rb.y), rb.range, rb.pierce, false);
      if (hitsEnemy(cells) || rb.fuse < 5.4) {
        const f0 = rb.fuse; rb.fuse = 0; const Dx = dangerMap(null, me); rb.fuse = f0;
        const ok = (x, y) => Dx[idx(x, y)] > 0.7;
        if (ok(Math.floor(s.x), Math.floor(s.y)) && ok(Math.ceil(s.x), Math.ceil(s.y)) && b.path.slice(0, 3).every(t => ok(t[0], t[1]))) reqAbility(me, 'a', cx, cy, s.d);
      }
    }
  }
  D = dangerMap(null, me); R = bfs(cx, cy, D, sp);
  if (D[c0] < Infinity) {
    let best = nearestSafe(R, D);
    if (best < 0) { R = bfs(cx, cy, D, sp, 0.5 / sp + 0.03); best = nearestSafe(R, D); }
    if (best < 0) {
      let bt = -1; for (let c = 0; c < N; c++) if (R.dist[c] >= 0 && D[c] > bt) { bt = D[c]; best = c; }
      if (CHARS[s.ch].k === 5 && s.cd <= 0 && D[c0] < 0.9 && skill) reqAbility(me, 'a', cx, cy, s.d);
      if (CHARS[s.ch].k === 6 && s.cd <= 0 && D[c0] < 0.9 && skill) { for (let d = 0; d < 4; d++) { const tg = blinkTarget(cx, cy, d); if (tg && D[idx(tg[0], tg[1])] === Infinity && reqAbility(me, 'a', cx, cy, d)) { s.x = tg[0]; s.y = tg[1]; b.path = []; return; } } }
      if (CHARS[s.ch].k === 2 && s.cd <= 0 && D[c0] < 0.7 && skill) { for (let d = 0; d < 4; d++) { const x = cx + DX[d], y = cy + DY[d]; if (!solidCell(x, y)) { if (reqAbility(me, 'a', cx, cy, d)) { s.dashT = 0.2; s.dashDir = d; } break; } } }
    }
    b.path = best >= 0 ? pathFrom(R, c0, best) : []; b.goal = best; return;
  }
  if (skill && s.cd <= 0) {
    if (CHARS[s.ch].k === 11 && enemies.some(e => Math.abs(e.x - s.x) <= 1.5 && Math.abs(e.y - s.y) <= 1.5)) { if (reqAbility(me, 'a', cx, cy, s.d)) return; }
    if ((CHARS[s.ch].k === 8 || CHARS[s.ch].k === 10) && !Sim.BG[c0] && enemies.some(e => Math.abs(e.x - s.x) + Math.abs(e.y - s.y) <= 2.2)) { if (reqAbility(me, 'a', cx, cy, s.d)) { b.t = 0; return; } }
    if (CHARS[s.ch].k === 9) for (let d = 0; d < 4; d++) { const e = playerAtCell(cx + DX[d] * 2, cy + DY[d] * 2); if (e && teamOf(e.i) !== teamOf(me) && Math.random() < 0.3) { s.d = d; if (reqAbility(me, 'a', cx, cy, d)) return; } }
    if (CHARS[s.ch].k === 4) for (let d = 0; d < 4; d++) for (let k = 2; k <= 5; k++) { const e = playerAtCell(cx + DX[d] * k, cy + DY[d] * k); if (e && teamOf(e.i) !== teamOf(me)) { s.d = d; if (reqAbility(me, 'a', cx, cy, d)) return; } }
    if (CHARS[s.ch].k === 1 && ownBombs(me) < s.maxB) for (let d = 0; d < 4; d++) for (let k = 2; k <= 5; k++) { const x = cx + DX[d] * k, y = cy + DY[d] * k; if (playerAtCell(x, y) && playerAtCell(x, y).i !== me) { s.d = d; if (reqAbility(me, 'a', cx, cy, d)) return; } }
    if (CHARS[s.ch].k === 3) for (let d = 0; d < 4; d++) { for (let k = 1; k <= 7; k++) { const x = cx + DX[d] * k, y = cy + DY[d] * k; if (solidCell(x, y) || Sim.BG[idx(x, y)]) break; const e = playerAtCell(x, y); if (e && e.i !== me && k >= 3) { s.d = d; if (reqAbility(me, 'a', cx, cy, d)) return; } } }
  }
  const canBomb = ownBombs(me) < s.maxB && !Sim.BG[c0];
  const remoteOK = CHARS[s.ch].k === 0 && s.cd <= 0 && !V.bombs.some(q => q.o === me && q.type === 1) && !Sim.BG[c0];
  if (canBomb && V.diff > 0 && (V.diff === 2 || Math.random() < 0.5)) for (const e of enemies) {
    const ex = Math.round(e.x), ey = Math.round(e.y), ec = idx(ex, ey);
    if (Math.abs(ex - cx) + Math.abs(ey - cy) > s.range + 2) continue;
    const D2 = dangerMap({ x: cx, y: cy, f: FUSE, r: s.range, p: s.pierce }, me);
    Sim.BG[c0] = 1; const Re = bfs(ex, ey, D2, speedOf(e), 0.5 / speedOf(e)); Sim.BG[c0] = 0;
    if ((D2[ec] < Infinity || ec === c0) && nearestSafe(Re, D2) < 0 && botTryBomb(s, false)) return;
  }
  const sd = V.t <= SHRINK_AT ? 1.4 : 1, eW = [18, 40, 70][V.diff] * sd, cand = [];
  const nearEnemy = cells => { for (const e of enemies) for (const q of cells) if (Math.abs(q[0] - e.x) + Math.abs(q[1] - e.y) < 1.5) return true; return false; };
  for (let c = 0; c < N; c++) {
    if (R.dist[c] < 0 || D[c] < Infinity) continue; const d = R.dist[c]; if (d > 14) continue;
    const x = c % GW, y = (c / GW) | 0; let v = -d * 2 + Math.random() * 2.5 + (c === b.goal ? 4 : 0), bvx = 0;
    for (const p of V.pus) if (p.x === x && p.y === y) v += 55;
    if (canBomb || remoteOK) {
      const cells = blastCells(x, y, s.range, s.pierce, false); let nb = 0;
      for (const q of cells) if (V.grid[idx(q[0], q[1])] === BLOCK) nb++;
      bvx = nb * 11 + (hitsEnemy(cells) ? eW : V.diff > 0 && nearEnemy(cells) ? eW * 0.4 : 0);
    }
    if (enemies.length) { let md = 99; for (const e of enemies) md = Math.min(md, Math.abs(e.x - x) + Math.abs(e.y - y)); v -= md * [2.1, 2.5, 3.0][V.diff] * sd; }
    cand.push({ c, v: v + bvx, bvx });
  }
  let best = c0, bBomb = false;
  for (let tries = 0; tries < 8 && cand.length; tries++) {
    let k = 0; for (let i = 1; i < cand.length; i++) if (cand[i].v > cand[k].v) k = i;
    const q = cand[k];
    if (q.bvx > 0) {
      const x = q.c % GW, y = (q.c / GW) | 0, f = canBomb ? FUSE : 1.5;
      const D2 = dangerMap({ x, y, f, r: s.range, p: s.pierce }, me), R2 = bfs(x, y, D2, sp), esc = nearestSafe(R2, D2);
      if (esc < 0 || R2.dist[esc] / sp > f - 0.55) { q.v -= q.bvx; q.bvx = 0; continue; }
    }
    best = q.c; bBomb = q.bvx > 0; break;
  }
  b.goal = best;
  if (best === c0) {
    b.path = [];
    if (bBomb && Math.random() > (V.diff === 0 ? 0.55 : 0.04)) { if (canBomb) botTryBomb(s, false); else if (remoteOK) botTryBomb(s, true); }
  } else b.path = pathFrom(R, c0, best);
}

function botUpdate(s, dt) {
  const b = s.bot; if (!b) return;
  b.t -= dt;
  if (b.t <= 0) { b.t = [0.34, 0.2, 0.11][V.diff] + Math.random() * 0.05; botPlan(s); }
  if (s.dashT > 0) { updateMover(s, 0, 0, dt); return; }
  let ix = 0, iy = 0; s.lim = 0;
  while (b.path.length) {
    const t = b.path[0], dx = t[0] - s.x, dy = t[1] - s.y;
    if (Math.abs(dx) + Math.abs(dy) <= 0.03) { s.x = t[0]; s.y = t[1]; b.path.shift(); continue; }
    if (Math.abs(dx) > Math.abs(dy)) ix = Math.sign(dx); else iy = Math.sign(dy);
    s.lim = Math.abs(dx) + Math.abs(dy); break;
  }
  const r = updateMover(s, ix, iy, dt); s.lim = 0;
  if (r.tele) { b.path = []; b.t = 0; }
  if (r.hit && (s.kick || CHARS[s.ch].k === 3)) kickBomb(r.hit, s.d);
}
