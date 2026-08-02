import { useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, Outlet, useOutletContext, useNavigate } from 'react-router-dom';
import { TuiTopBar, TuiStatusBar, TuiCommandBar } from './components/tui.jsx';
import Overview from './pages/Overview.jsx';
import SiteDetail from './pages/SiteDetail.jsx';
import Alerts from './pages/Alerts.jsx';
import Settings from './pages/Settings.jsx';
import SatelliteLanding from './pages/SatelliteLanding.jsx';
import MarketingLayout from './components/MarketingLayout.jsx';
import Product from './pages/Product.jsx';
import Pricing from './pages/Pricing.jsx';
import Docs from './pages/Docs.jsx';
import Company from './pages/Company.jsx';
import { ToastProvider, LiveAlertFeed } from './components/Toast.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import { getJSON, connectWS } from './lib/api.js';

function computeSummary(sites, activeAlerts) {
  const c = { online: 0, degraded: 0, offline: 0 };
  let latSum = 0, latN = 0, down = 0;
  for (const s of sites) {
    c[s.status] = (c[s.status] || 0) + 1;
    if (s.status !== 'offline' && s.ping_latency_ms != null) { latSum += s.ping_latency_ms; latN++; }
    if (s.status !== 'offline' && s.downlink_bps) down += s.downlink_bps;
  }
  return { total: sites.length, ...c, avg_latency_ms: latN ? Math.round(latSum / latN) : null, total_downlink_bps: down, active_alerts: activeAlerts };
}

const STATUS_COLOR = { online: 'var(--online)', degraded: 'var(--degraded)', offline: 'var(--offline)' };
const fmtMbps = (b) => (b == null ? '—' : `${(b / 1e6).toFixed(0)}Mbps`);

function useFleet() {
  const [sites, setSites] = useState([]);
  const [serverAlerts, setServerAlerts] = useState(0);
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState([]);
  const lastStatus = useRef(new Map());
  const lastTelAt = useRef(0);
  useEffect(() => {
    let alive = true;
    const load = () => getJSON('/api/fleet')
      .then((d) => {
        if (!alive) return;
        setSites(d.sites);
        setServerAlerts(d.summary.active_alerts);
        // Seed known statuses from the full fleet, otherwise the first delta
        // for a site has nothing to compare against and a genuine transition
        // is logged as an ordinary telemetry line.
        for (const s of d.sites) if (!lastStatus.current.has(s.id)) lastStatus.current.set(s.id, s.status);
      })
      .catch(() => {});
    load();
    // [R] in terminal mode dispatches this for an on-demand refetch
    window.addEventListener('fleet-refresh', load);
    const poll = setInterval(load, 30000);
    const off = connectWS(
      (msg) => {
        if (msg.type === 'status') {
          const s = msg.site;
          setSites((prev) => {
            const i = prev.findIndex((x) => x.id === s.id);
            if (i < 0) return prev;
            const n = prev.slice();
            n[i] = s;
            return n;
          });
          // rolling event stream — call out transitions, otherwise telemetry
          const prevStatus = lastStatus.current.get(s.id);
          lastStatus.current.set(s.id, s.status);
          const now = Date.now();
          const time = new Date().toISOString().slice(11, 19);
          const changed = prevStatus && prevStatus !== s.status;
          // Transitions always log. Routine telemetry is throttled — the raw
          // feed runs ~3 lines/sec, which is unreadable and scrolls a real
          // event off screen within seconds.
          if (!changed && now - lastTelAt.current < 900) return;
          if (!changed) lastTelAt.current = now;
          const entry = changed
            ? { key: `${s.id}-${now}-c`, kind: 'change', time, site: (s.name || '').toUpperCase(),
                from: prevStatus.toUpperCase(), to: s.status.toUpperCase(), color: STATUS_COLOR[s.status] }
            : { key: `${s.id}-${now}`, kind: 'tel', time, site: (s.name || '').toUpperCase(),
                msg: s.status === 'offline'
                  ? 'NO TELEMETRY — LINK DOWN'
                  : `LAT ${Math.round(s.ping_latency_ms || 0)}ms  LOSS ${((s.ping_drop_rate || 0) * 100).toFixed(1)}%  DOWN ${fmtMbps(s.downlink_bps)}` };
          setLog((prev) => [entry, ...prev].slice(0, 120));
        } else if (msg.type === 'alert') {
          load();
        }
      },
      () => setConnected(true),
    );
    return () => { alive = false; clearInterval(poll); window.removeEventListener('fleet-refresh', load); off(); };
  }, []);
  const summary = useMemo(() => computeSummary(sites, serverAlerts), [sites, serverAlerts]);
  return { sites, summary, connected, log };
}

function DashboardLayout() {
  const fleet = useFleet();
  return (
    <div className="tui min-h-full">
      <TuiTopBar summary={fleet.summary} />
      <main className="mx-auto max-w-[1560px] px-4 sm:px-6 pb-24 pt-7">
        <Outlet context={fleet} />
      </main>
      <TuiCommandBar />
      <TuiStatusBar connected={fleet.connected} />
      <LiveAlertFeed />
    </div>
  );
}

function OverviewRoute() {
  const fleet = useOutletContext();
  return <Overview sites={fleet.sites} summary={fleet.summary} log={fleet.log} />;
}

export default function App() {
  const navigate = useNavigate();
  return (
    <ToastProvider>
      <CommandPalette />
      <Routes>
      <Route path="/" element={<SatelliteLanding onEnter={() => navigate('/app')} />} />
      <Route element={<MarketingLayout />}>
        <Route path="/product" element={<Product />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/company" element={<Company />} />
      </Route>
      <Route path="/app" element={<DashboardLayout />}>
        <Route index element={<OverviewRoute />} />
        <Route path="site/:id" element={<SiteDetail />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      </Routes>
    </ToastProvider>
  );
}
