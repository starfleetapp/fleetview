import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getJSON } from '../lib/api.js';
import { TuiPanel, TuiPlot, TuiSky, TuiKV, Tag } from '../components/tui.jsx';
import { fmtBps, fmtPct, fmtUptime, ago, TYPE_LABEL, ALERT_LABEL } from '../lib/format.js';

const RANGES = ['1h', '6h', '24h'];

function Stat({ label, value, sub, color }) {
  return (
    <div className="tui-stat">
      <div className="tui-label">{label}</div>
      <div className="tui-stat-v mono">
        <b style={{ color: color || 'var(--tui-ink)' }}>{value}</b>
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}

export default function SiteDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [range, setRange] = useState('1h');
  const [hist, setHist] = useState([]);
  const [obs, setObs] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => getJSON(`/api/sites/${id}`).then((d) => alive && setData(d)).catch(() => {});
    load();
    const t = setInterval(load, 10000);
    window.addEventListener('fleet-refresh', load);
    getJSON(`/api/sites/${id}/obstruction`).then((d) => alive && setObs(d.available ? d : null)).catch(() => {});
    return () => { alive = false; clearInterval(t); window.removeEventListener('fleet-refresh', load); };
  }, [id]);

  useEffect(() => {
    let alive = true;
    const load = () => getJSON(`/api/sites/${id}/history?range=${range}`).then((d) => {
      if (!alive) return;
      setHist(d.points.map((p) => ({
        ts: p.ts,
        latency: p.latency == null ? null : Math.round(p.latency),
        drop: p.drop == null ? null : +(p.drop * 100).toFixed(2),
        down: p.down == null ? null : +(p.down / 1e6).toFixed(1),
        up: p.up == null ? null : +(p.up / 1e6).toFixed(1),
      })));
    }).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [id, range]);

  /* [ESC] back to fleet, [1/2/3] range */
  useEffect(() => {
    const h = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey) return;
      if (e.key === 'Escape') nav('/app');
      else if (e.key >= '1' && e.key <= '3') setRange(RANGES[+e.key - 1]);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [nav]);

  if (!data) {
    return <div className="tui-plot-empty tui-dim2 mono" style={{ padding: '90px 0' }}>ESTABLISHING LINK… <span className="tui-cursor">█</span></div>;
  }

  const { site, status, detail, dish, events } = data;
  const st = status || {};
  const lat = st.latency_p95_ms ?? st.ping_latency_ms;
  const dl = fmtBps(st.downlink_bps).split(' ');
  const ul = fmtBps(st.uplink_bps).split(' ');
  const scope = `SITE//${(site.name || id).toUpperCase().replace(/\s+/g, '-')}`;

  return (
    <div className="space-y-6 fade-in">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="tui-crumb mono">
            <Link to="/app">← FLEET</Link>
            <span className="tui-dim2">/</span>
            <span style={{ color: 'var(--tui-accent)' }}>SCOPE: {scope}</span>
          </div>
          <h1 className="tui-h1 mono mt-3">{(site.name || '').toUpperCase()}</h1>
          <div className="flex items-center gap-3 mt-2 mono" style={{ fontSize: 11 }}>
            <Tag status={st.status} obstructed={st.currently_obstructed} />
            <span className="tui-dim2">{(TYPE_LABEL[site.type] || site.type || '').toUpperCase()}</span>
            <span className="tui-dim2">·</span>
            <span className="tui-dim2">{(site.region || '').toUpperCase()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mono">
          <span className="tui-label">RANGE</span>
          {RANGES.map((r, i) => (
            <button key={r} className="tui-chip" data-on={range === r} onClick={() => setRange(r)}>
              [{r.toUpperCase()}]<sup style={{ opacity: 0.5 }}>{i + 1}</sup>
            </button>
          ))}
        </div>
      </div>

      {/* live vitals */}
      <TuiPanel title="LIVE VITALS">
        <div className="tui-stats">
          <Stat label="LATENCY P95" value={lat != null ? Math.round(lat) : '—'} sub=" ms"
            color={lat > 120 ? 'var(--degraded)' : 'var(--tui-accent)'} />
          <Stat label="PACKET LOSS" value={st.ping_drop_rate != null ? (st.ping_drop_rate * 100).toFixed(1) : '—'} sub=" %"
            color={st.ping_drop_rate > 0.05 ? 'var(--degraded)' : 'var(--online)'} />
          <Stat label="DOWNLINK" value={dl[0]} sub={` ${dl[1] || ''}`} />
          <Stat label="UPLINK" value={ul[0]} sub={` ${ul[1] || ''}`} />
          <Stat label="SNR" value={detail ? (detail.snr_above_noise ? 'OK' : 'LOW') : '—'}
            color={detail && !detail.snr_above_noise ? 'var(--degraded)' : 'var(--online)'} />
          <Stat label="UPTIME" value={fmtUptime(detail?.uptime_s)} />
        </div>
      </TuiPanel>

      {/* plots */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TuiPanel title="LATENCY // MS" right={`RANGE ${range.toUpperCase()}`}>
          <TuiPlot data={hist} field="latency" unit="MS" />
        </TuiPanel>
        <TuiPanel title="DOWNLINK // MBPS" right={`RANGE ${range.toUpperCase()}`}>
          <TuiPlot data={hist} field="down" unit="MBPS" color="var(--online)" />
        </TuiPanel>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* sky */}
        <TuiPanel title="SKY OBSTRUCTION" right={fmtPct(st.fraction_obstructed)}>
          <TuiSky data={obs} />
          <div className="flex justify-center gap-5 pb-3 mono tui-dim2" style={{ fontSize: 9.5, letterSpacing: '0.14em' }}>
            <span>█▓▒ CLEAR</span>
            <span style={{ color: 'var(--offline)' }}>✕ BLOCKED</span>
          </div>
        </TuiPanel>

        {/* hardware */}
        <TuiPanel title="TERMINAL HARDWARE">
          <TuiKV rows={[
            ['DISH ID', dish?.device_id],
            ['HARDWARE', dish?.hardware_version],
            ['SOFTWARE', dish?.software_version],
            ['LOCATION', `${site.lat?.toFixed(2)}, ${site.lon?.toFixed(2)}`],
            ['POINTING', detail ? `AZ ${Math.round(detail.azimuth)}° EL ${Math.round(detail.elevation)}°` : null],
            ['GPS SATS', detail?.gps_sats],
          ]} />
        </TuiPanel>

        {/* events */}
        <TuiPanel title="EVENT LOG" right={`${events?.length || 0} ENTRIES`}>
          <div className="tui-log mono">
            {events?.length ? events.slice(0, 8).map((e) => (
              <div key={e.id} className="tui-log-row">
                <span className="tui-log-ts">{new Date(e.started_at || Date.now()).toISOString().slice(11, 19)}</span>
                <span style={{ color: e.severity === 'critical' ? 'var(--offline)' : 'var(--degraded)' }}>
                  {e.severity === 'critical' ? '[FAIL]' : '[WARN]'}
                </span>
                <span className="tui-log-msg">{(ALERT_LABEL[e.type] || e.type || '').toUpperCase()}</span>
                <span className="tui-log-age">{e.active ? 'ACTIVE' : ago(e.ended_at)}</span>
              </div>
            )) : (
              <div className="tui-plot-empty" style={{ color: 'var(--online)', padding: '34px 0' }}>[  OK  ] NO EVENTS — HEALTHY</div>
            )}
          </div>
        </TuiPanel>
      </div>
    </div>
  );
}
