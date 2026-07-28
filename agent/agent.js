// FleetView edge agent.
//   Production: one container per site, pointed at the dish (192.168.100.1:9200)
//              with a single SITE_TOKEN, shipping to your cloud.
//   Demo:      no env set -> "fleet mode": one process emulates an agent for all
//              40 simulated sites so the whole dashboard lights up from one box.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fleet } from '../shared/fleet.js';
import { createDishClient, normalizeStatus, newHistorySamples, p95 } from './starlink.js';
import { createBuffer } from './buffer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLOUD = process.env.CLOUD_INGEST_URL || `http://127.0.0.1:${process.env.PORT || 8787}/ingest`;
const POLL_STATUS = Number(process.env.POLL_STATUS_MS || 10000);
const POLL_HISTORY = Number(process.env.POLL_HISTORY_MS || 30000);
const POLL_OBSTRUCTION = Number(process.env.POLL_OBSTRUCTION_MS || 300000);
const SHIP_MS = Number(process.env.SHIP_MS || 3000);
const MAX_BUFFER = Number(process.env.MAX_BUFFER || 50000);

const buffer = createBuffer(path.join(__dirname, 'buffer.db'));

// Single real dish vs. full simulated fleet.
const single = process.env.DISH_ADDR && process.env.SITE_TOKEN;
const sites = single
  ? [{ id: 'real-dish', name: 'Real Dish', addr: process.env.DISH_ADDR, token: process.env.SITE_TOKEN }]
  : fleet.map((s) => ({ id: s.id, name: s.name, addr: `127.0.0.1:${s.grpcPort}`, token: s.token }));

const monitors = sites.map((s) => ({ ...s, client: createDishClient(s.addr), lastCurrent: null, lastP95: null }));

const enqueue = (obj) => { buffer.enqueue(obj); };

async function pollStatus(m) {
  try {
    const n = normalizeStatus(await m.client.getStatus());
    enqueue({ token: m.token, type: 'sample', ts: new Date().toISOString(), ...n, latency_p95_ms: m.lastP95 });
  } catch {
    // RPC failed -> dish is unreachable (rebooting / unplugged / obstructed hard).
    // Emit an explicit OFFLINE sample so the cloud knows the dish — not just the
    // agent — is down.
    enqueue({
      token: m.token, type: 'sample', ts: new Date().toISOString(),
      reachable: false, state: 'OFFLINE',
      downlink_bps: 0, uplink_bps: 0, ping_latency_ms: 0, ping_drop_rate: 1,
      fraction_obstructed: 0, currently_obstructed: false, uptime_s: 0,
      snr_above_noise: false, azimuth: 0, elevation: 0, gps_sats: 0, alerts: [],
      latency_p95_ms: null,
    });
  }
}

async function pollHistory(m) {
  try {
    const { current, samples } = newHistorySamples(await m.client.getHistory(), m.lastCurrent);
    m.lastCurrent = current;
    if (samples.length) m.lastP95 = p95(samples.map((x) => x.latency));
  } catch { /* reachability handled by status poll */ }
}

async function pollObstruction(m) {
  try {
    const map = await m.client.getObstructionMap();
    enqueue({
      token: m.token, type: 'obstruction', ts: new Date().toISOString(),
      num_rows: map.num_rows, num_cols: map.num_cols,
      snr: (map.snr || []).map((v) => Math.round(v * 100) / 100),
    });
  } catch { /* ignore */ }
}

// One-time: turn the dish's 1 Hz ring buffer into ~15 min of 20s-spaced samples
// so charts are populated immediately instead of filling from empty.
async function backfillHistory(m) {
  try {
    const h = await m.client.getHistory();
    const current = Number(h.current);
    const lat = h.pop_ping_latency_ms || [];
    const len = lat.length || 900;
    const n = Math.min(current, len);
    const STEP = 20;
    const idxs = [];
    for (let k = n - 1; k >= 0; k -= STEP) idxs.push(((current - n + k) % len + len) % len);
    idxs.reverse();
    const now = Date.now();
    idxs.forEach((idx, j) => {
      enqueue({
        token: m.token, type: 'sample', backfill: true,
        ts: new Date(now - (idxs.length - 1 - j) * STEP * 1000).toISOString(),
        reachable: true, state: 'CONNECTED',
        downlink_bps: (h.downlink_throughput_bps || [])[idx] || 0,
        uplink_bps: (h.uplink_throughput_bps || [])[idx] || 0,
        ping_latency_ms: lat[idx] || 0, ping_drop_rate: (h.pop_ping_drop_rate || [])[idx] || 0,
        fraction_obstructed: 0, currently_obstructed: false, uptime_s: 0,
        snr_above_noise: true, azimuth: 0, elevation: 0, gps_sats: 0, alerts: [], latency_p95_ms: null,
      });
    });
    m.lastCurrent = current;
  } catch { /* ignore */ }
}

let shipped = 0;
async function shipLoop() {
  try {
    const batch = buffer.batch(500);
    if (batch.length) {
      const res = await fetch(CLOUD, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ records: batch.map((b) => b.obj) }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        buffer.ackThrough(batch[batch.length - 1].id);
        shipped += batch.length;
      }
    }
  } catch { /* cloud unreachable -> keep buffered, retry */ }
  buffer.capAt(MAX_BUFFER);
  setTimeout(shipLoop, SHIP_MS);
}

function start() {
  console.log(`[agent] ${single ? 'single-dish' : 'fleet'} mode — ${monitors.length} site(s) -> ${CLOUD}`);
  monitors.forEach((m, i) => {
    const j = (i % 10) * 150;
    setTimeout(() => backfillHistory(m), 300 + j);
    setTimeout(() => { pollStatus(m); setInterval(() => pollStatus(m), POLL_STATUS); }, 500 + j);
    setTimeout(() => { pollHistory(m); setInterval(() => pollHistory(m), POLL_HISTORY); }, 800 + j);
    setTimeout(() => { pollObstruction(m); setInterval(() => pollObstruction(m), POLL_OBSTRUCTION); }, 1200 + i * 120);
  });
  setTimeout(shipLoop, 1500);
  setInterval(() => console.log(`[agent] shipped ${shipped} | buffer ${buffer.count()}`), 15000);
}

start();
