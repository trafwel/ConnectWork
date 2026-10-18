# Deploy: Connectwork on our domain (M13)

One small Ubuntu VM runs everything:

- **Caddy** serves the built web app and the HTTPS certificate (automatic), and forwards `/api/*` to the API.
- **The API** (Node, `deploy/connectwork.service`) listens only on `127.0.0.1:8787`, so Caddy is the only way in.
- **Your data stays in each visitor's browser.** The server stores nothing and logs only route, status and time.

Steps marked 🧑 are **human-only** (accounts, money, credentials). The rest is copy-paste.

## Right now, without a VM: a tunnel from a laptop

```bash
bash deploy/tunnel.sh
```

This builds the app, starts it with the production headers, and opens a Cloudflare "quick tunnel" (no account) at a public `https://<random>.trycloudflare.com` address.

- It stays live only while the script runs and the laptop is awake (`caffeinate` keeps it awake meanwhile).
- The address changes on every restart.
- All visitors share one 30-requests-per-minute AI limit, which protects the quota.
- `cloudflared` comes from Homebrew (`brew install cloudflared`).

Use it for a link today; the steps below are the permanent site.

## 0. Before you start (🧑)

1. 🧑 **VM:** create an Ubuntu 24.04 VM (Vultr, the smallest plan is enough) and add your SSH key. Note its **IP address**.
2. 🧑 **Domain:** our GoDaddy Registry domain → DNS → an **A record** for the domain (or a subdomain) → the VM's IP. It can take a few minutes to work.
3. 🧑 **Gemini key:** the VM gets its own `.env` with `GEMINI_API_KEY`. Keep `GEMINI_TIER=free` unless it's a paid key: on free, the app shows the banner and refuses real calendar data.
4. 🧑 **Google sign-in (optional, M11):** in the Google Cloud OAuth client, add `https://<domain>` to **Authorized JavaScript origins**. Without a client ID the app shows sample meetings.

## 1. Install (on the VM)

```bash
sudo apt update && sudo apt install -y caddy git curl ufw
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install -y nodejs
sudo npm install -g pnpm@10
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw --force enable
```

The firewall leaves only SSH and the web open, so 8787 is never reachable from outside. The API also listens only on 127.0.0.1.

## 2. Get the code and build

```bash
sudo mkdir -p /srv/connectwork && sudo chown "$USER" /srv/connectwork
git clone https://github.com/trafwel/ConnectWork.git /srv/connectwork/app
cd /srv/connectwork/app
cp .env.example .env && chmod 600 .env
nano .env
```

In `.env` (🧑 paste the key yourself; **no comments on the same line as a value**, because systemd would keep them):

```
GEMINI_API_KEY=…
GEMINI_TIER=free
ALLOWED_ORIGIN=https://<domain>
DEMO_CACHE=replay
VITE_GOOGLE_CLIENT_ID=…
```

`VITE_GOOGLE_CLIENT_ID` is optional: leave it empty to show sample meetings.

Then:

```bash
pnpm install --frozen-lockfile && pnpm build
```

## 3. Start the API

```bash
sudo cp deploy/connectwork.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now connectwork
curl -s http://127.0.0.1:8787/api/health
```

The health check should show `"tier":"free"`, `"cache":"replay"` and `"aiConfigured":true`.

- systemd reads `.env` as root, so the file stays private (`chmod 600`) while the API runs as `www-data`.
- `HOST=127.0.0.1` and `TRUST_PROXY=1` are fixed in the unit, so `.env` can't change them.
- Logs: `journalctl -u connectwork -f` (route, status, time; never request bodies).

## 4. Start Caddy (HTTPS)

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo sed -i 's/connectwork.example/<domain>/' /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy gets the certificate on the first request (the DNS record must already point at the VM).

## 5. Check

```bash
curl -s https://<domain>/api/health
curl -sI https://<domain>/ | grep -iE 'content-security|strict-transport'
```

Then, in a browser at `https://<domain>`:

1. The map loads with 40 demo people, and the console shows **no** "Content Security Policy" errors.
2. Ask *"Who do I know at Microsoft?"*.
3. Open the Coffee with John meeting.
4. 🧑 If a client ID is set, click **Connect Google Calendar** and sign in with a test user.

## 6. Ship an update

```bash
cd /srv/connectwork/app && bash deploy/update.sh
```

This pulls `main`, installs exactly the CI-tested versions, builds, restarts the API and checks its health. If `deploy/Caddyfile` changed, repeat step 4.

On judging morning, record the demo answers first ([DEMO_DAY.md](DEMO_DAY.md)), commit `demo/demo-cache.json`, then run the update so the server replays them and the browser bundle has the offline copy.

## Try the production setup on your laptop

You don't need Caddy:

```bash
pnpm build && pnpm preview:prod
```

This serves the built app on http://localhost:4173 with the **same security headers** (read from `deploy/Caddyfile`), the same caching and SPA fallback, and `/api` forwarded to your running `pnpm dev` server. Use it to catch a CSP mistake before it becomes a blank page on the domain. `scripts/deploy.test.ts` also fails if the inline theme script in `apps/web/index.html` changes without the CSP hash being updated.
