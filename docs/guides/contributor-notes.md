# Contributor Notes

Keep changes narrow and testable.

- Shared prompt behavior belongs in both Electron and web prompt-engine modules.
- Browser-only storage belongs in `renderer/src/web/`.
- Desktop-only filesystem, database, and IPC work belongs in `electron/`.
- Add tests for scanner and prompt-engine changes whenever behavior changes.
- Keep README media paths relative so GitHub renders them.
