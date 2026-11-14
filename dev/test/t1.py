import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from run import *
out = os.path.join(ROOT, 'test', 'shots'); os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = launch(p); logs = []
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, has_touch=True, is_mobile=True); route(ctx)
    pg = newpage(ctx, True, logs); pg.goto('http://boom.test/index.html')
    pg.wait_for_function('window.__boomReady || window.__boomErr', timeout=60000)
    time.sleep(6)
    print('err', pg.evaluate('window.__boomErr || null'))
    print('state', pg.evaluate('(()=>{const b=window.__boom;return {ph:b.V.ph,q:b.G.q,mode:b.Game.mode,room:!!b.Net.room,port:b.G.portraits.map(s=>s.length)}})()'))
    pg.screenshot(path=out + '/01-home.png')
    pg.evaluate("document.getElementById('home').classList.add('hide')"); time.sleep(8)
    pg.screenshot(path=out + '/02-attract.png')
    print('fps-ish', pg.evaluate('new Promise(r=>{let n=0;const t=performance.now();function f(){n++;if(performance.now()-t>2000)r(n/2);else requestAnimationFrame(f)}f()})'))
    print('err', pg.evaluate('window.__boomErr || null')); print('\n'.join(logs[:20]))
    b.close()
