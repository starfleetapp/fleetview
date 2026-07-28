// Quick manual smoke test of the simulator: control plane + 3 gRPC calls.
// Run the simulator first, then: node simulator/smoke.js
import { fleet } from '../shared/fleet.js';
import { DeviceService, grpc } from '../shared/proto.js';

const port = fleet[0].grpcPort;
const client = new DeviceService(`127.0.0.1:${port}`, grpc.credentials.createInsecure());
const call = (req) => new Promise((res, rej) => client.Handle(req, (e, r) => (e ? rej(e) : res(r))));

const list = await fetch('http://127.0.0.1:8799/fleet').then((r) => r.json());
console.log('control /fleet ->', list.length, 'sites; first:', list[0]);

const st = (await call({ get_status: {} })).dish_get_status;
console.log('get_status ->', st.state,
  '| lat', st.pop_ping_latency_ms.toFixed(1), 'ms',
  '| down', (st.downlink_throughput_bps / 1e6).toFixed(1), 'Mbps',
  '| drop', (st.pop_ping_drop_rate * 100).toFixed(2) + '%',
  '| uptime', st.device_state.uptime_s + 's',
  '| sw', st.device_info.software_version);

const h = (await call({ get_history: {} })).dish_get_history;
console.log('get_history -> current', h.current, '| arrays len', h.pop_ping_latency_ms.length);

const m = (await call({ dish_get_obstruction_map: {} })).dish_get_obstruction_map;
console.log('obstruction_map ->', m.num_rows + 'x' + m.num_cols, '| cells', m.snr.length);

// also probe an obstructed site
const obPort = fleet.find((s) => s.id === 'oyu-tolgoi').grpcPort;
const obClient = new DeviceService(`127.0.0.1:${obPort}`, grpc.credentials.createInsecure());
const obSt = await new Promise((res, rej) => obClient.Handle({ get_status: {} }, (e, r) => (e ? rej(e) : res(r))));
console.log('obstructed site oyu-tolgoi ->', obSt.dish_get_status.state,
  '| obstructed', obSt.dish_get_status.obstruction_stats.currently_obstructed);

console.log('SMOKE OK');
process.exit(0);
