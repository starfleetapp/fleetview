// FleetView ingest — Supabase Edge Function (Deno).
// Token-verified telemetry ingest, mirroring server.js POST /ingest.
// Deploy:  supabase functions deploy ingest --no-verify-jwt
// Point the agent at:  https://<project-ref>.supabase.co/functions/v1/ingest
import { createClient } from 'jsr:@supabase/supabase-js@2';

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service role -> bypasses RLS for writes
);

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const body = await req.json().catch(() => ({}));
  const records = body.records ?? [];
  const headerToken = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');

  const siteByToken = new Map<string, { id: string; org_id: string } | null>();
  const samples: any[] = [];
  const maps: any[] = [];
  const dishes: any[] = [];

  for (const r of records) {
    const token = r.token || headerToken;
    if (!token) continue;
    if (!siteByToken.has(token)) {
      const hash = await sha256(token);
      const { data } = await sb.from('sites').select('id, org_id').eq('enroll_token_hash', hash).maybeSingle();
      siteByToken.set(token, data ?? null);
    }
    const site = siteByToken.get(token);
    if (!site) continue;
    const ts = r.ts ?? new Date().toISOString();

    if (r.type === 'obstruction') {
      maps.push({ site_id: site.id, org_id: site.org_id, ts, num_rows: r.num_rows, num_cols: r.num_cols, snr: r.snr });
    } else {
      samples.push({
        site_id: site.id, org_id: site.org_id, ts, state: r.state, reachable: r.reachable !== false,
        downlink_bps: r.downlink_bps, uplink_bps: r.uplink_bps, ping_latency_ms: r.ping_latency_ms,
        ping_drop_rate: r.ping_drop_rate, latency_p95_ms: r.latency_p95_ms, fraction_obstructed: r.fraction_obstructed,
        currently_obstructed: r.currently_obstructed, uptime_s: r.uptime_s, snr_above_noise: r.snr_above_noise,
        azimuth: r.azimuth, elevation: r.elevation, gps_sats: r.gps_sats, alerts: r.alerts ?? [],
      });
      if (r.device_id) {
        dishes.push({ id: r.device_id, site_id: site.id, org_id: site.org_id,
          hardware_version: r.hardware_version, software_version: r.software_version, last_seen: ts });
      }
    }
  }

  // Batched writes (one round-trip each).
  if (samples.length) await sb.from('telemetry_samples').insert(samples);
  if (maps.length) await sb.from('obstruction_maps').upsert(maps, { onConflict: 'site_id' });
  if (dishes.length) await sb.from('dishes').upsert(dishes, { onConflict: 'id' });

  return new Response(JSON.stringify({ ok: true, accepted: samples.length + maps.length }), {
    headers: { 'content-type': 'application/json' },
  });
});
