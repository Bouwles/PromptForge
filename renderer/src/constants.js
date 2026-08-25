export const PROMPT_TYPES = [
  'Build Feature',
  'Fix Bug',
  'Redesign UI',
  'Refactor Code',
  'Improve Performance',
  'Add System',
  'Debug Error',
  'Write README',
  'Create Full Project',
  'Split Into Step-by-Step Prompts',
];

export const TARGET_AGENTS = [
  'Claude Code',
  'Cursor',
  'Windsurf',
  'Replit Agent',
  'Generic Coding AI',
];

// key must match ACTIONS in electron/prompt-engine.js
export const OUTPUT_ACTIONS = [
  { key: 'shorter', label: 'Make Shorter' },
  { key: 'detailed', label: 'Make More Detailed' },
  { key: 'specific', label: 'Make More Specific' },
  { key: 'aggressive', label: 'Make More Aggressive' },
  { key: 'tests', label: 'Add Tests' },
  { key: 'do_not_break', label: 'Add "Do Not Break"' },
  { key: 'ui_details', label: 'Add UI Details' },
  { key: 'split', label: 'Split Into Prompts' },
  { key: 'checklist', label: 'Make Checklist' },
  { key: 'to_claude_code', label: 'Turn Into Claude Code Prompt' },
  { key: 'to_cursor', label: 'Turn Into Cursor Prompt' },
];
