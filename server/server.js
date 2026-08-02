// FleetView cloud backend: token-verified ingest, read API, WebSocket realtime,
// enrollment, and the alert-engine timer. Local stand-in for Supabase; the data
// layer (db.js) mirrors the Supabase schema for a clean migration.
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import { createStore } from './db.js';
import { createNotifier } from './notify.js';
import { createAlertEngine } from './alerts.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 8787);
const store = createStore();
const notify = createNotifier(() => store.getIntegrations());

// Fast in-memory "latest sample per site" for the fleet view + WS deltas.
const latest = new Map();
for (const row of store.latestPerSite()) latest.set(row.site_id, row);

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' }));
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const ws of wss.clients) if (ws.readyState === ws.OPEN) ws.send(msg);
}

const safeParse = (j) => { try { return JSON.parse(j || '[]'); } catch { return []; } };

// roaming / install_pending are informational; only these degrade health.
const SERIOUS_ALERTS = new Set(['thermal_throttle', 'thermal_shutdown', 'motors_stuck', 'dish_water_detected', 'mast_not_near_vertical']);
function classify(s) {
  if (!s) return 'offline';
  if (s.reachable === 0 || s.state === 'OFFLINE') return 'offline';
  if (Date.now() - s.ts > 180000) return 'offline';
  const lat = s.latency_p95_ms ?? s.ping_latency_ms;
  const seriousAlert = safeParse(s.alerts).some((a) => SERIOUS_ALERTS.has(a));
  if (s.fraction_obstructed > 0.03 || s.ping_drop_rate > 0.05 || lat > 120 || seriousAlert) return 'degraded';
  return 'online';
}

function siteSummary(site) {
  const s = latest.get(site.id);
  return {
    id: site.id, name: site.name, type: site.type, region: site.region, lat: site.lat, lon: site.lon,
    status: classify(s), state: s?.state ?? 'UNKNOWN',
    ping_latency_ms: s?.ping_latency_ms ?? null, latency_p95_ms: s?.latency_p95_ms ?? null,
    ping_drop_rate: s?.ping_drop_rate ?? null, downlink_bps: s?.downlink_bps ?? null, uplink_bps: s?.uplink_bps ?? null,
    fraction_obstructed: s?.fraction_obstructed ?? null, currently_obstructed: !!s?.currently_obstructed,
    alerts: s ? safeParse(s.alerts) : [], last_seen: s?.ts ?? null,
  };
}

// ---------------- ingest ----------------
app.post('/ingest', (req, res) => {
  const records = req.body?.records || [];
  const headerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;
  let accepted = 0;
  for (const r of records) {
    const site = store.tokenToSite(r.token || headerToken);
    if (!site) continue;
    const ts = r.ts ? Date.parse(r.ts) : Date.now();
    if (r.type === 'obstruction') { store.upsertObstruction(site.id, r); accepted++; continue; }
    store.insertSample(site.id, { ...r, ts });
    store.upsertDish(site.id, r, ts);
    accepted++;
    if (r.backfill) continue; // historical fill — don't treat as live
    const prev = latest.get(site.id);
    if (!prev || ts >= prev.ts) {
      latest.set(site.id, {
        site_id: site.id, ts, state: r.state, reachable: r.reachable === false ? 0 : 1,
        downlink_bps: r.downlink_bps || 0, uplink_bps: r.uplink_bps || 0, ping_latency_ms: r.ping_latency_ms || 0,
        ping_drop_rate: r.ping_drop_rate || 0, latency_p95_ms: r.latency_p95_ms ?? null,
        fraction_obstructed: r.fraction_obstructed || 0, currently_obstructed: r.currently_obstructed ? 1 : 0,
        uptime_s: r.uptime_s || 0, snr_above_noise: r.snr_above_noise ? 1 : 0, azimuth: r.azimuth || 0,
        elevation: r.elevation || 0, gps_sats: r.gps_sats || 0, alerts: JSON.stringify(r.alerts || []),
      });
      broadcast({ type: 'status', site: siteSummary(site) });
    }
  }
  res.json({ ok: true, accepted });
});

// ---------------- read API ----------------
const API_KEY = process.env.API_KEY;
function authenticate(req, res, next) {
  if (!API_KEY) return next();
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (token !== API_KEY) return res.status(401).json({ error: 'unauthorized' });
  next();
}

app.get('/api/fleet', authenticate, (_req, res) => {
  const sites = store.listSites().map(siteSummary);
  const counts = { online: 0, degraded: 0, offline: 0 };
  let latSum = 0, latN = 0, downSum = 0;
  for (const s of sites) {
    counts[s.status]++;
    if (s.status !== 'offline' && s.ping_latency_ms != null) { latSum += s.ping_latency_ms; latN++; }
    if (s.status !== 'offline' && s.downlink_bps) downSum += s.downlink_bps;
  }
  res.json({ sites, summary: {
    total: sites.length, ...counts,
    avg_latency_ms: latN ? Math.round(latSum / latN) : null,
    total_downlink_bps: downSum, active_alerts: store.countActiveAlerts(),
  } });
});

app.get('/api/sites/:id', authenticate, (req, res) => {
  const site = store.getSite(req.params.id);
  if (!site) return res.status(404).json({ error: 'not found' });
  const s = latest.get(site.id);
  const dish = store.getDish(site.id);
  res.json({
    site: { id: site.id, name: site.name, type: site.type, region: site.region, lat: site.lat, lon: site.lon },
    status: s ? siteSummary(site) : null,
    detail: s ? { uptime_s: s.uptime_s, snr_above_noise: !!s.snr_above_noise, azimuth: s.azimuth, elevation: s.elevation, gps_sats: s.gps_sats, alerts: safeParse(s.alerts) } : null,
    dish: dish ? { device_id: dish.id, hardware_version: dish.hardware_version, software_version: dish.software_version, last_seen: dish.last_seen } : null,
    events: store.eventsForSite(site.id, 20),
  });
});

const RANGE = { '1h': 3600e3, '6h': 6 * 3600e3, '24h': 24 * 3600e3 };
app.get('/api/sites/:id/history', authenticate, (req, res) => {
  const ms = RANGE[req.query.range] || RANGE['1h'];
  const rows = store.recentSamples(req.params.id, Date.now() - ms);
  const step = Math.max(1, Math.ceil(rows.length / 240));
  const points = [];
  for (let i = 0; i < rows.length; i += step) {
    const r = rows[i];
    points.push({ ts: r.ts, latency: r.ping_latency_ms, p95: r.latency_p95_ms, drop: r.ping_drop_rate,
      down: r.downlink_bps, up: r.uplink_bps, obstructed: r.currently_obstructed, reachable: r.reachable });
  }
  res.json({ points, range: req.query.range || '1h' });
});

app.get('/api/sites/:id/obstruction', authenticate, (req, res) => {
  const o = store.getObstruction(req.params.id);
  if (!o) return res.json({ available: false });
  res.json({ available: true, ts: o.ts, num_rows: o.num_rows, num_cols: o.num_cols, snr: safeParse(o.snr) });
});

app.get('/api/events', authenticate, (req, res) => res.json({ events: store.listEvents(Number(req.query.limit) || 50) }));
app.get('/api/alerts', authenticate, (req, res) => res.json({ alerts: store.listAlerts(Number(req.query.limit) || 50) }));

app.get('/api/alert-rules', (_req, res) =>
  res.json({ rules: store.listRules().map((r) => ({ ...r, channels: safeParse(r.channels), enabled: !!r.enabled })) }));
app.post('/api/alert-rules', (req, res) => { store.insertRule(req.body); res.json({ ok: true }); });
app.patch('/api/alert-rules/:id', (req, res) => { store.updateRule(Number(req.params.id), req.body); res.json({ ok: true }); });
app.delete('/api/alert-rules/:id', (req, res) => { store.deleteRule(Number(req.params.id)); res.json({ ok: true }); });

app.get('/api/integrations', (_req, res) => {
  const i = store.getIntegrations();
  res.json({ slack_webhook_url: i.slack_webhook_url, email_to: i.email_to, email_from: i.email_from, resend_configured: !!i.resend_api_key });
});
app.put('/api/integrations', (req, res) => {
  const cur = store.getIntegrations();
  store.setIntegrations({ ...cur, ...req.body, resend_api_key: req.body.resend_api_key ?? cur.resend_api_key });
  res.json({ ok: true });
});

app.post('/api/enroll', (req, res) => {
  const { name, type = 'office', region = '', lat = 0, lon = 0 } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + nanoid(4).toLowerCase();
  const token = 'flv_' + nanoid(20);
  store.insertSite({ id, name, type, region, lat, lon, token });
  res.json({ ok: true, site: { id, name, type }, token,
    docker: `docker run -d --restart=unless-stopped \\\n  -e DISH_ADDR=192.168.100.1:9200 \\\n  -e SITE_TOKEN=${token} \\\n  -e CLOUD_INGEST_URL=https://YOUR-CLOUD/ingest \\\n  fleetview-agent` });
});

app.get('/health', (_req, res) => res.json({ ok: true, sites: store.listSites().length, live: latest.size }));

// Receives a generated/keyed asset (data URL) from the browser and saves it to web/public/assets.
app.post('/save-asset', (req, res) => {
  try {
    const { name, dataUrl } = req.body || {};
    if (!name || !dataUrl) return res.status(400).json({ error: 'name and dataUrl required' });
    const safe = String(name).replace(/[^a-z0-9._-]/gi, '');
    const m = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(dataUrl);
    if (!m) return res.status(400).json({ error: 'bad dataUrl' });
    const dir = path.join(__dirname, '..', 'web', 'public', 'assets');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, safe), Buffer.from(m[2], 'base64'));
    res.json({ ok: true, saved: safe, bytes: Buffer.from(m[2], 'base64').length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// In production / single-service deploy, serve the built dashboard same-origin so
// /api and /ws resolve without a proxy. (Local `npm run dev` uses Vite instead.)
const DIST = path.join(__dirname, '..', 'web', 'dist');
if (fs.existsSync(path.join(DIST, 'index.html'))) {
  app.use(express.static(DIST, {
    setHeaders: (res, p) => {
      if (p.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
      else if (p.includes(path.sep + 'assets' + path.sep)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/ingest' || req.path === '/health') return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST, 'index.html'));
  });
  console.log('[server] serving dashboard from web/dist (same-origin)');
}

wss.on('connection', () => { /* client pulls /api/fleet on mount, then receives deltas */ });

// ---------------- timers ----------------
const engine = createAlertEngine({ store, latest, broadcast, notify });
setTimeout(() => engine.tick(), 8000);
setInterval(() => { try { engine.tick(); } catch (e) { console.error('[alerts]', e.message); } }, 20000);
setInterval(() => store.pruneSamples(Date.now() - 48 * 3600e3), 10 * 60e3);

server.listen(PORT, '0.0.0.0', () => console.log(`[server] FleetView cloud on :${PORT}  (ws: /ws)`));
