// A single simulated Starlink dish: realistic telemetry + a gRPC service impl
// matching SpaceX.API.Device.Device. One of these runs per site in the fleet.
import { DeviceService, grpc } from '../shared/proto.js';

const RING = 900; // 15 min of 1 Hz samples, like the real history buffer

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const noise = (amp) => (Math.random() * 2 - 1) * amp;

// Rough local hour from longitude, for a believable diurnal usage curve.
function localHour(lon) {
  const d = new Date();
  const h = d.getUTCHours() + d.getUTCMinutes() / 60;
  return (((h + lon / 15) % 24) + 24) % 24;
}

export function createDish(site) {
  const dish = {
    site,
    mode: 'normal', // normal | offline | obstructed | high_latency | degraded | thermal
    startedAt: Date.now() - Math.floor(Math.random() * 86400) * 1000,
    bootingUntil: 0,
    az: 120 + ((site.index * 37) % 230),
    el: 40 + ((site.index * 13) % 25),
    fracObstructedEma: 0.002 + (site.index % 5) * 0.001,
    hist: {
      current: 0,
      drop: new Array(RING).fill(0),
      lat: new Array(RING).fill(0),
      down: new Array(RING).fill(0),
      up: new Array(RING).fill(0),
    },
    last: null,
  };

  const baseLatency = () => {
    const b = site.type === 'vessel' ? 46 : site.type === 'office' ? 38 : 32;
    return b + (site.index % 7);
  };

  function genSample() {
    const now = Date.now();
    const booting = now < dish.bootingUntil;
    let state = 'CONNECTED';
    let lat = baseLatency() + noise(6) + 8 * Math.sin(now / 60000 + site.index);
    let drop = clamp(0.004 + noise(0.004), 0, 1);
    const hr = localHour(site.lon);
    const day = 0.45 + 0.55 * (Math.sin(((hr - 6) / 24) * Math.PI * 2) * 0.5 + 0.5);
    let down = (60 + 120 * day) * 1e6 + noise(15e6);
    let up = (8 + 12 * day) * 1e6 + noise(2e6);
    let currentlyObstructed = Math.random() < 0.01;
    let snrOk = true;
    const alerts = {};

    if (booting) {
      state = 'BOOTING'; lat = 0; drop = 1; down = 0; up = 0; snrOk = false;
    } else {
      switch (dish.mode) {
        case 'obstructed':
          state = 'OBSTRUCTED'; currentlyObstructed = true;
          drop = clamp(0.18 + noise(0.08), 0, 1);
          lat += 60 + noise(40); down *= 0.4; up *= 0.4; snrOk = Math.random() > 0.4;
          break;
        case 'high_latency':
          lat = 230 + noise(70); drop = clamp(0.03 + noise(0.02), 0, 1);
          break;
        case 'degraded':
          drop = clamp(0.14 + noise(0.025), 0, 1); lat += 25; down *= 0.55; up *= 0.6;
          break;
        case 'thermal':
          alerts.thermal_throttle = true; down *= 0.5; up *= 0.6; lat += 15;
          break;
      }
    }
    return {
      state,
      lat: Math.max(0, lat),
      drop,
      down: Math.max(0, down),
      up: Math.max(0, up),
      currentlyObstructed,
      snrOk,
      alerts,
    };
  }

  function tick() {
    const s = genSample();
    const i = dish.hist.current % RING;
    dish.hist.drop[i] = s.drop;
    dish.hist.lat[i] = s.state === 'BOOTING' ? 0 : s.lat;
    dish.hist.down[i] = s.down;
    dish.hist.up[i] = s.up;
    dish.hist.current++;
    dish.fracObstructedEma = clamp(
      dish.fracObstructedEma * 0.98 + (s.currentlyObstructed ? 0.02 : 0),
      0, 1,
    );
    dish.last = s;
  }

  const deviceInfo = () => ({
    id: site.deviceId,
    hardware_version: site.hardware_version,
    software_version: site.software_version,
    country_code: 'US',
    utc_offset_s: 0,
  });

  function buildStatus() {
    const s = dish.last || genSample();
    const uptimeS = Math.max(0, Math.floor((Date.now() - dish.startedAt) / 1000));
    return {
      device_info: deviceInfo(),
      device_state: { uptime_s: String(uptimeS) },
      obstruction_stats: {
        fraction_obstructed: dish.fracObstructedEma,
        currently_obstructed: s.currentlyObstructed,
        avg_prolonged_obstruction_duration_s: dish.mode === 'obstructed' ? 7.5 : 0,
        avg_prolonged_obstruction_interval_s: dish.mode === 'obstructed' ? 45 : 3600,
      },
      alerts: {
        motors_stuck: false,
        thermal_throttle: !!s.alerts.thermal_throttle,
        thermal_shutdown: false,
        mast_not_near_vertical: false,
        unexpected_location: false,
        slow_ethernet_speeds: false,
        roaming: site.type === 'vessel',
        install_pending: false,
        is_heating: false,
        dish_water_detected: false,
      },
      downlink_throughput_bps: s.down,
      uplink_throughput_bps: s.up,
      pop_ping_drop_rate: s.drop,
      pop_ping_latency_ms: s.lat,
      seconds_to_first_nonempty_slot: 0,
      is_snr_above_noise_floor: s.snrOk,
      gps_stats: { gps_valid: true, gps_sats: 12 + (site.index % 4) },
      direction_azimuth: dish.az,
      direction_elevation: dish.el,
      state: s.state,
    };
  }

  // Return the RAW ring buffer + counter; the agent does proper de-dup/indexing.
  function buildHistory() {
    return {
      current: String(dish.hist.current),
      pop_ping_drop_rate: dish.hist.drop.slice(),
      pop_ping_latency_ms: dish.hist.lat.slice(),
      downlink_throughput_bps: dish.hist.down.slice(),
      uplink_throughput_bps: dish.hist.up.slice(),
    };
  }

  function buildObstructionMap() {
    const N = 64;
    const snr = new Array(N * N);
    const c0 = (N - 1) / 2;
    const R = N / 2 - 1;
    const obstructed = dish.mode === 'obstructed';
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const dx = c - c0, dy = r - c0;
        const dist = Math.hypot(dx, dy);
        if (dist > R) { snr[r * N + c] = -1; continue; }
        let v = 0.85 + noise(0.08);
        const ang = Math.atan2(dy, dx);
        if (obstructed && ang > -2.5 && ang < -0.6 && dist > R * 0.4) v = 0.02;
        snr[r * N + c] = clamp(v, 0, 1);
      }
    }
    return { num_rows: N, num_cols: N, snr };
  }

  function Handle(call, callback) {
    if (dish.mode === 'offline') {
      return callback({ code: grpc.status.UNAVAILABLE, message: 'dish unreachable' });
    }
    const which = call.request.request; // active oneof field name
    switch (which) {
      case 'get_status': return callback(null, { dish_get_status: buildStatus() });
      case 'get_history': return callback(null, { dish_get_history: buildHistory() });
      case 'dish_get_obstruction_map': return callback(null, { dish_get_obstruction_map: buildObstructionMap() });
      case 'get_device_info': return callback(null, { device_info: deviceInfo() });
      case 'reboot':
        dish.bootingUntil = Date.now() + 8000;
        dish.startedAt = Date.now() + 8000;
        dish.hist.current = 0;
        for (const k of ['drop', 'lat', 'down', 'up']) dish.hist[k].fill(0);
        return callback(null, { reboot: {} });
      default:
        return callback(null, {});
    }
  }

  return {
    site,
    impl: { Handle },
    start() { tick(); return setInterval(tick, 1000); },
    setMode(m) { dish.mode = m; },
    getMode() { return dish.mode; },
  };
}

export { DeviceService };
