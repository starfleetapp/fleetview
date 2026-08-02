import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { geoNaturalEarth1, geoPath, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
import land110m from 'world-atlas/land-110m.json';

/**
 * TERMINAL MODE component kit — the operator-console skin for /app.
 *
 * Design rules (from the approved mockup, recoloured to the house blue):
 *  · monospace everywhere, uppercase micro-labels, character-grid alignment
 *  · CSS hairlines for panel frames (crisp at every DPI); box-drawing glyphs
 *    only as inline decoration, never load-bearing
 *  · status reads without colour: bracketed fixed-width tags [ OK ]/[WARN]/…
 *  · bars and meters are DIV-rendered, not font glyphs — block characters
 *    (▁▃▅█) have patchy coverage in Roboto Mono and would break the grid
 *  · phosphor is BLUE (brand); green/amber/red appear only as semantics
 */

/* ---------- status tags ---------- */
const TAGS = {
  online: { t: '  OK  ', c: 'var(--online)' },
  degraded: { t: ' WARN ', c: 'var(--degraded)' },
  offline: { t: ' FAIL ', c: 'var(--offline)' },
  obstructed: { t: ' OBST ', c: 'var(--degraded)' },
};
export function Tag({ status, obstructed }) {
  const k = status === 'degraded' && obstructed ? 'obstructed' : status;
  const s = TAGS[k] || TAGS.online;
  return (
    <span className="tui-tag" style={{ color: s.c, borderColor: 'currentColor' }}>
      [{s.t}]
    </span>
  );
}

/* ---------- panel with inset title ---------- */
export function TuiPanel({ title, right, children, className = '', pad = false }) {
  return (
    <section className={`tui-panel ${className}`}>
      <header className="tui-panel-head">
        <span className="tui-panel-title">┤ {title} ├</span>
        {right && <span className="tui-panel-right">{right}</span>}
      </header>
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

/* ---------- seeded decorative history bars (same trick MetricStrip used) ---------- */
function genSeries(seed, n = 22) {
  let s = (seed * 9301 + 49297) % 233280;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = []; let v = 0.45 + r() * 0.25;
  for (let i = 0; i < n; i++) { v += (r() - 0.48) * 0.24; v = Math.max(0.1, Math.min(0.95, v)); out.push(v); }
  return out;
}
export function Bars({ seed, color }) {
  const data = useMemo(() => genSeries(seed), [seed]);
  return (
    <div className="tui-bars" aria-hidden="true">
      {data.map((v, i) => (
        <span key={i} style={{ height: `${Math.round(v * 100)}%`, background: color, opacity: 0.34 + v * 0.5 }} />
      ))}
    </div>
  );
}

/* ---------- bracket meter [████████░░] 82.5% ---------- */
export function Meter({ frac, color }) {
  const SEG = 18;
  const on = Math.round(Math.max(0, Math.min(1, frac)) * SEG);
  return (
    <div className="tui-meter mono">
      <span className="tui-meter-brk">[</span>
      <span className="tui-meter-track">
        {Array.from({ length: SEG }, (_, i) => (
          <i key={i} style={i < on ? { background: color, opacity: 0.9 } : undefined} />
        ))}
      </span>
      <span className="tui-meter-brk">]</span>
      <span className="tui-meter-pct">{(frac * 100).toFixed(1)}%</span>
    </div>
  );
}

/* ---------- FLEET STATUS strip ---------- */
export function TuiStatStrip({ summary }) {
  if (!summary) return null;
  const t = Math.max(1, summary.total || 1);
  const cells = [
    { k: 'SITES ONLINE', v: summary.online, sub: `/${t}`, c: 'var(--online)', frac: summary.online / t },
    { k: 'DEGRADED', v: summary.degraded, sub: `/${t}`, c: 'var(--degraded)', frac: summary.degraded / t },
    { k: 'OFFLINE', v: summary.offline, sub: `/${t}`, c: 'var(--offline)', frac: summary.offline / t },
    { k: 'AVG LATENCY', v: summary.avg_latency_ms ?? '—', sub: ' ms', c: 'var(--tui-accent)', frac: Math.min((summary.avg_latency_ms || 0) / 120, 1) },
    { k: 'FLEET DOWNLINK', v: ((summary.total_downlink_bps || 0) / 1e9).toFixed(2), sub: ' Gbps', c: 'var(--tui-accent)', frac: Math.min((summary.total_downlink_bps || 0) / 8e9, 1) },
    { k: 'ACTIVE ALERTS', v: summary.active_alerts, sub: '', c: summary.active_alerts > 0 ? 'var(--degraded)' : 'var(--online)', frac: Math.min((summary.active_alerts || 0) / t, 1) },
  ];
  return (
    <TuiPanel title="FLEET STATUS">
      <div className="tui-stats">
        {cells.map((c, i) => (
          <div key={c.k} className="tui-stat">
            <div className="tui-label">{c.k}</div>
            <div className="tui-stat-v mono">
              <b style={{ color: c.c }}>{c.v}</b>
              <span>{c.sub}</span>
            </div>
            <Bars seed={i + 7} color={c.c} />
            <Meter frac={c.frac} color={c.c} />
          </div>
        ))}
      </div>
    </TuiPanel>
  );
}

/* ---------- dotted world map on canvas ---------- */
const landFeature = feature(land110m, land110m.objects.land);

export function TuiMap({ sites, onPick }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [coord, setCoord] = useState(null);
  const sitesRef = useRef(sites);
  sitesRef.current = sites;

  useEffect(() => {
    const cv = canvasRef.current, wrap = wrapRef.current;
    if (!cv || !wrap) return;
    let raf, sweepX = 0, projection, dots = [], W = 0, H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const build = () => {
      W = wrap.clientWidth; H = wrap.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = `${W}px`; cv.style.height = `${H}px`;
      projection = geoNaturalEarth1().fitExtent([[14, 12], [W - 14, H - 12]], { type: 'Sphere' });
      // sample land onto a dot grid via an offscreen mask
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const octx = off.getContext('2d');
      octx.fillStyle = '#fff';
      const p = geoPath(projection, octx);
      octx.beginPath(); p(landFeature); octx.fill();
      const img = octx.getImageData(0, 0, W, H).data;
      const step = Math.max(5, Math.round(W / 150));
      dots = [];
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          if (img[(y * W + x) * 4 + 3] > 100) dots.push([x, y]);
        }
      }
    };

    const draw = (ts) => {
      const ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const path = geoPath(projection, ctx);
      // sphere outline + graticule
      ctx.strokeStyle = 'rgba(110,160,255,0.16)'; ctx.lineWidth = 1;
      ctx.beginPath(); path({ type: 'Sphere' }); ctx.stroke();
      ctx.strokeStyle = 'rgba(110,160,255,0.07)';
      ctx.beginPath(); path(geoGraticule10()); ctx.stroke();
      // dotted land
      ctx.fillStyle = 'rgba(126,170,235,0.5)';
      for (const [x, y] of dots) ctx.fillRect(x, y, 1.4, 1.4);
      // sweep line
      if (!reduced) {
        sweepX = (ts / 24000 % 1) * W;
        const g = ctx.createLinearGradient(sweepX - 60, 0, sweepX, 0);
        g.addColorStop(0, 'rgba(78,161,255,0)');
        g.addColorStop(1, 'rgba(78,161,255,0.12)');
        ctx.fillStyle = g;
        ctx.fillRect(sweepX - 60, 0, 60, H);
      }
      // site markers
      ctx.font = 'bold 11px "Roboto Mono", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const blink = reduced ? 1 : (Math.floor(ts / 600) % 2 ? 1 : 0.35);
      for (const s of sitesRef.current) {
        const pt = projection([s.lon, s.lat]);
        if (!pt) continue;
        const bad = s.status !== 'online';
        ctx.fillStyle = s.status === 'offline' ? '#df5857' : s.status === 'degraded' ? '#d9a441' : '#45d08a';
        ctx.globalAlpha = bad ? blink : 0.95;
        ctx.fillText(s.status === 'offline' ? '✕' : '+', pt[0], pt[1]);
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(draw);
    };

    build();
    raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(() => build());
    ro.observe(wrap);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const onMove = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    setCoord([e.clientX - r.left, e.clientY - r.top]);
  };
  const coordText = useMemo(() => {
    if (!coord) return null;
    const W = canvasRef.current?.clientWidth || 1, H = canvasRef.current?.clientHeight || 1;
    const proj = geoNaturalEarth1().fitExtent([[14, 12], [W - 14, H - 12]], { type: 'Sphere' });
    const ll = proj.invert?.(coord);
    if (!ll || !isFinite(ll[0]) || Math.abs(ll[1]) > 90) return null;
    return { lat: `${Math.abs(ll[1]).toFixed(4)} ${ll[1] >= 0 ? 'N' : 'S'}`, lon: `${Math.abs(ll[0]).toFixed(4)} ${ll[0] >= 0 ? 'E' : 'W'}` };
  }, [coord]);

  const onClick = (e) => {
    if (!onPick) return;
    const r = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const W = canvasRef.current.clientWidth, H = canvasRef.current.clientHeight;
    const proj = geoNaturalEarth1().fitExtent([[14, 12], [W - 14, H - 12]], { type: 'Sphere' });
    let best = null, bd = 14 * 14;
    for (const s of sitesRef.current) {
      const pt = proj([s.lon, s.lat]);
      if (!pt) continue;
      const d = (pt[0] - x) ** 2 + (pt[1] - y) ** 2;
      if (d < bd) { bd = d; best = s; }
    }
    if (best) onPick(best);
  };

  return (
    <div ref={wrapRef} className="tui-map" onMouseMove={onMove} onMouseLeave={() => setCoord(null)} onClick={onClick}>
      <canvas ref={canvasRef} />
      <div className="tui-map-legend mono">
        <span><i style={{ color: 'var(--online)' }}>[  OK  ]</i> ONLINE</span>
        <span><i style={{ color: 'var(--degraded)' }}>[ WARN ]</i> DEGRADED</span>
        <span><i style={{ color: 'var(--offline)' }}>[ FAIL ]</i> OFFLINE</span>
      </div>
      {coordText && (
        <div className="tui-map-coord mono">
          <div>LAT: {coordText.lat}</div>
          <div>LON: {coordText.lon}</div>
        </div>
      )}
    </div>
  );
}

/* ---------- top bar ---------- */
function useUtc(withDate = false) {
  const [now, setNow] = useState('');
  useEffect(() => {
    const f = () => {
      const iso = new Date().toISOString();
      setNow(withDate ? `${iso.slice(0, 10)}  ${iso.slice(11, 19)}` : iso.slice(11, 19));
    };
    f();
    const iv = setInterval(f, 1000);
    return () => clearInterval(iv);
  }, [withDate]);
  return now;
}

export function TuiTopBar({ summary }) {
  const utc = useUtc();
  return (
    <header className="tui-top mono">
      <div className="tui-top-l">
        <span className="tui-brand">FLEETVIEW</span>
        <span className="tui-dim2">// MISSION CONTROL</span>
        <nav className="tui-nav">
          <NavLink to="/app" end className={({ isActive }) => isActive ? 'on' : ''}>{({ isActive }) => isActive ? '[FLEET]' : 'FLEET'}</NavLink>
          <NavLink to="/app/alerts" className={({ isActive }) => isActive ? 'on' : ''}>{({ isActive }) => isActive ? '[ALERTS]' : 'ALERTS'}</NavLink>
          <NavLink to="/app/settings" className={({ isActive }) => isActive ? 'on' : ''}>{({ isActive }) => isActive ? '[SETTINGS]' : 'SETTINGS'}</NavLink>
        </nav>
      </div>
      <div className="tui-top-r">
        {summary && (
          <>
            <span style={{ color: 'var(--online)' }}>{summary.online} ONLINE</span>
            <span className="hide-s" style={{ color: 'var(--degraded)' }}>{summary.degraded} DEGRADED</span>
            <span style={{ color: 'var(--offline)' }}>{summary.offline} OFFLINE</span>
            <span className="hide-s" style={{ color: 'var(--degraded)' }}>{summary.active_alerts} ALERTS</span>
            <span className="tui-dim2">│</span>
          </>
        )}
        <span className="tui-utc">{utc} UTC</span>
      </div>
    </header>
  );
}

/* ---------- bottom status bar ---------- */
export function TuiStatusBar({ connected }) {
  const { pathname } = useLocation();
  const utc = useUtc(true);
  const path = pathname === '/app' ? 'fleetview:/global/fleet'
    : pathname.startsWith('/app/site/') ? `fleetview:/site/${pathname.split('/').pop()}`
    : `fleetview:/${pathname.split('/').pop()}`;
  return (
    <footer className="tui-status mono">
      <span className="tui-status-path">{path}<span className="tui-cursor">█</span></span>
      <span className="tui-status-mid hide-s">UTC {utc}&nbsp;&nbsp;&nbsp;LINK:[<i style={{ color: connected ? 'var(--online)' : 'var(--degraded)' }}>{connected ? '  OK  ' : ' SYNC '}</i>]</span>
      <span className="tui-status-keys hide-m">[J/K] NAVIGATE&nbsp;&nbsp;[/] SEARCH&nbsp;&nbsp;[G] GOTO&nbsp;&nbsp;[R] REFRESH&nbsp;&nbsp;[?] HELP</span>
    </footer>
  );
}

/* ---------- [?] help overlay ---------- */
export function TuiHelp({ onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' || e.key === '?') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const KEYS = [
    ['J / ↓', 'Next site'], ['K / ↑', 'Previous site'], ['ENTER', 'Open selected site'],
    ['/', 'Focus search'], ['G', 'Command palette'], ['R', 'Refresh telemetry'],
    ['1–5', 'Filter by type'], ['?', 'Toggle this help'], ['ESC', 'Close / clear'],
  ];
  return (
    <div className="tui-help-veil" onClick={onClose}>
      <div className="tui-panel tui-help mono" onClick={(e) => e.stopPropagation()}>
        <header className="tui-panel-head"><span className="tui-panel-title">┤ KEYBOARD ├</span></header>
        <div className="p-5">
          {KEYS.map(([k, d]) => (
            <div key={k} className="tui-help-row">
              <span className="tui-key">{k}</span>
              <span className="tui-dots" aria-hidden="true" />
              <span className="tui-dim2">{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
