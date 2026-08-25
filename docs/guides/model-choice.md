# Model Choice

For local demos, coding-tuned models produce the best prompts.

- `qwen2.5-coder` is a strong default.
- `llama3.2` is a lightweight general fallback.
- Lower temperature values produce steadier, more repeatable prompts.
- Use higher temperature only when exploring copy variants.

The app should remain useful with any Ollama chat model that supports `/api/chat`.
