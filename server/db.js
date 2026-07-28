// Cloud data layer. node:sqlite for the local demo; the schema mirrors the
// Supabase/Postgres migrations in supabase/migrations so moving to Supabase is a
// connection swap, not a rewrite.
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fleet } from '../shared/fleet.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createStore(file = path.join(__dirname, 'fleet.db')) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY, name TEXT, type TEXT, region TEXT,
      lat REAL, lon REAL, token TEXT UNIQUE, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS dishes (
      id TEXT PRIMARY KEY, site_id TEXT, hardware_version TEXT, software_version TEXT,
      first_seen INTEGER, last_seen INTEGER
    );
    CREATE TABLE IF NOT EXISTS samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT, site_id TEXT, ts INTEGER,
      state TEXT, reachable INTEGER, downlink_bps REAL, uplink_bps REAL,
      ping_latency_ms REAL, ping_drop_rate REAL, latency_p95_ms REAL,
      fraction_obstructed REAL, currently_obstructed INTEGER, uptime_s INTEGER,
      snr_above_noise INTEGER, azimuth REAL, elevation REAL, gps_sats INTEGER, alerts TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_samples_site_ts ON samples(site_id, ts);
    CREATE TABLE IF NOT EXISTS obstruction_maps (
      site_id TEXT PRIMARY KEY, ts INTEGER, num_rows INTEGER, num_cols INTEGER, snr TEXT
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT, site_id TEXT, type TEXT, severity TEXT,
      message TEXT, started_at INTEGER, ended_at INTEGER, active INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_events_active ON events(active);
    CREATE TABLE IF NOT EXISTS alert_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT, site_id TEXT, type TEXT,
      threshold REAL, window_s INTEGER, channels TEXT, enabled INTEGER, created_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, rule_id INTEGER, site_id TEXT, type TEXT,
      severity TEXT, message TEXT, fired_at INTEGER, resolved_at INTEGER, status TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      slack_webhook_url TEXT, email_to TEXT, email_from TEXT, resend_api_key TEXT
    );
  `);

  // --- seed (demo) ---
  const seedSite = db.prepare(
    'INSERT OR IGNORE INTO sites (id,name,type,region,lat,lon,token,created_at) VALUES (?,?,?,?,?,?,?,?)',
  );
  for (const s of fleet) seedSite.run(s.id, s.name, s.type, s.region, s.lat, s.lon, s.token, Date.now());
  db.prepare(
    `INSERT OR IGNORE INTO integrations (id,slack_webhook_url,email_to,email_from,resend_api_key)
     VALUES (1,'','','alerts@fleetview.app','')`,
  ).run();
  if (db.prepare('SELECT COUNT(*) AS n FROM alert_rules').get().n === 0) {
    const r = db.prepare(
      'INSERT INTO alert_rules (scope,site_id,type,threshold,window_s,channels,enabled,created_at) VALUES (?,?,?,?,?,?,?,?)',
    );
    const now = Date.now();
    r.run('org', null, 'site_down', 0, 180, JSON.stringify(['slack', 'email']), 1, now);
    r.run('org', null, 'high_latency', 150, 120, JSON.stringify(['slack']), 1, now);
    r.run('org', null, 'high_drop', 0.1, 120, JSON.stringify(['slack']), 1, now);
    r.run('org', null, 'obstruction', 0.05, 300, JSON.stringify(['slack']), 1, now);
  }

  // --- prepared statements ---
  const q = {
    tokenToSite: db.prepare('SELECT * FROM sites WHERE token = ?'),
    listSites: db.prepare('SELECT * FROM sites ORDER BY name'),
    getSite: db.prepare('SELECT * FROM sites WHERE id = ?'),
    insertSite: db.prepare('INSERT INTO sites (id,name,type,region,lat,lon,token,created_at) VALUES (?,?,?,?,?,?,?,?)'),
    insertSample: db.prepare(`INSERT INTO samples
      (site_id,ts,state,reachable,downlink_bps,uplink_bps,ping_latency_ms,ping_drop_rate,latency_p95_ms,
       fraction_obstructed,currently_obstructed,uptime_s,snr_above_noise,azimuth,elevation,gps_sats,alerts)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`),
    upsertDish: db.prepare(`INSERT INTO dishes (id,site_id,hardware_version,software_version,first_seen,last_seen)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET site_id=excluded.site_id, hardware_version=excluded.hardware_version,
        software_version=excluded.software_version, last_seen=excluded.last_seen`),
    getDish: db.prepare('SELECT * FROM dishes WHERE site_id = ? ORDER BY last_seen DESC LIMIT 1'),
    upsertObstruction: db.prepare(`INSERT INTO obstruction_maps (site_id,ts,num_rows,num_cols,snr)
      VALUES (?,?,?,?,?)
      ON CONFLICT(site_id) DO UPDATE SET ts=excluded.ts, num_rows=excluded.num_rows,
        num_cols=excluded.num_cols, snr=excluded.snr`),
    getObstruction: db.prepare('SELECT * FROM obstruction_maps WHERE site_id = ?'),
    recentSamples: db.prepare('SELECT * FROM samples WHERE site_id = ? AND ts >= ? ORDER BY ts ASC'),
    latestPerSite: db.prepare(`SELECT s.* FROM samples s
      JOIN (SELECT site_id, MAX(ts) mts FROM samples GROUP BY site_id) m
      ON s.site_id = m.site_id AND s.ts = m.mts`),
    pruneSamples: db.prepare('DELETE FROM samples WHERE ts < ?'),
    activeEvent: db.prepare("SELECT * FROM events WHERE site_id = ? AND type = ? AND active = 1 LIMIT 1"),
    openEvent: db.prepare('INSERT INTO events (site_id,type,severity,message,started_at,ended_at,active) VALUES (?,?,?,?,?,NULL,1)'),
    closeEvent: db.prepare('UPDATE events SET active = 0, ended_at = ? WHERE id = ?'),
    listEvents: db.prepare('SELECT e.*, s.name AS site_name FROM events e JOIN sites s ON s.id = e.site_id ORDER BY started_at DESC LIMIT ?'),
    eventsForSite: db.prepare('SELECT * FROM events WHERE site_id = ? ORDER BY started_at DESC LIMIT ?'),
    activeAlert: db.prepare("SELECT * FROM alerts WHERE site_id = ? AND type = ? AND status = 'active' LIMIT 1"),
    activeAlertsForSite: db.prepare("SELECT * FROM alerts WHERE site_id = ? AND status = 'active'"),
    fireAlert: db.prepare("INSERT INTO alerts (rule_id,site_id,type,severity,message,fired_at,resolved_at,status) VALUES (?,?,?,?,?,?,NULL,'active')"),
    resolveAlert: db.prepare("UPDATE alerts SET status='resolved', resolved_at=? WHERE id=?"),
    countActiveAlerts: db.prepare("SELECT COUNT(*) AS n FROM alerts WHERE status='active'"),
    listAlerts: db.prepare('SELECT a.*, s.name AS site_name FROM alerts a JOIN sites s ON s.id = a.site_id ORDER BY fired_at DESC LIMIT ?'),
    listRules: db.prepare('SELECT * FROM alert_rules ORDER BY id'),
    insertRule: db.prepare('INSERT INTO alert_rules (scope,site_id,type,threshold,window_s,channels,enabled,created_at) VALUES (?,?,?,?,?,?,?,?)'),
    updateRule: db.prepare('UPDATE alert_rules SET threshold=?, window_s=?, channels=?, enabled=? WHERE id=?'),
    deleteRule: db.prepare('DELETE FROM alert_rules WHERE id=?'),
    getIntegrations: db.prepare('SELECT * FROM integrations WHERE id = 1'),
    setIntegrations: db.prepare('UPDATE integrations SET slack_webhook_url=?, email_to=?, email_from=?, resend_api_key=? WHERE id=1'),
  };

  return {
    db,
    tokenToSite: (t) => q.tokenToSite.get(t),
    listSites: () => q.listSites.all(),
    getSite: (id) => q.getSite.get(id),
    insertSite: (s) => q.insertSite.run(s.id, s.name, s.type, s.region, s.lat, s.lon, s.token, Date.now()),
    insertSample(siteId, r) {
      q.insertSample.run(
        siteId, r.ts, r.state || 'UNKNOWN', r.reachable === false ? 0 : 1,
        r.downlink_bps || 0, r.uplink_bps || 0, r.ping_latency_ms || 0, r.ping_drop_rate || 0,
        r.latency_p95_ms ?? null, r.fraction_obstructed || 0, r.currently_obstructed ? 1 : 0,
        r.uptime_s || 0, r.snr_above_noise ? 1 : 0, r.azimuth || 0, r.elevation || 0,
        r.gps_sats || 0, JSON.stringify(r.alerts || []),
      );
    },
    upsertDish(siteId, r, ts) {
      if (!r.device_id) return;
      q.upsertDish.run(r.device_id, siteId, r.hardware_version || null, r.software_version || null, ts, ts);
    },
    getDish: (siteId) => q.getDish.get(siteId),
    upsertObstruction(siteId, r) {
      q.upsertObstruction.run(siteId, r.ts ? Date.parse(r.ts) : Date.now(), r.num_rows, r.num_cols, JSON.stringify(r.snr || []));
    },
    getObstruction: (siteId) => q.getObstruction.get(siteId),
    recentSamples: (siteId, sinceTs) => q.recentSamples.all(siteId, sinceTs),
    latestPerSite: () => q.latestPerSite.all(),
    pruneSamples: (beforeTs) => q.pruneSamples.run(beforeTs),
    activeEvent: (siteId, type) => q.activeEvent.get(siteId, type),
    openEvent: (siteId, type, sev, msg, ts) => q.openEvent.run(siteId, type, sev, msg, ts),
    closeEvent: (id, ts) => q.closeEvent.run(ts, id),
    listEvents: (limit = 50) => q.listEvents.all(limit),
    eventsForSite: (siteId, limit = 30) => q.eventsForSite.all(siteId, limit),
    activeAlert: (siteId, type) => q.activeAlert.get(siteId, type),
    activeAlertsForSite: (siteId) => q.activeAlertsForSite.all(siteId),
    fireAlert: (ruleId, siteId, type, sev, msg, ts) => q.fireAlert.run(ruleId, siteId, type, sev, msg, ts),
    resolveAlert: (id, ts) => q.resolveAlert.run(ts, id),
    countActiveAlerts: () => q.countActiveAlerts.get().n,
    listAlerts: (limit = 50) => q.listAlerts.all(limit),
    listRules: () => q.listRules.all(),
    insertRule: (r) => q.insertRule.run(r.scope || 'org', r.site_id || null, r.type, r.threshold || 0, r.window_s || 120, JSON.stringify(r.channels || []), r.enabled ? 1 : 0, Date.now()),
    updateRule: (id, r) => q.updateRule.run(r.threshold || 0, r.window_s || 120, JSON.stringify(r.channels || []), r.enabled ? 1 : 0, id),
    deleteRule: (id) => q.deleteRule.run(id),
    getIntegrations: () => q.getIntegrations.get(),
    setIntegrations: (o) => q.setIntegrations.run(o.slack_webhook_url || '', o.email_to || '', o.email_from || 'alerts@fleetview.app', o.resend_api_key || ''),
  };
}
