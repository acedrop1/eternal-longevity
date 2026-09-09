"""Module-scope constant arrays of objects — the classic hardcoded-sample-data smell."""
import re, sys, pathlib
ENTRY = re.compile(r'^\s*\{', re.M)
files = [p for r in sys.argv[1:] for p in pathlib.Path(r).rglob('*.tsx')]
for f in sorted(files):
    src = f.read_text()
    for m in re.finditer(r'^const ([A-Z][A-Z0-9_]{2,})(?::[^=]+)? = \[', src, re.M):
        i, depth = src.index('[', m.start()), 0
        while i < len(src):
            if src[i] == '[': depth += 1
            elif src[i] == ']':
                depth -= 1
                if depth == 0: break
            i += 1
        body = src[m.start():i+1]
        if '{' not in body:
            continue
        line = src[:m.start()].count('\n') + 1
        print('%s:%d  %s  (%d lines, %d entries)'
              % (f, line, m.group(1), body.count('\n'), len(ENTRY.findall(body))))
