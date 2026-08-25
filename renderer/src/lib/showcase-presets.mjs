export const SHOWCASE_PRESETS = [
  {
    title: 'UI redesign with safeguards',
    promptType: 'Redesign UI',
    targetAgent: 'Claude Code',
    input:
      'Redesign this screen so it feels premium and easier to scan. Keep saves, routing, and mobile layout working. Add loading, empty, error, hover, active, and disabled states.',
  },
  {
    title: 'Bug fix with regression tests',
    promptType: 'Fix Bug',
    targetAgent: 'Cursor',
    input:
      'Users sometimes lose state after refresh. Find the cause, preserve existing data, and add regression tests that prove the saved state survives reload.',
  },
  {
    title: 'Performance profiling pass',
    promptType: 'Improve Performance',
    targetAgent: 'Claude Code',
    input:
      'The dashboard stutters with many items. Profile the slow path, reduce unnecessary rendering, keep behavior identical, and report the measurable before/after.',
  },
  {
    title: 'Refactor without behavior drift',
    promptType: 'Refactor Code',
    targetAgent: 'Windsurf',
    input:
      'Separate the business logic from the UI. Keep public behavior identical, avoid unrelated cleanup, and add tests around the extracted boundary.',
  },
];
