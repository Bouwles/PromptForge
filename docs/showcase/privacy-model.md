# Privacy Model

PromptForge is designed around local-first usage.

- Desktop generation talks to the user's local Ollama endpoint.
- Desktop prompt history uses local SQLite through a WASM package.
- Web storage uses IndexedDB in the browser.
- Project scanning reads local folder metadata and selected file snippets.
- No login or hosted database is required for the core app.

For hosted web demos, the safest story is still local Ollama. If a proxy backend is used for a public demo, lock CORS origins and model access before sharing the endpoint.
