"""Mail that goes out without the brand frame.

Half the operational mail was bare <p> tags. It arrived looking like a script
wrote it — poor in a shared support inbox, worse when the recipient is a
pharmacy deciding whether to work with you.
"""
import re, pathlib

bad = []

# 1. A call site that builds its own HTML instead of using a template.
for f in sorted(pathlib.Path('src').rglob('*.ts')):
    if f.name == 'email.ts':
        continue
    src = f.read_text()
    for m in re.finditer(r'html:\s*`', src):
        line = src[: m.start()].count('\n') + 1
        bad.append((f, line, 'inline HTML — use a template or noticeEmail()'))

# 2. A template that never reaches the shell.
src = pathlib.Path('src/lib/email.ts').read_text()
for m in re.finditer(r'export function (\w*[Ee]mail)\(', src):
    end = src.index('\n}\n', m.end())
    body = src[m.end(): end]
    if 'shell(' not in body and 'noticeEmail(' not in body:
        line = src[: m.start()].count('\n') + 1
        bad.append((pathlib.Path('src/lib/email.ts'), line,
                    f'{m.group(1)} never wraps in shell()'))

for f, line, why in bad:
    print(f'{f}:{line}  {why}')
print(f'\n{len(bad)} unbranded email(s)')
