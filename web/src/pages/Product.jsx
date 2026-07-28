import { Link } from 'react-router-dom';

const FEATURES = [
  ['Real-time, not lagged', 'Live telemetry from every dish — latency, throughput, obstruction and uptime — with no two-hour Enterprise delay.'],
  ['One unified map', 'Maritime, mining, remote camps and ISP relays on a single globe. Click any site for full history.'],
  ['Alerts that fire', 'Offline, degraded, obstructed or high-latency — pushed to Slack and email the moment they happen.'],
  ['Automatic failover', 'Define backup links per site; FleetView flips to them and notifies you when the primary drops.'],
  ['Any dish, any vendor', 'Starlink today, multi-vendor tomorrow. One agent normalizes telemetry across hardware.'],
  ['Lightweight edge agent', 'A single container per site polls the dish locally and ships compact telemetry to the cloud.'],
];
const STEPS = [
  ['01', 'Install the agent', 'One container per site, one enrollment token. Live in minutes.'],
  ['02', 'Stream to the cloud', 'The agent polls the dish locally and ships telemetry in real time.'],
  ['03', 'Monitor & alert', 'Watch the fleet, get alerted, and act before the call comes in.'],
];

export default function Product() {
  return (
    <div className="fade-in">
      <section data-reveal className="max-w-[1300px] mx-auto px-6 pt-24 pb-16">
        <div className="reveal label mb-4">Product</div>
        <h1 className="reveal font-display uppercase text-5xl sm:text-7xl leading-[0.9] tracking-[-0.01em] max-w-3xl">Every dish.<br />One screen.</h1>
        <p className="reveal text-dim text-lg mt-6 max-w-xl leading-relaxed">FleetView turns every Starlink terminal in your fleet into a live, alertable data stream — on one mission-control dashboard.</p>
        <div className="reveal mt-8"><Link to="/app" className="btn btn-primary text-[14px]">Open the live demo →</Link></div>
      </section>

      <section data-reveal className="max-w-[1300px] mx-auto px-6 py-16">
        <div className="reveal label mb-10">Capabilities</div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
          {FEATURES.map(([t, d], i) => (
            <div key={t} className="reveal">
              <div className="mono text-[12px] mb-3" style={{ color: 'var(--accent)' }}>{String(i + 1).padStart(2, '0')}</div>
              <h3 className="font-display uppercase text-xl tracking-[-0.01em] mb-2">{t}</h3>
              <p className="text-dim text-[14px] leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section data-reveal className="max-w-[1300px] mx-auto px-6 py-16">
        <h2 className="reveal font-display uppercase text-3xl sm:text-4xl tracking-[-0.01em] mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-10">
          {STEPS.map(([n, t, d]) => (
            <div key={n} className="reveal">
              <div className="font-display text-4xl mb-3" style={{ color: 'var(--accent)' }}>{n}</div>
              <h3 className="font-display uppercase text-lg mb-2">{t}</h3>
              <p className="text-dim text-[14px] leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section data-reveal className="max-w-[1300px] mx-auto px-6 py-28 text-center">
        <h2 className="reveal font-display uppercase text-4xl sm:text-5xl tracking-[-0.01em]">See your whole fleet<br />in one screen.</h2>
        <div className="reveal mt-8"><Link to="/app" className="btn btn-primary text-[15px]">Enter live demo →</Link></div>
      </section>
    </div>
  );
}
