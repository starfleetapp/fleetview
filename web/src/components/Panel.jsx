import { motion } from 'motion/react';

export function Brackets() {
  return (
    <>
      <span className="bracket bracket-tl" />
      <span className="bracket bracket-tr" />
      <span className="bracket bracket-bl" />
      <span className="bracket bracket-br" />
    </>
  );
}

// Animated, reveal-on-scroll panel (the card primitive of the new system).
export function Panel({ children, className = '', bracket = false, hover = false, delay = 0, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`card ${hover ? 'card-hover' : ''} ${className}`}
      {...rest}
    >
      {bracket && <Brackets />}
      {children}
    </motion.div>
  );
}

// Panel header: mono uppercase label + optional right slot.
export function PanelHead({ children, right }) {
  return (
    <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-line">
      <span className="label">{children}</span>
      {right}
    </div>
  );
}
