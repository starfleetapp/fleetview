import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusDot } from './common.jsx';
import { fmtMs, fmtPct, fmtBps, ago, TYPE_LABEL } from '../lib/format.js';

const TYPES = ['all', 'vessel', 'mine', 'office', 'tower'];
const RANK = { offline: 0, degraded: 1, online: 2 };

export default function SiteTable({ sites }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('status');

  const rows = useMemo(() => {
    const needle = q.toLowerCase();
    let r = sites.filter(
      (s) => (type === 'all' || s.type === type) &&
        (s.name.toLowerCase().includes(needle) || (s.region || '').toLowerCase().includes(needle)),
    );
    r = [...r].sort((a, b) =>
      sort === 'status' ? (RANK[a.status] - RANK[b.status]) || a.name.localeCompare(b.name)
        : sort === 'latency' ? (b.ping_latency_ms || 0) - (a.ping_latency_ms || 0)
        : a.name.localeCompare(b.name),
    );
    return r;
  }, [sites, q, type, sort]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-line">
        <input className="input max-w-[220px]" placeholder="Search sites…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg flex-wrap">
          {TYPES.map((t) => (
            <button key={t} data-active={type === t} onClick={() => setType(t)}>
              {t === 'all' ? 'All' : TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="label">Sort</span>
          <div className="seg">
            {['status', 'latency', 'name'].map((s) => (
              <button key={s} data-active={sort === s} onClick={() => setSort(s)} className="capitalize">{s}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="hidden md:grid grid-cols-[1.7fr_1.1fr_0.8fr_0.7fr_1fr_0.9fr] gap-3 px-4 py-2.5 label border-b border-line">
        <span>Site</span><span>Region</span><span>Latency</span><span>Loss</span><span>Downlink</span><span>Last seen</span>
      </div>

      <div className="divide-y divide-white/[0.05]">
        {rows.map((s) => (
          <button
            key={s.id}
            onClick={() => nav(`/app/site/${s.id}`)}
            className="w-full text-left grid grid-cols-[1fr_auto] md:grid-cols-[1.7fr_1.1fr_0.8fr_0.7fr_1fr_0.9fr] gap-2 md:gap-3 px-4 py-3 hover:bg-white/[0.025] transition group"
          >
            <span className="flex items-center gap-3 min-w-0">
              <StatusDot status={s.status} pulse={s.status !== 'online'} />
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] group-hover:text-ink">{s.name}</span>
                <span className="block truncate text-[10.5px] text-faint mono md:hidden uppercase tracking-wide">{s.region} · {fmtMs(s.ping_latency_ms)}</span>
              </span>
            </span>
            <span className="hidden md:flex items-center text-dim text-[12px]">{s.region}</span>
            <span className="hidden md:flex items-center mono text-[12px]" style={{ color: s.ping_latency_ms > 120 ? 'var(--degraded)' : 'var(--ink)' }}>{fmtMs(s.ping_latency_ms)}</span>
            <span className="hidden md:flex items-center mono text-[12px]" style={{ color: s.ping_drop_rate > 0.05 ? 'var(--degraded)' : 'var(--dim)' }}>{fmtPct(s.ping_drop_rate)}</span>
            <span className="hidden md:flex items-center mono text-[12px] text-dim">{fmtBps(s.downlink_bps)}</span>
            <span className="flex items-center justify-end md:justify-start mono text-[11px] text-faint">{ago(s.last_seen)}</span>
          </button>
        ))}
        {rows.length === 0 && <div className="px-4 py-12 text-center text-dim text-sm">No sites match your filter.</div>}
      </div>
    </div>
  );
}
