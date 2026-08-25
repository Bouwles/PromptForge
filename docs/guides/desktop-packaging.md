# Desktop Packaging

PromptForge supports installer builds through Electron Builder and lightweight Windows packaging through Electron Packager.

```bash
npm run dist:win
npm run pack:win
```

Use `dist:win` for a normal installer release and `pack:win` for a quick portable smoke package.

Always run `npm test` and `npm run build` before packaging.
