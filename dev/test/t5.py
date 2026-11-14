import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from run import *
with sync_playwright() as p:
    b = launch(p); logs = []
    ctx = b.new_context(viewport={'width': 390, 'height': 760}, device_scale_factor=1); route(ctx)
    ctx.add_init_script("try{localStorage.setItem('boom.q','%s')}catch(e){}" % sys.argv[1])
    pg = newpage(ctx, True, logs); pg.goto('http://boom.test/index.html'); pg.wait_for_function('window.__boomReady||window.__boomErr', timeout=60000); time.sleep(1)
    pg.evaluate("window.__boom.Game.qLock=true; window.__boom.G.prof=[0,0,0,0]"); time.sleep(12)
    print('q', sys.argv[1], pg.evaluate("(()=>{const p=window.__boom.G.prof;return {logic:+(p[0]/p[3]).toFixed(2),sync:+(p[1]/p[3]).toFixed(2),render:+(p[2]/p[3]).toFixed(2),frames:p[3],calls:0}})()"), pg.evaluate('window.__boomErr||null'))
    b.close()
