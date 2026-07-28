// Alert delivery: Slack incoming webhook + email (Resend). If creds are not
// configured, alerts still log to the console so the demo is fully observable.
export function createNotifier(getIntegrations) {
  async function deliver(channels, { subject, text, severity = 'info' }) {
    const integ = getIntegrations() || {};
    const tasks = [];

    if (channels.includes('slack') && integ.slack_webhook_url) {
      tasks.push(
        fetch(integ.slack_webhook_url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: `*${subject}*\n${text}` }),
          signal: AbortSignal.timeout(6000),
        }).catch(() => {}),
      );
    }

    if (channels.includes('email') && integ.resend_api_key && integ.email_to) {
      tasks.push(
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${integ.resend_api_key}` },
          body: JSON.stringify({
            from: integ.email_from || 'alerts@fleetview.app',
            to: integ.email_to.split(',').map((s) => s.trim()).filter(Boolean),
            subject,
            text,
          }),
          signal: AbortSignal.timeout(8000),
        }).catch(() => {}),
      );
    }

    const tag = tasks.length ? '(delivered)' : '(console only — add Slack/email in Settings)';
    console.log(`[alert:${severity}] ${subject} — ${text} ${tag}`);
    await Promise.all(tasks);
  }

  return { deliver };
}
