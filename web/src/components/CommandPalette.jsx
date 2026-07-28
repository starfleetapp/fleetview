import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJSON } from '../lib/api.js';

const PAGES = [
  ['Fleet overview', '/app'], ['Alerts', '/app/alerts'], ['Settings', '/app/settings'],
  ['Landing page', '/'], ['Product', '/product'], ['Pricing', '/pricing'], ['Docs', '/docs'], ['Company', '/company'],
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sites, setSites] = useState([]);
  const [sel, setSel] = useState(0);
  const nav = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === 'Escape') setOpen(false);
    };
    const onEvt = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-cmdk', onEvt);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('open-cmdk', onEvt); };
  }, []);

  useEffect(() => {
    if (open) { getJSON('/api/fleet').then((d) => setSites(d.sites)).catch(() => {}); setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const results = useMemo(() => {
    const items = [
      ...PAGES.map(([label, to]) => ({ label, to, kind: 'Page' })),
      ...sites.map((s) => ({ label: s.name, sub: s.region, to: `/app/site/${s.id}`, kind: 'Site', status: s.status })),
    ];
    if (!q) return items.slice(0, 8);
    const ql = q.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(ql) || (i.sub || '').toLowerCase().includes(ql)).slice(0, 12);
  }, [q, sites]);

  useEffect(() => { setSel(0); }, [q]);
  if (!open) return null;

  const go = (i) => { const r = results[i]; if (r) { nav(r.to); setOpen(false); } };
  const dotColor = (s) => (s === 'online' ? 'var(--online)' : s === 'degraded' ? 'var(--degraded)' : 'var(--offline)');

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[14vh] px-4" onClick={() => setOpen(false)} style={{ background: 'rgba(2,4,8,0.72)', backdropFilter: 'blur(5px)' }}>
      <div className="w-full max-w-[560px] rounded-2xl overflow-hidden cmdk-in" style={{ background: 'var(--bg-2)', boxShadow: '0 30px 90px -20px rgba(0,0,0,0.85)' }} onClick={(e) => e.stopPropagation()}>
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sites, jump to a page…"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            else if (e.key === 'Enter') go(sel);
          }}
          className="w-full bg-transparent px-5 py-4 text-[15px] outline-none" style={{ color: 'var(--ink)' }} />
        <div className="max-h-[46vh] overflow-y-auto pb-2">
          {results.map((r, i) => (
            <button key={r.to + i} onMouseEnter={() => setSel(i)} onClick={() => go(i)}
              className="w-full flex items-center gap-3 px-5 py-2.5 text-left transition" style={{ background: i === sel ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
              {r.status ? <span className="dot" style={{ background: dotColor(r.status) }} /> : <span className="mono text-faint text-[11px] w-2">›</span>}
              <span className="flex-1 text-[13.5px] truncate">{r.label}{r.sub && <span className="text-faint text-[12px] ml-2">{r.sub}</span>}</span>
              <span className="mono text-faint text-[10px] uppercase tracking-wide">{r.kind}</span>
            </button>
          ))}
          {!results.length && <div className="text-dim text-sm px-5 py-4">No matches for “{q}”.</div>}
        </div>
        <div className="px-5 py-2.5 mono text-faint text-[10px] uppercase tracking-wide flex gap-4" style={{ background: 'var(--bg-1)' }}>
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}
