"""Inputs, selects and textareas that carry no name and no handler — they collect nothing."""
import re, sys, pathlib
def tags(src, tag):
    for m in re.finditer(r'<' + tag + r'(?=[\s/>])', src):
        i, brace = m.end(), 0
        while i < len(src):
            c = src[i]
            if c == '{': brace += 1
            elif c == '}': brace -= 1
            elif c == '>' and brace == 0: break
            i += 1
        yield src[:m.start()].count('\n') + 1, src[m.start():i+1]

WIRED = ('name=', 'onChange', 'onInput', 'value=', 'checked=', 'ref=', 'defaultValue', 'type="hidden"')
n = 0
for f in sorted(p for r in sys.argv[1:] for p in pathlib.Path(r).rglob('*.tsx')):
    src = f.read_text()
    for tag in ('input', 'select', 'textarea'):
        for line, t in tags(src, tag):
            if not any(w in t for w in WIRED):
                n += 1
                print('%s:%d  %s' % (f, line, re.sub(r'\s+', ' ', t)[:100]))
print('\n%d unbound control(s)' % n)
