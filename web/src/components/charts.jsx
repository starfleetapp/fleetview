import { ResponsiveContainer, ComposedChart, AreaChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const tfmt = (ts) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const axis = {
  stroke: 'rgba(238,242,247,0.28)',
  tickLine: false,
  axisLine: false,
  tick: { fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: 'rgba(238,242,247,0.40)' },
};
const grid = <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.05)" vertical={false} />;

function TT({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-2.5 py-2 text-[11px]" style={{ background: 'rgba(8,11,16,0.97)' }}>
      <div className="text-faint mb-1 mono">{tfmt(label)}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="rounded-full" style={{ width: 7, height: 7, background: p.color }} />
          <span className="text-dim">{p.name}</span>
          <span className="ml-3 mono" style={{ color: p.color }}>{typeof p.value === 'number' ? p.value : '—'} {unit}</span>
        </div>
      ))}
    </div>
  );
}

const H = 180;

export function LatencyChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={H}>
      <ComposedChart data={data} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="g-lat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.40} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {grid}
        <XAxis dataKey="ts" tickFormatter={tfmt} minTickGap={46} {...axis} />
        <YAxis width={42} {...axis} />
        <Tooltip content={<TT unit="ms" />} />
        <Area type="monotone" dataKey="latency" name="Latency" stroke="var(--accent)" strokeWidth={1.6} fill="url(#g-lat)" isAnimationActive={false} />
        <Line type="monotone" dataKey="p95" name="p95" stroke="rgba(255,255,255,0.45)" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function ThroughputChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={H}>
      <ComposedChart data={data} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="g-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {grid}
        <XAxis dataKey="ts" tickFormatter={tfmt} minTickGap={46} {...axis} />
        <YAxis width={42} {...axis} />
        <Tooltip content={<TT unit="Mbps" />} />
        <Area type="monotone" dataKey="down" name="Down" stroke="var(--accent)" strokeWidth={1.6} fill="url(#g-down)" isAnimationActive={false} />
        <Line type="monotone" dataKey="up" name="Up" stroke="rgba(255,255,255,0.5)" strokeWidth={1.3} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function DropChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={H}>
      <AreaChart data={data} margin={{ top: 8, right: 10, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="g-drop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--offline)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--offline)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {grid}
        <XAxis dataKey="ts" tickFormatter={tfmt} minTickGap={46} {...axis} />
        <YAxis width={42} {...axis} unit="%" />
        <Tooltip content={<TT unit="%" />} />
        <Area type="monotone" dataKey="drop" name="Packet loss" stroke="var(--offline)" strokeWidth={1.5} fill="url(#g-drop)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
