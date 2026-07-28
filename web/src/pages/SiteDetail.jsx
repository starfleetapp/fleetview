import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getJSON } from '../lib/api.js';
import { Pill } from '../components/common.jsx';
import { Panel, PanelHead } from '../components/Panel.jsx';
import { LatencyChart, ThroughputChart } from '../components/charts.jsx';
import ObstructionMap from '../components/ObstructionMap.jsx';
import { fmtBps, fmtPct, fmtUptime, ago, TYPE_LABEL, ALERT_LABEL } from '../lib/format.js';

const RANGES = ['1h', '6h', '24h'];

function StatCell({ label, value, sub, color }) {
  return (
    <div className="relative bg-surface px-4 py-3.5">
      <div className="label">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="stat-num text-[22px] leading-none" style={{ color: color || 'var(--ink)' }}>{value}</span>
        {sub && <span className="text-faint text-[11px] mono">{sub}</span>}
      </div>
    </div>
  );
}

function dur(a, b) {
  const s = Math.floor(((b || Date.now()) - a) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-line last:border-0">
      <dt className="text-faint uppercase tracking-wide text-[10px]">{k}</dt>
      <dd className="text-dim text-right truncate">{v}</dd>
    </div>
  );
}

export default function SiteDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [range, setRange] = useState('1h');
  const [hist, setHist] = useState([]);
  const [obs, setObs] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => getJSON(`/api/sites/${id}`).then((d) => alive && setData(d)).catch(() => {});
    load();
    const t = setInterval(load, 10000);
    getJSON(`/api/sites/${id}/obstruction`).then((d) => alive && setObs(d.available ? d : null)).catch(() => {});
    return () => { alive = false; clearInterval(t); };
  }, [id]);

  useEffect(() => {
    let alive = true;
    const load = () => getJSON(`/api/sites/${id}/history?range=${range}`).then((d) => {
      if (!alive) return;
      setHist(d.points.map((p) => ({
        ts: p.ts, latency: Math.round(p.latency), p95: p.p95,
        drop: +(p.drop * 100).toFixed(2), down: +(p.down / 1e6).toFixed(1), up: +(p.up / 1e6).toFixed(1),
      })));
    }).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [id, range]);

  if (!data) return <div className="text-dim py-24 text-center mono text-sm">LOADING TELEMETRY…</div>;
  const { site, status, detail, dish, events } = data;
  const st = status || {};
  const lat = st.latency_p95_ms ?? st.ping_latency_ms;
  const dl = fmtBps(st.downlink_bps).split(' ');
  const ul = fmtBps(st.uplink_bps).split(' ');

  return (
    <div className="space-y-5 fade-in">
      <Link to="/app" className="mono text-[11px] text-faint hover:text-ink inline-flex items-center gap-1.5 uppercase tracking-wide">← Fleet</Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display uppercase text-3xl tracking-[-0.01em]">{site.name}</h1>
        <Pill>{TYPE_LABEL[site.type]}</Pill>
        <Pill status={st.status}>{st.status || 'unknown'}</Pill>
        <span className="text-dim text-sm">{site.region}</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="seg">{RANGES.map((r) => <button key={r} data-active={range === r} onClick={() => setRange(r)}>{r}</button>)}</div>
          <button className="btn py-2 text-[12px] gap-2">Actions <span className="text-faint">▾</span></button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" style={{ gap: 1, background: 'var(--line)' }}>
          <StatCell label="Latency p95" value={lat != null ? Math.round(lat) : '—'} sub="ms" color={lat > 120 ? 'var(--degraded)' : undefined} />
          <StatCell label="Packet loss" value={st.ping_drop_rate != null ? (st.ping_drop_rate * 100).toFixed(1) : '—'} sub="%" color={st.ping_drop_rate > 0.05 ? 'var(--degraded)' : undefined} />
          <StatCell label="Downlink" value={dl[0]} sub={dl[1]} />
          <StatCell label="Uplink" value={ul[0]} sub={ul[1]} />
          <StatCell label="SNR" value={detail ? (detail.snr_above_noise ? 'OK' : 'LOW') : '—'} color={detail && !detail.snr_above_noise ? 'var(--degraded)' : undefined} />
          <StatCell label="Uptime" value={fmtUptime(detail?.uptime_s)} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel className="overflow-hidden"><PanelHead>Latency · ms</PanelHead><div className="p-4 pt-3"><LatencyChart data={hist} /></div></Panel>
        <Panel className="overflow-hidden" delay={0.05}><PanelHead>Throughput · Mbps</PanelHead><div className="p-4 pt-3"><ThroughputChart data={hist} /></div></Panel>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Panel className="overflow-hidden" delay={0.05}>
          <PanelHead right={<span className="mono text-[10px] text-faint">{fmtPct(st.fraction_obstructed)}</span>}>Sky obstruction</PanelHead>
          {obs ? (
            <div className="p-2">
              <ObstructionMap data={obs} />
              <div className="flex justify-center gap-4 text-[10px] mono text-faint uppercase tracking-wide pb-2">
                <span className="inline-flex items-center gap-1.5"><span style={{ width: 9, height: 9, background: 'rgba(78,161,255,0.7)', borderRadius: 2 }} />Clear</span>
                <span className="inline-flex items-center gap-1.5"><span style={{ width: 9, height: 9, background: 'rgba(223,88,87,0.9)', borderRadius: 2 }} />Blocked</span>
              </div>
            </div>
          ) : <div className="text-dim text-sm py-10 text-center">No obstruction map yet.</div>}
        </Panel>

        <Panel className="overflow-hidden" delay={0.1}>
          <PanelHead>Dish info</PanelHead>
          <div className="p-4">
            <dl className="text-[12.5px] mono">
              <Row k="Dish ID" v={dish?.device_id || '—'} />
              <Row k="Hardware" v={dish?.hardware_version || '—'} />
              <Row k="Software" v={dish?.software_version || '—'} />
              <Row k="Location" v={`${site.lat?.toFixed(1)}°, ${site.lon?.toFixed(1)}°`} />
              <Row k="Pointing" v={detail ? `AZ ${Math.round(detail.azimuth)}° EL ${Math.round(detail.elevation)}°` : '—'} />
              <Row k="GPS sats" v={detail?.gps_sats ?? '—'} />
            </dl>
          </div>
        </Panel>

        <Panel className="overflow-hidden" delay={0.15}>
          <PanelHead>Event history</PanelHead>
          <div className="p-2">
            {events?.length ? (
              <div className="divide-y divide-white/[0.05]">
                {events.slice(0, 7).map((e) => (
                  <div key={e.id} className="flex items-center gap-2.5 px-2 py-2 text-[12.5px]">
                    <span className="dot" style={{ background: e.severity === 'critical' ? 'var(--offline)' : 'var(--degraded)' }} />
                    <span className="text-dim truncate flex-1">{ALERT_LABEL[e.type] || e.type}</span>
                    <span className="mono text-faint text-[10px] whitespace-nowrap">{e.active ? 'now' : ago(e.ended_at)}</span>
                  </div>
                ))}
              </div>
            ) : <div className="text-dim text-sm py-6 px-2 text-center">No events — healthy.</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
