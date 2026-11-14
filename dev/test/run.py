import sys, os, json, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.join(ROOT, 'node_modules')
def route(ctx):
    def h(r):
        u = r.request.url
        if u.startswith('http://127.0.0.1:9000'):
            return r.continue_()
        if u.startswith('http://localhost:8123/web'):
            return r.fulfill(path=os.path.join(ROOT, 'dist', 'web', 'index.html'), content_type='text/html')
        if u.startswith('http://boom.test/'):
            return r.fulfill(path=os.path.join(ROOT, 'dist', 'index.html'), content_type='text/html')
        if 'cdn.jsdelivr.net/npm/three@0.160.0/' in u:
            return r.fulfill(path=os.path.join(NM, 'three', u.split('three@0.160.0/')[1]), content_type='text/javascript')
        if 'qrcode-generator' in u:
            return r.fulfill(path=os.path.join(NM, 'qrcode-generator', 'qrcode.js'), content_type='text/javascript')
        return r.abort()
    ctx.route('**/*', h)
def launch(p):
    return p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--autoplay-policy=no-user-gesture-required', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-features=WebRtcHideLocalIpsWithMdns,LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights'])
def newpage(ctx, mock=True, logs=None):
    pg = ctx.new_page()
    if mock: pg.add_init_script(path=os.path.join(ROOT, 'test', 'mock.js'))
    if logs is not None:
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    return pg
