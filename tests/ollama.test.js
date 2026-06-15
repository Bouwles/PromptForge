'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createOllama, OLLAMA_DOWN_MESSAGE } = require('../electron/ollama');

function jsonResponse(obj) {
  return { ok: true, status: 200, json: async () => obj, text: async () => JSON.stringify(obj) };
}

test('listModels parses /api/tags into name/size/remote', async () => {
  const fetchFn = async (url) => {
    assert.match(url, /\/api\/tags$/);
    return jsonResponse({
      models: [
        { name: 'llama3.2:latest', size: 2019393189 },
        { name: 'qwen3.5:cloud', size: 346, remote_model: 'qwen3.5:397b' },
      ],
    });
  };
  const o = createOllama({ endpoint: 'http://localhost:11434', fetchFn });
  const models = await o.listModels();
  assert.deepStrictEqual(models, [
    { name: 'llama3.2:latest', size: 2019393189, remote: false },
    { name: 'qwen3.5:cloud', size: 346, remote: true },
  ]);
});

test('testConnection returns ok:true with models on success', async () => {
  const fetchFn = async () => jsonResponse({ models: [{ name: 'm1' }] });
  const o = createOllama({ fetchFn });
  const res = await o.testConnection();
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.models.length, 1);
});

test('testConnection returns exact down message when fetch throws', async () => {
  const fetchFn = async () => {
    throw new Error('ECONNREFUSED');
  };
  const o = createOllama({ fetchFn });
  const res = await o.testConnection();
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.error, OLLAMA_DOWN_MESSAGE);
});

test('chatStream emits tokens from NDJSON and returns full text', async () => {
  const ndjson =
    '{"message":{"content":"Hello"}}\n{"message":{"content":" world"}}\n{"done":true}\n';
  const fetchFn = async () => ({ ok: true, status: 200, body: null, text: async () => ndjson });
  const o = createOllama({ fetchFn });
  const tokens = [];
  const full = await o.chatStream({
    model: 'm',
    messages: [],
    onToken: (t) => tokens.push(t),
  });
  assert.deepStrictEqual(tokens, ['Hello', ' world']);
  assert.strictEqual(full, 'Hello world');
});

test('chatStream throws exact down message when fetch throws', async () => {
  const fetchFn = async () => {
    throw new Error('ECONNREFUSED');
  };
  const o = createOllama({ fetchFn });
  await assert.rejects(() => o.chatStream({ model: 'm', messages: [] }), {
    message: OLLAMA_DOWN_MESSAGE,
  });
});
