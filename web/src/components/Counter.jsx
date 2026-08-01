import { useEffect } from 'react';
import { useMotionValue, useTransform, animate, motion } from 'motion/react';

// Telemetry number that animates from its previous value to the new one.
export function Counter({ value = 0, decimals = 0, className = '', style }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) =>
    decimals ? Number(v).toFixed(decimals) : Math.round(v).toLocaleString(),
  );
  useEffect(() => {
    const target = Number(value) || 0;
    const controls = animate(mv, target, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    // requestAnimationFrame is suspended in hidden or throttled tabs, which
    // would leave every tile frozen at 0 for anyone who opens the dashboard in
    // a background tab. setTimeout still fires there, so land the real value.
    const settle = setTimeout(() => mv.set(target), 1000);
    return () => { controls.stop(); clearTimeout(settle); };
  }, [value]);
  return <motion.span className={className} style={style}>{text}</motion.span>;
}
