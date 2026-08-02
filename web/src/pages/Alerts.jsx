import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJSON, send } from '../lib/api.js';
import { TuiPanel, Tag } from '../components/tui.jsx';
import { ago, ALERT_LABEL } from '../lib/format.js';

const TABS = [['active', 'ACTIVE'], ['rules', 'RULES'], ['resolved', 'RESOLVED']];
const COND = { site_down: 'CONNECTIVITY', high_latency: 'NETWORK', high_drop: 'NETWORK', obstruction: 'PERFORMANCE' };
const ACK_KEY = 'fv_acked';

/* Acknowledgement is a LOCAL triage marker: the API has no ack endpoint and
   the alerts table has no acked_at column, so this deliberately does not
   pretend to be shared state. Labelled "ACK · LOCAL" in the UI. */
function loadAcked() {
  try { return new Set(JSON.parse(localStorage.getItem(ACK_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveAcked(set) {
  try { localStorage.setItem(ACK_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

function threshLabel(r) {
  const m = Math.round(r.window_s / 60);
  if (r.type === 'site_down') return `DOWN ${m}M`;
  if (r.type === 'high_latency') return `> ${r.threshold}MS / ${m}M`;
  if (r.type === 'high_drop') return `> ${(r.threshold * 100).toFixed(0)}% LOSS / ${m}M`;
  if (r.type === 'obstruction') return `> ${(r.threshold * 100).toFixed(0)}% OBST / ${m}M`;
  return String(r.threshold);
}

const hhmmss = (ts) => (ts ? new Date(ts).toISOString().slice(11, 19) : '--:--:--');

export default function Alerts() {
  const nav = useNavigate();
  const [tab, setTab] = useState('active');
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [acked, setAcked] = useState(loadAcked);
  const [sel, setSel] = useState(0);

  useEffect(() => {
    let alive = true;
    const loadA = () => getJSON('/api/alerts?limit=60').then((d) => alive && setAlerts(d.alerts || [])).catch(() => {});
    getJSON('/api/alert-rules').then((d) => alive && setRules(d.rules || [])).catch(() => {});
    loadA();
    const t = setInterval(loadA, 10000);
    window.addEventListener('fleet-refresh', loadA);
    return () => { alive = false; clearInterval(t); window.removeEventListener('fleet-refresh', loadA); };
  }, []);

  const active = useMemo(
    () => alerts.filter((a) => a.status === 'active')
      .sort((a, b) => (a.severity === b.severity ? b.fired_at - a.fired_at : a.severity === 'critical' ? -1 : 1)),
    [alerts],
  );
  const resolved = useMemo(() => alerts.filter((a) => a.status !== 'active'), [alerts]);
  const counts = { active: active.length, rules: rules.length, resolved: resolved.length };
  const unacked = active.filter((a) => !acked.has(a.id)).length;

  const toggleAck = useCallback((id) => {
    setAcked((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      saveAcked(n);
      return n;
    });
  }, []);

  useEffect(() => { setSel(0); }, [tab]);

  /* keyboard: J/K select · A ack · ENTER open site · 1-3 tab */
  useEffect(() => {
    const h = (e) => {
      const t = e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (e.key >= '1' && e.key <= '3') { setTab(TABS[+e.key - 1][0]); return; }
      if (tab !== 'active') return;
      if (k === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setSel((v) => Math.min(v + 1, active.length - 1)); }
      else if (k === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setSel((v) => Math.max(v - 1, 0)); }
      else if (k === 'a') { if (active[sel]) toggleAck(active[sel].id); }
      else if (e.key === 'Enter') { if (active[sel]) nav(`/app/site/${active[sel].site_id}`); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [tab, active, sel, toggleAck, nav]);

  async function toggleRule(r) {
    const next = !r.enabled;
    setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled: next } : x)));
    try {
      await send(`/api/alert-rules/${r.id}`, 'PATCH', { threshold: r.threshold, window_s: r.window_s, channels: r.channels, enabled: next });
    } catch { /* demo mode has no writable backend */ }
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="tui-crumb mono">
            <span style={{ color: 'var(--tui-accent)' }}>SCOPE: INCIDENT//QUEUE</span>
          </div>
          <h1 className="tui-h1 mono mt-3">ALERT CENTER</h1>
        </div>
        <div className="mono" style={{ fontSize: 11 }}>
          {unacked > 0 ? (
            <span style={{ color: 'var(--offline)' }}>▲ {unacked} UNACKNOWLEDGED</span>
          ) : (
            <span style={{ color: 'var(--online)' }}>[  OK  ] QUEUE CLEAR</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mono">
        {TABS.map(([v, l], i) => (
          <button key={v} className="tui-chip" data-on={tab === v} onClick={() => setTab(v)}>
            [{l} {counts[v]}]<sup style={{ opacity: 0.5 }}>{i + 1}</sup>
          </button>
        ))}
      </div>

      {tab === 'active' && (
        <TuiPanel title="ACTIVE INCIDENTS" right={`ACK · LOCAL · ${acked.size} MARKED`}>
          <div className="tui-scroll">
            <table className="tui-table" style={{ minWidth: 860 }}>
              <thead>
                <tr><th>SEV</th><th>FIRED</th><th>SITE</th><th>CONDITION</th><th>DETAIL</th><th>AGE</th><th>ACK</th></tr>
              </thead>
              <tbody>
                {active.map((a, i) => {
                  const isAck = acked.has(a.id);
                  return (
                    <tr key={a.id} className="tui-row" data-sel={i === sel}
                      onMouseEnter={() => setSel(i)} onClick={() => nav(`/app/site/${a.site_id}`)}
                      style={isAck ? { opacity: 0.55 } : undefined}>
                      <td><Tag status={a.severity === 'critical' ? 'offline' : 'degraded'} /></td>
                      <td className="tui-dim2">{hhmmss(a.fired_at)}</td>
                      <td style={{ color: 'var(--tui-ink)' }}>{(a.site_name || a.site_id || '').toUpperCase()}</td>
                      <td className="tui-dim2">{(ALERT_LABEL[a.type] || a.type || '').toUpperCase()}</td>
                      <td className="tui-dim2" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.message}</td>
                      <td>{ago(a.fired_at)}</td>
                      <td onClick={(e) => { e.stopPropagation(); toggleAck(a.id); }}>
                        <button className="tui-chip" data-on={isAck}>
                          {isAck ? '[ACKED]' : '[ ACK ]'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {active.length === 0 && (
                  <tr><td colSpan={7} style={{ color: 'var(--online)', textAlign: 'center', padding: '44px 0' }}>[  OK  ] NO ACTIVE INCIDENTS — FLEET HEALTHY</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TuiPanel>
      )}

      {tab === 'rules' && (
        <TuiPanel title="ALERT RULES" right={`${rules.filter((r) => r.enabled).length}/${rules.length} ARMED`}>
          <div className="tui-scroll">
            <table className="tui-table" style={{ minWidth: 720 }}>
              <thead>
                <tr><th>RULE</th><th>CLASS</th><th>THRESHOLD</th><th>CHANNELS</th><th>STATE</th></tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--tui-ink)' }}>{(ALERT_LABEL[r.type] || r.type || '').toUpperCase()}</td>
                    <td className="tui-dim2">{COND[r.type] || '—'}</td>
                    <td>{threshLabel(r)}</td>
                    <td className="tui-dim2">
                      {(r.channels || []).includes('slack') ? '#SLACK ' : ''}
                      {(r.channels || []).includes('email') ? '@EMAIL' : ''}
                      {!(r.channels || []).length ? '—' : ''}
                    </td>
                    <td>
                      <button className="tui-chip" data-on={!!r.enabled} onClick={() => toggleRule(r)}
                        style={{ color: r.enabled ? 'var(--online)' : 'var(--tui-faint)' }}>
                        {r.enabled ? '[ ARMED  ]' : '[ DISABLED ]'}
                      </button>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr><td colSpan={5} className="tui-dim2" style={{ textAlign: 'center', padding: '34px 0' }}>NO RULES DEFINED</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TuiPanel>
      )}

      {tab === 'resolved' && (
        <TuiPanel title="RESOLVED — HISTORY" right={`${resolved.length} ENTRIES`}>
          <div className="tui-log mono">
            {resolved.length ? resolved.slice(0, 40).map((a) => (
              <div key={a.id} className="tui-log-row" onClick={() => nav(`/app/site/${a.site_id}`)} style={{ cursor: 'pointer' }}>
                <span className="tui-log-ts">{hhmmss(a.fired_at)}</span>
                <span className="tui-dim2">[RSLV]</span>
                <span style={{ color: 'var(--tui-ink)' }}>{(a.site_name || a.site_id || '').toUpperCase()}</span>
                <span className="tui-log-msg">{(ALERT_LABEL[a.type] || a.type || '').toUpperCase()}</span>
                <span className="tui-log-age">{ago(a.resolved_at)}</span>
              </div>
            )) : (
              <div className="tui-plot-empty tui-dim2" style={{ padding: '34px 0' }}>NO RESOLVED INCIDENTS IN WINDOW</div>
            )}
          </div>
        </TuiPanel>
      )}
    </div>
  );
}
