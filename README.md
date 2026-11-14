# Boom Arena 3D

Jogo estilo Bomberman em 3D, multiplayer entre celulares (até 4 jogadores, bots completam).

- `index.html` — jogo pronto (arquivo único), servido pelo GitHub Pages.
- `dev/` — código-fonte (`src/`), `build.py` (gera o `index.html` com esbuild) e testes.

Build: `cd dev && npm i && python3 build.py` → `dev/dist/web/index.html` (versão web, P2P via PeerJS).

## Super Stars: A Era das Estrelas

- `superstars/index.html` — jogo do Miguel (arquivo único, Three.js via CDN, multiplayer P2P via PeerJS), servido em `/boom-arena/superstars/`.
- `superstars/control.json` — controle dos pais: `{"paused":true}` pausa o jogo em todos os aparelhos em até uns 2 minutos; `stopAt` (timestamp em ms) define um horário de parada.
