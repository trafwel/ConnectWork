#!/usr/bin/env bash
# Live demo from this laptop, no account needed (Oct 18): production build + API + a Cloudflare
# "quick tunnel" that gives a public https://….trycloudflare.com address.
#
# - The site is live only while this script runs AND the laptop is awake (caffeinate keeps it
#   awake while the tunnel is up). Ctrl-C stops everything.
# - The API runs on 127.0.0.1:8788 (your `pnpm dev` on 8787 is untouched) and reads the same
#   .env (Gemini key, free tier). All visitors arrive through one local proxy, so the rate limit
#   is effectively 30 AI requests per minute in TOTAL, which protects our quota.
# - The quick-tunnel address changes every time you restart; the permanent site is docs/DEPLOY.md.
set -euo pipefail
cd "$(dirname "$0")/.."

pnpm build

(cd apps/server && HOST=127.0.0.1 PORT=8788 DEMO_CACHE=replay TEXTING_AGENT=0 exec pnpm exec tsx src/index.ts) &
API_PID=$!
PREVIEW_PORT=4173 API=http://127.0.0.1:8788 pnpm preview:prod &
WEB_PID=$!
trap 'kill $API_PID $WEB_PID 2>/dev/null || true' EXIT

sleep 3
echo
echo "Starting the public tunnel: look for https://<random>.trycloudflare.com below."
caffeinate -dims cloudflared tunnel --no-autoupdate --url http://localhost:4173
