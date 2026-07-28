import { useEffect, useState } from 'react';
import { getJSON, send } from '../lib/api.js';
import { Panel, PanelHead } from '../components/Panel.jsx';
import { Pill } from '../components/common.jsx';
import { TYPE_LABEL, ALERT_LABEL } from '../lib/format.js';

const NAV = ['Integrations', 'Notifications', 'Alert rules', 'Sites', 'Team', 'Billing', 'API keys', 'Audit log'];

function Toggle({ on, onClick }) {
  return <button className="toggle" data-on={on} onClick={onClick} aria-label="toggle" />;
}
function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="label mb-1.5">{label}</div>
      {children}
      {hint && <div className="text-faint text-[11px] mt-1">{hint}</div>}
    </label>
  );
}
function randKey() {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = ''; for (let i = 0; i < 32; i++) s += c[Math.floor(Math.random() * c.length)];
  return 'flv_live_' + s;
}
const mask = (k) => k.slice(0, 12) + '•'.repeat(12) + k.slice(-4);

// ── Integrations ──────────────────────────────────────────────
function IntegrationCard({ icon, name, desc, connected }) {
  return (
    <div className="rounded-xl p-4 flex flex-col" style={{ background: 'var(--bg-0)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-dim mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>{icon}</div>
      <div className="font-medium text-[14px]">{name}</div>
      <div className="text-faint text-[12px] mt-0.5 leading-snug flex-1">{desc}</div>
      <div className="flex items-center gap-2 mt-3">
        {connected ? <span className="mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--online)' }}>● Connected</span> : <span className="mono text-faint text-[10px] uppercase tracking-wide">Not connected</span>}
        <button className="btn py-1.5 text-[12px] ml-auto" style={{ background: 'rgba(255,255,255,0.05)' }}>Configure</button>
      </div>
    </div>
  );
}
function IntegrationsTab() {
  const [integ, setInteg] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { getJSON('/api/integrations').then(setInteg).catch(() => {}); }, []);
  async function save() {
    await send('/api/integrations', 'PUT', { slack_webhook_url: integ.slack_webhook_url || '', email_to: integ.email_to || '', email_from: integ.email_from || '', ...(integ.resend_api_key ? { resend_api_key: integ.resend_api_key } : {}) });
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }
  return (
    <Panel className="overflow-hidden">
      <PanelHead>Integrations</PanelHead>
      <div className="p-4 grid sm:grid-cols-3 gap-3">
        <IntegrationCard icon="#" name="Slack" desc="Send alerts to Slack channels." connected={!!integ?.slack_webhook_url} />
        <IntegrationCard icon="@" name="Email" desc="Send alerts via email (Resend)." connected={!!integ?.resend_configured} />
        <IntegrationCard icon="⬡" name="Webhook" desc="POST alerts to your own endpoint." connected={false} />
      </div>
      {integ && (
        <div className="p-4 pt-0 space-y-3">
          <div className="label mt-2">Configure delivery</div>
          <Field label="Slack incoming webhook URL"><input className="input" placeholder="https://hooks.slack.com/services/…" value={integ.slack_webhook_url || ''} onChange={(e) => setInteg({ ...integ, slack_webhook_url: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Alert email to"><input className="input" placeholder="ops@company.com" value={integ.email_to || ''} onChange={(e) => setInteg({ ...integ, email_to: e.target.value })} /></Field>
            <Field label="Resend API key" hint={integ.resend_configured ? 'A key is set — leave blank to keep it.' : 'Enables email delivery.'}><input className="input" type="password" placeholder={integ.resend_configured ? '•••••••• (set)' : 're_…'} onChange={(e) => setInteg({ ...integ, resend_api_key: e.target.value })} /></Field>
          </div>
          <button className="btn btn-primary" onClick={save}>{saved ? 'Saved ✓' : 'Save'}</button>
        </div>
      )}
    </Panel>
  );
}

// ── Notifications ─────────────────────────────────────────────
const NOTIF_EVENTS = ['Site offline', 'Site degraded', 'Obstruction detected', 'Site recovered', 'Weekly digest'];
function NotificationsTab() {
  const [chan, setChan] = useState({ email: true, slack: true, sms: false });
  const [m, setM] = useState(() => Object.fromEntries(NOTIF_EVENTS.map((e) => [e, { email: true, slack: e !== 'Weekly digest' }])));
  const [quiet, setQuiet] = useState(false);
  const flip = (e, k) => setM((s) => ({ ...s, [e]: { ...s[e], [k]: !s[e][k] } }));
  return (
    <>
      <Panel className="overflow-hidden">
        <PanelHead>Channels</PanelHead>
        <div className="p-4 space-y-1">
          {[['email', 'Email', 'ops@company.com'], ['slack', 'Slack', '#fleet-alerts'], ['sms', 'SMS', '+1 (555) 010-2233']].map(([k, name, sub]) => (
            <div key={k} className="flex items-center gap-3 py-2">
              <div className="flex-1"><div className="text-[14px]">{name}</div><div className="text-faint text-[12px] mono">{sub}</div></div>
              <Toggle on={chan[k]} onClick={() => setChan((c) => ({ ...c, [k]: !c[k] }))} />
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="overflow-hidden" delay={0.05}>
        <PanelHead>Per-event</PanelHead>
        <div className="p-4">
          <div className="flex items-center pb-2"><span className="flex-1" /><span className="label w-14 text-center">Email</span><span className="label w-14 text-center">Slack</span></div>
          <div className="divide-y divide-white/[0.05]">
            {NOTIF_EVENTS.map((e) => (
              <div key={e} className="flex items-center py-2.5">
                <span className="flex-1 text-[13.5px] text-dim">{e}</span>
                <span className="w-14 flex justify-center"><Toggle on={m[e].email} onClick={() => flip(e, 'email')} /></span>
                <span className="w-14 flex justify-center"><Toggle on={m[e].slack} onClick={() => flip(e, 'slack')} /></span>
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <Panel className="overflow-hidden" delay={0.1}>
        <PanelHead>Quiet hours</PanelHead>
        <div className="p-4 flex items-center gap-3"><div className="flex-1 text-[14px]">Pause non-critical alerts <span className="mono text-dim">22:00 – 07:00</span></div><Toggle on={quiet} onClick={() => setQuiet((q) => !q)} /></div>
      </Panel>
    </>
  );
}

// ── Alert rules ───────────────────────────────────────────────
function ruleDesc(r) {
  if (r.type === 'site_down') return `Down for ${Math.round(r.window_s / 60)}m`;
  if (r.type === 'high_latency') return `> ${r.threshold} ms for ${Math.round(r.window_s / 60)}m`;
  if (r.type === 'high_drop' || r.type === 'obstruction') return `> ${(r.threshold * 100).toFixed(0)}% for ${Math.round(r.window_s / 60)}m`;
  return String(r.threshold);
}
function AlertRulesTab() {
  const [rules, setRules] = useState([]);
  useEffect(() => { getJSON('/api/alert-rules').then((d) => setRules(d.rules)).catch(() => {}); }, []);
  async function toggle(r) {
    const next = !r.enabled;
    setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled: next } : x)));
    await send(`/api/alert-rules/${r.id}`, 'PATCH', { threshold: r.threshold, window_s: r.window_s, channels: r.channels, enabled: next });
  }
  return (
    <Panel className="overflow-hidden">
      <PanelHead>Alert rules</PanelHead>
      <div className="divide-y divide-white/[0.05]">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <div className="font-medium text-[13.5px]">{ALERT_LABEL[r.type] || r.type}</div>
              <div className="text-faint text-[12px] mono">{ruleDesc(r)} · {r.channels.join(', ')}</div>
            </div>
            <Toggle on={r.enabled} onClick={() => toggle(r)} />
          </div>
        ))}
        {!rules.length && <div className="text-dim text-sm py-6 text-center">Loading rules…</div>}
      </div>
    </Panel>
  );
}

// ── Sites ─────────────────────────────────────────────────────
function SitesTab() {
  const [sites, setSites] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'office', region: '' });
  const [enrolled, setEnrolled] = useState(null);
  const [copied, setCopied] = useState('');
  useEffect(() => { getJSON('/api/fleet').then((d) => setSites(d.sites)).catch(() => {}); }, []);
  async function enroll(e) { e.preventDefault(); if (!form.name) return; setEnrolled(await send('/api/enroll', 'POST', form)); }
  const copy = (t, w) => { navigator.clipboard?.writeText(t); setCopied(w); setTimeout(() => setCopied(''), 1500); };
  return (
    <>
      <Panel className="overflow-hidden">
        <PanelHead right={<span className="mono text-faint text-[11px]">{sites.length} sites</span>}>Sites</PanelHead>
        <div className="divide-y divide-white/[0.05] max-h-[380px] overflow-y-auto">
          {sites.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
              <span style={{ width: 64 }}><Pill status={s.status}>{s.status}</Pill></span>
              <span className="font-medium flex-1 truncate">{s.name}</span>
              <span className="text-faint hidden sm:block w-28">{TYPE_LABEL[s.type]}</span>
              <span className="text-dim w-32 text-right truncate hidden md:block">{s.region}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="overflow-hidden" delay={0.05}>
        <PanelHead>Add a site</PanelHead>
        <div className="p-4">
          <form onSubmit={enroll} className="grid sm:grid-cols-3 gap-3 items-end">
            <Field label="Site name"><input className="input" placeholder="MV New Vessel" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Type"><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Region"><input className="input" placeholder="North Sea" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></Field>
            <button className="btn btn-primary w-fit sm:col-span-3" type="submit">Generate enrollment</button>
          </form>
          {enrolled && (
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <div><div className="label mb-1.5">Enrollment token</div><div className="flex gap-2"><code className="input font-mono text-[12px] truncate">{enrolled.token}</code><button className="btn py-1.5" onClick={() => copy(enrolled.token, 't')}>{copied === 't' ? '✓' : 'Copy'}</button></div></div>
              <div><div className="label mb-1.5">Install command</div><div className="flex gap-2"><code className="input font-mono text-[12px] truncate">docker run … fleetview-agent</code><button className="btn py-1.5" onClick={() => copy(enrolled.docker, 'c')}>{copied === 'c' ? '✓' : 'Copy'}</button></div></div>
            </div>
          )}
        </div>
      </Panel>
    </>
  );
}

// ── Team ──────────────────────────────────────────────────────
const TEAM = [
  ['Kingsley Teo', 'kingsley@fleetview.io', 'Owner'],
  ['Mara Voss', 'mara@fleetview.io', 'Admin'],
  ['Diego Santos', 'diego@fleetview.io', 'Operator'],
  ['Lena Park', 'lena@fleetview.io', 'Viewer'],
];
function TeamTab() {
  const [invite, setInvite] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <Panel className="overflow-hidden">
      <PanelHead right={<span className="mono text-faint text-[11px]">{TEAM.length} members</span>}>Team</PanelHead>
      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-5">
          <input className="input flex-1 min-w-[180px]" placeholder="teammate@company.com" value={invite} onChange={(e) => setInvite(e.target.value)} />
          <select className="input w-auto"><option>Viewer</option><option>Operator</option><option>Admin</option></select>
          <button className="btn btn-primary whitespace-nowrap" onClick={() => { if (invite) { setSent(true); setInvite(''); setTimeout(() => setSent(false), 1600); } }}>{sent ? 'Invited ✓' : 'Invite'}</button>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {TEAM.map(([name, email, role], i) => (
            <div key={email} className="flex items-center gap-3 py-3">
              <span className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-medium shrink-0" style={{ background: 'rgba(78,161,255,0.15)', color: 'var(--accent)' }}>{name.split(' ').map((p) => p[0]).join('')}</span>
              <div className="flex-1 min-w-0"><div className="text-[14px] truncate">{name}{i === 0 && <span className="text-faint text-[11px] ml-2">You</span>}</div><div className="text-faint text-[12px] truncate">{email}</div></div>
              <span className="mono text-dim text-[11px] uppercase tracking-wide">{role}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

// ── Billing ───────────────────────────────────────────────────
const INVOICES = [['Jun 1, 2026', '$960.00'], ['May 1, 2026', '$960.00'], ['Apr 1, 2026', '$912.00']];
function BillingTab() {
  return (
    <>
      <Panel className="overflow-hidden">
        <PanelHead>Plan</PanelHead>
        <div className="p-4 flex flex-wrap items-center gap-x-10 gap-y-4">
          <div><div className="label">Plan</div><div className="text-[15px] mt-1">Growth</div></div>
          <div><div className="label">Sites</div><div className="text-[15px] mt-1 mono">40 / 100</div></div>
          <div><div className="label">Monthly</div><div className="text-[15px] mt-1 mono">$960.00</div></div>
          <div><div className="label">Next invoice</div><div className="text-[15px] mt-1">Jul 1, 2026</div></div>
          <button className="btn btn-primary ml-auto">Manage plan</button>
        </div>
      </Panel>
      <Panel className="overflow-hidden" delay={0.05}>
        <PanelHead>Payment method</PanelHead>
        <div className="p-4 flex items-center gap-3 flex-wrap"><span className="mono text-dim">Visa •••• 4242</span><span className="text-faint text-[12px]">expires 08/29</span><button className="btn ml-auto" style={{ background: 'rgba(255,255,255,0.05)' }}>Update</button></div>
      </Panel>
      <Panel className="overflow-hidden" delay={0.1}>
        <PanelHead>Invoices</PanelHead>
        <div className="divide-y divide-white/[0.05]">
          {INVOICES.map(([d, a]) => (
            <div key={d} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
              <span className="flex-1">{d}</span>
              <span className="mono text-dim">{a}</span>
              <span className="mono text-[10px] uppercase tracking-wide" style={{ color: 'var(--online)' }}>Paid</span>
              <button className="btn py-1 text-[12px]" style={{ background: 'rgba(255,255,255,0.05)' }}>PDF</button>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

// ── API keys ──────────────────────────────────────────────────
function ApiKeysTab() {
  const [keys, setKeys] = useState([
    { id: 1, name: 'Production', key: 'flv_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', created: 'Apr 12, 2026', used: '2 hours ago' },
    { id: 2, name: 'CI · read-only', key: 'flv_live_z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4', created: 'Mar 3, 2026', used: '5 days ago' },
  ]);
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [copied, setCopied] = useState(false);
  function create() {
    const item = { id: Date.now(), name: name.trim() || 'Untitled key', key: randKey(), created: 'Just now', used: 'never' };
    setKeys((ks) => [item, ...ks]); setFresh(item); setName('');
  }
  function revoke(id) { setKeys((ks) => ks.filter((k) => k.id !== id)); if (fresh?.id === id) setFresh(null); }
  return (
    <Panel className="overflow-hidden">
      <PanelHead right={<span className="mono text-faint text-[11px]">{keys.length} keys</span>}>API keys</PanelHead>
      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <input className="input flex-1 min-w-[180px]" placeholder="Key name (e.g. Production)" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-primary whitespace-nowrap" onClick={create}>Generate key</button>
        </div>
        {fresh && (
          <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(78,161,255,0.10)' }}>
            <div className="label mb-1.5" style={{ color: 'var(--accent)' }}>New key — copy it now, it won't be shown again</div>
            <div className="flex gap-2 items-center"><code className="mono text-[12px] text-ink truncate flex-1">{fresh.key}</code><button className="btn py-1 text-[12px]" style={{ background: 'rgba(255,255,255,0.06)' }} onClick={() => { navigator.clipboard?.writeText(fresh.key); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? '✓ Copied' : 'Copy'}</button></div>
          </div>
        )}
        <div className="divide-y divide-white/[0.05]">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-3 py-3 text-[13px]">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{k.name}</div>
                <code className="mono text-faint text-[12px]">{reveal === k.id ? k.key : mask(k.key)}</code>
              </div>
              <span className="text-faint text-[11px] hidden sm:block whitespace-nowrap">{k.created}</span>
              <span className="text-faint text-[11px] hidden md:block whitespace-nowrap">used {k.used}</span>
              <button className="btn py-1 text-[12px]" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setReveal(reveal === k.id ? null : k.id)}>{reveal === k.id ? 'Hide' : 'Show'}</button>
              <button className="btn py-1 text-[12px]" style={{ color: 'var(--offline)' }} onClick={() => revoke(k.id)}>Revoke</button>
            </div>
          ))}
          {!keys.length && <div className="text-dim text-sm py-6 text-center">No API keys yet — generate one above.</div>}
        </div>
      </div>
    </Panel>
  );
}

// ── Audit log ─────────────────────────────────────────────────
const AUDIT = [
  ['12:31', 'Kingsley Teo', 'Generated API key “Production”'],
  ['09:02', 'Mara Voss', 'Disabled rule “Obstruction detected”'],
  ['08:47', 'System', 'Failover triggered on Atacama Copper'],
  ['Yesterday', 'Diego Santos', 'Added site “MV New Vessel”'],
  ['Yesterday', 'Kingsley Teo', 'Updated Slack integration'],
  ['Jun 20', 'Lena Park', 'Signed in from Kuala Lumpur, MY'],
  ['Jun 19', 'System', 'Alert fired — MV Magellan offline'],
  ['Jun 18', 'Mara Voss', 'Invited diego@fleetview.io (Operator)'],
];
function AuditTab() {
  return (
    <Panel className="overflow-hidden">
      <PanelHead>Audit log</PanelHead>
      <div className="divide-y divide-white/[0.05]">
        {AUDIT.map(([t, who, what], i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
            <span className="mono text-faint text-[11px] w-20 shrink-0">{t}</span>
            <span className="text-dim w-32 shrink-0 truncate hidden sm:block">{who}</span>
            <span className="text-ink flex-1 truncate">{what}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const TABS = {
  Integrations: IntegrationsTab, Notifications: NotificationsTab, 'Alert rules': AlertRulesTab,
  Sites: SitesTab, Team: TeamTab, Billing: BillingTab, 'API keys': ApiKeysTab, 'Audit log': AuditTab,
};

export default function Settings() {
  const [active, setActive] = useState('Integrations');
  const Tab = TABS[active];
  return (
    <div className="fade-in">
      <div className="mb-5">
        <div className="label">Settings</div>
        <h1 className="font-display uppercase text-3xl tracking-[-0.01em] mt-1.5">Account &amp; setup</h1>
      </div>
      <div className="grid md:grid-cols-[200px_1fr] gap-5">
        <nav className="card p-2 h-fit md:sticky md:top-20">
          {NAV.map((n) => (
            <button key={n} onClick={() => setActive(n)} className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition ${active === n ? 'bg-white/[0.06] text-ink' : 'text-dim hover:text-ink'}`}>{n}</button>
          ))}
        </nav>
        <div className="min-w-0 space-y-5">
          <Tab />
        </div>
      </div>
    </div>
  );
}
