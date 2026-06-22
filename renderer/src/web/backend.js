// Web backend client. Talks to the PromptForge Cloudflare Worker, which proxies
// OpenRouter (so the API key never ships to the browser). Mirrors the surface of
// electron/ollama.js: listModels, testConnection, chatStream.

const NO_BACKEND =
  'No backend URL set. Open Settings and paste your PromptForge Worker URL.';

function base(url) {
  return (url || '').replace(/\/+$/, '');
}

/**
 * @param {string} backendUrl base URL of the deployed Worker
 */
export function createBackend(backendUrl) {
  const root = base(backendUrl);

  async function listModels() {
    if (!root) throw new Error(NO_BACKEND);
    let res;
    try {
      res = await fetch(`${root}/api/models`);
    } catch {
      throw new Error('Cannot reach the backend. Check the URL in Settings.');
    }
    if (!res.ok) throw new Error(`Backend returned HTTP ${res.status}`);
    const data = await res.json();
    const all = Array.isArray(data.models) ? data.models : [];
    // ponytail: free-only dropdown. Drop the filter to show paid models too.
    const models = all.filter((m) => (m.name || m.id || '').endsWith(':free'));
    return models.map((m) => ({
      name: m.name || m.id,
      label: m.label || m.name || m.id,
      size: m.size || 0,
      remote: true,
    }));
  }

  async function testConnection() {
    try {
      const models = await listModels();
      return { ok: true, models };
    } catch (err) {
      return { ok: false, error: (err && err.message) || 'Backend unavailable.' };
    }
  }

  /**
   * Stream a chat completion via the Worker. Calls onToken(delta) per chunk.
   * The Worker forwards OpenRouter's OpenAI-style SSE unchanged.
   * @returns {Promise<string>} full assembled text
   */
  async function chatStream({ model, messages, temperature = 0.4, onToken, signal } = {}) {
    if (!root) throw new Error(NO_BACKEND);
    let res;
    try {
      res = await fetch(`${root}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature }),
        signal,
      });
    } catch {
      throw new Error('Cannot reach the backend. Check the URL in Settings.');
    }
    if (!res.ok) {
      let msg = `Backend returned HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j && j.error) msg = j.error;
      } catch {
        /* non-JSON error body */
      }
      throw new Error(msg);
    }
    if (!res.body) {
      const text = await res.text();
      return consumeSse(text, onToken);
    }

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
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        full += emitLine(line, onToken);
      }
    }
    if (buffer) full += emitLine(buffer, onToken);
    return full;
  }

  return { listModels, testConnection, chatStream };
}

// Parse one SSE line of the OpenAI/OpenRouter streaming format.
function emitLine(rawLine, onToken) {
  const line = rawLine.trim();
  if (!line) return '';
  if (line.startsWith(':')) return ''; // SSE comment / keep-alive (e.g. ": OPENROUTER PROCESSING")
  if (!line.startsWith('data:')) return '';
  const payload = line.slice(5).trim();
  if (!payload || payload === '[DONE]') return '';
  let obj;
  try {
    obj = JSON.parse(payload);
  } catch {
    return '';
  }
  const delta =
    obj && obj.choices && obj.choices[0] && obj.choices[0].delta && typeof obj.choices[0].delta.content === 'string'
      ? obj.choices[0].delta.content
      : '';
  if (delta && typeof onToken === 'function') onToken(delta);
  return delta;
}

function consumeSse(text, onToken) {
  let full = '';
  for (const line of text.split('\n')) full += emitLine(line, onToken);
  return full;
}
