import { useId } from 'react';

export function Sparkline({ data, color = 'var(--accent)', height = 26 }) {
  const raw = useId();
  const id = 'sp' + raw.replace(/[^a-zA-Z0-9]/g, '');
  if (!data?.length) return null;
  const w = 100, h = height;
  const min = Math.min(...data), max = Math.max(...data), span = (max - min) || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1) * w).toFixed(1)},${(h - ((v - min) / span) * (h - 4) - 2).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full block" style={{ height }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
