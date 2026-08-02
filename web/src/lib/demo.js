/**
 * Static demo mode.
 *
 * The dashboard normally talks to the FleetView backend over `/api/*` and a
 * `/ws` socket. On a static host (Netlify drop, GitHub Pages, S3) neither
 * exists, so this module stands in for both: it loads a snapshot of real API
 * responses captured from a running fleet, then keeps the numbers moving with
 * a random walk so the dashboard behaves like a live one.
 *
 * It installs itself only when there is genuinely no backend — see
 * `maybeInstallDemo()`. A build served by the real server is untouched.
 */

// BASE_URL is '/' normally, '/fleetview/' on GitHub Pages.
const FIXTURES = `${import.meta.env.BASE_URL}demo/fixtures.json`;
const TICK_MS = 2000;

let data = null;
const listeners = new Set();

/* ---------- deterministic per-site randomness ---------- */
function seedFrom(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let s = seed || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* ---------- live random walk over the captured snapshot ---------- */
function walk(site) {
  // A dish that was offline in the snapshot stays offline — the alert list
  // and the map colours should agree with each other.
  if (site.status === 'offline' || site.reachable === false) return site;

  const r = Math.random;
  const lat = clamp((site.ping_latency_ms ?? 30) + (r() - 0.5) * 4, 14, 120);
  const drop = clamp((site.ping_drop_rate ?? 0.01) + (r() - 0.5) * 0.006, 0, 0.4);
  const down = clamp((site.downlink_bps ?? 1.4e8) * (1 + (r() - 0.5) * 0.10), 5e6, 4e8);
  const up = clamp((site.uplink_bps ?? 1.6e7) * (1 + (r() - 0.5) * 0.12), 1e6, 5e7);
  const obs = clamp((site.fraction_obstructed ?? 0.02) + (r() - 0.5) * 0.002, 0, 1);

  return {
    ...site,
    ping_latency_ms: lat,
    latency_p95_ms: Math.round((lat * 1.06 + 1) * 10) / 10,
    ping_drop_rate: drop,
    downlink_bps: Math.round(down),
    uplink_bps: Math.round(up),
    fraction_obstructed: obs,
  };
}

function tick() {
  const sites = data.fleet.sites;
  // Move a handful of dishes each tick rather than all 40 — the real feed
  // arrives per-dish, and staggering it keeps the table from strobing.
  for (let n = 0; n < 6; n++) {
    const i = Math.floor(Math.random() * sites.length);
    const next = walk(sites[i]);
    sites[i] = next;
    if (data.sites[next.id]) data.sites[next.id].status = { ...data.sites[next.id].status, ...next };
    for (const fn of listeners) fn({ type: 'status', site: next });
  }
}

/* ---------- history backfill ---------- */
const RANGE_MS = { '1h': 36e5, '6h': 216e5, '24h': 864e5, '7d': 6048e5 };

function buildHistory(id, range) {
  const site = data.fleet.sites.find((s) => s.id === id);
  const span = RANGE_MS[range] || RANGE_MS['1h'];
  const now = Date.now();
  const count = 180;
  const step = span / count;
  const rand = rng(seedFrom(id));
  const points = [];

  const baseLat = site?.ping_latency_ms ?? 32;
  const baseDown = site?.downlink_bps ?? 1.4e8;
  const baseUp = site?.uplink_bps ?? 1.6e7;
  const offline = site?.status === 'offline';

  // Give each dish one or two brief obstruction dips so the charts have shape.
  const dipAt = Math.floor(rand() * count * 0.7) + 10;
  const dipLen = 6 + Math.floor(rand() * 10);

  let lat = baseLat;
  for (let i = 0; i < count; i++) {
    const ts = now - span + i * step;
    const inDip = i >= dipAt && i < dipAt + dipLen;
    // An offline dish goes dark for the tail of the window.
    const dark = offline && i > count * 0.82;

    lat = clamp(lat + (rand() - 0.5) * 3 + (inDip ? 6 : 0) + (lat - baseLat) * -0.2, 15, 140);
    const f = inDip ? 0.45 : 1;

    points.push({
      ts: Math.round(ts),
      latency: dark ? null : Math.round(lat * 10) / 10,
      p95: dark ? null : Math.round(lat * 1.08 * 10) / 10,
      drop: dark ? null : Math.round((inDip ? 0.05 + rand() * 0.08 : rand() * 0.01) * 1e4) / 1e4,
      down: dark ? null : Math.round(baseDown * f * (0.85 + rand() * 0.3)),
      up: dark ? null : Math.round(baseUp * f * (0.85 + rand() * 0.3)),
      obstructed: inDip,
      reachable: !dark,
    });
  }
  return { points, range: range || '1h' };
}

/* ---------- freshen the snapshot ---------- */

// Mirrors classify() in server/server.js. The server marks a dish offline once
// its last sample is over 3 minutes old, so a frozen snapshot would show an
// entirely dead fleet no matter how healthy it was when captured. We restamp
// every reading to "just now" and re-derive status from the actual numbers.
const SERIOUS = new Set(['thermal_shutdown', 'no_downlink', 'dish_thermal_throttle']);

function classify(s) {
  if (!s) return 'offline';
  if (s.reachable === 0 || s.reachable === false || s.state === 'OFFLINE') return 'offline';
  const lat = s.latency_p95_ms ?? s.ping_latency_ms;
  const serious = Array.isArray(s.alerts) && s.alerts.some((a) => SERIOUS.has(a));
  if (s.fraction_obstructed > 0.03 || s.ping_drop_rate > 0.05 || lat > 120 || serious) return 'degraded';
  return 'online';
}

function normalise() {
  const now = Date.now();

  for (const site of data.fleet.sites) {
    site.last_seen = now - Math.floor(Math.random() * 15000);
    site.status = classify(site);
    const detail = data.sites[site.id];
    if (detail?.status) {
      detail.status = { ...detail.status, last_seen: site.last_seen, status: site.status };
    }
    const obs = data.obstruction[site.id];
    if (obs && obs.ts) obs.ts = now - Math.floor(Math.random() * 6e5);

    // Per-site event log: rebase to the last few hours, newest first, so the
    // site-detail log reads as recent activity rather than capture-day history.
    const evs = detail?.events;
    if (Array.isArray(evs)) {
      evs.forEach((e, i) => {
        e.started_at = now - (i + 1) * (37 * 60000) - Math.floor(Math.random() * 6e5);
        if (!e.active) e.ended_at = e.started_at + 8 * 60000;
      });
    }
  }

  // The captured alert list was inflated by stale-looking dishes. Keep only
  // alerts that are consistent with each dish's CURRENT state — a degraded
  // site must not carry a "site_down / is offline" alert while the fleet
  // table shows it as degraded. Then spread them over the last few hours.
  const statusById = new Map(data.fleet.sites.map((s) => [s.id, s.status]));
  const COMPATIBLE = {
    offline: new Set(['site_down']),
    degraded: new Set(['high_latency', 'high_drop', 'obstruction']),
  };
  const kept = data.alerts.alerts.filter((a) => {
    const st = statusById.get(a.site_id);
    return st && st !== 'online' && COMPATIBLE[st]?.has(a.type);
  }).slice(0, 12);
  kept.forEach((a, i) => {
    a.fired_at = now - (i + 1) * (12 * 60000) - Math.floor(Math.random() * 3e5);
    if (a.resolved_at) a.resolved_at = a.fired_at + 6 * 60000;
  });
  data.alerts.alerts = kept;
  data.fleet.summary = {
    ...data.fleet.summary,
    active_alerts: kept.filter((a) => !a.resolved_at).length,
  };
}

/* ---------- fake REST ---------- */
function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function route(pathname, search, method, body) {
  if (pathname === '/api/fleet') {
    const active = data.alerts.alerts.filter((a) => !a.resolved_at).length;
    return { ...data.fleet, summary: { ...data.fleet.summary, active_alerts: active } };
  }
  if (pathname === '/api/alerts') return data.alerts;
  if (pathname === '/api/alert-rules') return data.alertRules;
  if (pathname === '/api/integrations') {
    if (method === 'POST') return { ok: true, demo: true };
    return data.integrations;
  }
  if (pathname === '/api/enroll') {
    return { ok: true, demo: true, token: 'demo-token-not-a-real-credential' };
  }

  const m = pathname.match(/^\/api\/sites\/([^/]+)(\/history|\/obstruction)?$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    if (m[2] === '/history') return buildHistory(id, new URLSearchParams(search).get('range') || '1h');
    if (m[2] === '/obstruction') return data.obstruction[id] || { available: false };
    return data.sites[id] || { error: 'not found' };
  }
  return null;
}

/* ---------- fake WebSocket ---------- */
class DemoSocket {
  constructor() {
    this.readyState = 0;
    setTimeout(() => {
      this.readyState = 1;
      this.onopen && this.onopen();
      this._fn = (msg) => this.onmessage && this.onmessage({ data: JSON.stringify(msg) });
      listeners.add(this._fn);
    }, 60);
  }
  send() {}
  close() {
    this.readyState = 3;
    if (this._fn) listeners.delete(this._fn);
    this.onclose && this.onclose();
  }
}

/* The floating "DEMO — simulated fleet" badge was removed at the owner's
   request. The demo is still disclosed in prose where a visitor reads about
   it: the landing-page FAQ ("Is this real data?") and the Pricing FAQ both
   state that the public demo runs a built-in fleet simulator. Keep those. */

function install() {
  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.origin);
    if (url.pathname.startsWith('/api/')) {
      const body = init.body ? JSON.parse(init.body) : null;
      const out = route(url.pathname, url.search, (init.method || 'GET').toUpperCase(), body);
      if (out !== null) return Promise.resolve(jsonResponse(out));
      return Promise.resolve(new Response('{"error":"not found"}', { status: 404 }));
    }
    return realFetch(input, init);
  };
  window.WebSocket = DemoSocket;
  setInterval(tick, TICK_MS);
}

/**
 * Enables demo mode when no backend answers.
 *
 * The content-type check matters: static hosts rewrite unknown paths to
 * index.html for SPA routing, so `/api/fleet` returns HTTP 200 with HTML.
 * Only a genuine JSON reply counts as a live backend.
 */
export async function maybeInstallDemo() {
  // `npm run build:demo` compiles this in, so a static build never probes for a
  // backend it knows isn't there — that probe would log a 404 on every load.
  const forced = import.meta.env.VITE_DEMO === '1';

  if (!forced) {
    try {
      const r = await fetch('/api/fleet', { headers: { accept: 'application/json' } });
      if (r.ok && (r.headers.get('content-type') || '').includes('application/json')) return false;
    } catch { /* no backend — fall through */ }
  }

  const r = await fetch(FIXTURES);
  if (!r.ok) throw new Error(`demo fixtures missing (${r.status})`);
  data = await r.json();
  normalise();
  install();
  return true;
}
