import { Link } from 'react-router-dom';
import { COMPANY, entityLine, legalLinks } from '../lib/company.js';
import { SectionHead, SpecRow, Ticks, FigBand, DataStrip } from '../components/hud.jsx';

const STATS = [['Sites monitored', 40, 0, ''], ['Avg uptime', 99.9, 1, '%'], ['Alert latency', 2, 0, 's'], ['Countries', 24, 0, '']];
const VALUES = [
  ['Real-time or nothing', 'A status you refresh once an hour is a guess. We built FleetView around live telemetry because downtime is measured in minutes, not hours.'],
  ['Built for the edge', 'Vessels, mines and outposts have bad networks and no IT staff. Our agent is tiny, resilient, and self-healing.'],
  ['Open by default', 'Clean APIs, no lock-in, multi-vendor by design. Your fleet data is yours.'],
];

export default function Company() {
  return (
    <div className="fade-in">
      <section data-reveal className="max-w-[1300px] mx-auto px-6 pt-24 pb-16 relative">
        <div className="reveal label absolute top-24 right-6 hidden md:block">FIG. 01 — OPERATIONS</div>
        <div className="reveal label mb-4" style={{ color: 'var(--accent)' }}>/ Company</div>
        <h1 className="reveal font-display uppercase text-5xl sm:text-7xl leading-[0.9] tracking-[-0.01em] max-w-3xl">Keep every remote site online.</h1>
        <p className="reveal text-dim text-lg mt-6 max-w-xl leading-relaxed">FleetView started with a simple frustration: satellite internet is everywhere now, but seeing whether it's actually working — across a whole fleet, in real time — was nearly impossible. So we built the control room for it.</p>
      </section>

      <section data-reveal className="max-w-[1300px] mx-auto px-6 pb-14 grid grid-cols-2 md:grid-cols-4 gap-5">
        {STATS.map(([k, v, dec, u]) => (
          <div key={k} className="reveal relative p-5 border border-white/[0.07]">
            <Ticks opacity={0.3} />
            <div className="flex items-baseline gap-1">
              <span className="font-display text-4xl sm:text-5xl tracking-[-0.02em]" data-count={v} data-dec={dec}>0</span>
              <span className="mono text-faint text-[11px] uppercase">{u}</span>
            </div>
            <div className="label mt-2">{k}</div>
          </div>
        ))}
      </section>

      <FigBand img="vessel.jpg" fig="FIG. 02 — SOUTHERN OCEAN"
        kicker="/ Why we exist" title="Where the internet ends"
        copy="The fleets that need connectivity most are the ones hardest to watch — vessels in the Drake Passage, mines past the last cell tower, stations at 66°N. That's the territory FleetView was built for."
        stats={[['40', 'Demo sites'], ['24', 'Countries'], ['0', 'IT staff required']]} />

      <section data-reveal className="max-w-[1300px] mx-auto px-6 py-20">
        <SectionHead index="02 — Principles" title="What we believe" fig="OPS · DOCTRINE · 03" />
        <div className="grid md:grid-cols-3 gap-5">
          {VALUES.map(([t, d]) => (
            <div key={t} className="reveal relative p-6 border border-white/[0.07]" style={{ background: 'rgba(255,255,255,0.015)' }}>
              <Ticks />
              <h3 className="font-display uppercase text-lg mb-2">{t}</h3>
              <p className="text-dim text-[14px] leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <DataStrip />

      {/* Corporate details. Renders only once the entity is actually formed —
          see web/src/lib/company.js. */}
      {entityLine() && (
        <section data-reveal className="max-w-[1300px] mx-auto px-6 py-20">
          <SectionHead index="03 — Legal entity" title="The company behind it" fig="REG · DE · US" />
          <p className="reveal text-dim max-w-xl leading-relaxed mb-10 text-[14px]">
            FleetView is a product of {COMPANY.name}. Contracts, invoices and
            support are provided by the company named below.
          </p>
          <div className="reveal max-w-xl relative border border-white/[0.07] p-6">
            <Ticks />
            {[
              ['Legal name', COMPANY.name],
              ['Entity type', 'Limited liability company'],
              ['Jurisdiction', COMPANY.jurisdiction],
              COMPANY.fileNumber && ['File number', COMPANY.fileNumber],
              COMPANY.formed && ['Formed', COMPANY.formed],
            ].filter(Boolean).map(([k, v]) => <SpecRow key={k} k={k} v={v} />)}
          </div>
          <p className="reveal mono text-[11px] uppercase tracking-[0.14em] mt-6 flex gap-5" style={{ color: 'var(--faint)' }}>
            {COMPANY.site && (
              <a href={COMPANY.site} target="_blank" rel="noopener" className="hover:text-ink transition underline underline-offset-4">{COMPANY.name} ↗</a>
            )}
            {legalLinks().map(([label, href]) => (
              <a key={label} href={href} className="hover:text-ink transition underline underline-offset-4">{label}</a>
            ))}
          </p>
        </section>
      )}

      <section data-reveal className="max-w-[1300px] mx-auto px-6 py-24 text-center border-t border-line">
        <div className="reveal label mb-4" style={{ color: 'var(--accent)' }}>/ Contact</div>
        <h2 className="reveal font-display uppercase text-3xl sm:text-4xl tracking-[-0.01em] mb-3">Get in touch</h2>
        <p className="reveal mono text-dim mb-7 text-[13px]">hello@fleetview.io</p>
        <Link to="/app" className="reveal btn btn-primary text-[15px]">See it live →</Link>
      </section>
    </div>
  );
}
