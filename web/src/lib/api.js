export async function getJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

export async function send(path, method, body) {
  const r = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

// Auto-reconnecting WebSocket for live telemetry deltas.
export function connectWS(onMessage, onOpen) {
  let ws;
  let closed = false;
  let timer;
  function open() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => onOpen && onOpen();
    ws.onmessage = (e) => { try { onMessage(JSON.parse(e.data)); } catch { /* ignore */ } };
    ws.onclose = () => { if (!closed) timer = setTimeout(open, 2000); };
    ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
  }
  open();
  return () => { closed = true; clearTimeout(timer); try { ws.close(); } catch { /* ignore */ } };
}
