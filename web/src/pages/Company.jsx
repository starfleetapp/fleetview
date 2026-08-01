import { Link } from 'react-router-dom';
import { COMPANY, entityLine, legalLinks } from '../lib/company.js';

const STATS = [['Sites monitored', 40, 0, ''], ['Avg uptime', 99.9, 1, '%'], ['Alert latency', 2, 0, 's'], ['Countries', 24, 0, '']];
const VALUES = [
  ['Real-time or nothing', 'A two-hour-old status is a guess. We built FleetView around live telemetry because downtime is measured in minutes, not hours.'],
  ['Built for the edge', 'Vessels, mines and outposts have bad networks and no IT staff. Our agent is tiny, resilient, and self-healing.'],
  ['Open by default', 'Clean APIs, no lock-in, multi-vendor by design. Your fleet data is yours.'],
];

export default function Company() {
  return (
    <div className="fade-in">
      <section data-reveal className="max-w-[1300px] mx-auto px-6 pt-24 pb-16">
        <div className="reveal label mb-4">Company</div>
        <h1 className="reveal font-display uppercase text-5xl sm:text-7xl leading-[0.9] tracking-[-0.01em] max-w-3xl">Keep every remote site online.</h1>
        <p className="reveal text-dim text-lg mt-6 max-w-xl leading-relaxed">FleetView started with a simple frustration: satellite internet is everywhere now, but seeing whether it's actually working — across a whole fleet, in real time — was nearly impossible. So we built the control room for it.</p>
      </section>

      <section data-reveal className="max-w-[1300px] mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map(([k, v, dec, u]) => (
          <div key={k} className="reveal">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-4xl sm:text-5xl tracking-[-0.02em]" data-count={v} data-dec={dec}>0</span>
              <span className="text-faint text-[13px]">{u}</span>
            </div>
            <div className="label mt-2">{k}</div>
          </div>
        ))}
      </section>

      <section data-reveal className="max-w-[1300px] mx-auto px-6 py-16">
        <h2 className="reveal font-display uppercase text-3xl sm:text-4xl tracking-[-0.01em] mb-12">What we believe</h2>
        <div className="grid md:grid-cols-3 gap-10">
          {VALUES.map(([t, d]) => (
            <div key={t} className="reveal">
              <h3 className="font-display uppercase text-lg mb-2">{t}</h3>
              <p className="text-dim text-[14px] leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Corporate details. Renders only once the entity is actually formed —
          see web/src/lib/company.js. */}
      {entityLine() && (
        <section data-reveal className="max-w-[1300px] mx-auto px-6 py-16 border-t border-line">
          <h2 className="reveal font-display uppercase text-3xl sm:text-4xl tracking-[-0.01em] mb-3">Legal entity</h2>
          <p className="reveal text-dim max-w-xl leading-relaxed mb-8">
            FleetView is a product of {COMPANY.name}. Contracts, invoices and
            support are provided by the company named below.
          </p>
          <div className="reveal max-w-xl border border-line rounded-xl overflow-hidden">
            {[
              ['Legal name', COMPANY.name],
              ['Entity type', 'Limited liability company'],
              ['Jurisdiction', COMPANY.jurisdiction],
              COMPANY.fileNumber && ['File number', COMPANY.fileNumber],
              COMPANY.formed && ['Formed', COMPANY.formed],
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} className="flex justify-between items-baseline gap-5 px-5 py-3.5 border-b border-line last:border-b-0">
                <span className="label">{k}</span>
                <span className="text-[13.5px] text-right">{v}</span>
              </div>
            ))}
          </div>
          {legalLinks().length > 0 && (
            <p className="reveal text-faint text-[13px] mt-5 flex gap-4">
              {legalLinks().map(([label, href]) => (
                <a key={label} href={href} className="hover:text-ink transition underline underline-offset-4">{label}</a>
              ))}
            </p>
          )}
        </section>
      )}

      <section data-reveal className="max-w-[1300px] mx-auto px-6 py-24 text-center">
        <h2 className="reveal font-display uppercase text-3xl sm:text-4xl tracking-[-0.01em] mb-3">Get in touch</h2>
        <p className="reveal text-dim mb-7">hello@fleetview.io</p>
        <Link to="/app" className="reveal btn btn-primary text-[15px]">See it live →</Link>
      </section>
    </div>
  );
}
