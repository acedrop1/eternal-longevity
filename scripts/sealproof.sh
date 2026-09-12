#!/usr/bin/env bash
# Finds UI that looks wired but is connected to nothing. Run before a deploy.
#   ./scripts/sealproof.sh
set -u
cd "$(dirname "$0")/.."
echo "── controls with no handler ───────────────────────────"
python3 scripts/deadctl.py src/app src/components
echo
echo "── internal links to routes that do not exist ─────────"
python3 scripts/deadlinks.py
echo
echo "── inputs that carry no name and no handler ───────────"
python3 scripts/deadinputs.py src/app src/components
echo
# Scoped to the portal on purpose: a constant array is how the marketing pages
# hold their copy, but inside a portal it means sample data standing in for a
# real query.
echo "── portal sample data standing in for a query ─────────"
python3 scripts/mockdata.py src/app/portal src/components/admin src/components/portal \
                           src/components/orders src/components/pharmacy src/components/doctor
echo
echo "── success messages with no server call (noisy — eyeball) ─"
python3 scripts/theatre.py
echo
echo "── mail that skips the brand frame ────────────────────"
python3 scripts/unbranded-email.py
