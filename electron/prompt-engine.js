'use strict';

const SYSTEM_PROMPT = `You are PromptForge, a coding-only prompt engineer.

Your job is to transform messy coding requests into clear, detailed, copy-paste-ready prompts for coding agents such as Claude Code, Cursor, Windsurf, Replit Agent, and other coding AIs.

You do not write casual chatbot answers unless asked. You generate strong prompts.

Always preserve working systems. Always include what not to break. Always make the prompt specific, actionable, and structured.

If project context is provided, use it. Mention important systems, files, and restrictions. Do not invent details that contradict the project context.

For bug fixes, include:
- current broken behavior
- expected behavior
- likely areas to inspect
- exact requirements
- test cases

For UI redesigns, include:
- current visual problem
- desired layout
- styling rules
- interaction states
- final quality bar

For feature additions, include:
- goal
- user flow
- data model if relevant
- UI behavior
- persistence requirements
- edge cases
- success criteria

Do not produce vague prompts.
Do not say "Here is your prompt."
Do not include motivational filler.
Do not over-explain.
Output only the improved prompt unless the user asks otherwise.`;

const PROMPT_TYPES = [
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

const TARGET_AGENTS = [
  'Claude Code',
  'Cursor',
  'Windsurf',
  'Replit Agent',
  'Generic Coding AI',
];

// Action key -> directive appended to a follow-up generation.
const ACTIONS = {
  improve: 'Improve this prompt. Make it clearer, more specific, and better structured while preserving its intent.',
  shorter: 'Rewrite this prompt to be significantly shorter while keeping every essential instruction. Remove redundancy, keep specificity.',
  detailed: 'Expand this prompt with more implementation detail, edge cases, and exact requirements. Keep it structured and free of filler.',
  aggressive: 'Rewrite this prompt with a more direct, demanding tone. Be blunt about requirements and what must not break. No hedging.',
  specific: 'Make this prompt more specific. Replace vague phrasing with concrete, measurable requirements and exact expected behavior.',
  tests: 'Add a "Test cases" section to this prompt with concrete, checkable test cases that verify the requested behavior.',
  ui_details: 'Add a detailed UI/UX section to this prompt: layout, spacing, states (loading/empty/error/hover/active), and a final quality bar.',
  do_not_break: 'Add a clear "Do not break" section to this prompt listing existing behavior and systems that must keep working.',
  split: 'Split this into multiple self-contained step-by-step prompts. Number each prompt. Each prompt must restate enough context to stand alone so the coding agent does not lose requirements between steps.',
  checklist: 'Convert this prompt into a strict implementation checklist. Preserve the original intent, group the work into ordered phases, and make each item independently verifiable.',
  to_claude_code: 'Rewrite this prompt specifically for Claude Code: reference relevant files/dirs, state what to change and what not to break, and give concrete success criteria.',
  to_cursor: 'Rewrite this prompt specifically for Cursor: concise, file-focused, with clear acceptance criteria.',
};

/**
 * Build the system+user messages for an initial generation.
 */
function buildMessages({ input, promptType, targetAgent, clarify = false, projectContext = '' } = {}) {
  const lines = [];
  lines.push(`Target coding agent: ${targetAgent || 'Generic Coding AI'}`);
  lines.push(`Prompt type: ${promptType || 'Build Feature'}`);
  if (projectContext && projectContext.trim()) {
    lines.push('');
    lines.push('Project context:');
    lines.push(projectContext.trim());
  }
  lines.push('');
  lines.push('Raw request from the user:');
  lines.push((input || '').trim());
  lines.push('');

  const hasProject = Boolean(projectContext && projectContext.trim());

  if (clarify) {
    lines.push(
      'Before writing the prompt, ask up to 3 short clarifying questions that would most improve the result. Output ONLY the numbered questions and nothing else.'
    );
  } else if (hasProject) {
    lines.push(
      'Make reasonable assumptions where details are missing. Output ONLY the finished, copy-paste-ready prompt for the target agent. Use this structure with clear headings:'
    );
    lines.push(
      'Update [PROJECT NAME]. / Project context / Task / Do not break / Current problems / Required changes / Implementation notes / Final requirements / Test cases (when useful).'
    );
    lines.push(
      'Use the real project name and reference the listed important systems and files. Do not invent details that contradict the project context.'
    );
  } else {
    lines.push(
      'Make reasonable assumptions where details are missing. Output ONLY the finished, copy-paste-ready prompt for the target agent. Use clear headings and bullet points. Include a "Do not break" section and, when useful, test cases.'
    );
  }

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: lines.join('\n') },
  ];
}

/**
 * Build messages for a follow-up action applied to an existing prompt.
 */
function buildActionMessages({ currentPrompt, action } = {}) {
  const directive = ACTIONS[action];
  if (!directive) throw new Error(`Unknown action: ${action}`);
  const user = [
    directive,
    '',
    'Output ONLY the resulting prompt(s). No preamble, no explanation.',
    '',
    'Current prompt:',
    '"""',
    (currentPrompt || '').trim(),
    '"""',
  ].join('\n');
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ];
}

/**
 * Assemble a compact project-context string for project-aware prompts.
 * @param {object} project full project record (name, memory, techStack, rules, ...)
 * @param {Array<{path:string, content?:string, truncated?:boolean}>} [files] selected files
 */
function buildProjectContext(project = {}, files = []) {
  const out = [];
  out.push(`Project: ${project.name || 'Untitled Project'}`);
  if (project.description) out.push(`Description: ${project.description}`);

  const stack = Array.isArray(project.techStack) ? project.techStack : [];
  if (project.framework || stack.length) {
    out.push(`Stack: ${[project.framework, ...stack].filter(Boolean).join(', ')}`);
  }
  if (project.memory && project.memory.trim()) {
    out.push('');
    out.push('Project memory:');
    out.push(project.memory.trim());
  }
  if (project.importantSystems && project.importantSystems.trim()) {
    out.push('');
    out.push('Important systems (must keep working):');
    out.push(project.importantSystems.trim());
  }
  if (project.rules && project.rules.trim()) {
    out.push('');
    out.push('Rules the prompt must follow:');
    out.push(project.rules.trim());
  }
  if (project.restrictions && project.restrictions.trim()) {
    out.push('');
    out.push('Restrictions (the agent must avoid):');
    out.push(project.restrictions.trim());
  }

  const list = Array.isArray(files) ? files.filter((f) => f && f.path) : [];
  if (list.length) {
    out.push('');
    out.push('Pay special attention to these files:');
    for (const f of list) out.push(`- ${f.path}`);

    const withContent = list.filter((f) => f.content && f.content.trim());
    if (withContent.length) {
      out.push('');
      out.push('Relevant file contents:');
      for (const f of withContent) {
        out.push('');
        out.push(`File: ${f.path}${f.truncated ? ' (truncated)' : ''}`);
        out.push('```');
        out.push(f.content.trim());
        out.push('```');
      }
    }
  }

  return out.join('\n');
}

module.exports = {
  SYSTEM_PROMPT,
  PROMPT_TYPES,
  TARGET_AGENTS,
  ACTIONS,
  buildMessages,
  buildActionMessages,
  buildProjectContext,
};
