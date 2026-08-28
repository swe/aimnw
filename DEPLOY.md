# Deploying aimnw

This site is a Vite SPA plus a small Node server. The Node process is required in production: it serves `dist/`, the `/api/*` proxies (secrets stay here), and the `/immich` gallery proxy.

Do not deploy this as static files on GitHub Pages, S3, or a CDN-only host. Those cannot hold Hevy / Garmin / Oura / Joplin / Telegram / MapKit credentials or the Garmin session file.

## Architecture

```
browser
  │  HTML / JS / CSS from dist/
  │  GET /api/mapkit-token, /api/hevy/summary, /api/garmin/…, …
  │  GET /immich/…  (JSON; thumbnails still load from the Immich host)
  ▼
nginx / Caddy  (TLS, :443 → 127.0.0.1:4173)
  ▼
node server/serve.mjs
  ├── dist/                  built frontend
  ├── .env                   runtime secrets + (build-time) public URLs
  └── .garmin-session.json   Garmin Connect tokens (optional)
```

Two classes of environment variables:

| When | What | Why |
|------|------|-----|
| **Build** (`pnpm build`) | `API_DRINKS`, `API_LIBRARY`, `API_MAP`, `API_GOALS`, `API_HATES`, `API_PHOTOS`, `API_QUESTS` | Vite inlines these URLs into the client bundle. Changing them later requires a rebuild. |
| **Runtime** (`pnpm start`) | Everything else (`MAPKIT_TOKEN`, `HEVY_API_KEY`, Joplin, Oura, Garmin, Discogs, Telegram, cache TTLs, `PORT`) | Read from `.env` (or the process environment) by `server/`. Restart the process after edits. |

`.env` is gitignored. Never commit it, `.garmin-session.json`, or a built `dist/` that was produced with secrets in an older Vite `envPrefix` (MapKit used to be baked into JS; current builds fetch it from `/api/mapkit-token`).

## What you need

- A VPS (Ubuntu 24.04 is fine) with a public IPv4/IPv6
- A domain pointed at that VPS
- **Node.js 22 LTS** (18+ works because the server uses `fetch`; 22 is what this repo is developed against)
- **pnpm 11** (`packageManager` in `package.json`) — only required on the machine that runs `pnpm build`
- TLS (Let’s Encrypt)
- Apple MapKit JS token restricted to this production hostname **and** `localhost` (for local `pnpm dev`)

Optional, depending on which pages you care about:

| Page / feature | Required on the server |
|----------------|------------------------|
| `/sport` gym tiles | `HEVY_API_KEY` |
| `/sport` cardio, GPS, HR zones | `.garmin-session.json` (see [Garmin](#garmin-connect)) |
| `/sport` sleep, recovery, Fitness Age | `OURA_ACCESS_TOKEN` (+ OAuth scopes; see [Oura](#oura-ring)) |
| `/headspace`, `/use` | Joplin Server URL + login + folder ids |
| `/library` vinyl | `DISCOGS_USERNAME` + `DISCOGS_TOKEN` |
| Contact form | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` |
| `/map` and sport route maps | `MAPKIT_TOKEN` |
| `/viewfinder`, home camera roll | `API_PHOTOS` (Immich share URL); proxy target is `https://m.alleksy.com` in `server/serve.mjs` |

Hevy is required for `/sport`. Oura and Garmin degrade instead of failing the page.

## 1. DNS

Create an A (and AAAA if you have v6) record for the site hostname, e.g. `aimnw.example.com` → the VPS. Wait until it resolves before requesting a certificate.

## 2. Server packages

```bash
# Node 22 via NodeSource, or use nvm / fnm. Then:
sudo corepack enable
corepack prepare pnpm@11.17.0 --activate

node -v    # v22.x
pnpm -v    # 11.x
```

Install nginx (or Caddy) and certbot if you use nginx:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create a deploy user and directory. Do not run the app as root.

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin aimnw
sudo mkdir -p /var/www/aimnw
sudo chown aimnw:aimnw /var/www/aimnw
```

## 3. Put the code on the server

Pick one of the two flows. Both end with the same runtime layout.

### A. Build on the server (simplest)

```bash
sudo -u aimnw -H git clone <your-repo-url> /var/www/aimnw
cd /var/www/aimnw
sudo -u aimnw -H cp .env.example .env
sudo -u aimnw -H nano .env          # fill values — see section 4
sudo -u aimnw -H pnpm install
sudo -u aimnw -H pnpm build
```

`pnpm build` runs `tsc -b && vite build`. It must see the `API_*` variables (from `.env` in the project root).

### B. Build locally, copy a release (no compilers on the VPS)

On your laptop, with a complete `.env`:

```bash
pnpm install
pnpm build
```

Rsync the runtime tree. The production server is plain Node — it does **not** import `node_modules`.

```bash
rsync -a --delete \
  dist/ server/ package.json \
  user@host:/var/www/aimnw/
```

Then copy secrets separately (never through a public gist or chat):

```bash
scp .env user@host:/var/www/aimnw/.env
scp .garmin-session.json user@host:/var/www/aimnw/.garmin-session.json
```

On the server:

```bash
chmod 600 /var/www/aimnw/.env /var/www/aimnw/.garmin-session.json
chown aimnw:aimnw /var/www/aimnw/.env /var/www/aimnw/.garmin-session.json
```

Keep `server/*.mjs` and `dist/` in sync. A new frontend without an updated `server/` (or the reverse) will break `/api/*`.

## 4. Environment file

Copy `.env.example` and fill it. Full comments live in that file. Summary:

**Inlined at build time (public URLs, not secrets):**

```
API_DRINKS=
API_LIBRARY=          # finished-books list, e.g. https://api.alleksy.com/books/finished
API_MAP=
API_GOALS=
API_HATES=
API_PHOTOS=           # Immich share, e.g. https://m.alleksy.com/s/aimnw
API_QUESTS=
```

**Runtime only (never shipped in JS):**

```
MAPKIT_TOKEN=         # Maps token, domain-restricted
HEVY_API_KEY=
DISCOGS_USERNAME=
DISCOGS_TOKEN=
JOPLIN_BASE_URL=
JOPLIN_EMAIL=
JOPLIN_PASSWORD=
JOPLIN_FOLDER_ID=
JOPLIN_USE_FOLDER_ID=
OURA_ACCESS_TOKEN=
OURA_CLIENT_ID=       # optional, for refresh / heart_health
OURA_CLIENT_SECRET=
OURA_REFRESH_TOKEN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
GARMIN_EMAIL=         # optional; prefer a session file instead
GARMIN_PASSWORD=
GARMIN_SESSION_FILE=  # default .garmin-session.json, relative to repo root
PORT=4173             # or set in systemd; default 4173
```

Optional cache windows (milliseconds, default `600000` = 10 minutes):

```
HEVY_CACHE_TTL_MS=
OURA_CACHE_TTL_MS=
GARMIN_CACHE_TTL_MS=
```

Host-injected environment variables work too (`server/env.mjs` only fills keys that are not already set, except the secret prefixes which prefer `.env` so local edits stick). systemd `Environment=` / `EnvironmentFile=` is valid; `.env` in the project root is enough.

### MapKit

1. Apple Developer → Certificates, Identifiers & Profiles → Keys / Maps → **MapKit JS** token (Services → Maps → Tokens).
2. Restrict it to your production host **without** `https://` (example: `aimnw.example.com`) and to `localhost` for development.
3. Put the JWT in `MAPKIT_TOKEN`. The browser loads it from `GET /api/mapkit-token` when a map opens.

If you previously deployed a build that inlined this JWT, rotate the token.

### Garmin Connect

Garmin has no personal API. Run this on a machine with a browser (your laptop is easier than a headless VPS):

```bash
pnpm garmin:login
```

That writes `.garmin-session.json` (mode `0600`). Copy it to the server next to `server/`. The Node process refreshes the tokens; you should not need to log in again unless Garmin invalidates the session (password change, too many 401s, long downtime).

MFA and Cloudflare often block automated SSO on a VPS. Do not rely on `GARMIN_EMAIL` / `GARMIN_PASSWORD` in production except as a last resort; the one-shot login still cannot complete MFA without `pnpm garmin:login`.

### Oura Ring

Fitness Age and VO₂ max need the `heart_health` OAuth scope. The helper always uses `http://localhost:8787/callback`, so run it on your laptop:

```bash
# Oura app: redirect URI = http://localhost:8787/callback
# .env: OURA_CLIENT_ID, OURA_CLIENT_SECRET
pnpm oura:oauth
```

Copy `OURA_ACCESS_TOKEN` and `OURA_REFRESH_TOKEN` into the **server** `.env`. Restart the process. A personal access token without `heart_health` still feeds workouts/sleep; those two tiles stay empty.

### Joplin

`JOPLIN_FOLDER_ID` is the Headspace notebook; `JOPLIN_USE_FOLDER_ID` is the `/use` notebook. Each id is the `parent_id` of a note in that folder.

### Telegram contact form

Create a bot with [@BotFather](https://t.me/BotFather), message it once, then read `chat_id` from `getUpdates`. The handler rate-limits by `X-Forwarded-For` (first hop) or the socket address — nginx must pass that header.

## 5. systemd

`/etc/systemd/system/aimnw.service`:

```ini
[Unit]
Description=aimnw
After=network.target

[Service]
Type=simple
User=aimnw
Group=aimnw
WorkingDirectory=/var/www/aimnw
Environment=NODE_ENV=production
Environment=PORT=4173
ExecStart=/usr/bin/node server/serve.mjs
Restart=on-failure
RestartSec=5
# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/aimnw
# Garmin refresh writes .garmin-session.json
UMask=0077

[Install]
WantedBy=multi-user.target
```

If Node lives under nvm/fnm, set `ExecStart` to that binary and add `Environment=PATH=...`.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now aimnw
sudo systemctl status aimnw
```

The process logs `aimnw listening on http://localhost:4173`. It binds the default Node listen address (all interfaces). Keep **4173 off the public internet** with a firewall; only nginx on 443 should be reachable.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Smoke-test on the box:

```bash
curl -sI http://127.0.0.1:4173/ | head
curl -s http://127.0.0.1:4173/api/mapkit-token | wc -c   # should be small JSON, not HTML
```

## 6. Reverse proxy (TLS)

### nginx

`/etc/nginx/sites-available/aimnw`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name aimnw.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name aimnw.example.com;

    ssl_certificate     /etc/letsencrypt/live/aimnw.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aimnw.example.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Larger Joplin / Immich JSON is fine under a few MB; raise if needed.
    client_max_body_size 8m;

    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

First certificate (HTTP-only server block, then expand):

```bash
sudo ln -s /etc/nginx/sites-available/aimnw /etc/nginx/sites-enabled/
sudo nginx -t
sudo certbot --nginx -d aimnw.example.com
sudo systemctl reload nginx
```

Do not add a separate `expires` on `/assets/` unless you are sure it cannot override HTML. `server/serve.mjs` already sends `Cache-Control: public, max-age=31536000, immutable` for hashed files and `no-cache` for `index.html`. API JSON is `no-store`.

### Caddy (alternative)

```caddy
aimnw.example.com {
    reverse_proxy 127.0.0.1:4173
}
```

Caddy obtains and renews certificates itself.

## 7. Verify after go-live

Open the site over HTTPS and check:

- Home loads; fonts and `https://stats.alleksy.com/api/script.js` are not blocked
- `/map` — Apple MapKit pins (token fetch + domain allowlist)
- `/sport` — Hevy numbers; Garmin sessions if you copied the session file; Oura sleep if configured
- Expand a run/ride — GPS overlay (Garmin route endpoint)
- `/headspace` and `/use` — Joplin notes
- `/viewfinder` — Immich grid (JSON via `/immich`, images from the Immich origin)
- Contact FAB — one test message to Telegram
- `View source` / Network: JS chunks must **not** contain `MAPKIT_TOKEN` or other secrets. MapKit traffic should show `GET /api/mapkit-token`

Useful server checks:

```bash
sudo journalctl -u aimnw -f
curl -s http://127.0.0.1:4173/api/garmin/status
curl -s http://127.0.0.1:4173/api/oura/status
```

## 8. Updating

**Code (build-on-server):**

```bash
cd /var/www/aimnw
sudo -u aimnw -H git pull
sudo -u aimnw -H pnpm install
sudo -u aimnw -H pnpm build
sudo systemctl restart aimnw
```

**Code (rsync):** rebuild locally, rsync `dist/` and `server/`, then `sudo systemctl restart aimnw`.

**Secrets only:** edit `.env` (or replace `.garmin-session.json`), then `sudo systemctl restart aimnw`. No rebuild unless you changed an `API_*` URL.

**`API_*` URL change:** edit `.env`, run `pnpm build`, restart. The old URLs stay in the previous JS until you rebuild.

## 9. Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `Build missing. Run pnpm build before pnpm start.` | Empty or wrong `WorkingDirectory`; `dist/` not on the server |
| Maps error about missing `MAPKIT_TOKEN` | Runtime `.env` missing the key, or Apple token not allowed for this hostname |
| MapKit loads locally, blank in production | Token origin list does not include the production host (no `https://` prefix) |
| `/sport` errors immediately | Missing `HEVY_API_KEY` |
| `/sport` has gym but no runs | No `.garmin-session.json`, or Garmin session expired — run `pnpm garmin:login` and copy the file |
| Fitness Age / VO₂ empty | Token lacks `heart_health` — run `pnpm oura:oauth` locally and copy tokens |
| Joplin 502 / login failed | Wrong `JOPLIN_BASE_URL` (no trailing issues; scheme + host), or the server cannot reach Joplin |
| Photos empty, library fine | Immich share slug in `API_PHOTOS`; proxy is hardcoded to `https://m.alleksy.com` in `server/serve.mjs` — change both if the host moves |
| Contact 429 | Rate limit (5 / minute / IP). Confirm nginx sets `X-Forwarded-For` |
| Contact 503 `Missing TELEGRAM_*` | Runtime env not loaded; restart after editing `.env` |
| Stale sport data | Expected: 10 minute TTL. Restart the process to drop the in-memory cache |
| `pnpm preview` vs production | `preview` is Vite; production is `pnpm start` / systemd. Always smoke-test `pnpm start` |

## 10. Security checklist

- [ ] `.env` and `.garmin-session.json` are `0600`, owned by the service user, not in git
- [ ] Port 4173 is not open on the public firewall
- [ ] MapKit token is origin-restricted; rotated if an old bundle leaked it
- [ ] TLS on the public hostname only
- [ ] Joplin / Immich / Telegram tokens never appear in client JS (search a production `dist/assets` chunk if unsure)
- [ ] Garmin login is not left as a password-only production path
- [ ] `SPORT_GOALS` / `SPORT_HEIGHT_CM` in `src/api/sport/goals.ts` are rebuilt into JS on purpose (personal targets, not API secrets)

## 11. What `pnpm start` actually serves

From `server/serve.mjs` and `server/api.mjs`:

| Path | Role |
|------|------|
| `/api/mapkit-token` | MapKit JWT |
| `/api/contact` | POST contact → Telegram |
| `/api/vinyl` | Discogs collection |
| `/api/hevy/summary` | Gym + body |
| `/api/oura/status`, `/api/oura/workouts` | Oura |
| `/api/garmin/status`, `/api/garmin/workouts`, `/api/garmin/activities/:id/route` | Garmin |
| `/api/joplin/...` | Notes, `/use` catalog, note images |
| `/immich/...` | Immich share JSON (no CORS on the origin) |
| everything else | files under `dist/`, then SPA `index.html` |

That is the entire production surface. There is no separate worker or database.
