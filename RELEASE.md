# PromptForge Release Guide

PromptForge ships as a portable Windows zip from GitHub Releases. The zip contains
`PromptForge.exe` and the runtime files needed to launch it.

## Build Locally

```bash
npm ci
npm test
npm run pack:win
Compress-Archive -Path "release/PromptForge-win32-x64/*" -DestinationPath "release/PromptForge-0.2.0-Windows-x64.zip" -Force
```

The portable app folder and release zip are written to `release/`.

## Publish

1. Update `package.json` and `package-lock.json` to the next version.
2. Commit the release prep.
3. Create and push a tag:

```bash
git tag v0.2.0
git push origin main
git push origin v0.2.0
```

The `Release` workflow builds the portable Windows app zip and attaches it to the GitHub Release.
