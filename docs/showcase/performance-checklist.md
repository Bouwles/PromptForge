# Performance Checklist

PromptForge should feel instant until generation starts.

- Folder scanning skips generated and binary-heavy directories.
- File trees are capped and truncated instead of freezing the app.
- Streaming generation appends tokens without blocking input.
- History search should stay responsive with a typical local library.
- Build output should not include release artifacts, tests, or docs inside desktop packages.
