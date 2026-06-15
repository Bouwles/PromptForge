# PromptForge

A local, **Ollama-powered prompt engineer for coding agents**. PromptForge turns
messy coding ideas, bug reports, and feature requests into clean, structured,
copy-paste-ready prompts for Claude Code, Cursor, Windsurf, Replit Agent, and
other coding AIs. Not a general chatbot — it only writes coding prompts.

Everything runs locally. No login, no cloud, no code leaves your machine.

## Status

**Phases 1–3 complete and runnable.**

Core (Phase 1):
- Electron desktop app (Windows `.exe` + Mac `.dmg` targets)
- Connects to local Ollama; pick model, set endpoint + temperature, test connection
- One-off prompt generator with prompt types and target agents
- Streaming output into an editable monospace editor
- Refine actions: shorter, more detailed, more specific, more aggressive, add tests,
  add "do not break", add UI details, split into prompts, retarget to Claude Code / Cursor
- "Clarify before generating" toggle (model asks up to 3 questions first)
- Copy + save prompts (SQLite via WASM — no native build needed)
- Dark, 3-pane, coding-tool UI

Projects (Phase 2):
- Create / edit / delete projects with project cards
- Connect a local folder; scanner detects framework, language, package manager,
  dependencies, components, routes, db/data files, tests; renders a clean tree
- Editable project memory, rules, restrictions, important systems
- Project-aware prompts that include stack, memory, "do not break", and selected files

Context & history (Phase 3):
- File picker: tree with checkboxes + ★ pinning; small files inlined, large ones truncated
- Prompt history: search, copy, edit, duplicate, delete, favorite
- Home recents (recent projects + prompts)

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Ollama](https://ollama.com/) running locally with at least one model, e.g.:
  ```
  ollama pull llama3.2
  # or, ideal for coding prompts:
  ollama pull qwen2.5-coder
  ```

## Run (development)

```bash
npm install
npm run dev
```

This starts Vite and launches the Electron app. Open **Settings**, pick your model,
click **Test Connection**, then go to **One-Off Prompt** and generate.

## Build installers

```bash
npm run dist:win   # Windows NSIS .exe (run on Windows)
npm run dist:mac   # macOS .dmg (run on macOS)
```

Output lands in `release/`. Because SQLite is a WASM module (not a native binary),
the same bundle is portable — no per-platform native rebuild.

## Test

```bash
npm test                      # unit tests (ollama client, prompt engine, db)
node scripts/smoke-ollama.js  # live end-to-end generation against running Ollama
```

## Architecture

Electron, three layers with a strict privilege boundary:

- **Main process** (`electron/`) — owns the SQLite DB (`db.js`), the Ollama HTTP
  client (`ollama.js`), the prompt engine (`prompt-engine.js`), and IPC (`ipc.js`).
- **Preload** (`electron/preload.js`) — exposes a typed `window.api` via
  `contextBridge`. `contextIsolation` on, `nodeIntegration` off.
- **Renderer** (`renderer/`) — React + Vite + Zustand. UI only; calls `window.api`.

Data is stored in your OS app-data folder as `promptforge.db`.

## License

MIT
