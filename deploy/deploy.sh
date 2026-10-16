#!/usr/bin/env bash
# Build the docs and copy them to the server.
#
#   DOCS_URL=https://ferrifuzz.bubblelamp.space DEPLOY_TARGET=user@server:/var/www/ferrifuzz-docs deploy/deploy.sh
#
# Add DOCS_PUBLIC=1 when the site should be indexed by search engines (after going public).
set -euo pipefail
cd "$(dirname "$0")/.."

: "${DOCS_URL:?set DOCS_URL, e.g. https://ferrifuzz.bubblelamp.space}"
: "${DEPLOY_TARGET:?set DEPLOY_TARGET, e.g. user@server:/var/www/ferrifuzz-docs}"

npm ci
npm run build
# --delete removes pages that no longer exist; the trailing slash copies build/'s contents.
rsync -avz --delete build/ "$DEPLOY_TARGET/"
