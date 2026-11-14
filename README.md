# Boom Arena 3D

Jogo estilo Bomberman em 3D, multiplayer entre celulares (até 4 jogadores, bots completam).

- `index.html` — jogo pronto (arquivo único), servido pelo GitHub Pages.
- `dev/` — código-fonte (`src/`), `build.py` (gera o `index.html` com esbuild) e testes.

Build: `cd dev && npm i && python3 build.py` → `dev/dist/web/index.html` (versão web, P2P via PeerJS).
