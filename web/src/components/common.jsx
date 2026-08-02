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

/* The brand mark. Raster, not drawn in code — assets/logo.png is the supplied
   artwork with its black background keyed to alpha, so it sits on any panel.
   The 64px variant is served below 40px to keep small headers light. */
export function Logo({ size = 22, className = '' }) {
  const src = `${import.meta.env.BASE_URL}assets/${size > 40 ? 'logo.png' : 'logo-64.png'}`;
  return (
    <img src={src} width={size} height={size} alt="FleetView"
      className={className}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block', flex: 'none' }} />
  );
}
