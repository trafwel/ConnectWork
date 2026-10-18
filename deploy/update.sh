#!/usr/bin/env bash
# M13 — ship the latest main to the VM: pull, install, build, restart, check.
# Run ON THE VM as the user who owns /srv/connectwork/app (not root):  bash deploy/update.sh
set -euo pipefail
cd /srv/connectwork/app

git pull --ff-only                  # never merges or rewrites anything on the VM
pnpm install --frozen-lockfile      # exactly the versions CI tested
pnpm build                          # web: apps/web/dist (reads VITE_* from .env)
sudo systemctl restart connectwork  # API (Caddy serves the new web files at once; if deploy/Caddyfile
                                    # changed, copy it again: docs/DEPLOY.md step 6)

for i in 1 2 3 4 5; do
  curl -fsS http://127.0.0.1:8787/api/health && echo && exit 0
  sleep 1
done
echo "The API did not come up: journalctl -u connectwork -n 50" >&2
exit 1
