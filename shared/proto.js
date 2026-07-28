// Loads the shared Starlink device.proto and exposes the gRPC service handle.
// Used by both the simulator (server) and the edge agent (client).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROTO_PATH = path.join(__dirname, '..', 'proto', 'device.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, // keep snake_case field names (get_status, pop_ping_latency_ms)
  longs: String,
  enums: String, // return enum values as their string names (e.g. 'CONNECTED')
  defaults: true,
  oneofs: true, // expose the active oneof field name on a virtual property
});

const loaded = grpc.loadPackageDefinition(packageDef);

// package SpaceX.API.Device  ->  loaded.SpaceX.API.Device.Device
export const DeviceService = loaded.SpaceX.API.Device.Device;
export { grpc };
