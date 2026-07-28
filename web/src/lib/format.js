export const fmtBps = (bps) => {
  if (bps == null) return '—';
  if (bps >= 1e9) return (bps / 1e9).toFixed(2) + ' Gbps';
  if (bps >= 1e6) return (bps / 1e6).toFixed(0) + ' Mbps';
  if (bps >= 1e3) return (bps / 1e3).toFixed(0) + ' kbps';
  return Math.round(bps) + ' bps';
};
export const fmtMbps = (bps) => (bps == null ? '—' : (bps / 1e6).toFixed(0));
export const fmtMs = (v) => (v == null ? '—' : Math.round(v) + ' ms');
export const fmtPct = (v, d = 1) => (v == null ? '—' : (v * 100).toFixed(d) + '%');

export const fmtUptime = (s) => {
  if (!s) return '—';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
};

export const ago = (ts) => {
  if (!ts) return 'never';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
};

export const STATUS = {
  online: { label: 'Online', color: 'var(--online)' },
  degraded: { label: 'Degraded', color: 'var(--degraded)' },
  offline: { label: 'Offline', color: 'var(--offline)' },
};

export const TYPE_LABEL = {
  vessel: 'Vessel',
  mine: 'Mine / Energy',
  office: 'Remote Office',
  tower: 'ISP Relay',
};

export const ALERT_LABEL = {
  site_down: 'Site down',
  high_latency: 'High latency',
  high_drop: 'Packet loss',
  obstruction: 'Obstruction',
};
