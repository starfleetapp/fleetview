import { Link } from 'react-router-dom';
import { SectionHead, Ticks, DataStrip } from '../components/hud.jsx';

const TIERS = [
  { code: 'TIER-01', name: 'Starter', price: '$29', unit: '/ site / mo', tag: 'Up to 10 sites', cta: 'Start free', features: ['Real-time telemetry', 'Slack & email alerts', '7-day history', 'Community support'] },
  { code: 'TIER-02', name: 'Growth', price: '$24', unit: '/ site / mo', tag: '10–50 sites', cta: 'Start free', featured: true, features: ['Everything in Starter', 'Automatic failover', 'REST API & webhooks', '90-day history', 'Priority support'] },
  { code: 'TIER-03', name: 'Enterprise', price: 'Custom', unit: '', tag: '50+ sites', cta: 'Contact sales', features: ['Everything in Growth', 'SSO & audit log', 'Custom SLA', 'Dedicated success eng', 'On-prem option'] },
];
const FAQ = [
  ['How is a "site" counted?', 'One site = one dish/terminal you monitor. Add or remove sites anytime; billing is prorated.'],
  ['Do I need special hardware?', 'No. A lightweight container runs on any device on-site and talks to the dish locally.'],
  ['Which dishes are supported?', 'Starlink terminals today. The agent is built to normalize multiple vendors over time.'],
  ['Is the demo real data?', 'The public demo runs a built-in fleet simulator so you can explore every state without hardware.'],
];

export default function Pricing() {
  return (
    <div className="fade-in">
      <section data-reveal className="max-w-[1300px] mx-auto px-6 pt-24 pb-12 text-center relative">
        <div className="reveal label absolute top-24 right-6 hidden md:block">FIG. 01 — COST MODEL</div>
        <div className="reveal label mb-4" style={{ color: 'var(--accent)' }}>/ Pricing</div>
        <h1 className="reveal font-display uppercase text-5xl sm:text-7xl leading-[0.9] tracking-[-0.01em]">Simple, per-site.</h1>
        <p className="reveal text-dim text-lg mt-5 max-w-xl mx-auto leading-relaxed">Pay only for the sites you watch. No setup fees, cancel anytime.</p>
      </section>

      <section data-reveal className="max-w-[1150px] mx-auto px-6 py-10 grid md:grid-cols-3 gap-5">
        {TIERS.map((t) => (
          <div key={t.name} className="reveal relative p-8 flex flex-col border"
            style={{
              borderColor: t.featured ? 'rgba(78,161,255,0.35)' : 'rgba(255,255,255,0.08)',
              background: t.featured ? 'linear-gradient(180deg, rgba(78,161,255,0.10), rgba(78,161,255,0.015))' : 'rgba(255,255,255,0.015)',
            }}>
            <Ticks opacity={t.featured ? 0.9 : 0.35} />
            <div className="flex items-center justify-between">
              <span className="font-display uppercase text-lg">{t.name}</span>
              <span className="label" style={t.featured ? { color: 'var(--accent)' } : {}}>{t.featured ? '▮ Popular' : t.code}</span>
            </div>
            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="font-display text-5xl tracking-[-0.02em]">{t.price}</span>
              <span className="mono text-faint text-[11px] uppercase tracking-wider">{t.unit}</span>
            </div>
            <div className="label mt-2">{t.tag}</div>
            <Link to="/app" className={`btn ${t.featured ? 'btn-primary' : ''} w-full mt-6 justify-center mono uppercase tracking-[0.14em] text-[11px]`}
              style={t.featured ? { border: '1px solid rgba(78,161,255,0.4)' } : { border: '1px solid rgba(255,255,255,0.12)' }}>{t.cta}</Link>
            <ul className="mt-7 space-y-0">
              {t.features.map((f) => (
                <li key={f} className="flex items-center gap-3 text-[13px] text-dim py-2.5 border-b border-white/[0.05] last:border-b-0">
                  <span className="mono text-[11px]" style={{ color: 'var(--accent)' }}>▸</span>{f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <DataStrip />

      <section data-reveal className="max-w-[860px] mx-auto px-6 py-20">
        <SectionHead index="02 — Questions" title="FAQ" />
        <div>
          {FAQ.map(([q, a], i) => (
            <div key={q} className="reveal py-6 border-b border-white/[0.06] grid sm:grid-cols-[52px_1fr] gap-x-6 gap-y-2">
              <div className="mono text-[12px] pt-0.5" style={{ color: 'var(--accent)' }}>{String(i + 1).padStart(2, '0')}</div>
              <div>
                <h3 className="text-ink font-medium mb-1.5">{q}</h3>
                <p className="text-dim text-[14px] leading-relaxed">{a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
