import sys; sys.path.insert(0, __import__('os').path.dirname(__file__))
from run import *
out = os.path.join(ROOT, 'test', 'shots'); os.makedirs(out, exist_ok=True)
named = (len(sys.argv) < 2 or sys.argv[1] != 'fallback')
ST = "(()=>{const b=window.__boom,V=b.V;return {mode:b.Game.mode,ph:V.ph,ep:V.epoch,myI:b.Net.myI,slots:V.slots.map(s=>[s.k,s.nm,s.ch,s.al,+s.x.toFixed(2),+s.y.toFixed(2),s.w]),bombs:V.bombs.map(x=>[x.o,+x.x.toFixed(1),+x.y.toFixed(1),x.type]),me:[+b.Game.me.x.toFixed(2),+b.Game.me.y.toFixed(2)],maxP:window.__maxPresence,big:window.__presenceTooBig||0,calls:window.__presenceCalls,err:window.__boomErr||null}})()"
with sync_playwright() as p:
    b = launch(p); logs = []
    ctx = b.new_context(viewport={'width': 390, 'height': 760}, device_scale_factor=1, has_touch=True, is_mobile=True); route(ctx)
    ctx.add_init_script("try{localStorage.setItem('boom.q','0')}catch(e){}; window.__peerOpts={host:'127.0.0.1',port:9000,path:'/',secure:false};")
    A = newpage(ctx, False, logs); A.goto('http://localhost:8123/web'); A.wait_for_function('window.__boomReady', timeout=60000)
    B = newpage(ctx, False, logs); B.goto('http://localhost:8123/web'); B.wait_for_function('window.__boomReady', timeout=60000)
    time.sleep(1.5)
    A.bring_to_front(); A.fill('#nm', 'Vando'); A.click('#b-create'); time.sleep(1.5)
    code = A.evaluate('window.__boom.Net.code'); print('code', code)
    B.bring_to_front(); B.fill('#nm', 'Miguel'); B.click('.ch[data-c="3"]'); B.click('#b-join'); B.fill('#code', 'ZZZZ'); B.click('#b-go'); B.wait_for_selector('#b-go:enabled', timeout=60000); time.sleep(0.3)
    print('wrong code toast:', B.inner_text('#toast'), '| mode', B.evaluate('window.__boom.Game.mode'))
    B.fill('#code', code.lower()); B.click('#b-go'); B.wait_for_function("window.__boom.Game.mode==='client'", timeout=60000); time.sleep(1.5)
    print('B lobby', B.evaluate(ST)); B.screenshot(path=out + '/web-B-lobby.png')
    A.bring_to_front(); time.sleep(1.5); print('A lobby', A.evaluate(ST)); A.screenshot(path=out + '/web-A-lobby.png')
    A.evaluate("window.__boom.Game.opt.map=0"); A.click('#b-start'); time.sleep(1); A.evaluate("window.__boom.Sim.phT=0.01"); time.sleep(1)
    # mantém as duas páginas ativas alternando o foco
    def pump(n=4, d=0.5):
        for i in range(n):
            (A if i % 2 == 0 else B).bring_to_front(); time.sleep(d)
    pump(4)
    print('A play', A.evaluate(ST)); print('B play', B.evaluate(ST))
    B.bring_to_front(); A.evaluate("window.__boom.V.slots[1]._invT=window.__boom.Sim.time+999"); B.keyboard.press('Space'); time.sleep(0.3); B.keyboard.down('ArrowLeft'); time.sleep(1.2); B.keyboard.up('ArrowLeft'); B.keyboard.press('Digit1')
    B.screenshot(path=out + '/web-B-play.png')
    pump(3, 0.4)
    print('A after B input', A.evaluate(ST)); print('B after input', B.evaluate(ST))
    A.bring_to_front(); A.keyboard.press('KeyE'); A.keyboard.down('ArrowRight'); time.sleep(0.8); A.keyboard.up('ArrowRight'); pump(2, 0.4)
    print('A remote bomb', A.evaluate(ST)); A.screenshot(path=out + '/web-A-play.png')
    def until(pg, cond, t=60):
        t0 = time.time()
        while time.time() - t0 < t:
            if pg.evaluate(cond): return True
            pump(2, 0.25)
        print('TIMEOUT', cond); return False
    for k in range(2):
        until(A, "window.__boom.V.ph==='play'")
        A.evaluate("(()=>{const b=window.__boom,V=b.V; V.bombs.length=0; V.flames.length=0; V.slots[1]._invT=b.Sim.time+999; V.slots[1].al=1; for(const s of V.slots) if(s.i!==1) s.al=0;})()")
        until(A, "window.__boom.V.ph==='rend'"); until(B, "window.__boom.V.ph==='rend'")
        if k == 0: B.bring_to_front(); time.sleep(0.4); B.screenshot(path=out + '/web-B-rend.png')
        A.evaluate("window.__boom.Sim.phT=0.01")
        if k == 0: until(A, "window.__boom.V.ph==='count'"); A.evaluate("window.__boom.Sim.phT=0.01")
    until(A, "window.__boom.V.ph==='mend'"); until(B, "window.__boom.V.ph==='mend'")
    print('A end', A.evaluate(ST)); print('B end', B.evaluate(ST))
    B.bring_to_front(); time.sleep(0.5); B.screenshot(path=out + '/web-B-end.png')
    A.bring_to_front(); time.sleep(0.5); A.click('#b-again'); until(B, "window.__boom.V.ph==='lobby'"); print('B back to lobby', B.evaluate(ST)['ph'])
    A.bring_to_front(); A.click('#b-leave'); time.sleep(0.5); B.bring_to_front(); until(B, "window.__boom.Game.mode==='attract'", 40); print('B after host left:', B.evaluate('window.__boom.Game.mode'), '|', B.inner_text('#toast'))
    print('\n'.join(l for l in logs if 'GL Driver' not in l and 'ERR_FAILED' not in l))
    b.close()
