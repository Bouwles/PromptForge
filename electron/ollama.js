'use strict';

const OLLAMA_DOWN_MESSAGE = 'Ollama is not running. Start Ollama and try again.';

/**
 * Create an Ollama client bound to an endpoint.
 * @param {object} opts
 * @param {string} opts.endpoint base URL, e.g. http://localhost:11434
 * @param {Function} [opts.fetchFn] fetch implementation (injectable for tests)
 */
function createOllama({ endpoint, fetchFn } = {}) {
  const base = (endpoint || 'http://localhost:11434').replace(/\/+$/, '');
  const doFetch = fetchFn || globalThis.fetch;

  async function listModels() {
    let res;
    try {
      res = await doFetch(`${base}/api/tags`);
    } catch {
      throw new Error(OLLAMA_DOWN_MESSAGE);
    }
    if (!res.ok) throw new Error(`Ollama returned HTTP ${res.status}`);
    const data = await res.json();
    const models = Array.isArray(data.models) ? data.models : [];
    return models.map((m) => ({
      name: m.name,
      size: m.size || 0,
      remote: Boolean(m.remote_model),
    }));
  }

  async function testConnection() {
    try {
      const models = await listModels();
      return { ok: true, models };
    } catch (err) {
      const msg = err && err.message === OLLAMA_DOWN_MESSAGE
        ? OLLAMA_DOWN_MESSAGE
        : (err && err.message) || OLLAMA_DOWN_MESSAGE;
      return { ok: false, error: msg };
    }
  }

  /**
   * Stream a chat completion. Calls onToken(delta) per content chunk.
   * @returns {Promise<string>} the full assembled text
   */
  async function chatStream({ model, messages, temperature = 0.4, onToken, signal } = {}) {
    let res;
    try {
      res = await doFetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          options: { temperature },
        }),
        signal,
      });
    } catch {
      throw new Error(OLLAMA_DOWN_MESSAGE);
    }
    if (!res.ok) throw new Error(`Ollama returned HTTP ${res.status}`);
    if (!res.body) {
      // Non-streaming fallback (e.g. mocked); parse whole body as NDJSON.
      const text = await res.text();
      return consumeNdjson(text, onToken);
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
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        full += emitLine(line, onToken);
      }
    }
    if (buffer.trim()) full += emitLine(buffer.trim(), onToken);
    return full;
  }

  return { listModels, testConnection, chatStream, OLLAMA_DOWN_MESSAGE };
}

function emitLine(line, onToken) {
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    return '';
  }
  const delta = obj && obj.message && typeof obj.message.content === 'string'
    ? obj.message.content
    : '';
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

module.exports = { createOllama, OLLAMA_DOWN_MESSAGE };
