import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { animate, createScope, createAnimatable, stagger } from 'animejs';
import { Link } from 'react-router-dom';
import Earth from '../components/three/Earth.jsx';
import SatellitePanels from '../components/SatellitePanels.jsx';
import { Logo } from '../components/common.jsx';

const NAV = [['/product', 'Product'], ['/pricing', 'Pricing'], ['/docs', 'Docs'], ['/company', 'Company']];
const L1 = ['Mission', 'control'];
const L2 = ['for', 'your', 'fleet'];
const FEATURES = [
  ['01', 'Live, not lagged', 'Every dish reports in real time — no two-hour Enterprise delay.'],
  ['02', 'One screen', 'Maritime, mining, remote sites and ISP relays, unified on one map.'],
  ['03', 'Alerts that fire', 'Offline, obstructed or degraded — you know before the call comes in.'],
];
const STATS = [['Sites live', 40, 0, ''], ['Avg uptime', 99.9, 1, '%'], ['Countries', 24, 0, ''], ['Alert latency', 2, 0, 's']];
const CMP = [
  ['Real-time telemetry', true, false],
  ['Any dish / multi-vendor', true, false],
  ['Slack & email alerts', true, 'limited'],
  ['Automatic failover', true, false],
  ['Self-serve setup', true, false],
  ['Per-site pricing', '$29/mo', 'Enterprise'],
];
const LFAQ = [
  ['Is this real data?', 'This public demo runs a built-in fleet simulator so you can explore every state — no hardware needed.'],
  ['Which dishes work?', 'Starlink terminals today; the agent normalizes multiple vendors over time.'],
  ['How fast is setup?', 'One container per site and an enrollment token. Most fleets are live in minutes.'],
  ['What does it cost?', '$29 per site per month, with volume pricing above 10 sites. No setup fees.'],
];
function CmpCell({ v, accent }) {
  if (v === true) return <span style={{ color: accent ? 'var(--accent)' : 'var(--online)' }}>✓</span>;
  if (v === false) return <span className="text-faint">—</span>;
  return <span className={accent ? '' : 'text-faint'}>{v}</span>;
}

/* Full-bleed cinematic band with FIG annotation — editorial-orbit motif */
function FigBand({ img, fig, title, kicker, copy, stats }) {
  return (
    <section data-reveal className="relative border-t border-line">
      <img src={`${import.meta.env.BASE_URL}assets/${img}`} alt="" loading="lazy"
        className="block w-full object-cover" style={{ height: 'clamp(420px, 68vh, 640px)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(4,6,10,.55) 0%, transparent 32%, transparent 50%, rgba(4,6,10,.94) 100%)' }} />
      <div className="absolute inset-0 flex flex-col justify-between px-6 sm:px-16 py-6 sm:py-9 max-w-[1500px] mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="reveal label mb-2" style={{ color: 'var(--accent)' }}>{kicker}</div>
            <div className="reveal font-display uppercase tracking-[0.14em]" style={{ fontSize: 'clamp(22px, 3.4vw, 38px)' }}>{title}</div>
          </div>
          <div className="reveal label hidden sm:block">{fig}</div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <p className="reveal text-dim text-[13px] leading-relaxed max-w-md">{copy}</p>
          {stats && (
            <div className="reveal flex gap-8">
              {stats.map(([n, l]) => (
                <div key={l}>
                  <div className="font-display text-2xl sm:text-3xl tracking-[-0.01em]">{n}</div>
                  <div className="label mt-1">{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Scene() {
  return (
    <Canvas camera={{ position: [0, 0.4, 7], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true }} style={{ position: 'fixed', inset: 0 }}>
      <color attach="background" args={['#03050a']} />
      <Suspense fallback={null}>
        <Stars radius={140} depth={70} count={6500} factor={4} fade speed={0.4} />
        <ambientLight intensity={0.34} />
        <directionalLight position={[2, 4, -8]} intensity={3.1} color="#dbe8ff" />
        <directionalLight position={[0, 3, 9]} intensity={0.95} color="#9fc0ff" />
        <directionalLight position={[-7, -2, -4]} intensity={0.5} color="#2a5cff" />
        <Earth position={[0, -7.6, -1]} />
        <EffectComposer disableNormalPass>
          <Bloom intensity={1.05} luminanceThreshold={0.2} luminanceSmoothing={0.5} mipmapBlur />
          <Vignette offset={0.22} darkness={0.9} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}

const Word = ({ w, space }) => (
  <span className="inline-block overflow-hidden align-bottom" style={{ paddingBottom: '0.05em' }}>
    <span className="h-word inline-block">{w}{space ? ' ' : ''}</span>
  </span>
);

export default function SatelliteLanding({ onEnter }) {
  const root = useRef(null);
  const satWrap = useRef(null);
  const satImg = useRef(null);
  const [scrolled, setScrolled] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const scope = createScope({ root }).add(() => {
      animate('.h-word', { y: ['110%', '0%'], opacity: [0, 1], duration: 1000, delay: stagger(85, { start: 150 }), ease: 'outExpo' });
      animate('.h-up', { y: [18, 0], opacity: [0, 1], duration: 850, delay: stagger(90, { start: 700 }), ease: 'outExpo' });
    });

    // satellite — fully animated (entrance + continuous float / drift / rotate / breathe)
    const si = satImg.current;
    if (si) {
      animate(si, { opacity: [0, 1], duration: 1300, ease: 'outQuad' });
      animate(si, { translateY: ['-15px', '15px'], duration: 4200, ease: 'inOutSine', loop: true, alternate: true });
      animate(si, { translateX: ['-9px', '9px'], duration: 6800, ease: 'inOutSine', loop: true, alternate: true });
      animate(si, { rotate: ['-2.6deg', '2.6deg'], duration: 9000, ease: 'inOutSine', loop: true, alternate: true });
      animate(si, { scale: [1, 1.04], duration: 5200, ease: 'inOutSine', loop: true, alternate: true });
    }

    // cursor parallax on the satellite wrapper
    let tilt;
    if (satWrap.current) tilt = createAnimatable(satWrap.current, { x: 600, y: 600, ease: 'out(3)' });
    const onMove = (e) => {
      if (!tilt) return;
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      tilt.x(x * 30); tilt.y(y * 24);
    };
    window.addEventListener('mousemove', onMove);

    const onScroll = () => {
      setScrolled(Math.min(1, window.scrollY / 600));
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          animate(en.target.querySelectorAll('.reveal'), { y: [30, 0], opacity: [0, 1], duration: 850, delay: stagger(110), ease: 'outExpo' });
          en.target.querySelectorAll('[data-count]').forEach((el) => {
            const tv = parseFloat(el.dataset.count); const dec = parseInt(el.dataset.dec || '0', 10);
            const o = { v: 0 };
            animate(o, { v: tv, duration: 1500, ease: 'out(3)', onUpdate: () => { el.textContent = o.v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); } });
          });
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.2 });
    root.current?.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('scroll', onScroll); io.disconnect(); tilt?.revert?.(); scope.revert(); };
  }, []);

  return (
    <div ref={root} className="relative" style={{ background: '#03050a' }}>
      <Scene />

      {/* satellite */}
      <div ref={satWrap} className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2, opacity: 1 - scrolled }}>
        <img ref={satImg} src={`${import.meta.env.BASE_URL}assets/satellite.png`} alt="" className="absolute"
          style={{ top: '7%', right: '2%', width: 'min(52vw, 600px)', opacity: 0, filter: 'drop-shadow(0 28px 80px rgba(78,161,255,0.42))', willChange: 'transform' }} />
      </div>

      {/* header */}
      <header className="fixed top-0 inset-x-0 h-16 px-6 sm:px-12 flex items-center gap-2.5" style={{ zIndex: 50 }}>
        <Logo size={22} />
        <span className="font-display uppercase tracking-[0.04em] text-[15px]">FleetView</span>
        <nav className="hidden md:flex items-center gap-7 ml-10 text-[12px] text-faint">
          {NAV.map(([to, label]) => <Link key={to} to={to} className="hover:text-ink transition">{label}</Link>)}
        </nav>
        <button onClick={onEnter} className="btn btn-primary ml-auto text-[12px] py-1.5 px-4">View dashboard</button>
      </header>

      {/* HERO */}
      <section className="relative h-screen flex items-center px-6 sm:px-16 max-w-[1500px] mx-auto" style={{ zIndex: 4 }}>
        <div className="max-w-3xl" style={{ opacity: 1 - scrolled * 1.4 }}>
          <div className="h-up flex items-center gap-2.5 mb-5">
            <span className="mono uppercase text-[12px] tracking-[0.22em]" style={{ color: 'var(--accent)' }}>Real-time. Global. Reliable.</span>
          </div>
          <div className="h-up label absolute top-24 right-6 sm:right-16 hidden md:block">FIG. 01 — FLEET TELEMETRY · LOW EARTH ORBIT</div>
          <h1 className="font-display uppercase tracking-[-0.01em]" style={{ fontSize: 'clamp(38px, 7.2vw, 94px)', lineHeight: 0.88, textShadow: '0 4px 50px rgba(0,0,0,0.85)' }}>
            <span className="block whitespace-nowrap">{L1.map((w, i) => <Word key={i} w={w} space={i < L1.length - 1} />)}</span>
            <span className="block whitespace-nowrap">{L2.map((w, i) => <Word key={i} w={w} space={i < L2.length - 1} />)}</span>
          </h1>
          <div className="h-up" style={{ height: 3, width: 92, background: 'var(--accent)', marginTop: 22, boxShadow: '0 0 14px var(--accent)' }} />
          <p className="h-up text-dim mt-6 leading-relaxed max-w-md" style={{ fontSize: 17 }}>
            Real-time visibility and alerts for every Starlink site — anywhere on Earth.
          </p>
          <div className="h-up flex flex-wrap items-center gap-3 mt-8">
            <button onClick={onEnter} className="btn btn-primary uppercase tracking-[0.08em] text-[16px] px-7 py-3.5">View dashboard</button>
            <button onClick={onEnter} className="btn uppercase tracking-[0.08em] text-[16px] px-7 py-3.5">Book a demo</button>
          </div>
        </div>
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 mono text-faint text-[10px] uppercase tracking-[0.2em] animate-pulse" style={{ opacity: 1 - scrolled }}>Scroll ↓</div>
      </section>

      {/* scroll content */}
      <div className="relative" style={{ zIndex: 5, background: 'var(--bg-0)' }}>
        <SatellitePanels />

        <FigBand img="station.jpg" fig="FIG. 02 — REMOTE SITE · 66°N"
          kicker="/ Where it runs" title="The edge of coverage"
          copy="FleetView watches dishes where nobody is standing next to them — cliff relays, mine sites, research stations. The agent buffers through outages and ships telemetry the moment the sky comes back."
          stats={[['40', 'Sites in demo'], ['24', 'Countries'], ['24/7', 'Unattended']]} />

        <section data-reveal className="max-w-[1300px] mx-auto px-6 sm:px-16 py-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(([k, v, d, u]) => (
            <div key={k} className="reveal">
              <div className="flex items-baseline gap-1"><span className="font-display text-4xl sm:text-5xl tracking-[-0.02em]" data-count={v} data-dec={d}>0</span><span className="text-faint text-sm">{u}</span></div>
              <div className="label mt-2">{k}</div>
            </div>
          ))}
        </section>

        <section data-reveal className="px-6 sm:px-16 py-28 max-w-[1500px] mx-auto border-t border-line">
          <div className="reveal label mb-12">Why FleetView</div>
          <div className="grid md:grid-cols-3 gap-10">
            {FEATURES.map(([n, t, d]) => (
              <div key={n} className="reveal">
                <div className="mono text-[12px] mb-3" style={{ color: 'var(--accent)' }}>{n}</div>
                <div className="font-display uppercase text-2xl tracking-[-0.01em] mb-2">{t}</div>
                <p className="text-dim text-[14px] leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section data-reveal className="max-w-[1000px] mx-auto px-6 sm:px-16 py-20">
          <div className="reveal label mb-3">Why teams switch</div>
          <h2 className="reveal font-display uppercase text-3xl sm:text-5xl tracking-[-0.01em] mb-10">FleetView vs. Enterprise</h2>
          <div className="reveal">
            <div className="flex items-center pb-3">
              <span className="flex-1" />
              <span className="label w-28 text-center" style={{ color: 'var(--accent)' }}>FleetView</span>
              <span className="label w-28 text-center">Enterprise</span>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {CMP.map(([label, a, b]) => (
                <div key={label} className="flex items-center py-3.5 text-[14px]">
                  <span className="flex-1 text-dim">{label}</span>
                  <span className="w-28 text-center"><CmpCell v={a} accent /></span>
                  <span className="w-28 text-center"><CmpCell v={b} /></span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FigBand img="vessel.jpg" fig="FIG. 03 — MV MAGELLAN · DRAKE PASSAGE"
          kicker="/ Built for the worst case" title="When a vessel goes dark"
          copy="In the live demo, MV Magellan drops offline in the Drake Passage — and the alert fires before anyone would have noticed. Inject the same failure yourself: offline, obstructed, thermal, degraded, high-latency."
          stats={[['5', 'Fault modes'], ['1', 'Command to inject'], ['0', 'Hardware needed']]} />

        <section data-reveal className="max-w-[780px] mx-auto px-6 py-20">
          <h2 className="reveal font-display uppercase text-3xl tracking-[-0.01em] mb-10">Questions</h2>
          <div className="space-y-8">
            {LFAQ.map(([q, a]) => (
              <div key={q} className="reveal">
                <h3 className="font-medium mb-1.5">{q}</h3>
                <p className="text-dim text-[14px] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section data-reveal className="px-6 py-32 text-center border-t border-line">
          <h2 className="reveal font-display uppercase text-4xl sm:text-6xl tracking-[-0.01em] leading-[0.98]">
            See your whole fleet<br />in one screen.
          </h2>
          <div className="reveal mt-9">
            <button onClick={onEnter} className="btn btn-primary uppercase tracking-[0.06em] text-[14px] px-8 py-3.5">Enter live demo <span className="arr">→</span></button>
          </div>
        </section>
      </div>
    </div>
  );
}
