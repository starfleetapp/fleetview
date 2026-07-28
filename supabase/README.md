# FleetView on Supabase

The local demo runs on a small Node API + SQLite (`server/`) so it works with zero
cloud setup. This folder is the **production target**: the same schema as Postgres
with full multi-tenancy + RLS, plus the ingest Edge Function. Moving to Supabase is a
deploy, not a rewrite.

## What maps to what

| Local demo (`server/`)          | Supabase                                            |
| ------------------------------- | --------------------------------------------------- |
| `server/db.js` (SQLite schema)  | `migrations/0001_init.sql` (Postgres + RLS)         |
| `POST /ingest` in `server.js`   | `functions/ingest/index.ts` (Edge Function)         |
| read API in `server.js`         | PostgREST (`supabase-js`) under RLS                 |
| realtime WebSocket broadcast    | Supabase Realtime on `telemetry_samples` / `events` |
| alert engine timer (`alerts.js`)| pg_cron + a scheduled Edge Function (see below)     |
| plaintext site token            | `sha256(token)` stored as `enroll_token_hash`       |

## Deploy

```bash
supabase init                 # once
supabase link --project-ref <ref>
supabase db push              # applies migrations/0001_init.sql
supabase functions deploy ingest --no-verify-jwt
```

Point each agent at the function:

```bash
docker run -d --restart=unless-stopped \
  -e DISH_ADDR=192.168.100.1:9200 \
  -e SITE_TOKEN=flv_xxx \
  -e CLOUD_INGEST_URL=https://<ref>.supabase.co/functions/v1/ingest \
  fleetview-agent
```

The agent sends the **plaintext** token; the function hashes it and matches
`sites.enroll_token_hash`, so tokens are never stored in the clear.

## Alert engine on Supabase

Two options:
1. **Keep `server/alerts.js`** running as a tiny worker (Fly.io / Railway / a Supabase
   scheduled Edge Function) that reads the latest sample per site and writes
   `events` / `alerts`, then calls Slack/Resend (`server/notify.js`).
2. **pg_cron + SQL**: schedule a function every minute to flip `site_down` events
   when `now() - max(ts) > window`, and `pg_net` to post to Slack. Threshold rules
   port directly from `alerts.js`.

## Frontend

Repoint `web/` from the proxy to Supabase: swap `web/src/lib/api.js` to use
`@supabase/supabase-js` with the anon key. RLS means each user only ever sees their
org's rows — no server-side filtering needed.
