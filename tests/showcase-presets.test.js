'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

test('showcase presets are usable starter prompts', async () => {
  const { SHOWCASE_PRESETS } = await import('../renderer/src/lib/showcase-presets.mjs');
  assert.ok(SHOWCASE_PRESETS.length >= 4);
  for (const preset of SHOWCASE_PRESETS) {
    assert.ok(preset.title.length > 6);
    assert.match(preset.input, /keep|preserve|identical/i);
    assert.ok(preset.promptType);
    assert.ok(preset.targetAgent);
  }
});
