# Deploying FleetView to a website

FleetView is one service: the backend runs the simulator + edge agent, exposes the
API + WebSocket, and **serves the built dashboard same-origin**. So a single host and
a single URL is all you need.

Build = `npm install && npm run build` · Start = `npm start` · Health = `/health`
The backend binds `0.0.0.0:$PORT` (the host injects `PORT`).

---

## Option A — Render (free, permanent URL) — recommended

1. Put this repo on GitHub.
2. Render → **New + → Blueprint** → pick the repo. `render.yaml` configures everything
   (Node 24, build, start, health check, `FLEET_SIZE=24`).
   *Or* **New Web Service** manually: Build `npm install && npm run build`,
   Start `npm start`, add env `NODE_VERSION=24` and `FLEET_SIZE=24`.
3. Deploy → you get `https://fleetview-xxxx.onrender.com`.

Free tier sleeps after ~15 min idle and cold-starts (~30s) on the next visit.

## Option B — Netlify / any static host (drag-and-drop, no server)

A static host can't run Node, so there's no simulator, agent or API. Instead the
dashboard ships with a **demo data layer**: a snapshot of real API responses
captured from a running fleet, replayed in the browser with a random walk over
the numbers and a stand-in WebSocket. It looks and behaves like the live product
— 40 dishes, MV Magellan offline in the Drake Passage, working charts and
obstruction maps — but nothing is actually being polled.

```bash
npm run build:demo
```

Then drag **`web/dist`** onto [app.netlify.com/drop](https://app.netlify.com/drop).

Notes:
- `web/public/_redirects` (`/* /index.html 200`) ships in the build so deep links
  like `/app/site/mv-magellan` survive a hard refresh.
- Timestamps are rebased to "now" on load. Without that the snapshot ages past
  the 3-minute staleness threshold in `classify()` and every dish reads offline.
- Zipping on Windows: use `zipfile` in Python, **not** `Compress-Archive` — the
  latter writes backslash separators and Netlify 404s every nested asset.
- A build made with plain `npm run build` also falls back to demo mode when no
  backend answers, so it stays useful if dropped on a static host by mistake.

## Option C — Docker host (Railway / Fly.io / any container)

A root `Dockerfile` builds and runs the whole thing.

```bash
# Railway: New Project → Deploy from repo (auto-detects Dockerfile)
# Fly.io:
fly launch --no-deploy      # creates fly.toml; set internal_port = 8787
fly deploy
```

## Option C — Instant shareable link (no account, runs from your PC)

For showing someone right now, tunnel the local production server:

```bash
npm run build && npm start          # serves everything on :8787
# in another terminal, one of:
npx cloudflared tunnel --url http://localhost:8787
npx localtunnel --port 8787
```

You'll get a public `https://…` URL. It lives only while your PC + these commands
run, and the URL changes each time — good for a quick demo, not a permanent home.

---

## Split deploy (optional)

You *can* host the dashboard on Vercel/Netlify and the backend on Render, but then the
dashboard must call an absolute backend URL (the app currently uses same-origin
`/api` + `/ws`). The single-service options above avoid that — keep it simple.

## Environment variables

| Var                 | Default        | Notes                                            |
| ------------------- | -------------- | ------------------------------------------------ |
| `PORT`              | 8787           | Set by the host; backend binds it.               |
| `FLEET_SIZE`        | all (40)       | Fewer simulated dishes for small/free hosts.     |
| `SLACK_WEBHOOK_URL` | —              | Or set in the dashboard → Settings.              |
| `RESEND_API_KEY` / `ALERT_EMAIL_TO` | — | Email alerts (or set in Settings).         |

## Before real (non-demo) use

The demo has **no login** and streams simulated data. Add Supabase Auth (see
[supabase/README.md](supabase/README.md)) and remove the demo `FLEET_SIZE` simulator
from `npm start` before pointing real site agents at it.
