#!/usr/bin/env bash
# One-command rebuild + deploy for the Warm Alpine Modern site.
#   ./deploy.sh ["commit message"]        rebuild index.html, re-render PDF, commit & push
#   ./deploy.sh --no-pdf ["message"]      skip the (slow) PDF render
set -euo pipefail
cd "$(dirname "$0")"

RENDER=1
if [ "${1:-}" = "--no-pdf" ]; then RENDER=0; shift; fi
MSG="${1:-Update Warm Alpine Modern site}"
URL="https://onieves10.github.io/warm-alpine-modern/"

echo "▶ building index.html";                 python3 build.py
if [ "$RENDER" = "1" ]; then
  echo "▶ rendering pixel-perfect PDF";        node render.js
else
  echo "▶ skipping PDF render (--no-pdf)"
fi

echo "▶ staging + committing";                 git add -A
if git diff --cached --quiet; then
  echo "  nothing to commit"
else
  git -c commit.gpgsign=false commit -q -m "$MSG

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
fi

echo "▶ pushing to GitHub";                     git push -q origin main
echo "✓ pushed — Pages redeploys in ~1 min:"
echo "  $URL"
