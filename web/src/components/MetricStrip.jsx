import { useMemo } from 'react';
import { Counter } from './Counter.jsx';
import { Sparkline } from './Sparkline.jsx';

// Stable decorative trend series per card (matches the mockup's sparklines).
function genSeries(seed) {
  let s = (seed * 9301 + 49297) % 233280;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = []; let v = 0.45 + r() * 0.2;
  for (let i = 0; i < 26; i++) { v += (r() - 0.48) * 0.22; v = Math.max(0.12, Math.min(0.92, v)); out.push(v); }
  return out;
}

export default function MetricStrip({ summary }) {
  const series = useMemo(() => Array.from({ length: 6 }, (_, i) => genSeries(i + 3)), []);
  if (!summary) return null;
  const items = [
    { k: 'Sites online', v: summary.online, sub: `/ ${summary.total}`, color: 'var(--online)' },
    { k: 'Degraded', v: summary.degraded, sub: `/ ${summary.total}`, color: 'var(--degraded)' },
    { k: 'Offline', v: summary.offline, sub: `/ ${summary.total}`, color: 'var(--offline)' },
    { k: 'Avg latency', v: summary.avg_latency_ms ?? 0, sub: 'ms', color: 'var(--accent)' },
    { k: 'Fleet downlink', v: (summary.total_downlink_bps || 0) / 1e9, decimals: 2, sub: 'Gbps', color: 'var(--accent)' },
    { k: 'Active alerts', v: summary.active_alerts, sub: '', color: 'var(--degraded)' },
  ];
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" style={{ gap: 1, background: 'var(--line)' }}>
        {items.map((it, i) => (
          <div key={i} className="relative bg-surface px-4 pt-3.5 pb-3">
            <div className="flex items-center justify-between">
              <span className="label">{it.k}</span>
              <span className="dot" style={{ background: it.color, opacity: 0.8 }} />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <Counter value={it.v} decimals={it.decimals || 0} className="stat-num text-[26px] leading-none" style={{ color: 'var(--ink)' }} />
              {it.sub && <span className="text-faint text-[11px] mono">{it.sub}</span>}
            </div>
            <div className="mt-2.5"><Sparkline data={series[i]} color={it.color} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
