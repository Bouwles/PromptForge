# Architecture Map

PromptForge separates local power from UI rendering.

- `electron/`: desktop runtime, Ollama client, SQLite storage, scanner, IPC, and security boundaries.
- `renderer/`: React screens, shared components, Zustand store, and visual system.
- `renderer/src/web/`: browser-compatible storage, scanner, and backend adapters.
- `worker/`: optional Cloudflare Worker proxy for hosted demos.
- `tests/`: unit coverage for prompt construction, storage, scanner behavior, Ollama streaming, and web parity.

The same React application runs in Electron and in a browser, while each runtime owns the privileged work appropriate to that environment.
