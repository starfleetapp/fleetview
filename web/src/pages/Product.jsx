import { Link } from 'react-router-dom';
import { SectionHead, SpecRow, Ticks, FigBand, DataStrip } from '../components/hud.jsx';

const FEATURES = [
  ['Real-time, not lagged', 'Latency, throughput, obstruction and uptime from every dish — polled on-site every 10 seconds and shipped every 3.'],
  ['One unified map', 'Maritime, mining, remote camps and ISP relays on a single globe. Click any site for full history.'],
  ['Alerts that fire', 'Offline, degraded, obstructed or high-latency — pushed to Slack and email the moment they happen.'],
  ['Automatic failover', 'Define backup links per site; FleetView flips to them and notifies you when the primary drops.'],
  ['Any dish, any vendor', 'Starlink today, multi-vendor tomorrow. One agent normalizes telemetry across hardware.'],
  ['Lightweight edge agent', 'A single container per site polls the dish locally and ships compact telemetry to the cloud.'],
];
/**
 * Comparison against Starlink's own first-party tooling.
 *
 * Ground rules for this table — do not loosen them:
 *  · FleetView is a monitoring layer ON TOP of Starlink service, not a
 *    replacement for it. The table compares tooling, never connectivity.
 *  · The Starlink column states only what is structurally certain (it is
 *    closed-source, first-party, SpaceX-hosted, tied to an active account).
 *    We do NOT assert absent features or latency figures we cannot verify —
 *    those would be unverified claims about a real company's product.
 *  · '—' means "not offered", 'n/a' means the row doesn't apply to them.
 */
const VERSUS = [
  ['Purpose', 'Fleet-wide monitoring layer', 'Account & service management'],
  ['Source code', 'Open — MIT licensed', 'Closed'],
  ['Self-hosting', 'Yes — run the whole stack', '—'],
  ['Where data lives', 'Your database', 'SpaceX platform'],
  ['Telemetry source', "Dish's local gRPC API, polled on-site", 'Starlink account / cloud'],
  ['Evaluate without hardware', 'Yes — 40-dish simulator included', 'Requires active service'],
  ['Fault simulation', '5 injectable failure modes', '—'],
  ['Multi-vendor path', 'Designed for it', 'Starlink hardware'],
  ['Cost', '$29 / site / month', 'Bundled with service plan'],
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
        <SectionHead index="04 — Comparison" title="FleetView vs. first-party tooling" fig="MONITORING LAYER · NOT CONNECTIVITY" />
        <p className="reveal text-dim text-[14px] max-w-2xl leading-relaxed mb-10">
          FleetView doesn't replace Starlink — it watches it. SpaceX provides the
          connectivity and the terminals; FleetView is the operations layer that
          sits on top of them, across a whole fleet. Here's how the tooling differs.
        </p>

        <div className="reveal relative border border-white/[0.07] overflow-x-auto">
          <Ticks />
          <table className="w-full text-[13.5px] min-w-[620px]">
            <thead>
              <tr className="border-b border-white/[0.1]">
                <th className="label text-left font-normal p-4">Capability</th>
                <th className="label text-left font-normal p-4" style={{ color: 'var(--accent)' }}>FleetView</th>
                <th className="label text-left font-normal p-4">Starlink first-party</th>
              </tr>
            </thead>
            <tbody>
              {VERSUS.map(([cap, ours, theirs]) => (
                <tr key={cap} className="border-b border-white/[0.05] last:border-b-0">
                  <td className="p-4 text-dim">{cap}</td>
                  <td className="p-4 text-ink">{ours}</td>
                  <td className="p-4 text-faint">{theirs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="reveal label mt-5 leading-relaxed max-w-2xl opacity-70">
          Starlink and SpaceX are trademarks of Space Exploration Technologies Corp.
          FleetView is an independent product, not affiliated with or endorsed by SpaceX.
          Comparison reflects tooling architecture, not connectivity or service quality.
        </p>

        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {[
            ['Run it yourself', 'The whole stack — simulator, agent, backend, dashboard — is MIT-licensed and self-hostable. Your telemetry stays in your database, on your infrastructure. Nothing about your fleet has to leave your control.'],
            ['Evaluate in ten seconds', 'One command boots 40 simulated dishes. You can assess the product, wire up alerting and test your runbook before buying a single terminal — no hardware, no account, no sales call.'],
            ['Break it on purpose', 'Five injectable failure modes let you rehearse the bad day: a vessel going dark mid-ocean, an obstruction creeping in, a thermal throttle. Most monitoring tools make you wait for a real outage to find out whether your alerts work.'],
          ].map(([t, d]) => (
            <div key={t} className="reveal relative p-6 border border-white/[0.07]" style={{ background: 'rgba(255,255,255,0.015)' }}>
              <Ticks />
              <h3 className="font-display uppercase text-lg mb-2">{t}</h3>
              <p className="text-dim text-[14px] leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section data-reveal className="max-w-[1300px] mx-auto px-6 py-20 border-t border-line">
        <SectionHead index="05 — Deployment" title="How it works" />
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
