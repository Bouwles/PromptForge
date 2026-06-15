'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const db = require('../electron/db');

// Use a fresh in-memory database for the whole suite.
db.initDb(':memory:');

test('getSettings returns defaults before any writes', () => {
  const s = db.getSettings();
  assert.strictEqual(s.endpoint, 'http://localhost:11434');
  assert.strictEqual(s.temperature, 0.4);
  assert.strictEqual(s.clarifyBeforeGenerate, false);
});

test('setSetting round-trips JSON values', () => {
  db.setSetting('model', 'llama3.2:latest');
  db.setSetting('temperature', 0.7);
  db.setSetting('clarifyBeforeGenerate', true);
  const s = db.getSettings();
  assert.strictEqual(s.model, 'llama3.2:latest');
  assert.strictEqual(s.temperature, 0.7);
  assert.strictEqual(s.clarifyBeforeGenerate, true);
});

test('savePrompt inserts a one-off prompt with projectId null', () => {
  const saved = db.savePrompt({
    promptText: 'Build X',
    inputText: 'make x',
    targetAgent: 'Claude Code',
    promptType: 'Build Feature',
  });
  assert.ok(saved.id);
  assert.strictEqual(saved.projectId, null);
  assert.deepStrictEqual(saved.tags, []);

  const oneOffs = db.listPrompts({ projectId: null });
  assert.strictEqual(oneOffs.length, 1);
  assert.strictEqual(oneOffs[0].promptText, 'Build X');
});

test('savePrompt derives a title from input when none given', () => {
  const saved = db.savePrompt({ inputText: 'fix the broken save system please' });
  assert.match(saved.title, /fix the broken save system/);
});

test('deletePrompt removes the row', () => {
  const saved = db.savePrompt({ promptText: 'temp' });
  db.deletePrompt(saved.id);
  const all = db.listPrompts();
  assert.ok(!all.find((p) => p.id === saved.id));
});
