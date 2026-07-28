import { useState } from 'react';
import { motion } from 'motion/react';
import SpaceHero from '../components/SpaceHero.jsx';
import { Logo } from '../components/common.jsx';

export default function Login({ onEnter }) {
  const [email, setEmail] = useState('');
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4">
      <SpaceHero />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md card p-7 sm:p-9"
        style={{ background: 'rgba(8,11,16,0.78)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2.5 mb-7">
          <Logo size={26} />
          <span className="font-display font-semibold text-lg tracking-tight">FleetView</span>
          <span className="label ml-auto">Mission Control</span>
        </div>
        <h1 className="font-display text-[34px] font-semibold tracking-[-0.03em] leading-[1.06]">
          Every Starlink dish.<br />
          <span className="serif italic font-normal" style={{ color: 'var(--accent-2)' }}>One screen.</span>
        </h1>
        <p className="text-dim text-sm mt-3 leading-relaxed">
          Real-time health, latency, obstructions, downtime and alerts across your entire fleet —
          maritime, mining, remote sites and ISP relays. No 2-hour delay, works on any dish.
        </p>

        <form className="mt-7 space-y-3" onSubmit={(e) => { e.preventDefault(); onEnter(); }}>
          <div>
            <div className="label mb-1.5">Work email</div>
            <input className="input" type="email" placeholder="ops@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-primary w-full" type="submit">Enter live demo →</button>
        </form>

        <div className="mt-6 flex items-center gap-2 mono text-faint text-[10.5px] uppercase tracking-wide">
          <span className="dot live-dot" style={{ background: 'var(--online)', color: 'var(--online)' }} />
          Live demo · 40 simulated sites streaming · $29 / site / mo
        </div>
      </motion.div>
    </div>
  );
}
