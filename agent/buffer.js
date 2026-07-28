// Local store-and-forward outbox (SQLite). Telemetry is durably buffered here so
// nothing is lost while the site is offline (critical for maritime/remote); the
// shipper drains it to the cloud and acks only what was accepted.
import { DatabaseSync } from 'node:sqlite';

export function createBuffer(file) {
  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  const insert = db.prepare('INSERT INTO outbox (body, created_at) VALUES (?, ?)');
  const peek = db.prepare('SELECT id, body FROM outbox ORDER BY id ASC LIMIT ?');
  const del = db.prepare('DELETE FROM outbox WHERE id <= ?');
  const counter = db.prepare('SELECT COUNT(*) AS n FROM outbox');
  // cap runaway growth if the cloud is unreachable for a very long time
  const trim = db.prepare('DELETE FROM outbox WHERE id NOT IN (SELECT id FROM outbox ORDER BY id DESC LIMIT ?)');

  return {
    enqueue(obj) { insert.run(JSON.stringify(obj), Date.now()); },
    batch(n) { return peek.all(n).map((r) => ({ id: r.id, obj: JSON.parse(r.body) })); },
    ackThrough(id) { del.run(id); },
    count() { return counter.get().n; },
    capAt(max) { trim.run(max); },
  };
}
