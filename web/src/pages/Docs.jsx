import { Link } from 'react-router-dom';

const SECTIONS = [
  ['quickstart', 'Quickstart'], ['install', 'Install the agent'], ['enroll', 'Enroll a site'],
  ['api', 'API reference'], ['alerts', 'Alerts & rules'], ['faq', 'FAQ'],
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

function CodeBlock({ children }) {
  return <pre className="reveal mono text-[12.5px] text-dim p-4 rounded-xl overflow-x-auto leading-relaxed" style={{ background: 'var(--bg-1)' }}>{children}</pre>;
}

export default function Docs() {
  return (
    <div className="fade-in max-w-[1300px] mx-auto px-6 pt-16 pb-24 grid md:grid-cols-[200px_1fr] gap-12">
      <aside className="hidden md:block">
        <div className="sticky top-24">
          <div className="label mb-4">Documentation</div>
          <nav className="space-y-2.5">
            {SECTIONS.map(([id, t]) => <a key={id} href={`#${id}`} className="block text-[13.5px] text-dim hover:text-ink transition">{t}</a>)}
          </nav>
        </div>
      </aside>

      <div className="max-w-2xl space-y-16">
        <section id="quickstart" data-reveal>
          <h1 className="reveal font-display uppercase text-4xl tracking-[-0.01em] mb-4">Quickstart</h1>
          <p className="reveal text-dim leading-relaxed mb-4">Get a site streaming to FleetView in three steps.</p>
          <ol className="reveal space-y-2 text-dim text-[14px] list-decimal pl-5 leading-relaxed">
            <li>Create a site and copy its enrollment token.</li>
            <li>Run the agent container on-site with that token.</li>
            <li>Watch the site appear live on your dashboard.</li>
          </ol>
        </section>

        <section id="install" data-reveal>
          <h2 className="reveal font-display uppercase text-2xl tracking-[-0.01em] mb-3">Install the agent</h2>
          <p className="reveal text-dim mb-4 text-[14px] leading-relaxed">One container per site. It polls the dish's local API and ships telemetry to the cloud.</p>
          <CodeBlock>{`docker run -d --restart=unless-stopped \\
  -e DISH_ADDR=192.168.100.1:9200 \\
  -e SITE_TOKEN=flv_your_token \\
  -e CLOUD_INGEST_URL=https://your-cloud/ingest \\
  fleetview-agent`}</CodeBlock>
        </section>

        <section id="enroll" data-reveal>
          <h2 className="reveal font-display uppercase text-2xl tracking-[-0.01em] mb-3">Enroll a site</h2>
          <p className="reveal text-dim text-[14px] leading-relaxed">In <span className="text-ink">Settings → Add a site</span>, enter a name, type and region. FleetView returns an enrollment token and a ready-to-run install command. Paste it on the on-site device and you're live.</p>
        </section>

        <section id="api" data-reveal>
          <h2 className="reveal font-display uppercase text-2xl tracking-[-0.01em] mb-4">API reference</h2>
          <p className="reveal text-dim text-[14px] mb-5 leading-relaxed">Read-only JSON over HTTPS. Every screen in the dashboard is backed by these endpoints.</p>
          <div>
            {ENDPOINTS.map(([m, p, d]) => (
              <div key={p} className="reveal flex items-center gap-3 py-2.5 text-[13px]">
                <span className="mono text-[11px] w-12 shrink-0" style={{ color: 'var(--accent)' }}>{m}</span>
                <span className="mono text-ink truncate">{p}</span>
                <span className="text-faint ml-auto hidden sm:block text-right">{d}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="alerts" data-reveal>
          <h2 className="reveal font-display uppercase text-2xl tracking-[-0.01em] mb-4">Alerts & rules</h2>
          <p className="reveal text-dim text-[14px] mb-5 leading-relaxed">Rules evaluate rolling telemetry windows and fire to Slack and email. Toggle and tune them in the dashboard.</p>
          <div className="space-y-4">
            {RULES.map(([t, d]) => (
              <div key={t} className="reveal">
                <div className="font-medium text-[14px] mb-0.5">{t}</div>
                <div className="text-dim text-[13.5px]">{d}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" data-reveal>
          <h2 className="reveal font-display uppercase text-2xl tracking-[-0.01em] mb-3">FAQ</h2>
          <p className="reveal text-dim text-[14px] leading-relaxed">More questions? See <Link to="/pricing" className="text-ink underline-offset-2 hover:underline">Pricing</Link> or reach us from the <Link to="/company" className="text-ink underline-offset-2 hover:underline">Company</Link> page. Or just <Link to="/app" style={{ color: 'var(--accent)' }}>open the live demo</Link>.</p>
        </section>
      </div>
    </div>
  );
}
