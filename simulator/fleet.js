// Spins up the whole simulated fleet: one gRPC dish server per site (ports
// 9201..) plus an HTTP control plane (:8799) for live scenario injection.
import express from 'express';
import cors from 'cors';
import { fleet } from '../shared/fleet.js';
import { createDish, DeviceService } from './dish.js';
import { grpc } from '../shared/proto.js';
import { INITIAL_SCENARIOS, MODES } from './scenarios.js';

const CONTROL_PORT = 8799;
const dishes = new Map(); // site.id -> dish controller

async function bindDish(dishCtl, port) {
  const server = new grpc.Server();
  server.addService(DeviceService.service, dishCtl.impl);
  await new Promise((resolve, reject) => {
    server.bindAsync(`127.0.0.1:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
  dishCtl.start();
  return server;
}

async function main() {
  let ok = 0;
  for (const site of fleet) {
    const dishCtl = createDish(site);
    if (INITIAL_SCENARIOS[site.id]) dishCtl.setMode(INITIAL_SCENARIOS[site.id]);
    try {
      await bindDish(dishCtl, site.grpcPort);
      dishes.set(site.id, dishCtl);
      ok++;
    } catch (e) {
      console.error(`[sim] failed to bind ${site.id} on ${site.grpcPort}:`, e.message);
    }
  }
  console.log(`[sim] ${ok}/${fleet.length} dishes live on 127.0.0.1:9201-${9200 + fleet.length}`);
  console.log('[sim] active scenarios:', INITIAL_SCENARIOS);

  // --- Control plane ---
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/fleet', (_req, res) => {
    res.json(fleet.map((s) => ({
      id: s.id, name: s.name, type: s.type, region: s.region,
      port: s.grpcPort, mode: dishes.get(s.id)?.getMode() ?? 'normal',
    })));
  });

  app.post('/scenario', (req, res) => {
    const { id, mode } = req.body || {};
    if (!dishes.has(id)) return res.status(404).json({ error: 'unknown site' });
    if (!MODES.includes(mode)) return res.status(400).json({ error: `mode must be one of ${MODES.join(', ')}` });
    dishes.get(id).setMode(mode);
    res.json({ ok: true, id, mode });
  });

  app.post('/scenario/reset', (_req, res) => {
    for (const d of dishes.values()) d.setMode('normal');
    res.json({ ok: true, reset: dishes.size });
  });

  app.get('/', (_req, res) => res.type('text').send('FleetView dish simulator — see GET /fleet'));

  app.listen(CONTROL_PORT, '127.0.0.1', () => {
    console.log(`[sim] control plane on http://127.0.0.1:${CONTROL_PORT} (GET /fleet, POST /scenario {id,mode})`);
  });
}

main().catch((e) => { console.error('[sim] fatal:', e); process.exit(1); });
