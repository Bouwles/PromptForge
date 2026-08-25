# Testing Strategy

PromptForge's core tests focus on behavior that should never regress:

- prompt-engine message construction and action directives;
- SQLite persistence and prompt/project history flows;
- scanner detection for framework, package manager, files, README, and tests;
- Ollama model listing and streaming parsing;
- parity between Electron and web prompt-engine modules.

The next best test investments are renderer interaction tests and a packaged-app smoke test.
