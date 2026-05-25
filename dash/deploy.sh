#!/bin/bash
set -euo pipefail

# Run non-interactively (CI / SSH deploys).
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Load secrets (BUNNY_FTP_USER / _PASS / _ACCOUNT_API_KEY / _PULLZONE_ID).
# .env.deploy is gitignored — keep secrets out of source control.
if [ ! -f .env.deploy ]; then
  echo "ERROR: .env.deploy not found. Copy .env.deploy.example, fill in BunnyCDN creds, and retry." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
. ./.env.deploy
set +a

: "${BUNNY_FTP_USER:?missing in .env.deploy}"
: "${BUNNY_FTP_PASS:?missing in .env.deploy}"
: "${BUNNY_ACCOUNT_API_KEY:?missing in .env.deploy}"
: "${BUNNY_PULLZONE_ID:?missing in .env.deploy}"


rm -rf dist/*
# Enforce the pnpm pin from package.json's packageManager field, then build.
corepack enable
pnpm install --frozen-lockfile
pnpm build

# Stamp dist/index.html with the deploy timestamp so the deployed build is
# self-identifying when inspected via View Source / curl. Also append a one-line
# audit record to deploy.log (timestamp + the hashed bundle that was deployed).
DEPLOY_STAMP_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
DEPLOY_STAMP_LOCAL="$(date +"%Y-%m-%d %H:%M:%S %Z")"
BUNDLE="$(grep -oE 'index-[A-Za-z0-9_-]+\.(js|css)' dist/index.html | sort -u | tr '\n' ' ' | sed 's/ $//')"
printf '<!-- deploy: %s -->\n%s' "$DEPLOY_STAMP_UTC" "$(cat dist/index.html)" > dist/index.html
printf '%s  utc=%s  bundle=%s\n' "$DEPLOY_STAMP_LOCAL" "$DEPLOY_STAMP_UTC" "$BUNDLE" >> deploy.log

# Upload dist/ to BunnyCDN Storage.
lftp -u "$BUNNY_FTP_USER,$BUNNY_FTP_PASS" storage.bunnycdn.com <<EOF
mirror -R ./dist .
quit
EOF

# Purge CDN cache so users see the new build immediately.
curl -fSs -X POST \
  -H "AccessKey: ${BUNNY_ACCOUNT_API_KEY}" \
  "https://api.bunny.net/pullzone/${BUNNY_PULLZONE_ID}/purgeCache"

echo "Deploy & Cache Invalidation complete (stamp=$DEPLOY_STAMP_UTC bundle=$BUNDLE)."
