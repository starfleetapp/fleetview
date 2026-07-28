import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { geoOrthographic, geoPath, geoGraticule10, geoDistance, geoInterpolate } from 'd3-geo';
import { feature } from 'topojson-client';
import land110m from 'world-atlas/land-110m.json';

const land = feature(land110m, land110m.objects.land);
const graticule = geoGraticule10();
const HUB = [-95, 39]; // mission-control ground hub
const colorFor = (s) => (s === 'online' ? '#34d399' : s === 'degraded' ? '#f5b13d' : '#ff5d6c');

export default function Globe({ sites }) {
  const nav = useNavigate();
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const sitesRef = useRef(sites);
  const hitRef = useRef([]);
  const rotRef = useRef([0, -18]);
  const hoverRef = useRef(null);
  const [tip, setTip] = useState(null);
  sitesRef.current = sites;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas.getContext('2d');
    let raf, w = 0, h = 0, scale = 1, cx = 0, cy = 0, dpr = 1;
    const projection = geoOrthographic().clipAngle(90).precision(0.4);
    const path = geoPath(projection, ctx);

    function resize() {
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(w, h) / 2 - 10;
      cx = w / 2; cy = h / 2;
      projection.translate([cx, cy]).scale(scale);
    }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(wrap);

    let last = performance.now();
    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (hoverRef.current == null) rotRef.current[0] += dt * 6;
      projection.rotate(rotRef.current);
      ctx.clearRect(0, 0, w, h);
      const center = [-rotRef.current[0], -rotRef.current[1]];

      // atmosphere halo
      const halo = ctx.createRadialGradient(cx, cy, scale * 0.7, cx, cy, scale * 1.55);
      halo.addColorStop(0, 'rgba(78,161,255,0.14)');
      halo.addColorStop(1, 'rgba(78,161,255,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, scale * 1.55, 0, Math.PI * 2); ctx.fill();

      // sphere
      ctx.beginPath(); path({ type: 'Sphere' });
      const sph = ctx.createRadialGradient(cx - scale * 0.35, cy - scale * 0.4, scale * 0.2, cx, cy, scale);
      sph.addColorStop(0, '#0e1826'); sph.addColorStop(1, '#06090f');
      ctx.fillStyle = sph; ctx.fill();

      // graticule
      ctx.beginPath(); path(graticule);
      ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.lineWidth = 0.5; ctx.stroke();

      // land
      ctx.beginPath(); path(land);
      ctx.fillStyle = 'rgba(120,160,210,0.10)'; ctx.fill();
      ctx.strokeStyle = 'rgba(140,180,230,0.22)'; ctx.lineWidth = 0.5; ctx.stroke();

      // rim
      ctx.beginPath(); path({ type: 'Sphere' });
      ctx.strokeStyle = 'rgba(78,161,255,0.40)'; ctx.lineWidth = 1; ctx.stroke();

      // animated uplink arcs from hub to visible sites
      const list = sitesRef.current;
      ctx.setLineDash([3, 9]);
      ctx.lineDashOffset = -(now / 28) % 12;
      let drawn = 0;
      for (const s of list) {
        if (drawn >= 16) break;
        if (geoDistance([s.lon, s.lat], center) >= Math.PI / 2) continue;
        const interp = geoInterpolate(HUB, [s.lon, s.lat]);
        const line = { type: 'LineString', coordinates: Array.from({ length: 28 }, (_, k) => interp(k / 27)) };
        ctx.beginPath(); path(line);
        ctx.strokeStyle = s.status !== 'online' ? 'rgba(245,177,61,0.28)' : 'rgba(78,161,255,0.22)';
        ctx.lineWidth = 0.8; ctx.stroke();
        drawn++;
      }
      ctx.setLineDash([]);

      // site nodes (front hemisphere only)
      const hits = [];
      const t = now / 1000;
      for (const s of list) {
        if (geoDistance([s.lon, s.lat], center) >= Math.PI / 2) continue;
        const p = projection([s.lon, s.lat]); if (!p) continue;
        const col = colorFor(s.status);
        ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, Math.PI * 2); ctx.fillStyle = col + '22'; ctx.fill();
        if (s.status !== 'online') {
          const r = 6 + (Math.sin(t * 3) + 1) * 3;
          ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
          ctx.strokeStyle = col + '55'; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
        hits.push({ site: s, x: p[0], y: p[1] });
      }
      hitRef.current = hits;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      let best = null, bd = 16 * 16;
      for (const hh of hitRef.current) {
        const dx = hh.x - mx, dy = hh.y - my, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = hh; }
      }
      hoverRef.current = best ? best.site.id : null;
      canvas.style.cursor = best ? 'pointer' : 'default';
      setTip(best ? { x: best.x, y: best.y, site: best.site } : null);
    }
    function onLeave() { hoverRef.current = null; setTip(null); }
    function onClick() { if (hoverRef.current) nav(`/site/${hoverRef.current}`); }
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('click', onClick);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('click', onClick);
    };
  }, [nav]);

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height: 'clamp(320px, 44vw, 500px)' }}>
      <canvas ref={canvasRef} className="block w-full h-full" />
      {tip && (
        <div
          className="absolute z-10 pointer-events-none -translate-x-1/2 -translate-y-full card px-2.5 py-1.5 text-[11px] whitespace-nowrap"
          style={{ left: tip.x, top: tip.y - 10 }}
        >
          <div className="font-medium">{tip.site.name}</div>
          <div className="mono text-faint mt-0.5">
            {tip.site.status} · {tip.site.ping_latency_ms != null ? Math.round(tip.site.ping_latency_ms) + 'ms' : '—'}
          </div>
        </div>
      )}
    </div>
  );
}
