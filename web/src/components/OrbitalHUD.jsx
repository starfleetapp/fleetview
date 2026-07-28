import { useEffect, useRef } from 'react';
import { animate, createScope, stagger } from 'animejs';

const C = 300;
const P = (r, deg) => [C + r * Math.cos((deg * Math.PI) / 180), C + r * Math.sin((deg * Math.PI) / 180)];
function arc(r, a0, a1) {
  const [x0, y0] = P(r, a0), [x1, y1] = P(r, a1);
  const large = ((a1 - a0 + 360) % 360) > 180 ? 1 : 0;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

// colored arc segments (fleet status spectrum)
const SEGS = [
  ['var(--online)', 2, 60], ['var(--accent)', 66, 150], ['var(--degraded)', 156, 196],
  ['var(--accent-2)', 202, 286], ['var(--offline)', 292, 330], ['var(--accent)', 336, 358],
];
const TICKS = Array.from({ length: 72 }, (_, i) => ({ a: i * 5, r0: i % 6 === 0 ? 228 : 236, r1: 248, long: i % 6 === 0 }));
const DOTS = [];
[[30, 8], [54, 12], [78, 18], [102, 24], [126, 30]].forEach(([r, n]) => {
  for (let i = 0; i < n; i++) { const [x, y] = P(r, (i / n) * 360 + r); DOTS.push([x, y]); }
});

export default function OrbitalHUD({ className = '' }) {
  const root = useRef(null);
  useEffect(() => {
    const scope = createScope({ root }).add(() => {
      animate('.hud', { opacity: [0, 1], duration: 900, ease: 'outQuad' });
      animate('.ring1', { rotate: 360, duration: 60000, ease: 'linear', loop: true });
      animate('.ticks', { rotate: -360, duration: 95000, ease: 'linear', loop: true });
      animate('.prog', { rotate: 360, duration: 24000, ease: 'linear', loop: true });
      animate('.prog2', { rotate: -360, duration: 17000, ease: 'linear', loop: true });
      animate('.orbit', { rotate: 360, duration: 15000, ease: 'linear', loop: true });
      animate('.sweep', { rotate: 360, duration: 7000, ease: 'linear', loop: true });
      animate('.core', { scale: [1, 1.05], duration: 1800, ease: 'inOutSine', loop: true, alternate: true });
      animate('.ping', { scale: [1, 2.4], opacity: [0.5, 0], duration: 2800, ease: 'outSine', loop: true });
      animate('.dot', { opacity: [0.12, 0.85], scale: [0.55, 1], duration: 1500, delay: stagger(20), ease: 'inOutSine', loop: true, alternate: true });
    });
    return () => scope.revert();
  }, []);

  return (
    <div ref={root} className={className}>
      <svg viewBox="0 0 600 600" className="w-full h-full block">
        <defs>
          <radialGradient id="hudcore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#bcdcff" />
            <stop offset="45%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="#0a1626" />
          </radialGradient>
          <filter id="hudglow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g className="hud" style={{ opacity: 0 }}>
          <g stroke="var(--line)" strokeWidth="1">
            <line x1="14" y1="300" x2="586" y2="300" /><line x1="300" y1="14" x2="300" y2="586" />
          </g>

          <g className="ring1 hud-rot" fill="none" strokeWidth="3.5" strokeLinecap="round">
            {SEGS.map(([c, a0, a1], i) => <path key={i} d={arc(275, a0, a1)} stroke={c} />)}
          </g>
          <circle cx="300" cy="300" r="262" fill="none" stroke="var(--line-2)" strokeWidth="1" />

          <g className="ticks hud-rot" stroke="var(--dim)">
            {TICKS.map((t, i) => { const [x0, y0] = P(t.r0, t.a), [x1, y1] = P(t.r1, t.a); return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} strokeWidth={t.long ? 1.6 : 0.8} strokeOpacity={t.long ? 0.6 : 0.3} />; })}
          </g>

          <g className="prog hud-rot"><path d={arc(212, -90, 120)} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" filter="url(#hudglow)" /></g>
          <g className="prog2 hud-rot"><path d={arc(196, 40, 150)} fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeLinecap="round" /></g>

          <g className="sweep hud-rot">
            <path d={`M300 300 L${P(150, -16).join(' ')} A150 150 0 0 1 ${P(150, 14).join(' ')} Z`} fill="rgba(78,161,255,0.10)" />
            <line x1="300" y1="300" x2={P(150, 14)[0]} y2={P(150, 14)[1]} stroke="var(--accent)" strokeWidth="1.5" strokeOpacity="0.7" />
          </g>

          <g fill="var(--accent)">
            {DOTS.map(([x, y], i) => <circle key={i} className="dot hud-self" cx={x} cy={y} r="2.3" />)}
          </g>

          <g className="orbit hud-rot">
            <circle cx="300" cy="300" r="176" fill="none" stroke="var(--accent)" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="2 9" />
            <g transform="translate(476 300)">
              <circle r="11" fill="var(--accent)" opacity="0.22" />
              <rect x="-22" y="-6" width="12" height="12" rx="1" fill="#0d1826" stroke="var(--accent)" strokeWidth="0.8" />
              <rect x="10" y="-6" width="12" height="12" rx="1" fill="#0d1826" stroke="var(--accent)" strokeWidth="0.8" />
              <line x1="-10" y1="0" x2="-5" y2="0" stroke="var(--accent)" strokeWidth="0.8" /><line x1="5" y1="0" x2="10" y2="0" stroke="var(--accent)" strokeWidth="0.8" />
              <rect x="-5" y="-8" width="10" height="16" rx="2" fill="#11203a" stroke="var(--accent-2)" strokeWidth="1" />
              <circle cx="0" cy="0" r="2.4" fill="var(--accent-2)" />
            </g>
          </g>

          <circle className="ping hud-rot" cx="300" cy="300" r="56" fill="none" stroke="var(--accent)" strokeWidth="1.4" style={{ opacity: 0.5 }} />
          <g className="core hud-rot" filter="url(#hudglow)">
            <circle cx="300" cy="300" r="54" fill="url(#hudcore)" />
            <circle cx="300" cy="300" r="54" fill="none" stroke="var(--accent-2)" strokeWidth="1" strokeOpacity="0.6" />
            <circle cx="300" cy="300" r="40" fill="none" stroke="#bcdcff" strokeWidth="0.7" strokeOpacity="0.3" />
            <ellipse cx="300" cy="300" rx="40" ry="14" fill="none" stroke="#bcdcff" strokeWidth="0.7" strokeOpacity="0.3" />
            <ellipse cx="300" cy="300" rx="15" ry="40" fill="none" stroke="#bcdcff" strokeWidth="0.7" strokeOpacity="0.3" />
          </g>
        </g>
      </svg>
    </div>
  );
}
