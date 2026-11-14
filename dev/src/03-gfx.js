// ===================== GRÁFICOS 3D =====================
const G = { q: 2, w: 1, h: 1, inGame: false, shake: 0, epoch: -1, map: -1, rGrid: new Uint8Array(N), blocks: new Array(N).fill(null), burning: [], solids: [], bombs: new Map(), flames: new Map(), pus: new Map(), chars: [null, null, null, null], eSeen: [0, 0, 0, 0], emoT: [0, 0, 0, 0], time: 0, camT: new THREE.Vector3(), camD: 22, elev: 1.08, zoom: 0, portraits: [], icons: [], fx: 1, lights: [], decals: [], rings: [], warns: [], tiles: [], TC: [], youT: 0, comp: null, fz: 1, fx0: 0, fy0: 0, prof: [0, 0, 0, 0] };
let ren, scene, cam, sun, hemi;
const wx = x => x - 6, wz = y => y - 5;
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function ctex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
function speck(x, w, h, n, r, a0, a1, s0, s1) { for (let i = 0; i < n; i++) { const v = r() < 0.5 ? 0 : 255; x.fillStyle = `rgba(${v},${v},${v},${a0 + r() * (a1 - a0)})`; const s = s0 + r() * (s1 - s0); x.fillRect(r() * w, r() * h, s, s); } }
function normalFrom(c, k) {
  const w = c.width, h = c.height, src = c.getContext('2d').getImageData(0, 0, w, h).data, o = cv(w, h), ox = o.getContext('2d'), img = ox.createImageData(w, h), d = img.data;
  const L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = (src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11) / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const xl = L[y * w + ((x + w - 1) % w)], xr = L[y * w + ((x + 1) % w)], yu = L[((y + h - 1) % h) * w + x], yd = L[((y + 1) % h) * w + x];
    const nx = (xl - xr) * k, ny = (yd - yu) * k, l = Math.hypot(nx, ny, 1), i = (y * w + x) * 4;
    d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = (ny / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ox.putImageData(img, 0, 0); return ctex(o, false);
}
function stdMat(c, rough, metal, nk) { const m = new THREE.MeshStandardMaterial({ map: ctex(c), roughness: rough, metalness: metal }); if (nk) { m.normalMap = normalFrom(c, nk); } return m; }

const THEMES = [
  { sky: [0x1d2752, 0xf0a070, 0x2b2530], fog: 0x4a3f5e, sun: 0xffc48f, sunI: 3.2, sunPos: [-7, 11, 6], hemi: [0xa9b8ff, 0x3a2f2a, 0.45], exp: 1.0 },
  { sky: [0x2f8fe8, 0xd8f2ff, 0xd9c08a], fog: 0xbfe6f5, sun: 0xfff1d0, sunI: 2.9, sunPos: [6, 14, 5], hemi: [0xbfe3ff, 0xd9c08a, 0.3], exp: 0.82 },
  { sky: [0x03050c, 0x16233f, 0x0a140a], fog: 0x0a1020, sun: 0xe4ecff, sunI: 3.4, sunPos: [-5, 14, 4], hemi: [0x7f96d9, 0x1a2a1a, 0.5], exp: 1.05 },
  { sky: [0x0d0f12, 0x4a3020, 0x15100c], fog: 0x1a1512, sun: 0xffd6a8, sunI: 3.2, sunPos: [4, 13, 6], hemi: [0x9aa0aa, 0x2a1c14, 0.5], exp: 1.1 },
];

function paintFloor(m, tiles) {
  const S = 64, c = cv(GW * S, GH * S), x = c.getContext('2d'), r = mulberry(77 + m), W = c.width, H = c.height;
  x.fillStyle = ['#3d3f47', '#e0c48c', '#3f9a3a', '#5a5f68'][m]; x.fillRect(0, 0, W, H);
  if (m === 2) for (let i = 0; i < GW; i++) { x.fillStyle = i & 1 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)'; x.fillRect(i * S, 0, S, H); }
  speck(x, W, H, 9000, r, 0.03, 0.1, 1, 3);
  if (m === 1) { x.strokeStyle = 'rgba(120,80,30,.12)'; x.lineWidth = 2; for (let i = 0; i < 60; i++) { const y0 = r() * H; x.beginPath(); for (let px = 0; px <= W; px += 16) x.lineTo(px, y0 + Math.sin(px * 0.03 + i) * 5); x.stroke(); } }
  if (m === 3) for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) { x.strokeStyle = 'rgba(255,255,255,.10)'; x.lineWidth = 2; x.strokeRect(cx * S + 3, cy * S + 3, S - 6, S - 6); x.fillStyle = 'rgba(0,0,0,.45)'; for (const q of [[9, 9], [S - 9, 9], [9, S - 9], [S - 9, S - 9]]) { x.beginPath(); x.arc(cx * S + q[0], cy * S + q[1], 2.4, 0, 7); x.fill(); } }
  for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) if ((cx + cy) & 1) { x.fillStyle = 'rgba(0,0,0,.075)'; x.fillRect(cx * S, cy * S, S, S); }
  x.strokeStyle = 'rgba(0,0,0,.16)'; x.lineWidth = 1.5; for (let i = 0; i <= GW; i++) { x.beginPath(); x.moveTo(i * S, 0); x.lineTo(i * S, H); x.stroke(); } for (let i = 0; i <= GH; i++) { x.beginPath(); x.moveTo(0, i * S); x.lineTo(W, i * S); x.stroke(); }
  if (m === 0) { x.fillStyle = 'rgba(255,214,64,.75)'; for (let i = 0; i < GW; i += 2) x.fillRect(i * S + 14, 5 * S + S / 2 - 3, 36, 6); x.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 6; i++) { x.fillRect(6 * S + 4 + i * 10, 1 * S - 26, 6, 52); x.fillRect(6 * S + 4 + i * 10, 10 * S - 26, 6, 52); } }
  if (m === 2) { x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 5; x.strokeRect(10, 10, W - 20, H - 20); x.beginPath(); x.moveTo(W / 2, 10); x.lineTo(W / 2, H - 10); x.stroke(); x.beginPath(); x.arc(W / 2, H / 2, 96, 0, 7); x.stroke(); }
  if (m === 3) { x.save(); x.beginPath(); x.rect(0, 0, W, H); x.rect(12, 12, W - 24, H - 24); x.clip('evenodd'); for (let i = -H; i < W + H; i += 28) { x.fillStyle = (i / 28) & 1 ? '#f5c400' : '#1a1a1a'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 28, 0); x.lineTo(i + 28 - H, H); x.lineTo(i - H, H); x.fill(); } x.restore(); }
  for (const s of tiles.slow) { const g = x.createRadialGradient(s[0] * S + 32, s[1] * S + 32, 6, s[0] * S + 32, s[1] * S + 32, 40); g.addColorStop(0, 'rgba(110,70,30,.6)'); g.addColorStop(1, 'rgba(110,70,30,0)'); x.fillStyle = g; x.fillRect(s[0] * S - 8, s[1] * S - 8, S + 16, S + 16); x.strokeStyle = 'rgba(70,40,10,.35)'; x.lineWidth = 2; for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(s[0] * S + 32, s[1] * S + 32, 8 + k * 8, k, k + 4); x.stroke(); } }
  for (const s of tiles.spk) { x.fillStyle = '#23262c'; x.fillRect(s[0] * S + 6, s[1] * S + 6, S - 12, S - 12); x.strokeStyle = '#c62828'; x.lineWidth = 3; x.strokeRect(s[0] * S + 7, s[1] * S + 7, S - 14, S - 14); x.fillStyle = '#0a0a0c'; for (const q of [[20, 20], [44, 20], [32, 32], [20, 44], [44, 44]]) { x.beginPath(); x.arc(s[0] * S + q[0], s[1] * S + q[1], 6, 0, 7); x.fill(); } }
  for (const s of tiles.tele) for (const q of [[s[0], s[1]], [s[2], s[3]]]) { x.fillStyle = '#15181f'; x.beginPath(); x.arc(q[0] * S + 32, q[1] * S + 32, 27, 0, 7); x.fill(); x.strokeStyle = '#6b7280'; x.lineWidth = 3; x.stroke(); }
  for (const s of tiles.conv) { x.fillStyle = '#17191d'; x.fillRect(s[0] * S + 2, s[1] * S + 2, S - 4, S - 4); }
  return c;
}

function texCrate(base, frame, seed) {
  const c = cv(256, 256), x = c.getContext('2d'), r = mulberry(seed);
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) { x.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.12})`; x.fillRect(i * 64, 0, 64, 256); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(i * 64, 0, 2.5, 256); }
  for (let i = 0; i < 120; i++) { x.strokeStyle = `rgba(${r() < 0.5 ? 20 : 255},${r() < 0.5 ? 10 : 220},150,${0.03 + r() * 0.06})`; x.lineWidth = 1; const px = r() * 256; x.beginPath(); x.moveTo(px, r() * 256); x.lineTo(px + rnd(3), r() * 256); x.stroke(); }
  x.save(); x.translate(128, 128); x.rotate(Math.PI / 4); x.fillStyle = frame; x.fillRect(-170, -17, 340, 34); x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 3; x.strokeRect(-170, -17, 340, 34); x.restore();
  x.fillStyle = frame; x.fillRect(0, 0, 256, 30); x.fillRect(0, 226, 256, 30); x.fillRect(0, 0, 30, 256); x.fillRect(226, 0, 30, 256);
  x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 3; x.strokeRect(30, 30, 196, 196); x.strokeRect(1.5, 1.5, 253, 253);
  x.fillStyle = 'rgba(20,20,20,.7)'; for (const q of [[15, 15], [241, 15], [15, 241], [241, 241], [128, 15], [128, 241], [15, 128], [241, 128]]) { x.beginPath(); x.arc(q[0], q[1], 4, 0, 7); x.fill(); }
  speck(x, 256, 256, 900, r, 0.03, 0.09, 1, 3); return c;
}
function texBarrel(col, seed) {
  const c = cv(256, 128), x = c.getContext('2d'), r = mulberry(seed);
  x.fillStyle = col; x.fillRect(0, 0, 256, 128);
  for (const y of [8, 44, 84, 120]) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, y - 4, 256, 8); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, y - 4, 256, 2); }
  x.fillStyle = '#f5c400'; x.fillRect(96, 52, 64, 26); x.fillStyle = '#111'; x.beginPath(); x.moveTo(128, 56); x.lineTo(140, 74); x.lineTo(116, 74); x.fill();
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(90,40,10,${r() * 0.3})`; x.beginPath(); x.arc(r() * 256, r() * 128, 2 + r() * 7, 0, 7); x.fill(); }
  speck(x, 256, 128, 500, r, 0.03, 0.1, 1, 2); return c;
}
function texPillar(m) {
  const c = cv(256, 256), x = c.getContext('2d'), r = mulberry(31 + m);
  if (m === 0) { x.fillStyle = '#8d9096'; x.fillRect(0, 0, 256, 256); speck(x, 256, 256, 2600, r, 0.04, 0.14, 1, 4); for (let i = -256; i < 512; i += 40) { x.fillStyle = (i / 40) & 1 ? '#f2c200' : '#1c1c1c'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 40, 0); x.lineTo(i + 10, 46); x.lineTo(i - 30, 46); x.fill(); } x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 2; for (let i = 0; i < 5; i++) { x.beginPath(); let px = r() * 256, py = 60 + r() * 180; x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += rnd(26); py += r() * 22; x.lineTo(px, py); } x.stroke(); } }
  else if (m === 1) { x.fillStyle = '#7d7468'; x.fillRect(0, 0, 256, 256); speck(x, 256, 256, 2200, r, 0.03, 0.09, 2, 6); }
  else if (m === 2) { x.fillStyle = '#eef1f6'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#1e54d6'; x.fillRect(0, 70, 256, 54); x.fillStyle = '#e53935'; x.fillRect(0, 132, 256, 16); x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 3; for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); } speck(x, 256, 256, 900, r, 0.02, 0.06, 1, 3); }
  else { x.fillStyle = '#6f7682'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = 4; x.strokeRect(8, 8, 240, 240); x.strokeRect(8, 8, 240, 116); x.fillStyle = '#2a2d33'; for (let i = 0; i < 6; i++) for (const y of [20, 112, 136, 236]) { x.beginPath(); x.arc(24 + i * 41.6, y, 5, 0, 7); x.fill(); } for (let i = -256; i < 512; i += 36) { x.fillStyle = (i / 36) & 1 ? '#f5c400' : '#1a1a1a'; x.beginPath(); x.moveTo(i, 150); x.lineTo(i + 36, 150); x.lineTo(i + 16, 190); x.lineTo(i - 20, 190); x.fill(); } for (let i = 0; i < 60; i++) { x.strokeStyle = `rgba(255,255,255,${r() * 0.12})`; x.beginPath(); const px = r() * 256, py = r() * 256; x.moveTo(px, py); x.lineTo(px + rnd(40), py + rnd(6)); x.stroke(); } speck(x, 256, 256, 1200, r, 0.03, 0.1, 1, 3); }
  return c;
}
function texWall(m) {
  const c = cv(256, 128), x = c.getContext('2d'), r = mulberry(55 + m);
  if (m === 0) { x.fillStyle = '#7a3b2e'; x.fillRect(0, 0, 256, 128); for (let y = 0; y < 8; y++) for (let i = -1; i < 5; i++) { const px = i * 64 + (y & 1) * 32; x.fillStyle = `rgba(${150 + r() * 50},${70 + r() * 30},${55 + r() * 20},1)`; x.fillRect(px + 2, y * 16 + 2, 60, 12); } }
  else if (m === 1) { x.fillStyle = '#b08a55'; x.fillRect(0, 0, 256, 128); for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.15})`; x.fillRect(i * 32, 0, 32, 128); x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(i * 32, 0, 3, 128); } }
  else if (m === 2) { x.fillStyle = '#0b1b4d'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#ffd400'; x.font = 'bold 64px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('GOL!', 128, 68); }
  else { x.fillStyle = '#4b5059'; x.fillRect(0, 0, 256, 128); for (let i = 0; i < 16; i++) { x.fillStyle = i & 1 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.2)'; x.fillRect(i * 16, 0, 16, 128); } x.fillStyle = '#f5c400'; x.fillRect(0, 0, 256, 10); }
  speck(x, 256, 128, 700, r, 0.03, 0.1, 1, 3); return c;
}
function texGround(m) {
  const c = cv(256, 256), x = c.getContext('2d'), r = mulberry(91 + m);
  x.fillStyle = ['#2a2c33', '#d9bd85', '#2d6e2b', '#2b2c30'][m]; x.fillRect(0, 0, 256, 256); speck(x, 256, 256, 2500, r, 0.02, 0.06, 1, 3); return c;
}

function makeEnv(T) {
  const s = new THREE.Scene(), geo = new THREE.SphereGeometry(50, 24, 14), pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const top = new THREE.Color(T.sky[0]), hor = new THREE.Color(T.sky[1]), bot = new THREE.Color(T.sky[2]), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 50; if (y > 0) c.copy(hor).lerp(top, Math.pow(y, 0.6)); else c.copy(hor).lerp(bot, Math.min(1, -y * 3)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const sm = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(T.sun).multiplyScalar(7) }));
  sm.position.set(T.sunPos[0], T.sunPos[1], T.sunPos[2]).normalize().multiplyScalar(40); s.add(sm);
  const tex = G.pmrem.fromScene(s, 0.03).texture; geo.dispose(); return tex;
}

const GEO = {};
function geos() {
  if (GEO.box) return GEO;
  GEO.box = new RoundedBoxGeometry(0.96, 0.84, 0.96, 3, 0.07);
  GEO.crate = new RoundedBoxGeometry(0.88, 0.8, 0.88, 2, 0.05);
  GEO.barrel = new THREE.CylinderGeometry(0.4, 0.4, 0.84, 18);
  GEO.rock = new THREE.IcosahedronGeometry(0.58, 1); { const p = GEO.rock.attributes.position, r = mulberry(5); for (let i = 0; i < p.count; i++) { const k = 0.86 + r() * 0.28; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.9, p.getZ(i) * k); } GEO.rock.computeVertexNormals(); }
  GEO.solid = new RoundedBoxGeometry(0.98, 0.9, 0.98, 2, 0.06);
  GEO.plane = new THREE.PlaneGeometry(1, 1);
  GEO.sph = new THREE.SphereGeometry(1, 20, 14); GEO.sphLo = new THREE.SphereGeometry(1, 10, 8);
  GEO.cube = new THREE.BoxGeometry(1, 1, 1);
  GEO.cone = new THREE.ConeGeometry(0.075, 0.5, 8);
  GEO.ring = new THREE.RingGeometry(0.3, 0.42, 36);
  GEO.torus = new THREE.TorusGeometry(0.36, 0.05, 8, 28);
  GEO.pu = new RoundedBoxGeometry(0.58, 0.58, 0.16, 3, 0.07);
  return GEO;
}

function buildProps(m) {
  const g = new THREE.Group(), r = mulberry(400 + m), add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  const gm = stdMat(texGround(m), m === 1 ? 0.95 : 0.9, 0, 1.5); gm.map.repeat.set(24, 24); gm.normalMap.repeat.set(24, 24);
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), gm); gp.rotation.x = -Math.PI / 2; gp.position.y = -0.03; gp.receiveShadow = true; g.add(gp);
  const glow = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), toneMapped: false });
  if (m === 0) {
    const wc = cv(128, 256), x = wc.getContext('2d'); x.fillStyle = '#1b1e29'; x.fillRect(0, 0, 128, 256); for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 6; xx++) { const on = r() < 0.45; x.fillStyle = on ? `rgb(255,${190 + r() * 50},${110 + r() * 60})` : '#0c0e14'; x.fillRect(8 + xx * 20, 8 + yy * 15.5, 12, 9); }
    const ec = cv(128, 256), ex = ec.getContext('2d'); ex.drawImage(wc, 0, 0); const id = ex.getImageData(0, 0, 128, 256); for (let i = 0; i < id.data.length; i += 4) if (id.data[i] < 200) { id.data[i] = id.data[i + 1] = id.data[i + 2] = 0; } ex.putImageData(id, 0, 0);
    const bm = new THREE.MeshStandardMaterial({ map: ctex(wc), emissiveMap: ctex(ec), emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.7 });
    const spots = [[-15, -15], [-9, -17], [-3, -16], [3, -18], [9, -16], [15, -15], [-17, -7], [17, -6], [-18, 1], [18, 2]];
    for (const s of spots) { const h = 7 + r() * 9; add(GEO.cube, bm, s[0], h / 2, s[1], 5 + r() * 1.5, h, 5 + r() * 1.5); }
    const pm = new THREE.MeshStandardMaterial({ color: 0x2b2e36, roughness: 0.5, metalness: 0.7 });
    for (const s of [[-8.6, -7.4], [8.6, -7.4], [-8.6, 7.2], [8.6, 7.2]]) { add(new THREE.CylinderGeometry(0.07, 0.09, 4, 8), pm, s[0], 2, s[1]); add(GEO.sph, glow(0xffd9a0, 4), s[0], 4.05, s[1], 0.18, 0.18, 0.18).castShadow = false; }
  } else if (m === 1) {
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(140, 50), new THREE.MeshStandardMaterial({ color: 0x1787c9, roughness: 0.12, metalness: 0.35 })); sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.0, -34); g.add(sea);
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(140, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })); foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.01, -9.2); g.add(foam); g.userData.foam = foam;
    const tm = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 }), lm = new THREE.MeshStandardMaterial({ color: 0x2f8f3a, roughness: 0.7, side: THREE.DoubleSide });
    for (const s of [[-10.5, -7.5], [-9.5, 3], [10.2, -7], [10.8, 4.5], [-3, -8.3], [5, -8.4]]) {
      const h = 3.2 + r() * 1.4, t = add(new THREE.CylinderGeometry(0.11, 0.17, h, 8), tm, s[0], h / 2, s[1]); t.rotation.z = rnd(0.12);
      for (let k = 0; k < 7; k++) { const lf = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.9, 4), lm); const a = k / 7 * Math.PI * 2; lf.position.set(s[0] + Math.cos(a) * 0.75, h - 0.15, s[1] + Math.sin(a) * 0.75); lf.rotation.set(0, -a, -Math.PI / 2 - 0.45, 'YXZ'); lf.scale.set(1, 1, 0.25); lf.castShadow = true; g.add(lf); }
    }
    for (const s of [[-9.6, -2, 0xe53935], [9.6, -1, 0xffd400], [9.2, 6.6, 0x1e88e5]]) { add(new THREE.CylinderGeometry(0.04, 0.04, 2, 6), tm, s[0], 1, s[1]); add(new THREE.ConeGeometry(1.25, 0.5, 12), new THREE.MeshStandardMaterial({ color: s[2], roughness: 0.6 }), s[0], 2.1, s[1]); }
  } else if (m === 2) {
    const cc = cv(256, 128), x = cc.getContext('2d'); x.fillStyle = '#141826'; x.fillRect(0, 0, 256, 128); const cols = ['#e53935', '#fdd835', '#1e88e5', '#eeeeee', '#43a047', '#fb8c00']; for (let i = 0; i < 1700; i++) { x.fillStyle = cols[(r() * cols.length) | 0]; x.fillRect(r() * 256, r() * 128, 3, 4); }
    const sm = new THREE.MeshStandardMaterial({ map: ctex(cc), color: 0x7f8798, roughness: 0.95 }); sm.map.repeat.set(4, 1);
    for (let t = 0; t < 4; t++) { add(GEO.cube, sm, 0, 1 + t * 1.3, -9.6 - t * 1.8, 30, 2 + t * 2.6, 1.8); for (const sx of [-1, 1]) add(GEO.cube, sm, sx * (10.6 + t * 1.8), 1 + t * 1.3, -1, 22, 2 + t * 2.6, 1.8).rotation.y = Math.PI / 2; }
    const pm = new THREE.MeshStandardMaterial({ color: 0x30343c, roughness: 0.5, metalness: 0.7 });
    for (const s of [[-12, -11], [12, -11]]) { add(new THREE.CylinderGeometry(0.14, 0.2, 13, 8), pm, s[0], 6.5, s[1]); const p = add(GEO.cube, glow(0xeaf2ff, 5), s[0] * 0.97, 13.2, s[1] + 0.3, 2.6, 1.3, 0.2); p.castShadow = false; p.lookAt(0, 0, 0); }
  } else {
    const wm = stdMat(texWall(3), 0.55, 0.7, 2); wm.map.repeat.set(8, 3); wm.normalMap.repeat.set(8, 3);
    add(GEO.cube, wm, 0, 4, -10.5, 34, 8, 0.5); add(GEO.cube, wm, -12.5, 4, -1, 0.5, 8, 22); add(GEO.cube, wm, 12.5, 4, -1, 0.5, 8, 22);
    for (const xx of [-8, -2.6, 2.6, 8]) { const f = add(GEO.cube, glow(0xff6a1a, 3.2), xx, 2.2, -10.2, 1.8, 1.3, 0.1); f.castShadow = false; }
    const pm = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.35, metalness: 0.85 });
    for (const yy of [4.6, 5.4]) { const p = add(new THREE.CylinderGeometry(0.2, 0.2, 34, 10), pm, 0, yy, -10); p.rotation.z = Math.PI / 2; }
    for (const s of [[-12.1, 3.2], [12.1, 3.2]]) { const p = add(new THREE.CylinderGeometry(0.16, 0.16, 20, 10), pm, s[0], s[1], -1); p.rotation.x = Math.PI / 2; }
    const bm = stdMat(texBarrel('#2f6fb5', 9), 0.5, 0.5, 1.5);
    for (const s of [[-9.3, -7], [-9.9, -6.1], [9.4, -7.2], [9.6, 5.5], [-9.5, 6.5]]) add(GEO.barrel, bm, s[0], 0.42, s[1]);
  }
  return g;
}

function themeCache(m) {
  if (G.TC[m]) return G.TC[m];
  geos(); const T = THEMES[m], tiles = mapTiles(m), C = { T };
  C.env = makeEnv(T);
  const fc = paintFloor(m, tiles);
  C.floorMat = new THREE.MeshStandardMaterial({ map: ctex(fc), normalMap: normalFrom(fc, [2.2, 1.6, 1.2, 2.6][m]), roughness: [0.82, 0.95, 0.9, 0.42][m], metalness: [0.05, 0, 0, 0.75][m] });
  C.floorMat.map.wrapS = C.floorMat.map.wrapT = THREE.ClampToEdgeWrapping;
  C.pillarMat = stdMat(texPillar(m), [0.85, 0.95, 0.6, 0.4][m], [0, 0, 0, 0.8][m], 2);
  C.pillarGeo = m === 1 ? GEO.rock : GEO.box; if (m === 1) { C.pillarMat.flatShading = true; C.pillarMat.normalMap = null; }
  C.wallMat = stdMat(texWall(m), [0.9, 0.85, 0.5, 0.5][m], [0, 0, 0.1, 0.7][m], 2);
  if (m === 2) { C.wallMat.emissiveMap = C.wallMat.map; C.wallMat.emissive = new THREE.Color(0xffffff); C.wallMat.emissiveIntensity = 0.55; }
  const crate = [['#a8743d', '#7d5226'], ['#d2a55e', '#2a9d8f'], ['#2a5fc9', '#e9edf5'], null][m];
  C.blockMat = crate ? stdMat(texCrate(crate[0], crate[1], 13 + m), 0.8, 0, 2.2) : stdMat(texBarrel('#b53124', 21), 0.45, 0.55, 1.6);
  C.blockGeo = crate ? GEO.crate : GEO.barrel;
  C.debris = [0x9a6a38, 0xcaa060, 0x3565c0, 0xa33326][m];
  C.props = buildProps(m);
  G.TC[m] = C; return C;
}

function buildArena() {
  const m = V.map, C = themeCache(m), T = C.T;
  if (G.arena) { G.arena.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); scene.remove(G.arena); }
  for (const o of G.bombs.values()) scene.remove(o.g); G.bombs.clear();
  for (const o of G.pus.values()) scene.remove(o); G.pus.clear();
  G.flames.clear(); G.blocks.fill(null); G.burning.length = 0; G.solids.length = 0; G.tiles.length = 0;
  for (const d of G.decals) { d.t = 0; d.m.visible = false; }
  P.list.length = 0;
  for (const c of G.chars) if (c) { c.alive = false; c.dead = 0; c.g.visible = false; }
  const A = G.arena = new THREE.Group(); scene.add(A);
  scene.background = new THREE.Color(T.sky[1]).lerp(new THREE.Color(T.sky[0]), 0.55); scene.fog = new THREE.Fog(T.fog, 34, 90); scene.environment = C.env;
  sun.color.set(T.sun); sun.intensity = T.sunI; sun.position.set(T.sunPos[0], T.sunPos[1], T.sunPos[2]); hemi.color.set(T.hemi[0]); hemi.groundColor.set(T.hemi[1]); hemi.intensity = T.hemi[2]; ren.toneMappingExposure = T.exp;
  A.add(C.props);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(GW, GH), C.floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0); floor.receiveShadow = true; A.add(floor);
  const D = new THREE.Object3D(), r = mulberry(V.epoch * 7 + 3);
  const pil = new THREE.InstancedMesh(C.pillarGeo, C.pillarMat, 30); let k = 0;
  for (let y = 1; y < GH; y += 2) for (let x = 1; x < GW; x += 2) { D.position.set(wx(x), 0.42, wz(y)); D.rotation.set(0, m === 1 ? r() * 6 : 0, 0); const s = m === 1 ? 0.9 + r() * 0.2 : 1; D.scale.set(s, s, s); D.updateMatrix(); pil.setMatrixAt(k++, D.matrix); }
  pil.castShadow = pil.receiveShadow = true; A.add(pil);
  const wall = new THREE.InstancedMesh(GEO.box, C.wallMat, 52); k = 0; D.rotation.set(0, 0, 0);
  const putW = (x, y, h) => { D.position.set(wx(x), 0.42 * h, wz(y)); D.scale.set(1.04, h, 1.04); D.updateMatrix(); wall.setMatrixAt(k++, D.matrix); };
  for (let x = -1; x <= GW; x++) { putW(x, -1, 1.1); putW(x, GH, 0.4); }
  for (let y = 0; y < GH; y++) { putW(-1, y, 0.8); putW(GW, y, 0.8); }
  wall.castShadow = wall.receiveShadow = true; A.add(wall);
  for (let c = 0; c < N; c++) if (V.grid[c] === BLOCK || V.grid[c] === BURN) addBlock(c, C, r);
  for (let c = 0; c < N; c++) if (V.grid[c] === SOLID) addSolid(c, false);
  // peças especiais
  const tl = V.tiles;
  if (tl.conv.length) {
    if (!G.convTex) { const cc = cv(64, 64), x = cc.getContext('2d'); x.fillStyle = '#1d2026'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#f5c400'; x.lineWidth = 7; x.lineJoin = 'miter'; for (const y of [26, 58]) { x.beginPath(); x.moveTo(12, y); x.lineTo(32, y - 18); x.lineTo(52, y); x.stroke(); } G.convTex = ctex(cc); G.convMat = new THREE.MeshStandardMaterial({ map: G.convTex, roughness: 0.6, metalness: 0.3 }); }
    for (const c of tl.conv) { const h = new THREE.Group(), p = new THREE.Mesh(GEO.plane, G.convMat); p.rotation.x = -Math.PI / 2; p.scale.set(0.92, 0.92, 1); p.receiveShadow = true; h.add(p); h.position.set(wx(c[0]), 0.012, wz(c[1])); h.rotation.y = [Math.PI, Math.PI / 2, 0, -Math.PI / 2][c[2]]; A.add(h); }
  }
  for (const s of tl.tele) for (const q of [[s[0], s[1]], [s[2], s[3]]]) {
    const col = s[0] === 0 ? 0x29d3ff : 0xff4dd2, t = new THREE.Mesh(GEO.torus, new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2.2), toneMapped: false })); t.rotation.x = Math.PI / 2; t.position.set(wx(q[0]), 0.07, wz(q[1])); A.add(t);
    const d = new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ map: glowTex(), color: col, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); d.rotation.x = -Math.PI / 2; d.position.set(wx(q[0]), 0.03, wz(q[1])); d.scale.set(0.9, 0.9, 1); A.add(d); G.tiles.push({ k: 't', t, d });
  }
  if (tl.spk.length) {
    const sm = new THREE.MeshStandardMaterial({ color: 0xcfd6e0, roughness: 0.25, metalness: 1 });
    for (const s of tl.spk) { const h = new THREE.Group(); for (const q of [[-0.19, -0.19], [0.19, -0.19], [0, 0], [-0.19, 0.19], [0.19, 0.19]]) { const c = new THREE.Mesh(GEO.cone, sm); c.position.set(q[0], 0.25, q[1]); c.castShadow = true; h.add(c); } h.position.set(wx(s[0]), -0.5, wz(s[1])); A.add(h);
      const w = new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0, depthWrite: false })); w.rotation.x = -Math.PI / 2; w.position.set(wx(s[0]), 0.02, wz(s[1])); w.scale.set(0.86, 0.86, 1); A.add(w); G.tiles.push({ k: 's', h, w, x: s[0], y: s[1] }); }
  }
  for (let i = 0; i < 4; i++) { let w = G.warns[i]; if (!w) { w = G.warns[i] = new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ color: 0xff1a1a, transparent: true, opacity: 0.5, depthWrite: false })); w.rotation.x = -Math.PI / 2; w.scale.set(0.9, 0.9, 1); scene.add(w); } w.visible = false; }
  G.rGrid.set(V.grid); G.epoch = V.epoch; G.map = V.map; G.youT = 4;
}
function addBlock(c, C, r) {
  const m = new THREE.Mesh(C.blockGeo, C.blockMat); m.position.set(wx(c % GW), 0.41, wz((c / GW) | 0)); m.rotation.y = ((r() * 4) | 0) * Math.PI / 2 + (C.blockGeo === GEO.barrel ? r() * 6 : 0); m.castShadow = m.receiveShadow = true; G.arena.add(m); G.blocks[c] = m;
}
function addSolid(c, drop) {
  if (!G.solidMat) { const sc = cv(128, 128), x = sc.getContext('2d'); x.fillStyle = '#2a2d35'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#ff3b30'; x.lineWidth = 8; x.strokeRect(10, 10, 108, 108); x.fillStyle = '#ff3b30'; x.beginPath(); x.moveTo(64, 34); x.lineTo(94, 90); x.lineTo(34, 90); x.fill(); G.solidMat = new THREE.MeshStandardMaterial({ map: ctex(sc), roughness: 0.4, metalness: 0.8 }); }
  const m = new THREE.Mesh(GEO.solid, G.solidMat); m.position.set(wx(c % GW), drop ? 9 : 0.45, wz((c / GW) | 0)); m.castShadow = m.receiveShadow = true; G.arena.add(m); if (drop) G.solids.push({ m, v: 0 });
}

let _glow = null, _scorch = null;
function glowTex() { if (_glow) return _glow; const c = cv(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return _glow = ctex(c); }
function scorchTex() { if (_scorch) return _scorch; const c = cv(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(0.6, 'rgba(0,0,0,.4)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return _scorch = ctex(c); }

// ---------- ícones ----------
const PU_BG = ['#3a3f4f', '#c0271d', '#b08a00', '#0e5ea8', '#1f7a3c', '#7a22b5'];
function drawIcon(x, t) {
  x.lineJoin = 'round'; x.lineCap = 'round';
  const circ = (a, b, r) => { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); };
  if (t === 0) { x.fillStyle = '#14151b'; circ(0, 8, 30); x.fillStyle = '#5b606d'; x.fillRect(-8, -32, 16, 13); x.strokeStyle = '#d9b06f'; x.lineWidth = 5; x.beginPath(); x.moveTo(0, -32); x.quadraticCurveTo(10, -48, 24, -40); x.stroke(); x.fillStyle = '#ffb300'; circ(26, -40, 7); x.fillStyle = 'rgba(255,255,255,.35)'; circ(-11, -3, 8); }
  if (t === 1 || t === 5) { x.fillStyle = '#ff6a1f'; x.beginPath(); x.moveTo(0, -44); x.bezierCurveTo(28, -14, 36, 8, 22, 28); x.bezierCurveTo(12, 44, -12, 44, -22, 28); x.bezierCurveTo(-36, 6, -14, -6, -12, -24); x.bezierCurveTo(-4, -14, 0, -22, 0, -44); x.fill(); x.fillStyle = '#ffe14d'; x.beginPath(); x.moveTo(0, -10); x.bezierCurveTo(14, 4, 16, 18, 8, 28); x.bezierCurveTo(2, 36, -8, 34, -11, 26); x.bezierCurveTo(-16, 14, -4, 6, 0, -10); x.fill(); }
  if (t === 5) { x.strokeStyle = '#fff'; x.lineWidth = 8; x.beginPath(); x.moveTo(-42, 0); x.lineTo(40, 0); x.stroke(); x.beginPath(); x.moveTo(24, -14); x.lineTo(42, 0); x.lineTo(24, 14); x.stroke(); }
  if (t === 2) { x.fillStyle = '#ffe14d'; x.strokeStyle = '#7a5b00'; x.lineWidth = 4; x.beginPath(); x.moveTo(10, -46); x.lineTo(-24, 6); x.lineTo(-3, 6); x.lineTo(-12, 46); x.lineTo(26, -10); x.lineTo(5, -10); x.closePath(); x.fill(); x.stroke(); }
  if (t === 3) { x.fillStyle = '#4fc3ff'; x.strokeStyle = '#fff'; x.lineWidth = 6; x.beginPath(); x.moveTo(0, -42); x.lineTo(32, -28); x.lineTo(32, 2); x.bezierCurveTo(32, 24, 16, 38, 0, 44); x.bezierCurveTo(-16, 38, -32, 24, -32, 2); x.lineTo(-32, -28); x.closePath(); x.fill(); x.stroke(); }
  if (t === 4) { x.fillStyle = '#fff'; circ(0, 0, 36); x.fillStyle = '#16171c'; x.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; x.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); } x.fill(); x.strokeStyle = '#16171c'; x.lineWidth = 4; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; x.beginPath(); x.moveTo(Math.cos(a) * 14, Math.sin(a) * 14); x.lineTo(Math.cos(a) * 34, Math.sin(a) * 34); x.stroke(); } x.beginPath(); x.arc(0, 0, 36, 0, 7); x.stroke(); }
}
function iconCanvas(t, size, bg) { const c = cv(size, size), x = c.getContext('2d'); if (bg) { x.fillStyle = PU_BG[t]; x.beginPath(); if (x.roundRect) x.roundRect(4, 4, size - 8, size - 8, size * 0.2); else x.rect(4, 4, size - 8, size - 8); x.fill(); x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = size * 0.05; x.stroke(); } x.translate(size / 2, size / 2); x.scale(size / 128, size / 128); drawIcon(x, t); return c; }

// ---------- personagens ----------
function buildChar(ch, slot) {
  geos();
  const D = [{ skin: 0x5c3a26, top: 0xff7a1a, bot: 0x1f2a44, shoe: 0xf4f4f4, hair: 0x120d0a, sc: 1, shorts: 0 },
  { skin: 0xf0c6a2, top: 0x12b5a4, bot: 0x20212b, shoe: 0xff5fa2, hair: 0xf2cf63, sc: 0.96, shorts: 0 },
  { skin: 0xc48a5c, top: 0x7c4dff, bot: 0x2f3440, shoe: 0xe53935, hair: 0x24160f, sc: 0.88, shorts: 1 },
  { skin: 0xa56d47, top: 0xffd400, bot: 0x1546c4, shoe: 0x151515, hair: 0x150e09, sc: 0.88, shorts: 1 }][ch];
  const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig); rig.scale.setScalar(D.sc * 1.05);
  const M = (c, r = 0.7, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const skin = M(D.skin, 0.55), top = M(D.top, 0.85), bot = M(D.bot, 0.85), shoe = M(D.shoe, 0.45), hair = M(D.hair, 0.95), white = M(0xffffff, 0.4), dark = M(0x17120f, 0.5);
  const add = (geo, mat, x, y, z, par = rig, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; par.add(m); return m; };
  const legGeo = new THREE.CapsuleGeometry(0.068, 0.24, 4, 10), armGeo = new THREE.CapsuleGeometry(0.05, 0.2, 4, 8);
  const mkLeg = sx => { const p = new THREE.Group(); p.position.set(sx * 0.085, 0.42, 0); rig.add(p); add(legGeo, D.shorts ? skin : bot, 0, -0.2, 0, p); if (D.shorts) add(new THREE.CylinderGeometry(0.086, 0.098, 0.17, 12), bot, 0, -0.06, 0, p); if (ch === 3) add(new THREE.CylinderGeometry(0.073, 0.07, 0.16, 10), white, 0, -0.27, 0, p); add(new RoundedBoxGeometry(0.125, 0.085, 0.22, 2, 0.035), shoe, 0, -0.385, 0.035, p); return p; };
  const legL = mkLeg(-1), legR = mkLeg(1);
  add(new THREE.CapsuleGeometry(0.15, 0.17, 6, 14), top, 0, 0.6, 0, rig, 1, 1, 0.72);
  add(new THREE.CylinderGeometry(0.15, 0.14, 0.1, 14), bot, 0, 0.45, 0, rig, 1, 1, 0.74);
  add(new THREE.CylinderGeometry(0.05, 0.055, 0.08, 10), skin, 0, 0.84, 0);
  const mkArm = sx => { const p = new THREE.Group(); p.position.set(sx * 0.2, 0.75, 0); rig.add(p); add(armGeo, (ch === 0 || ch === 1) ? top : skin, 0, -0.15, 0, p); if (ch >= 2) add(new THREE.CapsuleGeometry(0.058, 0.07, 4, 8), top, 0, -0.06, 0, p); add(GEO.sphLo, skin, 0, -0.31, 0, p, 0.052, 0.052, 0.052); p.rotation.z = sx * 0.1; return p; };
  const armL = mkArm(-1), armR = mkArm(1);
  const head = new THREE.Group(); head.position.set(0, 1.0, 0); rig.add(head);
  add(GEO.sph, skin, 0, 0, 0, head, 0.16, 0.168, 0.158);
  for (const sx of [-1, 1]) { add(GEO.sphLo, white, sx * 0.058, 0.012, 0.137, head, 0.03, 0.034, 0.02).castShadow = false; add(GEO.sphLo, dark, sx * 0.058, 0.012, 0.153, head, 0.016, 0.019, 0.01).castShadow = false; add(GEO.sphLo, skin, sx * 0.158, -0.005, 0, head, 0.022, 0.035, 0.03); }
  add(GEO.sphLo, skin, 0, -0.03, 0.158, head, 0.02, 0.02, 0.02).castShadow = false;
  add(GEO.sphLo, M(0x7a2e2a, 0.5), 0, -0.082, 0.14, head, 0.042, 0.011, 0.012).castShadow = false;
  const cap = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.52);
  let board = null;
  if (ch === 0) {
    const c0 = add(cap, hair, 0, 0.012, -0.008, head, 0.166, 0.172, 0.166); c0.rotation.x = -0.18;
    const tw = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.019, 0.034, 3, 6), hair, 64), o = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3(); let k = 0;
    for (let i = 0; i < 150 && k < 64; i++) { const y = 1 - (i / 149) * 0.82, rr = Math.sqrt(1 - y * y), a = i * 2.39996; n.set(Math.cos(a) * rr, y, Math.sin(a) * rr); if (n.z > 0.55 && n.y < 0.62) continue; if (n.y < 0.3) continue; o.position.copy(n).multiplyScalar(0.18); o.position.y *= 1.04; o.quaternion.setFromUnitVectors(up, n); o.rotateY(i); o.rotateX(0.5); o.updateMatrix(); tw.setMatrixAt(k++, o.matrix); }
    tw.count = k; tw.castShadow = true; head.add(tw);
    add(new THREE.TorusGeometry(0.105, 0.05, 8, 16, Math.PI), top, 0, 0.83, -0.05, rig).rotation.set(Math.PI / 2 + 0.5, 0, Math.PI);
    add(new RoundedBoxGeometry(0.2, 0.09, 0.03, 2, 0.012), M(0xe0600f, 0.85), 0, 0.53, 0.105);
  } else if (ch === 1) {
    add(cap, hair, 0, 0.01, -0.006, head, 0.172, 0.178, 0.172).rotation.x = -0.25;
    add(GEO.sph, hair, 0, -0.14, -0.085, head, 0.165, 0.27, 0.105);
    for (const sx of [-1, 1]) add(new THREE.CapsuleGeometry(0.036, 0.2, 4, 8), hair, sx * 0.145, -0.1, 0.005, head).rotation.z = sx * 0.1;
    add(GEO.sphLo, hair, -0.05, 0.115, 0.1, head, 0.12, 0.05, 0.075).rotation.z = 0.35;
    add(new THREE.CylinderGeometry(0.152, 0.152, 0.03, 14), M(0xf5f5f5, 0.6), 0, 0.5, 0, rig, 1, 1, 0.74);
  } else if (ch === 2) {
    const cm = M(0x1c1f27, 0.7);
    add(cap, cm, 0, 0.025, 0, head, 0.17, 0.165, 0.17);
    add(new THREE.CylinderGeometry(0.11, 0.11, 0.016, 16, 1, false, 0, Math.PI), M(0xc6ff00, 0.6), 0, 0.045, -0.13, head).rotation.y = Math.PI / 2 + Math.PI;
    add(GEO.sphLo, hair, 0, 0.055, 0.125, head, 0.085, 0.04, 0.05);
    add(new THREE.TorusGeometry(0.115, 0.024, 8, 18), M(0xc6ff00, 0.4, 0.3), 0, 0.845, 0, rig).rotation.x = Math.PI / 2;
    board = new THREE.Group(); const deck = add(new RoundedBoxGeometry(0.17, 0.03, 0.56, 2, 0.014), M(0xc6ff00, 0.5), 0, 0, 0, board); for (const q of [[-0.06, 0.18], [0.06, 0.18], [-0.06, -0.18], [0.06, -0.18]]) add(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), white, q[0], -0.035, q[1], board).rotation.z = Math.PI / 2; rig.add(board);
  } else {
    add(cap, hair, 0, 0.012, -0.004, head, 0.167, 0.172, 0.167).rotation.x = -0.2;
    const nc = cv(64, 64), x = nc.getContext('2d'); x.fillStyle = '#ffd400'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#0d3a9e'; x.font = 'bold 46px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('10', 32, 35);
    const nm = new THREE.MeshStandardMaterial({ map: ctex(nc), roughness: 0.85 });
    add(GEO.plane, nm, 0, 0.62, 0.111, rig, 0.15, 0.15, 1); const bk = add(GEO.plane, nm, 0, 0.63, -0.111, rig, 0.17, 0.17, 1); bk.rotation.y = Math.PI;
    add(new THREE.CylinderGeometry(0.153, 0.153, 0.025, 14), M(0x1546c4, 0.7), 0, 0.5, 0, rig, 1, 1, 0.74);
  }
  const ring = new THREE.Mesh(GEO.ring, new THREE.MeshBasicMaterial({ color: SLOTCOL[slot], transparent: true, opacity: 0.95, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.025; g.add(ring);
  const shield = new THREE.Mesh(GEO.sph, new THREE.MeshBasicMaterial({ color: new THREE.Color(0x4fc3ff).multiplyScalar(1.4), transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); shield.scale.setScalar(0.62); shield.position.y = 0.62; shield.visible = false; g.add(shield);
  return { g, rig, legL, legR, armL, armR, head, board, ring, shield, ch, ph: Math.random() * 6, x: 0, y: 0, rot: 0, alive: false, dead: 0, sc: D.sc * 1.05, col: D.top };
}
function poseBoard(c, dash) { if (!c.board) return; if (dash) { c.board.position.set(0, 0.02, 0); c.board.rotation.set(0, 0, 0); } else { c.board.position.set(0, 0.62, -0.135); c.board.rotation.set(Math.PI / 2 - 0.12, 0, 0); } }
function animChar(c, st, dt, t) {
  c.ph += dt * (st.moving ? 11 : 2);
  const sw = st.moving && !st.dash ? Math.sin(c.ph) * 0.8 : 0;
  c.legL.rotation.x = sw; c.legR.rotation.x = -sw; c.armL.rotation.x = -sw * 0.8; c.armR.rotation.x = sw * 0.8;
  c.armL.rotation.z = -0.1; c.armR.rotation.z = 0.1; c.rig.rotation.x = 0;
  c.rig.position.y = st.moving ? Math.abs(Math.cos(c.ph)) * 0.035 : Math.sin(t * 2 + c.ph) * 0.006;
  if (st.dash) { c.rig.rotation.x = 0.3; c.legL.rotation.x = 0.5; c.legR.rotation.x = -0.35; c.armL.rotation.x = -0.9; c.armR.rotation.x = 0.9; }
  if (st.win) { c.rig.position.y = Math.abs(Math.sin(t * 6)) * 0.28; c.armL.rotation.z = -2.6; c.armR.rotation.z = 2.6; c.armL.rotation.x = c.armR.rotation.x = 0; }
  poseBoard(c, st.dash);
}
function makePortraits() {
  const ps = new THREE.Scene(), pc = new THREE.PerspectiveCamera(26, 0.9, 0.1, 10);
  ps.background = new THREE.Color(0x1a2033); ps.add(new THREE.HemisphereLight(0xffffff, 0x445066, 1.5)); const d = new THREE.DirectionalLight(0xffffff, 2.6); d.position.set(1.5, 2.5, 3); ps.add(d);
  pc.position.set(0.35, 0.98, 1.75); pc.lookAt(0, 0.8, 0);
  ren.setPixelRatio(1); ren.setSize(180, 200, false);
  for (let i = 0; i < 4; i++) { const c = buildChar(i, i); c.ring.visible = false; poseBoard(c, false); c.g.rotation.y = 0.35; c.armL.rotation.z = -0.1; ps.add(c.g); ren.render(ps, pc); try { G.portraits[i] = ren.domElement.toDataURL('image/png'); } catch (e) { G.portraits[i] = ''; } ps.remove(c.g); }
  for (let t = 0; t < 6; t++) G.icons[t] = iconCanvas(t, 64, false).toDataURL();
}

// ---------- partículas e efeitos ----------
const P = { list: [], fire: null, smoke: null, deb: null, M: new THREE.Matrix4(), C: new THREE.Color(), O: new THREE.Object3D() };
function pSpawn(k, x, y, z, vx, vy, vz, life, s0, s1, col, delay = 0) { if (P.list.length > 640) return; P.list.push({ k, x, y, z, vx, vy, vz, t: -delay, life, s0, s1, col, rx: Math.random() * 6, ry: Math.random() * 6 }); }
function pInit() {
  const mk = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; for (let i = 0; i < n; i++) { m.setMatrixAt(i, P.M.makeScale(0, 0, 0)); m.setColorAt(i, P.C.setRGB(1, 1, 1)); } m.count = 0; scene.add(m); return m; };
  P.fire = mk(GEO.sphLo, new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 360);
  P.smoke = mk(GEO.sphLo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3, depthWrite: false }), 160);
  P.deb = mk(GEO.cube, new THREE.MeshStandardMaterial({ roughness: 0.8 }), 200); P.deb.castShadow = true;
  for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xffa040, 0, 11, 2); l.position.set(0, -50, 0); scene.add(l); G.lights.push(l); }
  for (let i = 0; i < 36; i++) { const m = new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ map: scorchTex(), transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); G.decals.push({ m, t: 0 }); }
  for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40), new THREE.MeshBasicMaterial({ color: 0xffc070, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); G.rings.push({ m, t: 1 }); }
}
function pUpdate(dt) {
  const L = P.list; let nf = 0, ns = 0, nd = 0;
  for (let i = L.length - 1; i >= 0; i--) {
    const p = L[i]; p.t += dt; if (p.t < 0) continue;
    if (p.t >= p.life) { L[i] = L[L.length - 1]; L.pop(); continue; }
    const f = p.t / p.life;
    if (p.k === 2) { p.vy -= 18 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < 0.06) { p.y = 0.06; p.vy *= -0.4; p.vx *= 0.6; p.vz *= 0.6; } p.rx += dt * 7; p.ry += dt * 5; }
    else { if (p.col === 1) p.vy -= 10 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; const dm = 1 - dt * 1.8; p.vx *= dm; p.vz *= dm; }
    const s = lerp(p.s0, p.s1, f);
    if (p.k === 0 && nf < 360) {
      let r, g, b; const a = 1 - f;
      if (p.col === 0) { if (f < 0.2) { r = 2.4; g = 1.35; b = 0.4; } else if (f < 0.6) { const u = (f - 0.2) / 0.4; r = lerp(2.4, 1.7, u); g = lerp(1.35, 0.42, u); b = lerp(0.4, 0.04, u); } else { const u = (f - 0.6) / 0.4; r = lerp(1.7, 0.12, u); g = lerp(0.42, 0.01, u); b = 0.04 * (1 - u); } }
      else if (p.col === 1) { r = 3 * a; g = 1.8 * a; b = 0.5 * a; }
      else { r = p.col[0] * a; g = p.col[1] * a; b = p.col[2] * a; }
      P.fire.setMatrixAt(nf, P.M.makeScale(s, s, s).setPosition(p.x, p.y, p.z)); P.fire.setColorAt(nf, P.C.setRGB(r, g, b)); nf++;
    } else if (p.k === 1 && ns < 160) { const ss = s * (f < 0.2 ? f / 0.2 : 1 - (f - 0.2) / 0.8 * 0.9); P.smoke.setMatrixAt(ns, P.M.makeScale(ss, ss, ss).setPosition(p.x, p.y, p.z)); P.smoke.setColorAt(ns, P.C.setRGB(p.col, p.col, p.col)); ns++; }
    else if (p.k === 2 && nd < 200) { const ss = s * (1 - f * f); P.O.position.set(p.x, p.y, p.z); P.O.rotation.set(p.rx, p.ry, 0); P.O.scale.set(ss, ss, ss); P.O.updateMatrix(); P.deb.setMatrixAt(nd, P.O.matrix); P.deb.setColorAt(nd, P.C.set(p.col)); nd++; }
  }
  for (const [m, n] of [[P.fire, nf], [P.smoke, ns], [P.deb, nd]]) { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  for (const l of G.lights) if (l.intensity > 0.5) l.intensity *= Math.exp(-dt * 8); else l.intensity = 0;
  for (const d of G.decals) if (d.t > 0) { d.t -= dt; d.m.material.opacity = Math.min(0.75, d.t / 4); if (d.t <= 0) d.m.visible = false; }
  for (const r of G.rings) if (r.t < 1) { r.t += dt * 2.6; const s = 0.4 + r.t * 3.6; r.m.scale.set(s, s, 1); r.m.material.opacity = Math.max(0, 0.9 * (1 - r.t)); if (r.t >= 1) r.m.visible = false; }
}
function fxLight(x, z, col, i) { let l = G.lights[0]; for (const q of G.lights) if (q.intensity < l.intensity) l = q; l.color.set(col); l.position.set(x, 1.3, z); l.intensity = i; }
function fxScorch(x, z, s) { let d = G.decals[0]; for (const q of G.decals) if (q.t < d.t) d = q; d.t = 9; d.m.visible = true; d.m.position.set(x, 0.014, z); d.m.scale.set(s, s, 1); d.m.rotation.z = Math.random() * 6; }
function fxExplosion(f) {
  const few = f.cells.length > 14;
  for (const c of f.cells) {
    const x = wx(c[0]), z = wz(c[1]);
    pSpawn(0, x, 0.36, z, rnd(0.3), 0.5 + Math.random() * 0.5, rnd(0.3), 0.5, 0.34, 0.5, 0);
    pSpawn(0, x + rnd(0.22), 0.3, z + rnd(0.22), rnd(0.7), 1.1 + Math.random(), rnd(0.7), 0.42, 0.2, 0.3, 0, 0.04);
    pSpawn(0, x + rnd(0.22), 0.5, z + rnd(0.22), rnd(0.7), 1.6 + Math.random(), rnd(0.7), 0.5, 0.16, 0.08, 0, 0.1);
    if (!few || Math.random() < 0.5) for (let k = 0; k < 3; k++) pSpawn(0, x, 0.4, z, rnd(4.5), 2.5 + Math.random() * 4, rnd(4.5), 0.45 + Math.random() * 0.4, 0.06, 0.012, 1);
    pSpawn(1, x + rnd(0.15), 0.5, z + rnd(0.15), rnd(0.3), 1.1 + Math.random() * 0.5, rnd(0.3), 1.2, 0.3, 0.6, 0.12 + Math.random() * 0.1, 0.25);
    if (Math.random() < 0.7) fxScorch(x, z, 1.15);
  }
  const x = wx(f.x), z = wz(f.y);
  fxLight(x, z, 0xffa040, 110);
  let r = G.rings[0]; for (const q of G.rings) if (q.t > r.t) r = q; r.t = 0; r.m.visible = true; r.m.position.set(x, 0.3, z);
  G.shake = Math.max(G.shake, 0.26);
}
function fxDebris(c, col) { const x = wx(c % GW), z = wz((c / GW) | 0); for (let k = 0; k < 8; k++) pSpawn(2, x + rnd(0.3), 0.3 + Math.random() * 0.5, z + rnd(0.3), rnd(3.5), 2.5 + Math.random() * 4, rnd(3.5), 0.9 + Math.random() * 0.5, 0.1 + Math.random() * 0.14, 0.08, col); }
function fxBurst(x, z, col, n) { for (let k = 0; k < n; k++) pSpawn(0, x, 0.5, z, rnd(2.2), 1 + Math.random() * 2.5, rnd(2.2), 0.5 + Math.random() * 0.3, 0.1, 0.02, col); fxLight(x, z, new THREE.Color(col[0] / 4, col[1] / 4, col[2] / 4), 40); }
function fxDust(x, z) { for (let k = 0; k < 6; k++) pSpawn(1, x + rnd(0.4), 0.15, z + rnd(0.4), rnd(1.6), 0.5, rnd(1.6), 0.7, 0.2, 0.5, 0.45); }

// ---------- inicialização ----------
function gfxInit() {
  ren = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
  ren.shadowMap.enabled = true; ren.shadowMap.type = THREE.PCFSoftShadowMap; ren.toneMapping = THREE.ACESFilmicToneMapping;
  scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(34, 1, 0.5, 160);
  hemi = new THREE.HemisphereLight(0xffffff, 0x333333, 0.8); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffffff, 3); sun.castShadow = true; const sc = sun.shadow.camera; sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10; sc.near = 1; sc.far = 40; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun); scene.add(sun.target);
  G.pmrem = new THREE.PMREMGenerator(ren);
  geos(); makePortraits(); pInit();
  let q = 2; try { const s = localStorage.getItem('boom.q'); if (s !== null) q = clamp(parseInt(s) || 0, 0, 2); } catch (e) { }
  setQuality(q);
  addEventListener('resize', gfxResize);
}
function setQuality(q) {
  G.q = q; G.dpr = Math.min(window.devicePixelRatio || 1, [1, 1.5, 2][q]); ren.setPixelRatio(G.dpr);
  sun.castShadow = q > 0; const s = q === 2 ? 2048 : 1024; if (sun.shadow.mapSize.x !== s) { sun.shadow.mapSize.set(s, s); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  if (G.comp) { G.comp.renderTarget1.dispose(); G.comp.renderTarget2.dispose(); G.comp = null; }
  if (q > 0) {
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: q === 2 ? 4 : 0 });
    G.comp = new EffectComposer(ren, rt); G.comp.addPass(new RenderPass(scene, cam));
    G.comp.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.55, 1.5)); G.comp.addPass(new OutputPass());
  }
  gfxResize();
}
function gfxResize() {
  const w = G.w = Math.max(1, innerWidth), h = G.h = Math.max(1, innerHeight);
  ren.setPixelRatio(G.dpr); ren.setSize(w, h, false); if (G.comp) { G.comp.setPixelRatio(G.dpr); G.comp.setSize(w, h); }
  cam.aspect = w / h; cam.updateProjectionMatrix(); fitCamera();
}
const _v = new THREE.Vector3();
function fitCamera() {
  const w = G.w, h = G.h, portrait = h > w;
  const padTop = G.inGame ? 62 : 12, padBot = G.inGame ? (portrait ? 208 : 12) : 12, padSide = (G.inGame && !portrait) ? Math.min(180, w * 0.19) : 4;
  const nx = (w - 2 * padSide) / w, ny = (h - padTop - padBot) / h, yd = (padBot - padTop) / h;
  G.elev = portrait ? 1.15 : 1.06;
  const measure = (d, tz) => { cam.position.set(0, Math.sin(G.elev) * d, tz + Math.cos(G.elev) * d); cam.lookAt(0, 0, tz); cam.updateMatrixWorld(); let hx = 0, y0 = 9, y1 = -9; for (const X of [-7.55, 7.55]) for (const Z of [-6.6, 6.55]) for (const Y of [0, 1.0]) { _v.set(X, Y, Z).project(cam); hx = Math.max(hx, Math.abs(_v.x)); y0 = Math.min(y0, _v.y); y1 = Math.max(y1, _v.y); } return { hx, y0, y1 }; };
  let tz = 0, d = 22;
  for (let it = 0; it < 4; it++) {
    let lo = 5, hi = 120; for (let k = 0; k < 22; k++) { d = (lo + hi) / 2; const r = measure(d, tz); if (r.hx <= nx && (r.y1 - r.y0) / 2 <= ny) hi = d; else lo = d; } d = hi;
    for (let k = 0; k < 8; k++) { const r = measure(d, tz); tz -= ((r.y0 + r.y1) / 2 - yd) * d * 0.4; }
  }
  G.camD = d; G.camT.set(0, 0, tz);
}
function camUpdate(dt) {
  let tx = G.camT.x, tz = G.camT.z, d = G.camD, az = 0;
  if (Game.mode === 'attract') { az = Math.sin(G.time * 0.13) * 0.3; d *= 0.92; }
  // em telas pequenas a câmera aproxima e acompanha o jogador
  const mi = myIdx(), follow = G.inGame && Math.min(G.w, G.h) < 620 && mi >= 0 && V.slots[mi].al && V.ph !== 'rend';
  const Z = follow ? 0.72 : 1; G.fz += (Z - G.fz) * Math.min(1, dt * 4);
  if (G.fz < 0.999) { const p = rpos(mi >= 0 ? mi : 0), k = 1 - G.fz; G.fx0 += (wx(p.x) / 6 * 7.55 * k - G.fx0) * Math.min(1, dt * 6); G.fy0 += (wz(p.y) / 5 * 6.6 * k - G.fy0) * Math.min(1, dt * 6); tx += G.fx0; tz = tz * G.fz + G.fy0; d *= G.fz; }
  const zt = (V.ph === 'rend' && V.ld && Game.mode !== 'attract' && UI.phT < 2.4) ? 1 : 0; G.zoom += (zt - G.zoom) * Math.min(1, dt * 3);
  if (G.zoom > 0.002 && V.ld) { tx = lerp(tx, wx(V.ld[0]), G.zoom * 0.75); tz = lerp(tz, wz(V.ld[1]) + 0.4, G.zoom * 0.75); d = lerp(d, G.camD * 0.55, G.zoom); }
  G.shake *= Math.exp(-dt * 7);
  cam.position.set(tx + Math.sin(az) * Math.cos(G.elev) * d + rnd(G.shake), Math.sin(G.elev) * d + rnd(G.shake), tz + Math.cos(az) * Math.cos(G.elev) * d + rnd(G.shake * 0.5)); cam.lookAt(tx, 0, tz);
  if (scene.fog) { scene.fog.near = d + 16; scene.fog.far = d + 120; }
}

// ---------- sincronização com o estado ----------
function mkBombMesh(b) {
  const g = new THREE.Group();
  if (!G.bombMat) { G.bombMat = new THREE.MeshStandardMaterial({ color: 0x101116, roughness: 0.22, metalness: 0.75 }); G.capMat = new THREE.MeshStandardMaterial({ color: 0x6b7080, roughness: 0.35, metalness: 0.9 }); G.fuseMat = new THREE.MeshStandardMaterial({ color: 0xc9a26a, roughness: 0.9 }); }
  const s = new THREE.Mesh(GEO.sph, G.bombMat); s.scale.setScalar(0.33); s.position.y = 0.36; s.castShadow = true; g.add(s);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.09, 12), G.capMat); c.position.y = 0.7; g.add(c);
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 6), G.fuseMat); f.position.set(0.03, 0.8, 0); f.rotation.z = -0.4; g.add(f);
  const sp = new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ map: glowTex(), color: b.type === 1 ? new THREE.Color(6, 0.3, 0.3) : new THREE.Color(6, 3.5, 1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); sp.position.set(0.07, 0.9, 0); g.add(sp);
  if (b.type === 1) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), G.capMat); a.position.set(-0.08, 0.86, 0); g.add(a); const band = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 6, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.2, 0.2), toneMapped: false })); band.rotation.x = Math.PI / 2; band.position.y = 0.36; g.add(band); }
  scene.add(g); return { g, sp, x: b.fly ? b.fly.fx : b.x, y: b.fly ? b.fly.fy : b.y, born: G.time };
}

function gfxSync(dt) {
  const fdt = dt * G.fx, t = G.time;
  if (G.epoch !== V.epoch || G.map !== V.map) buildArena();
  const C = G.TC[V.map];
  // blocos
  for (let c = 0; c < N; c++) {
    const a = G.rGrid[c], b = V.grid[c]; if (a === b) continue; G.rGrid[c] = b; const m = G.blocks[c];
    if (b === BURN) { if (m) { G.burning.push({ m, t: 0.5 }); G.blocks[c] = null; } fxDebris(c, C.debris); }
    else if (b === EMPTY) { if (m) { G.arena.remove(m); G.blocks[c] = null; fxDebris(c, C.debris); } }
    else if (b === SOLID) { if (m) { G.arena.remove(m); G.blocks[c] = null; } addSolid(c, true); }
    else if (b === BLOCK && !m) addBlock(c, C, Math.random);
  }
  for (let i = G.burning.length - 1; i >= 0; i--) { const o = G.burning[i]; o.t -= fdt; const s = Math.max(0.01, o.t / 0.5); o.m.scale.set(s, s, s); o.m.rotation.y += fdt * 5; if (o.t <= 0) { G.arena.remove(o.m); G.burning.splice(i, 1); } }
  for (let i = G.solids.length - 1; i >= 0; i--) { const o = G.solids[i]; o.v += 60 * dt; o.m.position.y -= o.v * dt; if (o.m.position.y <= 0.45) { o.m.position.y = 0.45; fxDust(o.m.position.x, o.m.position.z); G.shake = Math.max(G.shake, 0.1); Au.play('thud', 0.5); G.solids.splice(i, 1); } }
  // bombas
  const seen = new Set();
  for (const b of V.bombs) {
    seen.add(b.id); let o = G.bombs.get(b.id); if (!o) { o = mkBombMesh(b); G.bombs.set(b.id, o); if (Game.mode !== 'attract') Au.play('place', 0.5); }
    let y = 0;
    if (b.fly) { const p = clamp(b.fly.p, 0, 1); o.x = lerp(b.fly.fx, b.x, p); o.y = lerp(b.fly.fy, b.y, p); y = Math.sin(p * Math.PI) * 2.4; o.g.rotation.x = p * 9; }
    else { const k = 1 - Math.exp(-dt * 26); o.x += (b.x - o.x) * k; o.y += (b.y - o.y) * k; o.g.rotation.x = 0; }
    o.g.position.set(wx(o.x), y, wz(o.y));
    const urg = b.type === 1 ? 6 : 6 + (FUSE - b.fuse) * 5, pop = Math.min(1, (t - o.born) * 9), pu = 1 + Math.sin(t * urg) * 0.07;
    o.g.scale.set(pop * (2 - pu), pop * pu, pop * (2 - pu));
    const fl = b.type === 1 ? (Math.sin(t * 9) > 0 ? 0.42 : 0.12) : 0.26 + Math.random() * 0.16; o.sp.scale.set(fl, fl, 1); o.sp.quaternion.copy(cam.quaternion);
  }
  for (const [id, o] of G.bombs) if (!seen.has(id)) { scene.remove(o.g); G.bombs.delete(id); }
  // chamas
  seen.clear();
  for (const f of V.flames) { seen.add(f.id); if (!G.flames.has(f.id)) { G.flames.set(f.id, 1); if (f.ttl > 0.3) { fxExplosion(f); onBoom(f); } } }
  for (const id of G.flames.keys()) if (!seen.has(id)) G.flames.delete(id);
  // power-ups
  seen.clear();
  for (const p of V.pus) {
    const key = p.x + p.y * 16 + p.type * 256; seen.add(key); let m = G.pus.get(key);
    if (!m) { if (!G.puMats) G.puMats = [0, 1, 2, 3, 4, 5].map(i => { const tx = ctex(iconCanvas(i, 128, true)); tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping; return new THREE.MeshStandardMaterial({ map: tx, emissiveMap: tx, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.2 }); }); m = new THREE.Mesh(GEO.pu, G.puMats[p.type]); m.castShadow = true; m.userData = { born: t, x: p.x, y: p.y, type: p.type }; scene.add(m); G.pus.set(key, m); }
    const s = Math.min(1, (t - m.userData.born) * 5); m.scale.setScalar(s); m.position.set(wx(p.x), 0.5 + Math.sin(t * 3 + p.x) * 0.06, wz(p.y)); m.rotation.y = Math.sin(t * 1.6 + p.y) * 0.5; m.rotation.x = -0.5;
  }
  for (const [key, m] of G.pus) if (!seen.has(key)) {
    scene.remove(m); G.pus.delete(key); const u = m.userData; let got = -1;
    for (let i = 0; i < 4; i++) { const s = V.slots[i]; if (s.k !== '-' && s.al) { const p = rpos(i); if (Math.round(p.x) === u.x && Math.round(p.y) === u.y) got = i; } }
    if (got >= 0) { fxBurst(wx(u.x), wz(u.y), [1.5, 4, 2], 12); onPickup(got, u.type); } else fxDust(wx(u.x), wz(u.y));
  }
  // peças especiais
  for (const o of G.tiles) {
    if (o.k === 't') { o.d.rotation.z = t * 2; const s = 0.85 + Math.sin(t * 4) * 0.1; o.d.scale.set(s, s, 1); o.t.position.y = 0.07 + Math.sin(t * 3) * 0.02; }
    else { const st = spikeState(o.x, o.y, V.el), ty = st === 2 ? 0.02 : st === 1 ? -0.3 : -0.52; o.h.position.y += (ty - o.h.position.y) * Math.min(1, dt * 22); o.w.material.opacity = st === 1 ? 0.25 + Math.abs(Math.sin(t * 14)) * 0.4 : st === 2 ? 0.35 : 0; }
  }
  if (G.convTex) G.convTex.offset.y -= dt * 1.5;
  if (C.props.userData.foam) C.props.userData.foam.position.z = -9.3 + Math.sin(t * 0.8) * 0.35;
  // aviso do encolhimento
  let wi = 0;
  if (V.ph === 'play' && V.t <= SHRINK_AT + 2.5) for (let j = V.sh; j < N && wi < 4; j++) { const c = SPIRAL[j]; if (V.grid[c] === PILLAR) continue; const w = G.warns[wi]; w.visible = true; w.position.set(wx(c % GW), 0.03, wz((c / GW) | 0)); w.material.opacity = (0.55 - wi * 0.11) * (0.6 + Math.abs(Math.sin(t * 9)) * 0.4); wi++; }
  for (; wi < 4; wi++) if (G.warns[wi]) G.warns[wi].visible = false;
  syncPlayers(dt, fdt, t);
  pUpdate(fdt);
  G.youT -= dt;
}

function syncPlayers(dt, fdt, t) {
  const me = myIdx();
  for (let i = 0; i < 4; i++) {
    const s = V.slots[i], lab = UI.labs[i]; let c = G.chars[i];
    if (s.k === '-') { if (c) c.g.visible = false; if (lab) lab.style.display = 'none'; continue; }
    if (!c || c.ch !== s.ch) { if (c) scene.remove(c.g); c = G.chars[i] = buildChar(s.ch, i); scene.add(c.g); c.g.visible = false; }
    const p = rpos(i);
    if (s.al && !c.alive) { c.alive = true; c.dead = 0; c.g.visible = true; c.x = p.x; c.y = p.y; c.rig.rotation.set(0, 0, 0); c.rig.scale.setScalar(c.sc); c.rig.position.y = 0; c.ring.visible = true; }
    if (!s.al && c.alive) { c.alive = false; c.dead = 1.2; c.shield.visible = false; const X = wx(c.x), Z = wz(c.y); for (let k = 0; k < 10; k++) pSpawn(1, X + rnd(0.2), 0.5, Z + rnd(0.2), rnd(1.2), 1 + Math.random(), rnd(1.2), 1.1, 0.25, 0.6, 0.1); fxBurst(X, Z, [4, 1.2, 0.4], 14); onDeath(i); }
    if (c.alive) {
      const dx = p.x - c.x, dy = p.y - c.y;
      if (Math.abs(dx) + Math.abs(dy) > 1.6) { fxBurst(wx(c.x), wz(c.y), [0.6, 3, 4], 10); c.x = p.x; c.y = p.y; fxBurst(wx(c.x), wz(c.y), [0.6, 3, 4], 10); if (i === me) Au.play('tele', 0.6); }
      else if (i === me || isSim()) { c.x = p.x; c.y = p.y; } else { const k = 1 - Math.exp(-dt * 16); c.x += dx * k; c.y += dy * k; }
      c.g.position.set(wx(c.x), 0, wz(c.y));
      const win = (V.ph === 'rend' || V.ph === 'mend') && V.win === i;
      const tr = win ? 0 : [0, -Math.PI / 2, Math.PI, Math.PI / 2][p.d & 3]; let dr = tr - c.rot; while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2; c.rot += dr * Math.min(1, dt * 16); c.g.rotation.y = c.rot;
      const dash = p.dash ? 1 : 0;
      animChar(c, { moving: p.m && V.ph === 'play', dash, win }, fdt, t);
      if (dash && Math.random() < 0.7) pSpawn(0, wx(c.x) + rnd(0.15), 0.25, wz(c.y) + rnd(0.15), 0, 0.4, 0, 0.3, 0.16, 0.02, [1.6, 0.6, 4]);
      c.shield.visible = !!s.shield; if (s.shield) c.shield.scale.setScalar(0.62 + Math.sin(t * 5) * 0.02);
      c.rig.visible = !(s.inv && !dash && Math.sin(t * 40) > 0.2);
      c.ring.scale.setScalar(i === me ? 1.12 + Math.sin(t * 5) * 0.08 : 1);
    } else if (c.dead > 0) { c.dead -= fdt; const f = clamp(1 - c.dead / 1.2, 0, 1); c.rig.rotation.x = -f * 1.5; c.rig.position.y = -f * 0.25; c.rig.scale.setScalar(c.sc * (1 - f * f)); c.ring.visible = false; if (c.dead <= 0) c.g.visible = false; }
    // rótulos
    if (s.e[0] !== G.eSeen[i]) { if (s.e[0] > G.eSeen[i]) { G.emoT[i] = 2.4; lab.textContent = EMOTES[s.e[1] & 3]; lab.className = 'lab emo'; } G.eSeen[i] = s.e[0]; }
    let show = false;
    if (G.emoT[i] > 0) { G.emoT[i] -= dt; show = c.g.visible; }
    else if (i === me && c.alive && G.youT > 0 && G.inGame) { if (lab.textContent !== 'VOCÊ') { lab.textContent = 'VOCÊ'; lab.className = 'lab you'; } show = true; }
    if (show) { _v.set(wx(c.x), 1.5, wz(c.y)).project(cam); lab.style.display = 'block'; lab.style.transform = `translate(${((_v.x + 1) / 2 * G.w).toFixed(1)}px,${((1 - _v.y) / 2 * G.h).toFixed(1)}px) translate(-50%,-100%)`; } else lab.style.display = 'none';
  }
}
function gfxRender() { if (G.comp) G.comp.render(); else ren.render(scene, cam); }
