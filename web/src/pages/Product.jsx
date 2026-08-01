import { Link } from 'react-router-dom';
import { SectionHead, SpecRow, Ticks, FigBand, DataStrip } from '../components/hud.jsx';

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
/* Real defaults from agent/agent.js — this is a datasheet, not copywriting. */
const AGENT_SPEC_LEFT = [
  ['Form factor', 'Single container'],
  ['Dish link', 'Local gRPC · 192.168.100.1'],
  ['Status poll', 'Every 10 s'],
  ['History poll', 'Every 30 s'],
];
const AGENT_SPEC_RIGHT = [
  ['Obstruction map', 'Every 5 min'],
  ['Uplink cadence', 'Every 3 s'],
  ['Outage buffer', '50,000 samples'],
  ['Recovery', 'Store & forward'],
];

export default function Product() {
  return (
    <div className="fade-in">
      <section data-reveal className="max-w-[1300px] mx-auto px-6 pt-24 pb-16 relative">
        <div className="reveal label absolute top-24 right-6 hidden md:block">FIG. 01 — PRODUCT OVERVIEW</div>
        <div className="reveal label mb-4" style={{ color: 'var(--accent)' }}>/ Product</div>
        <h1 className="reveal font-display uppercase text-5xl sm:text-7xl leading-[0.9] tracking-[-0.01em] max-w-3xl">Every dish.<br />One screen.</h1>
        <p className="reveal text-dim text-lg mt-6 max-w-xl leading-relaxed">FleetView turns every Starlink terminal in your fleet into a live, alertable data stream — on one mission-control dashboard.</p>
        <div className="reveal mt-8"><Link to="/app" className="btn btn-primary text-[14px]">Open the live demo →</Link></div>
      </section>

      <FigBand img="orbit.jpg" fig="FIG. 02 — LEO DOWNLINK"
        kicker="/ The layer above" title="Watching the watchers"
        copy="Your dishes talk to satellites 550 km up. FleetView watches the conversation from the ground — every handshake, every dropout, every degraded pass."
        stats={[['550', 'KM LEO shell'], ['10s', 'Status poll'], ['3s', 'Uplink cadence']]} />

      <section data-reveal className="max-w-[1300px] mx-auto px-6 py-20">
        <SectionHead index="02 — Capabilities" title="What it does" fig="SYS · CAP · 06 MODULES" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(([t, d], i) => (
            <div key={t} className="reveal relative p-6 border border-white/[0.07]" style={{ background: 'rgba(255,255,255,0.015)' }}>
              <Ticks />
              <div className="mono text-[12px] mb-3" style={{ color: 'var(--accent)' }}>{String(i + 1).padStart(2, '0')}</div>
              <h3 className="font-display uppercase text-xl tracking-[-0.01em] mb-2">{t}</h3>
              <p className="text-dim text-[14px] leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <DataStrip />

      <section data-reveal className="max-w-[1300px] mx-auto px-6 py-20">
        <SectionHead index="03 — Edge agent" title="The datasheet" fig="AGENT · DEFAULTS · VERIFIED" />
        <p className="reveal text-dim text-[14px] max-w-xl leading-relaxed mb-10">
          These are the agent's actual shipping defaults — not marketing numbers.
          Every value below is configurable per site.
        </p>
        <div className="grid md:grid-cols-2 gap-x-14">
          <div className="reveal">{AGENT_SPEC_LEFT.map(([k, v]) => <SpecRow key={k} k={k} v={v} />)}</div>
          <div className="reveal">{AGENT_SPEC_RIGHT.map(([k, v]) => <SpecRow key={k} k={k} v={v} />)}</div>
        </div>
      </section>

      <section data-reveal className="max-w-[1300px] mx-auto px-6 py-20 border-t border-line">
        <SectionHead index="04 — Deployment" title="How it works" />
        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map(([n, t, d]) => (
            <div key={n} className="reveal relative p-6 border border-white/[0.07]">
              <Ticks />
              <div className="font-display text-4xl mb-3" style={{ color: 'var(--accent)' }}>{n}</div>
              <h3 className="font-display uppercase text-lg mb-2">{t}</h3>
              <p className="text-dim text-[14px] leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section data-reveal className="px-6 py-28 text-center border-t border-line">
        <div className="reveal label mb-4" style={{ color: 'var(--accent)' }}>/ Ready</div>
        <h2 className="reveal font-display uppercase text-4xl sm:text-5xl tracking-[-0.01em]">See your whole fleet<br />in one screen.</h2>
        <div className="reveal mt-8"><Link to="/app" className="btn btn-primary text-[15px]">Enter live demo →</Link></div>
      </section>
    </div>
  );
}
