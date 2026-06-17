'use strict';

// Guards against drift between the Electron (CJS) prompt engine and the browser
// (ESM) copy used by the web build. If these diverge, web and desktop would emit
// different prompts.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const cjs = require('../electron/prompt-engine.js');

async function loadEsm() {
  const url = pathToFileURL(path.join(__dirname, '..', 'renderer', 'src', 'lib', 'prompt-engine.mjs'));
  return import(url.href);
}

test('web ESM prompt-engine matches electron CJS: SYSTEM_PROMPT', async () => {
  const esm = await loadEsm();
  assert.equal(esm.SYSTEM_PROMPT, cjs.SYSTEM_PROMPT);
});

test('web ESM prompt-engine matches electron CJS: ACTIONS', async () => {
  const esm = await loadEsm();
  assert.deepEqual(esm.ACTIONS, cjs.ACTIONS);
});

test('web ESM buildMessages matches electron CJS output', async () => {
  const esm = await loadEsm();
  const args = { input: 'fix the login bug', promptType: 'Fix Bug', targetAgent: 'Cursor' };
  assert.deepEqual(esm.buildMessages(args), cjs.buildMessages(args));
});

test('web ESM buildActionMessages matches electron CJS output', async () => {
  const esm = await loadEsm();
  const args = { currentPrompt: 'do the thing', action: 'shorter' };
  assert.deepEqual(esm.buildActionMessages(args), cjs.buildActionMessages(args));
});

test('web ESM buildProjectContext matches electron CJS output', async () => {
  const esm = await loadEsm();
  const project = { name: 'Demo', techStack: ['React'], memory: 'm', rules: 'r' };
  const files = [{ path: 'src/app.js', content: 'x' }];
  assert.equal(esm.buildProjectContext(project, files), cjs.buildProjectContext(project, files));
});
