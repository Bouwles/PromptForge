// Web backend client — talks directly to the visitor's LOCAL Ollama from the
// browser (http://localhost:11434). No server, no API key, no cost. Mirrors
// electron/ollama.js (same /api/tags + /api/chat NDJSON streaming).
//
// Requires (visitor side):
//  - Ollama running locally with at least one model (`ollama pull llama3.2`)
//  - OLLAMA_ORIGINS set so the browser is allowed cross-origin, e.g.
//      setx OLLAMA_ORIGINS "https://bouwles.github.io"   (then restart Ollama)
//  - A Chromium browser (Chrome/Edge); Firefox/Safari block https->http localhost.

const OLLAMA_DOWN =
  'Cannot reach Ollama. Install it, run it, and set OLLAMA_ORIGINS for this site (see Settings).';

function base(url) {
  return (url || 'http://localhost:11434').replace(/\/+$/, '');
}

export function createBackend(endpoint) {
  const root = base(endpoint);

  async function listModels() {
    let res;
    try {
      res = await fetch(`${root}/api/tags`);
    } catch {
      throw new Error(OLLAMA_DOWN);
    }
    if (!res.ok) throw new Error(`Ollama returned HTTP ${res.status}`);
    const data = await res.json();
    const models = Array.isArray(data.models) ? data.models : [];
    return models.map((m) => ({ name: m.name, label: m.name, size: m.size || 0, remote: false }));
  }

  async function testConnection() {
    try {
      return { ok: true, models: await listModels() };
    } catch (err) {
      return { ok: false, error: (err && err.message) || OLLAMA_DOWN };
    }
  }

  // Stream a chat completion. Calls onToken(delta) per chunk. Returns full text.
  async function chatStream({ model, messages, temperature = 0.4, onToken, signal } = {}) {
    let res;
    try {
      res = await fetch(`${root}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: true, options: { temperature } }),
        signal,
      });
    } catch {
      throw new Error(OLLAMA_DOWN);
    }
    if (!res.ok) throw new Error(`Ollama returned HTTP ${res.status}`);
    if (!res.body) return consumeNdjson(await res.text(), onToken);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line) full += emitLine(line, onToken);
      }
    }
    if (buffer.trim()) full += emitLine(buffer.trim(), onToken);
    return full;
  }

  return { listModels, testConnection, chatStream };
}

function emitLine(line, onToken) {
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    return '';
  }
  const delta = obj && obj.message && typeof obj.message.content === 'string' ? obj.message.content : '';
  if (delta && typeof onToken === 'function') onToken(delta);
  return delta;
}

function consumeNdjson(text, onToken) {
  let full = '';
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t) full += emitLine(t, onToken);
  }
  return full;
}
