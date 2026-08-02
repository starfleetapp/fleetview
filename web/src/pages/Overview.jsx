import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TuiPanel, TuiStatStrip, TuiMap, Tag, TuiHelp, TuiFeed } from '../components/tui.jsx';
import { fmtMs, fmtPct, fmtBps, ago } from '../lib/format.js';

const RANK = { offline: 0, degraded: 1, online: 2 };
const TYPES = [['all', 'ALL'], ['vessel', 'VESSEL'], ['mine', 'MINE/ENERGY'], ['office', 'REMOTE OFFICE'], ['tower', 'ISP RELAY']];
const SORTS = ['status', 'latency', 'name'];

/* NEEDS ATTENTION — bad sites only, worst first */
function Attention({ sites, onOpen }) {
  const bad = sites.filter((s) => s.status !== 'online')
    .sort((a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name));
  return (
    <div className="tui-scroll" style={{ maxHeight: 'clamp(300px, 44vh, 430px)', overflowY: 'auto' }}>
      <table className="tui-table">
        <thead>
          <tr><th>TAG</th><th>SITE</th><th>REGION</th><th>LATENCY</th><th>LOSS</th></tr>
        </thead>
        <tbody>
          {bad.length === 0 && (
            <tr><td colSpan={5} style={{ color: 'var(--online)', textAlign: 'center', padding: '40px 0' }}>[  OK  ] ALL SYSTEMS NOMINAL</td></tr>
          )}
          {bad.map((s) => (
            <tr key={s.id} className="tui-row" onClick={() => onOpen(s)}>
              <td><Tag status={s.status} obstructed={s.currently_obstructed} /></td>
              <td style={{ color: 'var(--tui-ink)' }}>{s.name.toUpperCase()}</td>
              <td className="tui-dim2">{(s.region || '').toUpperCase()}</td>
              <td>{s.status === 'offline' ? `${fmtPct(1)} LOSS` : fmtMs(s.ping_latency_ms)}</td>
              <td className="tui-dim2">{s.status === 'offline' ? '—' : fmtPct(s.ping_drop_rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Overview({ sites, summary, log }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('status');
  const [sel, setSel] = useState(0);
  const [help, setHelp] = useState(false);
  const searchRef = useRef(null);

  const rows = useMemo(() => {
    let r = sites.filter((s) =>
      (type === 'all' || s.type === type) &&
      (!q || `${s.name} ${s.region}`.toLowerCase().includes(q.toLowerCase())));
    return [...r].sort((a, b) =>
      sort === 'status' ? (RANK[a.status] - RANK[b.status]) || a.name.localeCompare(b.name)
        : sort === 'latency' ? (b.ping_latency_ms || 0) - (a.ping_latency_ms || 0)
        : a.name.localeCompare(b.name));
  }, [sites, q, type, sort]);

  useEffect(() => { setSel(0); }, [q, type, sort]);

  /* keyboard layer — never hijacks typing */
  useEffect(() => {
    const h = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) {
        if (e.key === 'Escape' && tag === 'INPUT') e.target.blur();
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setSel((v) => Math.min(v + 1, rows.length - 1)); }
      else if (k === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setSel((v) => Math.max(v - 1, 0)); }
      else if (e.key === 'Enter') { if (rows[sel]) nav(`/app/site/${rows[sel].id}`); }
      else if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (k === 'g') { window.dispatchEvent(new Event('open-cmdk')); }
      else if (k === 'r') { window.dispatchEvent(new Event('fleet-refresh')); }
      else if (e.key === '?') { setHelp((v) => !v); }
      else if (e.key >= '1' && e.key <= '5') { setType(TYPES[+e.key - 1][0]); }
      else if (e.key === 'Escape') { setQ(''); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [rows, sel, nav]);

  /* keep the selected row in view */
  const bodyRef = useRef(null);
  useEffect(() => {
    bodyRef.current?.querySelector(`[data-sel='true']`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  return (
    <div className="space-y-6">
      <TuiStatStrip summary={summary} />

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6 items-stretch">
        <TuiPanel title={`GLOBAL FLEET // ${sites.length} NODES // LIVE`}>
          <TuiMap sites={sites} onPick={(s) => nav(`/app/site/${s.id}`)} />
        </TuiPanel>
        <TuiPanel title="NEEDS ATTENTION"
          right={`${sites.filter((s) => s.status !== 'online').length} FLAGGED`}>
          <Attention sites={sites} onOpen={(s) => nav(`/app/site/${s.id}`)} />
        </TuiPanel>
      </div>

      <TuiPanel title="LIVE TELEMETRY STREAM" right="WS · REALTIME">
        <TuiFeed log={log} />
      </TuiPanel>

      <TuiPanel title="FLEET SITES" right={`SORT:[${sort.toUpperCase()}]`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 pt-3 pb-2 mono">
          <span className="tui-dim2" style={{ fontSize: 11 }}>/</span>
          <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="SEARCH_" className="tui-search" aria-label="Search sites" />
          {TYPES.map(([v, l]) => (
            <button key={v} className="tui-chip" data-on={type === v} onClick={() => setType(v)}>[{l}]</button>
          ))}
          <span className="ml-auto flex gap-3">
            {SORTS.map((s) => (
              <button key={s} className="tui-chip" data-on={sort === s} onClick={() => setSort(s)}>{s.toUpperCase()}</button>
            ))}
          </span>
        </div>
        <div className="tui-scroll">
          <table className="tui-table" style={{ minWidth: 720 }}>
            <thead>
              <tr><th>STATUS</th><th>SITE</th><th>REGION</th><th>LATENCY</th><th>LOSS</th><th>DOWNLINK</th><th>LAST SEEN</th></tr>
            </thead>
            <tbody ref={bodyRef}>
              {rows.map((s, i) => (
                <tr key={s.id} className="tui-row" data-sel={i === sel}
                  onClick={() => nav(`/app/site/${s.id}`)} onMouseEnter={() => setSel(i)}>
                  <td><Tag status={s.status} obstructed={s.currently_obstructed} /></td>
                  <td style={{ color: 'var(--tui-ink)' }}>{s.name.toUpperCase()}</td>
                  <td className="tui-dim2">{(s.region || '').toUpperCase()}</td>
                  <td>{s.status === 'offline' ? '0 ms' : fmtMs(s.ping_latency_ms)}</td>
                  <td style={{ color: (s.ping_drop_rate || 0) > 0.05 ? 'var(--degraded)' : undefined }}>
                    {s.status === 'offline' ? '100.0%' : fmtPct(s.ping_drop_rate)}
                  </td>
                  <td>{s.status === 'offline' ? '0 bps' : fmtBps(s.downlink_bps)}</td>
                  <td className="tui-dim2">{ago(s.last_seen)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="tui-dim2" style={{ textAlign: 'center', padding: '30px 0' }}>NO MATCH — [ESC] TO CLEAR</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </TuiPanel>

      {help && <TuiHelp onClose={() => setHelp(false)} />}
    </div>
  );
}
