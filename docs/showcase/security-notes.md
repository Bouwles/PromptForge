# Security Notes

PromptForge uses Electron with `contextIsolation` enabled and `nodeIntegration` disabled in the renderer. The preload layer exposes a constrained `window.api` instead of giving the UI direct filesystem or Node access.

Project folder access should stay explicit. The scanner ignores heavy/generated folders and skips media/binary files so prompts stay focused and private snippets are only included when selected or pinned.

For web deployment, never expose an unrestricted paid-model proxy. Use locked origins, limited model allow-lists, and provider-side rate limits.
