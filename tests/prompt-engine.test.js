'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  SYSTEM_PROMPT,
  buildMessages,
  buildActionMessages,
  ACTIONS,
} = require('../electron/prompt-engine');

test('SYSTEM_PROMPT defines coding-only prompt engineer with do-not-break rule', () => {
  assert.match(SYSTEM_PROMPT, /coding-only prompt engineer/i);
  assert.match(SYSTEM_PROMPT, /what not to break/i);
  assert.match(SYSTEM_PROMPT, /Output only the improved prompt/i);
});

test('buildMessages returns system + user with input, type, agent', () => {
  const msgs = buildMessages({
    input: 'battle pass looks bad and shop isnt fullscreen',
    promptType: 'Redesign UI',
    targetAgent: 'Claude Code',
  });
  assert.strictEqual(msgs.length, 2);
  assert.strictEqual(msgs[0].role, 'system');
  assert.strictEqual(msgs[1].role, 'user');
  assert.match(msgs[1].content, /Redesign UI/);
  assert.match(msgs[1].content, /Claude Code/);
  assert.match(msgs[1].content, /battle pass looks bad/);
});

test('buildMessages adds clarifying-questions instruction when clarify=true', () => {
  const msgs = buildMessages({ input: 'x', clarify: true });
  assert.match(msgs[1].content, /up to 3 short clarifying questions/i);
});

test('buildMessages without clarify instructs final prompt output only', () => {
  const msgs = buildMessages({ input: 'x', clarify: false });
  assert.match(msgs[1].content, /Output ONLY the finished/i);
});

test('buildActionMessages includes directive and current prompt', () => {
  const msgs = buildActionMessages({ currentPrompt: 'PROMPT BODY', action: 'shorter' });
  assert.match(msgs[1].content, /shorter/i);
  assert.match(msgs[1].content, /PROMPT BODY/);
});

test('buildActionMessages throws on unknown action', () => {
  assert.throws(() => buildActionMessages({ currentPrompt: 'x', action: 'nope' }), /Unknown action/);
});

test('every advertised action has a directive', () => {
  for (const key of Object.keys(ACTIONS)) {
    assert.ok(ACTIONS[key].length > 0, `action ${key} has directive`);
  }
});
