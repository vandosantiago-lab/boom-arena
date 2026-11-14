import os, sys
root = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(root, 'src')
head = """import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import qrcode from 'qrcode-generator';
"""
import subprocess
body = '\n'.join(open(os.path.join(src, f), encoding='utf-8').read() for f in ['01-core.js', '02-sim.js', '03-gfx.js', '04-audio-net.js', '05-ui.js'])
tpl = open(os.path.join(src, 'index.html'), encoding='utf-8').read()
os.makedirs(os.path.join(root, 'dist', 'web'), exist_ok=True)
for name, hosted in (('art', False), ('web', True)):
    js = head + ("import { Peer } from 'peerjs';\n" if hosted else "const Peer = null;\n") + body.replace('/*__HOSTED__*/false', 'true' if hosted else 'false')
    open(os.path.join(root, 'dist', f'game-{name}.mjs'), 'w', encoding='utf-8').write(js)
    subprocess.run(['npx', '--no-install', 'esbuild', f'dist/game-{name}.mjs', '--bundle', '--format=esm', '--minify', '--target=es2020', '--legal-comments=none', f'--outfile=dist/bundle-{name}.js', '--log-level=warning'], cwd=root, check=True)
    bundle = open(os.path.join(root, 'dist', f'bundle-{name}.js'), encoding='utf-8').read()
    assert '</script' not in bundle.lower(), 'script close tag inside bundle'
    out = os.path.join(root, 'dist', 'web', 'index.html') if hosted else os.path.join(root, 'dist', 'index.html')
    open(out, 'w', encoding='utf-8').write(tpl.replace('/*__JS__*/', bundle))
    print('built', name, os.path.getsize(out), 'bytes')
