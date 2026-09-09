"""Find controls that look interactive but are wired to nothing."""
import re, sys, pathlib

roots = sys.argv[1:] or ['src']
files = [p for r in roots for p in pathlib.Path(r).rglob('*.tsx')]

def opening_tags(src, tag):
    """Yield (line_no, tag_text) for each <tag ...> opening tag, brace-aware."""
    for m in re.finditer(r'<' + tag + r'(?=[\s>])', src):
        i, depth, inbrace = m.end(), 0, 0
        while i < len(src):
            c = src[i]
            if c == '{': inbrace += 1
            elif c == '}': inbrace -= 1
            elif c == '>' and inbrace == 0:
                break
            i += 1
        yield src[:m.start()].count('\n') + 1, src[m.start():i + 1]

WIRED = ('onClick', 'onSubmit', 'onChange', 'formAction', 'type="submit"',
         'type={', 'disabled', 'onPointer', 'onMouseDown', 'popovertarget')

hits = []
for f in sorted(files):
    src = f.read_text()
    for line, tag in opening_tags(src, 'button'):
        if not any(w in tag for w in WIRED):
            hits.append((f, line, 'button', re.sub(r'\s+', ' ', tag)[:90]))
    for line, tag in opening_tags(src, 'a'):
        if re.search(r'href="#"|href={?["\']#', tag):
            hits.append((f, line, 'a href="#"', re.sub(r'\s+', ' ', tag)[:90]))

for f, line, kind, tag in hits:
    print(f'{f}:{line}  [{kind}]  {tag}')
print(f'\n{len(hits)} dead control(s)')
