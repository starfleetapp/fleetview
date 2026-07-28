import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import land110m from 'world-atlas/land-110m.json';

const W = 980;
const H = 470;
const landFeature = feature(land110m, land110m.objects.land);
const projection = geoEqualEarth().fitExtent([[10, 10], [W - 10, H - 10]], landFeature);
const landPath = geoPath(projection)(landFeature);

const colorFor = (s) => (s === 'online' ? 'var(--online)' : s === 'degraded' ? 'var(--degraded)' : 'var(--offline)');

function Dot({ d, onClick }) {
  const color = colorFor(d.status);
  const alert = d.status !== 'online';
  return (
    <g transform={`translate(${d.x},${d.y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
      <title>{`${d.name} · ${d.status}`}</title>
      {alert && (
        <circle r={4} fill={color} opacity={0.5}>
          <animate attributeName="r" values="4;12;4" dur="1.9s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="1.9s" repeatCount="indefinite" />
        </circle>
      )}
      <circle r={6} fill={color} opacity={0.18} />
      <circle r={3} fill={color} stroke="rgba(0,0,0,0.55)" strokeWidth={0.6} />
    </g>
  );
}

export default function WorldMap({ sites }) {
  const nav = useNavigate();
  const dots = useMemo(
    () => sites.map((s) => { const p = projection([s.lon, s.lat]); return p ? { ...s, x: p[0], y: p[1] } : null; }).filter(Boolean),
    [sites],
  );
  return (
    <div className="card p-2 sm:p-3 overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block">
        <path d={landPath} fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.09)" strokeWidth={0.5} />
        {dots.map((d) => <Dot key={d.id} d={d} onClick={() => nav(`/site/${d.id}`)} />)}
      </svg>
    </div>
  );
}
