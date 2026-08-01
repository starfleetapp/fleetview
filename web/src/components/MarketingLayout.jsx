import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { animate, stagger } from 'animejs';
import { Logo } from './common.jsx';
import { COMPANY, entityLine, legalLinks } from '../lib/company.js';
import { TelemetryBar, DataStrip } from './hud.jsx';

const NAV = [['/product', 'Product'], ['/pricing', 'Pricing'], ['/docs', 'Docs'], ['/company', 'Company']];

function FooterCol({ title, links }) {
  return (
    <div>
      <div className="label mb-4">{title}</div>
      <ul className="space-y-2.5">
        {links.map(([to, label]) => (
          <li key={label}><Link to={to} className="text-dim hover:text-ink transition text-[13.5px]">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

export default function MarketingLayout() {
  const root = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          animate(en.target.querySelectorAll('.reveal'), { y: [24, 0], opacity: [0, 1], duration: 800, delay: stagger(85), ease: 'outExpo' });
          en.target.querySelectorAll('[data-count]').forEach((el) => {
            const tv = parseFloat(el.dataset.count); const dec = parseInt(el.dataset.dec || '0', 10);
            const o = { v: 0 };
            animate(o, { v: tv, duration: 1400, ease: 'out(3)', onUpdate: () => { el.textContent = o.v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); } });
          });
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    const els = root.current?.querySelectorAll('[data-reveal]') || [];
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return (
    <div ref={root} className="min-h-screen flex flex-col" style={{ background: 'var(--bg-0)' }}>
      <header className="sticky top-0 z-50" style={{ background: 'rgba(4,6,10,0.72)', backdropFilter: 'blur(12px)' }}>
        <TelemetryBar />
        <div className="max-w-[1300px] mx-auto px-6 h-16 flex items-center gap-2.5 border-b border-white/[0.06]">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={22} />
            <span className="font-display uppercase tracking-[0.04em] text-[15px]">FleetView</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 ml-10 mono uppercase tracking-[0.16em] text-[11px]">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `transition ${isActive ? 'text-ink' : 'text-dim hover:text-ink'}`}>{label}</NavLink>
            ))}
          </nav>
          <Link to="/app" className="btn btn-primary ml-auto text-[13px]">View dashboard</Link>
        </div>
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer style={{ background: 'var(--bg-1)' }}>
        <DataStrip />
        <div className="max-w-[1300px] mx-auto px-6 pt-14 overflow-hidden" aria-hidden="true">
          <div className="wordmark-outline" style={{ fontSize: 'clamp(64px, 12.5vw, 190px)', whiteSpace: 'nowrap' }}>FLEETVIEW</div>
        </div>
        <div className="max-w-[1300px] mx-auto px-6 py-16 grid sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10">
          <div>
            <div className="flex items-center gap-2.5"><Logo size={20} /><span className="font-display uppercase tracking-[0.04em] text-[14px]">FleetView</span></div>
            <p className="text-faint text-[13px] mt-3 max-w-[240px] leading-relaxed">Real-time monitoring and alerts for every Starlink site on Earth.</p>
          </div>
          <FooterCol title="Product" links={[['/product', 'Overview'], ['/pricing', 'Pricing'], ['/app', 'Live dashboard']]} />
          <FooterCol title="Resources" links={[['/docs', 'Documentation'], ['/company', 'Company']]} />
          <FooterCol title="Get started" links={[['/app', 'Open demo'], ['/company', 'Contact']]} />
        </div>
        <div className="max-w-[1300px] mx-auto px-6 py-6 flex flex-wrap gap-x-6 gap-y-2 items-center justify-between mono text-faint text-[11px] uppercase tracking-wide">
          <span>© {new Date().getFullYear()} {entityLine() ? COMPANY.name : 'FleetView'} · $29 / site / mo</span>
          {entityLine() && (
            <span className="normal-case tracking-normal flex flex-wrap gap-x-4 gap-y-1 items-center">
              <span>{entityLine()}</span>
              {legalLinks().map(([label, href]) => (
                <a key={label} href={href} className="hover:text-ink transition">{label}</a>
              ))}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
