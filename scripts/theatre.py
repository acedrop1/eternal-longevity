"""
Controls that respond but do nothing.

The dead-control check only catches a button with no handler at all. The
floating lead-capture pill had a handler — it set a flag that printed "Sent.
Check your inbox." while capturing nothing and sending nothing. This looks for
that shape: a component that reports success without ever reaching a server.
"""
import re, sys, pathlib

# Anything that actually leaves the browser.
REACHES_SERVER = re.compile(
    r"""from\s+'@/lib/[a-z-]*(actions|db|cards|email|sms|promo|stripe|supabase)[a-z-]*'"""
    r"""|from\s+'@/lib/(supabase|stripe|contact-actions|intake-actions|onboarding)"""
    r"""|\bfetch\s*\(|\baxios\b|createSupabase|useRouter|router\.(push|replace)"""
    r"""|<form[^>]+action=|formAction|\bsignIn\b|\bsignOut\b|revalidate""",
    re.I,
)

# Copy that claims something happened.
CLAIMS_SUCCESS = re.compile(
    r"""(sent\b|thanks|thank you|check your inbox|we'?ll be in touch|we'?ll email"""
    r"""|submitted|saved\b|subscribed|you'?re (in|on the list)|request received"""
    r"""|on its way|confirmed\b|success)""",
    re.I,
)

hits = []
for f in sorted(pathlib.Path('src').rglob('*.tsx')):
    src = f.read_text()
    if "'use client'" not in src.split('\n', 1)[0] and '"use client"' not in src[:40]:
        if "'use client'" not in src[:200]:
            continue
    if REACHES_SERVER.search(src):
        continue
    for m in CLAIMS_SUCCESS.finditer(src):
        line = src[:m.start()].count('\n') + 1
        ctx = src.splitlines()[line - 1].strip()
        if ctx.startswith(('*', '//', '/*')):      # a comment is not a claim
            continue
        hits.append((f, line, m.group(0), ctx[:88]))
        break

for f, line, word, ctx in hits:
    print(f'{f}:{line}  claims "{word}" but nothing in this file reaches a server')
    print(f'    {ctx}')
print(f'\n{len(hits)} control(s) that report success without doing anything')
