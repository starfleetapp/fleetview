import { useEffect, useState } from 'react';
import { getJSON, send } from '../lib/api.js';
import { TuiPanel, TuiKV, Tag } from '../components/tui.jsx';
import { TYPE_LABEL, ALERT_LABEL } from '../lib/format.js';

const NAV = ['Integrations', 'Notifications', 'Alert rules', 'Sites', 'Team', 'Billing', 'API keys', 'Audit log'];

/* ---------- shared terminal controls ---------- */
function Switch({ on, onClick, labels = ['[ ON  ]', '[ OFF ]'] }) {
  return (
    <button className="tui-chip" data-on={on} onClick={onClick} aria-label="toggle"
      style={{ color: on ? 'var(--online)' : 'var(--tui-faint)' }}>
      {on ? labels[0] : labels[1]}
    </button>
  );
}
function Field({ label, hint, children }) {
  return (
    <label className="tui-field">
      <span className="tui-label">{label}</span>
      {children}
      {hint && <div className="tui-hint">{hint}</div>}
    </label>
  );
}
function randKey() {
  const c = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = ''; for (let i = 0; i < 32; i++) s += c[Math.floor(Math.random() * c.length)];
  return 'flv_live_' + s;
}
const mask = (k) => k.slice(0, 12) + '•'.repeat(12) + k.slice(-4);

/* ---------- integrations ---------- */
function IntegrationsTab() {
  const [integ, setInteg] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { getJSON('/api/integrations').then(setInteg).catch(() => {}); }, []);
  async function save() {
    try {
      await send('/api/integrations', 'PUT', {
        slack_webhook_url: integ.slack_webhook_url || '', email_to: integ.email_to || '',
        email_from: integ.email_from || '', ...(integ.resend_api_key ? { resend_api_key: integ.resend_api_key } : {}),
      });
    } catch { /* demo has no writable backend */ }
    setSaved(true); setTimeout(() => setSaved(false), 1600);
  }
  const CH = [
    ['#', 'SLACK', 'Alert delivery to channels', !!integ?.slack_webhook_url],
    ['@', 'EMAIL', 'Alert delivery via Resend', !!integ?.resend_configured],
    ['⬡', 'WEBHOOK', 'POST alerts to your endpoint', false],
  ];
  return (
    <>
      <TuiPanel title="DELIVERY CHANNELS" right={`${CH.filter((c) => c[3]).length}/${CH.length} LINKED`}>
        <div className="tui-scroll">
          <table className="tui-table" style={{ minWidth: 520 }}>
            <thead><tr><th>ID</th><th>CHANNEL</th><th>PURPOSE</th><th>STATE</th></tr></thead>
            <tbody>
              {CH.map(([icon, name, desc, on]) => (
                <tr key={name}>
                  <td style={{ color: 'var(--tui-accent)' }}>{icon}</td>
                  <td style={{ color: 'var(--tui-ink)' }}>{name}</td>
                  <td className="tui-dim2">{desc}</td>
                  <td style={{ color: on ? 'var(--online)' : 'var(--tui-faint)' }}>
                    {on ? '[ LINKED ]' : '[  --  ]'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TuiPanel>

      {integ && (
        <TuiPanel title="CONFIGURE DELIVERY">
          <div className="p-4 space-y-4">
            <Field label="SLACK INCOMING WEBHOOK">
              <input className="tui-input" placeholder="https://hooks.slack.com/services/…"
                value={integ.slack_webhook_url || ''} onChange={(e) => setInteg({ ...integ, slack_webhook_url: e.target.value })} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="ALERT EMAIL TO">
                <input className="tui-input" placeholder="ops@company.com"
                  value={integ.email_to || ''} onChange={(e) => setInteg({ ...integ, email_to: e.target.value })} />
              </Field>
              <Field label="RESEND API KEY"
                hint={integ.resend_configured ? 'A key is set — leave blank to keep it.' : 'Enables email delivery.'}>
                <input className="tui-input" type="password"
                  placeholder={integ.resend_configured ? '•••••••• (set)' : 're_…'}
                  onChange={(e) => setInteg({ ...integ, resend_api_key: e.target.value })} />
              </Field>
            </div>
            <button className="tui-btn" data-primary="true" onClick={save}>{saved ? '[ SAVED ✓ ]' : '[ SAVE ]'}</button>
          </div>
        </TuiPanel>
      )}
    </>
  );
}

/* ---------- notifications ---------- */
const NOTIF_EVENTS = ['Site offline', 'Site degraded', 'Obstruction detected', 'Site recovered', 'Weekly digest'];
function NotificationsTab() {
  const [chan, setChan] = useState({ email: true, slack: true, sms: false });
  const [m, setM] = useState(() => Object.fromEntries(NOTIF_EVENTS.map((e) => [e, { email: true, slack: e !== 'Weekly digest' }])));
  const [quiet, setQuiet] = useState(false);
  const flip = (e, k) => setM((s) => ({ ...s, [e]: { ...s[e], [k]: !s[e][k] } }));
  return (
    <>
      <TuiPanel title="CHANNELS">
        <div className="tui-scroll">
          <table className="tui-table" style={{ minWidth: 480 }}>
            <thead><tr><th>CHANNEL</th><th>TARGET</th><th>STATE</th></tr></thead>
            <tbody>
              {[['email', 'EMAIL', 'ops@company.com'], ['slack', 'SLACK', '#fleet-alerts'], ['sms', 'SMS', '+1 (555) 010-2233']].map(([k, name, sub]) => (
                <tr key={k}>
                  <td style={{ color: 'var(--tui-ink)' }}>{name}</td>
                  <td className="tui-dim2">{sub}</td>
                  <td><Switch on={chan[k]} onClick={() => setChan((c) => ({ ...c, [k]: !c[k] }))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TuiPanel>

      <TuiPanel title="PER-EVENT ROUTING">
        <div className="tui-scroll">
          <table className="tui-table" style={{ minWidth: 520 }}>
            <thead><tr><th>EVENT</th><th>EMAIL</th><th>SLACK</th></tr></thead>
            <tbody>
              {NOTIF_EVENTS.map((e) => (
                <tr key={e}>
                  <td style={{ color: 'var(--tui-ink)' }}>{e.toUpperCase()}</td>
                  <td><Switch on={m[e].email} onClick={() => flip(e, 'email')} labels={['[ ✓ ]', '[ · ]']} /></td>
                  <td><Switch on={m[e].slack} onClick={() => flip(e, 'slack')} labels={['[ ✓ ]', '[ · ]']} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TuiPanel>

      <TuiPanel title="QUIET HOURS">
        <div className="p-4 flex items-center gap-4 mono" style={{ fontSize: 12 }}>
          <span className="tui-dim2 flex-1">PAUSE NON-CRITICAL ALERTS <span style={{ color: 'var(--tui-ink)' }}>22:00 – 07:00</span></span>
          <Switch on={quiet} onClick={() => setQuiet((q) => !q)} />
        </div>
      </TuiPanel>
    </>
  );
}

/* ---------- alert rules ---------- */
function ruleDesc(r) {
  const m = Math.round(r.window_s / 60);
  if (r.type === 'site_down') return `DOWN ${m}M`;
  if (r.type === 'high_latency') return `> ${r.threshold}MS / ${m}M`;
  if (r.type === 'high_drop' || r.type === 'obstruction') return `> ${(r.threshold * 100).toFixed(0)}% / ${m}M`;
  return String(r.threshold);
}
function AlertRulesTab() {
  const [rules, setRules] = useState([]);
  useEffect(() => { getJSON('/api/alert-rules').then((d) => setRules(d.rules || [])).catch(() => {}); }, []);
  async function toggle(r) {
    const next = !r.enabled;
    setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled: next } : x)));
    try {
      await send(`/api/alert-rules/${r.id}`, 'PATCH', { threshold: r.threshold, window_s: r.window_s, channels: r.channels, enabled: next });
    } catch { /* demo */ }
  }
  return (
    <TuiPanel title="ALERT RULES" right={`${rules.filter((r) => r.enabled).length}/${rules.length} ARMED`}>
      <div className="tui-scroll">
        <table className="tui-table" style={{ minWidth: 620 }}>
          <thead><tr><th>RULE</th><th>THRESHOLD</th><th>CHANNELS</th><th>STATE</th></tr></thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td style={{ color: 'var(--tui-ink)' }}>{(ALERT_LABEL[r.type] || r.type).toUpperCase()}</td>
                <td>{ruleDesc(r)}</td>
                <td className="tui-dim2">{(r.channels || []).join(' · ').toUpperCase() || '—'}</td>
                <td><Switch on={!!r.enabled} onClick={() => toggle(r)} labels={['[ ARMED ]', '[ OFF   ]']} /></td>
              </tr>
            ))}
            {!rules.length && <tr><td colSpan={4} className="tui-dim2" style={{ textAlign: 'center', padding: '30px 0' }}>LOADING RULES…</td></tr>}
          </tbody>
        </table>
      </div>
    </TuiPanel>
  );
}

/* ---------- sites ---------- */
function SitesTab() {
  const [sites, setSites] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'office', region: '' });
  const [enrolled, setEnrolled] = useState(null);
  const [copied, setCopied] = useState('');
  useEffect(() => { getJSON('/api/fleet').then((d) => setSites(d.sites || [])).catch(() => {}); }, []);
  async function enroll(e) {
    e.preventDefault();
    if (!form.name) return;
    try { setEnrolled(await send('/api/enroll', 'POST', form)); }
    catch { setEnrolled({ token: 'flv_demo_token_not_persisted', docker: 'docker run … fleetview-agent' }); }
  }
  const copy = (t, w) => { navigator.clipboard?.writeText(t); setCopied(w); setTimeout(() => setCopied(''), 1500); };
  return (
    <>
      <TuiPanel title="REGISTERED SITES" right={`${sites.length} NODES`}>
        <div className="tui-scroll" style={{ maxHeight: 340, overflowY: 'auto' }}>
          <table className="tui-table" style={{ minWidth: 560 }}>
            <thead><tr><th>STATUS</th><th>SITE</th><th>TYPE</th><th>REGION</th></tr></thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id}>
                  <td><Tag status={s.status} obstructed={s.currently_obstructed} /></td>
                  <td style={{ color: 'var(--tui-ink)' }}>{s.name.toUpperCase()}</td>
                  <td className="tui-dim2">{(TYPE_LABEL[s.type] || s.type || '').toUpperCase()}</td>
                  <td className="tui-dim2">{(s.region || '').toUpperCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TuiPanel>

      <TuiPanel title="ENROLL NEW SITE">
        <form onSubmit={enroll} className="p-4 space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="SITE NAME">
              <input className="tui-input" placeholder="MV NEW VESSEL" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="TYPE">
              <select className="tui-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="REGION">
              <input className="tui-input" placeholder="NORTH SEA" value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })} />
            </Field>
          </div>
          <button className="tui-btn" data-primary="true" type="submit">[ GENERATE ENROLLMENT ]</button>

          {enrolled && (
            <div className="space-y-3 pt-2">
              <div>
                <div className="tui-label" style={{ marginBottom: 6 }}>ENROLLMENT TOKEN</div>
                <div className="flex gap-2">
                  <code className="tui-input" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{enrolled.token}</code>
                  <button type="button" className="tui-btn" onClick={() => copy(enrolled.token, 't')}>{copied === 't' ? '[ ✓ ]' : '[ COPY ]'}</button>
                </div>
              </div>
              <div>
                <div className="tui-label" style={{ marginBottom: 6 }}>INSTALL COMMAND</div>
                <div className="flex gap-2">
                  <code className="tui-input" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>docker run … fleetview-agent</code>
                  <button type="button" className="tui-btn" onClick={() => copy(enrolled.docker, 'c')}>{copied === 'c' ? '[ ✓ ]' : '[ COPY ]'}</button>
                </div>
              </div>
            </div>
          )}
        </form>
      </TuiPanel>
    </>
  );
}

/* ---------- team ---------- */
const TEAM = [
  ['Kingsley Teo', 'kingsley@fleetview.io', 'OWNER'],
  ['Mara Voss', 'mara@fleetview.io', 'ADMIN'],
  ['Diego Santos', 'diego@fleetview.io', 'OPERATOR'],
  ['Lena Park', 'lena@fleetview.io', 'VIEWER'],
];
function TeamTab() {
  const [invite, setInvite] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <TuiPanel title="TEAM ACCESS" right={`${TEAM.length} MEMBERS`}>
      <div className="p-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <Field label="INVITE BY EMAIL">
            <input className="tui-input" placeholder="teammate@company.com" value={invite} onChange={(e) => setInvite(e.target.value)} />
          </Field>
        </div>
        <select className="tui-input" style={{ width: 'auto' }}><option>VIEWER</option><option>OPERATOR</option><option>ADMIN</option></select>
        <button className="tui-btn" data-primary="true"
          onClick={() => { if (invite) { setSent(true); setInvite(''); setTimeout(() => setSent(false), 1600); } }}>
          {sent ? '[ INVITED ✓ ]' : '[ INVITE ]'}
        </button>
      </div>
      <div className="tui-scroll">
        <table className="tui-table" style={{ minWidth: 520 }}>
          <thead><tr><th>MEMBER</th><th>EMAIL</th><th>ROLE</th></tr></thead>
          <tbody>
            {TEAM.map(([name, email, role], i) => (
              <tr key={email}>
                <td style={{ color: 'var(--tui-ink)' }}>{name.toUpperCase()}{i === 0 && <span className="tui-dim2"> · YOU</span>}</td>
                <td className="tui-dim2">{email}</td>
                <td style={{ color: i === 0 ? 'var(--tui-accent)' : undefined }}>{role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TuiPanel>
  );
}

/* ---------- billing ---------- */
const INVOICES = [['2026-06-01', '$960.00'], ['2026-05-01', '$960.00'], ['2026-04-01', '$912.00']];
function BillingTab() {
  return (
    <>
      <TuiPanel title="PLAN">
        <TuiKV rows={[
          ['PLAN', 'GROWTH'],
          ['SITES', '40 / 100'],
          ['MONTHLY', '$960.00'],
          ['NEXT INVOICE', '2026-07-01'],
          ['PAYMENT METHOD', 'VISA •••• 4242 · EXP 08/29'],
        ]} />
      </TuiPanel>
      <TuiPanel title="INVOICES" right={`${INVOICES.length} ON FILE`}>
        <div className="tui-scroll">
          <table className="tui-table" style={{ minWidth: 460 }}>
            <thead><tr><th>DATE</th><th>AMOUNT</th><th>STATE</th><th>DOC</th></tr></thead>
            <tbody>
              {INVOICES.map(([d, a]) => (
                <tr key={d}>
                  <td style={{ color: 'var(--tui-ink)' }}>{d}</td>
                  <td>{a}</td>
                  <td style={{ color: 'var(--online)' }}>[ PAID ]</td>
                  <td><button className="tui-chip">[ PDF ]</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TuiPanel>
    </>
  );
}

/* ---------- api keys ---------- */
function ApiKeysTab() {
  const [keys, setKeys] = useState([
    { id: 1, name: 'Production', key: 'flv_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', created: '2026-04-12', used: '2h ago' },
    { id: 2, name: 'CI · read-only', key: 'flv_live_z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4', created: '2026-03-03', used: '5d ago' },
  ]);
  const [name, setName] = useState('');
  const [fresh, setFresh] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [copied, setCopied] = useState(false);
  function create() {
    const item = { id: Date.now(), name: name.trim() || 'Untitled key', key: randKey(), created: 'JUST NOW', used: 'never' };
    setKeys((ks) => [item, ...ks]); setFresh(item); setName('');
  }
  function revoke(id) { setKeys((ks) => ks.filter((k) => k.id !== id)); if (fresh?.id === id) setFresh(null); }
  return (
    <TuiPanel title="API KEYS" right={`${keys.length} ACTIVE`}>
      <div className="p-4 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <Field label="KEY NAME">
            <input className="tui-input" placeholder="PRODUCTION" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <button className="tui-btn" data-primary="true" onClick={create}>[ GENERATE KEY ]</button>
      </div>

      {fresh && (
        <div className="mx-4 mb-4 p-3" style={{ border: '1px solid var(--tui-accent)', background: 'rgba(78,161,255,0.08)' }}>
          <div className="tui-label" style={{ color: 'var(--tui-accent)', marginBottom: 6 }}>
            NEW KEY — COPY IT NOW, IT WILL NOT BE SHOWN AGAIN
          </div>
          <div className="flex gap-2 items-center">
            <code className="mono flex-1" style={{ fontSize: 12, color: 'var(--tui-ink)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fresh.key}</code>
            <button className="tui-btn" onClick={() => { navigator.clipboard?.writeText(fresh.key); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? '[ ✓ COPIED ]' : '[ COPY ]'}
            </button>
          </div>
        </div>
      )}

      <div className="tui-scroll">
        <table className="tui-table" style={{ minWidth: 700 }}>
          <thead><tr><th>NAME</th><th>KEY</th><th>CREATED</th><th>LAST USED</th><th>ACTIONS</th></tr></thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td style={{ color: 'var(--tui-ink)' }}>{k.name.toUpperCase()}</td>
                <td className="tui-dim2">{reveal === k.id ? k.key : mask(k.key)}</td>
                <td className="tui-dim2">{k.created}</td>
                <td className="tui-dim2">{k.used}</td>
                <td>
                  <button className="tui-chip" onClick={() => setReveal(reveal === k.id ? null : k.id)}>
                    {reveal === k.id ? '[ HIDE ]' : '[ SHOW ]'}
                  </button>
                  <button className="tui-chip" style={{ color: 'var(--offline)', marginLeft: 10 }} onClick={() => revoke(k.id)}>[ REVOKE ]</button>
                </td>
              </tr>
            ))}
            {!keys.length && <tr><td colSpan={5} className="tui-dim2" style={{ textAlign: 'center', padding: '30px 0' }}>NO KEYS — GENERATE ONE ABOVE</td></tr>}
          </tbody>
        </table>
      </div>
    </TuiPanel>
  );
}

/* ---------- audit ---------- */
const AUDIT = [
  ['12:31', 'KINGSLEY TEO', 'Generated API key "Production"'],
  ['09:02', 'MARA VOSS', 'Disabled rule "Obstruction detected"'],
  ['08:47', 'SYSTEM', 'Failover triggered on Atacama Copper'],
  ['-1d', 'DIEGO SANTOS', 'Added site "MV New Vessel"'],
  ['-1d', 'KINGSLEY TEO', 'Updated Slack integration'],
  ['-13d', 'LENA PARK', 'Signed in from Kuala Lumpur, MY'],
  ['-14d', 'SYSTEM', 'Alert fired — MV Magellan offline'],
  ['-15d', 'MARA VOSS', 'Invited diego@fleetview.io (Operator)'],
];
function AuditTab() {
  return (
    <TuiPanel title="AUDIT LOG" right={`${AUDIT.length} ENTRIES`}>
      <div className="tui-log mono">
        {AUDIT.map(([t, who, what], i) => (
          <div key={i} className="tui-log-row">
            <span className="tui-log-ts" style={{ minWidth: 46 }}>{t}</span>
            <span style={{ color: who === 'SYSTEM' ? 'var(--tui-accent)' : 'var(--tui-ink)', minWidth: 130 }}>{who}</span>
            <span className="tui-log-msg">{what}</span>
          </div>
        ))}
      </div>
    </TuiPanel>
  );
}

const TABS = {
  Integrations: IntegrationsTab, Notifications: NotificationsTab, 'Alert rules': AlertRulesTab,
  Sites: SitesTab, Team: TeamTab, Billing: BillingTab, 'API keys': ApiKeysTab, 'Audit log': AuditTab,
};

export default function Settings() {
  const [active, setActive] = useState('Integrations');
  const Tab = TABS[active];

  /* 1-8 jump straight to a section */
  useEffect(() => {
    const h = (e) => {
      const t = e.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || e.metaKey || e.ctrlKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= NAV.length) setActive(NAV[n - 1]);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="fade-in space-y-6">
      <div>
        <div className="tui-crumb mono">
          <span style={{ color: 'var(--tui-accent)' }}>SCOPE: CONFIG//ACCOUNT</span>
        </div>
        <h1 className="tui-h1 mono mt-3">ACCOUNT &amp; SETUP</h1>
      </div>

      <div className="grid md:grid-cols-[210px_1fr] gap-6">
        <nav className="tui-sidenav">
          {NAV.map((n, i) => (
            <button key={n} data-on={active === n} onClick={() => setActive(n)}>
              {String(i + 1).padStart(2, '0')} · {n}
            </button>
          ))}
        </nav>
        <div className="min-w-0 space-y-6">
          <Tab />
        </div>
      </div>
    </div>
  );
}
