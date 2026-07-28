# Talking to a Starlink dish directly

Every Starlink user terminal runs a **gRPC server on your local network** at
`192.168.100.1:9200`. No account, no API key, no internet required — it answers
anything on the LAN. This is where FleetView's telemetry comes from, and it's
the part most people don't know exists.

This document is the practical knowledge needed to write your own client. It's
what we learned building the agent; it isn't official, and SpaceX can change any
of it without warning.

> **Unofficial.** The local API is reverse-engineered by the community. There's
> no documentation, no SLA, and no compatibility promise. Fields appear and
> disappear between firmware releases. Write defensively.

## The shape of it

There's essentially **one RPC**: `SpaceX.API.Device.Device/Handle`. Everything
is multiplexed through it using a `oneof` request and a `oneof` response:

```proto
service Device {
  rpc Handle(Request) returns (Response);
}

message Request {
  oneof request {
    GetStatusRequest         get_status                = 1;
    GetHistoryRequest        get_history               = 2;
    GetObstructionMapRequest dish_get_obstruction_map  = 3;
    ...
  }
}
```

So "get status" means calling `Handle({ get_status: {} })` and reading
`response.dish_get_status`. See [`proto/device.proto`](../proto/device.proto)
for the faithful subset FleetView uses.

The dish uses **gRPC server reflection**, so you can explore it live without any
`.proto` file at all:

```bash
grpcurl -plaintext 192.168.100.1:9200 describe SpaceX.API.Device.Device
grpcurl -plaintext -d '{"get_status":{}}' 192.168.100.1:9200 SpaceX.API.Device.Device/Handle
```

If reflection is disabled on your firmware, fall back to a bundled proto or a
compiled protoset.

## The three calls worth making

| Call | Gives you | Sensible poll rate |
| --- | --- | --- |
| `get_status` | live state, latency, throughput, obstruction %, alerts, pointing, uptime | 10 s |
| `get_history` | ring buffer of the last ~15 min at 1 Hz | 30 s |
| `dish_get_obstruction_map` | grid of sky quality around the dish | 5 min |

### `get_status`

The bread and butter. One snapshot of right now:

```js
const st = (await handle({ get_status: {} })).dish_get_status;
st.pop_ping_latency_ms      // latency to the PoP
st.pop_ping_drop_rate       // 0..1 packet loss
st.downlink_throughput_bps  // current, not a speed test
st.obstruction_stats.fraction_obstructed
st.state                    // CONNECTED | BOOTING | OBSTRUCTED | THERMAL_SHUTDOWN | ...
st.alerts                   // thermal_throttle, motors_stuck, roaming, ...
```

Two traps:

- **Throughput is instantaneous, not capacity.** An idle dish reports near zero.
  It is not a bandwidth test.
- **`alerts` is a bitfield on the wire.** Decoded clients see booleans; raw
  clients see an integer. Don't assume the field is even present — several were
  removed across firmwares.

### `get_history` — the ring buffer

This is the subtle one, and the reason naive clients double-count.

The dish keeps a **circular buffer of 1 Hz samples** (typically 900 = 15 min).
`current` is a counter that **increments forever** and never wraps back to
zero (it only resets on reboot). The newest sample lives at
`(current - 1) % len`.

So to poll without duplicates, remember the previous `current` and read only
what's new since:

```js
export function newHistorySamples(hist, lastCurrent) {
  const current = Number(hist.current);
  const lat = hist.pop_ping_latency_ms || [];
  const len = lat.length || 900;

  let count = lastCurrent == null ? 0 : current - lastCurrent;
  if (!isFinite(count) || count < 0) count = 0; // reboot or wrap -> skip this round
  count = Math.min(count, len);                 // polled too slowly; buffer lapped

  const samples = [];
  for (let k = 0; k < count; k++) {
    const idx = ((current - count + k) % len + len) % len;
    samples.push({ latency: lat[idx], drop: hist.pop_ping_drop_rate[idx] });
  }
  return { current, samples };
}
```

Three cases that will bite you:

1. **First poll** — you have no `lastCurrent`. Either take nothing, or backfill
   the whole buffer once so charts aren't empty. FleetView backfills ~15 min.
2. **Reboot** — `current` jumps *backwards*. A naive subtraction gives a negative
   count. Detect it and skip the round.
3. **Polling slower than the buffer** — if you poll every 20 min on a 15 min
   buffer you've already lost data; clamp `count` to `len` and accept the gap.

The full implementation is [`agent/starlink.js`](../agent/starlink.js).

### `dish_get_obstruction_map`

A row-major grid of floats representing the sky dome above the dish:
`0..1` = relative quality, `-1` = never observed. Render it as an image and you
get the picture of *what's blocking the view* — the tree, the mast, the roofline.
That's the "sky obstruction" view in the dashboard.

```js
const m = (await handle({ dish_get_obstruction_map: {} })).dish_get_obstruction_map;
// m.num_rows × m.num_cols, values in m.snr (flat array)
```

It changes slowly. Polling it every few minutes is plenty.

## Writing a client that survives firmware updates

The single most important lesson: **never assume a field exists.**

Fields FleetView has seen vanish or change across firmware include GPS/location
(LAN `get_location` was disabled around May 2026 — for vessel position you now
need an external GPS), several alert bits, and assorted throughput counters.
Numbers also arrive as strings for 64-bit types, because JSON.

So normalize everything through a tolerant reader:

```js
const num = (v, d = 0) => {
  const n = typeof v === 'string' ? Number(v) : v;   // uint64 arrives as string
  return typeof n === 'number' && isFinite(n) ? n : d;
};

// optional chaining everywhere, defaults for everything
ping_latency_ms: num(st.pop_ping_latency_ms),
uptime_s:        num(st.device_state?.uptime_s),
gps_sats:        num(st.gps_stats?.gps_sats),
alerts:          Object.keys(st.alerts || {}).filter(k => st.alerts[k] === true),
```

A missing field should degrade one metric, never crash the poll loop.

## Networking gotchas

- **Bypass mode.** If your dish is in bypass (third-party router), it usually
  won't route to `192.168.100.1` by default. Add a static route to
  `192.168.100.0/24` out of the WAN interface.
- **Multiple dishes on one LAN collide.** Every dish believes it is
  `192.168.100.1`. To monitor several from one machine, put each behind its own
  subnet / VLAN and NAT them to distinct addresses.
- **It's unauthenticated.** Anyone on that LAN can call it — including `reboot`.
  Treat the management network accordingly.
- **Use deadlines.** A dish mid-reboot will accept a TCP connection and then
  never answer. Every call in FleetView carries a 5 s deadline.

## Developing without a dish

You don't need hardware. FleetView ships a simulator that implements this exact
service — 40 dishes, real gRPC, on `127.0.0.1:9201-9240`:

```bash
npm run dev
```

You can point `grpcurl` straight at a simulated dish:

```bash
grpcurl -plaintext -d '{"get_status":{}}' 127.0.0.1:9201 SpaceX.API.Device.Device/Handle
```

…and inject faults to test your client's failure handling:

```bash
curl -X POST http://127.0.0.1:8799/scenario \
  -H 'content-type: application/json' \
  -d '{"id":"mv-pacific-voyager","mode":"obstructed"}'
# modes: normal | offline | obstructed | high_latency | degraded | thermal
```

The simulator models reboots (so `current` jumps backwards), thermal throttling,
progressive obstruction and total loss — all the cases above that are otherwise
very hard to reproduce on purpose.

## Prior art

The community figured most of this out. Worth reading:

- [`sparky8512/starlink-grpc-tools`](https://github.com/sparky8512/starlink-grpc-tools) — the reference Python toolkit
- [`clarkzjw/starlink-grpc-golang`](https://github.com/clarkzjw/starlink-grpc-golang) — Go client
- The `dish.proto` definitions circulating in those repos, extracted via reflection
