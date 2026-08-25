# Local Ollama Setup

1. Install Ollama from `https://ollama.com/`.
2. Pull a model:

```bash
ollama pull qwen2.5-coder
```

3. Start PromptForge and open Settings.
4. Keep the endpoint as `http://localhost:11434` unless Ollama is running elsewhere.
5. Click Test Connection, then select the model.

For browser demos, allow the hosted origin through `OLLAMA_ORIGINS` before restarting Ollama.
