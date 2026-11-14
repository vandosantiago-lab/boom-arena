import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from run import *
with sync_playwright() as p:
    b = launch(p); logs = []
    ctx = b.new_context(viewport={'width': 390, 'height': 760}, device_scale_factor=1, has_touch=True, is_mobile=True); route(ctx)
    ctx.add_init_script("try{localStorage.setItem('boom.q','0')}catch(e){}")
    pg = newpage(ctx, True, logs); pg.goto('http://boom.test/index.html'); pg.wait_for_function('window.__boomReady||window.__boomErr', timeout=60000); time.sleep(1)
    print('err', pg.evaluate('window.__boomErr||null'))
    pg.click('#b-solo'); time.sleep(0.8); pg.evaluate("window.__boom.Game.opt.map=3"); pg.click('#b-start'); time.sleep(0.8); pg.evaluate("window.__boom.Sim.phT=0.01"); time.sleep(0.8)
    S = "(()=>{const V=window.__boom.V,s=V.slots[0];return [V.ph,+s.x.toFixed(2),+s.y.toFixed(2),s.d,s.al,V.bombs.filter(b=>b.o===0).map(b=>[+b.x.toFixed(1),+b.y.toFixed(1),b.type,+b.fuse.toFixed(1)]),+s.cd.toFixed(1)]})()"
    pg.evaluate("(()=>{const V=window.__boom.V; for(let x=0;x<13;x++){V.grid[x]=0;} for(let y=0;y<11;y++)V.grid[y*13]=0; for(const s of V.slots) if(s.i>0){s.al=1;} })()")
    print('start', pg.evaluate(S))
    pg.keyboard.down('ArrowRight'); time.sleep(1.0); pg.keyboard.up('ArrowRight'); print('right 1s (esperado x~3.3)', pg.evaluate(S))
    pg.keyboard.press('Space'); time.sleep(0.2); print('bomba', pg.evaluate(S))
    pg.keyboard.down('ArrowLeft'); time.sleep(0.5); pg.keyboard.up('ArrowLeft'); pg.keyboard.down('ArrowRight'); time.sleep(0.4); pg.keyboard.up('ArrowRight'); print('voltou e bateu na bomba', pg.evaluate(S))
    pg.keyboard.press('KeyE'); time.sleep(0.2); print('remota', pg.evaluate(S)); pg.keyboard.down('ArrowLeft'); time.sleep(0.6); pg.keyboard.up('ArrowLeft'); pg.keyboard.down('ArrowDown'); time.sleep(0.9); pg.keyboard.up('ArrowDown'); print('desceu', pg.evaluate(S))
    pg.keyboard.press('KeyE'); time.sleep(0.3); print('detonou', pg.evaluate(S))
    # toque: joystick + botões
    pg.touchscreen.tap(330, 690); time.sleep(0.2); print('tap bomba', pg.evaluate(S))
    fps = pg.evaluate('new Promise(r=>{let n=0;const t=performance.now();function f(){n++;if(performance.now()-t>2000)r(n/2);else requestAnimationFrame(f)}f()})'); print('fps q0', fps)
    print('err', pg.evaluate('window.__boomErr||null')); print('\n'.join(l for l in logs if 'GL Driver' not in l and 'ERR_FAILED' not in l))
    b.close()
