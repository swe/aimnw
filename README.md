# aimnw

Personal website — Vite + React + React Router, read-only frontend over domain APIs.

**Production:** this is not a static site. See [DEPLOY.md](DEPLOY.md) for Node + TLS + systemd/nginx, secrets, Garmin session, and MapKit.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Fill `API_*` in `.env` with your server (or mock) URLs.

`API_LIBRARY` should be the finished-books list URL (`https://api.alleksy.com/books/finished`). Detail requests use the parent `/books/:id`.

`API_PHOTOS` is an Immich share URL (`https://m.alleksy.com/s/wedding`). Gallery JSON is fetched via the `/immich` proxy; thumbnails load directly from the Immich host.

`MAPKIT_TOKEN` is server-only. The browser fetches it from `/api/mapkit-token` when a map actually opens. Restrict the token to localhost and your production domains in Apple Developer.

`HEVY_API_KEY` is server-only (same pattern as Discogs). Sport aggregates Hevy workouts + body measurements through `/api/hevy/summary`, Garmin Connect workouts (runs, cycling, hikes, swims, gym heart rate / zones / GPS) through `/api/garmin/workouts` after `pnpm garmin:login`, and Oura Ring sleep and biometrics through `/api/oura/workouts` when `OURA_ACCESS_TOKEN` is set. Garmin owns cardio sessions; Oura fills holes and supplies recovery; Hevy stays gym volume. Oura does not provide GPS; Garmin does, lazily, when a week row is expanded.

### One training source

`/sport` is the source of truth. Home's "This year in training" panel reads the same hub (`getSportHub`) and just shows the two newest sessions from it via `pickRecentSportSessions`, so the teaser can never disagree with the page it links to.

The hub is not part of the boot prefetch — home's panel requests it on mount behind its own skeleton, and the payload is cached in `sessionStorage`, so a reload or a click through to `/sport` paints from the same entry.

Oura rows map into the `TrainingPayload` shape in `src/api/training.ts`. There is no separate training JSON feed.

Hevy is required for `/sport` — without it the page errors and home's panel shows its failure line. Oura and Garmin are optional: the hub still builds from gym data and both surfaces say so. Recovery and sleep come from Oura; cardio GPS, HR zones, and measured distance come from Garmin.

`SPORT_GOALS` and `SPORT_HEIGHT_CM` in `src/api/sport/goals.ts` are personal targets. No API serves them; edit them there.

Garmin Connect has no personal API. Run `pnpm garmin:login` once (email/password + MFA, or a browser service ticket if Cloudflare blocks SSO). Tokens land in `.garmin-session.json` (gitignored). The server refreshes them; do not ship that file to the browser.

Oura **Fitness Age** (cardiovascular age) and **VO₂ max** come from `/v2/usercollection/daily_cardiovascular_age` (`vascular_age` field) and require the **`heart_health` OAuth scope**. A plain personal access token without that scope will leave those tiles empty. Set `OURA_CLIENT_ID` / `OURA_CLIENT_SECRET` in `.env`, add redirect `http://localhost:8787/callback` on your Oura app, then run `pnpm oura:oauth`.

Headspace and `/use` read Joplin Server notebooks through `/api/joplin` (`JOPLIN_BASE_URL`, `JOPLIN_EMAIL`, `JOPLIN_PASSWORD`, `JOPLIN_FOLDER_ID`, `JOPLIN_USE_FOLDER_ID`). Those stay server-only.

## Scripts

- `pnpm dev` — local development
- `pnpm build` — production build
- `pnpm preview` — preview production build
- `pnpm lint` — oxlint
- `pnpm oura:oauth` — Oura heart_health token
- `pnpm garmin:login` — Garmin Connect session file
