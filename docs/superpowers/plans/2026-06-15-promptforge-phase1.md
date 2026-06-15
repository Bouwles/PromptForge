# PromptForge Phase 1 (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A runnable Electron desktop app that connects to local Ollama, lets the user configure model/endpoint/temperature, and generates polished one-off coding prompts with streaming output and refinement actions, copy, and save.

**Architecture:** Electron three-layer split — privileged main process (SQLite, Ollama HTTP, IPC), a `contextBridge` preload exposing `window.api`, and a sandboxed React+Vite renderer. Pure-logic modules (ollama client, db, prompt template assembly) are unit-tested with Node's built-in test runner; UI verified by running the app.

**Tech Stack:** Electron, Vite, React, Zustand, better-sqlite3, @electron/rebuild, electron-builder, node:test.

---

## File Structure

```
package.json            scripts, deps, electron-builder config
vite.config.js          renderer build (root = renderer/)
electron/
  main.js               app lifecycle, BrowserWindow, dev/prod load
  preload.js            contextBridge -> window.api
  paths.js              app data dir
  db.js                 better-sqlite3 init + migrations + CRUD
  ollama.js             listModels, testConnection, chatStream
  prompt-engine.js      system prompt + template assembly + action instructions
  ipc.js                register ipcMain handlers -> modules
renderer/
  index.html
  src/
    main.jsx
    App.jsx             3-pane shell + simple router
    store.js            Zustand: settings, current view, generation state
    api.js              wrapper over window.api
    constants.js        prompt types, target agents, output actions
    screens/
      Home.jsx
      OneOff.jsx
      Settings.jsx
    components/
      Sidebar.jsx
      PromptEditor.jsx
      OutputActions.jsx
      Field.jsx
    styles/theme.css    dark tokens + layout
tests/
  ollama.test.js
  prompt-engine.test.js
  db.test.js
```

---

## Task 1: Project scaffold + tooling

**Files:** Create `package.json`, `vite.config.js`, `renderer/index.html`, `renderer/src/main.jsx`, `renderer/src/App.jsx`, `electron/main.js`, `electron/preload.js`, `electron/paths.js`.

- [ ] Init npm, add deps: `electron`, `vite`, `@vitejs/plugin-react`, `react`, `react-dom`, `zustand`, `better-sqlite3`, dev deps `@electron/rebuild`, `electron-builder`, `concurrently`, `wait-on`, `cross-env`.
- [ ] Scripts: `dev` (vite + electron with wait-on), `build` (vite build), `rebuild` (@electron/rebuild for better-sqlite3), `dist` (build + electron-builder), `test` (node --test).
- [ ] `vite.config.js`: root `renderer/`, base `./`, build outDir `../dist/renderer`, plugin-react, dev server port 5173.
- [ ] `electron/main.js`: create BrowserWindow (contextIsolation true, nodeIntegration false, preload). In dev load `http://localhost:5173`; in prod load `dist/renderer/index.html`. Dark bg. Register IPC on ready.
- [ ] `electron/preload.js`: minimal placeholder `contextBridge.exposeInMainWorld('api', {...})` (filled Task 5).
- [ ] Minimal `App.jsx` renders "PromptForge".
- [ ] **Verify:** `npm run dev` opens a window showing PromptForge. Commit.

## Task 2: Ollama client (TDD)

**Files:** Create `electron/ollama.js`, `tests/ollama.test.js`.

- [ ] Write `tests/ollama.test.js`: `listModels` parses `/api/tags` JSON into `[{name,size}]`; `testConnection` returns `{ok:true,models}` on success and `{ok:false,error:'Ollama is not running. Start Ollama and try again.'}` on fetch throw. Mock `fetch` via dependency injection (pass fetch fn in).
- [ ] Run `node --test tests/ollama.test.js` → FAIL.
- [ ] Implement `ollama.js`: `createOllama({endpoint, fetchFn=fetch})` returning `{listModels, testConnection, chatStream}`. `chatStream({model,messages,temperature,onToken})` POSTs `/api/chat` with `stream:true`, reads NDJSON lines, calls `onToken(delta)` per `message.content`, resolves full text. Down/refused → throw with exact message.
- [ ] Run tests → PASS. Commit.

## Task 3: Prompt engine (TDD)

**Files:** Create `electron/prompt-engine.js`, `tests/prompt-engine.test.js`.

- [ ] Write tests: `SYSTEM_PROMPT` contains "coding-only prompt engineer" and "do not break" guidance; `buildMessages({input, promptType, targetAgent, clarify})` returns `[{role:'system'},{role:'user'}]` where user message includes the input, prompt type, target agent, and (when clarify) an "ask up to 3 questions" instruction; `actionInstruction('shorter')` etc. returns a non-empty directive string; unknown action throws.
- [ ] Run → FAIL.
- [ ] Implement: export `SYSTEM_PROMPT` (the spec's PromptForge system prompt), `buildMessages(opts)`, `buildActionMessages({currentPrompt, action})`, `ACTIONS` map. Templates assembled in code per design (one-off scaffold; project-aware deferred to Phase 2).
- [ ] Run → PASS. Commit.

## Task 4: SQLite db (TDD)

**Files:** Create `electron/db.js`, `electron/paths.js`, `tests/db.test.js`.

- [ ] Write tests against an in-memory / temp-file db: `initDb(path)` creates tables; `getSettings()` returns defaults merged; `setSetting(k,v)` round-trips JSON; `savePrompt(row)` inserts and `listPrompts()` returns it; one-off prompt has `projectId null`.
- [ ] Run → FAIL.
- [ ] Implement `db.js`: open better-sqlite3, run migrations (settings, projects, prompts, pinned_files per spec), CRUD helpers, JSON encode/decode. `paths.js`: resolve app data dir (`app.getPath('userData')`, fallback for tests).
- [ ] Run `npm run rebuild` then `node --test tests/db.test.js` → PASS. Commit.

## Task 5: IPC + preload bridge

**Files:** Create `electron/ipc.js`; modify `electron/preload.js`, `electron/main.js`.

- [ ] `ipc.js`: register handlers — `ollama:list`, `ollama:test`, `settings:get`, `settings:set`, `prompt:save`, `prompt:list`, and `generate:start` / streamed `generate:token` / `generate:done` / `generate:error` events (using event sender). Generation reads current settings (endpoint/model/temp) from db.
- [ ] `preload.js`: expose `window.api` = `{ listModels, testConnection, getSettings, setSetting, savePrompt, listPrompts, generate(messages, handlers), generateAction(...) }`. Streaming via `ipcRenderer.on` channels with a request id.
- [ ] **Verify:** from devtools console `window.api.testConnection()` resolves with models. Commit.

## Task 6: Renderer foundation — store, api, theme, shell

**Files:** Create `renderer/src/store.js`, `api.js`, `constants.js`, `styles/theme.css`, `components/Sidebar.jsx`, `components/Field.jsx`; modify `App.jsx`, `main.jsx`.

- [ ] `theme.css`: dark tokens (bg `#0b0f17`, panel `#121826`, border `#1f2733`, text, accent), 3-pane grid layout, monospace stack for editor.
- [ ] `store.js` (Zustand): `view`, `settings`, `models`, `connection`, `oneOff` (input, promptType, targetAgent, clarify, output, streaming), actions to load settings/models and set fields.
- [ ] `api.js`: thin async wrappers over `window.api`.
- [ ] `constants.js`: `PROMPT_TYPES`, `TARGET_AGENTS`, `OUTPUT_ACTIONS` arrays.
- [ ] `App.jsx`: 3-pane shell; left `Sidebar` (Home, One-Off, Settings — Projects/History shown disabled "Phase 2"); center routed by `view`; right context panel placeholder. Load settings+models on mount.
- [ ] **Verify:** app shows dark 3-pane shell, nav switches views. Commit.

## Task 7: Settings screen

**Files:** Create `renderer/src/screens/Settings.jsx`.

- [ ] Fields: endpoint input (default `http://localhost:11434`), model dropdown (populated from `listModels`), temperature slider (0–1), Test Connection button. Persist each change via `setSetting`.
- [ ] Test Connection shows model count on success or the exact `Ollama is not running...` message on failure.
- [ ] **Verify:** change model, restart app, value persists; Test Connection works against running Ollama. Commit.

## Task 8: One-Off generator + output editor + actions

**Files:** Create `renderer/src/screens/OneOff.jsx`, `components/PromptEditor.jsx`, `components/OutputActions.jsx`.

- [ ] OneOff: messy-input textarea, prompt-type select, target-agent select, "Clarify before generating" toggle, Generate button.
- [ ] Generate calls `api.generate(buildMessages(...))`; tokens stream into the output editor live; disable Generate while streaming; show Ollama-down message inline on error.
- [ ] `PromptEditor`: editable monospace textarea bound to output; Copy button (clipboard) with copied feedback.
- [ ] `OutputActions`: buttons Regenerate, Make Shorter, Make More Detailed, Split Into Multiple Prompts, Add Tests, Add "Do Not Break", Save. Action buttons run `generateAction(currentPrompt, action)` and replace/append output. Save writes prompt row (projectId null) via `savePrompt`.
- [ ] **Verify:** end-to-end — type messy request, Generate, watch stream, run an action, Copy, Save. Commit.

## Task 9: Polish + packaging config + run

**Files:** modify `package.json` (build config), `electron/main.js`.

- [ ] electron-builder config: appId, productName PromptForge, win target nsis, mac target dmg, files include `dist/**`, `electron/**`, `node_modules/better-sqlite3/**`.
- [ ] Frontend-design pass on spacing/typography/states (loading, empty, error, copied).
- [ ] **Verify:** `npm run dev` full smoke test of Settings + One-Off against live Ollama (`llama3.2:latest`). Confirm generation produces a structured prompt. Commit.

---

## Self-Review

- **Spec coverage (Phase 1 portion):** Ollama connect/test/model-select/temp ✓ (T2,T7); one-off flow type+agent+clarify ✓ (T3,T8); streaming output ✓ (T2,T8); output actions shorter/detailed/split/tests/do-not-break/regenerate ✓ (T3,T8); copy ✓ (T8); save to db ✓ (T4,T8); Ollama-down exact message ✓ (T2,T7,T8); dark 3-pane coding UI ✓ (T6); SQLite storage ✓ (T4); local/private ✓ (no network except Ollama). Projects/scanner/memory/history/file-picker/packaging-binaries = Phases 2–3 (deferred by design).
- **Placeholders:** none — each task names files, contracts, verification.
- **Type consistency:** `window.api` surface (T5) matches `api.js` wrappers (T6) and calls in screens (T7,T8); `buildMessages`/`buildActionMessages`/`ACTIONS` names consistent T3↔T8; `createOllama().chatStream` signature consistent T2↔T5.
