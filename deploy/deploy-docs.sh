#!/bin/sh
# Build the docs and sync them into the nginx web root. Runs on the VPS, from
# .githooks/post-merge after every `git pull`, or by hand: sh deploy/deploy-docs.sh
#
# Optional settings in deploy/deploy.env (not committed):
#   DOCS_WWW=/var/www/ferrifuzz-docs              web root nginx serves
#   DOCS_URL=https://ferrifuzz.bubblelamp.space   must match server_name in deploy/nginx/
#   DOCS_NOINDEX=1                                ask search engines not to index the site
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$ROOT/deploy/deploy.env" ] && . "$ROOT/deploy/deploy.env"

WWW="${DOCS_WWW:-/var/www/ferrifuzz-docs}"
export DOCS_URL="${DOCS_URL:-https://ferrifuzz.bubblelamp.space}"
export DOCS_NOINDEX="${DOCS_NOINDEX:-}"

echo "┌── Deploy docs ($DOCS_URL)"
cd "$ROOT"

echo "├── Installing deps (npm ci)..."
npm ci --no-audit --no-fund

echo "├── Building..."
npm run build

echo "├── Built. Syncing build -> $WWW"
mkdir -p "$WWW"

if command -v rsync >/dev/null 2>&1; then
  # Hashed chunks from the previous build stay for a week: a tab still open on the
  # old version lazy-loads them when the reader navigates.
  rsync -a --delete --exclude 'assets/' build/ "$WWW/"
  rsync -a build/assets/ "$WWW/assets/"
  find "$WWW/assets" -type f -mtime +7 -delete 2>/dev/null || true
else
  cp -r build/. "$WWW/"
fi

echo "└── Docs deployed ✅"
