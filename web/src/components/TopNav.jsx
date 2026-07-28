import { NavLink, Link } from 'react-router-dom';
import { Logo } from './common.jsx';

const NAV = [
  { to: '/app', label: 'Fleet', end: true },
  { to: '/app/alerts', label: 'Alerts' },
  { to: '/app/settings', label: 'Settings' },
];

function Stat({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="dot" style={{ background: color }} />
      <span className="mono text-faint">{label}</span>
    </span>
  );
}

export default function TopNav({ summary, connected }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line" style={{ background: 'rgba(6,9,14,0.82)', backdropFilter: 'blur(10px)' }}>
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2.5" title="Home">
          <Logo size={22} />
          <span className="font-display uppercase tracking-[0.04em] text-[16px]">FleetView</span>
        </Link>
        <span className="label ml-1 pl-3 border-l border-line hidden md:inline">Mission Control</span>
        <nav className="flex items-center gap-1 ml-2">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-[11px] font-medium uppercase tracking-[0.08em] transition ${isActive ? 'bg-white/[0.07] text-ink' : 'text-faint hover:text-ink'}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-[11px]">
          {summary && (
            <div className="hidden sm:flex items-center gap-3.5">
              <Stat color="var(--online)" label={`${summary.online} ONLINE`} />
              {summary.offline > 0 && <Stat color="var(--offline)" label={`${summary.offline} OFFLINE`} />}
              {summary.active_alerts > 0 && <Stat color="var(--degraded)" label={`${summary.active_alerts} ALERTS`} />}
            </div>
          )}
          <span className="inline-flex items-center gap-1.5 mono" style={{ color: connected ? 'var(--online)' : 'var(--faint)' }}>
            <span className="dot live-dot" style={{ background: 'currentColor' }} />
            {connected ? 'LIVE' : '···'}
          </span>
        </div>
      </div>
    </header>
  );
}
