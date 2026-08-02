import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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

/* ---------- character-grid plot ----------
   Classic textplot: each cell holds 8 sub-levels via ▁▂▃▄▅▆▇█, so an 8-row
   plot resolves 64 steps. Rendered as <pre> so it stays on the character grid
   at any zoom, unlike a canvas. */
const EIGHTHS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇'];

export function TuiPlot({ data, field, unit, color = 'var(--tui-accent)', rows = 8, cols = 72 }) {
  const { lines, hi, mid, lo, tStart, tEnd, empty } = useMemo(() => {
    const pts = (data || []).filter((p) => p[field] != null);
    if (pts.length < 2) return { empty: true };
    // bucket into `cols` columns, average each
    const buckets = Array.from({ length: cols }, () => []);
    const t0 = pts[0].ts, t1 = pts[pts.length - 1].ts, span = Math.max(1, t1 - t0);
    for (const p of pts) {
      const i = Math.min(cols - 1, Math.floor(((p.ts - t0) / span) * cols));
      buckets[i].push(p[field]);
    }
    let last = pts[0][field];
    const vals = buckets.map((b) => {
      if (!b.length) return last;
      last = b.reduce((a, c) => a + c, 0) / b.length;
      return last;
    });
    // Scale around the midpoint with a MINIMUM span. A near-flat series
    // (a rock-steady link) would otherwise map every sample to frac 0 and
    // render an empty plot — steady must look steady, not broken.
    const max = Math.max(...vals), min = Math.min(...vals);
    const mid0 = (max + min) / 2;
    const half = Math.max((max - min) / 2, Math.abs(mid0) * 0.08, 0.5);
    const top = mid0 + half * 1.3;
    const bot = Math.max(0, mid0 - half * 1.3);
    const grid = [];
    for (let r = rows - 1; r >= 0; r--) {
      let line = '';
      for (let c = 0; c < cols; c++) {
        const frac = (vals[c] - bot) / (top - bot || 1);
        const eighths = Math.max(0, Math.round(frac * rows * 8) - r * 8);
        line += eighths >= 8 ? '█' : EIGHTHS[Math.max(0, eighths)];
      }
      grid.push(line);
    }
    const fmt = (v) => (v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(0) : v.toFixed(1));
    const hhmm = (ts) => new Date(ts).toISOString().slice(11, 16);
    return { lines: grid, hi: fmt(top), mid: fmt((top + bot) / 2), lo: fmt(bot), tStart: hhmm(t0), tEnd: hhmm(t1) };
  }, [data, field, rows, cols]);

  if (empty) return <div className="tui-plot-empty tui-dim2">AWAITING TELEMETRY…</div>;

  return (
    <div className="tui-plot">
      <div className="tui-plot-body">
        <div className="tui-plot-axis mono">
          <span>{hi}</span><span>{mid}</span><span>{lo}</span>
        </div>
        <pre className="tui-plot-canvas" style={{ color }} aria-hidden="true">{lines.join('\n')}</pre>
      </div>
      <div className="tui-plot-foot mono">
        <span>└{'─'.repeat(10)}</span>
        <span>{tStart}</span>
        <span className="tui-dim2">{unit}</span>
        <span>{tEnd}</span>
        <span>{'─'.repeat(10)}┘</span>
      </div>
    </div>
  );
}

/* ---------- sky obstruction as a character density grid ----------
   The dish reports an SNR cell grid — it maps to characters directly, which
   is both more legible and more on-theme than the tilted radar dome. */
export function TuiSky({ data }) {
  const rowsOut = useMemo(() => {
    if (!data?.snr?.length) return null;
    const C = data.num_cols, R = data.num_rows, snr = data.snr;
    // A character cell is ~0.6em wide by ~1.06em tall, so the grid needs
    // ~1.77x more columns than rows to read as a circle rather than an ellipse.
    const OH = 20, OW = 35;
    const out = [];
    for (let oy = 0; oy < OH; oy++) {
      const cells = [];
      for (let ox = 0; ox < OW; ox++) {
        const sx = Math.floor((ox / OW) * C), sy = Math.floor((oy / OH) * R);
        const v = snr[sy * C + sx];
        const nx = (ox / (OW - 1)) * 2 - 1, ny = (oy / (OH - 1)) * 2 - 1;
        const rad = Math.hypot(nx, ny);
        if (rad > 1.02) { cells.push({ ch: ' ' }); continue; }
        if (rad > 0.93) { cells.push({ ch: '·', dim: true }); continue; }   // horizon ring
        if (v == null || v < 0) { cells.push({ ch: '·', dim: true }); continue; }
        if (v < 0.25) { cells.push({ ch: '✕', bad: true }); continue; }
        // five density levels + matching opacity, so a uniformly clear sky
        // still shows texture instead of one flat slab of colour
        const lv = v > 0.85 ? 0 : v > 0.7 ? 1 : v > 0.55 ? 2 : v > 0.4 ? 3 : 4;
        cells.push({ ch: '█▓▒░·'[lv], op: [0.95, 0.78, 0.6, 0.45, 0.32][lv] });
      }
      out.push(cells);
    }
    return out;
  }, [data]);

  if (!rowsOut) return <div className="tui-plot-empty tui-dim2">NO OBSTRUCTION MAP</div>;
  return (
    <div className="tui-sky mono">
      {rowsOut.map((cells, i) => (
        <div key={i}>
          {cells.map((c, j) => (
            <span key={j} style={c.bad ? { color: 'var(--offline)' } : c.dim ? { color: 'var(--tui-faint)', opacity: 0.5 } : { opacity: c.op }}>{c.ch}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------- key/value spec rows ---------- */
export function TuiKV({ rows }) {
  return (
    <dl className="tui-kv mono">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
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

/* ---------- live event stream ----------
   Fed by real WebSocket status deltas. State transitions are called out;
   everything else is a telemetry line. This is what makes it feel alive. */
export function TuiFeed({ log, rows = 9 }) {
  const shown = (log || []).slice(0, rows);
  return (
    <div className="tui-feed mono">
      {shown.length === 0 && <div className="tui-feed-row tui-dim2">AWAITING TELEMETRY STREAM…<span className="tui-cursor">█</span></div>}
      {shown.map((e) => (
        <div key={e.key} className="tui-feed-row" data-kind={e.kind}>
          <span className="tui-feed-ts">{e.time}</span>
          {e.kind === 'change' ? (
            <>
              <span style={{ color: e.color }}>▲ STATE</span>
              <span className="tui-feed-site">{e.site}</span>
              <span className="tui-feed-msg" style={{ color: e.color }}>{e.from} → {e.to}</span>
            </>
          ) : (
            <>
              <span className="tui-dim2">·</span>
              <span className="tui-feed-site">{e.site}</span>
              <span className="tui-feed-msg tui-dim2">{e.msg}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------- ':' command bar ----------
   Real commands against the demo layer — inject / reset / goto / help.
   Falls back to instructions when no injectable backend is present. */
const HELP_LINES = [
  'inject <site> <mode>   break a dish on purpose',
  '  modes: offline obstructed high_latency degraded thermal normal',
  'reset                  restore every injected site',
  'goto <site>            open a site scope',
  'clear                  clear this output',
];

export function TuiCommandBar() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [out, setOut] = useState([]);
  const inputRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    const h = (e) => {
      const t = e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA') return;
      if (e.key === ':' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const say = (text, tone) => setOut((p) => [{ id: Math.random(), text, tone }, ...p].slice(0, 6));

  const resolveSite = (token) => {
    const api = window.__fvDemo;
    if (!api) return null;
    const q = token.toLowerCase();
    const list = api.sites();
    return list.find((s) => s.id === q)
      || list.find((s) => s.id.includes(q))
      || list.find((s) => s.name.toLowerCase().includes(q.replace(/-/g, ' ')));
  };

  const run = (raw) => {
    const [cmd, ...args] = raw.trim().split(/\s+/);
    if (!cmd) return;
    const api = window.__fvDemo;

    if (cmd === 'help' || cmd === '?') { HELP_LINES.forEach((l) => say(l)); return; }
    if (cmd === 'clear') { setOut([]); return; }

    if (cmd === 'goto' || cmd === 'g') {
      const s = resolveSite(args[0] || '');
      if (!s) return say(`no such site: ${args[0] || ''}`, 'err');
      nav(`/app/site/${s.id}`); setOpen(false); return;
    }

    if (cmd === 'reset') {
      if (!api) return say('injection needs the local simulator — see docs', 'err');
      const r = api.reset();
      return say(`restored ${r.restored} site(s) to nominal`, 'ok');
    }

    if (cmd === 'inject' || cmd === 'i') {
      if (!api) {
        say('this build has no injectable backend.', 'err');
        return say('run locally, then: curl -X POST :8799/scenario -d \'{"id":"…","mode":"offline"}\'');
      }
      const s = resolveSite(args[0] || '');
      if (!s) return say(`no such site: ${args[0] || ''}`, 'err');
      const mode = (args[1] || 'offline').toLowerCase();
      const r = api.inject(s.id, mode);
      if (!r.ok) return say(r.error, 'err');
      return say(`injected ${mode} → ${r.site}`, 'ok');
    }

    say(`unknown command: ${cmd} — try 'help'`, 'err');
  };

  if (!open) return null;
  return (
    <div className="tui-cmd mono">
      {out.length > 0 && (
        <div className="tui-cmd-out">
          {out.map((o) => (
            <div key={o.id} style={{ color: o.tone === 'err' ? 'var(--offline)' : o.tone === 'ok' ? 'var(--online)' : 'var(--tui-dim)' }}>
              {o.text}
            </div>
          ))}
        </div>
      )}
      <div className="tui-cmd-line">
        <span className="tui-cmd-prompt">:</span>
        <input ref={inputRef} value={value} spellCheck={false} autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { run(value); setValue(''); }
            else if (e.key === 'Escape') { setOpen(false); setValue(''); }
            e.stopPropagation();
          }}
          placeholder="inject mv-magellan offline    ·    help    ·    esc to close" />
      </div>
    </div>
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
    ['/', 'Focus search'], [':', 'Command bar'], ['G', 'Command palette'],
    ['R', 'Refresh telemetry'], ['A', 'Acknowledge (alerts)'], ['1–5', 'Filter by type'],
    ['?', 'Toggle this help'], ['ESC', 'Close / clear'],
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
          <div className="tui-help-row" style={{ marginTop: 14, borderTop: '1px dotted var(--tui-line)', paddingTop: 12 }}>
            <span className="tui-dim2" style={{ fontSize: 11, lineHeight: 1.7 }}>
              Press <b style={{ color: 'var(--tui-accent)' }}>:</b> then try{' '}
              <b style={{ color: 'var(--tui-ink)' }}>inject mv-magellan offline</b> — break a
              dish on purpose and watch the alert fire. <b style={{ color: 'var(--tui-ink)' }}>reset</b> restores it.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
