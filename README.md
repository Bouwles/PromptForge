# PromptForge

![PromptForge showcase](docs/assets/promptforge-showcase.svg)

A local, **Ollama-powered prompt engineer for coding agents**. PromptForge turns
messy coding ideas, bug reports, and feature requests into clean, structured,
copy-paste-ready prompts for Claude Code, Cursor, Windsurf, Replit Agent, and
other coding AIs. Not a general chatbot — it only writes coding prompts.

Everything runs locally. No login, no cloud, no code leaves your machine.

## Demo

![PromptForge demo](docs/assets/promptforge-demo.gif)

![PromptForge workflow](docs/assets/promptforge-workflow.svg)

The demo loop shows the product path: pick a workflow, provide a rough coding request,
generate a structured prompt, refine it, and save it for reuse.

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

The renderer is environment-agnostic: `renderer/src/api.js` delegates to Electron's
`window.api` when present, and otherwise to a browser implementation in
`renderer/src/web/` (IndexedDB storage, File System Access folder scanning, and an
OpenRouter-via-Worker backend). The same React app powers both the desktop and web builds.

## Online deployment (GitHub Pages + Cloudflare Worker)

GitHub Pages is static-only and can't run Ollama, so the web build talks to a tiny
**Cloudflare Worker** that proxies **OpenRouter** (the API key stays in the Worker, never
in the browser). Prompts, projects, and history live in the browser's IndexedDB; folder
scanning uses the File System Access API (Chromium-based browsers).

**1. Deploy the backend** (see [`worker/README.md`](worker/README.md)):

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put OPENROUTER_API_KEY
npm run deploy            # prints https://promptforge.<you>.workers.dev
```

Lock it to your site afterward by setting `ALLOWED_ORIGINS` in `worker/wrangler.toml`.
The endpoint is public — anyone who finds it can spend your OpenRouter credit, so add
Cloudflare rate limiting and keep `ALLOWED_ORIGINS` tight.

**2. Deploy the frontend.** In the repo: **Settings → Pages → Build and deployment →
Source: GitHub Actions**. Pushing to `main` runs [`.github/workflows/pages.yml`](.github/workflows/pages.yml),
which builds the web bundle and publishes it to `https://<user>.github.io/PromptForge/`.

Set the repo variable `VITE_BACKEND_URL` (Settings → Secrets and variables → Actions →
Variables) to your Worker URL to bake it in, or just paste it in the app under
**Settings → Backend URL**.

Build it locally with:

```bash
npm run build:web        # outputs static site to dist/renderer
```

> Note: the web build's base path is `/PromptForge/` (the repo name). If you rename the
> repo or use a user/org Pages site, set `VITE_BASE` accordingly.

## License

MIT
