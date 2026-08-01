import { Link } from 'react-router-dom';
import { SectionHead, Terminal, SpecRow } from '../components/hud.jsx';

const SECTIONS = [
  ['quickstart', '01 · Quickstart'], ['install', '02 · Install the agent'], ['enroll', '03 · Enroll a site'],
  ['api', '04 · API reference'], ['alerts', '05 · Alerts & rules'], ['inject', '06 · Fault injection'], ['faq', '07 · FAQ'],
];
const ENDPOINTS = [
  ['GET', '/api/fleet', 'All sites + fleet summary'],
  ['GET', '/api/sites/:id', 'One site: status, detail, dish, events'],
  ['GET', '/api/sites/:id/history', 'Time-series telemetry (range=1h|6h|24h)'],
  ['GET', '/api/alerts', 'Active + resolved alerts'],
  ['GET', '/api/alert-rules', 'Alert rule definitions'],
  ['POST', '/api/enroll', 'Create a site, returns token + install command'],
];
const RULES = [
  ['Site offline', 'No telemetry received for the configured window.'],
  ['High latency', 'p95 ping latency over threshold for the window.'],
  ['High packet loss', 'Ping drop rate over threshold for the window.'],
  ['Obstruction', 'Sky-obstruction fraction over threshold.'],
];
const MODES = ['offline', 'obstructed', 'high_latency', 'degraded', 'thermal', 'normal'];

export default function Docs() {
  return (
    <div className="fade-in max-w-[1300px] mx-auto px-6 pt-16 pb-24 grid md:grid-cols-[220px_1fr] gap-12">
      <aside className="hidden md:block">
        <div className="sticky top-32">
          <div className="label mb-4" style={{ color: 'var(--accent)' }}>/ Documentation</div>
          <nav className="space-y-1">
            {SECTIONS.map(([id, t]) => (
              <a key={id} href={`#${id}`}
                className="block mono text-[11.5px] uppercase tracking-[0.1em] text-dim hover:text-ink transition py-1.5 border-b border-white/[0.04]">{t}</a>
            ))}
          </nav>
          <div className="label mt-8 opacity-60">SYS · DOCS · REV 2</div>
        </div>
      </aside>

      <div className="max-w-2xl space-y-16">
        <section id="quickstart" data-reveal>
          <div className="reveal label mb-3" style={{ color: 'var(--accent)' }}>/ 01</div>
          <h1 className="reveal font-display uppercase text-4xl tracking-[-0.01em] mb-4">Quickstart</h1>
          <p className="reveal text-dim leading-relaxed mb-5">Get a site streaming to FleetView in three steps.</p>
          <div className="reveal space-y-0">
            {[['01', 'Create a site and copy its enrollment token.'],
              ['02', 'Run the agent container on-site with that token.'],
              ['03', 'Watch the site appear live on your dashboard.']].map(([n, t]) => (
              <div key={n} className="flex items-baseline gap-4 py-2.5 border-b border-white/[0.05] text-[14px]">
                <span className="mono text-[11px]" style={{ color: 'var(--accent)' }}>{n}</span>
                <span className="text-dim">{t}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="install" data-reveal>
          <div className="reveal label mb-3" style={{ color: 'var(--accent)' }}>/ 02</div>
          <h2 className="reveal font-display uppercase text-2xl tracking-[-0.01em] mb-3">Install the agent</h2>
          <p className="reveal text-dim mb-5 text-[14px] leading-relaxed">One container per site. It polls the dish's local API and ships telemetry to the cloud.</p>
          <Terminal title="on-site device">{`$ docker run -d --restart=unless-stopped \\
    -e DISH_ADDR=192.168.100.1:9200 \\
    -e SITE_TOKEN=flv_your_token \\
    -e CLOUD_INGEST_URL=https://your-cloud/ingest \\
    fleetview-agent`}</Terminal>
        </section>

        <section id="enroll" data-reveal>
          <div className="reveal label mb-3" style={{ color: 'var(--accent)' }}>/ 03</div>
          <h2 className="reveal font-display uppercase text-2xl tracking-[-0.01em] mb-3">Enroll a site</h2>
          <p className="reveal text-dim text-[14px] leading-relaxed">In <span className="text-ink">Settings → Add a site</span>, enter a name, type and region. FleetView returns an enrollment token and a ready-to-run install command. Paste it on the on-site device and you're live.</p>
        </section>

        <section id="api" data-reveal>
          <div className="reveal label mb-3" style={{ color: 'var(--accent)' }}>/ 04</div>
          <h2 className="reveal font-display uppercase text-2xl tracking-[-0.01em] mb-4">API reference</h2>
          <p className="reveal text-dim text-[14px] mb-5 leading-relaxed">Read-only JSON over HTTPS. Every screen in the dashboard is backed by these endpoints.</p>
          <div className="reveal border border-white/[0.07]">
            {ENDPOINTS.map(([m, p, d]) => (
              <div key={p} className="flex items-center gap-3 py-2.5 px-4 text-[13px] border-b border-white/[0.05] last:border-b-0">
                <span className="mono text-[10px] w-11 shrink-0 px-1.5 py-0.5 text-center border"
                  style={{ color: m === 'GET' ? 'var(--online)' : 'var(--accent)', borderColor: 'rgba(255,255,255,0.12)' }}>{m}</span>
                <span className="mono text-ink truncate">{p}</span>
                <span className="text-faint ml-auto hidden sm:block text-right text-[12px]">{d}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="alerts" data-reveal>
          <div className="reveal label mb-3" style={{ color: 'var(--accent)' }}>/ 05</div>
          <h2 className="reveal font-display uppercase text-2xl tracking-[-0.01em] mb-4">Alerts & rules</h2>
          <p className="reveal text-dim text-[14px] mb-5 leading-relaxed">Rules evaluate rolling telemetry windows and fire to Slack and email. Toggle and tune them in the dashboard.</p>
          <div className="reveal">
            {RULES.map(([t, d]) => <SpecRow key={t} k={t} v={d} />)}
          </div>
        </section>

        <section id="inject" data-reveal>
          <div className="reveal label mb-3" style={{ color: 'var(--accent)' }}>/ 06</div>
          <h2 className="reveal font-display uppercase text-2xl tracking-[-0.01em] mb-3">Fault injection</h2>
          <p className="reveal text-dim text-[14px] mb-5 leading-relaxed">
            Running the stack locally? The simulator has a control plane for breaking
            dishes on purpose — watch the alert pipeline react end-to-end.
          </p>
          <Terminal title="simulator control plane · :8799">{`$ curl -X POST http://127.0.0.1:8799/scenario \\
    -H "content-type: application/json" \\
    -d '{"id":"mv-magellan","mode":"offline"}'

$ curl -X POST http://127.0.0.1:8799/scenario/reset`}</Terminal>
          <div className="reveal flex flex-wrap gap-2 mt-4">
            {MODES.map((m) => (
              <span key={m} className="mono text-[10.5px] uppercase tracking-[0.12em] px-2.5 py-1 border border-white/[0.1] text-dim">{m}</span>
            ))}
          </div>
        </section>

        <section id="faq" data-reveal>
          <div className="reveal label mb-3" style={{ color: 'var(--accent)' }}>/ 07</div>
          <h2 className="reveal font-display uppercase text-2xl tracking-[-0.01em] mb-3">FAQ</h2>
          <p className="reveal text-dim text-[14px] leading-relaxed">More questions? See <Link to="/pricing" className="text-ink underline-offset-2 hover:underline">Pricing</Link> or reach us from the <Link to="/company" className="text-ink underline-offset-2 hover:underline">Company</Link> page. Or just <Link to="/app" style={{ color: 'var(--accent)' }}>open the live demo</Link>.</p>
        </section>
      </div>
    </div>
  );
}
