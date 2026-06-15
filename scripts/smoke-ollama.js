'use strict';

// Manual smoke test: exercises the real generation pipeline against a running
// Ollama. Not part of `npm test` (it needs a live server + model).
// Run: node scripts/smoke-ollama.js [model]

const { createOllama } = require('../electron/ollama');
const { buildMessages, buildActionMessages } = require('../electron/prompt-engine');

(async () => {
  const endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
  const o = createOllama({ endpoint });

  const conn = await o.testConnection();
  if (!conn.ok) {
    console.error('CONNECTION FAILED:', conn.error);
    process.exit(1);
  }
  const model = process.argv[2] || conn.models.find((m) => !m.remote)?.name || conn.models[0].name;
  console.log(`Connected. Using model: ${model}\n--- generating ---`);

  const messages = buildMessages({
    input: 'the battle pass looks bad and shop isnt fullscreen and dont break saves',
    promptType: 'Redesign UI',
    targetAgent: 'Claude Code',
    clarify: false,
  });

  let out = '';
  await o.chatStream({
    model,
    temperature: 0.4,
    messages,
    onToken: (t) => {
      out += t;
      process.stdout.write(t);
    },
  });

  console.log('\n--- done ---');
  if (out.trim().length < 40) {
    console.error('FAIL: output too short');
    process.exit(1);
  }
  console.log(`OK: generated ${out.length} chars`);
})().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
