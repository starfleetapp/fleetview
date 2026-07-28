import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

let idc = 0;
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, opts = {}) => {
    const id = ++idc;
    setToasts((t) => [...t.slice(-4), { id, msg, type: opts.type || 'info', title: opts.title }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duration || 4600);
  }, []);
  const color = (t) => (t === 'alert' ? 'var(--offline)' : t === 'warn' ? 'var(--degraded)' : t === 'success' ? 'var(--online)' : 'var(--accent)');
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 340 }}>
        {toasts.map((t) => (
          <div key={t.id} className="toast-in pointer-events-auto rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: 'var(--bg-2)', boxShadow: '0 12px 42px -10px rgba(0,0,0,0.7)' }}>
            <span className="dot live-dot mt-[5px]" style={{ background: color(t.type), color: color(t.type) }} />
            <div className="min-w-0">
              {t.title && <div className="text-[13px] font-medium leading-tight">{t.title}</div>}
              <div className="text-dim text-[12.5px] leading-snug mt-0.5">{t.msg}</div>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// Simulated live alert feed — pops periodic toasts so the dashboard feels real-time.
const FEED = [
  ['MV Magellan', 'Went offline — no telemetry for 2m', 'alert'],
  ['Oyu Tolgoi', 'Sky obstruction rising — now 18%', 'warn'],
  ['Atacama Copper', 'Packet loss elevated — 9.2%', 'warn'],
  ['MV Bering Tide', 'Latency spike — 214 ms p95', 'warn'],
  ['Nevada Lithium', 'Recovered — back online', 'success'],
  ['Failover', 'Atacama Copper switched to backup link', 'info'],
  ['Sakha Diamond', 'Went offline — power loss suspected', 'alert'],
];
export function LiveAlertFeed() {
  const toast = useToast();
  useEffect(() => {
    let i = 0;
    const fire = () => { const [title, msg, type] = FEED[i % FEED.length]; i++; toast(msg, { title, type }); };
    const t0 = setTimeout(fire, 5000);
    const iv = setInterval(fire, 16000);
    return () => { clearTimeout(t0); clearInterval(iv); };
  }, [toast]);
  return null;
}
