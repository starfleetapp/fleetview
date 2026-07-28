import { useEffect } from 'react';
import { useMotionValue, useTransform, animate, motion } from 'motion/react';

// Telemetry number that animates from its previous value to the new one.
export function Counter({ value = 0, decimals = 0, className = '', style }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) =>
    decimals ? Number(v).toFixed(decimals) : Math.round(v).toLocaleString(),
  );
  useEffect(() => {
    const controls = animate(mv, Number(value) || 0, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value]);
  return <motion.span className={className} style={style}>{text}</motion.span>;
}
