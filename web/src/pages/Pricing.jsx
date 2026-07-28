import { Link } from 'react-router-dom';

const TIERS = [
  { name: 'Starter', price: '$29', unit: '/ site / mo', tag: 'Up to 10 sites', cta: 'Start free', features: ['Real-time telemetry', 'Slack & email alerts', '7-day history', 'Community support'] },
  { name: 'Growth', price: '$24', unit: '/ site / mo', tag: '10–50 sites', cta: 'Start free', featured: true, features: ['Everything in Starter', 'Automatic failover', 'REST API & webhooks', '90-day history', 'Priority support'] },
  { name: 'Enterprise', price: 'Custom', unit: '', tag: '50+ sites', cta: 'Contact sales', features: ['Everything in Growth', 'SSO & audit log', 'Custom SLA', 'Dedicated success eng', 'On-prem option'] },
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
      <section data-reveal className="max-w-[1300px] mx-auto px-6 pt-24 pb-12 text-center">
        <div className="reveal label mb-4">Pricing</div>
        <h1 className="reveal font-display uppercase text-5xl sm:text-7xl leading-[0.9] tracking-[-0.01em]">Simple, per-site.</h1>
        <p className="reveal text-dim text-lg mt-5 max-w-xl mx-auto leading-relaxed">Pay only for the sites you watch. No setup fees, cancel anytime.</p>
      </section>

      <section data-reveal className="max-w-[1150px] mx-auto px-6 py-10 grid md:grid-cols-3 gap-6">
        {TIERS.map((t) => (
          <div key={t.name} className="reveal p-8 rounded-2xl flex flex-col" style={{ background: t.featured ? 'linear-gradient(180deg, rgba(78,161,255,0.12), rgba(78,161,255,0.02))' : 'var(--bg-1)' }}>
            <div className="flex items-center gap-2.5">
              <span className="font-display uppercase text-lg">{t.name}</span>
              {t.featured && <span className="mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--accent)' }}>Popular</span>}
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="font-display text-5xl tracking-[-0.02em]">{t.price}</span>
              <span className="text-faint text-[13px]">{t.unit}</span>
            </div>
            <div className="text-dim text-[13px] mt-1.5">{t.tag}</div>
            <Link to="/app" className={`btn ${t.featured ? 'btn-primary' : ''} w-full mt-6 justify-center`} style={t.featured ? {} : { background: 'rgba(255,255,255,0.05)' }}>{t.cta}</Link>
            <ul className="mt-7 space-y-3">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-dim">
                  <span style={{ color: 'var(--accent)' }} className="mt-0.5">✓</span>{f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section data-reveal className="max-w-[760px] mx-auto px-6 py-20">
        <h2 className="reveal font-display uppercase text-3xl tracking-[-0.01em] mb-10">FAQ</h2>
        <div className="space-y-8">
          {FAQ.map(([q, a]) => (
            <div key={q} className="reveal">
              <h3 className="text-ink font-medium mb-1.5">{q}</h3>
              <p className="text-dim text-[14px] leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
