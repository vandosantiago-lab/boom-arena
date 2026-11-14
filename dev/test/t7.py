import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from run import *
with sync_playwright() as p:
    b = launch(p); logs = []
    ctx = b.new_context(viewport={'width': 390, 'height': 760}); route(ctx)
    ctx.add_init_script("try{localStorage.setItem('boom.q','0')}catch(e){}; window.__peerOpts={host:'127.0.0.1',port:9000,path:'/',secure:false,debug:2};")
    A = ctx.new_page(); A.on('console', lambda m: logs.append(m.type+': '+m.text[:200])); A.on('pageerror', lambda e: logs.append('PAGEERROR '+str(e)[:300]))
    A.on('requestfailed', lambda r: logs.append('REQFAIL '+r.url[:120]))
    A.goto('http://localhost:8123/web'); A.wait_for_function('window.__boomReady||window.__boomErr', timeout=60000); time.sleep(1)
    print('err', A.evaluate('window.__boomErr||null'), 'room', A.evaluate('!!window.__boom.Net.room'))
    A.click('#b-create'); time.sleep(16)
    print('code', A.evaluate('window.__boom.Net.code'), 'lastErr', A.evaluate('window.__boom.Net.lastErr||null'), 'toast', A.inner_text('#toast'))
    print('\n'.join(l for l in logs if 'GL Driver' not in l)[:1500])
    b.close()
