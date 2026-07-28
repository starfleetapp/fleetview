// Alert engine. Runs on a timer: for each site, evaluate the enabled rules
// against the latest telemetry, then fire newly-true alerts (open an event +
// notify) and resolve alerts whose condition has cleared. At most one active
// alert per (site, type).
//
// site_down is debounced: a brief blip (dish reboot, momentary RPC failure, a
// server/sim restart) must NOT page the fleet. The site must stay offline for
// GRACE_MS, or send no telemetry at all for STALE_MS, before it fires.
const GRACE_MS = 45000;
const STALE_MS = 180000;

export function createAlertEngine({ store, latest, broadcast, notify }) {
  const downSince = new Map(); // site_id -> ms when it first looked down

  function desired(site, s, rules, down) {
    const out = [];
    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (rule.site_id && rule.site_id !== site.id) continue;
      const channels = JSON.parse(rule.channels || '[]');
      const base = { ruleId: rule.id, channels };
      if (rule.type === 'site_down') {
        if (down.confirmed) out.push({ ...base, type: 'site_down', severity: 'critical', event: true,
          message: `${site.name} is offline${down.stale && !down.now ? ' — no telemetry received' : ''}.` });
      } else if (s && s.reachable === 1) {
        if (rule.type === 'high_latency') {
          const lat = s.latency_p95_ms ?? s.ping_latency_ms;
          if (lat > rule.threshold) out.push({ ...base, type: 'high_latency', severity: 'warning',
            message: `${site.name} latency ${Math.round(lat)} ms (> ${rule.threshold} ms).` });
        } else if (rule.type === 'high_drop') {
          if (s.ping_drop_rate > rule.threshold) out.push({ ...base, type: 'high_drop', severity: 'warning',
            message: `${site.name} packet loss ${(s.ping_drop_rate * 100).toFixed(1)}% (> ${(rule.threshold * 100).toFixed(0)}%).` });
        } else if (rule.type === 'obstruction') {
          if (s.fraction_obstructed > rule.threshold) out.push({ ...base, type: 'obstruction', severity: 'warning',
            event: true, message: `${site.name} sky obstruction ${(s.fraction_obstructed * 100).toFixed(1)}%.` });
        }
      }
    }
    return out;
  }

  function tick() {
    const sites = store.listSites();
    const rules = store.listRules();
    const now = Date.now();
    for (const site of sites) {
      const s = latest.get(site.id) || null;

      // --- site_down debounce ---
      const stale = !s || now - s.ts > STALE_MS;
      const offlineNow = s ? (s.reachable === 0 || s.state === 'OFFLINE') : true;
      if (offlineNow || stale) {
        if (!downSince.has(site.id)) downSince.set(site.id, now);
      } else {
        downSince.delete(site.id);
      }
      const confirmed = downSince.has(site.id) && (stale || now - downSince.get(site.id) >= GRACE_MS);
      const down = { confirmed, stale, now: offlineNow };

      const want = desired(site, s, rules, down);
      const wantTypes = new Set(want.map((d) => d.type));

      for (const d of want) {
        if (store.activeAlert(site.id, d.type)) continue;
        store.fireAlert(d.ruleId, site.id, d.type, d.severity, d.message, now);
        if (d.event && !store.activeEvent(site.id, d.type)) store.openEvent(site.id, d.type, d.severity, d.message, now);
        notify.deliver(d.channels, { subject: `FleetView · ${label(d.type)}`, text: d.message, severity: d.severity });
        broadcast({ type: 'alert', action: 'fired', site_id: site.id,
          alert: { type: d.type, severity: d.severity, message: d.message, fired_at: now } });
      }

      for (const a of store.activeAlertsForSite(site.id)) {
        if (wantTypes.has(a.type)) continue;
        store.resolveAlert(a.id, now);
        const ev = store.activeEvent(site.id, a.type);
        if (ev) store.closeEvent(ev.id, now);
        const rule = rules.find((r) => r.id === a.rule_id);
        notify.deliver(JSON.parse(rule?.channels || '[]'),
          { subject: `FleetView · resolved ${label(a.type)}`, text: `${site.name} has recovered.`, severity: 'info' });
        broadcast({ type: 'alert', action: 'resolved', site_id: site.id, alert: { type: a.type } });
      }
    }
  }

  return { tick };
}

function label(type) {
  return ({ site_down: 'Site down', high_latency: 'High latency', high_drop: 'Packet loss', obstruction: 'Obstruction' }[type]) || type;
}
