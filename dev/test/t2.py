import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from run import *
out = os.path.join(ROOT, 'test', 'shots'); os.makedirs(out, exist_ok=True)
W, H = int(sys.argv[1]), int(sys.argv[2]); maps = [int(x) for x in sys.argv[3].split(',')]; tag = sys.argv[4]
with sync_playwright() as p:
    b = launch(p); logs = []
    ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1, has_touch=True, is_mobile=True); route(ctx)
    pg = newpage(ctx, True, logs); pg.goto('http://boom.test/index.html')
    pg.wait_for_function('window.__boomReady || window.__boomErr', timeout=60000); time.sleep(2)
    pg.evaluate("window.__boom.Game.qLock=true")
    pg.click('#b-solo'); time.sleep(1.5)
    pg.screenshot(path=f'{out}/{tag}-lobby.png')
    for m in maps:
        pg.evaluate(f"(()=>{{const b=window.__boom; b.Game.opt.map={m}; }})()")
        if pg.evaluate("window.__boom.V.ph") != 'lobby': pg.evaluate("document.getElementById('set-quit')?.click()")
        if pg.is_visible('#b-solo'): pg.click('#b-solo'); time.sleep(1)
        pg.click('#b-start'); time.sleep(1.5)
        pg.evaluate("window.__boom.Sim.phT=0.01"); time.sleep(2.5)
        # joga um pouco: anda, solta bomba, foge
        pg.keyboard.press('Space'); pg.keyboard.down('ArrowRight'); time.sleep(2.2); pg.keyboard.up('ArrowRight'); pg.keyboard.down('ArrowDown'); time.sleep(0.2)
        pg.keyboard.up('ArrowDown')
        pg.screenshot(path=f'{out}/{tag}-map{m}-a.png')
        # força explosão visível: bombas espalhadas
        pg.evaluate("(()=>{const b=window.__boom,V=b.V; for(const bb of V.bombs) bb.fuse=0.05; })()"); time.sleep(1.2)
        pg.screenshot(path=f'{out}/{tag}-map{m}-b.png')
        print('map', m, pg.evaluate("(()=>{const b=window.__boom,V=b.V,s=V.slots[0];return {ph:V.ph,me:[s.x,s.y,s.al],bombs:V.bombs.length,flames:V.flames.length,camD:b.G.camD,q:b.G.q,err:window.__boomErr||null}})()"))
        pg.click('#b-set'); time.sleep(0.5)
        if m == maps[0]: pg.screenshot(path=f'{out}/{tag}-settings.png')
        pg.click('#set-quit'); time.sleep(1)
    print('\n'.join(l for l in logs if 'GL Driver' not in l and 'ERR_FAILED' not in l))
    b.close()
