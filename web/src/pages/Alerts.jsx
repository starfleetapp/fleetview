import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJSON, send } from '../lib/api.js';
import { Panel } from '../components/Panel.jsx';
import { ago, ALERT_LABEL } from '../lib/format.js';

const TABS = ['Active', 'Rules', 'Recent', 'Resolved'];
const COND = { site_down: 'Connectivity', high_latency: 'Network', high_drop: 'Network', obstruction: 'Performance' };

function threshLabel(r) {
  if (r.type === 'site_down') return `Down for ${Math.round(r.window_s / 60)}m`;
  if (r.type === 'high_latency') return `> ${r.threshold} ms for ${Math.round(r.window_s / 60)}m`;
  if (r.type === 'high_drop') return `> ${(r.threshold * 100).toFixed(0)}% for ${Math.round(r.window_s / 60)}m`;
  if (r.type === 'obstruction') return `> ${(r.threshold * 100).toFixed(0)}% for ${Math.round(r.window_s / 60)}m`;
  return String(r.threshold);
}

function ChannelIcons({ channels }) {
  const base = 'w-5 h-5 rounded-md border border-line flex items-center justify-center text-[10px] text-dim';
  return (
    <span className="inline-flex items-center gap-1.5">
      {channels.includes('slack') && <span className={base} title="Slack">#</span>}
      {channels.includes('email') && <span className={base} title="Email">@</span>}
    </span>
  );
}

export default function Alerts() {
  const [tab, setTab] = useState('Active');
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);

  useEffect(() => {
    let alive = true;
    const loadA = () => getJSON('/api/alerts?limit=60').then((d) => alive && setAlerts(d.alerts)).catch(() => {});
    getJSON('/api/alert-rules').then((d) => alive && setRules(d.rules)).catch(() => {});
    loadA();
    const t = setInterval(loadA, 10000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const active = alerts.filter((a) => a.status === 'active');
  const resolved = alerts.filter((a) => a.status !== 'active');
  const counts = { Active: active.length, Rules: rules.length, Recent: resolved.length, Resolved: resolved.length };

  async function toggleRule(r) {
    const next = !r.enabled;
    setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled: next } : x)));
    await send(`/api/alert-rules/${r.id}`, 'PATCH', { threshold: r.threshold, window_s: r.window_s, channels: r.channels, enabled: next });
  }

  return (
    <div className="space-y-5 fade-in">
      <div>
        <div className="label">Alerts</div>
        <h1 className="font-display uppercase text-3xl tracking-[-0.01em] mt-1.5">Alert center</h1>
      </div>

      <div className="flex items-center gap-1 border-b border-line overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-[12px] uppercase tracking-[0.08em] border-b-2 -mb-px whitespace-nowrap transition ${tab === t ? 'border-accent text-ink' : 'border-transparent text-faint hover:text-ink'}`}>
            {t}{counts[t] != null && <span className="ml-2 text-faint">{counts[t]}</span>}
          </button>
        ))}
      </div>

      {tab === 'Active' && (
        active.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((a) => (
              <Link key={a.id} to={`/app/site/${a.site_id}`} className="card card-hover p-4 block">
                <div className="flex items-center gap-2">
                  <span className="dot live-dot" style={{ background: a.severity === 'critical' ? 'var(--offline)' : 'var(--degraded)', color: a.severity === 'critical' ? 'var(--offline)' : 'var(--degraded)' }} />
                  <span className="font-medium text-[14px] truncate">{a.site_name}</span>
                  <span className="ml-auto mono text-faint text-[10px] whitespace-nowrap">{ago(a.fired_at)}</span>
                </div>
                <div className="mono text-faint text-[10px] uppercase tracking-wide mt-1.5">{ALERT_LABEL[a.type] || a.type}</div>
                <div className="text-dim text-[13px] mt-2 leading-snug">{a.message}</div>
              </Link>
            ))}
          </div>
        ) : <div className="text-dim text-sm py-8 text-center">No active alerts — fleet is healthy.</div>
      )}

      {tab === 'Rules' && (
        <Panel className="overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.3fr_1fr_1.4fr_0.7fr_0.5fr] gap-3 px-4 py-2.5 label border-b border-line">
            <span>Rule name</span><span>Condition</span><span>Threshold</span><span>Channels</span><span>Status</span>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {rules.map((r) => (
              <div key={r.id} className="grid grid-cols-[1fr_auto] md:grid-cols-[1.3fr_1fr_1.4fr_0.7fr_0.5fr] gap-3 px-4 py-3 items-center text-[13px]">
                <span className="font-medium">{ALERT_LABEL[r.type] || r.type}</span>
                <span className="hidden md:block text-dim">{COND[r.type] || '—'}</span>
                <span className="hidden md:block mono text-dim text-[12px]">{threshLabel(r)}</span>
                <span className="hidden md:block"><ChannelIcons channels={r.channels} /></span>
                <span className="justify-self-end md:justify-self-start"><button className="toggle" data-on={r.enabled} onClick={() => toggleRule(r)} aria-label="toggle rule" /></span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {(tab === 'Recent' || tab === 'Resolved') && (
        <Panel className="overflow-hidden">
          <div className="divide-y divide-white/[0.05]">
            {resolved.length ? resolved.slice(0, 30).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <span className="dot" style={{ background: 'var(--faint)' }} />
                <span className="text-dim">{ALERT_LABEL[a.type] || a.type}</span>
                <Link to={`/app/site/${a.site_id}`} className="hover:underline">{a.site_name}</Link>
                <span className="ml-auto mono text-faint text-[11px]">resolved {ago(a.resolved_at)}</span>
              </div>
            )) : <div className="text-dim text-sm py-8 px-4 text-center">Nothing here yet.</div>}
          </div>
        </Panel>
      )}
    </div>
  );
}
