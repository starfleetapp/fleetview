// gRPC client wrapper for a Starlink dish (real or simulated) + defensive
// parsing. Field availability drifts across firmware, so every read tolerates
// missing/obsolete fields rather than assuming a fixed schema.
import { DeviceService, grpc } from '../shared/proto.js';

export function createDishClient(addr) {
  const client = new DeviceService(addr, grpc.credentials.createInsecure());
  const call = (req, timeoutMs = 5000) =>
    new Promise((resolve, reject) => {
      client.Handle(req, { deadline: new Date(Date.now() + timeoutMs) }, (err, res) =>
        err ? reject(err) : resolve(res),
      );
    });
  return {
    raw: client,
    async getStatus() { return (await call({ get_status: {} })).dish_get_status; },
    async getHistory() { return (await call({ get_history: {} })).dish_get_history; },
    async getObstructionMap() { return (await call({ dish_get_obstruction_map: {} })).dish_get_obstruction_map; },
    close() { client.close(); },
  };
}

const num = (v, d = 0) => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && isFinite(n) ? n : d;
};

// Map a raw get_status response to a flat, stable record.
export function normalizeStatus(st) {
  const obs = st.obstruction_stats || {};
  const a = st.alerts || {};
  return {
    reachable: true,
    state: st.state || 'UNKNOWN',
    device_id: st.device_info?.id || null,
    hardware_version: st.device_info?.hardware_version || null,
    software_version: st.device_info?.software_version || null,
    downlink_bps: num(st.downlink_throughput_bps),
    uplink_bps: num(st.uplink_throughput_bps),
    ping_latency_ms: num(st.pop_ping_latency_ms),
    ping_drop_rate: num(st.pop_ping_drop_rate),
    fraction_obstructed: num(obs.fraction_obstructed),
    currently_obstructed: !!obs.currently_obstructed,
    uptime_s: num(st.device_state?.uptime_s),
    snr_above_noise: !!st.is_snr_above_noise_floor,
    azimuth: num(st.direction_azimuth),
    elevation: num(st.direction_elevation),
    gps_sats: num(st.gps_stats?.gps_sats),
    alerts: Object.keys(a).filter((k) => a[k] === true),
  };
}

// Ring-buffer de-dup: given the previous `current` counter, return only the new
// 1 Hz samples written since last poll. This mirrors how you must read the real
// dish history (newest at (current-1) % len; counter never resets except reboot).
export function newHistorySamples(hist, lastCurrent) {
  const current = num(hist.current);
  const lat = hist.pop_ping_latency_ms || [];
  const len = lat.length || 900;
  let count = lastCurrent == null ? 0 : current - lastCurrent;
  if (!isFinite(count) || count < 0) count = 0; // reboot/wrap -> skip backfill this round
  count = Math.min(count, len);
  const samples = [];
  for (let k = 0; k < count; k++) {
    const idx = ((current - count + k) % len + len) % len;
    samples.push({
      latency: lat[idx],
      drop: (hist.pop_ping_drop_rate || [])[idx],
      down: (hist.downlink_throughput_bps || [])[idx],
      up: (hist.uplink_throughput_bps || [])[idx],
    });
  }
  return { current, samples };
}

export function p95(values) {
  const v = values.filter((x) => typeof x === 'number' && x > 0).sort((a, b) => a - b);
  if (!v.length) return null;
  return Math.round(v[Math.min(v.length - 1, Math.floor(v.length * 0.95))] * 10) / 10;
}
