const colorFor = (status) =>
  status === 'online' ? 'var(--online)'
    : status === 'degraded' ? 'var(--degraded)'
    : status === 'offline' ? 'var(--offline)'
    : 'var(--text-dim)';

export function StatusDot({ status, size = 8, pulse = false }) {
  const color = colorFor(status);
  return (
    <span className="relative inline-flex flex-none" style={{ width: size, height: size }}>
      {pulse && <span className="absolute inset-0 rounded-full pulse-ring" style={{ background: color }} />}
      <span className="rounded-full relative" style={{ width: size, height: size, background: color }} />
    </span>
  );
}

export function Pill({ status, children }) {
  const color = colorFor(status);
  return (
    <span className="inline-flex items-center gap-1.5 mono uppercase" style={{ color: status ? color : 'var(--dim)', fontSize: '10.5px', letterSpacing: '0.06em', fontWeight: 500 }}>
      {status && <span className="rounded-full" style={{ width: 6, height: 6, background: color }} />}
      {children}
    </span>
  );
}

export function Logo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 20c5-9 13-13 18-15" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      <path d="M5 20c4-7 10-10 14-12" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      <circle cx="6.5" cy="18.5" r="2.4" fill="#fff" />
    </svg>
  );
}
