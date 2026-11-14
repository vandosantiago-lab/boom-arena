(() => {
  const myPeer = 'p' + Math.random().toString(36).slice(2, 12);
  const rooms = new Map();
  function mkRoom(name) {
    const bc = new BroadcastChannel('mock-' + name);
    const peers = new Map(); let mine = {}; let snap = [];
    const rebuild = () => { const arr = [{ peer: myPeer, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: mine, updatedAt: Date.now() }]; for (const [k, v] of peers) arr.push({ peer: k, by: null, isMe: !!window.__sameUser, sameTab: false, kind: 'viewer', guest: false, presence: v.p, updatedAt: v.t }); snap = arr; };
    const send = () => bc.postMessage({ t: 'p', peer: myPeer, p: mine });
    bc.onmessage = e => { const m = e.data; if (m.t === 'p') { peers.set(m.peer, { p: m.p, t: Date.now() }); rebuild(); } else if (m.t === 'hello') send(); else if (m.t === 'bye') { peers.delete(m.peer); rebuild(); } };
    bc.postMessage({ t: 'hello' }); rebuild();
    addEventListener('pagehide', () => bc.postMessage({ t: 'bye', peer: myPeer }));
    return {
      name, presence: async patch => { const n = Object.assign({}, mine); for (const k in patch) { if (patch[k] === null) delete n[k]; else n[k] = JSON.parse(JSON.stringify(patch[k])); } const len = new TextEncoder().encode(JSON.stringify(n)).length; window.__maxPresence = Math.max(window.__maxPresence || 0, len); if (len > 4096) { window.__presenceTooBig = (window.__presenceTooBig || 0) + 1; throw { code: 'invalid_argument' }; } mine = n; window.__presenceCalls = (window.__presenceCalls || 0) + 1; rebuild(); send(); },
      peers: () => snap, onPeers() { return () => { }; }, emit: async () => { }, on() { return () => { }; }, connected: () => true, onConnection() { return () => { }; },
      leave: async () => { bc.postMessage({ t: 'bye', peer: myPeer }); bc.close(); rooms.delete(name); },
    };
  }
  const lobby = mkRoom('lobby');
  lobby.join = async n => { if (window.__noNamed) throw { code: 'not_permitted' }; if (!rooms.has(n)) rooms.set(n, mkRoom(n)); return rooms.get(n); };
  window.claude = { use: async n => n === 'room' ? lobby : null };
})();
