# Scanner Limits

The scanner is intentionally conservative.

- Generated folders are ignored.
- Binary and media files are skipped.
- Lock files are skipped from the prompt tree.
- Tree depth and node count are capped.
- Large file content is truncated before prompt context is built.

These limits protect performance and keep generated prompts focused.
