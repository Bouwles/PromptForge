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

test('createProject + getProject round-trips JSON fields', () => {
  const p = db.createProject({
    name: 'RAJIS',
    techStack: ['React', 'Three.js'],
    rules: 'do not break saves',
    importantSystems: 'firebase',
  });
  assert.ok(p.id);
  const got = db.getProject(p.id);
  assert.strictEqual(got.name, 'RAJIS');
  assert.deepStrictEqual(got.techStack, ['React', 'Three.js']);
  assert.strictEqual(got.promptCount, 0);
  assert.deepStrictEqual(got.pinnedFiles, []);
});

test('updateProject merges patch and bumps updatedAt', () => {
  const p = db.createProject({ name: 'X' });
  const upd = db.updateProject(p.id, { memory: 'mem', techStack: ['Vue'] });
  assert.strictEqual(upd.memory, 'mem');
  assert.deepStrictEqual(upd.techStack, ['Vue']);
  assert.ok(upd.updatedAt >= p.updatedAt);
});

test('project prompts count and cascade delete', () => {
  const p = db.createProject({ name: 'CascadeProj' });
  db.savePrompt({ projectId: p.id, promptText: 'a' });
  db.savePrompt({ projectId: p.id, promptText: 'b' });
  assert.strictEqual(db.getProject(p.id).promptCount, 2);
  db.deleteProject(p.id);
  assert.strictEqual(db.getProject(p.id), null);
  assert.strictEqual(db.listPrompts({ projectId: p.id }).length, 0);
});

test('setPinnedFiles replaces the pinned set', () => {
  const p = db.createProject({ name: 'Pin' });
  db.setPinnedFiles(p.id, ['a.js', 'b.js']);
  assert.deepStrictEqual(db.listPinnedFiles(p.id), ['a.js', 'b.js']);
  db.setPinnedFiles(p.id, ['c.js']);
  assert.deepStrictEqual(db.listPinnedFiles(p.id), ['c.js']);
});

test('toggleFavorite and duplicatePrompt', () => {
  const s = db.savePrompt({ promptText: 'orig', title: 'Orig' });
  const fav = db.toggleFavorite(s.id);
  assert.strictEqual(fav.favorite, true);
  const dup = db.duplicatePrompt(s.id);
  assert.match(dup.title, /\(copy\)/);
  assert.strictEqual(dup.promptText, 'orig');
});

test('searchPrompts filters by query', () => {
  db.savePrompt({ promptText: 'unicorn rainbow', title: 'magic' });
  const hits = db.searchPrompts({ query: 'unicorn' });
  assert.ok(hits.length >= 1);
  assert.ok(hits.every((p) => /unicorn/i.test(p.promptText) || /unicorn/i.test(p.title)));
});
