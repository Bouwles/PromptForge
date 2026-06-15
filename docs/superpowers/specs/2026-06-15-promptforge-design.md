# PromptForge — Design

**Date:** 2026-06-15
**Status:** Approved

## Summary

PromptForge is a local, Ollama-powered desktop app whose only job is prompt
engineering for coding agents. It takes messy coding ideas, bug reports, feature
requests, and project descriptions and turns them into clean, structured,
copy-paste-ready prompts for agents like Claude Code, Cursor, Windsurf, and
Replit Agent. It is not a general chatbot.

Two modes: **one-off prompts** (quick, unattached) and **project prompts**
(aware of a connected local project folder, its memory, rules, restrictions,
and pinned files).

Everything stays local. No login, no cloud. Generation runs against a local
Ollama instance.

## Decisions

- **Packaging:** Electron desktop app. Builds a Windows `.exe` (NSIS) and a Mac
  `.dmg` via `electron-builder`. Gives native filesystem access for folder
  scanning and a single codebase.
- **Build order:** Phased. Phase 1 is a runnable MVP; Phases 2–3 layer on
  projects and history.
- **Storage:** SQLite via `better-sqlite3`. Native module — rebuilt for Electron
  with `electron-rebuild` / `@electron/rebuild` during install and packaging.
- **Frontend:** React + Vite, Zustand for state.
- **Repo:** A dedicated git repo is initialized in the PromptForge directory
  (it currently sits inside the user's home git repo; a local repo keeps commits
  clean and self-contained).

## Architecture

Electron, three layers with a strict privilege boundary:

- **Main process** (privileged): owns the SQLite DB, the filesystem scanner, and
  the Ollama HTTP client. All FS, DB, and network calls happen here.
- **Preload**: uses `contextBridge` to expose a typed `window.api` surface to the
  renderer. `contextIsolation` on, `nodeIntegration` off — the renderer is
  sandboxed and never touches Node directly.
- **Renderer**: React + Vite. UI only. Calls `window.api.*`, which `ipcRenderer`
  invokes into main-process handlers.

```
promptforge/
  main/
    main.js        app lifecycle, window creation
    db.js          SQLite init + migrations + CRUD
    ollama.js      list models, test connection, generate (stream)
    scanner.js     walk folder, ignore list, build tree + summary,
                   parse package.json / README
    ipc.js         register IPC channels -> module functions
    paths.js       app data dir resolution
  preload.js       contextBridge -> window.api
  renderer/
    index.html
    src/
      main.jsx
      App.jsx          3-pane shell + routing
      store.js         Zustand store
      api.js           thin wrapper over window.api
      screens/         Home, OneOff, Projects, ProjectWorkspace, Settings
      components/      Sidebar, PromptEditor, OutputActions, ModelPicker, etc.
      styles/          dark theme tokens
  electron-builder config (in package.json)
  vite.config.js
  package.json
```

## Data Model (SQLite)

```sql
settings (
  key    TEXT PRIMARY KEY,
  value  TEXT            -- JSON-encoded value
)
-- keys: endpoint, model, temperature, theme, dataPath, clarifyBeforeGenerate

projects (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  description      TEXT,
  folderPath       TEXT,
  techStack        TEXT,        -- JSON array
  targetAgent      TEXT,
  rules            TEXT,
  restrictions     TEXT,
  importantSystems TEXT,
  ignoredFolders   TEXT,        -- JSON array
  memory           TEXT,        -- editable project summary
  createdAt        INTEGER,
  updatedAt        INTEGER
)

prompts (
  id          TEXT PRIMARY KEY,
  projectId   TEXT,             -- NULL => one-off prompt
  title       TEXT,
  promptText  TEXT,
  inputText   TEXT,
  targetAgent TEXT,
  promptType  TEXT,
  tags        TEXT,             -- JSON array
  favorite    INTEGER DEFAULT 0,
  createdAt   INTEGER,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
)

pinned_files (
  id        TEXT PRIMARY KEY,
  projectId TEXT,
  path      TEXT,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
)
```

One-off prompts are `prompts` rows with `projectId = NULL`. They are only
inserted when the user clicks Save.

## Ollama Integration

- Endpoint configurable; default `http://localhost:11434`.
- `GET /api/tags` → available models (powers the model dropdown and Test
  Connection).
- `POST /api/chat` with `stream: true`, the internal system prompt, the assembled
  user message, and `options.temperature`. Tokens are streamed to the renderer
  over an IPC event channel so the output editor fills live.
- If Ollama is unreachable, surface exactly:
  `Ollama is not running. Start Ollama and try again.`
- Settings persisted: endpoint, default model, temperature, (later) max context.
- Default model = first locally installed model from `/api/tags`.

## Prompt Engine

- **Internal system prompt** is the PromptForge system prompt from the spec:
  coding-only prompt engineer; output only the improved prompt; always include
  "do not break"; structured (title, problem, goal, requirements, implementation
  notes, success criteria, test cases when useful); no fluff, no "here is your
  prompt", no motivational filler.
- **Template assembly in code** (not left to the model): the engine builds the
  scaffold for one-off vs project-aware prompts, injects user input, prompt type,
  target agent, and (Phase 2+) project context/pinned files, then asks the model
  to produce the final prompt within that structure.
- **Output actions** are follow-up generations: the current prompt text plus an
  action-specific instruction is sent back to the model. Actions: Improve, Make
  Shorter, Make More Detailed, Make More Aggressive, Make More Specific, Add
  Tests, Add UI Details, Add "Do Not Break" section, Split Into Multiple Prompts,
  Turn Into Claude Code Prompt, Turn Into Cursor Prompt, Regenerate.
- **Clarify before generating** toggle: when on, the model first returns up to 3
  clarifying questions; when off, it makes reasonable assumptions and generates
  immediately.
- **Split** produces multiple self-contained prompts, each rendered as its own
  copyable block.

## Prompt Types & Target Agents

- Prompt types: Build Feature, Fix Bug, Redesign UI, Refactor Code, Improve
  Performance, Add System, Debug Error, Write README, Create Full Project, Split
  Into Step-by-Step Prompts.
- Target agents: Claude Code, Cursor, Windsurf, Replit Agent, Generic Coding AI.

## UI

Dark theme (black / navy / gray), clean panels, monospace prompt editor, no
gradients, no clutter, coding-tool feel. Three-pane shell:

```
┌───────────────────────────────────────────────┐
│ PromptForge                                     │
├────────────┬─────────────────────┬─────────────┤
│ Left nav   │ Center               │ Right panel  │
│ Home       │ Prompt input         │ Context:     │
│ One-Off    │ type + agent select  │ files / rules│
│ Projects   │ Generated prompt     │ / settings   │
│ History    │ editor + actions     │              │
│ Settings   │                      │              │
└────────────┴─────────────────────┴─────────────┘
```

Frontend-design skill is used during the build for visual polish.

## Folder Scanner (Phase 2)

Walks a connected project folder and produces a compact summary rather than
dumping the codebase:

- Detects framework, package manager, dependencies (from `package.json`:
  scripts, dependencies, devDependencies).
- Summarizes README (description, setup, features).
- Maps src structure, likely entry files, UI components, backend routes,
  database/Firebase files, important data files, tests.
- **Ignores:** `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`,
  large media files, lock files (unless needed).
- Renders a clean project tree. Generates an editable **project memory**
  summary. The full codebase is never injected into prompts; the user selects
  specific files (Phase 3 file picker) for snippet/summary inclusion.

## Build Phases

### Phase 1 — MVP (runnable)
- Electron + Vite + React scaffold; dark 3-pane shell.
- SQLite DB bootstrap + migrations; settings persistence.
- Settings screen: endpoint, model dropdown (from `/api/tags`), temperature,
  Test Connection.
- One-off prompt: input, prompt-type select, target-agent select, "Clarify
  before generating" toggle, Generate (streaming).
- Output editor: editable, Copy, Save, Regenerate, Make Shorter, Make More
  Detailed, Split Into Multiple Prompts, Add Tests, Add "Do Not Break".
- Ollama-down handling with the exact message.

### Phase 2 — Projects
- Projects CRUD (create/open/edit/delete) with project cards.
- Connect local folder + scanner + tree view + Rescan.
- Project memory: auto-generated, manually editable.
- Project rules, restrictions, important systems, important/pinned files.
- Project-aware prompt generation using the project-aware template.

### Phase 3 — Context & History
- File picker: tree with checkboxes, pinned files, recent, search; small files
  inline as snippets, large files summarized.
- Prompt history per project: search, copy, duplicate, edit, delete, favorite.
- Split refinement; Home recents (recent projects, recent prompts).

## Packaging

`electron-builder`: Windows target `nsis` (`.exe`), Mac target `dmg`.
`@electron/rebuild` rebuilds `better-sqlite3` against the Electron ABI on install
and before packaging.

## Out of Scope

- Any cloud sync, accounts, or telemetry.
- Uploading project code anywhere.
- General-purpose chat unrelated to prompt engineering.
- Tauri / browser-only builds (Electron chosen).
