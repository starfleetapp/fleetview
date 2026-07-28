import { useMemo } from 'react';

// Procedural Starlink-style backdrop: starfield + Earth limb with atmospheric
// glow + an orbital satellite constellation with faint network links. Pure SVG,
// no assets. (Swap for a Gemini/Blender Earth render by dropping an <img> behind.)
export default function SpaceHero() {
  const stars = useMemo(() => {
    const out = [];
    for (let i = 0; i < 160; i++) {
      out.push({
        x: Math.random() * 1200,
        y: Math.random() * 560,
        r: Math.random() * 1.3 + 0.2,
        o: Math.random() * 0.6 + 0.15,
      });
    }
    return out;
  }, []);

  // Satellites riding an arc above the limb, with links to ground stations.
  const sats = useMemo(() => {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      out.push({ x: 120 + t * 960, y: 360 - Math.sin(t * Math.PI) * 150 });
    }
    return out;
  }, []);
  const ground = [
    [300, 700], [600, 740], [900, 705],
  ];

  return (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
      <defs>
        <radialGradient id="sky" cx="70%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#0b1430" />
          <stop offset="45%" stopColor="#05070d" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <radialGradient id="earth" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#14315f" />
          <stop offset="55%" stopColor="#0a1830" />
          <stop offset="100%" stopColor="#04070f" />
        </radialGradient>
        <radialGradient id="atmo" cx="50%" cy="8%" r="60%">
          <stop offset="0%" stopColor="rgba(91,140,255,0.55)" />
          <stop offset="35%" stopColor="rgba(91,140,255,0.12)" />
          <stop offset="100%" stopColor="rgba(91,140,255,0)" />
        </radialGradient>
        <radialGradient id="glow" cx="78%" cy="-5%" r="60%">
          <stop offset="0%" stopColor="rgba(91,140,255,0.18)" />
          <stop offset="100%" stopColor="rgba(91,140,255,0)" />
        </radialGradient>
      </defs>

      <rect width="1200" height="800" fill="url(#sky)" />
      <rect width="1200" height="800" fill="url(#glow)" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} />
      ))}

      {/* network links satellite -> ground */}
      <g stroke="rgba(91,140,255,0.30)" strokeWidth="1">
        {sats.map((s, i) => {
          const g = ground[i % ground.length];
          return <line key={i} x1={s.x} y1={s.y} x2={g[0]} y2={g[1]} />;
        })}
      </g>

      {/* orbital arc */}
      <path d="M120 360 Q600 150 1080 360" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
      {sats.map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={s.y} r="6" fill="rgba(91,140,255,0.18)" />
          <circle cx={s.x} cy={s.y} r="2.6" fill="#cdddff" />
        </g>
      ))}

      {/* Earth limb */}
      <circle cx="600" cy="1180" r="560" fill="url(#earth)" />
      <ellipse cx="600" cy="628" rx="600" ry="120" fill="url(#atmo)" />
      <path d="M40 660 Q600 560 1160 660" fill="none" stroke="rgba(150,190,255,0.5)" strokeWidth="1.5" />
      {ground.map((g, i) => (
        <g key={i}>
          <circle cx={g[0]} cy={g[1]} r="9" fill="rgba(52,211,153,0.18)" />
          <circle cx={g[0]} cy={g[1]} r="3.5" fill="#34d399" />
        </g>
      ))}
    </svg>
  );
}
