// PromptForge backend — a thin Cloudflare Worker proxy in front of OpenRouter.
// The browser (GitHub Pages) build calls this; the OpenRouter API key lives here
// as a Worker secret and never reaches the client.
//
// Endpoints:
//   GET  /api/models    -> { ok, models: [{ name, label }] }
//   POST /api/test      -> { ok, models } | { ok:false, error }
//   POST /api/generate  -> streamed OpenAI-style SSE (text/event-stream)
//
// Required secret:  OPENROUTER_API_KEY
// Optional vars:    ALLOWED_ORIGINS  (comma list, default "*")
//                   ALLOWED_MODELS   (comma list; if set, /api/models returns only these)
//                   APP_TITLE        (sent to OpenRouter as X-Title)

const OPENROUTER = 'https://openrouter.ai/api/v1';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (url.pathname === '/api/models' && request.method === 'GET') {
        return json(await listModels(env), 200, cors);
      }
      if (url.pathname === '/api/test' && request.method === 'POST') {
        const res = await listModels(env);
        return json(res, res.ok ? 200 : 502, cors);
      }
      if (url.pathname === '/api/generate' && request.method === 'POST') {
        return generate(request, env, cors);
      }
      if (url.pathname === '/' || url.pathname === '/api') {
        return json({ ok: true, service: 'promptforge-worker' }, 200, cors);
      }
      return json({ ok: false, error: 'Not found' }, 404, cors);
    } catch (err) {
      return json({ ok: false, error: err.message || 'Worker error' }, 500, cors);
    }
  },
};

async function listModels(env) {
  if (!env.OPENROUTER_API_KEY) {
    return { ok: false, error: 'Worker missing OPENROUTER_API_KEY secret.', models: [] };
  }
  if (env.ALLOWED_MODELS) {
    const models = env.ALLOWED_MODELS.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((id) => ({ name: id, label: id }));
    return { ok: true, models };
  }
  let res;
  try {
    res = await fetch(`${OPENROUTER}/models`, {
      headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}` },
    });
  } catch {
    return { ok: false, error: 'Cannot reach OpenRouter.', models: [] };
  }
  if (!res.ok) return { ok: false, error: `OpenRouter HTTP ${res.status}`, models: [] };
  const data = await res.json();
  const models = (Array.isArray(data.data) ? data.data : [])
    .map((m) => ({ name: m.id, label: m.name || m.id }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { ok: true, models };
}

async function generate(request, env, cors) {
  if (!env.OPENROUTER_API_KEY) {
    return json({ ok: false, error: 'Worker missing OPENROUTER_API_KEY secret.' }, 500, cors);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body.' }, 400, cors);
  }
  const { model, messages, temperature } = body || {};
  if (!model) return json({ ok: false, error: 'No model specified.' }, 400, cors);
  if (!Array.isArray(messages) || !messages.length) {
    return json({ ok: false, error: 'No messages provided.' }, 400, cors);
  }

  let upstream;
  try {
    upstream = await fetch(`${OPENROUTER}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': env.APP_TITLE || 'PromptForge',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: typeof temperature === 'number' ? temperature : 0.4,
        stream: true,
      }),
    });
  } catch {
    return json({ ok: false, error: 'Cannot reach OpenRouter.' }, 502, cors);
  }

  if (!upstream.ok || !upstream.body) {
    let error = `OpenRouter HTTP ${upstream.status}`;
    try {
      const j = await upstream.json();
      if (j && j.error && j.error.message) error = j.error.message;
    } catch {
      /* non-JSON error */
    }
    return json({ ok: false, error }, upstream.status === 401 ? 401 : 502, cors);
  }

  // Pass the OpenAI-style SSE stream straight through to the browser.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...cors,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  let allowOrigin = '*';
  if (!(allowed.length === 1 && allowed[0] === '*')) {
    allowOrigin = allowed.includes(origin) ? origin : allowed[0] || '';
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
