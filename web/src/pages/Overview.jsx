import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import MetricStrip from '../components/MetricStrip.jsx';
import Globe3D from '../components/Globe3D.jsx';
import SiteTable from '../components/SiteTable.jsx';
import { Panel, PanelHead } from '../components/Panel.jsx';
import { StatusDot } from '../components/common.jsx';
import { fmtMs, fmtPct } from '../lib/format.js';

function Attention({ sites }) {
  const nav = useNavigate();
  const rank = { offline: 0, degraded: 1 };
  const bad = sites.filter((s) => s.status !== 'online').sort((a, b) => rank[a.status] - rank[b.status]);
  if (bad.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 py-12 text-center">
        <StatusDot status="online" size={10} />
        <div className="text-sm text-dim">All systems nominal</div>
        <div className="label">0 sites need attention</div>
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-auto divide-y divide-white/[0.05]">
      {bad.map((s) => (
        <button key={s.id} onClick={() => nav(`/app/site/${s.id}`)}
          className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition">
          <StatusDot status={s.status} pulse />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px]">{s.name}</div>
            <div className="mono text-faint text-[10.5px] uppercase tracking-wide">{s.region}</div>
          </div>
          <div className="text-right mono text-[11px] leading-tight">
            <div style={{ color: s.status === 'offline' ? 'var(--offline)' : 'var(--degraded)' }}>
              {s.status === 'offline' ? 'OFFLINE' : s.currently_obstructed ? 'OBSTRUCTED' : fmtMs(s.ping_latency_ms)}
            </div>
            <div className="text-faint">{fmtPct(s.ping_drop_rate)} loss</div>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function Overview({ sites, summary }) {
  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-end justify-between gap-4">
        <div>
          <div className="label">Fleet overview</div>
          <h1 className="font-display uppercase text-3xl sm:text-[40px] tracking-[-0.01em] leading-[1.04] mt-1.5">
            Every dish. One screen.
          </h1>
          <p className="text-dim text-sm mt-2">Real-time telemetry across every Starlink site — polled every 10 seconds.</p>
        </div>
        <div className="hidden sm:block shrink-0">
          <div className="label mb-1.5">Time range</div>
          <button className="btn py-2 text-[12px] gap-2.5">
            <span className="dot live-dot" style={{ background: 'var(--online)', color: 'var(--online)' }} /> Live
            <span className="text-faint">▾</span>
          </button>
        </div>
      </motion.div>

      <MetricStrip summary={summary} />

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-stretch">
        <Panel bracket className="overflow-hidden">
          <PanelHead right={<span className="mono text-[10px] text-faint">{sites.length} NODES · LIVE</span>}>Global fleet</PanelHead>
          <Globe3D sites={sites} />
        </Panel>
        <Panel className="overflow-hidden flex flex-col" delay={0.08}>
          <PanelHead right={<span className="mono text-[10px] text-faint">{sites.filter((s) => s.status !== 'online').length}</span>}>Needs attention</PanelHead>
          <Attention sites={sites} />
        </Panel>
      </div>

      <SiteTable sites={sites} />
    </div>
  );
}
