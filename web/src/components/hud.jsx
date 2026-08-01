import { useEffect, useState } from 'react';

/**
 * Shared HUD language for the marketing site — the "editorial mission control"
 * system: mono micro-labels, FIG annotations, corner ticks, scanlines, spec
 * rows, and a live UTC telemetry strip. The dashboard app has its own UI;
 * these are marketing-side only.
 */

/* Live UTC clock + link status strip. Data is real where cheap (clock),
   labeled as demo where it isn't. */
export function TelemetryBar() {
  const [utc, setUtc] = useState('--:--:--');
  const [nodes, setNodes] = useState(null);
  useEffect(() => {
    const tick = () => setUtc(new Date().toISOString().slice(11, 19));
    tick();
    const iv = setInterval(tick, 1000);
    fetch('/api/fleet').then((r) => r.json())
      .then((d) => setNodes(d?.sites?.length ?? null)).catch(() => {});
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="hud-bar mono">
      <span>UTC {utc}</span>
      <span className="hud-sep">▮</span>
      <span><i className="hud-dot" /> LINK NOMINAL</span>
      <span className="hud-sep">▮</span>
      <span>{nodes ?? '—'} NODES TRACKED</span>
      <span className="hud-sep hide-s">▮</span>
      <span className="hide-s">LEO MESH · ACTIVE</span>
      <span className="hud-cursor">_</span>
    </div>
  );
}

/* Corner tick brackets for any relatively-positioned box */
export function Ticks({ size = 14, opacity = 0.55 }) {
  const s = { position: 'absolute', width: size, height: size, opacity, pointerEvents: 'none' };
  const b = '1px solid var(--accent)';
  return (
    <>
      <span style={{ ...s, top: 0, left: 0, borderTop: b, borderLeft: b }} />
      <span style={{ ...s, top: 0, right: 0, borderTop: b, borderRight: b }} />
      <span style={{ ...s, bottom: 0, left: 0, borderBottom: b, borderLeft: b }} />
      <span style={{ ...s, bottom: 0, right: 0, borderBottom: b, borderRight: b }} />
    </>
  );
}

/* Section heading: "/ 02 — CAPABILITIES" + optional right annotation */
export function SectionHead({ index, title, fig, className = '' }) {
  return (
    <div className={`flex items-end justify-between gap-4 mb-10 ${className}`}>
      <div>
        <div className="reveal label mb-3" style={{ color: 'var(--accent)' }}>/ {index}</div>
        <h2 className="reveal font-display uppercase tracking-[-0.01em]"
          style={{ fontSize: 'clamp(26px, 4.4vw, 44px)', lineHeight: 0.95 }}>{title}</h2>
      </div>
      {fig && <div className="reveal label hidden md:block pb-1">{fig}</div>}
    </div>
  );
}

/* Key/value spec row — the datasheet motif */
export function SpecRow({ k, v, accent }) {
  return (
    <div className="flex items-baseline justify-between gap-5 py-2.5 border-b border-white/[0.06] text-[13px]">
      <span className="label">{k}</span>
      <span className="font-display text-[15px] tracking-[0.02em] text-right"
        style={accent ? { color: 'var(--accent)' } : undefined}>{v}</span>
    </div>
  );
}

/* Slow-scrolling mono telemetry divider */
export function DataStrip() {
  const FRAG = 'LAT 52.10N · LON 174.02W · SNR 9.2dB ▮ MV MAGELLAN · DRAKE PASSAGE · LINK LOST ▮ OYU TOLGOI · OBSTRUCTION 17.4% ▮ SVALBARD NODE · 36MS · NOMINAL ▮ POLL 10S · SHIP 3S · BUFFER 50K ▮ ';
  return (
    <div className="hud-strip" aria-hidden="true">
      <div className="hud-strip-inner mono">{FRAG.repeat(4)}</div>
    </div>
  );
}

/* Full-bleed cinematic band with FIG annotation + scanlines */
export function FigBand({ img, fig, title, kicker, copy, stats, children }) {
  return (
    <section data-reveal className="relative border-t border-line overflow-hidden">
      <img src={`${import.meta.env.BASE_URL}assets/${img}`} alt="" loading="lazy"
        className="block w-full object-cover" style={{ height: 'clamp(420px, 68vh, 640px)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(4,6,10,.55) 0%, transparent 32%, transparent 50%, rgba(4,6,10,.94) 100%)' }} />
      <div className="absolute inset-0 scanlines" />
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
          {children}
        </div>
      </div>
    </section>
  );
}

/* Terminal-style code block with window chrome */
export function Terminal({ title = 'bash', children }) {
  return (
    <div className="reveal relative rounded-xl overflow-hidden border border-white/[0.08]" style={{ background: '#05070c' }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--offline)', opacity: .7 }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--degraded)', opacity: .7 }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--online)', opacity: .7 }} />
        <span className="label ml-2">{title}</span>
      </div>
      <pre className="mono text-[12.5px] text-dim p-4 overflow-x-auto leading-relaxed m-0">{children}</pre>
    </div>
  );
}
