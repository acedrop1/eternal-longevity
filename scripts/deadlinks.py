"""Internal hrefs that resolve to no App Router page."""
import re, pathlib
APP = pathlib.Path('src/app')
routes = set()
for p in APP.rglob('page.tsx'):
    r = '/' + str(p.parent.relative_to(APP)).replace('.', '')
    r = '/' if r in ('/.', '/') else r
    routes.add(r.rstrip('/') or '/')
for p in APP.rglob('route.ts'):
    routes.add('/' + str(p.parent.relative_to(APP)))

def matches(href):
    h = href.split('?')[0].split('#')[0].rstrip('/') or '/'
    if h in routes: return True
    for r in routes:                       # dynamic segments
        if '[' not in r: continue
        pat = '^' + re.sub(r'\[\.\.\.[^\]]+\]', '.+', re.sub(r'\[[^\]]+\]', '[^/]+', r)) + '$'
        if re.match(pat, h): return True
    return False

bad = []
for f in sorted(pathlib.Path('src').rglob('*.tsx')):
    for m in re.finditer(r'href="(/[^"]*)"', f.read_text()):
        if not matches(m.group(1)):
            bad.append((f, m.group(1)))
for f, h in bad:
    print('%-58s %s' % (str(f) + ':', h))
print('\n%d broken internal link(s)' % len(bad))
